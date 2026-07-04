/**
 * EPIC-09A/09B — Legal Reporting Service
 *
 * Canonical reporting layer. Reads from live tables only. All financial
 * roll-ups delegate to `v_lg_case_financials` — reports never recompute
 * assessed/paid/outstanding independently.
 *
 * EPIC-09B additions:
 *  - Extended ExecutiveKpis (all Part 1 board KPIs)
 *  - Time-series helpers for Part 2 charts
 *  - Recipient groups + dashboard preferences CRUD (Parts 10, 11)
 */

import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// Types
// ============================================================================
export interface LgReportFilters {
  dateFrom?: string;
  dateTo?: string;
  territory?: string;
  employerId?: string;
  fundCode?: string;
  liabilityType?: string;
  contributionPeriod?: string;
  officerId?: string;
  matterType?: string;
  status?: string;
  stage?: string;
  priority?: string;
  courtId?: string;
  judgeId?: string;
  counselId?: string;
  campaignId?: string;
}

export type TimeGrain = "month" | "quarter" | "year";

export interface ExecutiveKpis {
  totalMatters: number;
  openMatters: number;
  closedMatters: number;
  newMattersThisMonth: number;
  closedMattersThisMonth: number;
  activeHearings: number;
  pendingOrders: number;
  pendingAppeals: number;
  activeEnforcement: number;
  activeConsentOrders: number;
  activeExternalCounsel: number;
  totalAssessed: number;
  totalPaid: number;
  totalOutstanding: number;
  recoveryPct: number;
  averageMatterAgeDays: number;
  averageResolutionDays: number;
  highValueMatters: number;
  overdueMatters: number;
  consentOrdersBreached: number;
  legalCostsIncurred: number;
  upcomingHearings: number;
  averageDaysToClosure: number;
  averageDaysToJudgment: number;
  averageDaysToRecovery: number;
  mattersByPriority: Record<string, number>;
  mattersByStage: Record<string, number>;
}

// ============================================================================
// Helpers
// ============================================================================
const sb = supabase as any;

const applyDateRange = (q: any, col: string, f: LgReportFilters) => {
  if (f.dateFrom) q = q.gte(col, f.dateFrom);
  if (f.dateTo)   q = q.lte(col, f.dateTo);
  return q;
};

const monthStart = () => {
  const d = new Date(); d.setDate(1); d.setHours(0,0,0,0);
  return d.toISOString();
};

const daysBetween = (a?: string | null, b?: string | null): number | null => {
  if (!a) return null;
  const end = b ? new Date(b).getTime() : Date.now();
  return Math.floor((end - new Date(a).getTime()) / 86_400_000);
};

/** Bucket an ISO timestamp into a canonical period label. */
export function bucketDate(iso: string | null | undefined, grain: TimeGrain): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  if (grain === "year") return `${y}`;
  if (grain === "quarter") return `${y}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
  return `${y}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// ============================================================================
// Financial primitives (single source of truth = v_lg_case_financials)
// ============================================================================
export async function fetchCaseFinancials(caseIds?: string[]) {
  let q = sb.from("v_lg_case_financials").select("*");
  if (caseIds?.length) q = q.in("lg_case_id", caseIds);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function sumCaseFinancials(caseIds?: string[]) {
  const rows = await fetchCaseFinancials(caseIds);
  return rows.reduce(
    (acc: any, r: any) => ({
      total_assessed:    acc.total_assessed    + Number(r.total_assessed    ?? 0),
      total_paid:        acc.total_paid        + Number(r.total_paid        ?? 0),
      total_outstanding: acc.total_outstanding + Number(r.total_outstanding ?? 0),
    }),
    { total_assessed: 0, total_paid: 0, total_outstanding: 0 },
  );
}

// ============================================================================
// Executive KPIs (Part 1)
// ============================================================================
export async function getExecutiveKpis(filters: LgReportFilters = {}): Promise<ExecutiveKpis> {
  const startOfMonth = monthStart();

  const [cases, financialsSum, appealsActive, enforcement, consentActive, consentBreached,
         legalCosts, counsel, hearingsUpcoming, hearingsActive, ordersPending] =
    await Promise.all([
      sb.from("lg_case").select("id, status_code, current_stage_code, priority, opened_date, closed_date, assigned_legal_officer_id, country_code"),
      sumCaseFinancials(),
      sb.from("lg_appeal").select("id, status").in("status", ["FILED","UNDER_REVIEW","HEARING_SCHEDULED","PENDING"] as any),
      sb.from("lg_enforcement_action").select("id, status").not("status", "in", '("CLOSED","COMPLETED","CANCELLED")'),
      sb.from("lg_consent_order").select("id, status").not("status", "in", '("COMPLETED","CANCELLED","CLOSED")'),
      sb.from("lg_consent_order").select("id, status").eq("status", "BREACHED"),
      sb.from("lg_legal_cost").select("amount"),
      sb.from("lg_external_counsel_engagement").select("id, status").eq("status", "ACTIVE"),
      sb.from("lg_hearing").select("id, scheduled_at").gte("scheduled_at", new Date().toISOString()).lte("scheduled_at", new Date(Date.now() + 30 * 86_400_000).toISOString()),
      sb.from("lg_hearing").select("id, status").in("status", ["SCHEDULED","IN_PROGRESS","ADJOURNED"] as any),
      sb.from("lg_order").select("id, compliance_status, status").or("compliance_status.eq.PENDING,status.eq.ISSUED"),
    ]);

  const caseRows = cases.data ?? [];
  const openMatters = caseRows.filter((c: any) => !["CLOSED","CANCELLED"].includes(c.status_code)).length;
  const closedMatters = caseRows.filter((c: any) => ["CLOSED","CANCELLED"].includes(c.status_code)).length;
  const newMattersThisMonth = caseRows.filter((c: any) => c.opened_date && c.opened_date >= startOfMonth).length;
  const closedMattersThisMonth = caseRows.filter((c: any) => c.closed_date && c.closed_date >= startOfMonth).length;

  const closureDurations = caseRows
    .filter((c: any) => c.opened_date && c.closed_date)
    .map((c: any) => daysBetween(c.opened_date, c.closed_date)!)
    .filter((n: number) => n >= 0);
  const avgClosure = closureDurations.length ? Math.round(closureDurations.reduce((a: number,b: number)=>a+b,0) / closureDurations.length) : 0;

  const openAges = caseRows
    .filter((c: any) => !["CLOSED","CANCELLED"].includes(c.status_code) && c.opened_date)
    .map((c: any) => daysBetween(c.opened_date, null)!)
    .filter((n: number) => n >= 0);
  const avgMatterAge = openAges.length ? Math.round(openAges.reduce((a: number, b: number) => a + b, 0) / openAges.length) : 0;

  const mattersByPriority: Record<string, number> = {};
  const mattersByStage: Record<string, number> = {};
  caseRows.forEach((c: any) => {
    if (c.priority) mattersByPriority[c.priority] = (mattersByPriority[c.priority] ?? 0) + 1;
    if (c.current_stage_code) mattersByStage[c.current_stage_code] = (mattersByStage[c.current_stage_code] ?? 0) + 1;
  });

  const legalCostsIncurred = (legalCosts.data ?? []).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
  const recoveryPct = financialsSum.total_assessed > 0
    ? Math.round((financialsSum.total_paid / financialsSum.total_assessed) * 1000) / 10
    : 0;

  return {
    totalMatters: caseRows.length,
    openMatters,
    closedMatters,
    newMattersThisMonth,
    closedMattersThisMonth,
    activeHearings: (hearingsActive.data ?? []).length,
    pendingOrders: (ordersPending.data ?? []).length,
    pendingAppeals: (appealsActive.data ?? []).length,
    activeEnforcement: (enforcement.data ?? []).length,
    activeConsentOrders: (consentActive.data ?? []).length,
    activeExternalCounsel: (counsel.data ?? []).length,
    totalAssessed:    financialsSum.total_assessed,
    totalPaid:        financialsSum.total_paid,
    totalOutstanding: financialsSum.total_outstanding,
    recoveryPct,
    averageMatterAgeDays: avgMatterAge,
    averageResolutionDays: avgClosure,
    highValueMatters: caseRows.filter((c: any) => c.priority === "HIGH" || c.priority === "CRITICAL").length,
    overdueMatters: 0,
    consentOrdersBreached: (consentBreached.data ?? []).length,
    legalCostsIncurred,
    upcomingHearings: (hearingsUpcoming.data ?? []).length,
    averageDaysToClosure: avgClosure,
    averageDaysToJudgment: 0,
    averageDaysToRecovery: 0,
    mattersByPriority,
    mattersByStage,
  };
}

// ============================================================================
// Chart time-series primitives (Part 2)
// ============================================================================
export interface TrendPoint { period: string; value: number; secondary?: number; }

async function bucketize(rows: any[], col: string, grain: TimeGrain, agg: (r: any) => number, secondary?: (r: any) => number): Promise<TrendPoint[]> {
  const map = new Map<string, { value: number; secondary: number }>();
  for (const r of rows) {
    const p = bucketDate(r[col], grain);
    if (!p) continue;
    const bucket = map.get(p) ?? { value: 0, secondary: 0 };
    bucket.value += agg(r);
    if (secondary) bucket.secondary += secondary(r);
    map.set(p, bucket);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, v]) => ({ period, value: Math.round(v.value * 100) / 100, secondary: Math.round(v.secondary * 100) / 100 }));
}

export async function trendMatterIntake(grain: TimeGrain = "month"): Promise<TrendPoint[]> {
  const { data } = await sb.from("lg_case").select("opened_date");
  return bucketize(data ?? [], "opened_date", grain, () => 1);
}
export async function trendMatterClosure(grain: TimeGrain = "month"): Promise<TrendPoint[]> {
  const { data } = await sb.from("lg_case").select("closed_date").not("closed_date", "is", null);
  return bucketize(data ?? [], "closed_date", grain, () => 1);
}
export async function trendRecoveryCollection(grain: TimeGrain = "month"): Promise<TrendPoint[]> {
  const { data } = await sb.from("lg_payment_allocation").select("allocated_at, amount");
  return bucketize(data ?? [], "allocated_at", grain, (r) => Number(r.amount ?? 0));
}
export async function trendOutstanding(grain: TimeGrain = "month"): Promise<TrendPoint[]> {
  // Snapshot: use assessment_date on liabilities
  const { data } = await sb.from("lg_recoverable_liability").select("assessment_date, total_assessed, paid, outstanding");
  return bucketize(data ?? [], "assessment_date", grain, (r) => Number(r.outstanding ?? 0), (r) => Number(r.total_assessed ?? 0));
}
export async function trendAppeals(grain: TimeGrain = "month"): Promise<TrendPoint[]> {
  const { data } = await sb.from("lg_appeal").select("filing_date, outcome");
  const total = await bucketize(data ?? [], "filing_date", grain, () => 1);
  const successful = await bucketize((data ?? []).filter((r: any) => r.outcome === "ALLOWED" || r.outcome === "SUCCESSFUL"), "filing_date", grain, () => 1);
  const successMap = new Map(successful.map((p) => [p.period, p.value]));
  return total.map((p) => ({ period: p.period, value: p.value, secondary: successMap.get(p.period) ?? 0 }));
}
export async function trendConsent(grain: TimeGrain = "month"): Promise<TrendPoint[]> {
  const { data } = await sb.from("lg_consent_order").select("start_date, total_amount, paid_amount");
  return bucketize(data ?? [], "start_date", grain, (r) => Number(r.paid_amount ?? 0), (r) => Number(r.total_amount ?? 0));
}
export async function trendEnforcement(grain: TimeGrain = "month"): Promise<TrendPoint[]> {
  const { data } = await sb.from("lg_enforcement_action").select("requested_date, amount_recovered, amount_targeted");
  return bucketize(data ?? [], "requested_date", grain, (r) => Number(r.amount_recovered ?? 0), (r) => Number(r.amount_targeted ?? 0));
}
export async function trendLegalCost(grain: TimeGrain = "month"): Promise<TrendPoint[]> {
  const { data } = await sb.from("lg_legal_cost").select("incurred_date, amount, recovered_amount");
  return bucketize(data ?? [], "incurred_date", grain, (r) => Number(r.amount ?? 0), (r) => Number(r.recovered_amount ?? 0));
}
export async function trendExternalCounselSpend(grain: TimeGrain = "month"): Promise<TrendPoint[]> {
  const { data } = await sb.from("lg_external_counsel_invoice").select("invoice_date, amount");
  return bucketize(data ?? [], "invoice_date", grain, (r) => Number(r.amount ?? 0));
}
export async function trendReferralConversion(grain: TimeGrain = "month"): Promise<TrendPoint[]> {
  const { data } = await sb.from("core_legal_referral").select("referred_at, id, status");
  const total = await bucketize(data ?? [], "referred_at", grain, () => 1);
  const accepted = await bucketize((data ?? []).filter((r: any) => r.status === "ACCEPTED"), "referred_at", grain, () => 1);
  const accMap = new Map(accepted.map((p) => [p.period, p.value]));
  return total.map((p) => ({ period: p.period, value: p.value, secondary: accMap.get(p.period) ?? 0 }));
}

// Distribution helpers
export async function distMatterAge(): Promise<Array<{ bucket: string; value: number }>> {
  const { data } = await sb.from("lg_case").select("opened_date, status_code");
  const buckets = { "0-30": 0, "31-60": 0, "61-90": 0, "91-180": 0, ">180": 0 };
  for (const c of data ?? []) {
    if (["CLOSED", "CANCELLED"].includes(c.status_code)) continue;
    const d = daysBetween(c.opened_date, null);
    if (d == null) continue;
    if (d <= 30) buckets["0-30"]++;
    else if (d <= 60) buckets["31-60"]++;
    else if (d <= 90) buckets["61-90"]++;
    else if (d <= 180) buckets["91-180"]++;
    else buckets[">180"]++;
  }
  return Object.entries(buckets).map(([bucket, value]) => ({ bucket, value }));
}

export async function distOfficerWorkload(): Promise<Array<{ officer: string; value: number }>> {
  const { data } = await sb.from("lg_case").select("assigned_legal_officer_id, status_code")
    .not("status_code", "in", '("CLOSED","CANCELLED")');
  const map = new Map<string, number>();
  for (const c of data ?? []) {
    const key = c.assigned_legal_officer_id ?? "Unassigned";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([officer, value]) => ({ officer, value })).sort((a, b) => b.value - a.value).slice(0, 15);
}

export async function distCourtWorkload(): Promise<Array<{ court: string; value: number }>> {
  const { data } = await sb.from("lg_hearing").select("court_code");
  const map = new Map<string, number>();
  for (const c of data ?? []) {
    const key = c.court_code ?? "Unknown";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([court, value]) => ({ court, value })).sort((a, b) => b.value - a.value).slice(0, 15);
}

// ============================================================================
// Saved reports (CRUD)
// ============================================================================
export interface SavedReport {
  id?: string;
  report_code: string;
  report_name: string;
  owner_user_id: string;
  visibility: "private" | "shared";
  filters_json?: any;
  columns_json?: any;
  grouping_json?: any;
  sort_json?: any;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export async function listSavedReports(userId: string): Promise<SavedReport[]> {
  const { data, error } = await sb.from("lg_saved_report").select("*")
    .or(`owner_user_id.eq.${userId},visibility.eq.shared`)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function upsertSavedReport(r: SavedReport): Promise<SavedReport> {
  const { data, error } = await sb.from("lg_saved_report")
    .upsert(r, { onConflict: "id" }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteSavedReport(id: string): Promise<void> {
  const { error } = await sb.from("lg_saved_report").delete().eq("id", id);
  if (error) throw error;
}

// ============================================================================
// Scheduled reports (CRUD) — EPIC-09B enhancements
// ============================================================================
export interface ScheduledReport {
  id?: string;
  report_code: string;
  schedule_name: string;
  frequency: "daily" | "weekly" | "monthly" | "quarterly";
  recipients: string[];
  recipient_group_ids?: string[];
  filters_json?: any;
  format: "xlsx" | "csv" | "pdf";
  subject_template?: string | null;
  attach_data?: boolean;
  is_active: boolean;
  next_run_at?: string | null;
  last_run_at?: string | null;
  last_run_status?: string | null;
  last_run_error?: string | null;
  attempt_count?: number;
  execution_history?: Array<{ at: string; status: string; recipients: number; error?: string }>;
  created_by: string;
}

export function computeNextRunAt(frequency: ScheduledReport["frequency"], from = new Date()): string {
  const d = new Date(from);
  switch (frequency) {
    case "daily":     d.setDate(d.getDate() + 1); break;
    case "weekly":    d.setDate(d.getDate() + 7); break;
    case "monthly":   d.setMonth(d.getMonth() + 1); break;
    case "quarterly": d.setMonth(d.getMonth() + 3); break;
  }
  d.setHours(6, 0, 0, 0);
  return d.toISOString();
}

export async function listScheduledReports(): Promise<ScheduledReport[]> {
  const { data, error } = await sb.from("lg_scheduled_report").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function upsertScheduledReport(r: ScheduledReport): Promise<ScheduledReport> {
  const record = { ...r, next_run_at: r.next_run_at ?? computeNextRunAt(r.frequency) };
  const { data, error } = await sb.from("lg_scheduled_report")
    .upsert(record, { onConflict: "id" }).select().single();
  if (error) throw error;
  return data;
}

export async function toggleScheduledReport(id: string, isActive: boolean) {
  const { error } = await sb.from("lg_scheduled_report").update({ is_active: isActive }).eq("id", id);
  if (error) throw error;
}

export async function retryScheduledReport(id: string) {
  const { error } = await sb.from("lg_scheduled_report").update({
    next_run_at: new Date().toISOString(),
    last_run_status: null,
    last_run_error: null,
  }).eq("id", id);
  if (error) throw error;
}

export async function deleteScheduledReport(id: string) {
  const { error } = await sb.from("lg_scheduled_report").delete().eq("id", id);
  if (error) throw error;
}

// ============================================================================
// Recipient groups
// ============================================================================
export interface RecipientGroup {
  id?: string;
  group_name: string;
  description?: string;
  emails: string[];
  created_by: string;
}
export async function listRecipientGroups(): Promise<RecipientGroup[]> {
  const { data, error } = await sb.from("lg_report_recipient_group").select("*").order("group_name");
  if (error) throw error;
  return data ?? [];
}
export async function upsertRecipientGroup(g: RecipientGroup): Promise<RecipientGroup> {
  const { data, error } = await sb.from("lg_report_recipient_group").upsert(g, { onConflict: "id" }).select().single();
  if (error) throw error;
  return data;
}
export async function deleteRecipientGroup(id: string) {
  const { error } = await sb.from("lg_report_recipient_group").delete().eq("id", id);
  if (error) throw error;
}

// ============================================================================
// Dashboard personalization
// ============================================================================
export interface DashboardPreference {
  id?: string;
  user_id: string;
  kpi_cards: string[];
  chart_layout: "grid" | "list" | "compact";
  default_report_code?: string | null;
  default_date_range: "today" | "last7d" | "last30d" | "last90d" | "thisMonth" | "thisQuarter" | "thisYear" | "custom";
  favourites: string[];
  pinned: string[];
}

export const DEFAULT_DASHBOARD_PREFERENCE: Omit<DashboardPreference, "user_id"> = {
  kpi_cards: ["total","open","closed","new","assessed","paid","outstanding","recovery","appeals","enforcement","consent","hearings"],
  chart_layout: "grid",
  default_report_code: null,
  default_date_range: "last30d",
  favourites: [],
  pinned: [],
};

export async function getDashboardPreference(userId: string): Promise<DashboardPreference> {
  const { data } = await sb.from("lg_dashboard_preference").select("*").eq("user_id", userId).maybeSingle();
  if (!data) return { ...DEFAULT_DASHBOARD_PREFERENCE, user_id: userId };
  return data;
}

export async function saveDashboardPreference(pref: DashboardPreference) {
  const { error } = await sb.from("lg_dashboard_preference").upsert(pref, { onConflict: "user_id" });
  if (error) throw error;
}

export async function resetDashboardPreference(userId: string) {
  await saveDashboardPreference({ ...DEFAULT_DASHBOARD_PREFERENCE, user_id: userId });
}

// ============================================================================
// Export audit
// ============================================================================
export interface ExportAuditEntry {
  report_code: string;
  report_name: string;
  exported_by: string;
  format: "xlsx" | "csv" | "pdf" | "print";
  filters_json?: any;
  row_count: number;
  file_name: string;
  delivery_channel?: "download" | "email" | "scheduled";
}

export async function writeExportAudit(entry: ExportAuditEntry) {
  const { error } = await sb.from("lg_report_export_audit").insert({
    ...entry,
    delivery_channel: entry.delivery_channel ?? "download",
  });
  if (error) console.error("export audit write failed", error);
}

export async function listExportAudit(limit = 200) {
  const { data, error } = await sb.from("lg_report_export_audit").select("*")
    .order("exported_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ============================================================================
// Master data lookups for pickers (Part 9)
// ============================================================================
export async function listOfficers() {
  const { data } = await sb.from("lg_staff").select("id, staff_code, first_name, last_name").order("first_name");
  return (data ?? []).map((r: any) => ({ id: r.id, label: `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || r.staff_code }));
}
export async function listCourts() {
  const { data } = await sb.from("lg_court").select("id, court_code, court_name").order("court_name");
  return (data ?? []).map((r: any) => ({ id: r.court_code ?? r.id, label: r.court_name ?? r.court_code }));
}
export async function listCounsel() {
  const { data } = await sb.from("lg_external_counsel").select("id, law_firm_name, primary_attorney").order("law_firm_name");
  return (data ?? []).map((r: any) => ({ id: r.id, label: r.law_firm_name || r.primary_attorney || "—" }));
}
export async function listMatterTypes() {
  const { data } = await sb.from("lg_matter_type").select("id, code, name").order("name");
  return (data ?? []).map((r: any) => ({ id: r.code ?? r.id, label: r.name ?? r.code }));
}
export async function listEmployers() {
  // legacy_primary_entity_name lives on lg_case; provide a distinct sample so filters have real options.
  const { data } = await sb.from("lg_case").select("primary_entity_id, legacy_primary_entity_name").limit(500);
  const map = new Map<string, string>();
  for (const r of data ?? []) {
    const id = r.primary_entity_id;
    if (!id) continue;
    if (!map.has(id)) map.set(id, r.legacy_primary_entity_name ?? id);
  }
  return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
}
export async function listFunds() {
  const { data } = await sb.from("lg_recoverable_liability").select("fund_type").limit(1000);
  const set = new Set<string>();
  for (const r of data ?? []) if (r.fund_type) set.add(r.fund_type);
  return Array.from(set).map((v) => ({ id: v, label: v }));
}
export async function listLiabilityTypes() {
  const { data } = await sb.from("lg_recoverable_liability").select("liability_type").limit(1000);
  const set = new Set<string>();
  for (const r of data ?? []) if (r.liability_type) set.add(r.liability_type);
  return Array.from(set).map((v) => ({ id: v, label: v }));
}
export async function listContributionPeriods() {
  const { data } = await sb.from("lg_recoverable_liability").select("assessment_period").limit(1000);
  const set = new Set<string>();
  for (const r of data ?? []) if (r.assessment_period) set.add(r.assessment_period);
  return Array.from(set).sort().reverse().map((v) => ({ id: v, label: v }));
}

// ============================================================================
// Generic dataset fetcher — used by ReportViewer for planned reports
// ============================================================================
export async function fetchOpenMattersLegacy(f: LgReportFilters = {}) {
  let q = sb.from("lg_case").select("*").not("status_code", "in", '("CLOSED","CANCELLED")');
  if (f.employerId) q = q.eq("primary_entity_id", f.employerId);
  if (f.officerId)  q = q.eq("assigned_legal_officer_id", f.officerId);
  if (f.stage)      q = q.eq("current_stage_code", f.stage);
  if (f.priority)   q = q.eq("priority", f.priority);
  if (f.territory)  q = q.eq("country_code", f.territory);
  q = applyDateRange(q, "opened_date", f);
  const { data, error } = await q.order("opened_date", { ascending: false }).limit(2000);
  if (error) throw error;
  return data ?? [];
}
