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
  const ctx = opts.assignmentContext ?? {};

  // CH-TRACE-1 — start a trace so this attempt is visible in the Trace Center
  // regardless of outcome. Best-effort; never blocks the send flow.
  const trace = await startBusinessCommunicationTrace({
    moduleCode: MODULE,
    eventCode: EVENT,
    entityType: "legal_case",
    entityId: caseId,
    referenceNo: opts.caseReference ?? null,
    recipientEmail: opts.recipientEmail,
    sourceModule: "legal",
    sourceScreen: "legalWorkflowSendHelper",
    sourceAction: opts.execute ? "live_send" : "evaluate",
    correlationId: ctx.assignmentEventId ?? null,
    currentStage: "EVENT_INITIATED",
  });
  await appendTraceStep(trace?.trace_id, {
    stageCode: "EVENT_INITIATED", stageName: "Event initiated", status: "info",
    plainSummary: `Legal case assignment notice attempt for ${opts.caseReference ?? caseId}.`,
  });
  await appendTraceStep(trace?.trace_id, {
    stageCode: "RECIPIENT_RESOLVED", stageName: "Recipient resolved",
    status: opts.recipientEmail ? "passed" : "blocked",
    blockerCodes: opts.recipientEmail ? [] : ["recipient_resolution_failed"],
    plainSummary: opts.recipientEmail ? `Recipient: ${opts.recipientEmail}` : "No recipient email available.",
  });

  const authz = await evaluateLegalCaseAssignmentNoticeAuthorization(
    caseId, opts.recipientEmail, opts.channel, ctx,
  );

  await appendTraceStep(trace?.trace_id, {
    stageCode: "AUTOMATION_CHECKED", stageName: "Automation & policy checked",
    status: authz.authorized ? "passed" : "blocked",
    blockerCodes: authz.authorized ? [] : authz.blockers,
    setStatus: authz.authorized ? undefined : "blocked",
    setBlockedStage: authz.authorized ? undefined : "AUTOMATION_CHECKED",
    plainSummary: authz.authorized ? `Authorized (mode: ${authz.mode}).` : `Blocked: ${authz.blockers.join(", ")}`,
  });

  if (!opts.execute) {
    await completeTrace(trace?.trace_id, "prepared", { current_stage: "PREPARED" });
    return { ...authz, note: "execute=false — evaluate only. No email sent." };
  }
  if (!authz.authorized) {
    await completeTrace(trace?.trace_id, "blocked", { blocked_stage: "AUTOMATION_CHECKED" });
    return { ...authz, note: `Blocked before send: ${authz.blockers.join(", ")}` };
  }
  if (!opts.typedConfirmation || !opts.reason) {
    await appendTraceStep(trace?.trace_id, {
      stageCode: "TYPED_CONFIRMATION_CHECK", stageName: "Typed confirmation check", status: "blocked",
      blockerCodes: ["typed_confirmation_required"], setStatus: "blocked", setBlockedStage: "TYPED_CONFIRMATION_CHECK",
    });
    return { ...authz, note: "typedConfirmation and reason required to invoke governed live path." };
  }

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
    trace: toTraceContext(trace, { sourceModule: "legal", sourceScreen: "legalWorkflowSendHelper" }),
  };
  await appendTraceStep(trace?.trace_id, {
    stageCode: "DISPATCH_INVOKED", stageName: "Governed live path invoked", status: "info",
  });

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
      dedupeKey: ctx.dedupeKey ?? null,
      businessEventId: ctx.assignmentEventId ?? null,
      businessEventType: ctx.assignmentEventType ?? "LEGAL_CASE_ASSIGNMENT",
      assignedToUserId: ctx.assignedToUserId ?? null,
      context: workflowContext,
      trace: toTraceContext(trace, { sourceModule: "legal", sourceScreen: "legalWorkflowSendHelper" }),
    },
  });
  if (error) {
    await appendTraceStep(trace?.trace_id, { stageCode: "DISPATCH_INVOKED", stageName: "Governed live path invoked", status: "failed", blockerCodes: ["provider_send_failed"], plainSummary: error.message });
    await completeTrace(trace?.trace_id, "failed", { blocked_stage: "DISPATCH_INVOKED" });
    return { ...authz, executed: false, result: { error: error.message }, note: `Governed send failed: ${error.message}` };
  }

  const ok = (data as any)?.ok === true;
  const returnedBlockers: string[] = Array.isArray((data as any)?.blockers) ? (data as any).blockers : [];
  const returnedRequestId = (data as any)?.request_id ?? (data as any)?.requestId ?? null;
  const returnedRequestNo = (data as any)?.request_no ?? (data as any)?.requestNo ?? null;
  if (returnedRequestId) await linkTraceRequest(trace?.trace_id, returnedRequestId, returnedRequestNo);
  await appendTraceStep(trace?.trace_id, {
    stageCode: "REQUEST_ENQUEUE_ATTEMPTED", stageName: "Request enqueue attempted",
    status: ok ? "passed" : "blocked",
    blockerCodes: ok ? [] : returnedBlockers,
    requestId: returnedRequestId,
  });
  await completeTrace(trace?.trace_id, ok ? "queued" : "blocked", { blocked_stage: ok ? undefined : "REQUEST_ENQUEUE_ATTEMPTED" });

  return { ...authz, executed: ok, result: data, note: "Governed send invoked." };
}
