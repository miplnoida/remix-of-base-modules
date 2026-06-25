import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type IntegrityIssueCode =
  | "NO_OPEN_INFO_REQUEST"
  | "MISSING_SOURCE_TASK"
  | "MISSING_NOTIFICATION"
  | "RESPONSE_NOT_SYNCED"
  | "STALE_SOURCE_TASK"
  | "SOURCE_MODULE_MISSING"
  | "ROUTING_MISSING"
  | "DOC_MISSING_DMS_ID"
  | "CASE_NOT_LINKED";

export type RepairAction =
  | "CREATE_SOURCE_TASK"
  | "RECREATE_NOTIFICATION"
  | "RESYNC_STATUS"
  | "CLOSE_STALE_TASKS"
  | "RELINK_CASE"
  | "MANUAL_FIX";

export interface IntegrityIssue {
  referral_id: string;
  referral_no: string;
  source_module: string | null;
  status: string;
  legal_case_id: string | null;
  info_request_id: string | null;
  issue_code: IntegrityIssueCode;
  issue_severity: "high" | "medium" | "low";
  issue_message: string;
  repair_action: RepairAction;
}

export async function listIntegrityIssues(): Promise<IntegrityIssue[]> {
  const { data, error } = await sb.rpc("validate_legal_referrals");
  if (error) throw error;
  return (data ?? []) as IntegrityIssue[];
}

export async function repairCreateSourceTask(infoRequestId: string, actor: string) {
  const { data, error } = await sb.rpc("repair_legal_referral_create_source_task", {
    p_info_request_id: infoRequestId,
    p_actor: actor,
  });
  if (error) throw error;
  return data as string;
}

export async function repairResyncStatus(referralId: string, actor: string) {
  const { data, error } = await sb.rpc("repair_legal_referral_resync_status", {
    p_referral_id: referralId,
    p_actor: actor,
  });
  if (error) throw error;
  return data as string;
}

export async function repairCloseStaleTasks(infoRequestId: string, actor: string) {
  const { data, error } = await sb.rpc("repair_legal_referral_close_stale_tasks", {
    p_info_request_id: infoRequestId,
    p_actor: actor,
  });
  if (error) throw error;
  return data as number;
}

export async function repairRelinkCase(referralId: string, actor: string, lgCaseId?: string) {
  const { data, error } = await sb.rpc("repair_legal_referral_relink_case", {
    p_referral_id: referralId,
    p_actor: actor,
    p_lg_case_id: lgCaseId ?? null,
  });
  if (error) throw error;
  return data as string;
}

/** Recreate the in-app notification + email for an info request via the existing engine. */
export async function repairRecreateNotification(infoRequestId: string) {
  const { dispatchInfoRequestNotifications } = await import("./legalReferralUnifiedService");
  await dispatchInfoRequestNotifications(infoRequestId);
}
