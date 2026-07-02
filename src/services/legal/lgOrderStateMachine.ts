/**
 * State machine for lg_order (Legal Orders & Judgments).
 *
 * Lifecycle:
 *   DRAFT → FILED → GRANTED → ACTIVE → COMPLIED | BREACHED → CLOSED
 * Any non-terminal state may be CLOSED directly.
 * BREACHED can move back to ACTIVE once resolved.
 */

export type LgOrderStatus =
  | "DRAFT"
  | "FILED"
  | "GRANTED"
  | "ACTIVE"
  | "COMPLIED"
  | "BREACHED"
  | "CLOSED";

export const LG_ORDER_STATUSES: LgOrderStatus[] = [
  "DRAFT", "FILED", "GRANTED", "ACTIVE", "COMPLIED", "BREACHED", "CLOSED",
];

export const LG_ORDER_STATUS_LABEL: Record<LgOrderStatus, string> = {
  DRAFT: "Draft",
  FILED: "Filed",
  GRANTED: "Granted",
  ACTIVE: "Active",
  COMPLIED: "Complied",
  BREACHED: "Breached",
  CLOSED: "Closed",
};

const TRANSITIONS: Record<LgOrderStatus, LgOrderStatus[]> = {
  DRAFT:    ["FILED", "CLOSED"],
  FILED:    ["GRANTED", "CLOSED"],
  GRANTED:  ["ACTIVE", "CLOSED"],
  ACTIVE:   ["COMPLIED", "BREACHED", "CLOSED"],
  COMPLIED: ["CLOSED"],
  BREACHED: ["ACTIVE", "CLOSED"],
  CLOSED:   [],
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
