/**
 * Auto-sync hook: derives ia_departments.risk_rating from the risk ratings
 * of its child ia_department_functions, using the same engine that drives
 * the dept badge on /audit/functions.
 *
 * No DB triggers (project policy: role-based security only). All sync logic
 * runs in the app layer and is invoked from function mutation success
 * handlers and a one-pass reconciliation on the Departments page.
 */
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRiskRatingCalculator } from '@/hooks/useRiskConfig';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

// Map any engine label (incl. 'Critical', 'N/A') to the 3 values stored today.
function normalizeRatingLabel(label: string): 'High' | 'Medium' | 'Low' | null {
  if (!label) return null;
  const l = label.toLowerCase();
  if (l === 'critical' || l === 'high') return 'High';
  if (l === 'medium') return 'Medium';
  if (l === 'low') return 'Low';
  return null; // e.g. 'N/A' — leave existing value untouched
}

export function useDepartmentRiskSync() {
  const queryClient = useQueryClient();
  const { calculateDeptRisk } = useRiskRatingCalculator();
  const { profile } = useSupabaseAuth();
  const userCode = (profile as any)?.user_code || '';

  const recomputeOne = useCallback(async (departmentId: string) => {
    if (!departmentId) return;

    // Load current functions for this department
    const { data: fns, error: fnErr } = await supabase
      .from('ia_department_functions')
      .select('likelihood, impact, weight_percentage')
      .eq('department_id', departmentId)
      .eq('is_active', true);
    if (fnErr) throw fnErr;

    if (!fns || fns.length === 0) {
      // No functions → leave the stored rating untouched.
      return;
    }

    const result = calculateDeptRisk(fns as any);
    const newRating = normalizeRatingLabel(result.label);
    if (!newRating) return;

    // Read current to avoid no-op writes
    const { data: dept, error: deptErr } = await supabase
      .from('ia_departments')
      .select('risk_rating')
      .eq('id', departmentId)
      .single();
    if (deptErr) throw deptErr;
    if (dept?.risk_rating === newRating) return;

    const { error: upErr } = await supabase
      .from('ia_departments')
      .update({ risk_rating: newRating, updated_by: userCode })
      .eq('id', departmentId);
    if (upErr) throw upErr;

    queryClient.invalidateQueries({ queryKey: ['ia_departments'] });
    queryClient.invalidateQueries({ queryKey: ['ia_departments_all'] });
  }, [calculateDeptRisk, queryClient, userCode]);

  const recomputeMany = useCallback(async (departmentIds: Array<string | undefined | null>) => {
    const unique = Array.from(new Set(departmentIds.filter(Boolean) as string[]));
    for (const id of unique) {
      try { await recomputeOne(id); } catch (e) { /* swallow per-dept */ }
    }
  }, [recomputeOne]);

  const recomputeAll = useCallback(async () => {
    const { data: depts, error } = await supabase
      .from('ia_departments')
      .select('id')
      .eq('is_active', true);
    if (error) throw error;
    await recomputeMany((depts || []).map((d: any) => d.id));
  }, [recomputeMany]);

  return { recomputeOne, recomputeMany, recomputeAll };
}
