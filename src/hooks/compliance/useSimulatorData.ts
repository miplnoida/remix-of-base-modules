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

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export interface DataCoverage {
  filings: { count: number; periodsCovered: number };
  payments: { headerCount: number };
  arrangements: { count: number; activeCount: number };
  installments: { count: number; overdueCount: number };
  inspections: { count: number };
  notices: { count: number; latestType: string | null };
  clearanceCerts: { available: boolean };
  violationHistory: { count: number };
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
      coverage: DataCoverage;
      existingViolationsByVtId: Record<string, number>;
      existingViolationsByVtIdPeriod: Record<string, number>;
    }> => {
      if (!regno) throw new Error('No employer selected');

      // Fetch the base set in parallel.
      const [
        employerRes,
        c3Res,
        paymentHdrRes,
        violationsRes,
        arrangementsRes,
        ledgerRes,
        riskRes,
        noticesRes,
        configRes,
        inspectionsRes,
      ] = await Promise.all([
        supabase.from('er_master').select('regno, name, status, trade_name, activity_type, sector_code').eq('regno', regno).single(),
        supabase.from('cn_c3_reported').select('*').eq('payer_id', regno).order('period', { ascending: false }).limit(24),
        supabase.from('cn_payment_header').select('payer_id, payment_id, date_received, batch_number, status').eq('payer_id', regno).order('date_received', { ascending: false }).limit(60),
        supabase.from('ce_violations').select('id, violation_type_id, status, priority, created_at, resolved_at, source_type, period_from').eq('employer_id', regno).order('created_at', { ascending: false }).limit(200),
        supabase.from('ce_payment_arrangements').select('id, status, start_date, end_date, next_due_date, missed_payments, breach_detected').eq('employer_id', regno).order('created_at', { ascending: false }).limit(10),
        supabase.from('ce_employer_financial_ledger').select('amount, entry_type, created_at').eq('employer_id', regno).order('created_at', { ascending: false }).limit(200),
        supabase.from('ce_risk_profiles').select('*').eq('employer_id', regno).maybeSingle(),
        supabase.from('ce_notices').select('notice_type, status, created_at').eq('employer_id', regno).order('created_at', { ascending: false }).limit(10),
        supabase.from('c3_config_details').select('submission_due_day, levy_monthly_threshold').limit(1).single(),
        supabase.from('ce_inspections').select('id, employer_id, status, visit_date, scheduled_date, employees_interviewed').eq('employer_id', regno).order('visit_date', { ascending: false }).limit(60),
      ]);

      const employer = employerRes.data;
      const c3s = c3Res.data || [];
      const paymentHdrs = paymentHdrRes.data || [];
      const violations = violationsRes.data || [];
      const arrangements = arrangementsRes.data || [];
      const ledgerEntries = ledgerRes.data || [];
      const risk = riskRes.data;
      const notices = noticesRes.data || [];
      const config = configRes.data;
      const inspections = inspectionsRes.data || [];

      // Pull payment details + installments in a follow-up batch.
      const paymentIds = paymentHdrs.map((p: any) => p.payment_id).filter(Boolean);
      const arrangementIds = arrangements.map((a: any) => a.id);

      const [paymentDetailsRes, installmentsRes] = await Promise.all([
        paymentIds.length > 0
          ? supabase.from('cn_payment').select('payment_id, period, payment_amount, payment_date').in('payment_id', paymentIds)
          : Promise.resolve({ data: [] as any[] }),
        arrangementIds.length > 0
          ? supabase.from('ce_installments').select('arrangement_id, installment_number, due_date, amount, paid_amount, paid_date, status, is_overdue, overdue_days').in('arrangement_id', arrangementIds).order('due_date', { ascending: true })
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const paymentDetails = paymentDetailsRes.data || [];
      const installments = installmentsRes.data || [];

      const submissionDueDay = config?.submission_due_day || 28;
      const levyMonthlyThreshold = config?.levy_monthly_threshold || 6500;
      const gracePeriodDays = 5;
      const now = new Date();

      // Global stats used across periods.
      const totalOutstanding = ledgerEntries.reduce((sum: number, e: any) => {
        if (e.entry_type === 'DEBIT' || e.entry_type === 'CHARGE') return sum + (Number(e.amount) || 0);
        if (e.entry_type === 'CREDIT' || e.entry_type === 'PAYMENT') return sum - (Number(e.amount) || 0);
        return sum;
      }, 0);
      const oneYearAgo = new Date(); oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const recentViolations = violations.filter((v: any) => new Date(v.created_at) >= oneYearAgo);
      const repeatCount = recentViolations.length;

      // Per-type repeat count for DR-005.
      const priorSameTypeByVtId: Record<string, number> = {};
      for (const v of recentViolations) {
        if (!v.violation_type_id) continue;
        priorSameTypeByVtId[v.violation_type_id] = (priorSameTypeByVtId[v.violation_type_id] ?? 0) + 1;
      }

      const activeArr = arrangements.find((a: any) => a.status === 'ACTIVE');
      // Compute installmentOverdueDays from the next unpaid installment of the active arrangement.
      let installmentOverdueDays = 0;
      let installmentDueDate: string | null = null;
      if (activeArr) {
        const active = installments
          .filter((i: any) => i.arrangement_id === activeArr.id)
          .filter((i: any) => i.status !== 'PAID');
        const nextUnpaid = active.sort((a: any, b: any) => (a.due_date || '').localeCompare(b.due_date || ''))[0];
        if (nextUnpaid?.due_date) {
          installmentDueDate = nextUnpaid.due_date;
          const due = new Date(nextUnpaid.due_date);
          installmentOverdueDays = Math.max(0, daysBetween(due, now));
        }
      }

      const latestNotice = notices.length > 0 ? notices[0] : null;
      const last3Wages = c3s.slice(0, 3).map((c: any) => Number(c.total_wages) || 0);
      const priorAvgWages = last3Wages.length > 0
        ? last3Wages.reduce((s: number, w: number) => s + w, 0) / last3Wages.length
        : 0;
      // Days since latest notice (more meaningful for escalation timing than the
      // oldest open violation row).
      const daysOpen = latestNotice ? daysBetween(new Date(latestNotice.created_at), now) : 0;
      const filedPeriodsSet = new Set(c3s.map((c: any) => c.period?.substring(0, 7)));

      // Data-availability flags shared by every period of the same employer.
      const dataAvailability = {
        filings: c3s.length > 0,
        payments: paymentHdrs.length > 0,
        arrangements: arrangements.length > 0,
        installments: installments.length > 0,
        inspections: inspections.length > 0,
        clearanceCerts: false, // No clearance-cert table in this build — source unavailable.
        notices: notices.length > 0,
        periodHistory: c3s.length > 0,
      };

      /** Build facts for one specific period (YYYY-MM-01). */
      const buildFactsForPeriod = (pStr: string): Partial<SimulationFactContext> => {
        const [y, m] = pStr.substring(0, 7).split('-').map(Number);
        const periodDate = new Date(y, m - 1, 1);
        const periodYm = pStr.substring(0, 7);

        const c3ForPeriod = c3s.find((c: any) => c.period?.substring(0, 7) === periodYm);
        const filingSubmitted = !!c3ForPeriod;
        const filingSubmissionId = c3ForPeriod?.sequence_no != null ? String(c3ForPeriod.sequence_no) : null;
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

        const totalPaid = paymentDetails
          .filter((pp: any) => pp.period?.substring(0, 7) === periodYm)
          .reduce((s: number, pp: any) => s + (Number(pp.payment_amount) || 0), 0);
        const paymentMade = totalPaid > 0;
        const shortfallAmount = Math.max(0, amountDue - totalPaid);
        const shortfallPercent = amountDue > 0 ? (shortfallAmount / amountDue) * 100 : 0;

        const totalWagesDeclared = Number(c3ForPeriod?.total_wages || 0);
        const employeeCountDeclared = Number(c3ForPeriod?.number_employed || 0);
        const levyAmountReported = Number(c3ForPeriod?.emp_levy_amt_calc || 0);
        const severanceAmountReported = Number(c3ForPeriod?.emp_pe_amt_calc || 0);

        // Observed headcount from any inspection that occurred during the period.
        const periodStart = periodDate;
        const periodEnd = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0);
        const insp = inspections.find((i: any) => {
          const d = i.visit_date || i.scheduled_date;
          if (!d) return false;
          const t = new Date(d).getTime();
          return t >= periodStart.getTime() && t <= periodEnd.getTime();
        });
        const employeeCountObserved = Number(insp?.employees_interviewed || 0);

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
          installmentDueDate,
          installmentOverdueDays,
          levyAmountReported,
          severanceAmountReported,
          employeeCountDeclared,
          employeeCountObserved,
          totalWagesDeclared,
          priorAverageWages: priorAvgWages,
          levyEligible: totalWagesDeclared > levyMonthlyThreshold,
          severanceEligible: employeeCountDeclared > 0,
          hasConsecutiveGaps: false, // filled below once we know the period index
          consecutiveGapCount: 0,
          priorViolationsCount: violations.length,
          priorSameTypeViolationsRolling12: repeatCount,
          priorSameTypeByVtId,
          repeatOffender: repeatCount >= 3,
          hasClearanceCert: false,
          riskScore: risk?.total_score || 0,
          daysOpen,
          totalOwed: Math.max(0, totalOutstanding),
          noticeStage: latestNotice?.notice_type || null,
          legalResponseReceived: false,
          dataAvailability,
        };
      };

      // Last 12 periods (skip current month, walk back).
      const last12: string[] = [];
      for (let i = 1; i <= 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        last12.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
      }

      // Newest→oldest. For each period set consecutiveGapCount = number of
      // adjacent missing periods walking *forward in time* from that period.
      const periodFacts = last12.map((p, idx) => {
        const facts = buildFactsForPeriod(p);
        let gap = 0;
        if (!facts.filingSubmitted) {
          for (let j = idx; j < last12.length; j++) {
            if (!filedPeriodsSet.has(last12[j].substring(0, 7))) gap++;
            else break;
          }
        }
        facts.consecutiveGapCount = gap;
        facts.hasConsecutiveGaps = gap >= 2;
        return { period: p.substring(0, 7), facts };
      });

      // Snapshot over last 6 periods.
      const last6 = last12.slice(0, 6).map(p => p.substring(0, 7));
      const filedCount = last6.filter(p => filedPeriodsSet.has(p)).length;
      const notFiledCount = 6 - filedCount;
      // Compute paid/partial/unpaid for the 6-period window using actual due vs paid.
      let paidCount = 0, partialCount = 0, unpaidCount = 0;
      for (const ym of last6) {
        const c3 = c3s.find((c: any) => c.period?.substring(0, 7) === ym);
        if (!c3) continue;
        const due = (Number(c3.emp_ss_amt_calc) || 0) + (Number(c3.emp_levy_amt_calc) || 0) + (Number(c3.emp_pe_amt_calc) || 0);
        if (due <= 0) continue;
        const paid = paymentDetails
          .filter((pp: any) => pp.period?.substring(0, 7) === ym)
          .reduce((s: number, pp: any) => s + (Number(pp.payment_amount) || 0), 0);
        if (paid <= 0) unpaidCount++;
        else if (paid < due) partialCount++;
        else paidCount++;
      }

      const openViolations = violations.filter((v: any) => v.status === 'OPEN').length;
      const reviewViolations = violations.filter((v: any) => v.status === 'UNDER_REVIEW').length;

      // Primary "facts" — use override if provided, else previous month.
      const primaryPeriod = (periodOverride && /^\d{4}-\d{2}$/.test(periodOverride))
        ? `${periodOverride}-01`
        : last12[0];
      const facts = buildFactsForPeriod(primaryPeriod);
      // Apply consecutive-gap logic to the primary period as well.
      const primaryIdx = last12.findIndex(p => p.substring(0, 7) === primaryPeriod.substring(0, 7));
      if (primaryIdx >= 0 && !facts.filingSubmitted) {
        let gap = 0;
        for (let j = primaryIdx; j < last12.length; j++) {
          if (!filedPeriodsSet.has(last12[j].substring(0, 7))) gap++;
          else break;
        }
        facts.consecutiveGapCount = gap;
        facts.hasConsecutiveGaps = gap >= 2;
      }

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

      const coverage: DataCoverage = {
        filings: { count: c3s.length, periodsCovered: filedPeriodsSet.size },
        payments: { headerCount: paymentHdrs.length },
        arrangements: { count: arrangements.length, activeCount: arrangements.filter((a: any) => a.status === 'ACTIVE').length },
        installments: { count: installments.length, overdueCount: installments.filter((i: any) => i.is_overdue).length },
        inspections: { count: inspections.length },
        notices: { count: notices.length, latestType: latestNotice?.notice_type ?? null },
        clearanceCerts: { available: false },
        violationHistory: { count: violations.length },
      };

      return {
        facts,
        periodFacts,
        filingHistory: c3s,
        paymentHistory: paymentHdrs,
        violations,
        arrangements,
        riskProfile: risk,
        existingViolationsByVtId,
        existingViolationsByVtIdPeriod,
        coverage,
        snapshot: {
          filedCount,
          notFiledCount,
          paidCount,
          partialCount,
          unpaidCount,
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
