/**
 * State machine for lg_order (Legal Orders & Judgments).
 * Extended in EPIC-06B to include PARTIALLY_COMPLIED, UNDER_APPEAL,
 * ENFORCED and CANCELLED states.
 *
 * Lifecycle:
 *   DRAFT → FILED → GRANTED → ACTIVE
 *   ACTIVE → PARTIALLY_COMPLIED → COMPLIED | BREACHED
 *   Any non-terminal state may be CLOSED or CANCELLED directly.
 *   ACTIVE / BREACHED / PARTIALLY_COMPLIED → UNDER_APPEAL (when appeal filed).
 *   BREACHED → ENFORCED (when enforcement executed).
 */

export type LgOrderStatus =
  | "DRAFT"
  | "FILED"
  | "GRANTED"
  | "ACTIVE"
  | "PARTIALLY_COMPLIED"
  | "COMPLIED"
  | "BREACHED"
  | "UNDER_APPEAL"
  | "ENFORCED"
  | "CLOSED"
  | "CANCELLED";

export const LG_ORDER_STATUSES: LgOrderStatus[] = [
  "DRAFT", "FILED", "GRANTED", "ACTIVE",
  "PARTIALLY_COMPLIED", "COMPLIED", "BREACHED",
  "UNDER_APPEAL", "ENFORCED", "CLOSED", "CANCELLED",
];

export const LG_ORDER_STATUS_LABEL: Record<LgOrderStatus, string> = {
  DRAFT: "Draft",
  FILED: "Filed",
  GRANTED: "Granted",
  ACTIVE: "Active",
  PARTIALLY_COMPLIED: "Partially Complied",
  COMPLIED: "Complied",
  BREACHED: "Breached",
  UNDER_APPEAL: "Under Appeal",
  ENFORCED: "Enforced",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

const TRANSITIONS: Record<LgOrderStatus, LgOrderStatus[]> = {
  DRAFT:              ["FILED", "CANCELLED", "CLOSED"],
  FILED:              ["GRANTED", "CANCELLED", "CLOSED"],
  GRANTED:            ["ACTIVE", "UNDER_APPEAL", "CLOSED"],
  ACTIVE:             ["PARTIALLY_COMPLIED", "COMPLIED", "BREACHED", "UNDER_APPEAL", "CLOSED"],
  PARTIALLY_COMPLIED: ["COMPLIED", "BREACHED", "UNDER_APPEAL", "CLOSED"],
  COMPLIED:           ["CLOSED"],
  BREACHED:           ["ACTIVE", "ENFORCED", "UNDER_APPEAL", "CLOSED"],
  UNDER_APPEAL:       ["ACTIVE", "BREACHED", "COMPLIED", "CLOSED", "CANCELLED"],
  ENFORCED:           ["PARTIALLY_COMPLIED", "COMPLIED", "BREACHED", "CLOSED"],
  CLOSED:             [],
  CANCELLED:          [],
};

export function allowedNextLgOrderStatuses(from: string | null | undefined): LgOrderStatus[] {
  const key = (from ?? "DRAFT") as LgOrderStatus;
  return TRANSITIONS[key] ?? [];
}

export function canTransitionLgOrder(
  from: string | null | undefined,
  to: string,
): { allowed: boolean; reason?: string } {
  const cur = (from ?? "DRAFT") as LgOrderStatus;
  if (!LG_ORDER_STATUSES.includes(cur)) return { allowed: false, reason: `Unknown current status: ${from}` };
  if (!LG_ORDER_STATUSES.includes(to as LgOrderStatus)) return { allowed: false, reason: `Unknown target status: ${to}` };
  if (cur === to) return { allowed: false, reason: "Order is already in this status" };
  const next = TRANSITIONS[cur];
  if (!next.includes(to as LgOrderStatus)) {
    return { allowed: false, reason: `Cannot move order from ${LG_ORDER_STATUS_LABEL[cur]} to ${LG_ORDER_STATUS_LABEL[to as LgOrderStatus] ?? to}` };
  }
  return { allowed: true };
}

export function assertLgOrderTransition(from: string | null | undefined, to: string) {
  const r = canTransitionLgOrder(from, to);
  if (!r.allowed) throw new Error(r.reason ?? "Invalid order status transition");
}

// EPIC-06B — compliance status enum used on lg_order.compliance_status
export type LgOrderComplianceStatus =
  | "NOT_STARTED" | "IN_PROGRESS" | "PARTIALLY_COMPLIED"
  | "COMPLIED" | "BREACHED" | "EXTENDED" | "CLOSED";

export const LG_ORDER_COMPLIANCE_LABEL: Record<LgOrderComplianceStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  PARTIALLY_COMPLIED: "Partially Complied",
  COMPLIED: "Complied",
  BREACHED: "Breached",
  EXTENDED: "Extended",
  CLOSED: "Closed",
};
