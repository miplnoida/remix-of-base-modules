/**
 * BN Risk — Assessment state machine (Slice 1 canonical).
 *
 * A "risk assessment" is opened from one or more CONFIRMED signals. It
 * gathers factors, requests evidence, produces a recommendation, obtains
 * approval, and either executes an internal control action or refers the
 * case to Legal / Investigation. Assessments never terminate a benefit on
 * score alone — every benefit-affecting outcome requires APPROVAL_PENDING
 * → CONTROL_ACTION or REFERRED.
 *
 * Happy path:
 *   DRAFT → OPEN → INFORMATION_PENDING → REVIEW → RECOMMENDATION →
 *   APPROVAL_PENDING → CONTROL_ACTION → COMPLETED → CLOSED
 *
 * Referral outcome:
 *   … → APPROVAL_PENDING → REFERRED → COMPLETED → CLOSED
 */

export type BnRiskAssessmentStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'INFORMATION_PENDING'
  | 'REVIEW'
  | 'RECOMMENDATION'
  | 'APPROVAL_PENDING'
  | 'REFERRED'
  | 'CONTROL_ACTION'
  | 'COMPLETED'
  | 'CLOSED';

export const BN_RISK_ASSESSMENT_TERMINAL_STATES: readonly BnRiskAssessmentStatus[] = [
  'CLOSED',
];

export const BN_RISK_ASSESSMENT_TRANSITIONS: Readonly<
  Record<BnRiskAssessmentStatus, readonly BnRiskAssessmentStatus[]>
> = {
  DRAFT: ['OPEN', 'CLOSED'],
  OPEN: ['INFORMATION_PENDING', 'REVIEW', 'CLOSED'],
  INFORMATION_PENDING: ['REVIEW', 'CLOSED'],
  REVIEW: ['RECOMMENDATION', 'INFORMATION_PENDING'],
  RECOMMENDATION: ['APPROVAL_PENDING', 'REVIEW'],
  APPROVAL_PENDING: ['REFERRED', 'CONTROL_ACTION', 'REVIEW'],
  REFERRED: ['COMPLETED'],
  CONTROL_ACTION: ['COMPLETED'],
  COMPLETED: ['CLOSED'],
  CLOSED: [],
};

export function canRiskAssessmentTransition(
  from: BnRiskAssessmentStatus,
  to: BnRiskAssessmentStatus,
): boolean {
  return BN_RISK_ASSESSMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isRiskAssessmentTerminal(status: BnRiskAssessmentStatus): boolean {
  return BN_RISK_ASSESSMENT_TERMINAL_STATES.includes(status);
}

export function reachableRiskAssessmentStates(
  from: BnRiskAssessmentStatus,
): readonly BnRiskAssessmentStatus[] {
  const seen = new Set<BnRiskAssessmentStatus>([from]);
  const stack: BnRiskAssessmentStatus[] = [from];
  while (stack.length) {
    const s = stack.pop() as BnRiskAssessmentStatus;
    for (const next of BN_RISK_ASSESSMENT_TRANSITIONS[s] ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        stack.push(next);
      }
    }
  }
  return Array.from(seen);
}
