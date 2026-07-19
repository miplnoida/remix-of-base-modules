/**
 * BN Overpayments — Command catalogue (25 commands, full lifecycle).
 *
 * Slice 1 of the Overpayment Recovery epic.
 *
 * Every mutation to an overpayment record must flow through one of these
 * commands via the Gap Command Pipeline. Direct table inserts from the
 * browser are prohibited (enforced by the gap-modules architecture guard).
 */

import type { BnGapCapability } from '@/services/bn/commands/benefitsCapabilityRegistry';

// ── Legacy names retained for compatibility with existing hooks ─────────
export type BnOverpaymentLegacyCommandName =
  | 'BN_OVP_ASSESS'
  | 'BN_OVP_NOTIFY'
  | 'BN_OVP_DISPUTE_OPEN'
  | 'BN_OVP_RECALCULATE'
  | 'BN_OVP_PROPOSE_ARRANGEMENT'
  | 'BN_OVP_ACTIVATE_ARRANGEMENT'
  | 'BN_OVP_RECORD_INSTALMENT'
  | 'BN_OVP_MARK_BREACHED'
  | 'BN_OVP_WRITE_OFF'
  | 'BN_OVP_REFER_LEGAL'
  | 'BN_OVP_CLOSE';

// ── Canonical 25-command catalogue ──────────────────────────────────────
export type BnOverpaymentCanonicalCommandName =
  | 'BN_OVP_CREATE_CANDIDATE'
  | 'BN_OVP_CALCULATE_LIABILITY'
  | 'BN_OVP_VERIFY'
  | 'BN_OVP_ISSUE_NOTICE'
  | 'BN_OVP_RECORD_REPRESENTATION'
  | 'BN_OVP_CONFIRM_LIABILITY'
  | 'BN_OVP_PROPOSE_RECOVERY_PLAN'
  | 'BN_OVP_APPROVE_RECOVERY_PLAN'
  | 'BN_OVP_REJECT_RECOVERY_PLAN'
  | 'BN_OVP_REVISE_RECOVERY_PLAN'
  | 'BN_OVP_ACTIVATE_BENEFIT_DEDUCTION'
  | 'BN_OVP_RECORD_RECEIPT'
  | 'BN_OVP_ALLOCATE_RECEIPT'
  | 'BN_OVP_REQUEST_WAIVER'
  | 'BN_OVP_APPROVE_WAIVER'
  | 'BN_OVP_REJECT_WAIVER'
  | 'BN_OVP_REQUEST_WRITEOFF'
  | 'BN_OVP_APPROVE_WRITEOFF'
  | 'BN_OVP_REJECT_WRITEOFF'
  | 'BN_OVP_REFER_LEGAL'
  | 'BN_OVP_REFER_ESTATE'
  | 'BN_OVP_REVERSE_TRANSACTION'
  | 'BN_OVP_RECONCILE'
  | 'BN_OVP_CLOSE'
  | 'BN_OVP_REOPEN';

export type BnOverpaymentCommandName =
  | BnOverpaymentCanonicalCommandName
  | BnOverpaymentLegacyCommandName;

export interface BnOverpaymentCommandSpec {
  readonly command: BnOverpaymentCommandName;
  readonly capability: BnGapCapability;
  readonly requiresMakerChecker: boolean;
  readonly transactional: boolean;
  /** Emits a `bn_recovery_transaction` row that affects outstanding balance. */
  readonly writesLedger: boolean;
  /** Publishes a Communication Hub event via the sending façade. */
  readonly emitsCommunication: boolean;
  /** Self-approval (same user as request maker) is denied. */
  readonly forbidsSelfApproval: boolean;
  /** Set true once the server RPC + edge handler ship (Slice 3). */
  readonly implemented: boolean;
}

const S = (
  command: BnOverpaymentCommandName,
  capability: BnGapCapability,
  opts: Partial<Omit<BnOverpaymentCommandSpec, 'command' | 'capability'>> = {},
): BnOverpaymentCommandSpec => ({
  command,
  capability,
  requiresMakerChecker: opts.requiresMakerChecker ?? false,
  transactional: opts.transactional ?? true,
  writesLedger: opts.writesLedger ?? false,
  emitsCommunication: opts.emitsCommunication ?? false,
  forbidsSelfApproval: opts.forbidsSelfApproval ?? false,
  implemented: opts.implemented ?? false,
});

export const BN_OVERPAYMENT_COMMANDS: readonly BnOverpaymentCommandSpec[] = [
  // Detection & verification
  S('BN_OVP_CREATE_CANDIDATE',          'bn_overpayments:write'),
  S('BN_OVP_CALCULATE_LIABILITY',       'bn_overpayments:write',  { transactional: true }),
  S('BN_OVP_VERIFY',                    'bn_overpayments:decide', { requiresMakerChecker: true, forbidsSelfApproval: true }),

  // Notice & representation
  S('BN_OVP_ISSUE_NOTICE',              'bn_overpayments:decide', { emitsCommunication: true }),
  S('BN_OVP_RECORD_REPRESENTATION',     'bn_overpayments:write'),
  S('BN_OVP_CONFIRM_LIABILITY',         'bn_overpayments:decide', { requiresMakerChecker: true, forbidsSelfApproval: true, writesLedger: true }),

  // Recovery plan
  S('BN_OVP_PROPOSE_RECOVERY_PLAN',     'bn_overpayments:write'),
  S('BN_OVP_APPROVE_RECOVERY_PLAN',     'bn_overpayments:decide', { requiresMakerChecker: true, forbidsSelfApproval: true }),
  S('BN_OVP_REJECT_RECOVERY_PLAN',      'bn_overpayments:decide', { requiresMakerChecker: true, forbidsSelfApproval: true }),
  S('BN_OVP_REVISE_RECOVERY_PLAN',      'bn_overpayments:write'),
  S('BN_OVP_ACTIVATE_BENEFIT_DEDUCTION','bn_overpayments:decide', { requiresMakerChecker: true }),

  // Receipts & allocation (finance boundary)
  S('BN_OVP_RECORD_RECEIPT',            'bn_overpayments:write',  { writesLedger: true }),
  S('BN_OVP_ALLOCATE_RECEIPT',          'bn_overpayments:write',  { writesLedger: true }),

  // Waiver
  S('BN_OVP_REQUEST_WAIVER',            'bn_overpayments:write'),
  S('BN_OVP_APPROVE_WAIVER',            'bn_overpayments:admin',  { requiresMakerChecker: true, forbidsSelfApproval: true, writesLedger: true }),
  S('BN_OVP_REJECT_WAIVER',             'bn_overpayments:admin',  { requiresMakerChecker: true, forbidsSelfApproval: true }),

  // Write-off
  S('BN_OVP_REQUEST_WRITEOFF',          'bn_overpayments:write'),
  S('BN_OVP_APPROVE_WRITEOFF',          'bn_overpayments:admin',  { requiresMakerChecker: true, forbidsSelfApproval: true, writesLedger: true }),
  S('BN_OVP_REJECT_WRITEOFF',           'bn_overpayments:admin',  { requiresMakerChecker: true, forbidsSelfApproval: true }),

  // Referrals
  S('BN_OVP_REFER_LEGAL',               'bn_overpayments:decide', { requiresMakerChecker: true }),
  S('BN_OVP_REFER_ESTATE',              'bn_overpayments:decide', { requiresMakerChecker: true }),

  // Adjustment & closure
  S('BN_OVP_REVERSE_TRANSACTION',       'bn_overpayments:admin',  { requiresMakerChecker: true, forbidsSelfApproval: true, writesLedger: true }),
  S('BN_OVP_RECONCILE',                 'bn_overpayments:decide'),
  S('BN_OVP_CLOSE',                     'bn_overpayments:decide'),
  S('BN_OVP_REOPEN',                    'bn_overpayments:admin'),
] as const;

const _lookup: Readonly<Record<BnOverpaymentCommandName, BnOverpaymentCommandSpec>> =
  Object.freeze(
    Object.fromEntries(BN_OVERPAYMENT_COMMANDS.map((c) => [c.command, c])),
  ) as Record<BnOverpaymentCommandName, BnOverpaymentCommandSpec>;

export function getOverpaymentCommandSpec(
  name: BnOverpaymentCommandName,
): BnOverpaymentCommandSpec | undefined {
  return _lookup[name];
}
