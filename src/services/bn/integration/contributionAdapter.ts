/**
 * BN Contribution Adapter — Reads from ip_wages and bn_get_contribution_summary RPC
 */
import { supabase } from '@/integrations/supabase/client';
import type { IBnContributionAdapter, ContributionSummary, WageRecord } from './contracts';

const db = supabase as any;

export const bnContributionAdapter: IBnContributionAdapter = {
  async getContributionSummary(ssn, windowStart, windowEnd): Promise<ContributionSummary> {
    const { data, error } = await db.rpc('bn_get_contribution_summary', {
      p_ssn: ssn.trim(),
      p_from_date: windowStart,
      p_to_date: windowEnd,
    });

    if (error) throw error;

    // RPC returns a single summary row
    const row = Array.isArray(data) ? data[0] : data;
    return {
      ssn,
      totalWeeks: Number(row?.total_weeks ?? 0),
      totalAmount: Number(row?.total_wages ?? 0),
      averageWeeklyWage: Number(row?.avg_weekly_wages ?? 0),
      windowStart,
      windowEnd,
    };
  },

  async getWeeklyWages(ssn, periodStart, periodEnd): Promise<WageRecord[]> {
    const { data, error } = await db
      .from('ip_wages')
      .select('period, employer_reg_no, wages, weeks, contributions')
      .eq('ssn', ssn.trim())
      .gte('period', periodStart)
      .lte('period', periodEnd)
      .order('period', { ascending: false });

    if (error) throw error;
    return (data ?? []).map((w: any) => ({
      period: w.period,
      employerRegNo: w.employer_reg_no,
      wages: w.wages ?? 0,
      weeks: w.weeks ?? 0,
      contributions: w.contributions ?? 0,
    }));
  },

  async getTotalContributions(ssn): Promise<{ weeks: number; amount: number }> {
    const { data, error } = await db
      .from('ip_wages')
      .select('weeks, contributions')
      .eq('ssn', ssn.trim());

    if (error) throw error;
    const rows = data ?? [];
    return {
      weeks: rows.reduce((sum: number, r: any) => sum + (r.weeks ?? 0), 0),
      amount: rows.reduce((sum: number, r: any) => sum + (r.contributions ?? 0), 0),
    };
  },

  async hasMinimumContributions(ssn, requiredWeeks, windowWeeks, referenceDate): Promise<boolean> {
    const refDate = new Date(referenceDate);
    const windowStart = new Date(refDate);
    windowStart.setDate(windowStart.getDate() - windowWeeks * 7);

    const summary = await this.getContributionSummary(
      ssn,
      windowStart.toISOString().split('T')[0],
      referenceDate
    );
    return summary.totalWeeks >= requiredWeeks;
  },
};
