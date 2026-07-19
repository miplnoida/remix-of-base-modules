import type { BnGapCapability } from '@/services/bn/gap/gapCapabilityRegistry';

export type BnRiskCommandName =
  | 'BN_RISK_DETECT'
  | 'BN_RISK_TRIAGE'
  | 'BN_RISK_REQUEST_ENHANCED_VERIFICATION'
  | 'BN_RISK_OPEN_INVESTIGATION'
  | 'BN_RISK_HOLD_PAYMENT'
  | 'BN_RISK_CONFIRM_SYSTEM_ERROR'
  | 'BN_RISK_CORRECT_CLAIM'
  | 'BN_RISK_MARK_OVERPAYMENT_AVOIDED'
  | 'BN_RISK_REFER_LEGAL'
  | 'BN_RISK_CLEAR'
  | 'BN_RISK_RELEASE_HOLD'
  | 'BN_RISK_CLOSE';

export interface BnRiskCommandSpec {
  readonly command: BnRiskCommandName;
  readonly capability: BnGapCapability;
  readonly requiresMakerChecker: boolean;
  readonly transactional: boolean;
  readonly implemented: boolean;
}

export const BN_RISK_COMMANDS: readonly BnRiskCommandSpec[] = [
  { command: 'BN_RISK_DETECT',                          capability: 'bn_risk_management:write',   requiresMakerChecker: false, transactional: false, implemented: false },
  { command: 'BN_RISK_TRIAGE',                          capability: 'bn_risk_management:write',   requiresMakerChecker: false, transactional: false, implemented: false },
  { command: 'BN_RISK_REQUEST_ENHANCED_VERIFICATION',   capability: 'bn_risk_management:write',   requiresMakerChecker: false, transactional: false, implemented: false },
  { command: 'BN_RISK_OPEN_INVESTIGATION',              capability: 'bn_risk_management:decide',  requiresMakerChecker: true,  transactional: false, implemented: false },
  { command: 'BN_RISK_HOLD_PAYMENT',                    capability: 'bn_risk_management:decide',  requiresMakerChecker: true,  transactional: true,  implemented: false },
  { command: 'BN_RISK_CONFIRM_SYSTEM_ERROR',            capability: 'bn_risk_management:decide',  requiresMakerChecker: false, transactional: false, implemented: false },
  { command: 'BN_RISK_CORRECT_CLAIM',                   capability: 'bn_risk_management:decide',  requiresMakerChecker: true,  transactional: true,  implemented: false },
  { command: 'BN_RISK_MARK_OVERPAYMENT_AVOIDED',        capability: 'bn_risk_management:decide',  requiresMakerChecker: false, transactional: false, implemented: false },
  { command: 'BN_RISK_REFER_LEGAL',                     capability: 'bn_risk_management:decide',  requiresMakerChecker: true,  transactional: false, implemented: false },
  { command: 'BN_RISK_CLEAR',                           capability: 'bn_risk_management:decide',  requiresMakerChecker: true,  transactional: false, implemented: false },
  { command: 'BN_RISK_RELEASE_HOLD',                    capability: 'bn_risk_management:decide',  requiresMakerChecker: true,  transactional: true,  implemented: false },
  { command: 'BN_RISK_CLOSE',                           capability: 'bn_risk_management:decide',  requiresMakerChecker: false, transactional: false, implemented: false },
] as const;
