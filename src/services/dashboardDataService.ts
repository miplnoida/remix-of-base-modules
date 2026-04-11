import { supabase } from '@/integrations/supabase/client';

export interface AdminKPIs {
  total_employers: number;
  insured_persons: number;
  active_claims: number;
  compliance_issues: number;
}

export interface FinancialSummary {
  monthly_contributions: number;
  benefits_paid_mtd: number;
  net_surplus: number;
  outstanding_arrears: number;
}

export interface ContributionTrendPoint {
  month: string;
  month_key: string;
  contributions: number;
  benefits: number;
}

export interface ComplianceDistributionItem {
  name: string;
  value: number;
  color: string;
}

export interface PipelineItem {
  stage: string;
  count: number;
  fill: string;
}

export interface BenefitsDistributionItem {
  type: string;
  amount: number;
  claim_count: number;
}

export interface AlertItem {
  severity: string;
  title: string;
  detail: string;
  time_label: string;
}

export interface RecentActivityItem {
  activity_type: string;
  action: string;
  entity: string;
  occurred_at: string;
}

export interface ComplianceMetrics {
  total_employers: number;
  compliant_employers: number;
  active_violations: number;
  pending_audits: number;
}

export interface SectorComplianceItem {
  sector: string;
  total: number;
  compliant: number;
  rate: number;
}

async function fetchView<T>(viewName: string): Promise<T[]> {
  const { data, error } = await supabase.from(viewName as any).select('*');
  if (error) throw error;
  return (data ?? []) as T[];
}

async function fetchSingleRow<T>(viewName: string): Promise<T> {
  const rows = await fetchView<T>(viewName);
  if (rows.length === 0) throw new Error(`No data from ${viewName}`);
  return rows[0];
}

export const fetchAdminKPIs = () => fetchSingleRow<AdminKPIs>('dashboard_v_admin_kpis');
export const fetchFinancialSummary = () => fetchSingleRow<FinancialSummary>('dashboard_v_financial_summary');
export const fetchContributionTrend = () => fetchView<ContributionTrendPoint>('dashboard_v_contribution_trend');
export const fetchComplianceDistribution = () => fetchView<ComplianceDistributionItem>('dashboard_v_compliance_distribution');
export const fetchRegistrationPipeline = () => fetchView<PipelineItem>('dashboard_v_registration_pipeline');
export const fetchBenefitsDistribution = () => fetchView<BenefitsDistributionItem>('dashboard_v_benefits_distribution');
export const fetchActiveAlerts = () => fetchView<AlertItem>('dashboard_v_active_alerts');
export const fetchRecentActivity = () => fetchView<RecentActivityItem>('dashboard_v_recent_activity');
export const fetchComplianceMetrics = () => fetchSingleRow<ComplianceMetrics>('dashboard_v_compliance_metrics');
export const fetchSectorCompliance = () => fetchView<SectorComplianceItem>('dashboard_v_sector_compliance');

// Fetch violations for compliance dashboard
export async function fetchRecentViolations() {
  const { data, error } = await supabase
    .from('ce_violations')
    .select('id, violation_number, employer_name, employer_id, summary, severity, status, total_amount, created_at, due_date, assigned_to_name')
    .in('status', ['OPEN', 'ACTIVE', 'UNDER_REVIEW', 'ESCALATED'])
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;
  return data ?? [];
}

// Fetch upcoming inspections
export async function fetchUpcomingInspections() {
  const { data, error } = await supabase
    .from('ce_inspections')
    .select('id, inspection_number, employer_name, employer_id, inspection_type, status, inspector_name, scheduled_date')
    .in('status', ['SCHEDULED', 'PENDING'])
    .order('scheduled_date', { ascending: true })
    .limit(10);
  if (error) throw error;
  return data ?? [];
}

// Fetch recent claims for benefits dashboard
export async function fetchRecentClaims() {
  const { data, error } = await supabase
    .from('cl_head')
    .select('claim_number, claim_type_code, status, benefit_amount, date_received, date_approved, insured_ssn, payee_firstname, payee_surname')
    .order('date_entered', { ascending: false })
    .limit(10);
  if (error) throw error;
  return data ?? [];
}
