/**
 * ============================================================================
 * LEGAL REFERRAL STATE MACHINE
 * ============================================================================
 * Single source of truth for the lifecycle of a `legal_referral` row.
 *
 *   DRAFT
 *     └─▶ SUBMITTED_TO_LEGAL
 *           ├─▶ RECEIVED_BY_LEGAL
 *           │     ├─▶ UNDER_LEGAL_REVIEW
 *           │     │     ├─▶ ACCEPTED ─▶ LEGAL_CASE_CREATED ─▶ CLOSED
 *           │     │     ├─▶ INFO_REQUESTED ─▶ INFO_RESPONDED ─▶ …
 *           │     │     ├─▶ REJECTED (terminal)
 *           │     │     └─▶ CLOSED (terminal)
 *           │     ├─▶ INFO_REQUESTED
 *           │     ├─▶ ACCEPTED
 *           │     ├─▶ REJECTED
 *           │     └─▶ LEGAL_CASE_CREATED
 *           ├─▶ INFO_REQUESTED
 *           └─▶ REJECTED
 *
 * See /docs/legal/referral-state-machine.md for the full narrative.
 * ============================================================================
 */
import type { ReferralStatus } from "./legalReferralUnifiedService";

export type LifecycleAction =
  | "VIEW"
  | "ACCEPT"
  | "REJECT"
  | "REQUEST_INFO"
  | "RECEIVE_INFO_RESPONSE"
  | "CREATE_INTAKE"
  | "CREATE_CASE"
  | "ASSIGN_OFFICER"
  | "REASSIGN"
  | "ESCALATE"
  | "CLOSE";

export const TERMINAL_STATES: ReferralStatus[] = ["REJECTED", "CLOSED"];

/** Allowed status transitions. */
export const REFERRAL_TRANSITIONS: Record<ReferralStatus, ReferralStatus[]> = {
  DRAFT: ["SUBMITTED_TO_LEGAL"],
  SUBMITTED_TO_LEGAL: ["RECEIVED_BY_LEGAL", "INFO_REQUESTED", "REJECTED"],
  RECEIVED_BY_LEGAL: [
    "UNDER_LEGAL_REVIEW",
    "INFO_REQUESTED",
    "ACCEPTED",
    "REJECTED",
    "LEGAL_CASE_CREATED",
  ],
  INFO_REQUESTED: ["INFO_RESPONDED", "REJECTED", "CLOSED"],
  INFO_RESPONDED: [
    "UNDER_LEGAL_REVIEW",
    "ACCEPTED",
    "REJECTED",
    "INFO_REQUESTED",
    "LEGAL_CASE_CREATED",
  ],
  UNDER_LEGAL_REVIEW: [
    "ACCEPTED",
    "REJECTED",
    "INFO_REQUESTED",
    "LEGAL_CASE_CREATED",
    "CLOSED",
  ],
  ACCEPTED: ["LEGAL_CASE_CREATED", "CLOSED"],
  LEGAL_CASE_CREATED: ["CLOSED"],
  REJECTED: [],
  CLOSED: [],
};

export function isTerminal(status: ReferralStatus): boolean {
  return TERMINAL_STATES.includes(status);
}

export function canTransition(from: ReferralStatus, to: ReferralStatus): boolean {
  if (from === to) return true;
  return REFERRAL_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: ReferralStatus, to: ReferralStatus): void {
  if (from === to) return;
  if (!canTransition(from, to)) {
    throw new Error(
      `Invalid referral transition: ${from} → ${to}. Allowed: ${
        REFERRAL_TRANSITIONS[from]?.join(", ") || "(none — terminal state)"
      }`
    );
  }
}

/** Map lifecycle actions to the required Legal capability keys on
 *  `useLgAccess()`. Consumed by the hook layer to gate mutations. */
export const ACTION_REQUIRED_CAPABILITY: Record<LifecycleAction, string[]> = {
  VIEW: ["canViewReferral"],
  ACCEPT: ["canAcceptReferral"],
  REJECT: ["canAcceptReferral"],
  REQUEST_INFO: ["canAcceptReferral"],
  RECEIVE_INFO_RESPONSE: ["canAcceptReferral"],
  CREATE_INTAKE: ["canAcceptReferral"],
  CREATE_CASE: ["canAcceptReferral"],
  ASSIGN_OFFICER: ["canAssignCase", "canReassignCase"],
  REASSIGN: ["canReassignCase"],
  ESCALATE: ["canApproveEscalation", "canAcceptReferral"],
  CLOSE: ["canApproveClosure"],
};
