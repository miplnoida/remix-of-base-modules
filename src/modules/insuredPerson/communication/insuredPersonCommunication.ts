/**
 * EPIC 4C — Insured Person module Communication Hub adapter (dry-run only).
 */
import {
  sendBusinessModuleCommunicationDryRun,
  type BusinessModuleDryRunResult,
} from "@/platform/communication-hub/businessModuleCommunicationAdapter";

export interface InsuredPersonInternalProfileReviewDryRunInput {
  insuredPersonId?: string | null;
  insuredPersonReference: string;
  reviewStatus: string;
  assignedOfficer: string;
  recipientName: string;
  reason: string;
}

export async function sendInsuredPersonInternalProfileReviewDryRun(
  input: InsuredPersonInternalProfileReviewDryRunInput,
): Promise<BusinessModuleDryRunResult> {
  return sendBusinessModuleCommunicationDryRun({
    moduleCode: "INSURED_PERSON",
    eventCode: "INTERNAL_PROFILE_REVIEW_NOTICE",
    entityType: "insured_person",
    entityId: input.insuredPersonId ?? null,
    referenceNo: input.insuredPersonReference,
    recipientName: input.recipientName,
    reason: input.reason,
    source: "insured_person.internal_profile_review",
    tokens: {
      recipient_name: input.recipientName,
      insured_person_reference: input.insuredPersonReference,
      review_status: input.reviewStatus,
      assigned_officer: input.assignedOfficer,
    },
  });
}
