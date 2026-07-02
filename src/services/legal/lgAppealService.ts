import { supabase } from "@/integrations/supabase/client";
import { logLgActivity } from "@/services/legal/lgAuditService";
import { assertLgAppealTransition, type LgAppealStatus } from "@/services/legal/lgAppealStateMachine";
import type { LgAppealRecord } from "@/types/legal/judicial";

const sb = supabase as any;

export interface CreateAppealInput {
  case_id: string;
  order_id?: string | null;
  filing_party?: string | null;
  grounds?: string | null;
  filing_date?: string | null;
  appeal_deadline?: string | null;
  status?: LgAppealStatus;
  remarks?: string | null;
  created_by?: string | null;
  liability_ids?: string[];
  overrideDeadline?: boolean;
}

async function nextAppealNo(): Promise<string> {
  try {
    const { generateNumber } = await import("@/services/core/coreNumberingService");
    const r = await generateNumber({ moduleCode: "LEGAL", entityType: "LEGAL_APPEAL", countryCode: "SKN" });
    return r.generatedNumber;
  } catch {
    return `LG-APL-${Date.now().toString().slice(-8)}`;
  }
}

export async function listAppealsForCase(caseId: string): Promise<LgAppealRecord[]> {
  const { data, error } = await sb.from("lg_appeal").select("*").eq("case_id", caseId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function listAppealsForOrder(orderId: string): Promise<LgAppealRecord[]> {
  const { data, error } = await sb.from("lg_appeal").select("*").eq("order_id", orderId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createAppeal(input: CreateAppealInput): Promise<LgAppealRecord> {
  // Deadline validation
  if (!input.overrideDeadline && input.appeal_deadline && input.filing_date) {
    if (input.filing_date > input.appeal_deadline) {
      throw new Error("Filing date is past the appeal deadline. Override permission required to proceed.");
    }
  }
  const appeal_no = await nextAppealNo();
  const status = input.status ?? "DRAFT";
  const { data, error } = await sb.from("lg_appeal").insert({
    appeal_no,
    case_id: input.case_id,
    order_id: input.order_id ?? null,
    filing_party: input.filing_party ?? null,
    grounds: input.grounds ?? null,
    filing_date: input.filing_date ?? null,
    appeal_deadline: input.appeal_deadline ?? null,
    status,
    remarks: input.remarks ?? null,
    created_by: input.created_by ?? null,
  }).select("*").single();
  if (error) throw error;

  if (input.liability_ids?.length) {
    await sb.from("lg_appeal_liability").insert(
      input.liability_ids.map((lid) => ({ appeal_id: data.id, liability_id: lid, created_by: input.created_by ?? null })),
    );
  }

  await logLgActivity({
    lg_case_id: input.case_id,
    activity_type: "APPEAL_CREATED",
    description: `Appeal ${appeal_no} filed (${status})`,
    performed_by: input.created_by ?? null,
    payload: { appeal_id: data.id, order_id: input.order_id, liability_ids: input.liability_ids ?? [] },
  }).catch(() => {});
  return data;
}

export async function changeAppealStatus(id: string, to: LgAppealStatus, opts?: { userCode?: string | null; note?: string | null; outcome?: string | null }) {
  const { data: cur, error: e1 } = await sb.from("lg_appeal").select("*").eq("id", id).single();
  if (e1) throw e1;
  assertLgAppealTransition(cur.status, to);

  const patch: Record<string, any> = { status: to, updated_by: opts?.userCode ?? null };
  const today = new Date().toISOString().slice(0, 10);
  if (to === "FILED" && !cur.filing_date) patch.filing_date = today;
  if ((to === "ALLOWED" || to === "DISMISSED") && !cur.decision_date) patch.decision_date = today;
  if (opts?.outcome) patch.outcome = opts.outcome;

  const { data, error } = await sb.from("lg_appeal").update(patch).eq("id", id).select("*").single();
  if (error) throw error;

  await logLgActivity({
    lg_case_id: cur.case_id,
    activity_type: `APPEAL_${to}`,
    description: `Appeal ${cur.appeal_no}: ${cur.status} → ${to}${opts?.note ? " — " + opts.note : ""}`,
    performed_by: opts?.userCode ?? null,
    payload: { appeal_id: id, from: cur.status, to, outcome: opts?.outcome ?? null },
  }).catch(() => {});
  return data;
}

export async function linkAppealLiability(appealId: string, liabilityId: string, userCode?: string | null) {
  const { error } = await sb.from("lg_appeal_liability").upsert({ appeal_id: appealId, liability_id: liabilityId, created_by: userCode ?? null });
  if (error) throw error;
}
export async function unlinkAppealLiability(appealId: string, liabilityId: string) {
  const { error } = await sb.from("lg_appeal_liability").delete().eq("appeal_id", appealId).eq("liability_id", liabilityId);
  if (error) throw error;
}
export async function listAppealLiabilities(appealId: string) {
  const { data, error } = await sb.from("lg_appeal_liability").select("*, lg_recoverable_liability:liability_id(*)").eq("appeal_id", appealId);
  if (error) throw error;
  return data ?? [];
}
