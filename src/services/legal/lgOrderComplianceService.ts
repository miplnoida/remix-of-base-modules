import { supabase } from "@/integrations/supabase/client";
import { logLgActivity } from "@/services/legal/lgAuditService";
import type { LgOrderComplianceEventRecord } from "@/types/legal/judicial";

const sb = supabase as any;

export interface AddComplianceEventInput {
  order_id: string;
  case_id: string;
  event_type: string;
  event_date?: string;
  amount?: number | null;
  liability_id?: string | null;
  remarks?: string | null;
  created_by?: string | null;
}

export async function listComplianceEvents(orderId: string): Promise<LgOrderComplianceEventRecord[]> {
  const { data, error } = await sb.from("lg_order_compliance_event").select("*").eq("order_id", orderId).order("event_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addComplianceEvent(input: AddComplianceEventInput): Promise<LgOrderComplianceEventRecord> {
  const { data, error } = await sb.from("lg_order_compliance_event").insert({
    order_id: input.order_id,
    case_id: input.case_id,
    event_type: input.event_type,
    event_date: input.event_date ?? new Date().toISOString().slice(0, 10),
    amount: input.amount ?? null,
    liability_id: input.liability_id ?? null,
    remarks: input.remarks ?? null,
    created_by: input.created_by ?? null,
  }).select("*").single();
  if (error) throw error;

  await logLgActivity({
    lg_case_id: input.case_id,
    activity_type: "ORDER_COMPLIANCE_EVENT",
    description: `Compliance: ${input.event_type}${input.amount ? ` — EC$${Number(input.amount).toLocaleString()}` : ""}`,
    performed_by: input.created_by ?? null,
    payload: { order_id: input.order_id, event: data.id, type: input.event_type },
  }).catch(() => {});

  // EPIC-06B.1 — auto-task on breach / missed deadline
  if (input.event_type === "BREACH_RECORDED" || input.event_type === "MISSED_DEADLINE") {
    try {
      const { autoTaskOnOrderBreach } = await import("@/services/legal/lgJudicialTaskAutomation");
      await autoTaskOnOrderBreach({
        case_id: input.case_id,
        order_id: input.order_id,
        created_by: input.created_by ?? null,
      });
    } catch { /* non-blocking */ }
  }
  return data;
}

export async function flagBreachedOrders(): Promise<number> {
  try {
    const { data, error } = await sb.rpc("lg_flag_breached_orders");
    if (error) throw error;
    return typeof data === "number" ? data : 0;
  } catch {
    return 0;
  }
}
