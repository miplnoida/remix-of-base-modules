/**
 * BN Means-Tests — Canonical state machine.
 */

export type BnMeansTestStatus =
  | 'DRAFT'
  | 'EVIDENCE_PENDING'
  | 'ASSESSED'
  | 'PASSED'
  | 'FAILED'
  | 'APPEALED'          // Failure appealed
  | 'OVERTURNED'        // Failure overturned via appeal
  | 'ELIGIBILITY_RERUN' // Eligibility re-run against updated outcome
  | 'AWARD_CREATED'     // Award produced from eligibility rerun
  | 'CLOSED';

export type BnMeansTestEventCode =
  | 'ASSESSMENT_STARTED'
  | 'EVIDENCE_ATTACHED'
  | 'ASSESSED'
  | 'PASSED'
  | 'FAILED'
  | 'APPEAL_LINKED'
  | 'OVERTURNED_VIA_APPEAL'
  | 'EVIDENCE_ADDED'
  | 'ELIGIBILITY_RERUN'
  | 'AWARD_CREATED'
  | 'CLOSED';

export const BN_MEANS_TEST_TRANSITIONS: Readonly<
  Record<BnMeansTestStatus, readonly BnMeansTestStatus[]>
> = {
  DRAFT: ['EVIDENCE_PENDING', 'ASSESSED'],
  EVIDENCE_PENDING: ['ASSESSED'],
  ASSESSED: ['PASSED', 'FAILED'],
  PASSED: ['ELIGIBILITY_RERUN', 'CLOSED'],
  FAILED: ['APPEALED', 'CLOSED'],
  APPEALED: ['OVERTURNED', 'CLOSED'],
  OVERTURNED: ['ELIGIBILITY_RERUN', 'CLOSED'],
  ELIGIBILITY_RERUN: ['AWARD_CREATED', 'CLOSED'],
  AWARD_CREATED: ['CLOSED'],
  CLOSED: [],
};

export function canTransition(from: BnMeansTestStatus, to: BnMeansTestStatus): boolean {
  return BN_MEANS_TEST_TRANSITIONS[from]?.includes(to) ?? false;
}
export function isTerminal(status: BnMeansTestStatus): boolean {
  return status === 'CLOSED';
}
