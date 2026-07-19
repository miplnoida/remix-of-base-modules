import type { BnGapCapability } from '@/services/bn/gap/gapCapabilityRegistry';

export type BnUpratingCommandName =
  | 'BN_UPR_CREATE_RUN'
  | 'BN_UPR_PARAMETERISE'
  | 'BN_UPR_TAKE_SNAPSHOT'
  | 'BN_UPR_APPLY_EXCLUSIONS'
  | 'BN_UPR_DRY_RUN'
  | 'BN_UPR_REQUEST_APPROVAL'
  | 'BN_UPR_APPROVE'
  | 'BN_UPR_EXECUTE'
  | 'BN_UPR_REBUILD_SCHEDULES'
  | 'BN_UPR_ISSUE_COMMUNICATIONS'
  | 'BN_UPR_RECONCILE'
  | 'BN_UPR_ROLLBACK'
  | 'BN_UPR_CLOSE';

export interface BnUpratingCommandSpec {
  readonly command: BnUpratingCommandName;
  readonly capability: BnGapCapability;
  readonly requiresMakerChecker: boolean;
  readonly transactional: boolean;
  readonly implemented: boolean;
}

export const BN_UPRATING_COMMANDS: readonly BnUpratingCommandSpec[] = [
  { command: 'BN_UPR_CREATE_RUN',            capability: 'bn_uprating:write',   requiresMakerChecker: false, transactional: false, implemented: false },
  { command: 'BN_UPR_PARAMETERISE',          capability: 'bn_uprating:write',   requiresMakerChecker: false, transactional: false, implemented: false },
  { command: 'BN_UPR_TAKE_SNAPSHOT',         capability: 'bn_uprating:write',   requiresMakerChecker: false, transactional: true,  implemented: false },
  { command: 'BN_UPR_APPLY_EXCLUSIONS',      capability: 'bn_uprating:decide',  requiresMakerChecker: false, transactional: true,  implemented: false },
  { command: 'BN_UPR_DRY_RUN',               capability: 'bn_uprating:decide',  requiresMakerChecker: false, transactional: false, implemented: false },
  { command: 'BN_UPR_REQUEST_APPROVAL',      capability: 'bn_uprating:decide',  requiresMakerChecker: false, transactional: false, implemented: false },
  { command: 'BN_UPR_APPROVE',               capability: 'bn_uprating:admin',   requiresMakerChecker: true,  transactional: false, implemented: false },
  { command: 'BN_UPR_EXECUTE',               capability: 'bn_uprating:admin',   requiresMakerChecker: true,  transactional: true,  implemented: false },
  { command: 'BN_UPR_REBUILD_SCHEDULES',     capability: 'bn_uprating:decide',  requiresMakerChecker: false, transactional: true,  implemented: false },
  { command: 'BN_UPR_ISSUE_COMMUNICATIONS',  capability: 'bn_uprating:decide',  requiresMakerChecker: false, transactional: false, implemented: false },
  { command: 'BN_UPR_RECONCILE',             capability: 'bn_uprating:decide',  requiresMakerChecker: false, transactional: false, implemented: false },
  { command: 'BN_UPR_ROLLBACK',              capability: 'bn_uprating:admin',   requiresMakerChecker: true,  transactional: true,  implemented: false },
  { command: 'BN_UPR_CLOSE',                 capability: 'bn_uprating:decide',  requiresMakerChecker: false, transactional: false, implemented: false },
] as const;
