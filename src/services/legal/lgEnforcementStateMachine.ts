/**
 * EPIC-06B — Enforcement action state machine.
 */

export type LgEnforcementStatus =
  | "DRAFT" | "SUBMITTED" | "APPROVED" | "IN_PROGRESS"
  | "EXECUTED" | "PARTIALLY_EXECUTED" | "FAILED" | "CANCELLED" | "CLOSED";

export const LG_ENFORCEMENT_STATUSES: LgEnforcementStatus[] = [
  "DRAFT","SUBMITTED","APPROVED","IN_PROGRESS",
  "EXECUTED","PARTIALLY_EXECUTED","FAILED","CANCELLED","CLOSED",
];

export const LG_ENFORCEMENT_STATUS_LABEL: Record<LgEnforcementStatus,string> = {
  DRAFT: "Draft", SUBMITTED: "Submitted", APPROVED: "Approved",
  IN_PROGRESS: "In Progress", EXECUTED: "Executed",
  PARTIALLY_EXECUTED: "Partially Executed", FAILED: "Failed",
  CANCELLED: "Cancelled", CLOSED: "Closed",
};

const T: Record<LgEnforcementStatus, LgEnforcementStatus[]> = {
  DRAFT: ["SUBMITTED","CANCELLED","CLOSED"],
  SUBMITTED: ["APPROVED","FAILED","CANCELLED","CLOSED"],
  APPROVED: ["IN_PROGRESS","CANCELLED","CLOSED"],
  IN_PROGRESS: ["EXECUTED","PARTIALLY_EXECUTED","FAILED","CANCELLED","CLOSED"],
  EXECUTED: ["CLOSED"],
  PARTIALLY_EXECUTED: ["IN_PROGRESS","EXECUTED","FAILED","CLOSED"],
  FAILED: ["IN_PROGRESS","CLOSED"],
  CANCELLED: [],
  CLOSED: [],
};

export function allowedNextLgEnforcementStatuses(from: string | null | undefined): LgEnforcementStatus[] {
  return T[(from ?? "DRAFT") as LgEnforcementStatus] ?? [];
}
export function canTransitionLgEnforcement(from: string | null | undefined, to: string) {
  const c = (from ?? "DRAFT") as LgEnforcementStatus;
  if (!T[c]) return { allowed: false, reason: `Unknown status: ${from}` };
  if (c === to) return { allowed: false, reason: "Enforcement is already in this status" };
  if (!T[c].includes(to as LgEnforcementStatus))
    return { allowed: false, reason: `Cannot move enforcement ${LG_ENFORCEMENT_STATUS_LABEL[c]} → ${LG_ENFORCEMENT_STATUS_LABEL[to as LgEnforcementStatus] ?? to}` };
  return { allowed: true };
}
export function assertLgEnforcementTransition(from: string | null | undefined, to: string) {
  const r = canTransitionLgEnforcement(from, to);
  if (!r.allowed) throw new Error(r.reason ?? "Invalid enforcement status transition");
}

export const LG_ENFORCEMENT_TYPES = [
  { code: "DEMAND_AFTER_JUDGMENT",   label: "Demand after Judgment" },
  { code: "GARNISHMENT",              label: "Garnishment" },
  { code: "ATTACHMENT",               label: "Attachment" },
  { code: "SEIZURE",                  label: "Seizure" },
  { code: "WARRANT",                  label: "Warrant" },
  { code: "COURT_ENFORCEMENT",        label: "Court Enforcement" },
  { code: "PAYMENT_DEFAULT",          label: "Payment Default Enforcement" },
  { code: "EMPLOYER_COMPLIANCE",      label: "Employer Compliance Enforcement" },
  { code: "OTHER",                    label: "Other" },
] as const;
