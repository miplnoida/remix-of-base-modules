import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HolidayPolicyLookupResult {
  // Default policy
  defaultPolicyFound: boolean;
  defaultPolicyId: string | null;
  defaultPolicyType: string | null;
  defaultPolicyLoading: boolean;
  defaultPolicyError: string | null;

  // Exception policy
  exceptionPolicyFound: boolean;
  exceptionPolicyId: string | null;
  exceptionPolicyType: string | null;
  exceptionPolicyLoading: boolean;
  exceptionPolicyError: string | null;

  // Validation
  holidayValidationError: string | null;
  canSaveHoliday: boolean;
}

/**
 * Looks up active holiday pay default policy and exception policy from the database
 * based on the "no dates" checkbox state, period, and whether holiday is enabled.
 */
export function useHolidayPolicyLookup(
  periodYear: number,
  periodMonth: number, // 0-indexed
  holidayEnabled: boolean,
  holidayNoDates: boolean,
  holidayStartDate: string,
  holidayEndDate: string,
  holidayAmount: number
): HolidayPolicyLookupResult {
  const [defaultPolicyFound, setDefaultPolicyFound] = useState(false);
  const [defaultPolicyId, setDefaultPolicyId] = useState<string | null>(null);
  const [defaultPolicyType, setDefaultPolicyType] = useState<string | null>(null);
  const [defaultPolicyLoading, setDefaultPolicyLoading] = useState(false);
  const [defaultPolicyError, setDefaultPolicyError] = useState<string | null>(null);

  const [exceptionPolicyFound, setExceptionPolicyFound] = useState(false);
  const [exceptionPolicyId, setExceptionPolicyId] = useState<string | null>(null);
  const [exceptionPolicyType, setExceptionPolicyType] = useState<string | null>(null);
  const [exceptionPolicyLoading, setExceptionPolicyLoading] = useState(false);
  const [exceptionPolicyError, setExceptionPolicyError] = useState<string | null>(null);

  const prevKeyRef = useRef('');

  const requiredPolicyType = holidayNoDates ? 'without_dates' : 'with_dates';

  // Compute validation error
  let holidayValidationError: string | null = null;
  let canSaveHoliday = true;

  if (holidayEnabled && holidayAmount > 0) {
    if (!holidayNoDates && !holidayStartDate && !holidayEndDate) {
      holidayValidationError = 'Holiday dates are required when "Holiday pay does not belong to any dates" is unchecked.';
      canSaveHoliday = false;
    } else if (defaultPolicyLoading) {
      // Still loading, don't block yet but don't clear error
      canSaveHoliday = false;
    } else if (!defaultPolicyFound) {
      holidayValidationError = `No active holiday pay policy is configured for "${requiredPolicyType === 'with_dates' ? 'With Dates' : 'Without Dates'}" for the selected period.`;
      canSaveHoliday = false;
    }
  }

  const lookupPolicies = useCallback(async () => {
    if (!holidayEnabled || holidayAmount <= 0) {
      setDefaultPolicyFound(false);
      setDefaultPolicyId(null);
      setDefaultPolicyType(null);
      setDefaultPolicyError(null);
      setExceptionPolicyFound(false);
      setExceptionPolicyId(null);
      setExceptionPolicyType(null);
      setExceptionPolicyError(null);
      return;
    }

    const policyType = holidayNoDates ? 'without_dates' : 'with_dates';
    const periodDate = `${periodYear}-${String(periodMonth + 1).padStart(2, '0')}-01`;
    const dbMonth = periodMonth + 1; // 1-indexed

    // Lookup default policy
    setDefaultPolicyLoading(true);
    setDefaultPolicyError(null);
    try {
      const { data, error } = await supabase
        .from('c3_holiday_pay_policy_default')
        .select('id, policy_type, date_from, date_to')
        .eq('policy_type', policyType)
        .eq('is_active', true)
        .lte('date_from', periodDate)
        .order('date_from', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Filter: date_to is null (open-ended) or >= periodDate
      const matching = (data || []).filter(row => {
        if (!row.date_to) return true;
        return row.date_to >= periodDate;
      });

      if (matching.length > 0) {
        setDefaultPolicyFound(true);
        setDefaultPolicyId(matching[0].id);
        setDefaultPolicyType(matching[0].policy_type);
      } else {
        setDefaultPolicyFound(false);
        setDefaultPolicyId(null);
        setDefaultPolicyType(null);
      }
    } catch (err: any) {
      setDefaultPolicyFound(false);
      setDefaultPolicyId(null);
      setDefaultPolicyType(null);
      setDefaultPolicyError(err.message || 'Failed to lookup default holiday policy');
    } finally {
      setDefaultPolicyLoading(false);
    }

    // Lookup exception policy
    setExceptionPolicyLoading(true);
    setExceptionPolicyError(null);
    try {
      const { data, error } = await supabase
        .from('c3_holiday_pay_policy_exceptions')
        .select('id, policy_type, exception_month, year_from, year_to')
        .eq('policy_type', policyType)
        .eq('is_active', true)
        .eq('exception_month', dbMonth)
        .lte('year_from', periodYear)
        .order('year_from', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Filter: year_to is null (open-ended) or >= periodYear
      const matching = (data || []).filter(row => {
        if (!row.year_to) return true;
        return row.year_to >= periodYear;
      });

      if (matching.length > 0) {
        setExceptionPolicyFound(true);
        setExceptionPolicyId(matching[0].id);
        setExceptionPolicyType(matching[0].policy_type);
      } else {
        setExceptionPolicyFound(false);
        setExceptionPolicyId(null);
        setExceptionPolicyType(null);
      }
    } catch (err: any) {
      setExceptionPolicyFound(false);
      setExceptionPolicyId(null);
      setExceptionPolicyType(null);
      setExceptionPolicyError(err.message || 'Failed to lookup holiday pay exception');
    } finally {
      setExceptionPolicyLoading(false);
    }
  }, [holidayEnabled, holidayAmount, holidayNoDates, periodYear, periodMonth]);

  useEffect(() => {
    const key = `${holidayEnabled}-${holidayAmount}-${holidayNoDates}-${periodYear}-${periodMonth}-${holidayStartDate}-${holidayEndDate}`;
    if (key !== prevKeyRef.current) {
      prevKeyRef.current = key;
      lookupPolicies();
    }
  }, [holidayEnabled, holidayAmount, holidayNoDates, periodYear, periodMonth, holidayStartDate, holidayEndDate, lookupPolicies]);

  return {
    defaultPolicyFound,
    defaultPolicyId,
    defaultPolicyType,
    defaultPolicyLoading,
    defaultPolicyError,
    exceptionPolicyFound,
    exceptionPolicyId,
    exceptionPolicyType,
    exceptionPolicyLoading,
    exceptionPolicyError,
    holidayValidationError,
    canSaveHoliday,
  };
}
