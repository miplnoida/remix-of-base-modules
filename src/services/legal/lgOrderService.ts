import { supabase } from "@/integrations/supabase/client";
import { logLgActivity } from "@/services/legal/lgAuditService";
import { assertLgOrderTransition, type LgOrderStatus } from "@/services/legal/lgOrderStateMachine";

const sb = supabase as any;

export interface LgOrderInsert {
  lg_case_id: string;
  order_no?: string;
  order_type_code: string;
  hearing_id?: string | null;
  issued_by_court?: string | null;
  issued_date?: string | null;
  effective_date?: string | null;
  expiry_date?: string | null;
  compliance_date?: string | null;
  ordered_amount?: number | null;
  terms?: string | null;
  status?: LgOrderStatus;
  created_by?: string | null;
}

export interface LgOrderUpdate {
  hearing_id?: string | null;
  issued_by_court?: string | null;
  issued_date?: string | null;
  effective_date?: string | null;
  expiry_date?: string | null;
  compliance_date?: string | null;
  ordered_amount?: number | null;
  terms?: string | null;
  order_type_code?: string;
  enforcement_ref?: string | null;
  payment_arrangement_id?: string | null;
  updated_by?: string | null;
}

export async function generateLgOrderNo(): Promise<string> {
  const { generateNumber } = await import("@/services/core/coreNumberingService");
  const r = await generateNumber({ moduleCode: "LEGAL", entityType: "LEGAL_ORDER", countryCode: "SKN" });
  return r.generatedNumber;
}

export async function listLgOrders(lgCaseId: string) {
  const { data, error } = await sb
    .from("lg_order")
    .select("*, lg_hearing:hearing_id (id, hearing_date, hearing_type_code)")
    .eq("lg_case_id", lgCaseId)
    .order("issued_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getLgOrder(id: string) {
  const { data, error } = await sb
    .from("lg_order")
    .select("*, lg_hearing:hearing_id (id, hearing_date, hearing_type_code), lg_case:lg_case_id (lg_case_no, summary)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createLgOrder(input: LgOrderInsert) {
  const order_no = input.order_no ?? (await generateLgOrderNo());
  const status = input.status ?? "DRAFT";
  const { data, error } = await sb
    .from("lg_order")
    .insert({ ...input, order_no, status })
    .select("*")
    .single();
  if (error) throw error;

  await logLgActivity({
    lg_case_id: input.lg_case_id,
    activity_type: "ORDER_CREATED",
    description: `Order ${order_no} (${input.order_type_code}) created in ${status}`,
    performed_by: input.created_by ?? null,
    payload: { order_id: data.id, status },
  }).catch(() => {});

  try {
    const judgmentLike = String(input.order_type_code || "").toUpperCase().includes("JUDGMENT");
    if (judgmentLike) {
      const { autoApplyForEvent } = await import("@/services/legal/lgFeeEngineService");
      autoApplyForEvent(input.lg_case_id, "JUDGMENT_RECORDED", input.created_by ?? null).catch(() => {});
    }
  } catch { /* non-blocking */ }
  return data;
}

export async function updateLgOrder(id: string, patch: LgOrderUpdate, userCode?: string | null) {
  const { data, error } = await sb
    .from("lg_order")
    .update({ ...patch, updated_by: userCode ?? patch.updated_by ?? null })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  await logLgActivity({
    lg_case_id: data.lg_case_id,
    activity_type: "ORDER_UPDATED",
    description: `Order ${data.order_no} updated`,
    performed_by: userCode ?? null,
    payload: { order_id: id, fields: Object.keys(patch) },
  }).catch(() => {});
  return data;
}

export async function changeLgOrderStatus(
  id: string,
  toStatus: LgOrderStatus,
  opts?: { userCode?: string | null; note?: string | null; enforcementRef?: string | null; paymentArrangementId?: string | null },
) {
  const current = await getLgOrder(id);
  assertLgOrderTransition(current.status, toStatus);

  const patch: Record<string, any> = {
    status: toStatus,
    updated_by: opts?.userCode ?? null,
  };
  const today = new Date().toISOString().slice(0, 10);
  if (toStatus === "FILED"    && !current.filed_date)    patch.filed_date = today;
  if (toStatus === "GRANTED"  && !current.granted_date)  patch.granted_date = today;
  if (toStatus === "COMPLIED" && !current.complied_date) patch.complied_date = today;
  if (toStatus === "BREACHED" && !current.breached_date) patch.breached_date = today;
  if (toStatus === "CLOSED"   && !current.closed_date)   patch.closed_date = today;
  if (opts?.enforcementRef !== undefined) patch.enforcement_ref = opts.enforcementRef;
  if (opts?.paymentArrangementId !== undefined) patch.payment_arrangement_id = opts.paymentArrangementId;

  const { data, error } = await sb
    .from("lg_order")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;

  await logLgActivity({
    lg_case_id: data.lg_case_id,
    activity_type: `ORDER_${toStatus}`,
    description: `Order ${data.order_no}: ${current.status ?? "DRAFT"} → ${toStatus}${opts?.note ? ` — ${opts.note}` : ""}`,
    performed_by: opts?.userCode ?? null,
    payload: { order_id: id, from: current.status, to: toStatus, note: opts?.note ?? null },
  }).catch(() => {});

  // EPIC-06B.1 — auto follow-up tasks on ACTIVE/GRANTED
  if (toStatus === "ACTIVE" || toStatus === "GRANTED") {
    try {
      const { autoTaskOnOrderActive, autoTaskOnPaymentMonitoring } = await import(
        "@/services/legal/lgJudicialTaskAutomation"
      );
      await autoTaskOnOrderActive({
        case_id: data.lg_case_id,
        order_id: id,
        order_no: data.order_no,
        compliance_date: data.compliance_date ?? null,
        created_by: opts?.userCode ?? null,
      });
      if (Number(data.ordered_amount ?? 0) > 0) {
        await autoTaskOnPaymentMonitoring({
          case_id: data.lg_case_id,
          order_id: id,
          order_no: data.order_no,
          created_by: opts?.userCode ?? null,
        });
      }
    } catch { /* non-blocking */ }
  }

  // EPIC-06C — centralized notification dispatch for status transitions
  try {
    const { dispatch } = await import("@/services/legal/lgNotificationRuleEngine");
    if (toStatus === "GRANTED" || toStatus === "ACTIVE") {
      await dispatch("ORDER_GRANTED", {
        lg_case_id: data.lg_case_id,
        entity_type: "LG_ORDER",
        entity_id: id,
        actor_user_code: opts?.userCode ?? null,
        title: `Order ${data.order_no} granted`,
        payload: { order_id: id, from: current.status, to: toStatus },
      });
    }
    if (toStatus === "BREACHED") {
      await dispatch("COMPLIANCE_BREACHED", {
        lg_case_id: data.lg_case_id,
        entity_type: "LG_ORDER",
        entity_id: id,
        actor_user_code: opts?.userCode ?? null,
        title: `Order ${data.order_no} — breach recorded`,
        payload: { order_id: id, note: opts?.note ?? null },
      });
    }
  } catch { /* non-blocking */ }

  return data;
}

export async function linkLgOrderPaymentArrangement(id: string, paymentArrangementId: string, userCode?: string | null) {
  return updateLgOrder(id, { payment_arrangement_id: paymentArrangementId }, userCode);
}
