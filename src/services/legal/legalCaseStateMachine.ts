/**
 * Legal Case State Machine
 * -----------------------------------------------------------------------------
 * Central authority for allowed transitions between Legal Case statuses /
 * stages. Every code path that changes `lg_case.status_code` or
 * `lg_case.current_stage_code` MUST go through `assertLegalCaseTransition` (or
 * check `canTransitionLegalCase` first) so that:
 *
 *  1. Invalid transitions are blocked with a clear, user-facing message.
 *  2. Sensitive transitions (close, reject, judgment, enforcement) can only
 *     be performed by users with the required capability.
 *  3. The transition matrix is documented in one place — see
 *     /docs/legal/legal-case-state-machine.md.
 *
 * The machine intentionally uses the SAME code set for `status_code` and
 * `current_stage_code` because Lifecycle Stage and Case Status are aligned in
 * this platform. Legacy free-form codes fall through as "unknown" and are
 * rejected unless both sides are unknown (import scenarios).
 */

import type { LegalCapability } from "@/hooks/legal/useLegalCapability";

export const LEGAL_CASE_STATES = [
  "NEW",
  "INTAKE",
  "ACCEPTED",
  "CASE_OPEN",
  "UNDER_REVIEW",
  "NOTICE_SENT",
  "HEARING_SCHEDULED",
  "JUDGMENT_OBTAINED",
  "ENFORCEMENT",
  "PAYMENT_ARRANGEMENT",
  "SETTLED",
  "CLOSED",
  "REJECTED",
] as const;

export type LegalCaseState = (typeof LEGAL_CASE_STATES)[number];

export const TERMINAL_LEGAL_CASE_STATES: readonly LegalCaseState[] = [
  "SETTLED",
  "CLOSED",
  "REJECTED",
];

/** Capability required to perform a given transition (checked against LegalCapability). */
type CapabilityKey = keyof LegalCapability | "ANY_ACTOR" | "NONE";

interface TransitionRule {
  to: LegalCaseState;
  /** Capability required to fire this transition. */
  requires: CapabilityKey;
  /** Optional short description for logs / docs. */
  reason?: string;
}

/**
 * Directed transition table.  If a (from,to) pair is absent it is INVALID.
 */
const TRANSITIONS: Record<LegalCaseState, TransitionRule[]> = {
  NEW: [
    { to: "INTAKE", requires: "ANY_ACTOR", reason: "Begin intake review" },
    { to: "REJECTED", requires: "canApproveClosure", reason: "Reject at intake" },
  ],
  INTAKE: [
    { to: "ACCEPTED", requires: "canAcceptReferral", reason: "Accept referral" },
    { to: "REJECTED", requires: "canApproveClosure", reason: "Reject referral" },
  ],
  ACCEPTED: [
    { to: "CASE_OPEN", requires: "ANY_ACTOR", reason: "Open case file" },
    { to: "REJECTED", requires: "canApproveClosure" },
  ],
  CASE_OPEN: [
    { to: "UNDER_REVIEW", requires: "ANY_ACTOR" },
    { to: "NOTICE_SENT", requires: "canDraftLetter", reason: "Skip review, send notice" },
    { to: "CLOSED", requires: "canApproveClosure" },
  ],
  UNDER_REVIEW: [
    { to: "NOTICE_SENT", requires: "canDraftLetter" },
    { to: "HEARING_SCHEDULED", requires: "canCreateHearing" },
    { to: "SETTLED", requires: "canApproveClosure" },
    { to: "CLOSED", requires: "canApproveClosure" },
  ],
  NOTICE_SENT: [
    { to: "UNDER_REVIEW", requires: "ANY_ACTOR", reason: "Return for review after response" },
    { to: "HEARING_SCHEDULED", requires: "canCreateHearing" },
    { to: "PAYMENT_ARRANGEMENT", requires: "ANY_ACTOR" },
    { to: "SETTLED", requires: "canApproveClosure" },
    { to: "CLOSED", requires: "canApproveClosure" },
  ],
  HEARING_SCHEDULED: [
    { to: "JUDGMENT_OBTAINED", requires: "ANY_ACTOR", reason: "Record hearing outcome / judgment" },
    { to: "SETTLED", requires: "canApproveClosure" },
    { to: "CLOSED", requires: "canApproveClosure" },
  ],
  JUDGMENT_OBTAINED: [
    { to: "ENFORCEMENT", requires: "ANY_ACTOR" },
    { to: "PAYMENT_ARRANGEMENT", requires: "ANY_ACTOR" },
    { to: "SETTLED", requires: "canApproveClosure" },
    { to: "CLOSED", requires: "canApproveClosure" },
  ],
  ENFORCEMENT: [
    { to: "PAYMENT_ARRANGEMENT", requires: "ANY_ACTOR" },
    { to: "SETTLED", requires: "canApproveClosure" },
    { to: "CLOSED", requires: "canApproveClosure" },
  ],
  PAYMENT_ARRANGEMENT: [
    { to: "ENFORCEMENT", requires: "ANY_ACTOR", reason: "Arrangement breach" },
    { to: "SETTLED", requires: "canApproveClosure", reason: "Arrangement fully honoured" },
    { to: "CLOSED", requires: "canApproveClosure" },
  ],
  SETTLED: [
    { to: "CLOSED", requires: "canApproveClosure" },
  ],
  CLOSED: [], // terminal
  REJECTED: [], // terminal
};

export interface LegalCaseTransitionCheck {
  allowed: boolean;
  reason?: string;
  /** Machine-readable error code — safe to switch on in callers. */
  code?:
    | "TERMINAL"
    | "UNKNOWN_FROM"
    | "UNKNOWN_TO"
    | "NO_OP"
    | "INVALID_TRANSITION"
    | "PERMISSION_DENIED";
}

function isKnownState(s: string | null | undefined): s is LegalCaseState {
  return !!s && (LEGAL_CASE_STATES as readonly string[]).includes(s);
}

function capabilityGrants(cap: LegalCapability | null | undefined, key: CapabilityKey): boolean {
  if (!cap) return false;
  if (cap.isReadOnly) return false;
  if (key === "NONE") return true;
  if (key === "ANY_ACTOR") return cap.isLegal && !cap.isReadOnly;
  const v = (cap as any)[key];
  return v === true;
}

/**
 * Non-throwing check. Returns { allowed, reason, code }.
 * Use in UI to enable/disable buttons or to render inline explanations.
 */
export function canTransitionLegalCase(
  fromStatus: string | null | undefined,
  toStatus: string | null | undefined,
  userCapability: LegalCapability | null | undefined,
): LegalCaseTransitionCheck {
  const from = (fromStatus ?? "").toUpperCase();
  const to = (toStatus ?? "").toUpperCase();

  if (!isKnownState(to)) {
    return { allowed: false, code: "UNKNOWN_TO", reason: `Unknown target status "${to}".` };
  }
  if (!isKnownState(from)) {
    // Allow "upgrading" a legacy / unknown status into any state — but still
    // require ANY_ACTOR so that read-only users cannot do it.
    if (capabilityGrants(userCapability, "ANY_ACTOR")) {
      return { allowed: true, reason: `Legacy status "${from}" upgraded to ${to}.` };
    }
    return {
      allowed: false,
      code: "PERMISSION_DENIED",
      reason: `You do not have permission to set the case status.`,
    };
  }
  if (from === to) {
    return { allowed: false, code: "NO_OP", reason: `Case is already ${from}.` };
  }
  if (TERMINAL_LEGAL_CASE_STATES.includes(from as LegalCaseState)) {
    return {
      allowed: false,
      code: "TERMINAL",
      reason: `Case is in terminal state ${from}. Reopen it before changing status.`,
    };
  }

  const rules = TRANSITIONS[from as LegalCaseState] ?? [];
  const rule = rules.find((r) => r.to === to);
  if (!rule) {
    const legalNext = rules.map((r) => r.to).join(", ") || "—";
    return {
      allowed: false,
      code: "INVALID_TRANSITION",
      reason: `Cannot move Legal Case from ${from} to ${to}. Allowed next: ${legalNext}.`,
    };
  }
  if (!capabilityGrants(userCapability, rule.requires)) {
    return {
      allowed: false,
      code: "PERMISSION_DENIED",
      reason: `You do not have permission to move a Legal Case to ${to}. Required: ${rule.requires}.`,
    };
  }
  return { allowed: true, reason: rule.reason };
}

/** Throwing variant — use inside mutations right before the DB write. */
export function assertLegalCaseTransition(
  fromStatus: string | null | undefined,
  toStatus: string | null | undefined,
  userCapability: LegalCapability | null | undefined,
): void {
  const r = canTransitionLegalCase(fromStatus, toStatus, userCapability);
  if (!r.allowed) {
    const err = new Error(r.reason ?? "Invalid Legal Case status transition.");
    (err as any).code = r.code ?? "INVALID_TRANSITION";
    throw err;
  }
}

/**
 * Return the list of statuses the user can move to from `fromStatus`.
 * Useful for building status dropdowns / stage-change menus.
 */
export function allowedNextLegalCaseStates(
  fromStatus: string | null | undefined,
  userCapability: LegalCapability | null | undefined,
): LegalCaseState[] {
  const from = (fromStatus ?? "").toUpperCase();
  if (!isKnownState(from)) {
    return capabilityGrants(userCapability, "ANY_ACTOR")
      ? [...LEGAL_CASE_STATES]
      : [];
  }
  return (TRANSITIONS[from as LegalCaseState] ?? [])
    .filter((r) => capabilityGrants(userCapability, r.requires))
    .map((r) => r.to);
}

export function isTerminalLegalCaseState(s: string | null | undefined): boolean {
  return !!s && TERMINAL_LEGAL_CASE_STATES.includes(s.toUpperCase() as LegalCaseState);
}
