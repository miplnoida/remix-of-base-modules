import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BonusPolicyCalcResult {
  totalWages: number;
  taxableWages: number;
  employeeSS: number;
  employeeLevy: number;
  employerSS: number;
  employerEIB: number;
  employerSSTotal: number;
  employerLevy: number;
  employerSeverance: number;
  isAgeExemptSS: boolean;
  isAgeExemptLevy: boolean;
  bonusEligible: boolean;
  policyApplied: { id: string; method: string; isException: boolean } | null;
  periodGross: number;
}

/**
 * Hook to call the server-authoritative bonus policy calculation edge function.
 * Debounces requests so rapid changes to bonus/wages don't flood the backend.
 */
export function useBonusPolicyCalculation() {
  const [result, setResult] = useState<BonusPolicyCalcResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const calculate = useCallback(
    (params: {
      periodYear: number;
      periodMonth: number;
      bonusAmount: number;
      weeklyWages: number[];
      payPeriod: string;
      dateOfBirth: string;
      termStartDate: string;
    }) => {
      // Only call if there's a bonus amount
      if (!params.bonusAmount || params.bonusAmount <= 0) {
        setResult(null);
        setError(null);
        return;
      }

      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(async () => {
        setIsCalculating(true);
        setError(null);
        try {
          const { data, error: fnError } = await supabase.functions.invoke(
            'calculate-bonus-policy',
            {
              body: {
                periodYear: params.periodYear,
                periodMonth: params.periodMonth,
                bonusAmount: params.bonusAmount,
                weeklyWages: params.weeklyWages,
                payPeriod: params.payPeriod,
                dateOfBirth: params.dateOfBirth,
                termStartDate: params.termStartDate,
              },
            }
          );

          if (fnError) {
            setError(fnError.message);
            setResult(null);
          } else if (data?.success) {
            setResult(data as BonusPolicyCalcResult);
          } else {
            setError(data?.error || 'Bonus calculation failed');
            setResult(null);
          }
        } catch (err) {
          setError((err as Error).message);
          setResult(null);
        } finally {
          setIsCalculating(false);
        }
      }, 500);
    },
    []
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  return { result, isCalculating, error, calculate, reset };
}
