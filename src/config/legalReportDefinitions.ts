/**
 * EPIC-09A — Legal Reports & Analytics
 *
 * Central registry of every Legal report. The Report Centre, ReportViewer,
 * saved/scheduled report screens and export audit all key off `report_code`.
 *
 * Phase 1 (this file) ships definitions for the full catalogue. Report pages
 * for each code are built in Phase 2 using the shared ReportViewer + service.
 */

import type { LgCapability } from "@/hooks/legal/useLgAccess";

export type LegalReportCategory =
  | "executive"
  | "operational"
  | "financial"
  | "compliance_referral"
  | "judicial"
  | "recovery"
  | "workload"
  | "external_counsel";

export type LegalReportFilterKey =
  | "dateRange" | "employer" | "fund" | "liabilityType" | "period"
  | "officer" | "matterType" | "status" | "priority" | "stage"
  | "territory" | "court" | "judge" | "counsel" | "campaign";

export interface LegalReportColumn {
  key: string;
  header: string;
  type?: "text" | "number" | "currency" | "date" | "datetime" | "badge";
  align?: "left" | "right" | "center";
  width?: number;
  aggregate?: "sum" | "avg" | "count" | "min" | "max";
}

export interface LegalReportDefinition {
  code: string;
  name: string;
  category: LegalReportCategory;
  purpose: string;
  /** Primary DB source(s) the report reads from — never re-computes financial totals. */
  dataSource: string[];
  columns: LegalReportColumn[];
  filters: LegalReportFilterKey[];
  groupingOptions?: string[];
  /** Route to open when a row is drilled down (with `:id` placeholder). */
  drilldownRoute?: string;
  /** Route for viewing/exporting this report inside the centre. */
  route: string;
  exportAllowed: boolean;
  /** Capability required to view; export/save/schedule use platform-level caps. */
  viewCapability: LgCapability;
  /** True if this report reconciles to v_lg_case_financials. */
  financialReconciled?: boolean;
  status?: "live" | "planned";
}

// -----------------------------------------------------------------------------
// Category metadata
// -----------------------------------------------------------------------------
export const LEGAL_REPORT_CATEGORIES: Record<LegalReportCategory, {
  label: string;
  description: string;
}> = {
  executive: {
    label: "Executive Reports",
    description: "Strategic KPIs and management dashboards for legal leadership",
  },
  operational: {
    label: "Operational Reports",
    description: "Day-to-day case, hearing, task and deadline registers",
  },
  financial: {
    label: "Financial Reports",
    description: "Assessed, paid and outstanding — reconciled to v_lg_case_financials",
  },
  compliance_referral: {
    label: "Compliance Referral Reports",
    description: "Compliance → Legal handoff analytics and item-to-liability mapping",
  },
  judicial: {
    label: "Judicial Reports",
    description: "Courts, judges, hearings, orders, appeals, enforcement outcomes",
  },
  recovery: {
    label: "Recovery Reports",
    description: "Post-judgment legal recovery, assignments and collections",
  },
  workload: {
    label: "Workload Reports",
    description: "Officer, team, and matter workload distribution",
  },
  external_counsel: {
    label: "External Counsel Reports",
    description: "External counsel engagement, fees, outcomes and cost/recovery",
  },
};

// -----------------------------------------------------------------------------
// Reusable column presets
// -----------------------------------------------------------------------------
const caseCoreCols: LegalReportColumn[] = [
  { key: "lg_case_no",       header: "Matter #",      type: "text" },
  { key: "matter_title",     header: "Title",         type: "text" },
  { key: "current_stage_code", header: "Stage",       type: "badge" },
  { key: "status_code",      header: "Status",        type: "badge" },
  { key: "priority",         header: "Priority",      type: "badge" },
  { key: "opened_date",      header: "Opened",        type: "date" },
];

const financialCols: LegalReportColumn[] = [
  { key: "total_assessed",   header: "Assessed",     type: "currency", align: "right", aggregate: "sum" },
  { key: "total_paid",       header: "Paid",         type: "currency", align: "right", aggregate: "sum" },
  { key: "total_outstanding",header: "Outstanding",  type: "currency", align: "right", aggregate: "sum" },
];

// -----------------------------------------------------------------------------
// Report registry
// -----------------------------------------------------------------------------
export const LEGAL_REPORTS: LegalReportDefinition[] = [
  // ============================================================
  // EXECUTIVE
  // ============================================================
  {
    code: "EXEC_DASHBOARD",
    name: "Executive Analytics Dashboard",
    category: "executive",
    purpose: "Board-level KPIs across matters, financials, judicial and recovery",
    dataSource: ["lg_case", "v_lg_case_financials", "lg_hearing", "lg_appeal", "lg_enforcement_action", "lg_consent_order", "lg_legal_cost"],
    columns: [],
    filters: ["dateRange", "territory", "officer"],
    route: "/legal/reports/executive",
    exportAllowed: true,
    viewCapability: "viewLegalExecutiveAnalytics",
    financialReconciled: true,
    status: "live",
  },


  // ============================================================
  // OPERATIONAL
  // ============================================================
  { code: "OPS_OPEN_MATTERS", name: "Open Matters", category: "operational",
    purpose: "All open legal matters with stage/status/priority",
    dataSource: ["lg_case", "v_lg_case_financials"],
    columns: [...caseCoreCols, ...financialCols],
    filters: ["employer", "officer", "matterType", "stage", "priority", "territory"],
    groupingOptions: ["current_stage_code", "priority", "assigned_legal_officer_id"],
    drilldownRoute: "/legal/lg/cases/:id", route: "/legal/reports/operational/open-matters",
    exportAllowed: true, viewCapability: "viewLegalReports", financialReconciled: true, status: "live" },

  { code: "OPS_CLOSED_MATTERS", name: "Closed Matters", category: "operational",
    purpose: "Closed matters with closure reason and duration",
    dataSource: ["lg_case", "v_lg_case_financials"],
    columns: [...caseCoreCols, { key: "closed_date", header: "Closed", type: "date" }, { key: "closure_reason", header: "Reason", type: "text" }],
    filters: ["dateRange", "employer", "officer", "matterType"],
    drilldownRoute: "/legal/lg/cases/:id", route: "/legal/reports/operational/closed-matters",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "live" },

  { code: "OPS_INTAKE_AGING", name: "Intake Aging", category: "operational",
    purpose: "Compliance intakes awaiting Legal decision, by age bucket",
    dataSource: ["lg_case_intake"],
    columns: [
      { key: "intake_no", header: "Intake #", type: "text" },
      { key: "submitted_at", header: "Submitted", type: "datetime" },
      { key: "decision_status", header: "Status", type: "badge" },
      { key: "age_days", header: "Age (days)", type: "number", align: "right" },
    ],
    filters: ["dateRange", "territory", "status"],
    drilldownRoute: "/legal/lg/intake/:id", route: "/legal/reports/operational/intake-aging",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "planned" },

  { code: "OPS_MATTER_AGING", name: "Matter Aging", category: "operational",
    purpose: "Open matters bucketed by age since opened_date",
    dataSource: ["lg_case"],
    columns: [...caseCoreCols, { key: "age_bucket", header: "Age Bucket", type: "badge" }],
    filters: ["employer", "officer", "matterType", "stage"],
    groupingOptions: ["age_bucket"],
    drilldownRoute: "/legal/lg/cases/:id", route: "/legal/reports/operational/matter-aging",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "live" }, // maps to legacy /legal/reports/lg/ageing

  { code: "OPS_UPCOMING_HEARINGS", name: "Upcoming Hearings", category: "operational",
    purpose: "Scheduled hearings in the next N days",
    dataSource: ["lg_hearing", "lg_case"],
    columns: [
      { key: "scheduled_date", header: "Date", type: "date" },
      { key: "lg_case_no", header: "Matter #", type: "text" },
      { key: "hearing_type", header: "Type", type: "badge" },
      { key: "court_id", header: "Court", type: "text" },
    ],
    filters: ["dateRange", "court", "officer"],
    drilldownRoute: "/legal/lg/hearings/:id", route: "/legal/reports/operational/upcoming-hearings",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "planned" },

  { code: "OPS_MISSED_HEARINGS", name: "Missed / Adjourned Hearings", category: "operational",
    purpose: "Hearings past scheduled date with no outcome, plus adjournments",
    dataSource: ["lg_hearing", "lg_hearing_adjournment"],
    columns: [
      { key: "scheduled_date", header: "Scheduled", type: "date" },
      { key: "lg_case_no", header: "Matter #", type: "text" },
      { key: "outcome_status", header: "Outcome", type: "badge" },
    ],
    filters: ["dateRange", "court"],
    drilldownRoute: "/legal/lg/hearings/:id", route: "/legal/reports/operational/missed-hearings",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "planned" },

  { code: "OPS_ORDERS_PENDING_COMPLIANCE", name: "Orders Pending Compliance", category: "operational",
    purpose: "Judicial orders with compliance still open or breached",
    dataSource: ["lg_order", "lg_order_compliance_event"],
    columns: [
      { key: "order_no", header: "Order #", type: "text" },
      { key: "order_date", header: "Date", type: "date" },
      { key: "compliance_status", header: "Compliance", type: "badge" },
    ],
    filters: ["dateRange", "court", "officer"],
    drilldownRoute: "/legal/lg/orders/:id", route: "/legal/reports/operational/orders-pending",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "planned" },

  { code: "OPS_APPEALS_REGISTER", name: "Appeals Register", category: "operational",
    purpose: "All appeals with status and outcome",
    dataSource: ["lg_appeal"],
    columns: [
      { key: "appeal_no", header: "Appeal #", type: "text" },
      { key: "filed_date", header: "Filed", type: "date" },
      { key: "status", header: "Status", type: "badge" },
      { key: "outcome", header: "Outcome", type: "badge" },
    ],
    filters: ["dateRange", "court", "status"],
    drilldownRoute: "/legal/lg/appeals/:id", route: "/legal/reports/operational/appeals",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "live" },

  { code: "OPS_ENFORCEMENT_REGISTER", name: "Enforcement Register", category: "operational",
    purpose: "All enforcement actions with status and recovery",
    dataSource: ["lg_enforcement_action"],
    columns: [
      { key: "enforcement_no", header: "Enforcement #", type: "text" },
      { key: "action_type", header: "Type", type: "badge" },
      { key: "status", header: "Status", type: "badge" },
    ],
    filters: ["dateRange", "officer", "status"],
    drilldownRoute: "/legal/lg/enforcement/:id", route: "/legal/reports/operational/enforcement",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "live" },

  { code: "OPS_CONSENT_ORDER_REGISTER", name: "Consent Order Register", category: "operational",
    purpose: "Consent orders with installment status",
    dataSource: ["lg_consent_order", "lg_consent_installment"],
    columns: [
      { key: "consent_no", header: "Consent #", type: "text" },
      { key: "status", header: "Status", type: "badge" },
      { key: "next_due_date", header: "Next Due", type: "date" },
    ],
    filters: ["dateRange", "status", "employer"],
    drilldownRoute: "/legal/lg/consent-orders/:id", route: "/legal/reports/operational/consent-orders",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "live" },

  { code: "OPS_COURT_FILING_REGISTER", name: "Court Filing Register", category: "operational",
    purpose: "All court filings with status",
    dataSource: ["lg_court_filing"],
    columns: [
      { key: "filing_no", header: "Filing #", type: "text" },
      { key: "filed_date", header: "Filed", type: "date" },
      { key: "court_id", header: "Court", type: "text" },
      { key: "status", header: "Status", type: "badge" },
    ],
    filters: ["dateRange", "court", "status"],
    drilldownRoute: "/legal/lg/court-filings/:id", route: "/legal/reports/operational/court-filings",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "planned" },

  { code: "OPS_RECOVERY_ASSIGNMENT_REGISTER", name: "Legal Recovery Assignment Register", category: "operational",
    purpose: "All legal recovery assignments with owner/stage",
    dataSource: ["lg_recovery_assignment"],
    columns: [
      { key: "assignment_no", header: "Assignment #", type: "text" },
      { key: "stage", header: "Stage", type: "badge" },
      { key: "assigned_officer_id", header: "Officer", type: "text" },
    ],
    filters: ["officer", "stage", "employer"],
    drilldownRoute: "/legal/lg/recovery-assignments/:id", route: "/legal/reports/operational/recovery-assignments",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "live" },

  { code: "OPS_TASK_AGING", name: "Task Aging", category: "operational",
    purpose: "Legal case tasks bucketed by due-date age",
    dataSource: ["lg_case_task"],
    columns: [
      { key: "task_title", header: "Task", type: "text" },
      { key: "due_date", header: "Due", type: "date" },
      { key: "status", header: "Status", type: "badge" },
      { key: "age_bucket", header: "Age", type: "badge" },
    ],
    filters: ["officer", "status", "dateRange"],
    route: "/legal/reports/operational/task-aging",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "planned" },

  { code: "OPS_DEADLINE_REGISTER", name: "Deadline Register", category: "operational",
    purpose: "All active legal deadlines with days remaining",
    dataSource: ["lg_case_deadline"],
    columns: [
      { key: "deadline_type", header: "Type", type: "badge" },
      { key: "due_date", header: "Due", type: "date" },
      { key: "days_remaining", header: "Days Left", type: "number", align: "right" },
    ],
    filters: ["officer", "dateRange"],
    route: "/legal/reports/operational/deadlines",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "planned" },

  // ============================================================
  // FINANCIAL — all reconcile with v_lg_case_financials
  // ============================================================
  { code: "FIN_CASE_SUMMARY", name: "Case Financial Summary", category: "financial",
    purpose: "Per-matter assessed/paid/outstanding",
    dataSource: ["v_lg_case_financials", "lg_case"],
    columns: [...caseCoreCols, ...financialCols],
    filters: ["dateRange", "employer", "matterType", "status", "priority"],
    groupingOptions: ["status_code", "priority"],
    drilldownRoute: "/legal/lg/cases/:id", route: "/legal/reports/financial/case-summary",
    exportAllowed: true, viewCapability: "viewLegalReports", financialReconciled: true, status: "live" },

  { code: "FIN_OUTSTANDING_BY_EMPLOYER", name: "Outstanding by Employer", category: "financial",
    purpose: "Total outstanding rolled up per employer",
    dataSource: ["v_lg_case_financials", "lg_case_party"],
    columns: [
      { key: "employer_name", header: "Employer", type: "text" },
      { key: "matter_count", header: "Matters", type: "number", align: "right", aggregate: "sum" },
      ...financialCols,
    ],
    filters: ["employer", "dateRange"],
    route: "/legal/reports/financial/outstanding-employer",
    exportAllowed: true, viewCapability: "viewLegalReports", financialReconciled: true, status: "live" },

  { code: "FIN_OUTSTANDING_BY_FUND", name: "Outstanding by Fund", category: "financial",
    purpose: "Outstanding split by fund (contributions/penalty/interest/legal cost)",
    dataSource: ["lg_recoverable_liability"],
    columns: [
      { key: "fund_code", header: "Fund", type: "badge" },
      { key: "assessed", header: "Assessed", type: "currency", align: "right", aggregate: "sum" },
      { key: "paid", header: "Paid", type: "currency", align: "right", aggregate: "sum" },
      { key: "outstanding", header: "Outstanding", type: "currency", align: "right", aggregate: "sum" },
    ],
    filters: ["fund", "dateRange", "employer"],
    route: "/legal/reports/financial/outstanding-fund",
    exportAllowed: true, viewCapability: "viewLegalReports", financialReconciled: true, status: "live" },

  { code: "FIN_OUTSTANDING_BY_LIABILITY_TYPE", name: "Outstanding by Liability Type", category: "financial",
    purpose: "Outstanding by liability type",
    dataSource: ["lg_recoverable_liability"],
    columns: [
      { key: "liability_type", header: "Liability Type", type: "badge" },
      { key: "outstanding", header: "Outstanding", type: "currency", align: "right", aggregate: "sum" },
    ],
    filters: ["liabilityType", "dateRange"],
    route: "/legal/reports/financial/outstanding-liability-type",
    exportAllowed: true, viewCapability: "viewLegalReports", financialReconciled: true, status: "live" },

  { code: "FIN_OUTSTANDING_BY_PERIOD", name: "Outstanding by Contribution Period", category: "financial",
    purpose: "Outstanding rolled up by contribution period",
    dataSource: ["lg_recoverable_liability"],
    columns: [
      { key: "contribution_period", header: "Period", type: "text" },
      { key: "outstanding", header: "Outstanding", type: "currency", align: "right", aggregate: "sum" },
    ],
    filters: ["period", "dateRange"],
    route: "/legal/reports/financial/outstanding-period",
    exportAllowed: true, viewCapability: "viewLegalReports", financialReconciled: true, status: "planned" },

  { code: "FIN_RECOVERY_COLLECTION", name: "Recovery Collection Analysis", category: "financial",
    purpose: "Per-matter recovery percentage (assessed vs paid)",
    dataSource: ["v_lg_case_financials"],
    columns: [
      { key: "lg_case_no", header: "Matter #", type: "text" },
      { key: "opened_date", header: "Opened", type: "date" },
      { key: "status_code", header: "Status", type: "badge" },
      ...financialCols,
      { key: "recovery_pct", header: "Recovery %", type: "number", align: "right" },
    ],
    filters: ["dateRange", "employer", "officer"],
    drilldownRoute: "/legal/lg/cases/:id",
    route: "/legal/reports/financial/recovery-collection",
    exportAllowed: true, viewCapability: "viewLegalReports", financialReconciled: true, status: "live" },


  { code: "FIN_PAYMENT_ALLOCATION", name: "Payment Allocation Report", category: "financial",
    purpose: "Payments allocated to legal liabilities",
    dataSource: ["lg_payment_allocation", "lg_recoverable_liability"],
    columns: [], filters: ["dateRange", "employer", "fund"],
    route: "/legal/reports/financial/payment-allocation",
    exportAllowed: true, viewCapability: "viewLegalReports", financialReconciled: true, status: "planned" },

  { code: "FIN_LEGAL_COST_RECOVERY", name: "Legal Cost Recovery Report", category: "financial",
    purpose: "Legal costs incurred vs recovered",
    dataSource: ["lg_legal_cost"],
    columns: [], filters: ["dateRange", "employer", "counsel"],
    route: "/legal/reports/financial/legal-cost-recovery",
    exportAllowed: true, viewCapability: "viewLegalReports", financialReconciled: true, status: "planned" },

  { code: "FIN_COURT_COST", name: "Court Cost Report", category: "financial",
    purpose: "Court filing and hearing costs",
    dataSource: ["lg_legal_cost", "lg_court_filing"],
    columns: [], filters: ["dateRange", "court"],
    route: "/legal/reports/financial/court-cost",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "live" }, // migrated from CourtCostsFees

  { code: "FIN_SETTLEMENT", name: "Settlement Financial Report", category: "financial",
    purpose: "Settlement values, collections and shortfalls",
    dataSource: ["lg_settlement", "lg_settlement_liability"],
    columns: [], filters: ["dateRange", "employer", "officer"],
    route: "/legal/reports/financial/settlement",
    exportAllowed: true, viewCapability: "viewLegalReports", financialReconciled: true, status: "planned" },

  { code: "FIN_CONSENT_COLLECTION", name: "Consent Order Collection Report", category: "financial",
    purpose: "Consent order installment collection performance",
    dataSource: ["lg_consent_order", "lg_consent_installment"],
    columns: [], filters: ["dateRange", "status"],
    route: "/legal/reports/financial/consent-collection",
    exportAllowed: true, viewCapability: "viewLegalReports", financialReconciled: true, status: "planned" },

  { code: "FIN_WRITE_OFF", name: "Write-off / Adjustment Report", category: "financial",
    purpose: "Approved write-offs and adjustments (if data exists)",
    dataSource: ["lg_recoverable_liability", "lg_liability_audit"],
    columns: [], filters: ["dateRange", "employer"],
    route: "/legal/reports/financial/write-off",
    exportAllowed: true, viewCapability: "viewLegalReports", financialReconciled: true, status: "planned" },

  // ============================================================
  // COMPLIANCE REFERRAL
  // ============================================================
  { code: "CR_REFERRAL_REGISTER", name: "Compliance Referral Register", category: "compliance_referral",
    purpose: "All Compliance → Legal referrals",
    dataSource: ["ce_legal_referrals", "core_legal_referral_item"],
    columns: [], filters: ["dateRange", "status", "employer"],
    route: "/legal/reports/compliance-referral/register",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "live" }, // migrated from LgReferralSourceReport

  { code: "CR_ITEMS_BY_FUND", name: "Referral Items by Fund", category: "compliance_referral",
    purpose: "Referral line items split by fund", dataSource: ["core_legal_referral_item"],
    columns: [], filters: ["fund", "dateRange"],
    route: "/legal/reports/compliance-referral/items-fund",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "planned" },

  { code: "CR_ITEMS_BY_PERIOD", name: "Referral Items by Contribution Period",
    category: "compliance_referral", purpose: "Referral items rolled up by contribution period",
    dataSource: ["core_legal_referral_item"], columns: [], filters: ["period"],
    route: "/legal/reports/compliance-referral/items-period",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "planned" },

  { code: "CR_ITEMS_ACCEPTED", name: "Items Accepted by Legal", category: "compliance_referral",
    purpose: "Referral items converted to legal liabilities",
    dataSource: ["core_legal_referral_item", "lg_recoverable_liability"],
    columns: [], filters: ["dateRange"],
    route: "/legal/reports/compliance-referral/accepted",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "planned" },

  { code: "CR_ITEMS_REJECTED", name: "Items Returned / Rejected", category: "compliance_referral",
    purpose: "Referral items returned to Compliance with reasons",
    dataSource: ["core_legal_referral_item"], columns: [], filters: ["dateRange"],
    route: "/legal/reports/compliance-referral/rejected",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "planned" },

  { code: "CR_CONVERSION_RATE", name: "Referral to Matter Conversion Rate", category: "compliance_referral",
    purpose: "% of referrals converted to legal matters",
    dataSource: ["ce_legal_referrals", "lg_case"], columns: [], filters: ["dateRange"],
    route: "/legal/reports/compliance-referral/conversion",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "live" },

  { code: "CR_TIME_REFERRAL_TO_INTAKE", name: "Time from Compliance Referral to Legal Intake",
    category: "compliance_referral", purpose: "Handoff SLA metric",
    dataSource: ["ce_legal_referrals", "lg_case_intake"], columns: [], filters: ["dateRange"],
    route: "/legal/reports/compliance-referral/time-referral-intake",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "planned" },

  { code: "CR_TIME_INTAKE_TO_MATTER", name: "Time from Legal Intake to Matter Creation",
    category: "compliance_referral", purpose: "Intake acceptance SLA",
    dataSource: ["lg_case_intake", "lg_case"], columns: [], filters: ["dateRange"],
    route: "/legal/reports/compliance-referral/time-intake-matter",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "planned" },

  { code: "CR_REFERRED_VS_LIABILITY", name: "Referred Amount vs Legal Liability Created",
    category: "compliance_referral", purpose: "Financial reconciliation Compliance ↔ Legal",
    dataSource: ["core_legal_referral_item", "lg_recoverable_liability"],
    columns: [], filters: ["dateRange", "employer"],
    route: "/legal/reports/compliance-referral/amount-reconciliation",
    exportAllowed: true, viewCapability: "viewLegalReports", financialReconciled: true, status: "live" },

  { code: "CR_MULTI_COMPONENT", name: "Multi-component Referral Report", category: "compliance_referral",
    purpose: "Referrals containing multiple liability components",
    dataSource: ["ce_legal_referrals", "core_legal_referral_item"],
    columns: [], filters: ["dateRange"],
    route: "/legal/reports/compliance-referral/multi-component",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "planned" },

  // ============================================================
  // JUDICIAL
  // ============================================================
  { code: "JUD_HEARINGS_BY_COURT", name: "Hearings by Court", category: "judicial",
    purpose: "Hearing volume by court", dataSource: ["lg_hearing", "lg_court"],
    columns: [], filters: ["dateRange", "court"],
    route: "/legal/reports/judicial/hearings-court",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "planned" },

  { code: "JUD_HEARINGS_BY_JUDGE", name: "Hearings by Judge", category: "judicial",
    purpose: "Hearing volume by judicial officer",
    dataSource: ["lg_hearing", "lg_court_officer"], columns: [], filters: ["dateRange", "judge"],
    route: "/legal/reports/judicial/hearings-judge",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "planned" },

  { code: "JUD_HEARING_OUTCOMES", name: "Hearing Outcomes", category: "judicial",
    purpose: "Distribution of hearing outcomes", dataSource: ["lg_hearing"],
    columns: [], filters: ["dateRange"],
    route: "/legal/reports/judicial/hearing-outcomes",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "live" }, // migrated from LgJudgmentOrderReport

  { code: "JUD_JUDGMENT_REGISTER", name: "Judgment Register", category: "judicial",
    purpose: "All judgments issued", dataSource: ["lg_order"], columns: [], filters: ["dateRange", "court"],
    route: "/legal/reports/judicial/judgments",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "planned" },

  { code: "JUD_ORDER_COMPLIANCE", name: "Order Compliance", category: "judicial",
    purpose: "Order compliance rate", dataSource: ["lg_order", "lg_order_compliance_event"],
    columns: [], filters: ["dateRange"],
    route: "/legal/reports/judicial/order-compliance",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "planned" },

  { code: "JUD_APPEAL_OUTCOMES", name: "Appeal Outcomes", category: "judicial",
    purpose: "Appeal outcomes by court", dataSource: ["lg_appeal"], columns: [], filters: ["dateRange", "court"],
    route: "/legal/reports/judicial/appeal-outcomes",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "planned" },

  { code: "JUD_ENFORCEMENT_OUTCOMES", name: "Enforcement Outcomes", category: "judicial",
    purpose: "Enforcement action outcomes", dataSource: ["lg_enforcement_action"],
    columns: [], filters: ["dateRange"],
    route: "/legal/reports/judicial/enforcement-outcomes",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "planned" },

  { code: "JUD_TIME_TO_JUDGMENT", name: "Average Time to Judgment", category: "judicial",
    purpose: "Avg days from case open → judgment",
    dataSource: ["lg_case", "lg_order"], columns: [], filters: ["dateRange"],
    route: "/legal/reports/judicial/time-to-judgment",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "planned" },

  { code: "JUD_TIME_TO_ENFORCEMENT", name: "Average Time to Enforcement", category: "judicial",
    purpose: "Avg days from judgment → enforcement",
    dataSource: ["lg_order", "lg_enforcement_action"], columns: [], filters: ["dateRange"],
    route: "/legal/reports/judicial/time-to-enforcement",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "planned" },

  { code: "JUD_COURT_SUCCESS", name: "Court-wise Success Rate", category: "judicial",
    purpose: "Success rate by court",
    dataSource: ["lg_case", "lg_order", "lg_court"], columns: [], filters: ["dateRange", "court"],
    route: "/legal/reports/judicial/court-success",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "planned" },

  // ============================================================
  // RECOVERY
  // ============================================================
  { code: "REC_ASSIGNMENT_REGISTER", name: "Recovery Assignment Register", category: "recovery",
    purpose: "All legal recovery assignments", dataSource: ["lg_recovery_assignment"],
    columns: [], filters: ["officer", "stage"],
    route: "/legal/reports/recovery/assignments",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "live" }, // migrated

  { code: "REC_BY_OFFICER", name: "Recovery by Officer", category: "recovery",
    purpose: "Recovery amount by officer", dataSource: ["lg_recovery_assignment", "v_lg_case_financials"],
    columns: [], filters: ["dateRange", "officer"],
    route: "/legal/reports/recovery/by-officer",
    exportAllowed: true, viewCapability: "viewLegalReports", financialReconciled: true, status: "planned" },

  { code: "REC_BY_FUND", name: "Recovery by Fund", category: "recovery",
    purpose: "Recovery by fund", dataSource: ["lg_recoverable_liability"],
    columns: [], filters: ["fund", "dateRange"],
    route: "/legal/reports/recovery/by-fund",
    exportAllowed: true, viewCapability: "viewLegalReports", financialReconciled: true, status: "planned" },

  { code: "REC_BY_EMPLOYER", name: "Recovery by Employer", category: "recovery",
    purpose: "Recovery by employer", dataSource: ["lg_recovery_assignment", "v_lg_case_financials"],
    columns: [], filters: ["employer", "dateRange"],
    route: "/legal/reports/recovery/by-employer",
    exportAllowed: true, viewCapability: "viewLegalReports", financialReconciled: true, status: "planned" },

  { code: "REC_BY_STAGE", name: "Recovery by Stage", category: "recovery",
    purpose: "Recovery pipeline by stage", dataSource: ["lg_recovery_assignment"],
    columns: [], filters: ["stage"],
    route: "/legal/reports/recovery/by-stage",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "planned" },

  { code: "REC_AGING", name: "Recovery Aging", category: "recovery",
    purpose: "Recovery assignments by age", dataSource: ["lg_recovery_assignment"],
    columns: [], filters: ["stage"],
    route: "/legal/reports/recovery/aging",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "planned" },

  { code: "REC_CONSENT_BREACH", name: "Consent Breach Recovery", category: "recovery",
    purpose: "Recovery on breached consent orders", dataSource: ["lg_consent_order", "lg_consent_installment"],
    columns: [], filters: ["dateRange"],
    route: "/legal/reports/recovery/consent-breach",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "planned" },

  { code: "REC_ENFORCEMENT", name: "Enforcement Recovery", category: "recovery",
    purpose: "Recovery through enforcement",
    dataSource: ["lg_enforcement_action", "v_lg_case_financials"], columns: [], filters: ["dateRange"],
    route: "/legal/reports/recovery/enforcement",
    exportAllowed: true, viewCapability: "viewLegalReports", financialReconciled: true, status: "planned" },

  { code: "REC_SETTLEMENT", name: "Settlement Recovery", category: "recovery",
    purpose: "Recovery through settlements",
    dataSource: ["lg_settlement", "v_lg_case_financials"], columns: [], filters: ["dateRange"],
    route: "/legal/reports/recovery/settlement",
    exportAllowed: true, viewCapability: "viewLegalReports", financialReconciled: true, status: "planned" },

  { code: "REC_OUTSTANDING", name: "Outstanding Legal Recovery", category: "recovery",
    purpose: "Total legal recovery outstanding",
    dataSource: ["v_lg_case_financials", "lg_recovery_assignment"], columns: [], filters: ["officer", "employer"],
    route: "/legal/reports/recovery/outstanding",
    exportAllowed: true, viewCapability: "viewLegalReports", financialReconciled: true, status: "live" }, // migrated from LgRecoveryReport

  // ============================================================
  // WORKLOAD
  // ============================================================
  { code: "WL_OFFICER_WORKLOAD", name: "Officer Workload", category: "workload",
    purpose: "Matters, hearings and tasks per officer",
    dataSource: ["lg_case", "lg_hearing", "lg_case_task"], columns: [], filters: ["officer"],
    route: "/legal/reports/workload/officer",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "live" }, // migrated from LgCasesByOfficerReport

  { code: "WL_TEAM_WORKLOAD", name: "Team Workload", category: "workload",
    purpose: "Matters and tasks by team", dataSource: ["lg_team", "lg_team_member", "lg_case"],
    columns: [], filters: [],
    route: "/legal/reports/workload/team",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "planned" },

  { code: "WL_MATTERS_OFFICER", name: "Matters by Officer", category: "workload",
    purpose: "Case count by officer", dataSource: ["lg_case"], columns: [], filters: ["officer"],
    route: "/legal/reports/workload/matters-officer",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "planned" },

  { code: "WL_HEARINGS_OFFICER", name: "Hearings by Officer", category: "workload",
    purpose: "Hearing count by officer", dataSource: ["lg_hearing"], columns: [], filters: ["officer", "dateRange"],
    route: "/legal/reports/workload/hearings-officer",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "planned" },

  { code: "WL_TASKS_OFFICER", name: "Tasks by Officer", category: "workload",
    purpose: "Tasks per officer", dataSource: ["lg_case_task"], columns: [], filters: ["officer", "status"],
    route: "/legal/reports/workload/tasks-officer",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "planned" },

  { code: "WL_OVERDUE_WORK", name: "Overdue Work", category: "workload",
    purpose: "Overdue tasks, hearings and deadlines by officer",
    dataSource: ["lg_case_task", "lg_hearing", "lg_case_deadline"], columns: [], filters: ["officer"],
    route: "/legal/reports/workload/overdue",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "live" }, // migrated from LgSlaBreach + PendingAction

  { code: "WL_RECOVERY_PERFORMANCE", name: "Officer Recovery Performance", category: "workload",
    purpose: "Recovery amount collected by officer",
    dataSource: ["lg_recovery_assignment", "v_lg_case_financials"], columns: [], filters: ["officer", "dateRange"],
    route: "/legal/reports/workload/recovery-performance",
    exportAllowed: true, viewCapability: "viewLegalReports", financialReconciled: true, status: "planned" },

  { code: "WL_CLOSURE_PERFORMANCE", name: "Officer Closure Performance", category: "workload",
    purpose: "Cases closed per officer and avg time",
    dataSource: ["lg_case"], columns: [], filters: ["officer", "dateRange"],
    route: "/legal/reports/workload/closure-performance",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "live" }, // migrated from LgClosedCases

  // ============================================================
  // EXTERNAL COUNSEL
  // ============================================================
  { code: "EC_ENGAGEMENT_REGISTER", name: "Counsel Engagement Register", category: "external_counsel",
    purpose: "All external counsel engagements",
    dataSource: ["lg_external_counsel_engagement", "lg_external_counsel"],
    columns: [], filters: ["counsel", "dateRange"],
    route: "/legal/reports/external-counsel/engagements",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "live" },

  { code: "EC_MATTERS", name: "Counsel Matters", category: "external_counsel",
    purpose: "Matters handled by external counsel",
    dataSource: ["lg_external_counsel_engagement", "lg_case"],
    columns: [], filters: ["counsel"],
    route: "/legal/reports/external-counsel/matters",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "planned" },

  { code: "EC_FEES", name: "Counsel Fees", category: "external_counsel",
    purpose: "External counsel invoiced fees",
    dataSource: ["lg_external_counsel_invoice"],
    columns: [], filters: ["counsel", "dateRange"],
    route: "/legal/reports/external-counsel/fees",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "planned" },

  { code: "EC_OUTCOME", name: "Counsel Outcome", category: "external_counsel",
    purpose: "Outcome distribution per counsel",
    dataSource: ["lg_external_counsel_engagement", "lg_case", "lg_order"],
    columns: [], filters: ["counsel"],
    route: "/legal/reports/external-counsel/outcome",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "planned" },

  { code: "EC_AVG_DURATION", name: "Average Matter Duration by Counsel", category: "external_counsel",
    purpose: "Avg matter duration per counsel",
    dataSource: ["lg_external_counsel_engagement", "lg_case"],
    columns: [], filters: ["counsel"],
    route: "/legal/reports/external-counsel/avg-duration",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "planned" },

  { code: "EC_COST_VS_RECOVERY", name: "Counsel Cost vs Recovery", category: "external_counsel",
    purpose: "Cost of counsel vs recovery achieved",
    dataSource: ["lg_external_counsel_invoice", "v_lg_case_financials"],
    columns: [], filters: ["counsel", "dateRange"],
    route: "/legal/reports/external-counsel/cost-recovery",
    exportAllowed: true, viewCapability: "viewLegalReports", financialReconciled: true, status: "planned" },
  // ============================================================
  // PHASE 2 additions — Hearings, Orders, Referral Items, Legal Cost register
  // ============================================================
  { code: "OPS_HEARINGS_REGISTER", name: "Hearings Register", category: "operational",
    purpose: "All hearings with schedule, court and outcome",
    dataSource: ["lg_hearing"],
    columns: [
      { key: "scheduled_at", header: "Scheduled", type: "datetime" },
      { key: "hearing_type_code", header: "Type", type: "badge" },
      { key: "court_name", header: "Court", type: "text" },
      { key: "judge_name", header: "Judge", type: "text" },
      { key: "status", header: "Status", type: "badge" },
      { key: "outcome_code", header: "Outcome", type: "badge" },
    ],
    filters: ["dateRange", "court", "officer"],
    drilldownRoute: "/legal/lg/hearings/:id",
    route: "/legal/reports/operational/hearings-register",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "live" },

  { code: "OPS_ORDERS_REGISTER", name: "Judicial Orders Register", category: "operational",
    purpose: "All judicial orders issued, with compliance status",
    dataSource: ["lg_order"],
    columns: [
      { key: "order_no", header: "Order #", type: "text" },
      { key: "order_type_code", header: "Type", type: "badge" },
      { key: "issued_date", header: "Issued", type: "date" },
      { key: "issued_by_court", header: "Court", type: "text" },
      { key: "ordered_amount", header: "Amount", type: "currency", align: "right", aggregate: "sum" },
      { key: "status", header: "Status", type: "badge" },
      { key: "compliance_status", header: "Compliance", type: "badge" },
    ],
    filters: ["dateRange", "court", "status"],
    drilldownRoute: "/legal/lg/orders/:id",
    route: "/legal/reports/operational/orders-register",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "live" },

  { code: "CR_REFERRAL_ITEMS", name: "Referral Items", category: "compliance_referral",
    purpose: "Compliance referral line items with fund, period and amount",
    dataSource: ["core_legal_referral_item"],
    columns: [
      { key: "debtor_name", header: "Debtor", type: "text" },
      { key: "item_type", header: "Item Type", type: "badge" },
      { key: "fund_code", header: "Fund", type: "badge" },
      { key: "period_from", header: "Period From", type: "date" },
      { key: "period_to", header: "Period To", type: "date" },
      { key: "amount_referred", header: "Referred", type: "currency", align: "right", aggregate: "sum" },
      { key: "total_amount", header: "Total", type: "currency", align: "right", aggregate: "sum" },
      { key: "status", header: "Status", type: "badge" },
    ],
    filters: ["dateRange", "fund", "employer"],
    route: "/legal/reports/compliance-referral/items",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "live" },

  { code: "FIN_LEGAL_COST_REGISTER", name: "Legal Cost Register", category: "financial",
    purpose: "Legal costs incurred per matter with recovery status",
    dataSource: ["lg_legal_cost"],
    columns: [
      { key: "incurred_date", header: "Incurred", type: "date" },
      { key: "cost_type", header: "Type", type: "badge" },
      { key: "description", header: "Description", type: "text" },
      { key: "amount", header: "Amount", type: "currency", align: "right", aggregate: "sum" },
      { key: "recovered_amount", header: "Recovered", type: "currency", align: "right", aggregate: "sum" },
      { key: "is_court_awarded", header: "Court Awarded", type: "text" },
      { key: "status", header: "Status", type: "badge" },
    ],
    filters: ["dateRange", "status"],
    route: "/legal/reports/financial/legal-cost-register",
    exportAllowed: true, viewCapability: "viewLegalReports", status: "live" },
];


export function getReport(code: string): LegalReportDefinition | undefined {
  return LEGAL_REPORTS.find((r) => r.code === code);
}

export function getReportsByCategory(category: LegalReportCategory): LegalReportDefinition[] {
  return LEGAL_REPORTS.filter((r) => r.category === category);
}
