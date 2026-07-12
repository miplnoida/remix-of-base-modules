/**
 * EPIC CH-P1 → CH-P2 — Legal workflow send helpers.
 *
 * evaluate:  runs the policy authorization RPC only
 * prepare:   evaluates + returns a payload preview for the pilot page/UI
 * send:      GUARDED — requires opts.execute === true; otherwise returns the
 *            evaluation result and does NOT send. Even when execute=true this
 *            helper delegates to the governed comm-hub-event-pilot live path,
 *            which enforces pilot gates + send policy authorization + audit.
 *            No email is invoked from this file in CH-P2.
 */
import { supabase } from "@/integrations/supabase/client";
import { evaluateSendAuthorization } from "@/pages/admin/communicationHub/sendPolicy/sendPolicyService";
import { startBusinessCommunicationTrace, appendTraceStep, completeTrace, linkTraceRequest, toTraceContext } from "@/platform/communication-hub/trace/communicationTrace";

const MODULE = "LEGAL";
const EVENT = "INTERNAL_CASE_ASSIGNMENT_NOTICE";
const TEMPLATE = "LEGAL_INTERNAL_CASE_ASSIGNMENT_EMAIL";

export interface LegalWorkflowAssignmentContext {
  assignedToUserId?: string | null;
  previousAssignedToUserId?: string | null;
  assignmentEventId?: string | null;
  assignmentEventType?: string | null;
  assignmentCreatedAt?: string | null;
  assignmentReason?: string | null;
  recipientUserId?: string | null;
  dedupeKey?: string | null;
}

export interface LegalWorkflowSendOptions {
  recipientEmail: string;
  recipientName?: string;
  caseReference?: string;
  assignedTo?: string;
  priority?: string;
  channel?: string;
  environmentScope?: string;
  /** Must be explicitly true to attempt a live send. Default false = evaluate only. */
  execute?: boolean;
  /** Typed confirmation forwarded to comm-hub-event-pilot when execute=true. */
  typedConfirmation?: string;
  reason?: string;
  /** CH-P5: operator confirmed the rendered preview before send. */
  previewConfirmed?: boolean;
  /** CH-P5: auto-live-internal path (no per-send human preview). */
  autoLiveInternal?: boolean;
  /** CH-D1: assignment-aware duplicate detection metadata. */
  assignmentContext?: LegalWorkflowAssignmentContext;
}

export interface WorkflowAuthorizationResult {
  authorized: boolean;
  mode: string;
  blockers: string[];
  required_action: string | null;
  policy: any;
  executed: boolean;
  result: any | null;
  note: string;
}

export async function evaluateLegalCaseAssignmentNoticeAuthorization(
  caseId: string,
  recipientEmail: string,
  channel: string = "email",
  ctx?: LegalWorkflowAssignmentContext,
): Promise<WorkflowAuthorizationResult> {
  const authz = await evaluateSendAuthorization({
    module_code: MODULE,
    event_code: EVENT,
    channel,
    environment_scope: "production",
    recipients: [recipientEmail],
    entity_id: caseId,
    dedupe_key: ctx?.dedupeKey ?? null,
    business_event_id: ctx?.assignmentEventId ?? null,
    assigned_to_user_id: ctx?.assignedToUserId ?? null,
  });
  return {
    authorized: !!authz?.authorized,
    mode: String(authz?.mode ?? ""),
    blockers: Array.isArray(authz?.blockers) ? authz.blockers : [],
    required_action: authz?.required_action ?? null,
    policy: authz?.policy ?? null,
    executed: false,
    result: authz ?? null,
    note: "Evaluation only.",
  };
}

export async function prepareLegalCaseAssignmentNotice(
  caseId: string,
  opts: LegalWorkflowSendOptions
) {
  const authz = await evaluateLegalCaseAssignmentNoticeAuthorization(
    caseId, opts.recipientEmail, opts.channel, opts.assignmentContext,
  );
  return {
    ...authz,
    preview: {
      module: MODULE,
      event: EVENT,
      template: TEMPLATE,
      recipientEmail: opts.recipientEmail,
      recipientName: opts.recipientName ?? null,
      caseId,
      caseReference: opts.caseReference ?? null,
      assignedTo: opts.assignedTo ?? null,
      priority: opts.priority ?? "Normal",
    },
    note: "Prepared payload — no email sent.",
  };
}

/**
 * GUARDED send helper. Default is evaluate-only. When `execute=true`, delegates
 * to the governed comm-hub-event-pilot live path (which still enforces every
 * pilot gate + send policy). No direct provider I/O here.
 */
export async function sendLegalCaseAssignmentNoticeFromWorkflow(
  caseId: string,
  opts: LegalWorkflowSendOptions
): Promise<WorkflowAuthorizationResult> {
  const authz = await evaluateLegalCaseAssignmentNoticeAuthorization(
    caseId, opts.recipientEmail, opts.channel, opts.assignmentContext,
  );
  if (!opts.execute) {
    return { ...authz, note: "execute=false — evaluate only. No email sent." };
  }
  if (!authz.authorized) {
    return { ...authz, note: `Blocked before send: ${authz.blockers.join(", ")}` };
  }
  if (!opts.typedConfirmation || !opts.reason) {
    return { ...authz, note: "typedConfirmation and reason required to invoke governed live path." };
  }
  const ctx = opts.assignmentContext ?? {};
  const workflowContext = {
    assigned_to_user_id: ctx.assignedToUserId ?? null,
    previous_assigned_to_user_id: ctx.previousAssignedToUserId ?? null,
    assignment_event_id: ctx.assignmentEventId ?? null,
    assignment_event_type: ctx.assignmentEventType ?? null,
    assignment_created_at: ctx.assignmentCreatedAt ?? null,
    assignment_reason: ctx.assignmentReason ?? null,
    recipient_user_id: ctx.recipientUserId ?? null,
    recipient_email: opts.recipientEmail,
    dedupe_key: ctx.dedupeKey ?? null,
    business_event_id: ctx.assignmentEventId ?? null,
    business_event_type: ctx.assignmentEventType ?? "LEGAL_CASE_ASSIGNMENT",
  };
  const { data, error } = await (supabase as any).functions.invoke("comm-hub-event-pilot", {
    body: {
      action: "live_send",
      moduleCode: MODULE,
      eventCode: EVENT,
      templateCode: TEMPLATE,
      recipientEmail: opts.recipientEmail,
      recipientName: opts.recipientName ?? "",
      tokens: {
        recipient_name: opts.recipientName ?? "",
        case_reference: opts.caseReference ?? "",
        assigned_to: opts.assignedTo ?? "",
        priority: opts.priority ?? "Normal",
      },
      reason: opts.reason,
      typedConfirmation: opts.typedConfirmation,
      entityType: "legal_case",
      entityId: caseId,
      referenceNo: opts.caseReference ?? null,
      adapterSource: "legalWorkflowSendHelper",
      previewConfirmed: opts.previewConfirmed === true,
      autoLiveInternal: opts.autoLiveInternal === true,
      // CH-D1: assignment-aware duplicate keys
      dedupeKey: ctx.dedupeKey ?? null,
      businessEventId: ctx.assignmentEventId ?? null,
      businessEventType: ctx.assignmentEventType ?? "LEGAL_CASE_ASSIGNMENT",
      assignedToUserId: ctx.assignedToUserId ?? null,
      context: workflowContext,
    },
  });
  if (error) {
    return { ...authz, executed: false, result: { error: error.message }, note: `Governed send failed: ${error.message}` };
  }
  return { ...authz, executed: (data as any)?.ok === true, result: data, note: "Governed send invoked." };
}
