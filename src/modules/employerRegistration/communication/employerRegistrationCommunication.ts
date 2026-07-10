/**
 * EPIC 4C — Employer Registration Communication Hub adapter (dry-run only).
 */
import {
  sendBusinessModuleCommunicationDryRun,
  type BusinessModuleDryRunResult,
} from "@/platform/communication-hub/businessModuleCommunicationAdapter";

export interface EmployerRegistrationInternalAckDryRunInput {
  employerId?: string | null;
  employerName: string;
  referenceNo: string;
  recipientName: string;
  reason: string;
}

export async function sendEmployerRegistrationInternalAckDryRun(
  input: EmployerRegistrationInternalAckDryRunInput,
): Promise<BusinessModuleDryRunResult> {
  return sendBusinessModuleCommunicationDryRun({
    moduleCode: "EMPLOYER_REGISTRATION",
    eventCode: "INTERNAL_ACKNOWLEDGEMENT_NOTICE",
    entityType: "employer_registration",
    entityId: input.employerId ?? null,
    referenceNo: input.referenceNo,
    recipientName: input.recipientName,
    reason: input.reason,
    source: "employer_registration.internal_acknowledgement",
    tokens: {
      recipient_name: input.recipientName,
      employer_name: input.employerName,
      reference_no: input.referenceNo,
    },
  });
}

export interface EmployerRegistrationInternalApprovalReviewDryRunInput {
  employerId?: string | null;
  employerName: string;
  referenceNo: string;
  reviewStatus: string;
  recipientName: string;
  reason: string;
}

export async function sendEmployerRegistrationInternalApprovalReviewDryRun(
  input: EmployerRegistrationInternalApprovalReviewDryRunInput,
): Promise<BusinessModuleDryRunResult> {
  return sendBusinessModuleCommunicationDryRun({
    moduleCode: "EMPLOYER_REGISTRATION",
    eventCode: "INTERNAL_APPROVAL_REVIEW_NOTICE",
    entityType: "employer_registration",
    entityId: input.employerId ?? null,
    referenceNo: input.referenceNo,
    recipientName: input.recipientName,
    reason: input.reason,
    source: "employer_registration.internal_approval_review",
    tokens: {
      recipient_name: input.recipientName,
      employer_name: input.employerName,
      reference_no: input.referenceNo,
      review_status: input.reviewStatus,
    },
  });
}
