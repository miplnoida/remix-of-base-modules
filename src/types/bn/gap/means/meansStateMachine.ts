/**
 * BN Means-Test — Canonical assessment lifecycle.
 *
 * Slice 1 of the Means-Test Assessment epic. Pure, no I/O.
 *
 * Single source of truth for:
 *   • Assessment lifecycle (`BnMeansAssessmentStatus`)
 *   • Result outcomes (`BnMeansResult`)
 *   • Event codes emitted into `bn_means_event`
 */

export type BnMeansAssessmentStatus =
  // Canonical lifecycle (per epic)
  | 'DRAFT'
  | 'INFORMATION_PENDING'
  | 'SUBMITTED'
  | 'VERIFICATION_PENDING'
  | 'CALCULATED'
  | 'REVIEW_PENDING'
  | 'APPROVAL_PENDING'
  | 'APPROVED'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'REASSESSMENT_DUE'
  | 'SUPERSEDED'
  | 'CLOSED'
  // Outcomes
  | 'INCOMPLETE'
  | 'FAILED_VERIFICATION'
  | 'REJECTED'
  | 'CANCELLED'
  | 'UNDER_APPEAL';

/** The passed/failed outcome of a completed calculation (independent of status). */
export type BnMeansResult = 'PASS' | 'FAIL' | 'REFER' | 'PROVISIONAL';

export type BnMeansEventCode =
  | 'CREATED'
  | 'INFORMATION_REQUESTED'
  | 'INFORMATION_RECEIVED'
  | 'SUBMITTED'
  | 'VERIFICATION_STARTED'
  | 'VERIFICATION_PASSED'
  | 'VERIFICATION_FAILED'
  | 'CALCULATED'
  | 'ADJUSTMENT_REQUESTED'
  | 'ADJUSTMENT_APPROVED'
  | 'ADJUSTMENT_REJECTED'
  | 'REVIEW_STARTED'
  | 'APPROVAL_REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'ACTIVATED'
  | 'FACT_PUBLISHED'
  | 'REASSESSMENT_SCHEDULED'
  | 'REASSESSMENT_DUE'
  | 'CHANGE_OF_CIRCUMSTANCE_RECORDED'
  | 'EXPIRED'
  | 'SUPERSEDED'
  | 'APPEAL_LINKED'
  | 'APPEAL_OVERTURNED'
  | 'CLOSED'
  | 'CANCELLED';

/**
 * Canonical transitions.
 * Terminal / absorbing states have empty transition lists.
 */
export const BN_MEANS_TRANSITIONS: Readonly<
  Record<BnMeansAssessmentStatus, readonly BnMeansAssessmentStatus[]>
> = {
  DRAFT:                ['INFORMATION_PENDING', 'SUBMITTED', 'INCOMPLETE', 'CANCELLED'],
  INFORMATION_PENDING:  ['SUBMITTED', 'INCOMPLETE', 'CANCELLED'],
  SUBMITTED:            ['VERIFICATION_PENDING', 'CALCULATED', 'INCOMPLETE', 'CANCELLED'],
  VERIFICATION_PENDING: ['CALCULATED', 'FAILED_VERIFICATION', 'INFORMATION_PENDING', 'CANCELLED'],
  CALCULATED:           ['REVIEW_PENDING', 'APPROVAL_PENDING', 'REJECTED', 'CANCELLED'],
  REVIEW_PENDING:       ['CALCULATED', 'APPROVAL_PENDING', 'REJECTED', 'CANCELLED'],
  APPROVAL_PENDING:     ['APPROVED', 'REJECTED', 'REVIEW_PENDING', 'CANCELLED'],
  APPROVED:             ['ACTIVE', 'CANCELLED'],
  ACTIVE:               ['REASSESSMENT_DUE', 'EXPIRED', 'SUPERSEDED', 'UNDER_APPEAL', 'CLOSED'],
  REASSESSMENT_DUE:     ['ACTIVE', 'EXPIRED', 'SUPERSEDED', 'CLOSED'],
  EXPIRED:              ['SUPERSEDED', 'CLOSED'],
  SUPERSEDED:           ['CLOSED'],
  UNDER_APPEAL:         ['ACTIVE', 'SUPERSEDED', 'REJECTED', 'CLOSED'],
  // Outcome / terminal states
  INCOMPLETE:           ['DRAFT', 'CANCELLED'],
  FAILED_VERIFICATION:  ['INFORMATION_PENDING', 'REJECTED', 'CANCELLED'],
  REJECTED:             ['UNDER_APPEAL', 'CLOSED'],
  CANCELLED:            [],
  CLOSED:               [],
};

export const BN_MEANS_TERMINAL_STATES: readonly BnMeansAssessmentStatus[] = ['CLOSED', 'CANCELLED'];

export function canMeansTransition(
  from: BnMeansAssessmentStatus,
  to: BnMeansAssessmentStatus,
): boolean {
  return BN_MEANS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isMeansTerminal(status: BnMeansAssessmentStatus): boolean {
  return BN_MEANS_TERMINAL_STATES.includes(status);
}

/** Statuses at which the assessment MAY be used as an eligibility fact. */
export const BN_MEANS_FACT_PUBLISHABLE_STATES: readonly BnMeansAssessmentStatus[] = [
  'ACTIVE',
  'REASSESSMENT_DUE', // still valid until expiry
];

export function isFactPublishable(status: BnMeansAssessmentStatus): boolean {
  return BN_MEANS_FACT_PUBLISHABLE_STATES.includes(status);
}

/** Legacy status normaliser — mirrors overpayment pattern. */
export function mapLegacyMeansStatus(status: string): BnMeansAssessmentStatus {
  switch (status) {
    case 'NEW':
    case 'OPEN':          return 'DRAFT';
    case 'PENDING':       return 'SUBMITTED';
    case 'IN_REVIEW':     return 'REVIEW_PENDING';
    case 'PASSED':        return 'ACTIVE';
    case 'FAILED':        return 'REJECTED';
    default:              return status as BnMeansAssessmentStatus;
  }
}

/** Reachability closure — used by tests to prove no orphan states. */
export function reachableMeansStates(
  from: BnMeansAssessmentStatus,
): Set<BnMeansAssessmentStatus> {
  const seen = new Set<BnMeansAssessmentStatus>();
  const stack: BnMeansAssessmentStatus[] = [from];
  while (stack.length) {
    const s = stack.pop()!;
    if (seen.has(s)) continue;
    seen.add(s);
    for (const next of BN_MEANS_TRANSITIONS[s] ?? []) stack.push(next);
  }
  return seen;
}
