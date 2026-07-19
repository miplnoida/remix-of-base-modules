/**
 * BN Overpayments — Canonical state machine (full lifecycle).
 *
 * Slice 1 of the Overpayment Recovery epic.
 *
 * This file is the single source of truth for:
 *   • Overpayment header lifecycle (`BnOverpaymentStatus`)
 *   • Recovery plan lifecycle (`BnRecoveryPlanStatus`)
 *   • Event codes emitted into `bn_overpayment_event`
 *   • Cause taxonomy
 *
 * Legacy status codes retained for backward compatibility with the existing
 * `/bn/overpayments` list — the runtime maps legacy values into the new
 * lifecycle without data loss.
 */

// ── Overpayment lifecycle ────────────────────────────────────────────────

export type BnOverpaymentStatus =
  // Canonical lifecycle (per epic)
  | 'DETECTED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'NOTICE_PENDING'
  | 'REPRESENTATION_PERIOD'
  | 'CONFIRMED'
  | 'RECOVERY_PLANNING'
  | 'RECOVERING'
  | 'RECOVERED'
  | 'RECONCILED'
  | 'CLOSED'
  // Outcomes
  | 'DISPUTED'
  | 'CANCELLED'
  | 'PARTIALLY_WAIVED'
  | 'WAIVED'
  | 'PARTIALLY_WRITTEN_OFF'
  | 'WRITTEN_OFF'
  | 'LEGAL_RECOVERY'
  | 'ESTATE_RECOVERY'
  | 'REOPENED'
  // Legacy (mapped on read; never a transition target for new records)
  | 'DRAFT'
  | 'ASSESSED'
  | 'NOTIFIED'
  | 'ARRANGEMENT_PROPOSED'
  | 'ARRANGEMENT_ACTIVE'
  | 'ARRANGEMENT_BREACHED'
  | 'PARTIALLY_RECOVERED_WRITE_OFF'
  | 'REFERRED_TO_LEGAL';

export type BnOverpaymentCause =
  | 'PAYMENT_AFTER_DEATH'
  | 'MEANS_TEST_FAILURE'
  | 'INCOME_UNDECLARED'
  | 'FRAUD'
  | 'SYSTEM_ERROR'
  | 'ADMIN_ERROR'
  | 'RATE_MISCALCULATION'
  | 'DUPLICATE_PAYMENT'
  | 'CLAIMANT_ERROR'
  | 'OTHER';

export type BnOverpaymentResponsibleParty =
  | 'CLAIMANT'
  | 'BENEFICIARY'
  | 'EMPLOYER'
  | 'STAFF'
  | 'SYSTEM'
  | 'THIRD_PARTY';

export type BnOverpaymentEventCode =
  | 'DETECTED'
  | 'REVIEW_STARTED'
  | 'LIABILITY_CALCULATED'
  | 'VERIFIED'
  | 'NOTICE_ISSUED'
  | 'REPRESENTATION_RECEIVED'
  | 'DISPUTE_OPENED'
  | 'DISPUTE_DECIDED'
  | 'LIABILITY_CONFIRMED'
  | 'RECOVERY_PLAN_PROPOSED'
  | 'RECOVERY_PLAN_APPROVED'
  | 'RECOVERY_PLAN_REJECTED'
  | 'RECOVERY_PLAN_REVISED'
  | 'RECOVERY_PLAN_ACTIVATED'
  | 'RECOVERY_PLAN_DEFAULTED'
  | 'RECOVERY_PLAN_COMPLETED'
  | 'DEDUCTION_ACTIVATED'
  | 'RECEIPT_RECORDED'
  | 'RECEIPT_ALLOCATED'
  | 'WAIVER_REQUESTED'
  | 'WAIVER_APPROVED'
  | 'WAIVER_REJECTED'
  | 'WRITEOFF_REQUESTED'
  | 'WRITEOFF_APPROVED'
  | 'WRITEOFF_REJECTED'
  | 'REFERRED_LEGAL'
  | 'REFERRED_ESTATE'
  | 'TRANSACTION_REVERSED'
  | 'RECONCILED'
  | 'CLOSED'
  | 'REOPENED';

/**
 * Canonical transitions. Legacy states are intentionally absent — they are
 * one-way-mapped to canonical states on read (`mapLegacyStatus`).
 */
export const BN_OVERPAYMENT_TRANSITIONS: Readonly<
  Partial<Record<BnOverpaymentStatus, readonly BnOverpaymentStatus[]>>
> = {
  DETECTED:               ['UNDER_REVIEW', 'CANCELLED'],
  UNDER_REVIEW:           ['VERIFIED', 'CANCELLED'],
  VERIFIED:               ['NOTICE_PENDING', 'CANCELLED'],
  NOTICE_PENDING:         ['REPRESENTATION_PERIOD'],
  REPRESENTATION_PERIOD:  ['CONFIRMED', 'DISPUTED', 'CANCELLED'],
  DISPUTED:               ['UNDER_REVIEW', 'CONFIRMED', 'CANCELLED'],
  CONFIRMED:              ['RECOVERY_PLANNING', 'WAIVED', 'PARTIALLY_WAIVED', 'WRITTEN_OFF', 'PARTIALLY_WRITTEN_OFF', 'LEGAL_RECOVERY', 'ESTATE_RECOVERY'],
  RECOVERY_PLANNING:      ['RECOVERING', 'WAIVED', 'PARTIALLY_WAIVED', 'LEGAL_RECOVERY'],
  RECOVERING:             ['RECOVERED', 'PARTIALLY_WAIVED', 'PARTIALLY_WRITTEN_OFF', 'LEGAL_RECOVERY', 'ESTATE_RECOVERY', 'DISPUTED'],
  RECOVERED:              ['RECONCILED'],
  RECONCILED:             ['CLOSED'],
  PARTIALLY_WAIVED:       ['RECOVERING', 'WRITTEN_OFF', 'PARTIALLY_WRITTEN_OFF', 'RECONCILED'],
  WAIVED:                 ['RECONCILED'],
  PARTIALLY_WRITTEN_OFF:  ['RECOVERING', 'WRITTEN_OFF', 'RECONCILED'],
  WRITTEN_OFF:            ['RECONCILED'],
  LEGAL_RECOVERY:         ['RECOVERING', 'PARTIALLY_WRITTEN_OFF', 'WRITTEN_OFF', 'RECOVERED'],
  ESTATE_RECOVERY:        ['RECOVERING', 'PARTIALLY_WRITTEN_OFF', 'WRITTEN_OFF', 'RECOVERED'],
  CLOSED:                 ['REOPENED'],
  REOPENED:               ['UNDER_REVIEW', 'RECOVERY_PLANNING', 'RECOVERING'],
  CANCELLED:              [],
};

export function canTransition(from: BnOverpaymentStatus, to: BnOverpaymentStatus): boolean {
  return BN_OVERPAYMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

export const BN_OVERPAYMENT_TERMINAL_STATES: readonly BnOverpaymentStatus[] = ['CLOSED', 'CANCELLED'];
export function isTerminal(status: BnOverpaymentStatus): boolean {
  return BN_OVERPAYMENT_TERMINAL_STATES.includes(status);
}

/**
 * Map legacy statuses (from the current `bn_overpayment` data) to their
 * closest canonical equivalent for display and gating. Pure, deterministic,
 * no I/O — safe to import anywhere.
 */
export function mapLegacyStatus(status: string): BnOverpaymentStatus {
  switch (status) {
    case 'DRAFT':                          return 'DETECTED';
    case 'ASSESSED':                       return 'UNDER_REVIEW';
    case 'NOTIFIED':                       return 'REPRESENTATION_PERIOD';
    case 'ARRANGEMENT_PROPOSED':           return 'RECOVERY_PLANNING';
    case 'ARRANGEMENT_ACTIVE':             return 'RECOVERING';
    case 'ARRANGEMENT_BREACHED':           return 'RECOVERING';
    case 'PARTIALLY_RECOVERED_WRITE_OFF':  return 'PARTIALLY_WRITTEN_OFF';
    case 'REFERRED_TO_LEGAL':              return 'LEGAL_RECOVERY';
    default:
      // Already canonical, or unknown → returned as-is (typed cast).
      return status as BnOverpaymentStatus;
  }
}

// ── Recovery plan lifecycle ─────────────────────────────────────────────

export type BnRecoveryPlanStatus =
  | 'DRAFT'
  | 'PROPOSED'
  | 'APPROVAL_PENDING'
  | 'APPROVED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'REJECTED'
  | 'DEFAULTED'
  | 'SUSPENDED'
  | 'REVISED'
  | 'CANCELLED';

export type BnRecoveryMethod =
  | 'BENEFIT_DEDUCTION'
  | 'INSTALMENT'
  | 'LUMP_SUM'
  | 'MIXED'
  | 'EXTERNAL_COLLECTION'
  | 'ESTATE_RECOVERY'
  | 'LEGAL_RECOVERY'
  | 'WAIVER'
  | 'WRITE_OFF';

export type BnRecoveryFrequency =
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'ONE_OFF';

export const BN_RECOVERY_PLAN_TRANSITIONS: Readonly<
  Record<BnRecoveryPlanStatus, readonly BnRecoveryPlanStatus[]>
> = {
  DRAFT:            ['PROPOSED', 'CANCELLED'],
  PROPOSED:         ['APPROVAL_PENDING', 'REVISED', 'REJECTED', 'CANCELLED'],
  APPROVAL_PENDING: ['APPROVED', 'REJECTED', 'REVISED'],
  APPROVED:         ['ACTIVE', 'CANCELLED'],
  ACTIVE:           ['COMPLETED', 'DEFAULTED', 'SUSPENDED', 'REVISED', 'CANCELLED'],
  SUSPENDED:        ['ACTIVE', 'CANCELLED', 'REVISED'],
  REVISED:          ['PROPOSED', 'APPROVAL_PENDING'],
  DEFAULTED:        ['ACTIVE', 'CANCELLED'],
  REJECTED:         [],
  COMPLETED:        [],
  CANCELLED:        [],
};

export const BN_RECOVERY_PLAN_TERMINAL_STATES: readonly BnRecoveryPlanStatus[] = [
  'COMPLETED', 'REJECTED', 'CANCELLED',
];
export function canPlanTransition(from: BnRecoveryPlanStatus, to: BnRecoveryPlanStatus): boolean {
  return BN_RECOVERY_PLAN_TRANSITIONS[from]?.includes(to) ?? false;
}
export function isPlanTerminal(status: BnRecoveryPlanStatus): boolean {
  return BN_RECOVERY_PLAN_TERMINAL_STATES.includes(status);
}

// ── Reachability (used by tests) ────────────────────────────────────────

export function reachableStates(
  from: BnOverpaymentStatus,
  transitions: typeof BN_OVERPAYMENT_TRANSITIONS = BN_OVERPAYMENT_TRANSITIONS,
): Set<BnOverpaymentStatus> {
  const seen = new Set<BnOverpaymentStatus>();
  const stack: BnOverpaymentStatus[] = [from];
  while (stack.length) {
    const s = stack.pop()!;
    if (seen.has(s)) continue;
    seen.add(s);
    for (const next of transitions[s] ?? []) stack.push(next);
  }
  return seen;
}
