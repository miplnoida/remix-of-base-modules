import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseBiweeklyEnabledWeeksResult {
  enabledWeeks: boolean[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch valid bi-weekly payment weeks from the backend.
 * Uses ISO week numbers: only even-numbered weeks (2,4,6,...,52) are valid.
 * @param year - Full year (e.g. 2025)
 * @param month - 0-indexed month (0 = January)
 */
export function useBiweeklyEnabledWeeks(
  year: number | null,
  month: number | null
): UseBiweeklyEnabledWeeksResult {
  const [enabledWeeks, setEnabledWeeks] = useState<boolean[]>([false, false, false, false, false]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeeks = useCallback(async () => {
    if (year === null || month === null || isNaN(year) || isNaN(month)) {
      setEnabledWeeks([false, false, false, false, false]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_biweekly_enabled_weeks', {
        p_year: year,
        p_month: month + 1 // Convert 0-indexed to 1-indexed
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      if (Array.isArray(data) && data.length === 5) {
        setEnabledWeeks(data as boolean[]);
      } else {
        setEnabledWeeks([false, false, false, false, false]);
      }
    } catch (err) {
      console.error('Error fetching bi-weekly enabled weeks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch bi-weekly weeks');
      setEnabledWeeks([false, false, false, false, false]);
    } finally {
      setIsLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchWeeks();
  }, [fetchWeeks]);

  return { enabledWeeks, isLoading, error, refetch: fetchWeeks };
}

/**
 * Validate a specific week slot for bi-weekly payment via backend.
 * Returns validation result with ISO week number and error message if invalid.
 */
export async function validateBiweeklyWeek(
  year: number,
  month: number, // 0-indexed
  weekIndex: number // 0-indexed Monday index
): Promise<{ valid: boolean; iso_week: number | null; error: string | null }> {
  try {
    const { data, error: rpcError } = await supabase.rpc('validate_biweekly_week', {
      p_year: year,
      p_month: month + 1,
      p_week_index: weekIndex
    });

    if (rpcError) throw new Error(rpcError.message);

    const result = data as any;
    return {
      valid: result?.valid ?? false,
      iso_week: result?.iso_week ?? null,
      error: result?.error ?? null
    };
  } catch (err) {
    return {
      valid: false,
      iso_week: null,
      error: err instanceof Error ? err.message : 'Validation failed'
    };
  }
}
