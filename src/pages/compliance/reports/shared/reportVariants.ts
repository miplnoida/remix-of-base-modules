import { supabase } from '@/integrations/supabase/client';
import { loadLiveArrears } from '@/hooks/compliance/useLiveArrears';

/**
 * Compliance Reports — Variant Registry
 *
 * Each variant key identifies a unique drill-down report. The shared
 * VariantReport component looks up its config here and renders title,
 * filters, KPIs, table and export accordingly. Data is loaded from real
 * Supabase tables / views — no mock data.
 */

export type FilterKind =
  | 'date-range'
  | 'zone'
  | 'status'
  | 'severity'
  | 'fund'
  | 'officer';

export interface VariantColumn {
  key: string;
  header: string;
  numeric?: boolean;
  width?: number;
  format?: (v: any, row: any) => string;
}

export interface VariantKpi {
  label: string;
  compute: (rows: any[]) => string | number;
}

export interface ReportVariantConfig {
  group: string;                       // breadcrumb segment label
  groupHref: string;                   // breadcrumb href for group dashboard
  title: string;
  subtitle: string;
  filters: FilterKind[];
  emptyMessage: string;
  loadRows: () => Promise<any[]>;
  filterRow?: (row: any, applied: Record<string, string>) => boolean;
  kpis?: VariantKpi[];
  columns: VariantColumn[];
  exportFileName: string;
  exportSheet: string;
}

// ── helpers ────────────────────────────────────────────────────────
const num = (v: any) => (v == null ? 0 : Number(v) || 0);
const ec = (v: any) => `EC$ ${num(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const pct = (v: any) => `${num(v).toFixed(1)}%`;

const matchZone = (rowZone: any, applied: string) => {
  if (!applied || applied === 'all') return true;
  return String(rowZone || '').toLowerCase().includes(applied.toLowerCase());
};

const dateBetween = (iso: any, from?: string, to?: string) => {
  if (!iso) return !from && !to;
  if (from && iso < from) return false;
  if (to && iso > to) return false;
  return true;
};

// ── loaders (chunked to honor 1k Supabase default limit) ───────────
async function loadAll(table: string, order?: { column: string; ascending?: boolean }) {
  const out: any[] = [];
  const pageSize = 1000;
  for (let from = 0; from < 10000; from += pageSize) {
    let q = (supabase as any).from(table).select('*').range(from, from + pageSize - 1);
    if (order) q = q.order(order.column, { ascending: order.ascending ?? true });
    const { data, error } = await q;
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return out;
}

// ── registry ───────────────────────────────────────────────────────
export const REPORT_VARIANTS: Record<string, ReportVariantConfig> = {
  // ── Inspector Performance ───────────────────────────────────────
  inspector_perf_weekly_plan: {
    group: 'Inspector Performance',
    groupHref: '/compliance/reports/inspector-performance',
    title: 'Weekly Plan Compliance',
    subtitle: 'Inspector adherence to weekly visit plans',
    filters: ['date-range'],
    emptyMessage: 'No weekly plan compliance data found for the selected filters.',
    loadRows: () => loadAll('ce_v_weekly_report_summary'),
    filterRow: (r, a) => dateBetween(r.week_start || r.week_ending, a.from, a.to),
    kpis: [
      { label: 'Plans Submitted', compute: (r) => r.length },
      { label: 'Avg Plan Adherence', compute: (r) => r.length ? pct(r.reduce((s, x) => s + num(x.adherence_pct ?? x.completion_pct), 0) / r.length) : '0%' },
    ],
    columns: [
      { key: 'inspector_name', header: 'Inspector' },
      { key: 'week_label', header: 'Week' },
      { key: 'planned_visits', header: 'Planned', numeric: true },
      { key: 'completed_visits', header: 'Completed', numeric: true },
      { key: 'adherence_pct', header: 'Adherence %', numeric: true, format: pct },
    ],
    exportFileName: 'inspector_weekly_plan_compliance',
    exportSheet: 'Weekly Plan',
  },

  inspector_perf_field_activities: {
    group: 'Inspector Performance',
    groupHref: '/compliance/reports/inspector-performance',
    title: 'Field Activities Summary',
    subtitle: 'Visits, observations and outcomes by inspector',
    filters: ['date-range'],
    emptyMessage: 'No field activity records found for the selected filters.',
    loadRows: () => loadAll('ce_v_visit_execution_metrics'),
    filterRow: (r, a) => dateBetween(r.visit_date, a.from, a.to),
    kpis: [
      { label: 'Total Visits', compute: (r) => r.length },
      { label: 'Completed', compute: (r) => r.filter((x: any) => String(x.status).toLowerCase() === 'completed').length },
    ],
    columns: [
      { key: 'inspector_name', header: 'Inspector' },
      { key: 'visit_date', header: 'Date' },
      { key: 'employer_name', header: 'Employer' },
      { key: 'visit_type', header: 'Type' },
      { key: 'status', header: 'Status' },
      { key: 'duration_minutes', header: 'Duration (min)', numeric: true },
    ],
    exportFileName: 'inspector_field_activities',
    exportSheet: 'Field Activities',
  },

  inspector_perf_check_in_out: {
    group: 'Inspector Performance',
    groupHref: '/compliance/reports/inspector-performance',
    title: 'Check-In / Check-Out Audit',
    subtitle: 'GPS-verified visit start and end timestamps',
    filters: ['date-range'],
    emptyMessage: 'No check-in/check-out records found for the selected filters.',
    loadRows: () => loadAll('ce_v_visit_execution_metrics'),
    filterRow: (r, a) => dateBetween(r.visit_date, a.from, a.to),
    columns: [
      { key: 'inspector_name', header: 'Inspector' },
      { key: 'employer_name', header: 'Employer' },
      { key: 'check_in_at', header: 'Check-In' },
      { key: 'check_out_at', header: 'Check-Out' },
      { key: 'check_in_within_geofence', header: 'In Geofence', format: (v) => (v ? 'Yes' : 'No') },
      { key: 'duration_minutes', header: 'Duration (min)', numeric: true },
    ],
    exportFileName: 'inspector_check_in_out_audit',
    exportSheet: 'CheckIn-Out',
  },

  inspector_perf_violations_by_officer: {
    group: 'Inspector Performance',
    groupHref: '/compliance/reports/inspector-performance',
    title: 'Violations Handled by Inspector',
    subtitle: 'Assigned, resolved and overdue counts per officer',
    filters: [],
    emptyMessage: 'No officer-violation records available.',
    loadRows: () => loadAll('ce_v_officer_performance'),
    kpis: [
      { label: 'Officers', compute: (r) => r.length },
      { label: 'Total Active', compute: (r) => r.reduce((s, x) => s + num(x.active_count), 0) },
      { label: 'Total Resolved', compute: (r) => r.reduce((s, x) => s + num(x.resolved_count), 0) },
    ],
    columns: [
      { key: 'officer_name', header: 'Officer' },
      { key: 'total_assigned', header: 'Assigned', numeric: true },
      { key: 'active_count', header: 'Active', numeric: true },
      { key: 'resolved_count', header: 'Resolved', numeric: true },
      { key: 'overdue_count', header: 'Overdue', numeric: true },
      { key: 'avg_resolution_days', header: 'Avg Days', numeric: true, format: (v) => num(v).toFixed(1) },
      { key: 'overdue_pct', header: 'Overdue %', numeric: true, format: pct },
    ],
    exportFileName: 'violations_by_inspector',
    exportSheet: 'Inspectors',
  },

  // ── C3 Compliance ───────────────────────────────────────────────
  c3_on_time_vs_late: {
    group: 'C3 Compliance',
    groupHref: '/compliance/reports/c3-compliance',
    title: 'On-Time vs Late Submissions',
    subtitle: 'C3 submission timeliness per employer',
    filters: ['zone'],
    emptyMessage: 'No C3 submission records found.',
    loadRows: () => loadAll('ce_v_c3_compliance_summary'),
    filterRow: (r, a) => matchZone(r.zone, a.zone),
    kpis: [
      { label: 'On-Time', compute: (r) => r.reduce((s, x) => s + num(x.on_time), 0) },
      { label: 'Late', compute: (r) => r.reduce((s, x) => s + num(x.late), 0) },
      { label: 'On-Time Rate', compute: (r) => {
          const onTime = r.reduce((s, x) => s + num(x.on_time), 0);
          const late = r.reduce((s, x) => s + num(x.late), 0);
          const total = onTime + late;
          return total ? pct((onTime / total) * 100) : '0%';
        } },
    ],
    columns: [
      { key: 'employer_name', header: 'Employer' },
      { key: 'zone', header: 'Zone' },
      { key: 'on_time', header: 'On-Time', numeric: true },
      { key: 'late', header: 'Late', numeric: true },
      { key: 'compliance_rate', header: 'Rate %', numeric: true, format: pct },
    ],
    exportFileName: 'c3_on_time_vs_late',
    exportSheet: 'OnTime vs Late',
  },

  c3_missing: {
    group: 'C3 Compliance',
    groupHref: '/compliance/reports/c3-compliance',
    title: 'Missing C3 Submissions',
    subtitle: 'Employers with one or more missing C3 filings',
    filters: ['zone'],
    emptyMessage: 'No employers with missing C3 submissions for the selected filters.',
    loadRows: async () => {
      const rows = await loadAll('ce_v_c3_compliance_summary');
      return rows.filter((r: any) => num(r.missing) > 0);
    },
    filterRow: (r, a) => matchZone(r.zone, a.zone),
    kpis: [
      { label: 'Employers Missing', compute: (r) => r.length },
      { label: 'Total Missing Filings', compute: (r) => r.reduce((s, x) => s + num(x.missing), 0) },
    ],
    columns: [
      { key: 'employer_name', header: 'Employer' },
      { key: 'zone', header: 'Zone' },
      { key: 'missing', header: 'Missing', numeric: true },
      { key: 'compliance_rate', header: 'Rate %', numeric: true, format: pct },
    ],
    exportFileName: 'c3_missing_submissions',
    exportSheet: 'Missing C3',
  },

  c3_without_payment: {
    group: 'C3 Compliance',
    groupHref: '/compliance/reports/c3-compliance',
    title: 'C3 Without Payment',
    subtitle: 'C3 submissions not yet reconciled to a payment',
    filters: [],
    emptyMessage: 'No unpaid C3 submissions found.',
    loadRows: () => loadAll('ce_v_c3_unposted_to_ledger'),
    kpis: [
      { label: 'Unposted Items', compute: (r) => r.length },
      { label: 'Total Amount', compute: (r) => ec(r.reduce((s, x) => s + num(x.amount), 0)) },
    ],
    columns: [
      { key: 'employer_name', header: 'Employer' },
      { key: 'period', header: 'Period' },
      { key: 'amount', header: 'Amount', numeric: true, format: ec },
      { key: 'days_outstanding', header: 'Days Outstanding', numeric: true },
    ],
    exportFileName: 'c3_without_payment',
    exportSheet: 'Unpaid C3',
  },

  c3_rate_by_zone: {
    group: 'C3 Compliance',
    groupHref: '/compliance/reports/c3-compliance',
    title: 'Compliance Rate by Zone',
    subtitle: 'Aggregated C3 compliance rate per zone',
    filters: [],
    emptyMessage: 'No zone-level compliance data found.',
    loadRows: async () => {
      const rows = await loadAll('ce_v_c3_compliance_summary');
      const byZone = new Map<string, { zone: string; on_time: number; late: number; missing: number }>();
      rows.forEach((r: any) => {
        const z = r.zone || 'Unknown';
        const cur = byZone.get(z) || { zone: z, on_time: 0, late: 0, missing: 0 };
        cur.on_time += num(r.on_time);
        cur.late += num(r.late);
        cur.missing += num(r.missing);
        byZone.set(z, cur);
      });
      return Array.from(byZone.values()).map((r) => ({
        ...r,
        compliance_rate: r.on_time + r.late + r.missing
          ? (r.on_time / (r.on_time + r.late + r.missing)) * 100
          : 0,
      }));
    },
    columns: [
      { key: 'zone', header: 'Zone' },
      { key: 'on_time', header: 'On-Time', numeric: true },
      { key: 'late', header: 'Late', numeric: true },
      { key: 'missing', header: 'Missing', numeric: true },
      { key: 'compliance_rate', header: 'Rate %', numeric: true, format: pct },
    ],
    exportFileName: 'c3_rate_by_zone',
    exportSheet: 'Rate by Zone',
  },

  // ── Arrears & Collections ───────────────────────────────────────
  arrears_by_zone: {
    group: 'Arrears & Collections',
    groupHref: '/compliance/reports/arrears',
    title: 'Total Arrears by Zone',
    subtitle: 'Outstanding arrears aggregated per zone',
    filters: [],
    emptyMessage: 'No arrears recorded.',
    loadRows: async () => {
      const rows = await loadAll('ce_arrears_report_entries', { column: 'total_arrears', ascending: false });
      const byZone = new Map<string, any>();
      rows.forEach((r: any) => {
        const z = r.zone || 'Unknown';
        const cur = byZone.get(z) || { zone: z, employer_count: 0, total_arrears: 0 };
        cur.employer_count += 1;
        cur.total_arrears += num(r.total_arrears);
        byZone.set(z, cur);
      });
      return Array.from(byZone.values());
    },
    kpis: [
      { label: 'Zones', compute: (r) => r.length },
      { label: 'Total Arrears', compute: (r) => ec(r.reduce((s, x) => s + num(x.total_arrears), 0)) },
    ],
    columns: [
      { key: 'zone', header: 'Zone' },
      { key: 'employer_count', header: 'Employers', numeric: true },
      { key: 'total_arrears', header: 'Total Arrears', numeric: true, format: ec },
    ],
    exportFileName: 'arrears_by_zone',
    exportSheet: 'By Zone',
  },

  arrears_aging: {
    group: 'Arrears & Collections',
    groupHref: '/compliance/reports/arrears',
    title: 'Arrears Aging Analysis',
    subtitle: 'Outstanding balances bucketed by age',
    filters: [],
    emptyMessage: 'No arrears aging data available.',
    loadRows: async () => {
      const rows = await loadAll('ce_arrears_report_entries');
      const buckets = new Map<string, any>();
      rows.forEach((r: any) => {
        const b = r.aging_category || 'Unspecified';
        const cur = buckets.get(b) || { aging_category: b, employer_count: 0, total_arrears: 0 };
        cur.employer_count += 1;
        cur.total_arrears += num(r.total_arrears);
        buckets.set(b, cur);
      });
      return Array.from(buckets.values());
    },
    columns: [
      { key: 'aging_category', header: 'Aging Bucket' },
      { key: 'employer_count', header: 'Employers', numeric: true },
      { key: 'total_arrears', header: 'Total Arrears', numeric: true, format: ec },
    ],
    exportFileName: 'arrears_aging_analysis',
    exportSheet: 'Aging',
  },

  arrears_collections_over_time: {
    group: 'Arrears & Collections',
    groupHref: '/compliance/reports/arrears',
    title: 'Collections Over Time',
    subtitle: 'Monthly trend of arrears and recovery (proxy: violation trends)',
    filters: [],
    emptyMessage: 'No monthly collection trend data found.',
    loadRows: () => loadAll('ce_v_violation_trends', { column: 'month_key' }),
    columns: [
      { key: 'month_label', header: 'Month' },
      { key: 'created_count', header: 'New Violations', numeric: true },
      { key: 'resolved_count', header: 'Resolved', numeric: true },
      { key: 'escalated_count', header: 'Escalated', numeric: true },
    ],
    exportFileName: 'collections_over_time',
    exportSheet: 'Over Time',
  },

  arrears_top_50: {
    group: 'Arrears & Collections',
    groupHref: '/compliance/reports/arrears',
    title: 'Top 50 Arrears Employers',
    subtitle: 'Largest outstanding balances ranked',
    filters: [],
    emptyMessage: 'No arrears recorded.',
    loadRows: async () => {
      const rows = await loadAll('ce_arrears_report_entries', { column: 'total_arrears', ascending: false });
      return rows.slice(0, 50);
    },
    kpis: [
      { label: 'Top 50 Total', compute: (r) => ec(r.reduce((s, x) => s + num(x.total_arrears), 0)) },
    ],
    columns: [
      { key: 'employer_name', header: 'Employer' },
      { key: 'zone', header: 'Zone' },
      { key: 'total_arrears', header: 'Arrears', numeric: true, format: ec },
      { key: 'aging_category', header: 'Aging' },
      { key: 'last_payment_date', header: 'Last Payment' },
    ],
    exportFileName: 'top_50_arrears',
    exportSheet: 'Top 50',
  },

  // ── Audit & Inspection ──────────────────────────────────────────
  audit_completion_rate: {
    group: 'Audit & Inspection',
    groupHref: '/compliance/reports/audit',
    title: 'Audit Completion Rate',
    subtitle: 'Audit status distribution',
    filters: [],
    emptyMessage: 'No audit records found.',
    loadRows: async () => {
      const rows = await loadAll('ce_audit_report_entries');
      const m = new Map<string, any>();
      rows.forEach((r: any) => {
        const s = r.status || 'Unknown';
        const cur = m.get(s) || { status: s, count: 0 };
        cur.count += 1;
        m.set(s, cur);
      });
      const total = rows.length || 1;
      return Array.from(m.values()).map((x) => ({ ...x, share: (x.count / total) * 100 }));
    },
    columns: [
      { key: 'status', header: 'Status' },
      { key: 'count', header: 'Audits', numeric: true },
      { key: 'share', header: 'Share %', numeric: true, format: pct },
    ],
    exportFileName: 'audit_completion_rate',
    exportSheet: 'Completion',
  },

  audit_findings_by_severity: {
    group: 'Audit & Inspection',
    groupHref: '/compliance/reports/audit',
    title: 'Findings by Severity',
    subtitle: 'Distribution of audit findings by severity',
    filters: [],
    emptyMessage: 'No audit findings recorded.',
    loadRows: async () => {
      const rows = await loadAll('ce_audit_report_entries');
      const m = new Map<string, any>();
      rows.forEach((r: any) => {
        const s = r.severity || 'None';
        const cur = m.get(s) || { severity: s, audits: 0, findings: 0 };
        cur.audits += 1;
        cur.findings += num(r.findings_count);
        m.set(s, cur);
      });
      return Array.from(m.values());
    },
    columns: [
      { key: 'severity', header: 'Severity' },
      { key: 'audits', header: 'Audits', numeric: true },
      { key: 'findings', header: 'Findings', numeric: true },
    ],
    exportFileName: 'audit_findings_by_severity',
    exportSheet: 'Findings',
  },

  audit_coverage_by_zone: {
    group: 'Audit & Inspection',
    groupHref: '/compliance/reports/audit',
    title: 'Inspection Coverage by Zone',
    subtitle: 'Audits performed per zone',
    filters: [],
    emptyMessage: 'No zone audit coverage data found.',
    loadRows: async () => {
      const rows = await loadAll('ce_audit_report_entries');
      const m = new Map<string, any>();
      rows.forEach((r: any) => {
        const z = r.zone || 'Unknown';
        const cur = m.get(z) || { zone: z, audits: 0, findings: 0 };
        cur.audits += 1;
        cur.findings += num(r.findings_count);
        m.set(z, cur);
      });
      return Array.from(m.values());
    },
    columns: [
      { key: 'zone', header: 'Zone' },
      { key: 'audits', header: 'Audits', numeric: true },
      { key: 'findings', header: 'Findings', numeric: true },
    ],
    exportFileName: 'audit_coverage_by_zone',
    exportSheet: 'Coverage',
  },

  audit_risk_based: {
    group: 'Audit & Inspection',
    groupHref: '/compliance/reports/audit',
    title: 'Risk-Based Audit Results',
    subtitle: 'Audits flagged as High or Critical severity',
    filters: [],
    emptyMessage: 'No high-risk audit results found.',
    loadRows: async () => {
      const rows = await loadAll('ce_audit_report_entries', { column: 'audit_date', ascending: false });
      return rows.filter((r: any) => ['High', 'Critical'].includes(String(r.severity)));
    },
    columns: [
      { key: 'employer_name', header: 'Employer' },
      { key: 'zone', header: 'Zone' },
      { key: 'audit_date', header: 'Audit Date' },
      { key: 'severity', header: 'Severity' },
      { key: 'findings_count', header: 'Findings', numeric: true },
      { key: 'status', header: 'Status' },
    ],
    exportFileName: 'risk_based_audit_results',
    exportSheet: 'High Risk',
  },

  // ── Payment Arrangements ────────────────────────────────────────
  arrangements_active: {
    group: 'Payment Arrangements',
    groupHref: '/compliance/reports/arrangements',
    title: 'Active Arrangements',
    subtitle: 'Currently active payment arrangements',
    filters: [],
    emptyMessage: 'No active arrangements found.',
    loadRows: async () => {
      const rows = await loadAll('ce_v_arrangement_health');
      return rows.filter((r: any) => String(r.status).toLowerCase() === 'active');
    },
    kpis: [
      { label: 'Active', compute: (r) => r.length },
      { label: 'Total Debt', compute: (r) => ec(r.reduce((s, x) => s + num(x.total_debt), 0)) },
      { label: 'Total Paid', compute: (r) => ec(r.reduce((s, x) => s + num(x.total_paid), 0)) },
    ],
    columns: [
      { key: 'employer_name', header: 'Employer' },
      { key: 'total_debt', header: 'Debt', numeric: true, format: ec },
      { key: 'total_paid', header: 'Paid', numeric: true, format: ec },
      { key: 'installments_paid', header: 'Installments Paid', numeric: true },
      { key: 'next_due_date', header: 'Next Due' },
      { key: 'health_status', header: 'Health' },
    ],
    exportFileName: 'active_arrangements',
    exportSheet: 'Active',
  },

  arrangements_defaulted: {
    group: 'Payment Arrangements',
    groupHref: '/compliance/reports/arrangements',
    title: 'Defaulted Arrangements',
    subtitle: 'Arrangements in breach',
    filters: [],
    emptyMessage: 'No defaulted arrangements found.',
    loadRows: async () => {
      const rows = await loadAll('ce_v_arrangement_health');
      return rows.filter((r: any) => r.breach_detected === true);
    },
    kpis: [
      { label: 'Defaulted', compute: (r) => r.length },
      { label: 'Outstanding', compute: (r) => ec(r.reduce((s, x) => s + (num(x.total_debt) - num(x.total_paid)), 0)) },
    ],
    columns: [
      { key: 'employer_name', header: 'Employer' },
      { key: 'missed_payments', header: 'Missed', numeric: true },
      { key: 'unresolved_breach_count', header: 'Unresolved Breaches', numeric: true },
      { key: 'total_debt', header: 'Debt', numeric: true, format: ec },
      { key: 'total_paid', header: 'Paid', numeric: true, format: ec },
    ],
    exportFileName: 'defaulted_arrangements',
    exportSheet: 'Defaulted',
  },

  arrangements_success_rate: {
    group: 'Payment Arrangements',
    groupHref: '/compliance/reports/arrangements',
    title: 'Arrangement Success Rate',
    subtitle: 'Healthy vs breached arrangements',
    filters: [],
    emptyMessage: 'No arrangement health data found.',
    loadRows: async () => {
      const rows = await loadAll('ce_v_arrangement_health');
      const m = new Map<string, any>();
      rows.forEach((r: any) => {
        const s = r.health_status || 'Unknown';
        const cur = m.get(s) || { health_status: s, count: 0 };
        cur.count += 1;
        m.set(s, cur);
      });
      const total = rows.length || 1;
      return Array.from(m.values()).map((x) => ({ ...x, share: (x.count / total) * 100 }));
    },
    columns: [
      { key: 'health_status', header: 'Health Status' },
      { key: 'count', header: 'Arrangements', numeric: true },
      { key: 'share', header: 'Share %', numeric: true, format: pct },
    ],
    exportFileName: 'arrangement_success_rate',
    exportSheet: 'Success',
  },

  arrangements_installment_trends: {
    group: 'Payment Arrangements',
    groupHref: '/compliance/reports/arrangements',
    title: 'Installment Payment Trends',
    subtitle: 'Installment progress per arrangement',
    filters: [],
    emptyMessage: 'No installment trend data found.',
    loadRows: () => loadAll('ce_arrangement_report_entries', { column: 'next_due' }),
    columns: [
      { key: 'employer_name', header: 'Employer' },
      { key: 'zone', header: 'Zone' },
      { key: 'installment', header: 'Installment', numeric: true, format: ec },
      { key: 'payments_made', header: 'Paid', numeric: true },
      { key: 'total_payments', header: 'Of Total', numeric: true },
      { key: 'next_due', header: 'Next Due' },
      { key: 'status', header: 'Status' },
    ],
    exportFileName: 'installment_payment_trends',
    exportSheet: 'Installments',
  },

  // ── Legal Escalation ────────────────────────────────────────────
  legal_escalated: {
    group: 'Legal Escalation',
    groupHref: '/compliance/reports/legal',
    title: 'Violations Escalated to Legal',
    subtitle: 'Employers with active legal escalations',
    filters: [],
    emptyMessage: 'No legal escalations recorded.',
    loadRows: async () => {
      const rows = await loadAll('ce_v_employer_legal_status');
      return rows.filter((r: any) => num(r.active_escalation_count) > 0);
    },
    kpis: [
      { label: 'Employers in Legal', compute: (r) => r.length },
      { label: 'Active Escalations', compute: (r) => r.reduce((s, x) => s + num(x.active_escalation_count), 0) },
    ],
    columns: [
      { key: 'regno', header: 'Reg #' },
      { key: 'employer_name', header: 'Employer' },
      { key: 'active_escalation_count', header: 'Escalations', numeric: true },
      { key: 'active_suit_count', header: 'Active Suits', numeric: true },
      { key: 'latest_stage', header: 'Stage' },
    ],
    exportFileName: 'violations_escalated_to_legal',
    exportSheet: 'Escalated',
  },

  legal_stage_distribution: {
    group: 'Legal Escalation',
    groupHref: '/compliance/reports/legal',
    title: 'Legal Stage Distribution',
    subtitle: 'Counts of employers at each legal stage',
    filters: [],
    emptyMessage: 'No legal stage data found.',
    loadRows: async () => {
      const rows = await loadAll('ce_v_employer_legal_status');
      const m = new Map<string, any>();
      rows.forEach((r: any) => {
        const s = r.latest_stage || 'None';
        const cur = m.get(s) || { latest_stage: s, employers: 0 };
        cur.employers += 1;
        m.set(s, cur);
      });
      return Array.from(m.values());
    },
    columns: [
      { key: 'latest_stage', header: 'Stage' },
      { key: 'employers', header: 'Employers', numeric: true },
    ],
    exportFileName: 'legal_stage_distribution',
    exportSheet: 'Stages',
  },

  legal_court_status: {
    group: 'Legal Escalation',
    groupHref: '/compliance/reports/legal',
    title: 'Court Proceedings Status',
    subtitle: 'Employers with active court suits',
    filters: [],
    emptyMessage: 'No active court proceedings found.',
    loadRows: async () => {
      const rows = await loadAll('ce_v_employer_legal_status');
      return rows.filter((r: any) => num(r.active_suit_count) > 0);
    },
    columns: [
      { key: 'regno', header: 'Reg #' },
      { key: 'employer_name', header: 'Employer' },
      { key: 'active_suit_count', header: 'Active Suits', numeric: true },
      { key: 'latest_stage', header: 'Stage' },
    ],
    exportFileName: 'court_proceedings_status',
    exportSheet: 'Court',
  },

  legal_judgements: {
    group: 'Legal Escalation',
    groupHref: '/compliance/reports/legal',
    title: 'Judgements & Enforcement',
    subtitle: 'Employers at judgement / enforcement stage',
    filters: [],
    emptyMessage: 'No judgement or enforcement actions found.',
    loadRows: async () => {
      const rows = await loadAll('ce_v_employer_legal_status');
      return rows.filter((r: any) => {
        const stage = String(r.latest_stage || '').toLowerCase();
        return stage.includes('judg') || stage.includes('enforce');
      });
    },
    columns: [
      { key: 'regno', header: 'Reg #' },
      { key: 'employer_name', header: 'Employer' },
      { key: 'latest_stage', header: 'Stage' },
      { key: 'active_suit_count', header: 'Active Suits', numeric: true },
    ],
    exportFileName: 'judgements_enforcement',
    exportSheet: 'Judgements',
  },

  // ── Trend Analysis ──────────────────────────────────────────────
  trends_compliance_12m: {
    group: 'Trend Analysis',
    groupHref: '/compliance/reports/trends',
    title: 'Compliance Trends (12 Months)',
    subtitle: 'Monthly violation activity over the last year',
    filters: [],
    emptyMessage: 'No trend data found for the last 12 months.',
    loadRows: async () => {
      const rows = await loadAll('ce_v_violation_trends', { column: 'month_key' });
      return rows.slice(-12);
    },
    columns: [
      { key: 'month_label', header: 'Month' },
      { key: 'created_count', header: 'Created', numeric: true },
      { key: 'resolved_count', header: 'Resolved', numeric: true },
      { key: 'escalated_count', header: 'Escalated', numeric: true },
    ],
    exportFileName: 'compliance_trends_12m',
    exportSheet: '12 Months',
  },

  trends_violation_creation: {
    group: 'Trend Analysis',
    groupHref: '/compliance/reports/trends',
    title: 'Violation Creation Trends',
    subtitle: 'Volume of newly created violations per month',
    filters: [],
    emptyMessage: 'No violation creation data found.',
    loadRows: () => loadAll('ce_v_violation_trends', { column: 'month_key' }),
    columns: [
      { key: 'month_label', header: 'Month' },
      { key: 'created_count', header: 'Created', numeric: true },
    ],
    exportFileName: 'violation_creation_trends',
    exportSheet: 'Creation',
  },

  trends_resolution_rate: {
    group: 'Trend Analysis',
    groupHref: '/compliance/reports/trends',
    title: 'Resolution Rate Trends',
    subtitle: 'Resolved vs created per month',
    filters: [],
    emptyMessage: 'No resolution rate data found.',
    loadRows: async () => {
      const rows = await loadAll('ce_v_violation_trends', { column: 'month_key' });
      return rows.map((r: any) => ({
        ...r,
        resolution_rate: num(r.created_count) > 0
          ? (num(r.resolved_count) / num(r.created_count)) * 100
          : 0,
      }));
    },
    columns: [
      { key: 'month_label', header: 'Month' },
      { key: 'created_count', header: 'Created', numeric: true },
      { key: 'resolved_count', header: 'Resolved', numeric: true },
      { key: 'resolution_rate', header: 'Resolution %', numeric: true, format: pct },
    ],
    exportFileName: 'resolution_rate_trends',
    exportSheet: 'Resolution',
  },

  trends_financial_recovery: {
    group: 'Trend Analysis',
    groupHref: '/compliance/reports/trends',
    title: 'Financial Recovery Trends',
    subtitle: 'Arrears bucket distribution as a proxy for recovery pressure',
    filters: [],
    emptyMessage: 'No financial recovery data found.',
    loadRows: async () => {
      const rows = await loadAll('ce_arrears_report_entries');
      const m = new Map<string, any>();
      rows.forEach((r: any) => {
        const b = r.aging_category || 'Unspecified';
        const cur = m.get(b) || { aging_category: b, employer_count: 0, total_arrears: 0 };
        cur.employer_count += 1;
        cur.total_arrears += num(r.total_arrears);
        m.set(b, cur);
      });
      return Array.from(m.values());
    },
    columns: [
      { key: 'aging_category', header: 'Aging Bucket' },
      { key: 'employer_count', header: 'Employers', numeric: true },
      { key: 'total_arrears', header: 'Outstanding', numeric: true, format: ec },
    ],
    exportFileName: 'financial_recovery_trends',
    exportSheet: 'Recovery',
  },
};

export type ReportVariantKey = keyof typeof REPORT_VARIANTS;
