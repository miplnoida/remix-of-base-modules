/**
 * BN Uprating — Policy Version state machine (Slice 1 canonical).
 *
 * Governs the lifecycle of an uprating POLICY VERSION (rate table
 * definition). Only ACTIVE policy versions may be attached to a run.
 * Effective-dated succession is modelled by moving one ACTIVE version to
 * SUPERSEDED before another version becomes ACTIVE.
 *
 * Happy path:
 *   DRAFT → REVIEW → APPROVED → ACTIVE → SUPERSEDED → RETIRED
 */

export type BnUpratingPolicyStatus =
  | 'DRAFT'
  | 'REVIEW'
  | 'APPROVED'
  | 'ACTIVE'
  | 'SUPERSEDED'
  | 'RETIRED';

export const BN_UPRATING_POLICY_TERMINAL_STATES: readonly BnUpratingPolicyStatus[] = [
  'RETIRED',
];

export const BN_UPRATING_POLICY_TRANSITIONS: Readonly<
  Record<BnUpratingPolicyStatus, readonly BnUpratingPolicyStatus[]>
> = {
  DRAFT: ['REVIEW', 'RETIRED'],
  REVIEW: ['APPROVED', 'DRAFT', 'RETIRED'],
  APPROVED: ['ACTIVE', 'RETIRED'],
  ACTIVE: ['SUPERSEDED', 'RETIRED'],
  SUPERSEDED: ['RETIRED'],
  RETIRED: [],
};

export function canUpratingPolicyTransition(
  from: BnUpratingPolicyStatus,
  to: BnUpratingPolicyStatus,
): boolean {
  return BN_UPRATING_POLICY_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isUpratingPolicyTerminal(status: BnUpratingPolicyStatus): boolean {
  return BN_UPRATING_POLICY_TERMINAL_STATES.includes(status);
}

export function reachableUpratingPolicyStates(
  from: BnUpratingPolicyStatus,
): readonly BnUpratingPolicyStatus[] {
  const seen = new Set<BnUpratingPolicyStatus>([from]);
  const stack: BnUpratingPolicyStatus[] = [from];
  while (stack.length) {
    const s = stack.pop() as BnUpratingPolicyStatus;
    for (const n of BN_UPRATING_POLICY_TRANSITIONS[s] ?? []) {
      if (!seen.has(n)) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return Array.from(seen);
}
