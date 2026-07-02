/**
 * Legal Hearing State Machine (Phase 5)
 *
 * Single source of truth for lg_hearing.status transitions.
 * States:
 *   SCHEDULED  → initial state when a hearing is booked
 *   COMPLETED  → outcome recorded (with outcome_code + minutes)
 *   ADJOURNED  → moved to a later date; a follow-up hearing is auto-created
 *   CANCELLED  → hearing withdrawn (no outcome)
 *   NO_SHOW    → party failed to appear (terminal for that instance)
 *
 * Allowed transitions:
 *   SCHEDULED → COMPLETED | ADJOURNED | CANCELLED | NO_SHOW
 *   ADJOURNED → COMPLETED | CANCELLED | NO_SHOW  (rare, if the adjourned entry itself is later updated)
 *   COMPLETED | CANCELLED | NO_SHOW → (terminal)
 *
 * Capability mapping (see useLgAccess):
 *   scheduleHearing        → SCHEDULED (create)
 *   recordHearingOutcome   → COMPLETED
 *   rescheduleHearing      → ADJOURNED
 *   cancelHearing          → CANCELLED | NO_SHOW
 */

export type LgHearingStatus =
  | "SCHEDULED"
  | "COMPLETED"
  | "ADJOURNED"
  | "CANCELLED"
  | "NO_SHOW";

export const LG_HEARING_STATES: LgHearingStatus[] = [
  "SCHEDULED",
  "COMPLETED",
  "ADJOURNED",
  "CANCELLED",
  "NO_SHOW",
];

export const LG_HEARING_TERMINAL_STATES: readonly LgHearingStatus[] = [
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];

export const LG_HEARING_TRANSITIONS: Record<LgHearingStatus, LgHearingStatus[]> = {
  SCHEDULED: ["COMPLETED", "ADJOURNED", "CANCELLED", "NO_SHOW"],
  ADJOURNED: ["COMPLETED", "CANCELLED", "NO_SHOW"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

/** Capability required to move INTO a given status. */
export const LG_HEARING_TRANSITION_CAPABILITY: Record<LgHearingStatus, string> = {
  SCHEDULED: "scheduleHearing",
  COMPLETED: "recordHearingOutcome",
  ADJOURNED: "rescheduleHearing",
  CANCELLED: "cancelHearing",
  NO_SHOW: "cancelHearing",
};

export function canTransitionHearing(from: LgHearingStatus, to: LgHearingStatus): boolean {
  if (from === to) return true;
  return (LG_HEARING_TRANSITIONS[from] ?? []).includes(to);
}

export function assertHearingTransition(from: LgHearingStatus, to: LgHearingStatus): void {
  if (!canTransitionHearing(from, to)) {
    throw new Error(
      `Invalid hearing status transition: ${from} → ${to}. ` +
        `Allowed from ${from}: ${LG_HEARING_TRANSITIONS[from].join(", ") || "(terminal)"}`,
    );
  }
}

export function isHearingTerminal(status: LgHearingStatus): boolean {
  return LG_HEARING_TERMINAL_STATES.includes(status);
}
