/**
 * useViolationAmountSuggestion
 *
 * Derives suggested financial amounts for a manual payment / contribution
 * violation by pulling the C3 submission (cn_c3_reported) for the
 * employer + period and the matching payments (cn_payment via
 * cn_payment_header) for the same employer + period + fund.
 *
 * Returns a `source` flag so the UI can show whether amounts came from
 * the C3 record, a partial match, or no data at all.
 *
 * Penalty / interest helpers below use the live policy defaults already
 * loaded by ManualViolationEntry (no extra fetches). Output values are
 * suggestions — the user can override before save, and the existing
 * parameters_snapshot still freezes whatever is submitted.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ResolvedVariable } from '@/services/compliance/policyResolver';

export type FundCode = 'SS' | 'LV' | 'PE' | 'EI' | 'SV';

export interface AmountSuggestion {
  expected: number;
  paid: number;
  shortfall: number;
  c3SubmissionId: string | null;
  monthsLate: number;
  source: 'c3' | 'partial' | 'none';
}

function fundColumn(fund: string | undefined): 'emp_ss_amt_calc' | 'emp_levy_amt_calc' | 'emp_pe_amt_calc' | null {
  switch ((fund || '').toUpperCase()) {
    case 'SS': return 'emp_ss_amt_calc';
    case 'LV': return 'emp_levy_amt_calc';
    case 'PE': return 'emp_pe_amt_calc';
    default: return null;
  }
}

function monthsBetween(periodYm: string): number {
  // periodYm = YYYY-MM
  const [y, m] = periodYm.split('-').map(Number);
  if (!y || !m) return 0;
  const period = new Date(y, m - 1, 1);
  const now = new Date();
  const diff = (now.getFullYear() - period.getFullYear()) * 12 + (now.getMonth() - period.getMonth());
  return Math.max(0, diff);
}

export function useViolationAmountSuggestion(
  employerRegno: string | null,
  periodYm: string | null,
  fundCode: string | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['violation-amount-suggestion', employerRegno, periodYm, fundCode],
    enabled: enabled && !!employerRegno && !!periodYm && !!fundCode,
    queryFn: async (): Promise<AmountSuggestion> => {
      if (!employerRegno || !periodYm || !fundCode) {
        return { expected: 0, paid: 0, shortfall: 0, c3SubmissionId: null, monthsLate: 0, source: 'none' };
      }

      const col = fundColumn(fundCode);
      // C3 submission for this period (cn_c3_reported.period is timestamp, match YYYY-MM prefix)
      const periodStart = `${periodYm}-01`;
      const [y, m] = periodYm.split('-').map(Number);
      const nextMonth = new Date(y, m, 1).toISOString().slice(0, 10);

      const c3Res = await supabase
        .from('cn_c3_reported')
        .select('id, sequence_no, period, emp_ss_amt_calc, emp_levy_amt_calc, emp_pe_amt_calc, date_received')
        .eq('payer_id', employerRegno)
        .gte('period', periodStart)
        .lt('period', nextMonth)
        .order('sequence_no', { ascending: false })
        .limit(1)
        .maybeSingle();

      const c3 = c3Res.data as any | null;
      const expected = c3 && col ? Number(c3[col] || 0) : 0;
      const c3SubmissionId = c3?.sequence_no != null ? String(c3.sequence_no) : null;

      // Payments for the same employer + period + fund.
      // cn_payment_header.payer_id = regno; cn_payment.payment_id links; cn_payment.period filters month; fund_code matches.
      const hdrRes = await supabase
        .from('cn_payment_header')
        .select('payment_id')
        .eq('payer_id', employerRegno);
      const paymentIds = (hdrRes.data || []).map((h: any) => h.payment_id).filter(Boolean);

      let paid = 0;
      if (paymentIds.length > 0) {
        const payRes = await supabase
          .from('cn_payment')
          .select('payment_amount, period, fund_code')
          .in('payment_id', paymentIds)
          .gte('period', periodStart)
          .lt('period', nextMonth)
          .eq('fund_code', fundCode);
        paid = (payRes.data || []).reduce(
          (sum: number, r: any) => sum + (Number(r.payment_amount) || 0),
          0,
        );
      }

      const shortfall = Math.max(0, expected - paid);
      const source: AmountSuggestion['source'] = c3 ? 'c3' : (paid > 0 ? 'partial' : 'none');
      return {
        expected,
        paid,
        shortfall,
        c3SubmissionId,
        monthsLate: monthsBetween(periodYm),
        source,
      };
    },
    staleTime: 30 * 1000,
  });
}

// ── Penalty / Interest helpers ──

function rateFromPolicy(defaults: ResolvedVariable[], key: string, fallback = 0): number {
  const found = defaults.find(d => d.variable_key === key && !d.unresolved);
  if (!found) return fallback;
  const raw = Number(found.value);
  if (!isFinite(raw) || raw <= 0) return fallback;
  // Normalise — values like 5 or 5.0 are percentages, 0.05 is a fraction.
  return raw > 1 ? raw / 100 : raw;
}

export function computePenaltyFromPolicy(
  defaults: ResolvedVariable[],
  fundCode: string,
  shortfall: number,
  monthsLate: number,
): number {
  if (shortfall <= 0) return 0;
  const monthly = rateFromPolicy(defaults, 'additional_rate_per_month');
  let initial = 0;
  switch ((fundCode || '').toUpperCase()) {
    case 'LV': initial = rateFromPolicy(defaults, 'levy_penalty_initial_rate'); break;
    case 'SV': initial = rateFromPolicy(defaults, 'severance_penalty_rate'); break;
    default: initial = rateFromPolicy(defaults, 'ss_fine_initial_rate'); break;
  }
  return shortfall * initial + shortfall * monthly * monthsLate;
}

export function computeInterestFromPolicy(
  defaults: ResolvedVariable[],
  shortfall: number,
  monthsLate: number,
): number {
  if (shortfall <= 0 || monthsLate <= 0) return 0;
  const annual = rateFromPolicy(defaults, 'interest_rate');
  return shortfall * annual * (monthsLate / 12);
}
