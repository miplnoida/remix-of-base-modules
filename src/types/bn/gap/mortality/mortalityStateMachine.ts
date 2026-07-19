/**
 * BN Mortality — Canonical state machine (Slice 1).
 *
 * Governs a mortality event from receipt of a death notification through
 * matching, verification, provisional hold, impact review, confirmation,
 * follow-on processing (survivor, funeral, estate, overpayment), and closure.
 *
 * States are enforced server-side by command handlers via
 * {@link canMortalityTransition}. UI never edits status directly.
 *
 * Primary happy-path:
 *   DRAFT → REPORTED → MATCHED → VERIFICATION_PENDING →
 *   PROVISIONALLY_HELD → VERIFIED → IMPACT_REVIEW →
 *   APPROVAL_PENDING → CONFIRMED → FOLLOW_ON_PROCESSING →
 *   COMPLETED → CLOSED
 *
 * Alternate/controlled outcomes:
 *   DUPLICATE, REJECTED, CONFLICT, CANCELLED, REVERSED
 */

export type BnMortalityStatus =
  | 'DRAFT'
  | 'REPORTED'
  | 'MATCHED'
  | 'VERIFICATION_PENDING'
  | 'PROVISIONALLY_HELD'
  | 'VERIFIED'
  | 'IMPACT_REVIEW'
  | 'APPROVAL_PENDING'
  | 'CONFIRMED'
  | 'FOLLOW_ON_PROCESSING'
  | 'COMPLETED'
  | 'CLOSED'
  // Alternate / controlled outcomes
  | 'DUPLICATE'
  | 'REJECTED'
  | 'CONFLICT'
  | 'CANCELLED'
  | 'REVERSED';

export type BnMortalitySource =
  | 'REGISTRAR_FEED'
  | 'IP_MODULE'
  | 'FAMILY_NOTIFICATION'
  | 'HOSPITAL_NOTICE'
  | 'STAFF_ENTRY'
  | 'OTHER';

export type BnMortalityConfidence =
  | 'UNVERIFIED'
  | 'CORROBORATED'
  | 'AUTHORITATIVE';

/** Terminal states — no outbound transitions. */
export const BN_MORTALITY_TERMINAL_STATES: readonly BnMortalityStatus[] = [
  'CLOSED',
  'DUPLICATE',
  'CANCELLED',
];

export const BN_MORTALITY_TRANSITIONS: Readonly<
  Record<BnMortalityStatus, readonly BnMortalityStatus[]>
> = {
  DRAFT: ['REPORTED', 'CANCELLED'],
  REPORTED: ['MATCHED', 'DUPLICATE', 'REJECTED', 'CONFLICT', 'CANCELLED'],
  MATCHED: ['VERIFICATION_PENDING', 'CONFLICT', 'REJECTED', 'DUPLICATE'],
  VERIFICATION_PENDING: [
    'PROVISIONALLY_HELD',
    'VERIFIED',
    'CONFLICT',
    'REJECTED',
    'CANCELLED',
  ],
  PROVISIONALLY_HELD: ['VERIFIED', 'CONFLICT', 'REJECTED', 'CANCELLED'],
  VERIFIED: ['IMPACT_REVIEW'],
  IMPACT_REVIEW: ['APPROVAL_PENDING', 'CONFLICT'],
  APPROVAL_PENDING: ['CONFIRMED', 'IMPACT_REVIEW', 'REJECTED'],
  CONFIRMED: ['FOLLOW_ON_PROCESSING', 'REVERSED'],
  FOLLOW_ON_PROCESSING: ['COMPLETED', 'REVERSED'],
  COMPLETED: ['CLOSED', 'REVERSED'],
  CONFLICT: ['VERIFICATION_PENDING', 'REJECTED', 'CANCELLED'],
  REVERSED: ['CLOSED'],
  CLOSED: [],
  DUPLICATE: [],
  REJECTED: ['CLOSED'],
  CANCELLED: [],
};

export function canMortalityTransition(
  from: BnMortalityStatus,
  to: BnMortalityStatus,
): boolean {
  return BN_MORTALITY_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isMortalityTerminal(status: BnMortalityStatus): boolean {
  return BN_MORTALITY_TERMINAL_STATES.includes(status);
}

/**
 * Reachable-state closure from a starting status (BFS across transitions).
 * Used by tests to prove that every canonical state is reachable from DRAFT.
 */
export function reachableMortalityStates(
  from: BnMortalityStatus,
): readonly BnMortalityStatus[] {
  const seen = new Set<BnMortalityStatus>([from]);
  const stack: BnMortalityStatus[] = [from];
  while (stack.length) {
    const s = stack.pop() as BnMortalityStatus;
    for (const next of BN_MORTALITY_TRANSITIONS[s] ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        stack.push(next);
      }
    }
  }
  return Array.from(seen);
}

/** Legacy status mapping: earlier prototype only had 11 states. */
export function mapLegacyMortalityStatus(
  legacy:
    | 'REPORTED'
    | 'PENDING_VERIFICATION'
    | 'VERIFIED'
    | 'DISPUTED'
    | 'REJECTED'
    | 'AWARDS_HELD'
    | 'AWARDS_TERMINATED'
    | 'SURVIVOR_ASSESSMENT'
    | 'FUNERAL_OPPORTUNITY'
    | 'ESTATE_REFERRAL'
    | 'CLOSED',
): BnMortalityStatus {
  switch (legacy) {
    case 'REPORTED':             return 'REPORTED';
    case 'PENDING_VERIFICATION': return 'VERIFICATION_PENDING';
    case 'VERIFIED':             return 'VERIFIED';
    case 'DISPUTED':             return 'CONFLICT';
    case 'REJECTED':             return 'REJECTED';
    case 'AWARDS_HELD':          return 'PROVISIONALLY_HELD';
    case 'AWARDS_TERMINATED':    return 'FOLLOW_ON_PROCESSING';
    case 'SURVIVOR_ASSESSMENT':  return 'FOLLOW_ON_PROCESSING';
    case 'FUNERAL_OPPORTUNITY':  return 'FOLLOW_ON_PROCESSING';
    case 'ESTATE_REFERRAL':      return 'FOLLOW_ON_PROCESSING';
    case 'CLOSED':               return 'CLOSED';
  }
}

/** Back-compat aliases (older imports). */
export const canTransition = canMortalityTransition;
export const isTerminal = isMortalityTerminal;
