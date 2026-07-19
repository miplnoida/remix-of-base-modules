/**
 * BN Mortality — Canonical command catalogue (Slice 1).
 *
 * Registers every mortality-lifecycle command so the capability matrix,
 * pipeline, OpenAPI contract, and future .NET port stay in lock-step.
 *
 * Every command:
 *   - has a required capability (see gapCapabilityRegistry)
 *   - declares whether maker-checker separation is required
 *   - declares whether it is transactional (must run inside a single DB txn)
 *   - declares whether it requires a justification / reason code
 *
 * Handlers are wired in Slice 3.
 */
import type { BnGapCapability } from '@/services/bn/gap/gapCapabilityRegistry';

export type BnMortalityCommandName =
  | 'BN_MORTALITY_REGISTER_REPORT'
  | 'BN_MORTALITY_ATTACH_EVIDENCE'
  | 'BN_MORTALITY_SUBMIT_FOR_VERIFICATION'
  | 'BN_MORTALITY_PLACE_PROVISIONAL_HOLD'
  | 'BN_MORTALITY_CONFIRM_VERIFICATION'
  | 'BN_MORTALITY_REJECT_REPORT'
  | 'BN_MORTALITY_RECORD_CONFLICT'
  | 'BN_MORTALITY_APPROVE_IMPACT'
  | 'BN_MORTALITY_TERMINATE_AWARD'
  | 'BN_MORTALITY_CREATE_PAD_OVERPAYMENT'
  | 'BN_MORTALITY_INITIATE_SURVIVOR_ASSESSMENT'
  | 'BN_MORTALITY_INITIATE_FUNERAL_GRANT'
  | 'BN_MORTALITY_REFER_LEGAL'
  | 'BN_MORTALITY_REVERSE_CONFIRMATION'
  | 'BN_MORTALITY_CLOSE_EVENT';

export interface BnMortalityCommandSpec {
  readonly command: BnMortalityCommandName;
  readonly capability: BnGapCapability;
  readonly requiresMakerChecker: boolean;
  readonly transactional: boolean;
  readonly requiresJustification: boolean;
  readonly implemented: boolean;
}

export const BN_MORTALITY_COMMANDS: readonly BnMortalityCommandSpec[] = [
  { command: 'BN_MORTALITY_REGISTER_REPORT',              capability: 'bn_mortality:write',          requiresMakerChecker: false, transactional: false, requiresJustification: false, implemented: false },
  { command: 'BN_MORTALITY_ATTACH_EVIDENCE',              capability: 'bn_mortality:write',          requiresMakerChecker: false, transactional: false, requiresJustification: false, implemented: false },
  { command: 'BN_MORTALITY_SUBMIT_FOR_VERIFICATION',      capability: 'bn_mortality:write',          requiresMakerChecker: false, transactional: false, requiresJustification: false, implemented: false },
  { command: 'BN_MORTALITY_PLACE_PROVISIONAL_HOLD',       capability: 'bn_mortality:decide',         requiresMakerChecker: false, transactional: true,  requiresJustification: true,  implemented: false },
  { command: 'BN_MORTALITY_CONFIRM_VERIFICATION',         capability: 'bn_mortality:verify',         requiresMakerChecker: true,  transactional: true,  requiresJustification: false, implemented: false },
  { command: 'BN_MORTALITY_REJECT_REPORT',                capability: 'bn_mortality:decide',         requiresMakerChecker: true,  transactional: false, requiresJustification: true,  implemented: false },
  { command: 'BN_MORTALITY_RECORD_CONFLICT',              capability: 'bn_mortality:write',          requiresMakerChecker: false, transactional: false, requiresJustification: true,  implemented: false },
  { command: 'BN_MORTALITY_APPROVE_IMPACT',               capability: 'bn_mortality:approve_impact', requiresMakerChecker: true,  transactional: true,  requiresJustification: false, implemented: false },
  { command: 'BN_MORTALITY_TERMINATE_AWARD',              capability: 'bn_mortality:decide',         requiresMakerChecker: true,  transactional: true,  requiresJustification: true,  implemented: false },
  { command: 'BN_MORTALITY_CREATE_PAD_OVERPAYMENT',       capability: 'bn_mortality:decide',         requiresMakerChecker: true,  transactional: true,  requiresJustification: true,  implemented: false },
  { command: 'BN_MORTALITY_INITIATE_SURVIVOR_ASSESSMENT', capability: 'bn_mortality:write',          requiresMakerChecker: false, transactional: false, requiresJustification: false, implemented: false },
  { command: 'BN_MORTALITY_INITIATE_FUNERAL_GRANT',       capability: 'bn_mortality:write',          requiresMakerChecker: false, transactional: false, requiresJustification: false, implemented: false },
  { command: 'BN_MORTALITY_REFER_LEGAL',                  capability: 'bn_mortality:decide',         requiresMakerChecker: true,  transactional: false, requiresJustification: true,  implemented: false },
  { command: 'BN_MORTALITY_REVERSE_CONFIRMATION',         capability: 'bn_mortality:reverse',        requiresMakerChecker: true,  transactional: true,  requiresJustification: true,  implemented: false },
  { command: 'BN_MORTALITY_CLOSE_EVENT',                  capability: 'bn_mortality:decide',         requiresMakerChecker: false, transactional: false, requiresJustification: false, implemented: false },
] as const;

export function getMortalityCommandSpec(
  command: BnMortalityCommandName,
): BnMortalityCommandSpec {
  const spec = BN_MORTALITY_COMMANDS.find((c) => c.command === command);
  if (!spec) {
    throw new Error(`Unknown BN_MORTALITY command: ${command}`);
  }
  return spec;
}
