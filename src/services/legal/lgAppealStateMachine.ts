/**
 * EPIC-06B — Appeal lifecycle state machine.
 */

export type LgAppealStatus =
  | "DRAFT" | "FILED" | "ACCEPTED" | "REJECTED"
  | "HEARING_SCHEDULED" | "UNDER_REVIEW" | "DECISION_RESERVED"
  | "ALLOWED" | "DISMISSED" | "WITHDRAWN" | "CLOSED";

export const LG_APPEAL_STATUSES: LgAppealStatus[] = [
  "DRAFT","FILED","ACCEPTED","REJECTED","HEARING_SCHEDULED","UNDER_REVIEW",
  "DECISION_RESERVED","ALLOWED","DISMISSED","WITHDRAWN","CLOSED",
];

export const LG_APPEAL_STATUS_LABEL: Record<LgAppealStatus,string> = {
  DRAFT: "Draft", FILED: "Filed", ACCEPTED: "Accepted", REJECTED: "Rejected",
  HEARING_SCHEDULED: "Hearing Scheduled", UNDER_REVIEW: "Under Review",
  DECISION_RESERVED: "Decision Reserved", ALLOWED: "Allowed",
  DISMISSED: "Dismissed", WITHDRAWN: "Withdrawn", CLOSED: "Closed",
};

const T: Record<LgAppealStatus, LgAppealStatus[]> = {
  DRAFT: ["FILED","WITHDRAWN","CLOSED"],
  FILED: ["ACCEPTED","REJECTED","WITHDRAWN","CLOSED"],
  ACCEPTED: ["HEARING_SCHEDULED","UNDER_REVIEW","WITHDRAWN","CLOSED"],
  REJECTED: ["CLOSED"],
  HEARING_SCHEDULED: ["UNDER_REVIEW","DECISION_RESERVED","WITHDRAWN","CLOSED"],
  UNDER_REVIEW: ["DECISION_RESERVED","ALLOWED","DISMISSED","WITHDRAWN","CLOSED"],
  DECISION_RESERVED: ["ALLOWED","DISMISSED","CLOSED"],
  ALLOWED: ["CLOSED"],
  DISMISSED: ["CLOSED"],
  WITHDRAWN: ["CLOSED"],
  CLOSED: [],
};

export function allowedNextLgAppealStatuses(from: string | null | undefined): LgAppealStatus[] {
  return T[(from ?? "DRAFT") as LgAppealStatus] ?? [];
}
export function canTransitionLgAppeal(from: string | null | undefined, to: string) {
  const c = (from ?? "DRAFT") as LgAppealStatus;
  if (!T[c]) return { allowed: false, reason: `Unknown status: ${from}` };
  if (c === to) return { allowed: false, reason: "Appeal is already in this status" };
  if (!T[c].includes(to as LgAppealStatus))
    return { allowed: false, reason: `Cannot move appeal ${LG_APPEAL_STATUS_LABEL[c]} → ${LG_APPEAL_STATUS_LABEL[to as LgAppealStatus] ?? to}` };
  return { allowed: true };
}
export function assertLgAppealTransition(from: string | null | undefined, to: string) {
  const r = canTransitionLgAppeal(from, to);
  if (!r.allowed) throw new Error(r.reason ?? "Invalid appeal status transition");
}
