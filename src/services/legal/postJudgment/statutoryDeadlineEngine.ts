/**
 * EPIC-07 — Statutory Deadline Engine
 * Central catalog of statutory deadlines governing legal recovery and
 * pure evaluation helpers. All periods are business-day agnostic
 * (calendar days) with an optional business-day mode.
 */

export type StatutoryDeadlineCode =
  | "APPEAL_FILING"                 // days to appeal an order
  | "JUDGMENT_COMPLIANCE"           // default compliance window after judgment
  | "AFFIDAVIT_FILING"              // affidavit response window
  | "REPLY_FILING"                  // reply-to-defence window
  | "EVIDENCE_BUNDLE_LODGE"         // evidence bundle lodgement pre-trial
  | "ENFORCEMENT_APPLICATION"       // window to apply for enforcement after breach
  | "VARIATION_APPLICATION"         // window to apply for consent variation post-breach
  | "COST_ASSESSMENT_LODGE"         // window to lodge costs for assessment
  | "SERVICE_OF_ORDER"              // window to serve an order after grant
  | "COUNSEL_INVOICE_APPROVAL";     // internal approval SLA

export interface StatutoryDeadlineRule {
  code: StatutoryDeadlineCode;
  label: string;
  days: number;
  business_days: boolean;
  citation: string;                 // statute/regulation reference
}

export const STATUTORY_DEADLINES: Record<StatutoryDeadlineCode, StatutoryDeadlineRule> = {
  APPEAL_FILING:            { code: "APPEAL_FILING",            label: "Appeal filing window",           days: 28, business_days: false, citation: "CPR Part 62" },
  JUDGMENT_COMPLIANCE:      { code: "JUDGMENT_COMPLIANCE",      label: "Judgment compliance window",     days: 21, business_days: false, citation: "Judgments Act" },
  AFFIDAVIT_FILING:         { code: "AFFIDAVIT_FILING",         label: "Affidavit filing",               days: 14, business_days: false, citation: "CPR Part 30" },
  REPLY_FILING:             { code: "REPLY_FILING",             label: "Reply filing",                   days:  7, business_days: false, citation: "CPR Part 18" },
  EVIDENCE_BUNDLE_LODGE:    { code: "EVIDENCE_BUNDLE_LODGE",    label: "Evidence bundle lodgement",      days: 21, business_days: false, citation: "CPR Part 29" },
  ENFORCEMENT_APPLICATION:  { code: "ENFORCEMENT_APPLICATION",  label: "Enforcement application",        days: 14, business_days: false, citation: "CPR Part 45" },
  VARIATION_APPLICATION:    { code: "VARIATION_APPLICATION",    label: "Consent variation application",  days: 14, business_days: false, citation: "CPR Part 26" },
  COST_ASSESSMENT_LODGE:    { code: "COST_ASSESSMENT_LODGE",    label: "Cost assessment lodgement",      days: 21, business_days: false, citation: "CPR Part 65" },
  SERVICE_OF_ORDER:         { code: "SERVICE_OF_ORDER",         label: "Service of order",               days:  7, business_days: false, citation: "CPR Part 6" },
  COUNSEL_INVOICE_APPROVAL: { code: "COUNSEL_INVOICE_APPROVAL", label: "Counsel invoice approval SLA",   days: 10, business_days: true,  citation: "Internal SLA" },
};

/** Add N calendar or business days to a date. */
export function addDays(from: Date, days: number, businessOnly = false): Date {
  const d = new Date(from);
  if (!businessOnly) { d.setDate(d.getDate() + days); return d; }
  let remaining = days;
  while (remaining !== 0) {
    d.setDate(d.getDate() + Math.sign(days));
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) remaining -= Math.sign(days);
  }
  return d;
}

/** Compute deadline for an event date + rule code. */
export function computeStatutoryDeadline(
  eventDate: string | Date, code: StatutoryDeadlineCode,
): { deadline: Date; rule: StatutoryDeadlineRule } {
  const rule = STATUTORY_DEADLINES[code];
  const src = typeof eventDate === "string" ? new Date(eventDate) : eventDate;
  return { deadline: addDays(src, rule.days, rule.business_days), rule };
}

export interface DeadlineStatus {
  deadline: string;
  days_remaining: number;
  is_overdue: boolean;
  is_at_risk: boolean;    // <= 3 days
  rule: StatutoryDeadlineRule;
}

export function evaluateDeadline(
  eventDate: string | Date, code: StatutoryDeadlineCode,
): DeadlineStatus {
  const { deadline, rule } = computeStatutoryDeadline(eventDate, code);
  const remaining = Math.floor((deadline.getTime() - Date.now()) / 86_400_000);
  return {
    deadline: deadline.toISOString(),
    days_remaining: remaining,
    is_overdue: remaining < 0,
    is_at_risk: remaining >= 0 && remaining <= 3,
    rule,
  };
}
