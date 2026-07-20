/**
 * BN Appeals & Disputes — Canonical state machine.
 *
 * BN-AP-01 §B:
 *   - Lifecycle status is separate from decision outcome.
 *   - Canonical decision state is DECIDED; outcome is stored on a distinct
 *     field. There is intentionally no DECIDED_UPHELD / DECIDED_OVERTURNED
 *     lifecycle state.
 *   - Adds CASE_PREPARATION (post-admissibility working stage),
 *     PARTIALLY_IMPLEMENTED (mid-implementation), and CANCELLED (terminal
 *     alternative to CLOSED for administrative disposal before decision).
 *
 * Transitions are enforced server-side by command handlers; this catalogue
 * is the single source of truth used by both UI and tests.
 */

export type BnAppealStatus =
  | 'DRAFT'                    // Being composed (staff intake only)
  | 'SUBMITTED'                // Received; awaiting acknowledgement
  | 'ACKNOWLEDGED'             // Registrar acknowledged; deadline confirmed
  | 'ADMISSIBILITY_REVIEW'     // Checking whether the appeal is admissible
  | 'ADMISSIBLE'               // Passed admissibility; awaiting work-up
  | 'CASE_PREPARATION'         // Working the file: evidence, submissions, briefing
  | 'INADMISSIBLE'             // Rejected on admissibility; terminal unless appealed further
  | 'HEARING_SCHEDULED'
  | 'HEARING_HELD'
  | 'RECOMMENDED'              // Maker proposed outcome; awaiting checker
  | 'DECIDED'                  // Formal outcome recorded (see BnAppealOutcome)
  | 'IMPLEMENTATION_PENDING'
  | 'PARTIALLY_IMPLEMENTED'    // Some downstream effects applied; others outstanding
  | 'IMPLEMENTED'              // Outcome fully applied to source module(s)
  | 'WITHDRAWN'                // Appellant withdrew
  | 'CANCELLED'                // Administratively cancelled (duplicate, error, void)
  | 'REFERRED_TO_LEGAL'        // Escalated to Legal module
  | 'CLOSED';                  // Terminal

export const BN_APPEAL_STATUSES = [
  'DRAFT','SUBMITTED','ACKNOWLEDGED','ADMISSIBILITY_REVIEW','ADMISSIBLE',
  'CASE_PREPARATION','INADMISSIBLE','HEARING_SCHEDULED','HEARING_HELD',
  'RECOMMENDED','DECIDED','IMPLEMENTATION_PENDING','PARTIALLY_IMPLEMENTED',
  'IMPLEMENTED','WITHDRAWN','CANCELLED','REFERRED_TO_LEGAL','CLOSED',
] as const satisfies readonly BnAppealStatus[];

/**
 * Decision outcome — stored separately from lifecycle status.
 * Only meaningful when `status === 'DECIDED'` (or a terminal post-decision
 * state); pre-decision rows carry `outcome = null`.
 */
export type BnAppealOutcome =
  | 'UPHELD'
  | 'OVERTURNED_FULL'
  | 'OVERTURNED_PARTIAL'
  | 'REMITTED'
  | 'INADMISSIBLE'
  | 'WITHDRAWN';

export const BN_APPEAL_OUTCOMES = [
  'UPHELD','OVERTURNED_FULL','OVERTURNED_PARTIAL','REMITTED','INADMISSIBLE','WITHDRAWN',
] as const satisfies readonly BnAppealOutcome[];

export type BnAppealEventCode =
  | 'SUBMITTED'
  | 'ACKNOWLEDGED'
  | 'ADMISSIBILITY_REVIEW_STARTED'
  | 'ADMISSIBILITY_ACCEPTED'
  | 'ADMISSIBILITY_REJECTED'
  | 'CASE_PREPARATION_STARTED'
  | 'HEARING_SCHEDULED'
  | 'HEARING_HELD'
  | 'OUTCOME_RECOMMENDED'
  | 'DECIDED'
  | 'IMPLEMENTATION_STARTED'
  | 'PARTIALLY_IMPLEMENTED'
  | 'IMPLEMENTED'
  | 'WITHDRAWN'
  | 'CANCELLED'
  | 'REFERRED_TO_LEGAL'
  | 'REOPENED'
  | 'CLOSED';

/**
 * Allowed FORWARD transitions in the ordinary lifecycle.
 * Reverse transitions are never permitted here; RECOMMENDED → ADMISSIBILITY_REVIEW
 * is expressed as the explicit `BN_APPEAL_RETURN_RECOMMENDATION` command
 * (see appealCommands.ts, BN-AP-01 §F), not a reverse transition.
 */
export const BN_APPEAL_TRANSITIONS: Readonly<Record<BnAppealStatus, readonly BnAppealStatus[]>> = {
  DRAFT: ['SUBMITTED', 'WITHDRAWN', 'CANCELLED'],
  SUBMITTED: ['ACKNOWLEDGED', 'WITHDRAWN', 'CANCELLED'],
  ACKNOWLEDGED: ['ADMISSIBILITY_REVIEW', 'WITHDRAWN', 'CANCELLED'],
  ADMISSIBILITY_REVIEW: ['ADMISSIBLE', 'INADMISSIBLE', 'WITHDRAWN', 'CANCELLED'],
  ADMISSIBLE: ['CASE_PREPARATION', 'HEARING_SCHEDULED', 'RECOMMENDED', 'REFERRED_TO_LEGAL', 'WITHDRAWN'],
  CASE_PREPARATION: ['HEARING_SCHEDULED', 'RECOMMENDED', 'WITHDRAWN'],
  HEARING_SCHEDULED: ['HEARING_HELD', 'WITHDRAWN'],
  HEARING_HELD: ['CASE_PREPARATION', 'RECOMMENDED', 'DECIDED'],
  // Formal return-to-admissibility is authorised via BN_APPEAL_RETURN_RECOMMENDATION,
  // not a lifecycle-level reverse transition.
  RECOMMENDED: ['DECIDED'],
  DECIDED: ['IMPLEMENTATION_PENDING', 'CLOSED', 'REFERRED_TO_LEGAL'],
  IMPLEMENTATION_PENDING: ['PARTIALLY_IMPLEMENTED', 'IMPLEMENTED'],
  PARTIALLY_IMPLEMENTED: ['IMPLEMENTED', 'CLOSED'],
  IMPLEMENTED: ['CLOSED'],
  INADMISSIBLE: ['CLOSED', 'REFERRED_TO_LEGAL'],
  REFERRED_TO_LEGAL: ['CLOSED'],
  WITHDRAWN: ['CLOSED'],
  CANCELLED: [],
  CLOSED: [],
};

export function canTransition(from: BnAppealStatus, to: BnAppealStatus): boolean {
  return BN_APPEAL_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Terminal states — no ORDINARY outgoing transition is permitted. Exceptional
 * transitions (see BN_APPEAL_EXCEPTIONAL_TRANSITIONS below) may still restore
 * a terminal appeal under admin + maker-checker authority.
 */
export const BN_APPEAL_TERMINAL_STATES: readonly BnAppealStatus[] = ['CLOSED', 'CANCELLED'];

export function isTerminal(status: BnAppealStatus): boolean {
  return BN_APPEAL_TERMINAL_STATES.includes(status);
}

/**
 * BN-AP-01 §F — Exceptional transitions.
 *
 * Authorised escape hatches from terminal or otherwise-final states.
 * These are NOT part of the ordinary transition graph and are only reachable
 * via a named command (`BN_APPEAL_REOPEN`) that requires `bn_appeals:admin`
 * capability AND maker-checker approval. Both the original terminal status
 * and the authorised restoration status are audited on `bn_appeal_event`.
 */
export interface BnAppealExceptionalTransition {
  readonly from: BnAppealStatus;
  readonly to: BnAppealStatus;
  readonly command: 'BN_APPEAL_REOPEN' | 'BN_APPEAL_RETURN_RECOMMENDATION';
  readonly requiredCapability: 'bn_appeals:admin';
  readonly requiresMakerChecker: true;
  readonly rationale: string;
}

export const BN_APPEAL_EXCEPTIONAL_TRANSITIONS: readonly BnAppealExceptionalTransition[] = [
  { from: 'CLOSED',    to: 'SUBMITTED', command: 'BN_APPEAL_REOPEN', requiredCapability: 'bn_appeals:admin', requiresMakerChecker: true,
    rationale: 'Reopen a closed appeal (new evidence, procedural error, or superior authority direction).' },
  { from: 'CANCELLED', to: 'SUBMITTED', command: 'BN_APPEAL_REOPEN', requiredCapability: 'bn_appeals:admin', requiresMakerChecker: true,
    rationale: 'Restore an administratively cancelled appeal (cancellation error).' },
  { from: 'WITHDRAWN', to: 'SUBMITTED', command: 'BN_APPEAL_REOPEN', requiredCapability: 'bn_appeals:admin', requiresMakerChecker: true,
    rationale: 'Restore a withdrawn appeal (withdrawal repudiated by appellant).' },
  { from: 'RECOMMENDED', to: 'ADMISSIBILITY_REVIEW', command: 'BN_APPEAL_RETURN_RECOMMENDATION', requiredCapability: 'bn_appeals:admin', requiresMakerChecker: true,
    rationale: 'Formal return of a recommendation to admissibility (deciding officer rejects recommendation).' },
] as const;

export function isExceptionalTransition(from: BnAppealStatus, to: BnAppealStatus): boolean {
  return BN_APPEAL_EXCEPTIONAL_TRANSITIONS.some((t) => t.from === from && t.to === to);
}

export function findExceptionalTransition(
  from: BnAppealStatus,
  to: BnAppealStatus,
): BnAppealExceptionalTransition | undefined {
  return BN_APPEAL_EXCEPTIONAL_TRANSITIONS.find((t) => t.from === from && t.to === to);
}

/** Statuses considered "open" for worklist / SLA aggregation. */
export const BN_APPEAL_OPEN_STATES: readonly BnAppealStatus[] = [
  'DRAFT','SUBMITTED','ACKNOWLEDGED','ADMISSIBILITY_REVIEW','ADMISSIBLE',
  'CASE_PREPARATION','HEARING_SCHEDULED','HEARING_HELD','RECOMMENDED','DECIDED',
  'IMPLEMENTATION_PENDING','PARTIALLY_IMPLEMENTED','REFERRED_TO_LEGAL',
];

export function isOpen(status: BnAppealStatus): boolean {
  return BN_APPEAL_OPEN_STATES.includes(status);
}

/**
 * Human-facing appeal type catalogue. Codes match the values stored in
 * `bn_appeal.appeal_type_code`. Extend cautiously — additive only.
 * (BN-AP-01 §I.1 also materialises this in `bn_appeal_type_config`.)
 */
export const BN_APPEAL_TYPE_CATALOG: readonly {
  readonly code: string;
  readonly label: string;
  readonly appliesTo: readonly ('bn_claim' | 'bn_award' | 'bn_overpayment' | 'bn_means_test' | 'bn_medical')[];
  readonly requiresHearing: boolean;
  readonly statutoryFilingDays: number;
}[] = [
  { code: 'CLAIM_DENIED',            label: 'Claim denied',                        appliesTo: ['bn_claim'],       requiresHearing: false, statutoryFilingDays: 30 },
  { code: 'RATE_DISPUTE',            label: 'Rate / calculation dispute',          appliesTo: ['bn_claim', 'bn_award'], requiresHearing: false, statutoryFilingDays: 30 },
  { code: 'ELIGIBILITY_DISPUTE',     label: 'Eligibility determination',           appliesTo: ['bn_claim'],       requiresHearing: false, statutoryFilingDays: 30 },
  { code: 'AWARD_SUSPENDED',         label: 'Award suspended / stopped',           appliesTo: ['bn_award'],       requiresHearing: false, statutoryFilingDays: 30 },
  { code: 'AWARD_REDUCED',           label: 'Award reduced',                       appliesTo: ['bn_award'],       requiresHearing: false, statutoryFilingDays: 30 },
  { code: 'OVERPAYMENT_DISPUTE',     label: 'Overpayment challenge',               appliesTo: ['bn_overpayment'], requiresHearing: false, statutoryFilingDays: 30 },
  { code: 'MEDICAL_ASSESSMENT',      label: 'Medical assessment challenge',        appliesTo: ['bn_medical'],     requiresHearing: true,  statutoryFilingDays: 30 },
  { code: 'MEANS_TEST_OUTCOME',      label: 'Means-test outcome',                  appliesTo: ['bn_means_test'],  requiresHearing: false, statutoryFilingDays: 30 },
  { code: 'PROCEDURAL_FAIRNESS',     label: 'Procedural fairness',                 appliesTo: ['bn_claim', 'bn_award'], requiresHearing: true, statutoryFilingDays: 30 },
  { code: 'OTHER',                   label: 'Other',                               appliesTo: ['bn_claim', 'bn_award', 'bn_overpayment', 'bn_means_test', 'bn_medical'], requiresHearing: false, statutoryFilingDays: 30 },
] as const;

export function isValidAppealTypeCode(code: string): boolean {
  return BN_APPEAL_TYPE_CATALOG.some((t) => t.code === code);
}

/** Standard ground codes — appellant can select one or more. */
export const BN_APPEAL_GROUND_CODES: readonly string[] = [
  'EVIDENCE_NOT_CONSIDERED',
  'NEW_EVIDENCE',
  'RATE_CALCULATION_ERROR',
  'MISAPPLIED_LAW',
  'PROCEDURAL_ERROR',
  'IDENTITY_ERROR',
  'MEDICAL_DISAGREEMENT',
  'GENERAL',
] as const;
