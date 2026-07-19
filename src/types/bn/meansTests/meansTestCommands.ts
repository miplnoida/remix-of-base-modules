import type { BnGapCapability } from '@/services/bn/commands/benefitsCapabilityRegistry';

export type BnMeansTestCommandName =
  | 'BN_MT_START'
  | 'BN_MT_ATTACH_EVIDENCE'
  | 'BN_MT_ASSESS'
  | 'BN_MT_PASS'
  | 'BN_MT_FAIL'
  | 'BN_MT_LINK_APPEAL'
  | 'BN_MT_APPLY_APPEAL_OVERTURN'
  | 'BN_MT_ADD_LATE_EVIDENCE'
  | 'BN_MT_RERUN_ELIGIBILITY'
  | 'BN_MT_CREATE_AWARD_FROM_RERUN'
  | 'BN_MT_CLOSE';

export interface BnMeansTestCommandSpec {
  readonly command: BnMeansTestCommandName;
  readonly capability: BnGapCapability;
  readonly requiresMakerChecker: boolean;
  readonly transactional: boolean;
  readonly implemented: boolean;
}

export const BN_MEANS_TEST_COMMANDS: readonly BnMeansTestCommandSpec[] = [
  { command: 'BN_MT_START',                     capability: 'bn_means_tests:write',   requiresMakerChecker: false, transactional: false, implemented: false },
  { command: 'BN_MT_ATTACH_EVIDENCE',            capability: 'bn_means_tests:write',   requiresMakerChecker: false, transactional: false, implemented: false },
  { command: 'BN_MT_ASSESS',                     capability: 'bn_means_tests:decide',  requiresMakerChecker: false, transactional: true,  implemented: false },
  { command: 'BN_MT_PASS',                       capability: 'bn_means_tests:decide',  requiresMakerChecker: true,  transactional: true,  implemented: false },
  { command: 'BN_MT_FAIL',                       capability: 'bn_means_tests:decide',  requiresMakerChecker: true,  transactional: true,  implemented: false },
  { command: 'BN_MT_LINK_APPEAL',                capability: 'bn_means_tests:write',   requiresMakerChecker: false, transactional: false, implemented: false },
  { command: 'BN_MT_APPLY_APPEAL_OVERTURN',      capability: 'bn_means_tests:decide',  requiresMakerChecker: true,  transactional: true,  implemented: false },
  { command: 'BN_MT_ADD_LATE_EVIDENCE',          capability: 'bn_means_tests:write',   requiresMakerChecker: false, transactional: false, implemented: false },
  { command: 'BN_MT_RERUN_ELIGIBILITY',          capability: 'bn_means_tests:decide',  requiresMakerChecker: false, transactional: true,  implemented: false },
  { command: 'BN_MT_CREATE_AWARD_FROM_RERUN',    capability: 'bn_means_tests:decide',  requiresMakerChecker: true,  transactional: true,  implemented: false },
  { command: 'BN_MT_CLOSE',                      capability: 'bn_means_tests:decide',  requiresMakerChecker: false, transactional: false, implemented: false },
] as const;
