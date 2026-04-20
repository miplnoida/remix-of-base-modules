/**
 * Phase F — Online employer submissions captured via the public
 * acknowledgment portal (token-gated, no auth).
 */

export type FindingResponseStatus =
  | 'RECEIVED'
  | 'UNDER_REVIEW'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'WITHDRAWN';

export type FindingDisputeStatus =
  | 'RECEIVED'
  | 'UNDER_REVIEW'
  | 'UPHELD'
  | 'REJECTED'
  | 'WITHDRAWN';

export interface FindingResponseSubmission {
  id: string;
  inspection_id: string;
  finding_id: string;
  acknowledgment_id: string | null;
  link_token: string;
  submitter_name: string;
  submitter_designation: string | null;
  submitter_email: string | null;
  response_text: string;
  attachment_url: string | null;
  status: FindingResponseStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  linked_response_id: string | null;
  submitted_at: string;
  created_at: string;
}

export interface FindingDisputeSubmission {
  id: string;
  inspection_id: string;
  finding_id: string | null;
  violation_id: string | null;
  acknowledgment_id: string | null;
  link_token: string;
  submitter_name: string;
  submitter_designation: string | null;
  submitter_email: string | null;
  dispute_reason: string;
  dispute_details: string;
  evidence_url: string | null;
  status: FindingDisputeStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  linked_dispute_id: string | null;
  submitted_at: string;
  created_at: string;
}

export interface SubmitFindingResponseInput {
  token: string;
  inspectionId: string;
  findingId: string;
  acknowledgmentId?: string | null;
  submitterName: string;
  submitterDesignation?: string;
  submitterEmail?: string;
  responseText: string;
  attachmentUrl?: string;
}

export interface SubmitFindingDisputeInput {
  token: string;
  inspectionId: string;
  findingId?: string;
  violationId?: string;
  acknowledgmentId?: string | null;
  submitterName: string;
  submitterDesignation?: string;
  submitterEmail?: string;
  disputeReason: string;
  disputeDetails: string;
  evidenceUrl?: string;
}
