/**
 * BN Appeals — Canonical command catalogue.
 *
 * These are the appeal-lifecycle command names that either exist today or
 * are scheduled for follow-up slices. Registering them up-front keeps the
 * capability matrix, action inventory, and OpenAPI contract in lock-step.
 *
 * Handlers are added incrementally. The submit-claimant path is the FIRST
 * to be wired end-to-end; every other command name is present here so that
 * capability grants and audit inventories are complete from day one.
 */
import type { BnGapCapability } from '@/services/bn/gap/gapCapabilityRegistry';

export type BnAppealCommandName =
  | 'BN_APPEAL_SUBMIT_CLAIMANT'
  | 'BN_APPEAL_REGISTER_STAFF'
  | 'BN_APPEAL_ACKNOWLEDGE'
  | 'BN_APPEAL_REVIEW_ADMISSIBILITY'
  | 'BN_APPEAL_ASSIGN'
  | 'BN_APPEAL_ATTACH_EVIDENCE'
  | 'BN_APPEAL_SCHEDULE_HEARING'
  | 'BN_APPEAL_RECORD_HEARING_OUTCOME'
  | 'BN_APPEAL_RECOMMEND_OUTCOME'
  | 'BN_APPEAL_DECIDE'
  | 'BN_APPEAL_IMPLEMENT'
  | 'BN_APPEAL_WITHDRAW'
  | 'BN_APPEAL_REFER_LEGAL'
  | 'BN_APPEAL_CLOSE'
  | 'BN_APPEAL_REOPEN';

export interface BnAppealCommandSpec {
  readonly command: BnAppealCommandName;
  readonly capability: BnGapCapability;
  readonly requiresMakerChecker: boolean;
  readonly writesTo: readonly (
    | 'bn_appeal'
    | 'bn_appeal_ground'
    | 'bn_appeal_evidence'
    | 'bn_appeal_event'
    | 'bn_appeal_hearing_link'
    | 'bn_appeal_decision_snapshot'
  )[];
  readonly requiresOwnershipCheck: boolean;
  readonly implemented: boolean;
}

export const BN_APPEAL_COMMANDS: readonly BnAppealCommandSpec[] = [
  { command: 'BN_APPEAL_SUBMIT_CLAIMANT',      capability: 'bn_appeals:claimant_submit' as BnGapCapability, requiresMakerChecker: false, writesTo: ['bn_appeal','bn_appeal_ground','bn_appeal_event','bn_appeal_decision_snapshot'], requiresOwnershipCheck: true, implemented: true },
  { command: 'BN_APPEAL_REGISTER_STAFF',       capability: 'bn_appeals:write',                                requiresMakerChecker: false, writesTo: ['bn_appeal','bn_appeal_ground','bn_appeal_event','bn_appeal_decision_snapshot'], requiresOwnershipCheck: false, implemented: false },
  { command: 'BN_APPEAL_ACKNOWLEDGE',          capability: 'bn_appeals:write',                                requiresMakerChecker: false, writesTo: ['bn_appeal','bn_appeal_event'], requiresOwnershipCheck: false, implemented: false },
  { command: 'BN_APPEAL_REVIEW_ADMISSIBILITY', capability: 'bn_appeals:admissibility_review' as BnGapCapability, requiresMakerChecker: false, writesTo: ['bn_appeal','bn_appeal_event'], requiresOwnershipCheck: false, implemented: false },
  { command: 'BN_APPEAL_ASSIGN',               capability: 'bn_appeals:assign' as BnGapCapability,            requiresMakerChecker: false, writesTo: ['bn_appeal','bn_appeal_event'], requiresOwnershipCheck: false, implemented: false },
  { command: 'BN_APPEAL_ATTACH_EVIDENCE',      capability: 'bn_appeals:write',                                requiresMakerChecker: false, writesTo: ['bn_appeal_evidence','bn_appeal_event'], requiresOwnershipCheck: false, implemented: false },
  { command: 'BN_APPEAL_SCHEDULE_HEARING',     capability: 'bn_appeals:write',                                requiresMakerChecker: false, writesTo: ['bn_appeal','bn_appeal_hearing_link','bn_appeal_event'], requiresOwnershipCheck: false, implemented: false },
  { command: 'BN_APPEAL_RECORD_HEARING_OUTCOME', capability: 'bn_appeals:write',                              requiresMakerChecker: false, writesTo: ['bn_appeal','bn_appeal_event'], requiresOwnershipCheck: false, implemented: false },
  { command: 'BN_APPEAL_RECOMMEND_OUTCOME',    capability: 'bn_appeals:recommend' as BnGapCapability,        requiresMakerChecker: true,  writesTo: ['bn_appeal','bn_appeal_event'], requiresOwnershipCheck: false, implemented: false },
  { command: 'BN_APPEAL_DECIDE',               capability: 'bn_appeals:decide',                               requiresMakerChecker: true,  writesTo: ['bn_appeal','bn_appeal_event'], requiresOwnershipCheck: false, implemented: false },
  { command: 'BN_APPEAL_IMPLEMENT',            capability: 'bn_appeals:implement' as BnGapCapability,        requiresMakerChecker: false, writesTo: ['bn_appeal','bn_appeal_event'], requiresOwnershipCheck: false, implemented: false },
  { command: 'BN_APPEAL_WITHDRAW',             capability: 'bn_appeals:claimant_submit' as BnGapCapability,   requiresMakerChecker: false, writesTo: ['bn_appeal','bn_appeal_event'], requiresOwnershipCheck: true,  implemented: false },
  { command: 'BN_APPEAL_REFER_LEGAL',          capability: 'bn_appeals:refer_legal' as BnGapCapability,      requiresMakerChecker: false, writesTo: ['bn_appeal','bn_appeal_event'], requiresOwnershipCheck: false, implemented: false },
  { command: 'BN_APPEAL_CLOSE',                capability: 'bn_appeals:decide',                               requiresMakerChecker: false, writesTo: ['bn_appeal','bn_appeal_event'], requiresOwnershipCheck: false, implemented: false },
  { command: 'BN_APPEAL_REOPEN',               capability: 'bn_appeals:admin',                                requiresMakerChecker: true,  writesTo: ['bn_appeal','bn_appeal_event'], requiresOwnershipCheck: false, implemented: false },
] as const;

export function findAppealCommand(name: string): BnAppealCommandSpec | undefined {
  return BN_APPEAL_COMMANDS.find((c) => c.command === name);
}
