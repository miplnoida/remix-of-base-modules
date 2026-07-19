/**
 * BN Mortality — Canonical command catalogue.
 * Registers every mortality-lifecycle command so the capability matrix,
 * OpenAPI contract, and .NET port stay in lock-step.
 */
import type { BnGapCapability } from '@/services/bn/gap/gapCapabilityRegistry';

export type BnMortalityCommandName =
  | 'BN_MORTALITY_REPORT'                       // Report a death
  | 'BN_MORTALITY_REQUEST_VERIFICATION'         // Ask registrar / IP for confirmation
  | 'BN_MORTALITY_VERIFY'                       // Verified from authoritative source
  | 'BN_MORTALITY_DISPUTE'                      // Family disputes
  | 'BN_MORTALITY_REJECT'                       // Notification rejected as false
  | 'BN_MORTALITY_HOLD_AWARDS'                  // Hold all affected award payments
  | 'BN_MORTALITY_TERMINATE_AWARDS'             // Terminate affected awards (transactional)
  | 'BN_MORTALITY_RAISE_PAD_OVERPAYMENT'        // Payment-after-death overpayment
  | 'BN_MORTALITY_OPEN_SURVIVOR_ASSESSMENT'     // Handoff to survivor benefits
  | 'BN_MORTALITY_OPEN_FUNERAL_OPPORTUNITY'     // Handoff to funeral benefits
  | 'BN_MORTALITY_RAISE_ESTATE_REFERRAL'        // Handoff to Legal (estate)
  | 'BN_MORTALITY_CLOSE';

export interface BnMortalityCommandSpec {
  readonly command: BnMortalityCommandName;
  readonly capability: BnGapCapability;
  readonly requiresMakerChecker: boolean;
  readonly transactional: boolean;
  readonly implemented: boolean;
}

export const BN_MORTALITY_COMMANDS: readonly BnMortalityCommandSpec[] = [
  { command: 'BN_MORTALITY_REPORT',                    capability: 'bn_mortality:write',   requiresMakerChecker: false, transactional: false, implemented: false },
  { command: 'BN_MORTALITY_REQUEST_VERIFICATION',      capability: 'bn_mortality:write',   requiresMakerChecker: false, transactional: false, implemented: false },
  { command: 'BN_MORTALITY_VERIFY',                    capability: 'bn_mortality:decide',  requiresMakerChecker: true,  transactional: true,  implemented: false },
  { command: 'BN_MORTALITY_DISPUTE',                   capability: 'bn_mortality:write',   requiresMakerChecker: false, transactional: false, implemented: false },
  { command: 'BN_MORTALITY_REJECT',                    capability: 'bn_mortality:decide',  requiresMakerChecker: true,  transactional: false, implemented: false },
  { command: 'BN_MORTALITY_HOLD_AWARDS',               capability: 'bn_mortality:decide',  requiresMakerChecker: false, transactional: true,  implemented: false },
  { command: 'BN_MORTALITY_TERMINATE_AWARDS',          capability: 'bn_mortality:decide',  requiresMakerChecker: true,  transactional: true,  implemented: false },
  { command: 'BN_MORTALITY_RAISE_PAD_OVERPAYMENT',     capability: 'bn_mortality:decide',  requiresMakerChecker: true,  transactional: true,  implemented: false },
  { command: 'BN_MORTALITY_OPEN_SURVIVOR_ASSESSMENT',  capability: 'bn_mortality:write',   requiresMakerChecker: false, transactional: false, implemented: false },
  { command: 'BN_MORTALITY_OPEN_FUNERAL_OPPORTUNITY',  capability: 'bn_mortality:write',   requiresMakerChecker: false, transactional: false, implemented: false },
  { command: 'BN_MORTALITY_RAISE_ESTATE_REFERRAL',     capability: 'bn_mortality:decide',  requiresMakerChecker: true,  transactional: false, implemented: false },
  { command: 'BN_MORTALITY_CLOSE',                     capability: 'bn_mortality:decide',  requiresMakerChecker: false, transactional: false, implemented: false },
] as const;
