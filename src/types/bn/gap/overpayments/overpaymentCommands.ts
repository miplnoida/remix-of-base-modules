import type { BnGapCapability } from '@/services/bn/gap/gapCapabilityRegistry';

export type BnOverpaymentCommandName =
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

export interface BnOverpaymentCommandSpec {
  readonly command: BnOverpaymentCommandName;
  readonly capability: BnGapCapability;
  readonly requiresMakerChecker: boolean;
  readonly transactional: boolean;
  readonly writesLedger: boolean;
  readonly implemented: boolean;
}

export const BN_OVERPAYMENT_COMMANDS: readonly BnOverpaymentCommandSpec[] = [
  { command: 'BN_OVP_ASSESS',                capability: 'bn_overpayments:write',   requiresMakerChecker: false, transactional: true,  writesLedger: false, implemented: false },
  { command: 'BN_OVP_NOTIFY',                capability: 'bn_overpayments:decide',  requiresMakerChecker: true,  transactional: false, writesLedger: false, implemented: false },
  { command: 'BN_OVP_DISPUTE_OPEN',          capability: 'bn_overpayments:write',   requiresMakerChecker: false, transactional: false, writesLedger: false, implemented: false },
  { command: 'BN_OVP_RECALCULATE',           capability: 'bn_overpayments:decide',  requiresMakerChecker: true,  transactional: true,  writesLedger: true,  implemented: false },
  { command: 'BN_OVP_PROPOSE_ARRANGEMENT',   capability: 'bn_overpayments:write',   requiresMakerChecker: false, transactional: false, writesLedger: false, implemented: false },
  { command: 'BN_OVP_ACTIVATE_ARRANGEMENT',  capability: 'bn_overpayments:decide',  requiresMakerChecker: true,  transactional: true,  writesLedger: false, implemented: false },
  { command: 'BN_OVP_RECORD_INSTALMENT',     capability: 'bn_overpayments:write',   requiresMakerChecker: false, transactional: true,  writesLedger: true,  implemented: false },
  { command: 'BN_OVP_MARK_BREACHED',         capability: 'bn_overpayments:write',   requiresMakerChecker: false, transactional: false, writesLedger: false, implemented: false },
  { command: 'BN_OVP_WRITE_OFF',             capability: 'bn_overpayments:admin',   requiresMakerChecker: true,  transactional: true,  writesLedger: true,  implemented: false },
  { command: 'BN_OVP_REFER_LEGAL',           capability: 'bn_overpayments:decide',  requiresMakerChecker: true,  transactional: false, writesLedger: false, implemented: false },
  { command: 'BN_OVP_CLOSE',                 capability: 'bn_overpayments:decide',  requiresMakerChecker: false, transactional: false, writesLedger: false, implemented: false },
] as const;
