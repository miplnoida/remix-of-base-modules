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
  monthsBack?: number;
}

const DEFAULTS: Required<FetchOptions> = { monthsBack: 24 };

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

  // Run independent queries in parallel
  const casesP = supabase
    .from('ce_cases')
    .select('id, case_number, case_type, status, priority, created_at, closed_date, total_amount')
    .eq('employer_id', employerId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(50);

  const violationsP = supabase
    .from('ce_violations')
    .select('id, violation_number, status, severity, total_amount, created_at, summary, ce_violation_types(code, name)')
    .eq('employer_id', employerId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(50);

  const arrangementsP = supabase
    .from('ce_payment_arrangements')
    .select('id, arrangement_number, status, total_debt, total_paid, start_date, end_date, next_due_date, missed_payments')
    .eq('employer_id', employerId)
    .order('created_at', { ascending: false })
    .limit(20);

  const legalP = supabase
    .from('ce_legal_proceedings')
    .select('id, case_number, stage, court, filed_date, next_hearing, outcome')
    .eq('reg_no', employerId)
    .order('filed_date', { ascending: false })
    .limit(20);

  const followUpsP = supabase
    .from('ce_follow_up_actions')
    .select('id, action_type, status, due_date, description, priority')
    .eq('employer_id', employerId)
    .eq('is_deleted', false)
    .order('due_date', { ascending: false })
    .limit(30);

  const inspectionsP = supabase
    .from('ce_inspections')
    .select('id, inspection_number, status, actual_end, visit_date, inspector_name, created_at')
    .eq('employer_id', employerId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(30);

  const reportsP = supabase
    .from('ce_employer_audit_reports')
    .select('id, report_number, status, generated_at, total_findings, total_violations')
    .eq('employer_id', employerId)
    .order('generated_at', { ascending: false })
    .limit(30);

  const disputesP = supabase
    .from('ce_audit_disputes')
    .select('id, status, raised_at, dispute_reason')
    .eq('employer_id', employerId)
    .order('raised_at', { ascending: false })
    .limit(20);

  const ledgerP = supabase
    .from('ce_employer_financial_ledger')
    .select('period, posted_at, debit_amount, credit_amount, status')
    .eq('employer_id', employerId)
    .eq('status', 'POSTED')
    .order('posted_at', { ascending: true })
    .limit(500);

  const [
    casesRes, violationsRes, arrangementsRes, legalRes, followUpsRes,
    inspectionsRes, reportsRes, disputesRes, ledgerRes,
  ] = await Promise.all([
    casesP, violationsP, arrangementsP, legalP, followUpsP,
    inspectionsP, reportsP, disputesP, ledgerP,
  ]);

  const cases: PostureCase[] = ((casesRes.data ?? []) as any[]).map((c) => ({
    id: c.id,
    case_number: c.case_number ?? null,
    case_type: c.case_type ?? null,
    status: c.status ?? null,
    priority: c.priority ?? null,
    created_at: c.created_at ?? null,
    closed_date: c.closed_date ?? null,
    total_amount: c.total_amount ?? null,
  }));

  const violations: PostureViolation[] = ((violationsRes.data ?? []) as any[]).map((v) => ({
    id: v.id,
    violation_number: v.violation_number ?? null,
    violation_type_code: v.ce_violation_types?.code ?? null,
    violation_type_name: v.ce_violation_types?.name ?? null,
    status: v.status ?? null,
    severity: v.severity ?? null,
    total_amount: v.total_amount ?? null,
    created_at: v.created_at ?? null,
    summary: v.summary ?? null,
  }));

  const arrangements: PostureArrangement[] = ((arrangementsRes.data ?? []) as any[]).map((a) => ({
    id: a.id,
    arrangement_number: a.arrangement_number ?? null,
    status: a.status ?? null,
    total_debt: a.total_debt ?? null,
    total_paid: a.total_paid ?? null,
    start_date: a.start_date ?? null,
    end_date: a.end_date ?? null,
    next_due_date: a.next_due_date ?? null,
    missed_payments: a.missed_payments ?? null,
  }));

  const legal: PostureLegal[] = ((legalRes.data ?? []) as any[]).map((l) => ({
    id: l.id,
    case_number: l.case_number ?? null,
    stage: l.stage ?? null,
    court: l.court ?? null,
    filed_date: l.filed_date ?? null,
    next_hearing: l.next_hearing ?? null,
    outcome: l.outcome ?? null,
  }));

  const followUps: PostureFollowUp[] = ((followUpsRes.data ?? []) as any[]).map((f) => ({
    id: f.id,
    action_type: f.action_type ?? null,
    status: f.status ?? null,
    due_date: f.due_date ?? null,
    description: f.description ?? null,
    priority: f.priority ?? null,
  }));

  const pastInspections: PostureInspection[] = ((inspectionsRes.data ?? []) as any[]).map((i) => ({
    id: i.id,
    inspection_number: i.inspection_number ?? null,
    status: i.status ?? null,
    visit_date: i.actual_end ?? i.visit_date ?? null,
    inspector_name: i.inspector_name ?? null,
  }));

  const pastReports: PostureReport[] = ((reportsRes.data ?? []) as any[]).map((r) => ({
    id: r.id,
    report_number: r.report_number ?? null,
    status: r.status ?? null,
    generated_at: r.generated_at ?? null,
    total_findings: r.total_findings ?? null,
    total_violations: r.total_violations ?? null,
  }));

  const disputes: PostureDispute[] = ((disputesRes.data ?? []) as any[]).map((d) => ({
    id: d.id,
    status: d.status ?? null,
    raised_at: d.raised_at ?? null,
    dispute_reason: d.dispute_reason ?? null,
  }));

  // Ledger snapshot
  let totalDebit = 0;
  let totalCredit = 0;
  let oldestOverdue: string | null = null;
  const overduePeriods = new Set<string>();
  for (const row of (ledgerRes.data ?? []) as any[]) {
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
