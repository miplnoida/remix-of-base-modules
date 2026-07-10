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

const MODULE = "LEGAL";
const EVENT = "INTERNAL_CASE_ASSIGNMENT_NOTICE";
const TEMPLATE = "LEGAL_INTERNAL_CASE_ASSIGNMENT_EMAIL";

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
  channel: string = "email"
): Promise<WorkflowAuthorizationResult> {
  const authz = await evaluateSendAuthorization({
    module_code: MODULE,
    event_code: EVENT,
    channel,
    environment_scope: "production",
    recipients: [recipientEmail],
    entity_id: caseId,
  });
  return {
    authorized: !!authz?.authorized,
    mode: String(authz?.mode ?? ""),
    blockers: Array.isArray(authz?.blockers) ? authz.blockers : [],
    required_action: authz?.required_action ?? null,
    policy: authz?.policy ?? null,
    executed: false,
    result: null,
    note: "Evaluation only.",
  };
}

export async function prepareLegalCaseAssignmentNotice(
  caseId: string,
  opts: LegalWorkflowSendOptions
) {
  const authz = await evaluateLegalCaseAssignmentNoticeAuthorization(caseId, opts.recipientEmail, opts.channel);
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
  const authz = await evaluateLegalCaseAssignmentNoticeAuthorization(caseId, opts.recipientEmail, opts.channel);
  if (!opts.execute) {
    return { ...authz, note: "execute=false — evaluate only. No email sent." };
  }
  if (!authz.authorized) {
    return { ...authz, note: `Blocked before send: ${authz.blockers.join(", ")}` };
  }
  if (!opts.typedConfirmation || !opts.reason) {
    return { ...authz, note: "typedConfirmation and reason required to invoke governed live path." };
  }
  const { data, error } = await (supabase as any).functions.invoke("comm-hub-event-pilot", {
    body: {
      action: "live_send",
      moduleCode: MODULE,
      eventCode: EVENT,
      templateCode: TEMPLATE,
      recipientEmail: opts.recipientEmail,
      recipientName: opts.recipientName ?? "",
      tokens: {
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
    },
  });
  if (error) {
    return { ...authz, executed: false, result: { error: error.message }, note: `Governed send failed: ${error.message}` };
  }
  return { ...authz, executed: (data as any)?.ok === true, result: data, note: "Governed send invoked." };
}
