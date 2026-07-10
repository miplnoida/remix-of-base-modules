/**
 * EPIC CH-P1 Part I — Legal workflow send helper (evaluate-only).
 *
 * This helper is intentionally NON-SENDING in CH-P1. It calls the
 * `evaluate_comm_hub_send_authorization` RPC and returns the authorization
 * result so future workflow automation (CH-P2+) can decide whether to invoke
 * the governed send path. It does NOT create a communication_request, does
 * NOT enqueue anything, and does NOT touch legacy notification tables.
 */
import { evaluateSendAuthorization } from "@/pages/admin/communicationHub/sendPolicy/sendPolicyService";

export interface LegalCaseAssignmentWorkflowOptions {
  recipientEmail: string;
  channel?: string;
  environmentScope?: string;
}

export interface WorkflowAuthorizationResult {
  authorized: boolean;
  mode: string;
  blockers: string[];
  required_action: string | null;
  policy: any;
  wouldSend: false;
  note: string;
}

export async function sendLegalCaseAssignmentNoticeFromWorkflow(
  caseId: string,
  options: LegalCaseAssignmentWorkflowOptions
): Promise<WorkflowAuthorizationResult> {
  const result = await evaluateSendAuthorization({
    module_code: "LEGAL",
    event_code: "INTERNAL_CASE_ASSIGNMENT_NOTICE",
    channel: options.channel ?? "email",
    environment_scope: options.environmentScope ?? "production",
    recipients: [options.recipientEmail],
    entity_id: caseId,
  });
  return {
    authorized: !!result?.authorized,
    mode: String(result?.mode ?? ""),
    blockers: Array.isArray(result?.blockers) ? result.blockers : [],
    required_action: result?.required_action ?? null,
    policy: result?.policy ?? null,
    wouldSend: false,
    note:
      "CH-P1 helper is evaluate-only. No email sent, no communication_request created. Wire real send in CH-P2.",
  };
}
