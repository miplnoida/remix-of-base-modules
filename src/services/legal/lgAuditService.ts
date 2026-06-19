import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

/**
 * Centralized audit logger for every critical Legal action.
 * Writes to `lg_case_activity` so the case timeline is the single source of truth.
 *
 * Action codes (use UPPER_SNAKE):
 *  CASE_CREATED, CASE_UPDATED, CASE_CLOSED, REFERRAL_ACCEPTED, REFERRAL_REJECTED,
 *  OFFICER_ASSIGNED, STAGE_CHANGED, HEARING_ADDED, HEARING_OUTCOME_RECORDED,
 *  NOTICE_GENERATED, DOCUMENT_LINKED, SETTLEMENT_CREATED, FEE_POSTED, ORDER_CREATED,
 *  PAYMENT_DEFAULT_DETECTED
 */
export interface LgAuditEntry {
  lg_case_id: string;
  activity_type: string;
  description?: string | null;
  payload?: Record<string, unknown> | null;
  performed_by?: string | null;
}

export async function logLgActivity(entry: LgAuditEntry): Promise<void> {
  const { error } = await sb.from("lg_case_activity").insert({
    lg_case_id: entry.lg_case_id,
    activity_type: entry.activity_type,
    description: entry.description ?? null,
    payload: entry.payload ?? null,
    performed_by: entry.performed_by ?? null,
  });
  if (error) {
    // Audit failures must not break business flow — log and swallow.
    console.warn("[lg-audit]", error.message, entry);
  }
}

export async function listLgActivity(lgCaseId: string) {
  const { data, error } = await sb
    .from("lg_case_activity")
    .select("*")
    .eq("lg_case_id", lgCaseId)
    .order("performed_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return data ?? [];
}
