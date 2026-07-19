/**
 * BN Uprating — Run state machine (Slice 1 canonical).
 *
 * Governs an uprating RUN from creation through simulation, approval,
 * controlled batched execution, and reconciliation. This machine is
 * distinct from the legacy `upratingStateMachine.ts` which remains for
 * back-compat.
 *
 * Happy path:
 *   DRAFT → POPULATION_BUILT → SIMULATED → EXCEPTIONS_REVIEW →
 *   APPROVAL_PENDING → APPROVED → SCHEDULED → EXECUTING →
 *   COMPLETED → RECONCILIATION → RECONCILED → CLOSED
 *
 * Partial / failure recovery:
 *   EXECUTING → PARTIAL → EXECUTING (retry) or → RECONCILIATION
 *   EXECUTING → FAILED  → RECONCILIATION | CLOSED
 */

export type BnUpratingRunCanonicalStatus =
  | 'DRAFT'
  | 'POPULATION_BUILT'
  | 'SIMULATED'
  | 'EXCEPTIONS_REVIEW'
  | 'APPROVAL_PENDING'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'FAILED'
  | 'RECONCILIATION'
  | 'RECONCILED'
  | 'CLOSED';

export const BN_UPRATING_RUN_TERMINAL_STATES: readonly BnUpratingRunCanonicalStatus[] = [
  'CLOSED',
];

export const BN_UPRATING_RUN_TRANSITIONS: Readonly<
  Record<BnUpratingRunCanonicalStatus, readonly BnUpratingRunCanonicalStatus[]>
> = {
  DRAFT: ['POPULATION_BUILT', 'CLOSED'],
  POPULATION_BUILT: ['SIMULATED', 'CLOSED'],
  SIMULATED: ['EXCEPTIONS_REVIEW', 'APPROVAL_PENDING'],
  EXCEPTIONS_REVIEW: ['SIMULATED', 'APPROVAL_PENDING'],
  APPROVAL_PENDING: ['APPROVED', 'EXCEPTIONS_REVIEW'],
  APPROVED: ['SCHEDULED'],
  SCHEDULED: ['EXECUTING'],
  EXECUTING: ['COMPLETED', 'PARTIAL', 'FAILED'],
  COMPLETED: ['RECONCILIATION'],
  PARTIAL: ['EXECUTING', 'RECONCILIATION'],
  FAILED: ['RECONCILIATION', 'CLOSED'],
  RECONCILIATION: ['RECONCILED'],
  RECONCILED: ['CLOSED'],
  CLOSED: [],
};

export function canUpratingRunTransition(
  from: BnUpratingRunCanonicalStatus,
  to: BnUpratingRunCanonicalStatus,
): boolean {
  return BN_UPRATING_RUN_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isUpratingRunTerminal(
  status: BnUpratingRunCanonicalStatus,
): boolean {
  return BN_UPRATING_RUN_TERMINAL_STATES.includes(status);
}

export function reachableUpratingRunStates(
  from: BnUpratingRunCanonicalStatus,
): readonly BnUpratingRunCanonicalStatus[] {
  const seen = new Set<BnUpratingRunCanonicalStatus>([from]);
  const stack: BnUpratingRunCanonicalStatus[] = [from];
  while (stack.length) {
    const s = stack.pop() as BnUpratingRunCanonicalStatus;
    for (const n of BN_UPRATING_RUN_TRANSITIONS[s] ?? []) {
      if (!seen.has(n)) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return Array.from(seen);
}
