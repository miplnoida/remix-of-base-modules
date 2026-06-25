import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type SlaSourceModule = "BENEFITS" | "COMPLIANCE" | "ALL";
export type SlaRequestType = "INFO_REQUEST" | "DOCUMENT_REQUEST" | "CLARIFICATION" | "APPROVAL" | "ALL";
export type SlaStatus = "ON_TIME" | "DUE_SOON" | "OVERDUE" | "ESCALATED" | "COMPLETED";

export interface SlaRule {
  id: string;
  source_module: SlaSourceModule;
  request_type: SlaRequestType;
  default_due_days: number;
  reminder_before_days: number;
  escalation_after_days: number;
  escalation_workbasket: string | null;
  escalation_team: string | null;
  notify_original_submitter: boolean;
  notify_supervisor: boolean;
  email_enabled: boolean;
  active: boolean;
  priority: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function listSlaRules(): Promise<SlaRule[]> {
  const { data, error } = await sb
    .from("legal_referral_sla_rule")
    .select("*")
    .order("source_module", { ascending: true })
    .order("request_type", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SlaRule[];
}

export async function upsertSlaRule(rule: Partial<SlaRule> & { source_module: SlaSourceModule; request_type: SlaRequestType }, actor: string) {
  const payload: any = {
    ...rule,
    updated_by: actor,
    updated_at: new Date().toISOString(),
  };
  if (!rule.id) payload.created_by = actor;
  const { data, error } = await sb
    .from("legal_referral_sla_rule")
    .upsert(payload, { onConflict: "source_module,request_type" })
    .select()
    .single();
  if (error) throw error;
  return data as SlaRule;
}

export async function deleteSlaRule(id: string) {
  const { error } = await sb.from("legal_referral_sla_rule").delete().eq("id", id);
  if (error) throw error;
}

export function computeSlaStatus(opts: {
  status: string;
  due_date: string | null;
  reminder_at: string | null;
  escalation_at: string | null;
  current_sla_status?: SlaStatus | null;
}): SlaStatus {
  if (opts.status !== "PENDING_SOURCE_RESPONSE") return "COMPLETED";
  const now = Date.now();
  if (opts.escalation_at && new Date(opts.escalation_at).getTime() <= now) return "ESCALATED";
  if (opts.due_date && new Date(opts.due_date).getTime() < now - 86400000 + 1) {
    // past due_date
    const dueMs = new Date(opts.due_date).getTime() + 24 * 60 * 60 * 1000; // end of day
    if (dueMs < now) return "OVERDUE";
  }
  if (opts.reminder_at && new Date(opts.reminder_at).getTime() <= now) return "DUE_SOON";
  return "ON_TIME";
}

export function slaStatusColor(s: SlaStatus): string {
  switch (s) {
    case "ON_TIME": return "bg-green-100 text-green-800";
    case "DUE_SOON": return "bg-amber-100 text-amber-800";
    case "OVERDUE": return "bg-orange-100 text-orange-800";
    case "ESCALATED": return "bg-red-100 text-red-800";
    case "COMPLETED": return "bg-gray-100 text-gray-700";
  }
}

export async function processSlaNow(): Promise<{ due_soon: number; overdue: number; escalated: number }> {
  const { data, error } = await sb.rpc("legal_referral_process_sla");
  if (error) throw error;
  return data as any;
}

/** Atomic Request Info via Postgres RPC. */
export async function requestInfoAtomic(input: {
  legal_referral_id: string;
  requested_by: string;
  requested_to_module: SlaSourceModule;
  request_reason: string;
  requested_items?: Array<{ key: string; label: string }>;
  requested_to_workbasket?: string | null;
  requested_to_team?: string | null;
  requested_to_user?: string | null;
  request_type?: SlaRequestType;
  due_date_override?: string | null;
}): Promise<{ info_request_id: string; source_task_id: string; request_no: string; due_date: string; sla_rule_id: string | null }> {
  const { data, error } = await sb.rpc("lr_request_info_atomic", {
    p_legal_referral_id: input.legal_referral_id,
    p_requested_by: input.requested_by,
    p_requested_to_module: input.requested_to_module,
    p_request_reason: input.request_reason,
    p_requested_items: input.requested_items ?? [],
    p_requested_to_workbasket: input.requested_to_workbasket ?? null,
    p_requested_to_team: input.requested_to_team ?? null,
    p_requested_to_user: input.requested_to_user ?? null,
    p_request_type: input.request_type ?? "INFO_REQUEST",
    p_due_date_override: input.due_date_override ?? null,
  });
  if (error) throw error;
  return data as any;
}
