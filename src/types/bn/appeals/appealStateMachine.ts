/**
 * BN Appeals & Disputes — Canonical state machine.
 *
 * States mirror `bn_appeal.status`. Transitions are enforced server-side by
 * command handlers; this catalogue is the single source of truth used by
 * both UI (state chips, allowed actions) and tests.
 */

export type BnAppealStatus =
  | 'DRAFT'                 // Being composed (staff intake only)
  | 'SUBMITTED'             // Received; awaiting acknowledgement
  | 'ACKNOWLEDGED'          // Registrar acknowledged; deadline confirmed
  | 'ADMISSIBILITY_REVIEW'  // Checking whether the appeal is admissible
  | 'ADMISSIBLE'            // Passed admissibility; awaiting hearing/decision
  | 'INADMISSIBLE'          // Rejected on admissibility; terminal unless appealed further
  | 'HEARING_SCHEDULED'
  | 'HEARING_HELD'
  | 'RECOMMENDED'           // Maker proposed outcome; awaiting checker
  | 'DECIDED'               // Formal outcome recorded
  | 'IMPLEMENTATION_PENDING'
  | 'IMPLEMENTED'           // Outcome applied to source module(s)
  | 'WITHDRAWN'             // Appellant withdrew
  | 'REFERRED_TO_LEGAL'     // Escalated to Legal module
  | 'CLOSED';               // Terminal

export type BnAppealOutcome =
  | 'UPHELD'                 // Original decision stands
  | 'OVERTURNED_FULL'        // Decision fully reversed
  | 'OVERTURNED_PARTIAL'     // Partial reversal (e.g. recalculation)
  | 'REMITTED'               // Sent back for re-decision
  | 'INADMISSIBLE'
  | 'WITHDRAWN';

export type BnAppealEventCode =
  | 'SUBMITTED'
  | 'ACKNOWLEDGED'
  | 'ADMISSIBILITY_REVIEW_STARTED'
  | 'ADMISSIBILITY_ACCEPTED'
  | 'ADMISSIBILITY_REJECTED'
  | 'HEARING_SCHEDULED'
  | 'HEARING_HELD'
  | 'OUTCOME_RECOMMENDED'
  | 'DECIDED'
  | 'IMPLEMENTATION_STARTED'
  | 'IMPLEMENTED'
  | 'WITHDRAWN'
  | 'REFERRED_TO_LEGAL'
  | 'REOPENED'
  | 'CLOSED';

/** Allowed forward transitions. Reverse transitions are never permitted. */
export const BN_APPEAL_TRANSITIONS: Readonly<Record<BnAppealStatus, readonly BnAppealStatus[]>> = {
  DRAFT: ['SUBMITTED', 'WITHDRAWN'],
  SUBMITTED: ['ACKNOWLEDGED', 'WITHDRAWN'],
  ACKNOWLEDGED: ['ADMISSIBILITY_REVIEW', 'WITHDRAWN'],
  ADMISSIBILITY_REVIEW: ['ADMISSIBLE', 'INADMISSIBLE', 'WITHDRAWN'],
  ADMISSIBLE: ['HEARING_SCHEDULED', 'RECOMMENDED', 'REFERRED_TO_LEGAL', 'WITHDRAWN'],
  HEARING_SCHEDULED: ['HEARING_HELD', 'WITHDRAWN'],
  HEARING_HELD: ['RECOMMENDED', 'DECIDED'],
  RECOMMENDED: ['DECIDED', 'ADMISSIBILITY_REVIEW'],
  DECIDED: ['IMPLEMENTATION_PENDING', 'CLOSED', 'REFERRED_TO_LEGAL'],
  IMPLEMENTATION_PENDING: ['IMPLEMENTED'],
  IMPLEMENTED: ['CLOSED'],
  INADMISSIBLE: ['CLOSED', 'REFERRED_TO_LEGAL'],
  REFERRED_TO_LEGAL: ['CLOSED'],
  WITHDRAWN: ['CLOSED'],
  CLOSED: [],
};

export function canTransition(from: BnAppealStatus, to: BnAppealStatus): boolean {
  return BN_APPEAL_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Terminal states — no further transitions allowed. */
export const BN_APPEAL_TERMINAL_STATES: readonly BnAppealStatus[] = ['CLOSED'];

export function isTerminal(status: BnAppealStatus): boolean {
  return BN_APPEAL_TERMINAL_STATES.includes(status);
}

/**
 * Human-facing appeal type catalogue. Codes match the values stored in
 * `bn_appeal.appeal_type_code`. Extend cautiously — additive only.
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
