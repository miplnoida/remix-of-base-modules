import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PendingHolidayPay {
  id: string;
  ssn: string;
  amount: number;
  source_c3_period: string;
  holiday_date_from: string | null;
  holiday_date_to: string | null;
  status: string;
}

export interface HolidayPolicyInfo {
  id: string;
  policyType: string;
  source: string;
  levyInclude: boolean;
  levyMethod: string;
  sscInclude: boolean;
}

/**
 * Hook to fetch pending holiday pay for a given SSN and period.
 */
export function usePendingHolidayPay(ssn: string, periodYear: number, periodMonth: number) {
  const [pendingPay, setPendingPay] = useState<PendingHolidayPay[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalPending, setTotalPending] = useState(0);

  const fetch = useCallback(async () => {
    if (!ssn || ssn.length < 6) {
      setPendingPay([]);
      setTotalPending(0);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_pending_holiday_pay', {
        p_ssn: ssn,
        p_target_year: periodYear,
        p_target_month: periodMonth + 1 // convert 0-indexed to 1-indexed
      });

      if (!error && data) {
        const records = typeof data === 'string' ? JSON.parse(data) : data;
        const arr = Array.isArray(records) ? records : [];
        setPendingPay(arr);
        setTotalPending(arr.reduce((sum: number, r: PendingHolidayPay) => sum + (r.amount || 0), 0));
      } else {
        setPendingPay([]);
        setTotalPending(0);
      }
    } catch {
      setPendingPay([]);
      setTotalPending(0);
    } finally {
      setIsLoading(false);
    }
  }, [ssn, periodYear, periodMonth]);

  // Auto-fetch when SSN changes
  const prevKey = useRef('');
  useEffect(() => {
    const key = `${ssn}-${periodYear}-${periodMonth}`;
    if (key !== prevKey.current && ssn.length >= 6) {
      prevKey.current = key;
      fetch();
    }
  }, [ssn, periodYear, periodMonth, fetch]);

  return { pendingPay, totalPending, isLoading, refetch: fetch };
}

/**
 * Hook to create pending holiday pay records for future periods.
 */
export function useCreatePendingHolidayPay() {
  const [isCreating, setIsCreating] = useState(false);

  const create = useCallback(async (params: {
    ssn: string;
    amount: number;
    sourceC3Period: string;
    targetYear: number;
    targetMonth: number; // 1-indexed
    holidayDateFrom?: string;
    holidayDateTo?: string;
    createdBy?: string;
  }) => {
    setIsCreating(true);
    try {
      const { data, error } = await supabase.rpc('create_pending_holiday_pay', {
        p_ssn: params.ssn,
        p_amount: params.amount,
        p_source_c3_period: params.sourceC3Period,
        p_target_year: params.targetYear,
        p_target_month: params.targetMonth,
        p_holiday_date_from: params.holidayDateFrom || null,
        p_holiday_date_to: params.holidayDateTo || null,
        p_created_by: params.createdBy || null
      });

      if (error) throw error;
      return data; // returns UUID
    } catch (err) {
      console.error('Failed to create pending holiday pay:', err);
      return null;
    } finally {
      setIsCreating(false);
    }
  }, []);

  return { create, isCreating };
}

/**
 * Hook to mark pending holiday pay records as applied.
 */
export function useApplyPendingHolidayPay() {
  const [isApplying, setIsApplying] = useState(false);

  const apply = useCallback(async (pendingIds: string[], appliedBy?: string) => {
    if (!pendingIds.length) return;
    setIsApplying(true);
    try {
      const { error } = await supabase.rpc('apply_pending_holiday_pay', {
        p_pending_ids: pendingIds,
        p_applied_by: appliedBy || null
      });
      if (error) throw error;
    } catch (err) {
      console.error('Failed to apply pending holiday pay:', err);
    } finally {
      setIsApplying(false);
    }
  }, []);

  return { apply, isApplying };
}
