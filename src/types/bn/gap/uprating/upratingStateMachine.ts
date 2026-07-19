/**
 * BN Uprating — Canonical state machine for an uprating run.
 */

export type BnUpratingRunStatus =
  | 'DRAFT'
  | 'PARAMETERISED'         // Rate tables + effective date locked
  | 'ELIGIBILITY_SNAPSHOT'  // Population snapshot taken (awards, holds, appeals)
  | 'EXCLUSIONS_APPLIED'    // Pending-mortality & unresolved-appeal awards excluded/flagged
  | 'DRY_RUN'               // Preview calculated
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'EXECUTING'             // Awards adjusted transactionally
  | 'SCHEDULES_REBUILT'
  | 'COMMUNICATIONS_ISSUED'
  | 'RECONCILED'            // Finance reconciliation complete
  | 'FAILED'
  | 'ROLLED_BACK'
  | 'CLOSED';

export type BnUpratingExclusionReason =
  | 'PENDING_MORTALITY'
  | 'UNRESOLVED_APPEAL'
  | 'PAYMENT_HELD'
  | 'RISK_INVESTIGATION'
  | 'MANUAL_EXCLUSION';

export type BnUpratingEventCode =
  | 'RUN_CREATED'
  | 'PARAMETERISED'
  | 'SNAPSHOT_TAKEN'
  | 'EXCLUSIONS_APPLIED'
  | 'DRY_RUN_COMPLETED'
  | 'APPROVAL_REQUESTED'
  | 'APPROVED'
  | 'EXECUTION_STARTED'
  | 'AWARD_ADJUSTED'
  | 'SCHEDULES_REBUILT'
  | 'COMMUNICATIONS_ISSUED'
  | 'RECONCILED'
  | 'FAILED'
  | 'ROLLED_BACK'
  | 'CLOSED';

export const BN_UPRATING_TRANSITIONS: Readonly<
  Record<BnUpratingRunStatus, readonly BnUpratingRunStatus[]>
> = {
  DRAFT: ['PARAMETERISED', 'CLOSED'],
  PARAMETERISED: ['ELIGIBILITY_SNAPSHOT', 'CLOSED'],
  ELIGIBILITY_SNAPSHOT: ['EXCLUSIONS_APPLIED'],
  EXCLUSIONS_APPLIED: ['DRY_RUN'],
  DRY_RUN: ['AWAITING_APPROVAL', 'PARAMETERISED'],
  AWAITING_APPROVAL: ['APPROVED', 'DRY_RUN', 'CLOSED'],
  APPROVED: ['EXECUTING'],
  EXECUTING: ['SCHEDULES_REBUILT', 'FAILED'],
  SCHEDULES_REBUILT: ['COMMUNICATIONS_ISSUED'],
  COMMUNICATIONS_ISSUED: ['RECONCILED'],
  RECONCILED: ['CLOSED'],
  FAILED: ['ROLLED_BACK'],
  ROLLED_BACK: ['CLOSED'],
  CLOSED: [],
};

export function canTransition(from: BnUpratingRunStatus, to: BnUpratingRunStatus): boolean {
  return BN_UPRATING_TRANSITIONS[from]?.includes(to) ?? false;
}
export function isTerminal(status: BnUpratingRunStatus): boolean {
  return status === 'CLOSED';
}
