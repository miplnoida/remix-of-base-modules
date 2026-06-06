/**
 * Communication Event Registry — workflow events that can trigger comms templates.
 */
export interface CommunicationEventDef {
  key: string;
  label: string;
  description?: string;
}

export const COMMUNICATION_EVENTS: readonly CommunicationEventDef[] = [
  { key: 'CLAIM_SUBMITTED', label: 'Claim submitted' },
  { key: 'EVIDENCE_REQUESTED', label: 'Evidence requested' },
  { key: 'EVIDENCE_RECEIVED', label: 'Evidence received' },
  { key: 'MEDICAL_REFERRAL', label: 'Medical referral' },
  { key: 'MEDICAL_DECISION', label: 'Medical decision rendered' },
  { key: 'CLAIM_APPROVED', label: 'Claim approved' },
  { key: 'CLAIM_REJECTED', label: 'Claim rejected' },
  { key: 'AWARD_ACTIVATED', label: 'Award activated' },
  { key: 'AWARD_SUSPENDED', label: 'Award suspended' },
  { key: 'AWARD_TERMINATED', label: 'Award terminated' },
  { key: 'PAYMENT_ISSUED', label: 'Payment issued' },
  { key: 'PAYMENT_FAILED', label: 'Payment failed' },
  { key: 'LIFE_CERT_DUE', label: 'Life certificate due' },
  { key: 'LIFE_CERT_OVERDUE', label: 'Life certificate overdue' },
  { key: 'OVERPAYMENT_RAISED', label: 'Overpayment raised' },
  { key: 'REVIEW_DUE', label: 'Periodic review due' },
] as const;

export type CommunicationEventKey = (typeof COMMUNICATION_EVENTS)[number]['key'];
