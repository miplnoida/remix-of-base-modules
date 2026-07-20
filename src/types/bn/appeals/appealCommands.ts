/**
 * BN Appeals — Canonical command catalogue.
 *
 * BN-AP-01 §B: every command declares the lifecycle statuses from which it
 * may be invoked. The status names come from BN_APPEAL_STATUSES — the parity
 * test enforces that no command references an undocumented status.
 *
 * Handlers are added incrementally. `implemented=true` today only for the
 * claimant submission path; staff commands remain false while their edge
 * handlers are being finalised in Slice 2.
 */
import type { BnGapCapability } from '@/services/bn/commands/benefitsCapabilityRegistry';
import type { BnAppealStatus } from './appealStateMachine';

export type BnAppealCommandName =
  | 'BN_APPEAL_SUBMIT_CLAIMANT'
  | 'BN_APPEAL_REGISTER_STAFF'
  | 'BN_APPEAL_ACKNOWLEDGE'
  | 'BN_APPEAL_REVIEW_ADMISSIBILITY'
  | 'BN_APPEAL_ASSIGN'
  | 'BN_APPEAL_ATTACH_EVIDENCE'
  | 'BN_APPEAL_START_CASE_PREPARATION'
  | 'BN_APPEAL_SCHEDULE_HEARING'
  | 'BN_APPEAL_RECORD_HEARING_OUTCOME'
  | 'BN_APPEAL_RECOMMEND_OUTCOME'
  | 'BN_APPEAL_DECIDE'
  | 'BN_APPEAL_IMPLEMENT'
  | 'BN_APPEAL_MARK_PARTIALLY_IMPLEMENTED'
  | 'BN_APPEAL_WITHDRAW'
  | 'BN_APPEAL_CANCEL'
  | 'BN_APPEAL_REFER_LEGAL'
  | 'BN_APPEAL_CLOSE'
  | 'BN_APPEAL_REOPEN';

export interface BnAppealCommandSpec {
  readonly command: BnAppealCommandName;
  readonly displayName: string;
  readonly capability: BnGapCapability;
  readonly requiresMakerChecker: boolean;
  readonly writesTo: readonly (
    | 'bn_appeal'
    | 'bn_appeal_ground'
    | 'bn_appeal_evidence'
    | 'bn_appeal_event'
    | 'bn_appeal_hearing_link'
    | 'bn_appeal_decision_snapshot'
    | 'bn_appeal_source_decision'
  )[];
  readonly requiresOwnershipCheck: boolean;
  readonly implemented: boolean;
  /** Lifecycle statuses from which the command may be invoked. Empty means "any". */
  readonly validFrom: readonly BnAppealStatus[];
  /** Blocker reason surfaced to the UI when `implemented=false`. */
  readonly blocker?: string;
}

const NEEDS_SLICE_2 = 'Handler not yet delivered (AP-01 Slice 2).';

export const BN_APPEAL_COMMANDS: readonly BnAppealCommandSpec[] = [
  { command: 'BN_APPEAL_SUBMIT_CLAIMANT', displayName: 'Submit appeal (claimant portal)',
    capability: 'bn_appeals:claimant_submit' as BnGapCapability,
    requiresMakerChecker: false, requiresOwnershipCheck: true, implemented: true,
    writesTo: ['bn_appeal','bn_appeal_ground','bn_appeal_event','bn_appeal_decision_snapshot','bn_appeal_source_decision'],
    validFrom: [] },
  { command: 'BN_APPEAL_REGISTER_STAFF', displayName: 'Register appeal (staff intake)',
    capability: 'bn_appeals:write',
    requiresMakerChecker: false, requiresOwnershipCheck: false, implemented: false, blocker: NEEDS_SLICE_2,
    writesTo: ['bn_appeal','bn_appeal_ground','bn_appeal_event','bn_appeal_decision_snapshot','bn_appeal_source_decision'],
    validFrom: [] },
  { command: 'BN_APPEAL_ACKNOWLEDGE', displayName: 'Acknowledge submission',
    capability: 'bn_appeals:write',
    requiresMakerChecker: false, requiresOwnershipCheck: false, implemented: false, blocker: NEEDS_SLICE_2,
    writesTo: ['bn_appeal','bn_appeal_event'], validFrom: ['SUBMITTED'] },
  { command: 'BN_APPEAL_REVIEW_ADMISSIBILITY', displayName: 'Review admissibility',
    capability: 'bn_appeals:admissibility_review' as BnGapCapability,
    requiresMakerChecker: false, requiresOwnershipCheck: false, implemented: false, blocker: NEEDS_SLICE_2,
    writesTo: ['bn_appeal','bn_appeal_event'], validFrom: ['ACKNOWLEDGED','ADMISSIBILITY_REVIEW','RECOMMENDED'] },
  { command: 'BN_APPEAL_ASSIGN', displayName: 'Assign to officer / workbasket',
    capability: 'bn_appeals:assign' as BnGapCapability,
    requiresMakerChecker: false, requiresOwnershipCheck: false, implemented: false, blocker: NEEDS_SLICE_2,
    writesTo: ['bn_appeal','bn_appeal_event'], validFrom: ['SUBMITTED','ACKNOWLEDGED','ADMISSIBILITY_REVIEW','ADMISSIBLE','CASE_PREPARATION','HEARING_SCHEDULED','HEARING_HELD','RECOMMENDED','DECIDED','IMPLEMENTATION_PENDING'] },
  { command: 'BN_APPEAL_ATTACH_EVIDENCE', displayName: 'Attach evidence',
    capability: 'bn_appeals:write',
    requiresMakerChecker: false, requiresOwnershipCheck: false, implemented: false, blocker: NEEDS_SLICE_2,
    writesTo: ['bn_appeal_evidence','bn_appeal_event'], validFrom: ['SUBMITTED','ACKNOWLEDGED','ADMISSIBILITY_REVIEW','ADMISSIBLE','CASE_PREPARATION','HEARING_SCHEDULED','HEARING_HELD'] },
  { command: 'BN_APPEAL_START_CASE_PREPARATION', displayName: 'Start case preparation',
    capability: 'bn_appeals:write',
    requiresMakerChecker: false, requiresOwnershipCheck: false, implemented: false, blocker: NEEDS_SLICE_2,
    writesTo: ['bn_appeal','bn_appeal_event'], validFrom: ['ADMISSIBLE','HEARING_HELD'] },
  { command: 'BN_APPEAL_SCHEDULE_HEARING', displayName: 'Schedule hearing',
    capability: 'bn_appeals:write',
    requiresMakerChecker: false, requiresOwnershipCheck: false, implemented: false, blocker: NEEDS_SLICE_2,
    writesTo: ['bn_appeal','bn_appeal_hearing_link','bn_appeal_event'], validFrom: ['ADMISSIBLE','CASE_PREPARATION'] },
  { command: 'BN_APPEAL_RECORD_HEARING_OUTCOME', displayName: 'Record hearing outcome',
    capability: 'bn_appeals:write',
    requiresMakerChecker: false, requiresOwnershipCheck: false, implemented: false, blocker: NEEDS_SLICE_2,
    writesTo: ['bn_appeal','bn_appeal_event'], validFrom: ['HEARING_SCHEDULED'] },
  { command: 'BN_APPEAL_RECOMMEND_OUTCOME', displayName: 'Recommend outcome',
    capability: 'bn_appeals:recommend' as BnGapCapability,
    requiresMakerChecker: true, requiresOwnershipCheck: false, implemented: false, blocker: NEEDS_SLICE_2,
    writesTo: ['bn_appeal','bn_appeal_event'], validFrom: ['ADMISSIBLE','CASE_PREPARATION','HEARING_HELD'] },
  { command: 'BN_APPEAL_DECIDE', displayName: 'Record decision',
    capability: 'bn_appeals:decide',
    requiresMakerChecker: true, requiresOwnershipCheck: false, implemented: false, blocker: NEEDS_SLICE_2,
    writesTo: ['bn_appeal','bn_appeal_event'], validFrom: ['RECOMMENDED','HEARING_HELD'] },
  { command: 'BN_APPEAL_IMPLEMENT', displayName: 'Mark implementation complete',
    capability: 'bn_appeals:implement' as BnGapCapability,
    requiresMakerChecker: false, requiresOwnershipCheck: false, implemented: false, blocker: NEEDS_SLICE_2,
    writesTo: ['bn_appeal','bn_appeal_event'], validFrom: ['IMPLEMENTATION_PENDING','PARTIALLY_IMPLEMENTED'] },
  { command: 'BN_APPEAL_MARK_PARTIALLY_IMPLEMENTED', displayName: 'Mark partially implemented',
    capability: 'bn_appeals:implement' as BnGapCapability,
    requiresMakerChecker: false, requiresOwnershipCheck: false, implemented: false, blocker: NEEDS_SLICE_2,
    writesTo: ['bn_appeal','bn_appeal_event'], validFrom: ['IMPLEMENTATION_PENDING'] },
  { command: 'BN_APPEAL_WITHDRAW', displayName: 'Withdraw appeal',
    capability: 'bn_appeals:claimant_submit' as BnGapCapability,
    requiresMakerChecker: false, requiresOwnershipCheck: true, implemented: false, blocker: NEEDS_SLICE_2,
    writesTo: ['bn_appeal','bn_appeal_event'],
    validFrom: ['DRAFT','SUBMITTED','ACKNOWLEDGED','ADMISSIBILITY_REVIEW','ADMISSIBLE','CASE_PREPARATION','HEARING_SCHEDULED'] },
  { command: 'BN_APPEAL_CANCEL', displayName: 'Cancel (administrative)',
    capability: 'bn_appeals:admin',
    requiresMakerChecker: true, requiresOwnershipCheck: false, implemented: false, blocker: NEEDS_SLICE_2,
    writesTo: ['bn_appeal','bn_appeal_event'],
    validFrom: ['DRAFT','SUBMITTED','ACKNOWLEDGED','ADMISSIBILITY_REVIEW'] },
  { command: 'BN_APPEAL_REFER_LEGAL', displayName: 'Refer to Legal',
    capability: 'bn_appeals:refer_legal' as BnGapCapability,
    requiresMakerChecker: false, requiresOwnershipCheck: false, implemented: false, blocker: NEEDS_SLICE_2,
    writesTo: ['bn_appeal','bn_appeal_event'], validFrom: ['ADMISSIBLE','CASE_PREPARATION','DECIDED','INADMISSIBLE'] },
  { command: 'BN_APPEAL_CLOSE', displayName: 'Close',
    capability: 'bn_appeals:decide',
    requiresMakerChecker: false, requiresOwnershipCheck: false, implemented: false, blocker: NEEDS_SLICE_2,
    writesTo: ['bn_appeal','bn_appeal_event'],
    validFrom: ['DECIDED','IMPLEMENTED','PARTIALLY_IMPLEMENTED','WITHDRAWN','INADMISSIBLE','REFERRED_TO_LEGAL'] },
  { command: 'BN_APPEAL_REOPEN', displayName: 'Reopen (admin)',
    capability: 'bn_appeals:admin',
    requiresMakerChecker: true, requiresOwnershipCheck: false, implemented: false, blocker: NEEDS_SLICE_2,
    writesTo: ['bn_appeal','bn_appeal_event'], validFrom: ['CLOSED','CANCELLED','WITHDRAWN'] },
] as const;

export function findAppealCommand(name: string): BnAppealCommandSpec | undefined {
  return BN_APPEAL_COMMANDS.find((c) => c.command === name);
}
