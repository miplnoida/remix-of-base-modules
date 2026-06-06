/**
 * Transition Registry — allowed (fromStatus, action, toStatus) tuples.
 * Used by the Transition Matrix editor to prevent impossible transitions.
 */
export interface AllowedTransition {
  from: string;
  action: string;
  to: string;
}

export const CLAIM_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'INTAKE_REVIEW',
  'EVIDENCE_REVIEW',
  'MEDICAL_REVIEW',
  'DECISION_PENDING',
  'APPROVED',
  'REJECTED',
  'WITHDRAWN',
  'REOPENED',
  'CLOSED',
] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const CLAIM_ACTIONS = [
  'SUBMIT',
  'ASSIGN_INTAKE',
  'REQUEST_EVIDENCE',
  'EVIDENCE_RECEIVED',
  'REFER_MEDICAL',
  'MEDICAL_DECISION',
  'APPROVE',
  'REJECT',
  'WITHDRAW',
  'REOPEN',
  'CLOSE',
] as const;
export type ClaimAction = (typeof CLAIM_ACTIONS)[number];

export const ALLOWED_TRANSITIONS: readonly AllowedTransition[] = [
  { from: 'DRAFT', action: 'SUBMIT', to: 'SUBMITTED' },
  { from: 'SUBMITTED', action: 'ASSIGN_INTAKE', to: 'INTAKE_REVIEW' },
  { from: 'INTAKE_REVIEW', action: 'REQUEST_EVIDENCE', to: 'EVIDENCE_REVIEW' },
  { from: 'EVIDENCE_REVIEW', action: 'EVIDENCE_RECEIVED', to: 'EVIDENCE_REVIEW' },
  { from: 'EVIDENCE_REVIEW', action: 'REFER_MEDICAL', to: 'MEDICAL_REVIEW' },
  { from: 'MEDICAL_REVIEW', action: 'MEDICAL_DECISION', to: 'DECISION_PENDING' },
  { from: 'EVIDENCE_REVIEW', action: 'APPROVE', to: 'APPROVED' },
  { from: 'DECISION_PENDING', action: 'APPROVE', to: 'APPROVED' },
  { from: 'DECISION_PENDING', action: 'REJECT', to: 'REJECTED' },
  { from: 'SUBMITTED', action: 'WITHDRAW', to: 'WITHDRAWN' },
  { from: 'INTAKE_REVIEW', action: 'WITHDRAW', to: 'WITHDRAWN' },
  { from: 'EVIDENCE_REVIEW', action: 'WITHDRAW', to: 'WITHDRAWN' },
  { from: 'REJECTED', action: 'REOPEN', to: 'REOPENED' },
  { from: 'CLOSED', action: 'REOPEN', to: 'REOPENED' },
  { from: 'APPROVED', action: 'CLOSE', to: 'CLOSED' },
] as const;

export function isAllowedTransition(from: string, action: string, to: string): boolean {
  return ALLOWED_TRANSITIONS.some((t) => t.from === from && t.action === action && t.to === to);
}

export function getValidActions(from: string): string[] {
  return Array.from(new Set(ALLOWED_TRANSITIONS.filter((t) => t.from === from).map((t) => t.action)));
}

export function getValidTargets(from: string, action: string): string[] {
  return ALLOWED_TRANSITIONS.filter((t) => t.from === from && t.action === action).map((t) => t.to);
}
