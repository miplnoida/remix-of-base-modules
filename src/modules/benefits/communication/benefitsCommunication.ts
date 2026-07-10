/**
 * EPIC 4C — Benefits module Communication Hub adapter (dry-run only).
 */
import {
  sendBusinessModuleCommunicationDryRun,
  type BusinessModuleDryRunResult,
} from "@/platform/communication-hub/businessModuleCommunicationAdapter";

export interface BenefitsInternalClaimReviewDryRunInput {
  claimId?: string | null;
  claimReference: string;
  claimStatus: string;
  assignedOfficer: string;
  recipientName: string;
  reason: string;
}

export async function sendBenefitsInternalClaimReviewDryRun(
  input: BenefitsInternalClaimReviewDryRunInput,
): Promise<BusinessModuleDryRunResult> {
  return sendBusinessModuleCommunicationDryRun({
    moduleCode: "BENEFITS",
    eventCode: "INTERNAL_CLAIM_REVIEW_NOTICE",
    entityType: "benefit_claim",
    entityId: input.claimId ?? null,
    referenceNo: input.claimReference,
    recipientName: input.recipientName,
    reason: input.reason,
    source: "benefits.internal_claim_review",
    tokens: {
      recipient_name: input.recipientName,
      claim_reference: input.claimReference,
      claim_status: input.claimStatus,
      assigned_officer: input.assignedOfficer,
    },
  });
}
