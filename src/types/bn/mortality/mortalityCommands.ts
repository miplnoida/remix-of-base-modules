/**
 * BN Mortality — Canonical command catalogue.
 *
 * Every command declares:
 *   - required capability (see benefitsCapabilityRegistry)
 *   - maker-checker separation requirement
 *   - transactional requirement
 *   - justification / reason code requirement
 *   - implemented flag (see BN-MORT-2B.1 §15 gate)
 */
import type { BnGapCapability } from '@/services/bn/commands/benefitsCapabilityRegistry';

export type BnMortalityCommandName =
  | 'BN_MORTALITY_DRAFT_SAVE'
  | 'BN_MORTALITY_REGISTER_REPORT'
  | 'BN_MORTALITY_CANCEL'
  | 'BN_MORTALITY_MATCH_PERSON'
  | 'BN_MORTALITY_MARK_DUPLICATE'
  | 'BN_MORTALITY_ASSIGN'
  | 'BN_MORTALITY_ATTACH_EVIDENCE'
  | 'BN_MORTALITY_SUBMIT_FOR_VERIFICATION'
  | 'BN_MORTALITY_PLACE_PROVISIONAL_HOLD'
  | 'BN_MORTALITY_RELEASE_HOLD'
  | 'BN_MORTALITY_RECORD_CONFLICT'
  | 'BN_MORTALITY_RESOLVE_CONFLICT'
  | 'BN_MORTALITY_CONFIRM_VERIFICATION'
  | 'BN_MORTALITY_REJECT_REPORT'
  | 'BN_MORTALITY_PREPARE_IMPACT'
  | 'BN_MORTALITY_SUBMIT_IMPACT'
  | 'BN_MORTALITY_RETURN_IMPACT'
  | 'BN_MORTALITY_APPROVE_IMPACT'
  | 'BN_MORTALITY_TERMINATE_AWARD'
  | 'BN_MORTALITY_CREATE_PAD_OVERPAYMENT'
  | 'BN_MORTALITY_INITIATE_SURVIVOR_ASSESSMENT'
  | 'BN_MORTALITY_INITIATE_FUNERAL_GRANT'
  | 'BN_MORTALITY_COMPLETE_FOLLOWON'
  | 'BN_MORTALITY_REFER_LEGAL'
  | 'BN_MORTALITY_REVERSE_CONFIRMATION'
  | 'BN_MORTALITY_CLOSE_EVENT';

export interface BnMortalityCommandSpec {
  readonly command: BnMortalityCommandName;
  readonly capability: BnGapCapability;
  readonly requiresMakerChecker: boolean;
  readonly transactional: boolean;
  readonly requiresJustification: boolean;
  /**
   * True only when server validation, state transition, actual side effect,
   * and integration boundary (where required) are all present and tested.
   */
  readonly implemented: boolean;
  readonly blocker?: string;
}

export const BN_MORTALITY_COMMANDS: readonly BnMortalityCommandSpec[] = [
  { command: 'BN_MORTALITY_DRAFT_SAVE',                   capability: 'bn_mortality:write',            requiresMakerChecker: false, transactional: false, requiresJustification: false, implemented: true },
  { command: 'BN_MORTALITY_REGISTER_REPORT',              capability: 'bn_mortality:write',            requiresMakerChecker: false, transactional: false, requiresJustification: false, implemented: true },
  { command: 'BN_MORTALITY_CANCEL',                       capability: 'bn_mortality:write',            requiresMakerChecker: false, transactional: false, requiresJustification: true,  implemented: true },
  { command: 'BN_MORTALITY_MATCH_PERSON',                 capability: 'bn_mortality:write',     requiresMakerChecker: false, transactional: true,  requiresJustification: false, implemented: true },
  { command: 'BN_MORTALITY_MARK_DUPLICATE',               capability: 'bn_mortality:write',            requiresMakerChecker: false, transactional: false, requiresJustification: true,  implemented: true },
  { command: 'BN_MORTALITY_ASSIGN',                       capability: 'bn_mortality:write',           requiresMakerChecker: false, transactional: false, requiresJustification: false, implemented: true },
  { command: 'BN_MORTALITY_ATTACH_EVIDENCE',              capability: 'bn_mortality:write',            requiresMakerChecker: false, transactional: false, requiresJustification: false, implemented: false, blocker: 'BN-MORT-2B.1 §7 — DMS/core_generated_document link boundary not yet wired; evidence persists only in metadata_json.' },
  { command: 'BN_MORTALITY_SUBMIT_FOR_VERIFICATION',      capability: 'bn_mortality:write',            requiresMakerChecker: false, transactional: false, requiresJustification: false, implemented: true },
  { command: 'BN_MORTALITY_PLACE_PROVISIONAL_HOLD',       capability: 'bn_mortality:decide',           requiresMakerChecker: false, transactional: true,  requiresJustification: true,  implemented: true },
  { command: 'BN_MORTALITY_RELEASE_HOLD',                 capability: 'bn_mortality:decide',     requiresMakerChecker: false, transactional: true,  requiresJustification: true,  implemented: true },
  { command: 'BN_MORTALITY_RECORD_CONFLICT',              capability: 'bn_mortality:write',            requiresMakerChecker: false, transactional: false, requiresJustification: true,  implemented: true },
  { command: 'BN_MORTALITY_RESOLVE_CONFLICT',             capability: 'bn_mortality:decide', requiresMakerChecker: false, transactional: false, requiresJustification: true,  implemented: true },
  { command: 'BN_MORTALITY_CONFIRM_VERIFICATION',         capability: 'bn_mortality:verify',           requiresMakerChecker: true,  transactional: true,  requiresJustification: false, implemented: true },
  { command: 'BN_MORTALITY_REJECT_REPORT',                capability: 'bn_mortality:decide',           requiresMakerChecker: true,  transactional: false, requiresJustification: true,  implemented: true },
  { command: 'BN_MORTALITY_PREPARE_IMPACT',               capability: 'bn_mortality:write',   requiresMakerChecker: false, transactional: true,  requiresJustification: false, implemented: false, blocker: 'BN-MORT-2B.1 §3 — Real person→award→schedule scan and PAD exposure calculation pending; current handler only transitions state.' },
  { command: 'BN_MORTALITY_SUBMIT_IMPACT',                capability: 'bn_mortality:write',    requiresMakerChecker: false, transactional: false, requiresJustification: false, implemented: true },
  { command: 'BN_MORTALITY_RETURN_IMPACT',                capability: 'bn_mortality:decide',    requiresMakerChecker: false, transactional: false, requiresJustification: true,  implemented: true },
  { command: 'BN_MORTALITY_APPROVE_IMPACT',               capability: 'bn_mortality:approve_impact',   requiresMakerChecker: true,  transactional: true,  requiresJustification: false, implemented: true },
  { command: 'BN_MORTALITY_TERMINATE_AWARD',              capability: 'bn_mortality:decide',           requiresMakerChecker: true,  transactional: true,  requiresJustification: true,  implemented: false, blocker: 'BN-MORT-2B.1 §5 — Canonical Award servicing termination RPC not invoked; bn_award status/schedules untouched.' },
  { command: 'BN_MORTALITY_CREATE_PAD_OVERPAYMENT',       capability: 'bn_mortality:decide',           requiresMakerChecker: true,  transactional: true,  requiresJustification: true,  implemented: false, blocker: 'BN-MORT-2B.1 §6 — No canonical Overpayment boundary invocation; handler accepts client-supplied overpayment id.' },
  { command: 'BN_MORTALITY_INITIATE_SURVIVOR_ASSESSMENT', capability: 'bn_mortality:write',            requiresMakerChecker: false, transactional: false, requiresJustification: false, implemented: false, blocker: 'BN-MORT-2B.1 §8 — Survivor intake workflow-backed referral not yet created.' },
  { command: 'BN_MORTALITY_INITIATE_FUNERAL_GRANT',       capability: 'bn_mortality:write',            requiresMakerChecker: false, transactional: false, requiresJustification: false, implemented: false, blocker: 'BN-MORT-2B.1 §8 — Funeral grant intake workflow-backed referral not yet created.' },
  { command: 'BN_MORTALITY_COMPLETE_FOLLOWON',            capability: 'bn_mortality:decide', requiresMakerChecker: false, transactional: false, requiresJustification: false, implemented: false, blocker: 'BN-MORT-2B.1 §9 — Impact/referral completion gate not enforced.' },
  { command: 'BN_MORTALITY_REFER_LEGAL',                  capability: 'bn_mortality:decide',           requiresMakerChecker: true,  transactional: false, requiresJustification: true,  implemented: false, blocker: 'BN-MORT-2B.1 §8 — lg_case_intake workflow-backed referral not yet created.' },
  { command: 'BN_MORTALITY_REVERSE_CONFIRMATION',         capability: 'bn_mortality:reverse',          requiresMakerChecker: true,  transactional: true,  requiresJustification: true,  implemented: true },
  { command: 'BN_MORTALITY_CLOSE_EVENT',                  capability: 'bn_mortality:decide',           requiresMakerChecker: false, transactional: false, requiresJustification: false, implemented: false, blocker: 'BN-MORT-2B.1 §9 — Closure gate (impacts applied, PAD linked, referrals resolved, no active holds) not enforced.' },
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
