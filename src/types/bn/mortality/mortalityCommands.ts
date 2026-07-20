/**
 * BN Mortality — command spec (re-exports from the canonical catalogue).
 *
 * BN-MORT-UI-1D §D: the historic hand-maintained array here is now derived
 * from `mortalityCommandCatalog.ts`. Do not edit fields in this file —
 * change the canonical catalogue and the parity test enforces sync with
 * the edge function.
 */
import type { BnGapCapability } from '@/services/bn/commands/benefitsCapabilityRegistry';
import { MORTALITY_COMMAND_CATALOG } from './mortalityCommandCatalog';

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
  readonly implemented: boolean;
  readonly blocker?: string;
}

/** Derived — DO NOT hand-edit. Update `mortalityCommandCatalog.ts` instead. */
export const BN_MORTALITY_COMMANDS: readonly BnMortalityCommandSpec[] =
  MORTALITY_COMMAND_CATALOG.map((c) => ({
    command: c.command as BnMortalityCommandName,
    capability: c.capability as BnGapCapability,
    requiresMakerChecker: c.requiresMakerChecker,
    transactional: c.transactional,
    requiresJustification: c.requiresJustification,
    implemented: c.implemented,
    blocker: c.blocker,
  }));

export function getMortalityCommandSpec(
  command: BnMortalityCommandName,
): BnMortalityCommandSpec {
  const spec = BN_MORTALITY_COMMANDS.find((c) => c.command === command);
  if (!spec) throw new Error(`Unknown BN_MORTALITY command: ${command}`);
  return spec;
}
