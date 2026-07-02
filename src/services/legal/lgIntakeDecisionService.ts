/**
 * EPIC-03A.1 — Intake Decision Support (presentation-layer aggregation).
 *
 * Non-invasive: reads only. Does NOT change the EPIC-03A workflow, schema
 * or write paths. Provides readiness scoring, duplicate detection,
 * business context, and rule-based recommendations to help Legal Officers
 * and Supervisors qualify intake faster.
 *
 * No AI. No mock data. Live Supabase reads with graceful null fallback.
 */
import { supabase } from "@/integrations/supabase/client";
import type { IntakeRow } from "./lgIntakeQualificationService";

const S: any = supabase;

/* ============================================================
 * Readiness scoring
 * ============================================================ */
export interface ReadinessCriterion {
  key: string;
  label: string;
  weight: number;   // 0..1 (sum of all = 1)
  met: boolean;
  detail?: string;
}

export interface ReadinessScore {
  score: number;                  // 0..100
  level: "READY" | "ALMOST" | "ATTENTION" | "INCOMPLETE";
  criteria: ReadinessCriterion[];
}

interface ReadinessInputs {
  intake: IntakeRow;
  mandatoryTotal: number;
  mandatoryComplete: number;
  documentsCount: number;
  openInfoCount: number;
  duplicateOpenCases: number;
  // EPIC-06A.2 — optional proposed recoverable liabilities captured during intake
  proposedLiabilitiesCount?: number;
  proposedLiabilitiesVerified?: number;
}

export function computeReadiness(inp: ReadinessInputs): ReadinessScore {
  const i = inp.intake;
  const financialOk =
    i.financial_exposure != null || i.financial_outstanding != null;
  const legalOk = !!i.legal_issue && !!i.recovery_type;
  const jurisdictionOk = !!i.country_code;
  const checklistOk =
    inp.mandatoryTotal === 0 ? true : inp.mandatoryComplete >= inp.mandatoryTotal;
  const supervisorOk =
    !i.supervisor_required || i.supervisor_status === "APPROVED";
  const infoOk = inp.openInfoCount === 0;
  const documentsOk = inp.documentsCount > 0 || !!(i as any).payload;
  const duplicateReviewed = inp.duplicateOpenCases === 0 || !!i.internal_remarks;

  const propCount = inp.proposedLiabilitiesCount ?? 0;
  const propVerified = inp.proposedLiabilitiesVerified ?? 0;
  const liabilityOk = propCount === 0 ? true : propVerified >= propCount;
  // If proposed liabilities exist, borrow 0.05 from "documents" for a "liability" criterion.
  const docsWeight = propCount > 0 ? 0.05 : 0.10;
  const liabWeight = propCount > 0 ? 0.05 : 0;

  const criteria: ReadinessCriterion[] = [
    { key: "checklist", label: "Mandatory checklist completed", weight: 0.25, met: checklistOk,
      detail: inp.mandatoryTotal === 0 ? "No mandatory items configured" : `${inp.mandatoryComplete}/${inp.mandatoryTotal} done` },
    { key: "financial", label: "Financial assessment complete", weight: 0.15, met: financialOk },
    { key: "legal", label: "Legal assessment complete", weight: 0.15, met: legalOk },
    { key: "documents", label: "Documents present", weight: docsWeight, met: documentsOk },
    ...(propCount > 0 ? [{ key: "liability", label: "Proposed liabilities verified", weight: liabWeight, met: liabilityOk,
      detail: `${propVerified}/${propCount} verified` }] : []),
    { key: "info", label: "Information requests closed", weight: 0.10, met: infoOk,
      detail: inp.openInfoCount > 0 ? `${inp.openInfoCount} open` : undefined },
    { key: "supervisor", label: "Supervisor approval complete", weight: 0.10, met: supervisorOk,
      detail: i.supervisor_required ? `Status: ${i.supervisor_status ?? "PENDING"}` : "Not required" },
    { key: "duplicate", label: "Duplicate check reviewed", weight: 0.08, met: duplicateReviewed,
      detail: inp.duplicateOpenCases > 0 ? `${inp.duplicateOpenCases} open matter(s) found` : "No open duplicates" },
    { key: "jurisdiction", label: "Jurisdiction confirmed", weight: 0.07, met: jurisdictionOk },
  ];

  const score = Math.round(criteria.reduce((s, c) => s + (c.met ? c.weight : 0), 0) * 100);
  const level: ReadinessScore["level"] =
    score >= 90 ? "READY" : score >= 70 ? "ALMOST" : score >= 40 ? "ATTENTION" : "INCOMPLETE";

  return { score, level, criteria };
}

/* ============================================================
 * Rule-based recommendation
 * ============================================================ */
export type RecommendedOutcome =
  | "ACCEPT_REFERRAL"
  | "REJECT_REFERRAL"
  | "REQUEST_INFORMATION"
  | "SUPERVISOR_REVIEW"
  | "ESCALATE"
  | "CONVERT_TO_CASE"
  | "RETURN_TO_SOURCE";

export interface Recommendation {
  outcome: RecommendedOutcome;
  label: string;
  tone: "success" | "warning" | "info" | "danger";
  reasons: string[];        // "✓ Financial assessment complete"
  blockers: string[];       // "✗ Mandatory documents missing"
}

export function computeRecommendation(
  inp: ReadinessInputs & { businessRecoveryFailed?: boolean; highValueThreshold?: number }
): Recommendation {
  const i = inp.intake;
  const readiness = computeReadiness(inp);
  const reasons: string[] = [];
  const blockers: string[] = [];

  readiness.criteria.forEach((c) => {
    (c.met ? reasons : blockers).push(`${c.met ? "✓" : "✗"} ${c.label}${c.detail ? ` (${c.detail})` : ""}`);
  });

  const exposure = i.financial_exposure ?? i.financial_outstanding ?? i.exposure_amount ?? 0;
  const threshold = inp.highValueThreshold ?? 10_000;
  if (exposure >= threshold) reasons.push(`✓ Financial exposure above high-value threshold (${threshold.toLocaleString()})`);

  // Deterministic decision tree
  if (i.qualification_status === "CONVERTED_TO_CASE")
    return { outcome: "CONVERT_TO_CASE", label: "Already converted to case", tone: "info", reasons, blockers };

  if (i.qualification_status === "REJECTED")
    return { outcome: "REJECT_REFERRAL", label: "Referral rejected", tone: "danger", reasons, blockers };

  if (i.qualification_status === "APPROVED" && (!i.supervisor_required || i.supervisor_status === "APPROVED"))
    return { outcome: "CONVERT_TO_CASE", label: "Convert to Legal Case", tone: "success", reasons, blockers };

  if (inp.openInfoCount > 0)
    return { outcome: "REQUEST_INFORMATION", label: "Awaiting Information", tone: "warning", reasons, blockers };

  if (i.supervisor_required && i.supervisor_status !== "APPROVED" && readiness.score >= 70)
    return { outcome: "SUPERVISOR_REVIEW", label: "Send to Supervisor Review", tone: "info", reasons, blockers };

  if (readiness.score < 40)
    return { outcome: "REQUEST_INFORMATION", label: "Request More Information", tone: "warning", reasons, blockers };

  if (readiness.score < 70)
    return { outcome: "REQUEST_INFORMATION", label: "Complete Assessment", tone: "warning", reasons, blockers };

  if (exposure < threshold && inp.businessRecoveryFailed)
    return { outcome: "RETURN_TO_SOURCE", label: "Return to Source Department", tone: "warning", reasons, blockers };

  return { outcome: "ACCEPT_REFERRAL", label: "Accept Referral", tone: "success", reasons, blockers };
}

/* ============================================================
 * Duplicate matter analysis
 * ============================================================ */
export interface DuplicateMatter {
  kind: "OPEN_CASE" | "CLOSED_CASE" | "SETTLEMENT" | "ARRANGEMENT" | "ORDER" | "RECOVERY";
  id: string;
  ref?: string | null;
  status?: string | null;
  amount?: number | null;
  createdAt?: string | null;
  route?: string;
}

export interface DuplicateAnalysis {
  openCases: DuplicateMatter[];
  closedCases: DuplicateMatter[];
  settlements: DuplicateMatter[];
  arrangements: DuplicateMatter[];
  orders: DuplicateMatter[];
  recoveries: DuplicateMatter[];
  totalOpen: number;
  totalClosed: number;
  outstandingRecovery: number;
}

const OPEN_CASE_STATUSES = new Set(["OPEN", "IN_PROGRESS", "ACTIVE", "PENDING", "REVIEW", "HEARING_SCHEDULED", "AWAITING_JUDGMENT"]);
const CLOSED_CASE_STATUSES = new Set(["CLOSED", "SETTLED", "DISMISSED", "WITHDRAWN", "COMPLETED", "JUDGMENT_ENTERED"]);

export async function loadDuplicateAnalysis(intake: IntakeRow): Promise<DuplicateAnalysis> {
  const entityId = intake.primary_entity_id;
  const empty: DuplicateAnalysis = {
    openCases: [], closedCases: [], settlements: [], arrangements: [], orders: [], recoveries: [],
    totalOpen: 0, totalClosed: 0, outstandingRecovery: 0,
  };
  if (!entityId) return empty;

  // Cases via lg_case_party OR direct primary_entity_id column
  const [casesByParty, casesDirect] = await Promise.all([
    S.from("lg_case_party")
      .select("case_id, party_type, party_reference, lg_case:lg_case(id, case_no, status, opened_at, closed_at)")
      .eq("party_reference", entityId).limit(50),
    S.from("lg_case").select("id, case_no, status, opened_at, closed_at, primary_entity_id")
      .eq("primary_entity_id", entityId).neq("source_intake_id", intake.id).limit(50),
  ]);
  const caseMap = new Map<string, any>();
  ((casesByParty as any).data ?? []).forEach((p: any) => {
    if (p.lg_case) caseMap.set(p.lg_case.id, p.lg_case);
  });
  ((casesDirect as any).data ?? []).forEach((c: any) => caseMap.set(c.id, c));

  const open: DuplicateMatter[] = [];
  const closed: DuplicateMatter[] = [];
  caseMap.forEach((c) => {
    const isClosed = CLOSED_CASE_STATUSES.has(String(c.status).toUpperCase());
    const row: DuplicateMatter = {
      kind: isClosed ? "CLOSED_CASE" : "OPEN_CASE",
      id: c.id, ref: c.case_no, status: c.status, createdAt: c.opened_at ?? c.closed_at,
      route: `/legal/lg/cases/${c.id}`,
    };
    (isClosed ? closed : open).push(row);
  });

  const caseIds = Array.from(caseMap.keys());
  const [settlements, arrangements, orders, actions] = await Promise.all([
    caseIds.length ? S.from("lg_settlement").select("id, settlement_no, status, total_amount, lg_case_id, created_at").in("lg_case_id", caseIds).limit(50) : Promise.resolve({ data: [] }),
    caseIds.length ? S.from("lg_payment_arrangement_link").select("id, external_arrangement_ref, status, total_amount, lg_case_id, created_at").in("lg_case_id", caseIds).limit(50) : Promise.resolve({ data: [] }),
    caseIds.length ? S.from("lg_order").select("id, order_no, status, amount_ordered, lg_case_id, created_at").in("lg_case_id", caseIds).limit(50) : Promise.resolve({ data: [] }),
    caseIds.length ? S.from("lg_case_action").select("id, action_no, status, outstanding_amount, lg_case_id, created_at").in("lg_case_id", caseIds).limit(50) : Promise.resolve({ data: [] }),
  ]);

  const settlementRows: DuplicateMatter[] = ((settlements as any).data ?? []).map((s: any) => ({
    kind: "SETTLEMENT", id: s.id, ref: s.settlement_no, status: s.status, amount: s.total_amount, createdAt: s.created_at,
    route: `/legal/lg/cases/${s.lg_case_id}`,
  }));
  const arrRows: DuplicateMatter[] = ((arrangements as any).data ?? []).map((a: any) => ({
    kind: "ARRANGEMENT", id: a.id, ref: a.external_arrangement_ref, status: a.status, amount: a.total_amount, createdAt: a.created_at,
    route: `/legal/lg/cases/${a.lg_case_id}`,
  }));
  const orderRows: DuplicateMatter[] = ((orders as any).data ?? []).map((o: any) => ({
    kind: "ORDER", id: o.id, ref: o.order_no, status: o.status, amount: o.amount_ordered, createdAt: o.created_at,
    route: `/legal/lg/cases/${o.lg_case_id}`,
  }));
  const actionRows: DuplicateMatter[] = ((actions as any).data ?? []).map((r: any) => ({
    kind: "RECOVERY", id: r.id, ref: r.action_no, status: r.status, amount: r.outstanding_amount, createdAt: r.created_at,
    route: `/legal/lg/cases/${r.lg_case_id}`,
  }));

  const outstanding = actionRows.reduce((s, r) => s + Number(r.amount ?? 0), 0);

  return {
    openCases: open,
    closedCases: closed,
    settlements: settlementRows,
    arrangements: arrRows,
    orders: orderRows,
    recoveries: actionRows,
    totalOpen: open.length,
    totalClosed: closed.length,
    outstandingRecovery: outstanding,
  };
}

/* ============================================================
 * Business context (Employer or Insured Person)
 * ============================================================ */
export interface BusinessContext {
  kind: "EMPLOYER" | "INSURED_PERSON" | "OTHER" | "UNKNOWN";
  identifier?: string | null;
  displayName?: string | null;
  status?: string | null;
  registeredOn?: string | null;
  route?: string;
  metrics: { label: string; value: string | number | null }[];
}

const nz = (v: any) => (v == null || v === "" ? null : v);

export async function loadBusinessContext(intake: IntakeRow): Promise<BusinessContext> {
  const entityId = intake.primary_entity_id;
  if (!entityId) return { kind: "UNKNOWN", metrics: [] };

  if (intake.primary_entity_type === "EMPLOYER") {
    const { data: emp } = await S.from("er_master")
      .select("regno, company_name, status, indus_class, commence_date, created_at")
      .eq("regno", entityId).maybeSingle();
    const [{ data: comp }, { data: legacy }] = await Promise.all([
      S.from("ce_employer_compliance_status").select("compliance_rating, outstanding_amount, last_audit_date, status")
        .eq("employer_regno", entityId).maybeSingle().then((r: any) => r).catch(() => ({ data: null })),
      S.from("lg_case").select("id", { count: "exact", head: true }).eq("primary_entity_id", entityId).then((r: any) => r).catch(() => ({ data: null, count: 0 })),
    ]);
    return {
      kind: "EMPLOYER",
      identifier: entityId,
      displayName: nz(emp?.company_name) ?? entityId,
      status: nz(emp?.status),
      registeredOn: nz(emp?.commence_date) ?? nz(emp?.created_at),
      route: `/employers-management/view/${entityId}`,
      metrics: [
        { label: "Industry", value: nz(emp?.indus_class) },
        { label: "Compliance Rating", value: nz(comp?.compliance_rating) },
        { label: "Outstanding Contributions", value: nz(comp?.outstanding_amount) },
        { label: "Last Audit", value: nz(comp?.last_audit_date) },
        { label: "Previous Legal Matters", value: (legacy as any)?.count ?? 0 },
      ],
    };
  }

  if (intake.primary_entity_type === "INSURED_PERSON") {
    const { data: ip } = await S.from("ip_master")
      .select("ssn, first_name, last_name, status, registration_date, dob")
      .eq("ssn", entityId).maybeSingle();
    const { count: overpaymentCount } = await S.from("bn_overpayment")
      .select("id", { count: "exact", head: true }).eq("participant_id", entityId).then((r: any) => r).catch(() => ({ count: 0 }));
    const { count: legalCount } = await S.from("lg_case")
      .select("id", { count: "exact", head: true }).eq("primary_entity_id", entityId).then((r: any) => r).catch(() => ({ count: 0 }));
    return {
      kind: "INSURED_PERSON",
      identifier: entityId,
      displayName: nz(ip ? `${ip.first_name ?? ""} ${ip.last_name ?? ""}`.trim() : null) ?? entityId,
      status: nz(ip?.status),
      registeredOn: nz(ip?.registration_date),
      route: `/ip-management/view/${entityId}`,
      metrics: [
        { label: "Date of Birth", value: nz(ip?.dob) },
        { label: "Benefit Overpayments", value: overpaymentCount ?? 0 },
        { label: "Previous Legal Matters", value: legalCount ?? 0 },
      ],
    };
  }

  return { kind: "OTHER", identifier: entityId, displayName: entityId, metrics: [] };
}

/* ============================================================
 * Referral source context (Compliance / Benefits / Finance / Manual)
 * ============================================================ */
export interface SourceContext {
  module: string;
  fields: { label: string; value: any }[];
}

export async function loadSourceContext(intake: IntakeRow): Promise<SourceContext> {
  const module = intake.source_module || "MANUAL";
  const payload = (intake as any).payload ?? {};

  if (module === "COMPLIANCE" && intake.source_reference_no) {
    const { data } = await S.from("ce_cases")
      .select("case_no, opened_at, assigned_to, status, priority, notes")
      .eq("case_no", intake.source_reference_no).maybeSingle();
    return {
      module,
      fields: [
        { label: "Compliance Case", value: nz(data?.case_no) ?? intake.source_reference_no },
        { label: "Opened", value: nz(data?.opened_at) },
        { label: "Assigned Officer", value: nz(data?.assigned_to) ?? nz(payload.officer) },
        { label: "Status", value: nz(data?.status) },
        { label: "Priority", value: nz(data?.priority) },
        { label: "Notes", value: nz(data?.notes) ?? nz(payload.notes) },
      ],
    };
  }
  if (module === "BENEFITS" && intake.source_reference_no) {
    const { data } = await S.from("bn_claim")
      .select("claim_no, product_code, status, decision, participant_id")
      .eq("claim_no", intake.source_reference_no).maybeSingle();
    return {
      module,
      fields: [
        { label: "Claim No", value: nz(data?.claim_no) ?? intake.source_reference_no },
        { label: "Benefit Type", value: nz(data?.product_code) ?? nz(payload.product) },
        { label: "Decision", value: nz(data?.decision) },
        { label: "Claim Status", value: nz(data?.status) },
        { label: "Overpayment", value: nz(payload.overpayment_amount) },
      ],
    };
  }
  if (module === "FINANCE" || module === "CASHIER") {
    return {
      module,
      fields: [
        { label: "Debt Reference", value: intake.source_reference_no },
        { label: "Ledger", value: nz(payload.ledger) },
        { label: "Outstanding Balance", value: nz(payload.outstanding_balance) ?? intake.financial_outstanding },
      ],
    };
  }
  return {
    module,
    fields: [
      { label: "Source Reference", value: intake.source_reference_no },
      { label: "Referral Reason", value: intake.summary },
      { label: "Supporting Notes", value: nz(payload.notes) ?? nz(payload.remarks) },
    ],
  };
}

/* ============================================================
 * Operational alerts (deterministic)
 * ============================================================ */
export type AlertSeverity = "high" | "medium" | "low";
export interface OperationalAlert {
  key: string;
  label: string;
  severity: AlertSeverity;
  detail?: string;
}

export function computeAlerts(
  intake: IntakeRow,
  dups: DuplicateAnalysis,
  openInfoCount: number,
  mandatoryTotal: number,
  mandatoryComplete: number,
  highValueThreshold = 10_000
): OperationalAlert[] {
  const out: OperationalAlert[] = [];
  const exposure = intake.financial_exposure ?? intake.financial_outstanding ?? intake.exposure_amount ?? 0;
  if (exposure >= highValueThreshold)
    out.push({ key: "high_value", label: "High Value Referral", severity: "high", detail: exposure.toLocaleString() });
  if (dups.totalOpen > 0)
    out.push({ key: "duplicate_open", label: "Existing Open Legal Matter", severity: "high", detail: `${dups.totalOpen} open` });
  if (dups.orders.length > 0)
    out.push({ key: "existing_order", label: "Existing Court Order", severity: "medium", detail: `${dups.orders.length} on file` });
  if (dups.settlements.length > 0)
    out.push({ key: "existing_settlement", label: "Existing Settlement", severity: "medium" });
  if (dups.arrangements.length > 0)
    out.push({ key: "existing_arrangement", label: "Existing Payment Arrangement", severity: "medium" });
  if (openInfoCount > 0)
    out.push({ key: "outstanding_info", label: "Outstanding Information", severity: "medium", detail: `${openInfoCount} open` });
  if (mandatoryTotal > 0 && mandatoryComplete < mandatoryTotal)
    out.push({ key: "missing_docs", label: "Mandatory Checklist Incomplete", severity: "medium", detail: `${mandatoryComplete}/${mandatoryTotal}` });
  if (intake.supervisor_required && intake.supervisor_status !== "APPROVED")
    out.push({ key: "supervisor_needed", label: "Supervisor Approval Needed", severity: "low" });
  return out;
}

/* ============================================================
 * Supervisor KPIs & workbench KPIs (from workbench rows)
 * ============================================================ */
export interface SupervisorQueueKpis {
  pendingApproval: number;
  urgent: number;
  highValue: number;
  breachedSla: number;
  waitingInformation: number;
  returned: number;
  rejected: number;
  convertedToday: number;
  avgReviewHours: number | null;
  avgApprovalHours: number | null;
}

export function computeSupervisorKpis(rows: any[], highValueThreshold = 10_000, slaHours = 48): SupervisorQueueKpis {
  const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
  const isToday = (d?: string | null) => !!d && new Date(d).getTime() >= startToday.getTime();
  const now = Date.now();

  const pending = rows.filter((r) => r.qualification_status === "SUPERVISOR_REVIEW");
  const breach = pending.filter((r) => (now - new Date(r.updated_at ?? r.submitted_at).getTime()) / 3_600_000 > slaHours);

  const reviewDurations = rows
    .filter((r) => r.qualification_started_at && r.qualification_completed_at)
    .map((r) => (new Date(r.qualification_completed_at).getTime() - new Date(r.qualification_started_at).getTime()) / 3_600_000);
  const approvalDurations = rows
    .filter((r) => r.supervisor_at && r.qualification_started_at)
    .map((r) => (new Date(r.supervisor_at).getTime() - new Date(r.qualification_started_at).getTime()) / 3_600_000);
  const avg = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);

  return {
    pendingApproval: pending.length,
    urgent: rows.filter((r) => (r.urgency ?? "").toUpperCase() === "URGENT" || r.priority_code === "P1").length,
    highValue: rows.filter((r) => Number(r.financial_exposure ?? r.financial_outstanding ?? r.exposure_amount ?? 0) >= highValueThreshold).length,
    breachedSla: breach.length,
    waitingInformation: rows.filter((r) => r.qualification_status === "INFO_REQUESTED").length,
    returned: rows.filter((r) => r.qualification_status === "RETURNED").length,
    rejected: rows.filter((r) => r.qualification_status === "REJECTED").length,
    convertedToday: rows.filter((r) => r.qualification_status === "CONVERTED_TO_CASE" && isToday(r.qualification_completed_at)).length,
    avgReviewHours: avg(reviewDurations),
    avgApprovalHours: avg(approvalDurations),
  };
}

export interface ManagementKpis {
  avgQualificationDays: number | null;
  acceptancePct: number;
  rejectionPct: number;
  conversionPct: number;
  avgWaitingInfoDays: number | null;
  avgSupervisorReviewDays: number | null;
  sourceDistribution: Record<string, number>;
  avgFinancialExposure: number | null;
  highValueCount: number;
  officerThroughput: Record<string, number>;
}

export function computeManagementKpis(rows: any[], highValueThreshold = 10_000): ManagementKpis {
  const done = rows.filter((r) => r.qualification_started_at && r.qualification_completed_at);
  const avgHrs = (arr: number[]) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null);
  const hrsBetween = (a?: string, b?: string) => a && b ? (new Date(b).getTime() - new Date(a).getTime()) / 3_600_000 : NaN;

  const qualHrs = done.map((r) => hrsBetween(r.qualification_started_at, r.qualification_completed_at)).filter((n) => !isNaN(n));
  const waitInfo = rows.filter((r) => r.qualification_status === "INFO_REQUESTED")
    .map((r) => (Date.now() - new Date(r.updated_at ?? r.submitted_at).getTime()) / 3_600_000);
  const supRev = rows.filter((r) => r.supervisor_at && r.qualification_started_at)
    .map((r) => hrsBetween(r.qualification_started_at, r.supervisor_at)).filter((n) => !isNaN(n));

  const total = rows.length || 1;
  const accepted = rows.filter((r) => r.qualification_result === "ACCEPTED").length;
  const rejected = rows.filter((r) => r.qualification_result === "REJECTED").length;
  const converted = rows.filter((r) => r.qualification_status === "CONVERTED_TO_CASE").length;

  const distribution: Record<string, number> = {};
  rows.forEach((r) => { distribution[r.source_module ?? "UNKNOWN"] = (distribution[r.source_module ?? "UNKNOWN"] ?? 0) + 1; });
  const throughput: Record<string, number> = {};
  rows.forEach((r) => { if (r.intake_officer_id) throughput[r.intake_officer_id] = (throughput[r.intake_officer_id] ?? 0) + 1; });

  const exposures = rows.map((r) => Number(r.financial_exposure ?? r.financial_outstanding ?? r.exposure_amount ?? 0)).filter((n) => n > 0);
  const avgExp = exposures.length ? exposures.reduce((s, v) => s + v, 0) / exposures.length : null;

  const days = (h: number | null) => h == null ? null : h / 24;

  return {
    avgQualificationDays: days(avgHrs(qualHrs)),
    acceptancePct: Math.round((accepted / total) * 100),
    rejectionPct: Math.round((rejected / total) * 100),
    conversionPct: Math.round((converted / total) * 100),
    avgWaitingInfoDays: days(avgHrs(waitInfo)),
    avgSupervisorReviewDays: days(avgHrs(supRev)),
    sourceDistribution: distribution,
    avgFinancialExposure: avgExp,
    highValueCount: rows.filter((r) => Number(r.financial_exposure ?? r.financial_outstanding ?? r.exposure_amount ?? 0) >= highValueThreshold).length,
    officerThroughput: throughput,
  };
}
