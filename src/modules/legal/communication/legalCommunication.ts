/**
 * EPIC 4C — Legal module Communication Hub adapter (dry-run only).
 * Business modules must call this file, not the Generic Event Pilot directly.
 */
import {
  sendBusinessModuleCommunicationDryRun,
  type BusinessModuleDryRunResult,
} from "@/platform/communication-hub/businessModuleCommunicationAdapter";

export interface LegalInternalCaseAssignmentDryRunInput {
  caseId?: string | null;
  caseReference: string;
  assignedTo: string;
  priority: string;
  recipientName: string;
  reason: string;
}

export async function sendLegalInternalCaseAssignmentDryRun(
  input: LegalInternalCaseAssignmentDryRunInput,
): Promise<BusinessModuleDryRunResult> {
  return sendBusinessModuleCommunicationDryRun({
    moduleCode: "LEGAL",
    eventCode: "INTERNAL_CASE_ASSIGNMENT_NOTICE",
    entityType: "legal_case",
    entityId: input.caseId ?? null,
    referenceNo: input.caseReference,
    recipientName: input.recipientName,
    reason: input.reason,
    source: "legal.internal_case_assignment",
    tokens: {
      recipient_name: input.recipientName,
      case_reference: input.caseReference,
      assigned_to: input.assignedTo,
      priority: input.priority,
    },
  });
}
