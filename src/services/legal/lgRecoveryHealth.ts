/**
 * EPIC-02A — Recovery Workbench decision helpers.
 *
 * All rules are deterministic, configurable and colour-agnostic.
 * The UI is responsible for mapping health/alert severities to visual tokens.
 */
import type { RecoveryWorkbenchRow } from "./lgRecoveryWorkbenchService";

// ---------- Thresholds ----------

export interface RecoveryThresholds {
  outstandingHigh: number;          // > this = "High value" alert
  outstandingCritical: number;      // > this = escalate to Critical
  recoveryPctHealthy: number;       // >= this = healthy
  recoveryPctWarn: number;          // < this = at-risk
  ageingWarnDays: number;
  ageingCriticalDays: number;
  inactivityWarnDays: number;
  inactivityCriticalDays: number;
  hearingImminentDays: number;      // upcoming within this many days
  slaWarnDays: number;              // supervisor-review threshold
  requiredDocumentCount: number;
}

/** Centralized default thresholds (single source of truth). */
export const DEFAULT_RECOVERY_THRESHOLDS: RecoveryThresholds = {
  outstandingHigh: 5_000,
  outstandingCritical: 25_000,
  recoveryPctHealthy: 75,
  recoveryPctWarn: 25,
  ageingWarnDays: 60,
  ageingCriticalDays: 180,
  inactivityWarnDays: 30,
  inactivityCriticalDays: 60,
  hearingImminentDays: 7,
  slaWarnDays: 3,
  requiredDocumentCount: 1,
};

// Load overrides from localStorage (admin can override without touching code).
const LS_KEY = "lg.recovery.thresholds";
export function loadRecoveryThresholds(): RecoveryThresholds {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(LS_KEY) : null;
    if (!raw) return DEFAULT_RECOVERY_THRESHOLDS;
    return { ...DEFAULT_RECOVERY_THRESHOLDS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_RECOVERY_THRESHOLDS;
  }
}
export function saveRecoveryThresholds(t: Partial<RecoveryThresholds>): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LS_KEY, JSON.stringify({ ...loadRecoveryThresholds(), ...t }));
  } catch {
    /* ignore */
  }
}

// ---------- Utilities ----------

function daysSince(iso: string | null | undefined): number {
  if (!iso) return -1;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return -1;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}
function daysUntil(iso: string | null | undefined): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return Number.POSITIVE_INFINITY;
  return Math.floor((d.getTime() - Date.now()) / 86_400_000);
}

// ---------- Health ----------

export type HealthLevel = "HEALTHY" | "ATTENTION" | "HIGH_RISK" | "CRITICAL";
export interface HealthResult {
  level: HealthLevel;
  label: string;
  reasons: string[];
}

export function computeHealth(
  row: RecoveryWorkbenchRow,
  t: RecoveryThresholds = loadRecoveryThresholds(),
): HealthResult {
  const reasons: string[] = [];
  let score = 0; // higher = worse

  if (row.breach_status === "YES") { reasons.push("Payment arrangement breached"); score += 3; }
  if (row.sla_status === "OVERDUE") { reasons.push("SLA overdue"); score += 3; }
  if (row.sla_status === "AT_RISK") { reasons.push("SLA at risk"); score += 2; }

  if (row.next_action_date && daysUntil(row.next_action_date) < 0) {
    reasons.push("Next action date has passed"); score += 2;
  }
  if (row.next_hearing_date && daysUntil(row.next_hearing_date) >= 0 && daysUntil(row.next_hearing_date) <= t.hearingImminentDays) {
    reasons.push(`Hearing within ${t.hearingImminentDays} days`); score += 1;
  }

  if (row.ageing_days >= t.ageingCriticalDays) { reasons.push(`Aged over ${t.ageingCriticalDays} days`); score += 3; }
  else if (row.ageing_days >= t.ageingWarnDays) { reasons.push(`Aged over ${t.ageingWarnDays} days`); score += 1; }

  const inactivity = daysSince(row.last_activity);
  if (inactivity >= t.inactivityCriticalDays) { reasons.push(`No activity in ${inactivity}d`); score += 2; }
  else if (inactivity >= t.inactivityWarnDays) { reasons.push(`No activity in ${inactivity}d`); score += 1; }

  if (row.outstanding_balance >= t.outstandingCritical) {
    reasons.push(`Outstanding ≥ ${t.outstandingCritical.toLocaleString()}`); score += 2;
  } else if (row.outstanding_balance >= t.outstandingHigh) {
    reasons.push(`Outstanding ≥ ${t.outstandingHigh.toLocaleString()}`); score += 1;
  }

  if (row.total_recoverable > 0) {
    if (row.recovery_pct < t.recoveryPctWarn) { reasons.push(`Recovery % below ${t.recoveryPctWarn}%`); score += 2; }
    else if (row.recovery_pct >= t.recoveryPctHealthy) { reasons.push(`Recovery % ≥ ${t.recoveryPctHealthy}%`); score -= 1; }
  }

  let level: HealthLevel = "HEALTHY";
  if (score >= 5) level = "CRITICAL";
  else if (score >= 3) level = "HIGH_RISK";
  else if (score >= 1) level = "ATTENTION";

  if (level === "HEALTHY" && reasons.length === 0) reasons.push("All indicators within thresholds");
  const label = {
    HEALTHY: "Healthy",
    ATTENTION: "Attention Required",
    HIGH_RISK: "High Risk",
    CRITICAL: "Critical",
  }[level];
  return { level, label, reasons };
}

// ---------- Next Recommended Action ----------

export type NextActionKey =
  | "ISSUE_DEMAND_NOTICE"
  | "REQUEST_INFO"
  | "PREPARE_COURT_FILING"
  | "PREPARE_HEARING_DOCS"
  | "RECORD_HEARING_OUTCOME"
  | "REVIEW_SETTLEMENT"
  | "FOLLOW_UP_ARRANGEMENT"
  | "ESCALATE_SUPERVISOR"
  | "CLOSE_MATTER"
  | "WAIT_EXTERNAL"
  | "WAIT_COURT"
  | "WAIT_PAYMENT";

export interface NextActionResult {
  key: NextActionKey;
  label: string;
  reason: string;
}

const NEXT_ACTION_LABEL: Record<NextActionKey, string> = {
  ISSUE_DEMAND_NOTICE: "Issue Demand Notice",
  REQUEST_INFO: "Request Additional Information",
  PREPARE_COURT_FILING: "Prepare Court Filing",
  PREPARE_HEARING_DOCS: "Prepare Hearing Documents",
  RECORD_HEARING_OUTCOME: "Record Hearing Outcome",
  REVIEW_SETTLEMENT: "Review Settlement",
  FOLLOW_UP_ARRANGEMENT: "Follow-up on Arrangement",
  ESCALATE_SUPERVISOR: "Escalate to Supervisor",
  CLOSE_MATTER: "Close Matter",
  WAIT_EXTERNAL: "Waiting for External Action",
  WAIT_COURT: "Waiting for Court",
  WAIT_PAYMENT: "Waiting for Payment",
};

export function computeNextAction(
  row: RecoveryWorkbenchRow,
  t: RecoveryThresholds = loadRecoveryThresholds(),
): NextActionResult {
  const stage = String(row.case_stage ?? "").toUpperCase();
  const status = String(row.legal_status ?? "").toUpperCase();
  const inactivity = daysSince(row.last_activity);

  const mk = (key: NextActionKey, reason: string): NextActionResult =>
    ({ key, label: NEXT_ACTION_LABEL[key], reason });

  if (["CLOSED", "COMPLIED", "SETTLED"].includes(status)) return mk("CLOSE_MATTER", "Matter reached terminal status");
  if (row.outstanding_balance <= 0 && row.total_recoverable > 0) return mk("CLOSE_MATTER", "Fully recovered");

  if (row.breach_status === "YES") return mk("ESCALATE_SUPERVISOR", "Arrangement breached");

  if (row.sla_status === "OVERDUE") return mk("ESCALATE_SUPERVISOR", "SLA overdue");

  if (row.next_hearing_date) {
    const dU = daysUntil(row.next_hearing_date);
    if (dU >= 0 && dU <= t.hearingImminentDays) return mk("PREPARE_HEARING_DOCS", `Hearing in ${dU}d`);
    if (dU < 0) return mk("RECORD_HEARING_OUTCOME", "Hearing date passed");
  }

  if (row.arrangement_status === "ACTIVE") {
    if (inactivity >= t.inactivityWarnDays) return mk("FOLLOW_UP_ARRANGEMENT", `No activity ${inactivity}d`);
    return mk("WAIT_PAYMENT", "Arrangement is active");
  }

  if (["JUDGMENT", "ORDER_GRANTED", "HEARING"].some((s) => stage.includes(s) || status.includes(s))) {
    return mk("WAIT_COURT", "Awaiting court outcome");
  }

  if (["FILED", "IN_COURT"].some((s) => stage.includes(s) || status.includes(s))) {
    return mk("WAIT_COURT", "Filed with court");
  }

  if (["NOTICE_ISSUED", "DEMAND"].some((s) => stage.includes(s) || status.includes(s))) {
    if (inactivity >= t.inactivityWarnDays) return mk("PREPARE_COURT_FILING", "No response to demand");
    return mk("WAIT_EXTERNAL", "Awaiting party response");
  }

  if (row.document_count < t.requiredDocumentCount) return mk("REQUEST_INFO", "Missing supporting documents");

  if (["ACCEPTED", "UNDER_REVIEW", "REVIEW"].some((s) => stage.includes(s) || status.includes(s))) {
    return mk("ISSUE_DEMAND_NOTICE", "Case ready for demand notice");
  }

  if (inactivity >= t.inactivityCriticalDays) return mk("ESCALATE_SUPERVISOR", `Inactive ${inactivity}d`);

  return mk("REVIEW_SETTLEMENT", "Review options with officer");
}

// ---------- Alerts ----------

export type AlertSeverity = "info" | "warning" | "danger";
export type AlertKey =
  | "MISSING_DOCS"
  | "HEARING_SOON"
  | "ARRANGEMENT_BREACHED"
  | "NO_ACTIVITY_30"
  | "NO_ACTIVITY_60"
  | "SLA_WARNING"
  | "OVERDUE"
  | "OUTSTANDING_HIGH"
  | "JUDGMENT_DUE"
  | "SETTLEMENT_EXPIRING";

export interface Alert {
  key: AlertKey;
  label: string;
  severity: AlertSeverity;
  tooltip: string;
}

export function computeAlerts(
  row: RecoveryWorkbenchRow,
  t: RecoveryThresholds = loadRecoveryThresholds(),
): Alert[] {
  const alerts: Alert[] = [];
  const inactivity = daysSince(row.last_activity);

  if (row.document_count < t.requiredDocumentCount) {
    alerts.push({ key: "MISSING_DOCS", label: "Docs", severity: "warning", tooltip: "Supporting documents missing" });
  }
  if (row.next_hearing_date) {
    const dU = daysUntil(row.next_hearing_date);
    if (dU >= 0 && dU <= t.hearingImminentDays) {
      alerts.push({ key: "HEARING_SOON", label: `Hearing ${dU}d`, severity: "warning", tooltip: `Hearing scheduled in ${dU} day(s)` });
    }
  }
  if (row.breach_status === "YES") {
    alerts.push({ key: "ARRANGEMENT_BREACHED", label: "Breach", severity: "danger", tooltip: "Payment arrangement is in breach" });
  }
  if (inactivity >= t.inactivityCriticalDays) {
    alerts.push({ key: "NO_ACTIVITY_60", label: `${inactivity}d idle`, severity: "danger", tooltip: `No activity for ${inactivity} days` });
  } else if (inactivity >= t.inactivityWarnDays) {
    alerts.push({ key: "NO_ACTIVITY_30", label: `${inactivity}d idle`, severity: "warning", tooltip: `No activity for ${inactivity} days` });
  }
  if (row.sla_status === "AT_RISK") {
    alerts.push({ key: "SLA_WARNING", label: "SLA", severity: "warning", tooltip: "One or more tasks at SLA risk" });
  }
  if (row.next_action_date && daysUntil(row.next_action_date) < 0) {
    alerts.push({ key: "OVERDUE", label: "Overdue", severity: "danger", tooltip: "Next action date has passed" });
  }
  if (row.outstanding_balance >= t.outstandingCritical) {
    alerts.push({ key: "OUTSTANDING_HIGH", label: "High $", severity: "danger", tooltip: `Outstanding above ${t.outstandingCritical.toLocaleString()}` });
  } else if (row.outstanding_balance >= t.outstandingHigh) {
    alerts.push({ key: "OUTSTANDING_HIGH", label: "High $", severity: "warning", tooltip: `Outstanding above ${t.outstandingHigh.toLocaleString()}` });
  }
  const stage = String(row.case_stage ?? "").toUpperCase();
  const status = String(row.legal_status ?? "").toUpperCase();
  if (["ORDER_GRANTED", "JUDGMENT"].some((s) => stage.includes(s) || status.includes(s))) {
    alerts.push({ key: "JUDGMENT_DUE", label: "Judgment", severity: "info", tooltip: "Judgment compliance active" });
  }
  return alerts;
}

// ---------- Timeline stages ----------

export const TIMELINE_STAGES = [
  "Referral",
  "Assessment",
  "Demand Notice",
  "Court Filing",
  "Hearings",
  "Judgment",
  "Recovery",
  "Settlement",
  "Closure",
] as const;
export type TimelineStage = typeof TIMELINE_STAGES[number];

const STAGE_KEYWORDS: Record<TimelineStage, string[]> = {
  Referral: ["REFERRAL", "DRAFT", "SUBMITTED", "RECEIVED"],
  Assessment: ["ASSESSMENT", "UNDER_REVIEW", "ACCEPTED", "TRIAGE"],
  "Demand Notice": ["NOTICE", "DEMAND"],
  "Court Filing": ["FILED", "IN_COURT", "COURT_FILING"],
  Hearings: ["HEARING"],
  Judgment: ["JUDGMENT", "ORDER"],
  Recovery: ["RECOVERY", "ARRANGEMENT"],
  Settlement: ["SETTLEMENT", "SETTLED"],
  Closure: ["CLOSED", "COMPLIED", "COMPLETED"],
};

export function computeCurrentTimelineStage(row: RecoveryWorkbenchRow): TimelineStage {
  const s = `${row.case_stage ?? ""} ${row.legal_status ?? ""}`.toUpperCase();
  // Iterate in reverse so late stages win.
  for (let i = TIMELINE_STAGES.length - 1; i >= 0; i--) {
    const stage = TIMELINE_STAGES[i];
    if (STAGE_KEYWORDS[stage].some((k) => s.includes(k))) return stage;
  }
  return "Referral";
}

// ---------- Filter presets ----------

export interface RecoveryPreset {
  key: string;
  label: string;
  predicate: (row: RecoveryWorkbenchRow, ctx: { currentOfficerId?: string | null; t: RecoveryThresholds }) => boolean;
}

export const RECOVERY_PRESETS: RecoveryPreset[] = [
  {
    key: "my-active",
    label: "My Active Recoveries",
    predicate: (r, { currentOfficerId }) =>
      !!currentOfficerId && r.assigned_officer_id === currentOfficerId &&
      !["CLOSED", "COMPLIED", "SETTLED"].includes(String(r.legal_status ?? "").toUpperCase()),
  },
  { key: "overdue", label: "Overdue",
    predicate: (r) => !!r.next_action_date && new Date(r.next_action_date) < new Date() },
  { key: "breached", label: "Breached Arrangements",
    predicate: (r) => r.breach_status === "YES" },
  { key: "hearings-week", label: "Hearings This Week",
    predicate: (r) => {
      if (!r.next_hearing_date) return false;
      const d = new Date(r.next_hearing_date).getTime() - Date.now();
      return d >= 0 && d <= 7 * 86_400_000;
    } },
  { key: "awaiting-docs", label: "Awaiting Documents",
    predicate: (r, { t }) => r.document_count < t.requiredDocumentCount },
  { key: "awaiting-court", label: "Awaiting Court",
    predicate: (r) => /COURT|FILED|HEARING|JUDGMENT/.test(`${r.case_stage ?? ""} ${r.legal_status ?? ""}`.toUpperCase()) },
  { key: "outstanding-high", label: "Outstanding > Threshold",
    predicate: (r, { t }) => r.outstanding_balance >= t.outstandingHigh },
  { key: "settlement", label: "Settlement Cases",
    predicate: (r) => /SETTLEMENT|SETTLED/.test(`${r.case_stage ?? ""} ${r.legal_status ?? ""}`.toUpperCase()) },
  { key: "recent", label: "Recently Updated",
    predicate: (r) => !!r.last_activity && (Date.now() - new Date(r.last_activity).getTime()) <= 7 * 86_400_000 },
  { key: "idle-30", label: "No Activity 30 Days",
    predicate: (r) => !!r.last_activity && (Date.now() - new Date(r.last_activity).getTime()) >= 30 * 86_400_000 },
];
