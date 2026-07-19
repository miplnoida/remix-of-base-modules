/**
 * BN Risk — Signal state machine (Slice 1 canonical).
 *
 * A "signal" is a single detected risk observation (rule match or manual
 * referral). Signals are triaged, optionally linked to peer signals, then
 * reviewed. A signal that survives review is CONFIRMED and produces an
 * assessment; otherwise it is DISMISSED. Actioned or dismissed signals
 * eventually CLOSE.
 *
 * Happy path:
 *   NEW → TRIAGED → LINKED → UNDER_REVIEW → CONFIRMED → ACTIONED → CLOSED
 *
 * Alternate outcome:
 *   DISMISSED (from TRIAGED / LINKED / UNDER_REVIEW) → CLOSED
 */

export type BnRiskSignalStatus =
  | 'NEW'
  | 'TRIAGED'
  | 'LINKED'
  | 'UNDER_REVIEW'
  | 'CONFIRMED'
  | 'DISMISSED'
  | 'ACTIONED'
  | 'CLOSED';

export const BN_RISK_SIGNAL_TERMINAL_STATES: readonly BnRiskSignalStatus[] = [
  'CLOSED',
];

export const BN_RISK_SIGNAL_TRANSITIONS: Readonly<
  Record<BnRiskSignalStatus, readonly BnRiskSignalStatus[]>
> = {
  NEW: ['TRIAGED', 'DISMISSED'],
  TRIAGED: ['LINKED', 'UNDER_REVIEW', 'DISMISSED'],
  LINKED: ['UNDER_REVIEW', 'DISMISSED'],
  UNDER_REVIEW: ['CONFIRMED', 'DISMISSED'],
  CONFIRMED: ['ACTIONED', 'CLOSED'],
  DISMISSED: ['CLOSED'],
  ACTIONED: ['CLOSED'],
  CLOSED: [],
};

export function canRiskSignalTransition(
  from: BnRiskSignalStatus,
  to: BnRiskSignalStatus,
): boolean {
  return BN_RISK_SIGNAL_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isRiskSignalTerminal(status: BnRiskSignalStatus): boolean {
  return BN_RISK_SIGNAL_TERMINAL_STATES.includes(status);
}

export function reachableRiskSignalStates(
  from: BnRiskSignalStatus,
): readonly BnRiskSignalStatus[] {
  const seen = new Set<BnRiskSignalStatus>([from]);
  const stack: BnRiskSignalStatus[] = [from];
  while (stack.length) {
    const s = stack.pop() as BnRiskSignalStatus;
    for (const next of BN_RISK_SIGNAL_TRANSITIONS[s] ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        stack.push(next);
      }
    }
  }
  return Array.from(seen);
}
