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
  /** Sub-entity the action targeted (e.g. "LG_HEARING", "LG_NOTICE", "LG_ORDER"). */
  entity_type?: string | null;
  /** PK / natural id of the sub-entity. */
  entity_id?: string | null;
  /** Prior value (any shape — object, string, number). */
  old_value?: unknown;
  /** New value (any shape). */
  new_value?: unknown;
  /** Free-text remark supplied by the user or system. */
  remarks?: string | null;
}

export async function logLgActivity(entry: LgAuditEntry): Promise<void> {
  const { error } = await sb.from("lg_case_activity").insert({
    lg_case_id: entry.lg_case_id,
    activity_type: entry.activity_type,
    description: entry.description ?? null,
    payload: entry.payload ?? null,
    performed_by: entry.performed_by ?? null,
    entity_type: entry.entity_type ?? null,
    entity_id: entry.entity_id ?? null,
    old_value: entry.old_value === undefined ? null : entry.old_value,
    new_value: entry.new_value === undefined ? null : entry.new_value,
    remarks: entry.remarks ?? null,
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
