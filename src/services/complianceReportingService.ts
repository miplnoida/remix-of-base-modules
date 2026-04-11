import { supabase } from "@/integrations/supabase/client";

// ── Compliance Monitoring ──

export interface ComplianceMonitoringRecord {
  id: string;
  employer_id: string;
  employer_name: string | null;
  employer_regno: string | null;
  overall_compliance_status: string | null;
  filing_status: string | null;
  payment_status: string | null;
  current_arrears_amount: number | null;
  current_penalty_amount: number | null;
  active_violation_count: number | null;
  active_case_count: number | null;
  active_arrangement_count: number | null;
  last_filing_period: string | null;
  last_payment_date: string | null;
  last_computed_at: string | null;
  review_due_date: string | null;
  risk_band: string;
  risk_score: number;
}

export async function fetchComplianceMonitoring(): Promise<ComplianceMonitoringRecord[]> {
  const { data, error } = await supabase
    .from("ce_v_compliance_monitoring" as any)
    .select("*");
  if (error) throw error;
  return (data || []) as unknown as ComplianceMonitoringRecord[];
}

// ── C3 Compliance ──

export interface C3ComplianceSummary {
  employer_id: string;
  employer_name: string | null;
  zone: string | null;
  on_time: number;
  late: number;
  missing: number;
  compliance_rate: number;
}

export interface C3AggregateStats {
  total_on_time: number;
  total_late: number;
  total_missing: number;
  total_submissions: number;
}

export async function fetchC3ComplianceSummary(): Promise<C3ComplianceSummary[]> {
  const { data, error } = await supabase
    .from("ce_v_c3_compliance_summary" as any)
    .select("*");
  if (error) throw error;
  return (data || []) as unknown as C3ComplianceSummary[];
}

export async function fetchC3AggregateStats(): Promise<C3AggregateStats> {
  const { data, error } = await supabase
    .from("ce_v_c3_aggregate_stats" as any)
    .select("*")
    .single();
  if (error) throw error;
  return (data || { total_on_time: 0, total_late: 0, total_missing: 0, total_submissions: 0 }) as unknown as C3AggregateStats;
}

// ── Case Analytics ──

export interface CaseMonthlyTrend {
  month_key: string;
  month_label: string;
  created: number;
  closed: number;
}

export interface CaseResolutionStat {
  case_type: string;
  avg_days: number;
  case_count: number;
}

export async function fetchCaseMonthlyTrend(): Promise<CaseMonthlyTrend[]> {
  const { data, error } = await supabase
    .from("ce_v_case_monthly_trend" as any)
    .select("*")
    .order("month_key" as any);
  if (error) throw error;
  return (data || []) as unknown as CaseMonthlyTrend[];
}

export async function fetchCaseResolutionStats(): Promise<CaseResolutionStat[]> {
  const { data, error } = await supabase
    .from("ce_v_case_resolution_stats" as any)
    .select("*");
  if (error) throw error;
  return (data || []) as unknown as CaseResolutionStat[];
}

// ── Inspections ──

export interface InspectionRecord {
  id: string;
  inspection_number: string;
  employer_id: string;
  employer_name: string;
  territory: string;
  inspection_type: string;
  status: string;
  inspector_id: string;
  inspector_name: string;
  scheduled_date: string;
  location_address: string | null;
  findings_summary: string | null;
  created_at: string;
}

export async function fetchInspections(statusFilter?: string): Promise<InspectionRecord[]> {
  let query = supabase
    .from("ce_inspections")
    .select("id, inspection_number, employer_id, employer_name, territory, inspection_type, status, inspector_id, inspector_name, scheduled_date, location_address, findings_summary, created_at")
    .order("scheduled_date", { ascending: false });

  if (statusFilter && statusFilter !== "All") {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as InspectionRecord[];
}

export async function fetchInspectionFindingsCount(inspectionId: string): Promise<number> {
  const { count, error } = await supabase
    .from("ce_inspection_findings")
    .select("*", { count: "exact", head: true })
    .eq("inspection_id", inspectionId);
  if (error) throw error;
  return count || 0;
}

// ── Zone C3 aggregate for charts ──

export async function fetchC3ByZone(): Promise<Array<{ zone: string; on_time: number; late: number; missing: number }>> {
  const data = await fetchC3ComplianceSummary();
  const zoneMap = new Map<string, { on_time: number; late: number; missing: number }>();
  data.forEach(row => {
    const z = row.zone || 'Unknown';
    const existing = zoneMap.get(z) || { on_time: 0, late: 0, missing: 0 };
    existing.on_time += Number(row.on_time);
    existing.late += Number(row.late);
    existing.missing += Number(row.missing);
    zoneMap.set(z, existing);
  });
  return Array.from(zoneMap.entries()).map(([zone, vals]) => ({ zone, ...vals }));
}
