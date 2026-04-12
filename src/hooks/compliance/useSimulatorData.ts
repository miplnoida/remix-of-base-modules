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

// ── Load employer compliance context ──

export function useEmployerComplianceContext(regno: string | null) {
  return useQuery({
    queryKey: ['simulator-employer-context', regno],
    queryFn: async (): Promise<{
      facts: Partial<SimulationFactContext>;
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
      ] = await Promise.all([
        supabase.from('er_master').select('regno, name, status, trade_name, activity_type, sector_code').eq('regno', regno).single(),
        supabase.from('cn_c3_reported').select('*').eq('payer_id', regno).order('period', { ascending: false }).limit(12),
        supabase.from('cn_payment_header').select('*, cn_payment(*)').eq('payer_id', regno).order('date_received', { ascending: false }).limit(12),
        supabase.from('ce_violations').select('id, violation_type_id, status, priority, created_at, resolved_at, source_type').or(`employer_id.eq.${regno}`).order('created_at', { ascending: false }).limit(50),
        supabase.from('ce_payment_arrangements').select('*').eq('employer_id', regno).order('created_at', { ascending: false }).limit(5),
        supabase.from('ce_employer_financial_ledger').select('amount, entry_type, created_at').eq('employer_id', regno).order('created_at', { ascending: false }).limit(100),
        supabase.from('ce_risk_profiles').select('*').eq('employer_id', regno).maybeSingle(),
        supabase.from('ce_notices').select('notice_type, status, created_at').eq('employer_id', regno).order('created_at', { ascending: false }).limit(5),
      ]);

      const employer = employerRes.data;
      const c3s = c3Res.data || [];
      const payments = paymentRes.data || [];
      const violations = violationsRes.data || [];
      const arrangements = arrangementsRes.data || [];
      const ledgerEntries = ledgerRes.data || [];
      const risk = riskRes.data;
      const notices = noticesRes.data || [];

      // Calculate total outstanding from ledger
      const totalOutstanding = ledgerEntries.reduce((sum: number, e: any) => {
        if (e.entry_type === 'DEBIT' || e.entry_type === 'CHARGE') return sum + (e.amount || 0);
        if (e.entry_type === 'CREDIT' || e.entry_type === 'PAYMENT') return sum - (e.amount || 0);
        return sum;
      }, 0);

      // C3 filing stats for last 6 periods
      const last6C3s = c3s.slice(0, 6);
      const filedCount = last6C3s.length;
      const notFiledCount = Math.max(0, 6 - filedCount);

      // Payment matching
      const paidCount = payments.filter((p: any) => p.cn_payment && p.cn_payment.length > 0).length;

      // Violations stats
      const openViolations = violations.filter((v: any) => v.status === 'OPEN').length;
      const reviewViolations = violations.filter((v: any) => v.status === 'UNDER_REVIEW').length;

      // Repeat count (rolling 12 months)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const recentViolations = violations.filter((v: any) => new Date(v.created_at) >= oneYearAgo);
      const repeatCount = recentViolations.length;

      // Active arrangement
      const activeArr = arrangements.find((a: any) => a.status === 'ACTIVE');

      // Latest notice stage
      const latestNotice = notices.length > 0 ? notices[0] : null;

      // Calculate prior average wages from last 3 C3s
      const last3Wages = c3s.slice(0, 3).map((c: any) => c.total_wages || 0);
      const priorAvgWages = last3Wages.length > 0
        ? last3Wages.reduce((s: number, w: number) => s + w, 0) / last3Wages.length
        : 0;

      const facts: Partial<SimulationFactContext> = {
        employerRegNo: employer?.regno || null,
        employerStatus: employer?.status || null,
        employerName: employer?.name || null,
        businessType: employer?.activity_type || null,
        priorAverageWages: priorAvgWages,
        priorViolationsCount: violations.length,
        priorSameTypeViolationsRolling12: repeatCount,
        repeatOffender: repeatCount >= 3,
        riskScore: risk?.overall_score || 0,
        totalOwed: Math.max(0, totalOutstanding),
        noticeStage: latestNotice?.notice_type || null,
        arrangementActive: !!activeArr,
      };

      return {
        facts,
        filingHistory: c3s,
        paymentHistory: payments,
        violations,
        arrangements,
        riskProfile: risk,
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
