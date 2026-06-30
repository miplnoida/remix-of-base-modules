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

// ── Compliance Monitoring (paginated + filtered) ──

export interface ComplianceMonitoringFilters {
  employerId?: string;
  employerName?: string;
  complianceStatus?: string; // UI value: COMPLIANT | NON_COMPLIANT | UNDER_REVIEW | '' | 'all'
  riskLevel?: string;        // UI value: MINIMAL | LOW | MEDIUM | HIGH | CRITICAL | '' | 'all'
}

const STATUS_BUCKETS: Record<string, string[]> = {
  COMPLIANT: ['compliant'],
  NON_COMPLIANT: ['non_compliant', 'critical'],
  UNDER_REVIEW: ['under_review', 'partially_compliant'],
};

function applyMonitoringFilters(q: any, filters: ComplianceMonitoringFilters) {
  if (filters.employerId) q = q.ilike('employer_id', `%${filters.employerId}%`);
  if (filters.employerName) q = q.ilike('employer_name', `%${filters.employerName}%`);
  if (filters.complianceStatus && filters.complianceStatus !== 'all') {
    const bucket = STATUS_BUCKETS[filters.complianceStatus.toUpperCase()] ?? [filters.complianceStatus.toLowerCase()];
    q = q.in('overall_compliance_status', bucket);
  }
  if (filters.riskLevel && filters.riskLevel !== 'all') {
    q = q.eq('risk_band', filters.riskLevel.toUpperCase());
  }
  return q;
}

async function countWhere(build: (q: any) => any): Promise<number> {
  let q = supabase.from('ce_v_compliance_monitoring' as any).select('*', { count: 'exact', head: true });
  q = build(q);
  const { count, error } = await q;
  if (error) throw error;
  return count || 0;
}

export interface ComplianceMonitoringStats {
  compliant: number;
  nonCompliant: number;
  underReview: number;
  highRisk: number;
}

export async function fetchComplianceMonitoringStats(filters: ComplianceMonitoringFilters): Promise<ComplianceMonitoringStats> {
  // Tile counts ignore the complianceStatus filter so the tiles always show full breakdown for the other filters.
  const baseFilters: ComplianceMonitoringFilters = { ...filters, complianceStatus: undefined };
  const [compliant, nonCompliant, underReview, highRisk] = await Promise.all([
    countWhere(q => applyMonitoringFilters(q, baseFilters).in('overall_compliance_status', STATUS_BUCKETS.COMPLIANT)),
    countWhere(q => applyMonitoringFilters(q, baseFilters).in('overall_compliance_status', STATUS_BUCKETS.NON_COMPLIANT)),
    countWhere(q => applyMonitoringFilters(q, baseFilters).in('overall_compliance_status', STATUS_BUCKETS.UNDER_REVIEW)),
    countWhere(q => applyMonitoringFilters(q, baseFilters).in('risk_band', ['HIGH', 'CRITICAL'])),
  ]);
  return { compliant, nonCompliant, underReview, highRisk };
}

export interface ComplianceMonitoringPage {
  rows: ComplianceMonitoringRecord[];
  total: number;
}

export async function fetchComplianceMonitoringPage(
  filters: ComplianceMonitoringFilters,
  page: number,
  pageSize: number,
): Promise<ComplianceMonitoringPage> {
  const from = Math.max(0, (page - 1) * pageSize);
  const to = from + pageSize - 1;
  let q = supabase
    .from('ce_v_compliance_monitoring' as any)
    .select('*', { count: 'exact' })
    .order('employer_id', { ascending: true })
    .range(from, to);
  q = applyMonitoringFilters(q, filters);
  const { data, count, error } = await q;
  if (error) throw error;
  return { rows: (data || []) as unknown as ComplianceMonitoringRecord[], total: count || 0 };
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
