/**
 * BN Overpayments — Canonical state machine.
 */

export type BnOverpaymentStatus =
  | 'DRAFT'
  | 'ASSESSED'                 // Amount and cause calculated
  | 'NOTIFIED'                 // Debtor formally notified
  | 'DISPUTED'                 // Debtor disputes / opens appeal path
  | 'ARRANGEMENT_PROPOSED'
  | 'ARRANGEMENT_ACTIVE'       // Recovery plan running
  | 'ARRANGEMENT_BREACHED'
  | 'RECOVERED'                // Fully recovered
  | 'PARTIALLY_RECOVERED_WRITE_OFF'
  | 'REFERRED_TO_LEGAL'
  | 'CLOSED';

export type BnOverpaymentCause =
  | 'PAYMENT_AFTER_DEATH'
  | 'MEANS_TEST_FAILURE'
  | 'INCOME_UNDECLARED'
  | 'FRAUD'
  | 'SYSTEM_ERROR'
  | 'ADMIN_ERROR'
  | 'RATE_MISCALCULATION'
  | 'OTHER';

export type BnOverpaymentEventCode =
  | 'ASSESSED'
  | 'NOTIFIED'
  | 'DISPUTED'
  | 'DECISION_VARIED'          // Appeal decision changed the liability
  | 'RECALCULATED'
  | 'ARRANGEMENT_PROPOSED'
  | 'ARRANGEMENT_ACTIVATED'
  | 'INSTALMENT_RECEIVED'
  | 'ARRANGEMENT_BREACHED'
  | 'RECOVERED'
  | 'WRITE_OFF_APPROVED'
  | 'REFERRED_TO_LEGAL'
  | 'CLOSED';

export const BN_OVERPAYMENT_TRANSITIONS: Readonly<
  Record<BnOverpaymentStatus, readonly BnOverpaymentStatus[]>
> = {
  DRAFT: ['ASSESSED'],
  ASSESSED: ['NOTIFIED', 'CLOSED'],
  NOTIFIED: ['DISPUTED', 'ARRANGEMENT_PROPOSED', 'RECOVERED', 'REFERRED_TO_LEGAL'],
  DISPUTED: ['ASSESSED', 'NOTIFIED', 'CLOSED'], // recalculated -> back to assessed
  ARRANGEMENT_PROPOSED: ['ARRANGEMENT_ACTIVE', 'NOTIFIED'],
  ARRANGEMENT_ACTIVE: ['ARRANGEMENT_BREACHED', 'RECOVERED', 'PARTIALLY_RECOVERED_WRITE_OFF'],
  ARRANGEMENT_BREACHED: ['ARRANGEMENT_ACTIVE', 'REFERRED_TO_LEGAL', 'PARTIALLY_RECOVERED_WRITE_OFF'],
  RECOVERED: ['CLOSED'],
  PARTIALLY_RECOVERED_WRITE_OFF: ['CLOSED'],
  REFERRED_TO_LEGAL: ['CLOSED', 'RECOVERED'],
  CLOSED: [],
};

export function canTransition(from: BnOverpaymentStatus, to: BnOverpaymentStatus): boolean {
  return BN_OVERPAYMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

export const BN_OVERPAYMENT_TERMINAL_STATES: readonly BnOverpaymentStatus[] = ['CLOSED'];
export function isTerminal(status: BnOverpaymentStatus): boolean {
  return BN_OVERPAYMENT_TERMINAL_STATES.includes(status);
}
