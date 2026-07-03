/**
 * EPIC-09A — Legal Reporting Service
 *
 * Canonical reporting layer. Reads from live tables only. All financial
 * roll-ups delegate to `v_lg_case_financials` — reports never recompute
 * assessed/paid/outstanding independently.
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

export interface ExecutiveKpis {
  openMatters: number;
  newMattersThisMonth: number;
  closedMattersThisMonth: number;
  totalAssessed: number;
  totalPaid: number;
  totalOutstanding: number;
  recoveryPct: number;
  highValueMatters: number;
  overdueMatters: number;
  activeAppeals: number;
  activeEnforcement: number;
  consentOrdersBreached: number;
  legalCostsIncurred: number;
  externalCounselActive: number;
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

// ============================================================================
// Financial primitives (single source of truth = v_lg_case_financials)
// ============================================================================
export async function fetchCaseFinancials(caseIds?: string[]) {
  let q = (supabase as any).from("v_lg_case_financials").select("*");
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
// Executive KPIs
// ============================================================================
export async function getExecutiveKpis(filters: LgReportFilters = {}): Promise<ExecutiveKpis> {
  const startOfMonth = monthStart();

  const [cases, financialsSum, appeals, enforcement, consentBreached, legalCosts, counsel, hearings] =
    await Promise.all([
      (supabase as any).from("lg_case").select("id, status_code, current_stage_code, priority, opened_date, closed_date, assigned_legal_officer_id, country_code"),
      sumCaseFinancials(),
      (supabase as any).from("lg_appeal").select("id, status").in("status", ["FILED","UNDER_REVIEW","HEARING_SCHEDULED","PENDING"] as any),
      (supabase as any).from("lg_enforcement_action").select("id, status").not("status", "in", '("CLOSED","COMPLETED","CANCELLED")'),
      (supabase as any).from("lg_consent_order").select("id, status").eq("status", "BREACHED"),
      (supabase as any).from("lg_legal_cost").select("amount"),
      (supabase as any).from("lg_external_counsel_engagement").select("id, status").eq("status", "ACTIVE"),
      (supabase as any).from("lg_hearing").select("id, scheduled_date").gte("scheduled_date", new Date().toISOString()).lte("scheduled_date", new Date(Date.now() + 30 * 86_400_000).toISOString()),
    ]);

  const caseRows = cases.data ?? [];
  const openMatters = caseRows.filter((c: any) => !["CLOSED","CANCELLED"].includes(c.status_code)).length;
  const newMattersThisMonth = caseRows.filter((c: any) => c.opened_date && c.opened_date >= startOfMonth).length;
  const closedMattersThisMonth = caseRows.filter((c: any) => c.closed_date && c.closed_date >= startOfMonth).length;

  const closureDurations = caseRows
    .filter((c: any) => c.opened_date && c.closed_date)
    .map((c: any) => daysBetween(c.opened_date, c.closed_date)!)
    .filter((n: number) => n >= 0);
  const avgClosure = closureDurations.length ? Math.round(closureDurations.reduce((a: number,b: number)=>a+b,0) / closureDurations.length) : 0;

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
    openMatters,
    newMattersThisMonth,
    closedMattersThisMonth,
    totalAssessed:    financialsSum.total_assessed,
    totalPaid:        financialsSum.total_paid,
    totalOutstanding: financialsSum.total_outstanding,
    recoveryPct,
    highValueMatters: caseRows.filter((c: any) => c.priority === "HIGH" || c.priority === "CRITICAL").length,
    overdueMatters: 0, // computed in phase 2 via lg_case_deadline join
    activeAppeals:      (appeals.data ?? []).length,
    activeEnforcement:  (enforcement.data ?? []).length,
    consentOrdersBreached: (consentBreached.data ?? []).length,
    legalCostsIncurred,
    externalCounselActive: (counsel.data ?? []).length,
    upcomingHearings: (hearings.data ?? []).length,
    averageDaysToClosure: avgClosure,
    averageDaysToJudgment: 0, // phase 2
    averageDaysToRecovery: 0, // phase 2
    mattersByPriority,
    mattersByStage,
  };
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
  const { data, error } = await (supabase as any)
    .from("lg_saved_report").select("*")
    .or(`owner_user_id.eq.${userId},visibility.eq.shared`)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function upsertSavedReport(r: SavedReport): Promise<SavedReport> {
  const { data, error } = await (supabase as any)
    .from("lg_saved_report")
    .upsert(r, { onConflict: "id" })
    .select().single();
  if (error) throw error;
  return data;
}

export async function deleteSavedReport(id: string): Promise<void> {
  const { error } = await (supabase as any).from("lg_saved_report").delete().eq("id", id);
  if (error) throw error;
}

// ============================================================================
// Scheduled reports (CRUD)
// ============================================================================
export interface ScheduledReport {
  id?: string;
  report_code: string;
  schedule_name: string;
  frequency: "daily" | "weekly" | "monthly" | "quarterly";
  recipients: string[];
  filters_json?: any;
  format: "xlsx" | "csv" | "pdf";
  is_active: boolean;
  next_run_at?: string | null;
  last_run_at?: string | null;
  last_run_status?: string | null;
  last_run_error?: string | null;
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
  d.setHours(6, 0, 0, 0); // deliver at 06:00 UTC
  return d.toISOString();
}

export async function listScheduledReports(): Promise<ScheduledReport[]> {
  const { data, error } = await (supabase as any)
    .from("lg_scheduled_report").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function upsertScheduledReport(r: ScheduledReport): Promise<ScheduledReport> {
  const record = { ...r, next_run_at: r.next_run_at ?? computeNextRunAt(r.frequency) };
  const { data, error } = await (supabase as any)
    .from("lg_scheduled_report")
    .upsert(record, { onConflict: "id" })
    .select().single();
  if (error) throw error;
  return data;
}

export async function toggleScheduledReport(id: string, isActive: boolean) {
  const { error } = await (supabase as any)
    .from("lg_scheduled_report").update({ is_active: isActive }).eq("id", id);
  if (error) throw error;
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
  const { error } = await (supabase as any).from("lg_report_export_audit").insert({
    ...entry,
    delivery_channel: entry.delivery_channel ?? "download",
  });
  if (error) console.error("export audit write failed", error);
}

export async function listExportAudit(limit = 200) {
  const { data, error } = await (supabase as any)
    .from("lg_report_export_audit").select("*")
    .order("exported_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ============================================================================
// Generic dataset fetcher — used by ReportViewer for planned reports
// ============================================================================
export async function fetchOpenMatters(f: LgReportFilters = {}) {
  let q = (supabase as any).from("lg_case").select("*")
    .not("status_code", "in", '("CLOSED","CANCELLED")');
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
