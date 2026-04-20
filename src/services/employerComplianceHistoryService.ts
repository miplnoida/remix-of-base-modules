/**
 * Aggregator: returns the full compliance posture for an employer.
 * Read-only. Bounded by `monthsBack` (default 24).
 * Used by Employer 360, Audit Visit Workspace, Audit Report renderer,
 * and the Comms "prior matter context" snippet.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  EmployerCompliancePosture,
  PostureArrangement,
  PostureCase,
  PostureDispute,
  PostureFollowUp,
  PostureInspection,
  PostureLedgerSnapshot,
  PostureLegal,
  PostureReport,
  PostureViolation,
} from '@/types/employerHistory';

interface FetchOptions {
  monthsBack?: number; // window for "past" items (default 24)
  includeClosed?: boolean; // include closed cases / completed arrangements (default true for history)
}

const DEFAULTS: Required<FetchOptions> = {
  monthsBack: 24,
  includeClosed: true,
};

function sinceISO(monthsBack: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsBack);
  return d.toISOString();
}

export async function fetchEmployerCompliancePosture(
  employerId: string,
  options: FetchOptions = {},
): Promise<EmployerCompliancePosture> {
  const opts = { ...DEFAULTS, ...options };
  const since = sinceISO(opts.monthsBack);

  const [
    casesRes,
    violationsRes,
    arrangementsRes,
    legalRes,
    followUpsRes,
    inspectionsRes,
    reportsRes,
    disputesRes,
    ledgerRes,
  ] = await Promise.all([
    supabase
      .from('ce_cases')
      .select('id, case_number, case_type, status, priority, created_at, resolved_at, is_locked')
      .eq('employer_id', employerId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('ce_violations')
      .select('id, violation_number, status, severity, total_amount, created_at, summary, ce_violation_types(code, name)')
      .eq('employer_id', employerId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('ce_payment_arrangements')
      .select('id, arrangement_number, status, total_debt, total_paid, start_date, end_date, next_due_date, missed_payments')
      .eq('employer_id', employerId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('ce_legal_proceedings')
      .select('id, reference_number, proceeding_type, status, filed_date, next_hearing_date')
      .eq('employer_id', employerId)
      .order('filed_date', { ascending: false })
      .limit(20),
    supabase
      .from('ce_follow_up_actions')
      .select('id, action_number, action_type, status, due_date, description')
      .eq('employer_id', employerId)
      .eq('is_deleted', false)
      .order('due_date', { ascending: false })
      .limit(30),
    supabase
      .from('ce_inspections')
      .select('id, inspection_number, status, actual_end, visit_date, inspector_name, findings_count')
      .eq('employer_id', employerId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('ce_employer_audit_reports')
      .select('id, report_number, report_type, status, generated_at')
      .eq('employer_id', employerId)
      .order('generated_at', { ascending: false })
      .limit(30),
    supabase
      .from('ce_audit_disputes')
      .select('id, dispute_number, status, raised_at, reason')
      .eq('employer_id', employerId)
      .order('raised_at', { ascending: false })
      .limit(20),
    supabase
      .from('ce_employer_financial_ledger')
      .select('period, posted_at, debit_amount, credit_amount, status')
      .eq('employer_id', employerId)
      .eq('status', 'POSTED')
      .order('posted_at', { ascending: true })
      .limit(500),
  ]);

  const cases: PostureCase[] = (casesRes.data ?? []) as PostureCase[];

  const violations: PostureViolation[] = (violationsRes.data ?? []).map((v: any) => ({
    id: v.id,
    violation_number: v.violation_number,
    violation_type_code: v.ce_violation_types?.code ?? null,
    violation_type_name: v.ce_violation_types?.name ?? null,
    status: v.status,
    severity: v.severity,
    total_amount: v.total_amount,
    created_at: v.created_at,
    summary: v.summary,
  }));

  const arrangements: PostureArrangement[] = (arrangementsRes.data ?? []) as PostureArrangement[];
  const legal: PostureLegal[] = (legalRes.data ?? []) as PostureLegal[];
  const followUps: PostureFollowUp[] = (followUpsRes.data ?? []) as PostureFollowUp[];

  const pastInspections: PostureInspection[] = (inspectionsRes.data ?? []).map((i: any) => ({
    id: i.id,
    inspection_number: i.inspection_number,
    status: i.status,
    visit_date: i.actual_end ?? i.visit_date ?? null,
    inspector_name: i.inspector_name ?? null,
    findings_count: i.findings_count ?? 0,
  }));

  const pastReports: PostureReport[] = (reportsRes.data ?? []) as PostureReport[];
  const disputes: PostureDispute[] = (disputesRes.data ?? []) as PostureDispute[];

  // Ledger snapshot: net outstanding = sum(debit) - sum(credit)
  let totalDebit = 0;
  let totalCredit = 0;
  let oldestOverdue: string | null = null;
  const overduePeriods = new Set<string>();
  for (const row of ledgerRes.data ?? []) {
    const d = Number(row.debit_amount ?? 0);
    const c = Number(row.credit_amount ?? 0);
    totalDebit += d;
    totalCredit += c;
    if (d > c && row.period) {
      overduePeriods.add(row.period);
      if (!oldestOverdue || row.posted_at < oldestOverdue) oldestOverdue = row.posted_at;
    }
  }
  const ledger: PostureLedgerSnapshot = {
    total_outstanding: Math.max(0, totalDebit - totalCredit),
    oldest_overdue_date: oldestOverdue,
    overdue_periods: overduePeriods.size,
  };

  return {
    employer_id: employerId,
    fetched_at: new Date().toISOString(),
    cases,
    violations,
    arrangements,
    legal,
    followUps,
    pastInspections,
    pastReports,
    disputes,
    ledger,
  };
}

export const EMPTY_POSTURE: EmployerCompliancePosture = {
  employer_id: '',
  fetched_at: new Date(0).toISOString(),
  cases: [],
  violations: [],
  arrangements: [],
  legal: [],
  followUps: [],
  pastInspections: [],
  pastReports: [],
  disputes: [],
  ledger: { total_outstanding: 0, oldest_overdue_date: null, overdue_periods: 0 },
};
