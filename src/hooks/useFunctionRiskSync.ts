/**
 * Auto-sync hook: rewrites ia_department_functions.risk_rating using the
 * currently-configured Risk Engine (formula + bands from /audit/risk-settings).
 *
 * Used when an admin changes the Formula or Risk Bands so all stored values
 * stay consistent with what the live engine produces. After functions are
 * resynced, departments are also resynced via useDepartmentRiskSync.
 *
 * No DB triggers (project policy: role-based security only). All in app layer.
 */
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRiskRatingCalculator } from '@/hooks/useRiskConfig';
import { useDepartmentRiskSync } from '@/hooks/useDepartmentRiskSync';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

const PAGE_SIZE = 1000;

export function useFunctionRiskSync() {
  const queryClient = useQueryClient();
  const { calculateFunctionRiskScore, getRiskRating } = useRiskRatingCalculator();
  const { recomputeAll: recomputeAllDepts } = useDepartmentRiskSync();
  const { profile } = useSupabaseAuth();
  const userCode = (profile as any)?.user_code || '';

  const recomputeAllFunctions = useCallback(async (): Promise<{ functionsUpdated: number; departmentsTouched: number }> => {
    let from = 0;
    let updated = 0;
    // Page through ia_department_functions in 1k chunks (project pagination standard)
    // and rewrite risk_rating where the live engine yields a different label.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data, error } = await supabase
        .from('ia_department_functions')
        .select('id, likelihood, impact, risk_rating')
        .eq('is_active', true)
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;

      for (const fn of data) {
        const score = calculateFunctionRiskScore(fn.likelihood || 'Medium', fn.impact || 'Medium');
        const newLabel = getRiskRating(score).label;
        if (!newLabel || newLabel === fn.risk_rating) continue;
        const { error: upErr } = await supabase
          .from('ia_department_functions')
          .update({ risk_rating: newLabel, updated_by: userCode })
          .eq('id', fn.id);
        if (!upErr) updated += 1;
      }

      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    // Cascade: department ratings derive from functions, so resync them.
    await recomputeAllDepts();

    queryClient.invalidateQueries({ queryKey: ['ia_department_functions'] });
    queryClient.invalidateQueries({ queryKey: ['ia_departments'] });
    queryClient.invalidateQueries({ queryKey: ['ia_departments_all'] });

    // Count touched depts for the toast caller
    const { count } = await supabase
      .from('ia_departments')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);

    return { functionsUpdated: updated, departmentsTouched: count || 0 };
  }, [calculateFunctionRiskScore, getRiskRating, recomputeAllDepts, queryClient, userCode]);

  return { recomputeAllFunctions };
}
