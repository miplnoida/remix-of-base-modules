import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  DetectionRuleData,
  CalculationRuleData,
  EscalationRuleData,
  ViolationTypeData,
  SimulationFactContext,
} from '@/services/complianceSimulatorEngine';
import { createDefaultFactContext } from '@/services/complianceSimulatorEngine';

// ── Fetch all rules ──

export function useSimulatorRules() {
  return useQuery({
    queryKey: ['simulator-rules'],
    queryFn: async () => {
      const [drRes, crRes, erRes, vtRes] = await Promise.all([
        supabase.from('ce_detection_rules').select('id, rule_code, name, description, trigger_event, auto_create_violation, is_enabled, violation_type_id, parameters, frequency, priority').order('rule_code'),
        supabase.from('ce_calculation_rules').select('id, rule_code, name, applies_to, formula_expression, fund_type, source_config, is_enabled, violation_type_id').order('rule_code'),
        supabase.from('ce_escalation_rules').select('id, rule_code, name, from_status, to_status, condition_expression, days_threshold, amount_threshold, auto_escalate, requires_approval, is_enabled, violation_type_id').order('rule_code'),
        supabase.from('ce_violation_types').select('id, code, name, category, severity_default').eq('is_active', true).order('sort_order'),
      ]);

      return {
        detectionRules: (drRes.data || []) as DetectionRuleData[],
        calculationRules: (crRes.data || []) as CalculationRuleData[],
        escalationRules: (erRes.data || []) as EscalationRuleData[],
        violationTypes: (vtRes.data || []) as ViolationTypeData[],
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ── Search employers ──

export function useEmployerSearch(searchTerm: string) {
  return useQuery({
    queryKey: ['simulator-employer-search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      const { data } = await supabase
        .from('er_master')
        .select('regno, name, status, trade_name, activity_type, sector_code, office_code')
        .or(`regno.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%,trade_name.ilike.%${searchTerm}%`)
        .limit(20);
      return data || [];
    },
    enabled: searchTerm.length >= 2,
  });
}

// ── Helpers ──

/** Get the most recent expected filing period (previous month) */
function getExpectedPeriod(): { periodStr: string; periodDate: Date } {
  const now = new Date();
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = now.getMonth() === 0 ? 12 : now.getMonth(); // previous month (1-based)
  const periodStr = `${year}-${String(month).padStart(2, '0')}-01`;
  return { periodStr, periodDate: new Date(year, month - 1, 1) };
}

/** Calculate days between two dates */
function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Load employer compliance context ──

export function useEmployerComplianceContext(regno: string | null, periodOverride?: string | null) {
  return useQuery({
    queryKey: ['simulator-employer-context', regno, periodOverride ?? null],
    queryFn: async (): Promise<{
      facts: Partial<SimulationFactContext>;
      periodFacts: Array<{ period: string; facts: Partial<SimulationFactContext> }>;
      filingHistory: any[];
      paymentHistory: any[];
      violations: any[];
      arrangements: any[];
      riskProfile: any | null;
      snapshot: {
        filedCount: number;
        notFiledCount: number;
        paidCount: number;
        partialCount: number;
        unpaidCount: number;
        totalOutstanding: number;
        openViolations: number;
        reviewViolations: number;
        repeatCount: number;
        hasActiveArrangement: boolean;
        currentNoticeStage: string | null;
      };
      existingViolationsByVtId: Record<string, number>;
      existingViolationsByVtIdPeriod: Record<string, number>;
    }> => {
      if (!regno) throw new Error('No employer selected');

      // Fetch all data in parallel
      const [
        employerRes,
        c3Res,
        paymentRes,
        violationsRes,
        arrangementsRes,
        ledgerRes,
        riskRes,
        noticesRes,
        configRes,
      ] = await Promise.all([
        supabase.from('er_master').select('regno, name, status, trade_name, activity_type, sector_code').eq('regno', regno).single(),
        supabase.from('cn_c3_reported').select('*').eq('payer_id', regno).order('period', { ascending: false }).limit(24),
        supabase.from('cn_payment_header').select('*, cn_payment(*)').eq('payer_id', regno).order('date_received', { ascending: false }).limit(24),
        supabase.from('ce_violations').select('id, violation_type_id, status, priority, created_at, resolved_at, source_type, period_from').or(`employer_id.eq.${regno}`).order('created_at', { ascending: false }).limit(100),
        supabase.from('ce_payment_arrangements').select('*').eq('employer_id', regno).order('created_at', { ascending: false }).limit(5),
        supabase.from('ce_employer_financial_ledger').select('amount, entry_type, created_at').eq('employer_id', regno).order('created_at', { ascending: false }).limit(100),
        supabase.from('ce_risk_profiles').select('*').eq('employer_id', regno).maybeSingle(),
        supabase.from('ce_notices').select('notice_type, status, created_at').eq('employer_id', regno).order('created_at', { ascending: false }).limit(5),
        supabase.from('c3_config_details').select('submission_due_day, levy_monthly_threshold').limit(1).single(),
      ]);

      const employer = employerRes.data;
      const c3s = c3Res.data || [];
      const payments = paymentRes.data || [];
      const violations = violationsRes.data || [];
      const arrangements = arrangementsRes.data || [];
      const ledgerEntries = ledgerRes.data || [];
      const risk = riskRes.data;
      const notices = noticesRes.data || [];
      const config = configRes.data;

      const submissionDueDay = config?.submission_due_day || 28;
      const levyMonthlyThreshold = config?.levy_monthly_threshold || 6500;
      const gracePeriodDays = 5;

      const now = new Date();

      // Pre-compute global stats reused across periods.
      const totalOutstanding = ledgerEntries.reduce((sum: number, e: any) => {
        if (e.entry_type === 'DEBIT' || e.entry_type === 'CHARGE') return sum + (Number(e.amount) || 0);
        if (e.entry_type === 'CREDIT' || e.entry_type === 'PAYMENT') return sum - (Number(e.amount) || 0);
        return sum;
      }, 0);
      const oneYearAgo = new Date(); oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const recentViolations = violations.filter((v: any) => new Date(v.created_at) >= oneYearAgo);
      const repeatCount = recentViolations.length;
      const activeArr = arrangements.find((a: any) => a.status === 'ACTIVE');
      const latestNotice = notices.length > 0 ? notices[0] : null;
      const last3Wages = c3s.slice(0, 3).map((c: any) => Number(c.total_wages) || 0);
      const priorAvgWages = last3Wages.length > 0
        ? last3Wages.reduce((s: number, w: number) => s + w, 0) / last3Wages.length
        : 0;
      const oldestOpen = violations.find((v: any) => v.status === 'OPEN' || v.status === 'UNDER_REVIEW');
      const daysOpen = oldestOpen ? daysBetween(new Date(oldestOpen.created_at), now) : 0;
      const filedPeriodsSet = new Set(c3s.map((c: any) => c.period?.substring(0, 7)));

      /** Build facts for one specific period (YYYY-MM-01). */
      const buildFactsForPeriod = (pStr: string): Partial<SimulationFactContext> => {
        const [y, m] = pStr.substring(0, 7).split('-').map(Number);
        const periodDate = new Date(y, m - 1, 1);
        const periodYm = pStr.substring(0, 7);

        const c3ForPeriod = c3s.find((c: any) => c.period?.substring(0, 7) === periodYm);
        const filingSubmitted = !!c3ForPeriod;
        const deadlineDate = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, submissionDueDay);
        const daysPastDeadline = Math.max(0, daysBetween(deadlineDate, now));
        const filingDate = c3ForPeriod?.date_received
          ? new Date(c3ForPeriod.date_received).toISOString().split('T')[0]
          : null;

        const amountDue = c3ForPeriod
          ? (Number(c3ForPeriod.emp_ss_amt_calc) || 0) +
            (Number(c3ForPeriod.emp_levy_amt_calc) || 0) +
            (Number(c3ForPeriod.emp_pe_amt_calc) || 0)
          : 0;

        const totalPaid = payments.reduce((sum: number, p: any) => {
          const ps = p.cn_payment || [];
          return sum + ps
            .filter((pp: any) => pp.period?.substring(0, 7) === periodYm)
            .reduce((s: number, pp: any) => s + (Number(pp.payment_amount) || 0), 0);
        }, 0);
        const paymentMade = totalPaid > 0;
        const shortfallAmount = Math.max(0, amountDue - totalPaid);
        const shortfallPercent = amountDue > 0 ? (shortfallAmount / amountDue) * 100 : 0;

        const totalWagesDeclared = Number(c3ForPeriod?.total_wages || 0);
        const employeeCountDeclared = Number(c3ForPeriod?.number_employed || 0);
        const levyAmountReported = Number(c3ForPeriod?.emp_levy_amt_calc || 0);
        const severanceAmountReported = Number(c3ForPeriod?.emp_pe_amt_calc || 0);

        return {
          employerRegNo: employer?.regno || null,
          employerStatus: employer?.status || null,
          employerName: employer?.name || null,
          businessType: employer?.activity_type || null,
          filingSubmitted,
          filingDate,
          filingPeriod: `${periodYm}-01`,
          filingDueDay: submissionDueDay,
          gracePeriodDays,
          daysPastDeadline,
          paymentMade,
          paymentAmount: totalPaid,
          amountDue,
          shortfallAmount,
          shortfallPercent,
          arrangementActive: !!activeArr,
          installmentOverdueDays: 0,
          levyAmountReported,
          severanceAmountReported,
          employeeCountDeclared,
          employeeCountObserved: 0,
          totalWagesDeclared,
          priorAverageWages: priorAvgWages,
          levyEligible: totalWagesDeclared > levyMonthlyThreshold,
          severanceEligible: employeeCountDeclared > 0,
          hasConsecutiveGaps: false,
          consecutiveGapCount: 0,
          priorViolationsCount: violations.length,
          priorSameTypeViolationsRolling12: repeatCount,
          repeatOffender: repeatCount >= 3,
          hasClearanceCert: false,
          riskScore: risk?.total_score || 0,
          daysOpen,
          totalOwed: Math.max(0, totalOutstanding),
          noticeStage: latestNotice?.notice_type || null,
          legalResponseReceived: false,
        };
      };

      // Build last 12 periods (previous month back 12 months). Skip current month.
      const last12: string[] = [];
      for (let i = 1; i <= 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        last12.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
      }

      const periodFacts = last12.map(p => ({ period: p.substring(0, 7), facts: buildFactsForPeriod(p) }));

      // Snapshot: filed vs not-filed in last 6 periods
      const last6 = last12.slice(0, 6).map(p => p.substring(0, 7));
      const filedCount = last6.filter(p => filedPeriodsSet.has(p)).length;
      const notFiledCount = 6 - filedCount;
      const paidCount = payments.filter((p: any) => p.cn_payment && p.cn_payment.length > 0).length;
      const openViolations = violations.filter((v: any) => v.status === 'OPEN').length;
      const reviewViolations = violations.filter((v: any) => v.status === 'UNDER_REVIEW').length;

      // Primary "facts" — use override if provided, else previous month.
      const primaryPeriod = (periodOverride && /^\d{4}-\d{2}$/.test(periodOverride))
        ? `${periodOverride}-01`
        : last12[0];
      const facts = buildFactsForPeriod(primaryPeriod);

      // Per-type and per-(type, period) dedupe maps.
      const existingViolationsByVtId: Record<string, number> = {};
      const existingViolationsByVtIdPeriod: Record<string, number> = {};
      for (const v of violations) {
        if (!v.violation_type_id) continue;
        if (!(v.status === 'OPEN' || v.status === 'UNDER_REVIEW')) continue;
        existingViolationsByVtId[v.violation_type_id] = (existingViolationsByVtId[v.violation_type_id] ?? 0) + 1;
        const vPeriod = v.period_from ? String(v.period_from).substring(0, 7) : null;
        if (vPeriod) {
          const key = `${v.violation_type_id}|${vPeriod}`;
          existingViolationsByVtIdPeriod[key] = (existingViolationsByVtIdPeriod[key] ?? 0) + 1;
        }
      }

      return {
        facts,
        periodFacts,
        filingHistory: c3s,
        paymentHistory: payments,
        violations,
        arrangements,
        riskProfile: risk,
        existingViolationsByVtId,
        existingViolationsByVtIdPeriod,
        snapshot: {
          filedCount,
          notFiledCount,
          paidCount,
          partialCount: 0,
          unpaidCount: Math.max(0, filedCount - paidCount),
          totalOutstanding: Math.max(0, totalOutstanding),
          openViolations,
          reviewViolations,
          repeatCount,
          hasActiveArrangement: !!activeArr,
          currentNoticeStage: latestNotice?.notice_type || null,
        },
      };
    },
    enabled: !!regno,
  });
}
