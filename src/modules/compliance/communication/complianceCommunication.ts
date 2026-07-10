/**
 * EPIC 4C — Compliance module Communication Hub adapter (dry-run only).
 * Does NOT write to ce_audit_communications or any legacy compliance
 * notification table — that isolation is enforced for this epic.
 */
import {
  sendBusinessModuleCommunicationDryRun,
  type BusinessModuleDryRunResult,
} from "@/platform/communication-hub/businessModuleCommunicationAdapter";

export interface ComplianceInternalCaseStatusDryRunInput {
  caseId?: string | null;
  caseReference: string;
  caseStatus: string;
  assignedOfficer: string;
  recipientName: string;
  reason: string;
}

export async function sendComplianceInternalCaseStatusDryRun(
  input: ComplianceInternalCaseStatusDryRunInput,
): Promise<BusinessModuleDryRunResult> {
  return sendBusinessModuleCommunicationDryRun({
    moduleCode: "COMPLIANCE",
    eventCode: "INTERNAL_CASE_STATUS_NOTICE",
    entityType: "compliance_case",
    entityId: input.caseId ?? null,
    referenceNo: input.caseReference,
    recipientName: input.recipientName,
    reason: input.reason,
    source: "compliance.internal_case_status",
    tokens: {
      recipient_name: input.recipientName,
      case_reference: input.caseReference,
      case_status: input.caseStatus,
      assigned_officer: input.assignedOfficer,
    },
  });
}
