/**
 * EPIC L7A — Legal assignment workflow → Communication Hub trigger.
 *
 * Responsibilities:
 *  - Resolve the assigned officer's display name + internal email.
 *  - Read/write the legal assignment automation setting.
 *  - Prevent duplicate assignment notices per (case, assignee) within the
 *    event's duplicate window.
 *  - Prepare or send (governed) the LEGAL/INTERNAL_CASE_ASSIGNMENT_NOTICE via
 *    the existing legalWorkflowSendHelper (no new send path).
 *  - Log lg_case_activity entries for prepared / sent / blocked outcomes.
 *
 * Hard rules:
 *  - No external recipient. Fallback = rohit@mishainfotech.com (internal).
 *  - Never writes notification_queue / notification_logs / ce_audit_communications.
 *  - Never bypasses send policy or send_communication_v1 DB guard.
 */
import { supabase } from "@/integrations/supabase/client";
import { logLgActivity } from "@/services/legal/lgAuditService";
import {
  prepareLegalCaseAssignmentNotice,
  sendLegalCaseAssignmentNoticeFromWorkflow,
  evaluateLegalCaseAssignmentNoticeAuthorization,
} from "./legalWorkflowSendHelper";
import {
  getAutomationSetting,
  setAutomationSetting,
  type SetAutomationSettingResult,
} from "@/pages/admin/communicationHub/services/moduleAutomationSettingsService";

const db: any = supabase;
const MODULE = "LEGAL";
const EVENT = "INTERNAL_CASE_ASSIGNMENT_NOTICE";
const INTERNAL_DOMAIN = "@mishainfotech.com";
const FALLBACK_EMAIL = "rohit@mishainfotech.com";
export const LEGAL_ASSIGNMENT_AUTOMATION_KEY = "legal_auto_send_internal_assignment_notice";

export type LegalAssignmentAutomationMode =
  | "disabled"
  | "prepare_only"
  | "auto_live_internal";

/** DB-backed. Falls back to `prepare_only` if the row is missing/unreachable. */
export async function getLegalAssignmentAutomationMode(): Promise<LegalAssignmentAutomationMode> {
  try {
    const row = await getAutomationSetting(MODULE, LEGAL_ASSIGNMENT_AUTOMATION_KEY);
    const v = row?.setting_value;
    if (v === "disabled" || v === "prepare_only" || v === "auto_live_internal") return v;
  } catch { /* noop */ }
  return "prepare_only";
}

export async function setLegalAssignmentAutomationMode(
  mode: LegalAssignmentAutomationMode,
  reason: string,
  typedConfirmation?: string,
): Promise<SetAutomationSettingResult> {
  return setAutomationSetting({
    moduleCode: MODULE,
    settingKey: LEGAL_ASSIGNMENT_AUTOMATION_KEY,
    settingValue: mode,
    reason,
    typedConfirmation: typedConfirmation ?? null,
  });
}

export interface ResolvedLegalOfficer {
  user_id: string | null;
  user_code: string | null;
  full_name: string | null;
  email: string | null;
  eligible_for_internal_pilot: boolean;
  fallback_reason: string | null;
}

/** Uses secure RPC `resolve_legal_officer_for_notice` (no direct client-side profiles.email read). */
export async function resolveLegalOfficerForNotice(userId: string | null | undefined): Promise<ResolvedLegalOfficer> {
  if (!userId) {
    return { user_id: null, user_code: null, full_name: null, email: null, eligible_for_internal_pilot: false, fallback_reason: "no_user_id" };
  }
  const { data } = await db.rpc("resolve_legal_officer_for_notice", { p_user_id: userId });
  const j: any = data ?? {};
  return {
    user_id: j.user_id ?? userId,
    user_code: j.user_code ?? null,
    full_name: j.full_name ?? null,
    email: j.email ?? null,
    eligible_for_internal_pilot: !!j.eligible_for_internal_pilot,
    fallback_reason: j.fallback_reason ?? null,
  };
}


export interface AssignmentNoticeTriggerInput {
  caseId: string;
  caseReference: string | null;
  assignedUserId: string;
  actorUserCode?: string | null;
  previousAssignedUserId?: string | null;
  priority?: string | null;
  reason?: string | null;
}

export interface AssignmentNoticeTriggerResult {
  mode: LegalAssignmentAutomationMode;
  prepared: boolean;
  sent: boolean;
  blocked: boolean;
  duplicate: boolean;
  blockers: string[];
  requestNo: string | null;
  recipientEmail: string;
  recipientName: string;
  recipientFallbackReason: string | null;
  policyMode: string | null;
  note: string;
}

/**
 * Look for an existing communication_request for the same (case, assignee)
 * within the send policy duplicate window. Returns the most recent match
 * or null.
 */
async function findRecentAssignmentRequestForAssignee(caseId: string, assigneeUserId: string) {
  // Pull duplicate_window_minutes from send policy (fallback 24h).
  let windowMinutes = 24 * 60;
  try {
    const { data: pol } = await db
      .from("communication_hub_event_send_policy")
      .select("duplicate_window_minutes")
      .eq("module_code", MODULE)
      .eq("event_code", EVENT)
      .maybeSingle();
    if (pol?.duplicate_window_minutes) windowMinutes = Number(pol.duplicate_window_minutes);
  } catch { /* noop */ }
  const cutoff = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const { data } = await db
    .from("communication_request")
    .select("id, request_no, context, created_at")
    .eq("module_code", MODULE)
    .eq("event_code", EVENT)
    .eq("entity_type", "legal_case")
    .eq("entity_id", caseId)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(10);
  const rows = (data ?? []) as any[];
  return rows.find((r) => {
    const ctx = r.context ?? {};
    return ctx.assigned_to_user_id === assigneeUserId;
  }) ?? null;
}

export async function triggerLegalAssignmentNoticeAfterAssign(
  input: AssignmentNoticeTriggerInput,
): Promise<AssignmentNoticeTriggerResult> {
  const mode = getLegalAssignmentAutomationMode();
  const officer = await resolveLegalOfficerForNotice(input.assignedUserId);

  const displayName =
    officer.full_name || officer.user_code || (input.assignedUserId ? input.assignedUserId.slice(0, 8) : "Unassigned");

  let recipientEmail = officer.email && officer.eligible_for_internal_pilot ? officer.email : FALLBACK_EMAIL;
  const recipientFallbackReason =
    !officer.email || !officer.eligible_for_internal_pilot ? "assigned_officer_email_missing_or_not_internal" : null;

  const baseResult: AssignmentNoticeTriggerResult = {
    mode,
    prepared: false,
    sent: false,
    blocked: false,
    duplicate: false,
    blockers: [],
    requestNo: null,
    recipientEmail,
    recipientName: displayName,
    recipientFallbackReason,
    policyMode: null,
    note: "",
  };

  if (mode === "disabled") {
    return { ...baseResult, note: "Automation disabled — no Communication Hub action taken." };
  }

  // Duplicate prevention.
  const existing = await findRecentAssignmentRequestForAssignee(input.caseId, input.assignedUserId);
  if (existing) {
    return {
      ...baseResult,
      duplicate: true,
      requestNo: existing.request_no ?? null,
      note: "Assignment notice already prepared/sent for this assignee within the duplicate window.",
    };
  }

  const commonOpts = {
    recipientEmail,
    recipientName: displayName,
    caseReference: input.caseReference ?? undefined,
    assignedTo: displayName,
    priority: input.priority ?? "Normal",
    channel: "email",
  } as const;

  if (mode === "prepare_only") {
    const prep = await prepareLegalCaseAssignmentNotice(input.caseId, { ...commonOpts, execute: false });
    const blocked = !prep.authorized;
    await logLgActivity({
      lg_case_id: input.caseId,
      activity_type: blocked ? "COMMUNICATION_HUB_NOTICE_BLOCKED" : "COMMUNICATION_HUB_NOTICE_PREPARED",
      description: blocked
        ? `Legal assignment notice blocked: ${prep.blockers.join(", ") || "policy"}`
        : `Legal assignment notice prepared for ${displayName}`,
      performed_by: input.actorUserCode ?? null,
      new_value: {
        event: EVENT,
        recipient: maskEmail(recipientEmail),
        from_email: "legal@secureserve.biz",
        blockers: prep.blockers,
        policy_mode: prep.mode,
        trigger_source: "legal_assignment_workflow",
        recipient_fallback_reason: recipientFallbackReason,
      } as any,
    }).catch(() => {});
    return {
      ...baseResult,
      prepared: !blocked,
      blocked,
      blockers: prep.blockers,
      policyMode: prep.mode,
      note: blocked ? `Blocked: ${prep.blockers.join(", ")}` : "Prepared — ready for review.",
    };
  }

  // auto_live_internal: only for internal recipients (safety belt).
  if (!recipientEmail.toLowerCase().endsWith(INTERNAL_DOMAIN)) {
    const authz = await evaluateLegalCaseAssignmentNoticeAuthorization(input.caseId, recipientEmail);
    await logLgActivity({
      lg_case_id: input.caseId,
      activity_type: "COMMUNICATION_HUB_NOTICE_BLOCKED",
      description: "Auto-live suppressed: recipient is not internal.",
      performed_by: input.actorUserCode ?? null,
      new_value: {
        event: EVENT,
        recipient: maskEmail(recipientEmail),
        blockers: ["recipient_not_internal"],
        trigger_source: "legal_assignment_workflow",
      } as any,
    }).catch(() => {});
    return { ...baseResult, blocked: true, blockers: ["recipient_not_internal"], policyMode: authz.mode, note: "Blocked: recipient not internal." };
  }

  const send = await sendLegalCaseAssignmentNoticeFromWorkflow(input.caseId, {
    ...commonOpts,
    execute: true,
    typedConfirmation: "SEND_LIVE",
    reason: input.reason || "Legal case assignment automation",
  });
  const sent = !!send.executed;
  const blocked = !sent;
  const requestNo = extractRequestNo(send.result);
  await logLgActivity({
    lg_case_id: input.caseId,
    activity_type: sent ? "COMMUNICATION_HUB_NOTICE_SENT" : "COMMUNICATION_HUB_NOTICE_BLOCKED",
    description: sent
      ? `Legal assignment notice sent to ${maskEmail(recipientEmail)}`
      : `Legal assignment notice blocked: ${send.blockers.join(", ") || send.note}`,
    performed_by: input.actorUserCode ?? null,
    new_value: {
      event: EVENT,
      recipient: maskEmail(recipientEmail),
      from_email: "legal@secureserve.biz",
      request_no: requestNo,
      blockers: send.blockers,
      policy_mode: send.mode,
      trigger_source: "legal_assignment_workflow",
      recipient_fallback_reason: recipientFallbackReason,
    } as any,
  }).catch(() => {});
  return {
    ...baseResult,
    sent,
    blocked,
    blockers: send.blockers,
    requestNo,
    policyMode: send.mode,
    note: send.note,
  };
}

function extractRequestNo(result: any): string | null {
  if (!result || typeof result !== "object") return null;
  return result.request_no ?? result.requestNo ?? result?.data?.request_no ?? null;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return `${local.slice(0, 2)}${"*".repeat(Math.max(1, local.length - 2))}@${domain}`;
}
