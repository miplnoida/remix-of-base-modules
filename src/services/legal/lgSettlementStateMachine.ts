// Legal Settlement / Payment Arrangement Proposal — state machine.
//
// Single source of truth for allowed transitions on `lg_settlement.status`.
// Consumed by lgSettlementService and every settlement-related UI.
//
// Lifecycle:
//   DRAFT        → SUBMITTED | CANCELLED
//   SUBMITTED    → UNDER_REVIEW | CANCELLED
//   UNDER_REVIEW → APPROVED | REJECTED | CANCELLED
//   APPROVED     → ACTIVE | CANCELLED
//   ACTIVE       → COMPLETED | BREACHED | CANCELLED
//   BREACHED     → ACTIVE | CANCELLED           (cured or closed)
//   REJECTED / COMPLETED / CANCELLED → terminal
//
// Legacy values PROPOSED/ACCEPTED are treated as SUBMITTED/APPROVED for
// backward compatibility with pre-Phase-8 rows.

import type { LegalCapability } from "@/hooks/legal/useLegalCapability";

export type LgSettlementStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "ACTIVE"
  | "BREACHED"
  | "COMPLETED"
  | "CANCELLED";

export type LgSettlementAction =
  | "submit"
  | "startReview"
  | "approve"
  | "reject"
  | "activate"
  | "markBreached"
  | "cure"
  | "complete"
  | "cancel";

export const LG_SETTLEMENT_TERMINAL: LgSettlementStatus[] = [
  "REJECTED",
  "COMPLETED",
  "CANCELLED",
];

const TRANSITIONS: Record<LgSettlementStatus, LgSettlementStatus[]> = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["UNDER_REVIEW", "CANCELLED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["ACTIVE", "CANCELLED"],
  REJECTED: [],
  ACTIVE: ["COMPLETED", "BREACHED", "CANCELLED"],
  BREACHED: ["ACTIVE", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

const ACTION_TARGET: Record<LgSettlementAction, LgSettlementStatus> = {
  submit: "SUBMITTED",
  startReview: "UNDER_REVIEW",
  approve: "APPROVED",
  reject: "REJECTED",
  activate: "ACTIVE",
  markBreached: "BREACHED",
  cure: "ACTIVE",
  complete: "COMPLETED",
  cancel: "CANCELLED",
};

const ACTION_CAP: Record<LgSettlementAction, keyof LegalCapability | null> = {
  submit: "canDraftLetter",
  startReview: "canApproveStageMove",
  approve: "canApproveClosure",
  reject: "canApproveClosure",
  activate: "canApproveStageMove",
  markBreached: "canApproveEscalation",
  cure: "canApproveStageMove",
  complete: "canApproveClosure",
  cancel: "canApproveClosure",
};

function normalize(s: string | null | undefined): LgSettlementStatus {
  const v = (s ?? "DRAFT").toUpperCase();
  if (v === "PROPOSED") return "SUBMITTED";
  if (v === "ACCEPTED") return "APPROVED";
  return (v as LgSettlementStatus) in TRANSITIONS
    ? (v as LgSettlementStatus)
    : "DRAFT";
}

export function normalizeLgSettlementStatus(
  s: string | null | undefined,
): LgSettlementStatus {
  return normalize(s);
}

export function canTransition(
  from: string | null | undefined,
  to: LgSettlementStatus,
): boolean {
  const cur = normalize(from);
  if (cur === to) return true;
  return TRANSITIONS[cur].includes(to);
}

export function assertLgSettlementTransition(
  from: string | null | undefined,
  to: LgSettlementStatus,
): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `Invalid settlement transition: ${normalize(from)} → ${to}`,
    );
  }
}

export function targetStatusForAction(a: LgSettlementAction): LgSettlementStatus {
  return ACTION_TARGET[a];
}

export function requiredCapability(
  a: LgSettlementAction,
): keyof LegalCapability | null {
  return ACTION_CAP[a];
}

export function allowedActions(
  status: string | null | undefined,
  cap?: LegalCapability,
): LgSettlementAction[] {
  const cur = normalize(status);
  const next = TRANSITIONS[cur];
  return (Object.keys(ACTION_TARGET) as LgSettlementAction[]).filter((a) => {
    if (!next.includes(ACTION_TARGET[a])) return false;
    const req = ACTION_CAP[a];
    if (!req || !cap) return true;
    return Boolean(cap[req]);
  });
}
