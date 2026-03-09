/**
 * CRUD hooks for Phase 2+ Internal Audit modules.
 * Follows the same pattern as useAuditData.ts
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// ============= Generic helper =============
function useIACrud<T extends Record<string, any>>(
  table: string,
  queryKey: string,
  options?: { orderBy?: string; activeFilter?: boolean }
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const orderBy = options?.orderBy || 'created_at';
  const activeFilter = options?.activeFilter !== false;

  const query = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      let q = supabase.from(table as any).select('*');
      if (activeFilter) q = q.eq('is_active', true);
      q = q.order(orderBy, { ascending: false });
      const { data, error } = await q;
      if (error) throw error;
      return (data as unknown) as T[];
    },
  });

  const create = useMutation({
    mutationFn: async (record: Partial<T>) => {
      const { data, error } = await supabase.from(table as any).insert(record as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast({ title: 'Created', description: 'Record created successfully' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string;[key: string]: any }) => {
      const { data, error } = await supabase.from(table as any).update(updates as any).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast({ title: 'Updated', description: 'Record updated successfully' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const archive = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table as any).update({ is_active: false } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast({ title: 'Archived', description: 'Record archived successfully' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { ...query, create, update, archive };
}

// ============= AUDIT UNIVERSE =============
export function useIAAuditUniverse() {
  return useIACrud('ia_audit_universe', 'ia_audit_universe', { orderBy: 'entity_name' });
}

// ============= RISK ASSESSMENTS =============
export function useIARiskAssessments() {
  return useIACrud('ia_risk_assessments', 'ia_risk_assessments');
}

export function useIARiskAssessmentFactors(assessmentId?: string) {
  return useQuery({
    queryKey: ['ia_risk_assessment_factors', assessmentId],
    queryFn: async () => {
      let q = supabase.from('ia_risk_assessment_factors' as any).select('*');
      if (assessmentId) q = q.eq('assessment_id', assessmentId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!assessmentId,
  });
}

export function useIARiskScoringModels() {
  return useIACrud('ia_risk_scoring_models', 'ia_risk_scoring_models');
}

// ============= ENGAGEMENTS =============
export function useIAEngagements() {
  return useIACrud('ia_audit_engagements', 'ia_audit_engagements');
}

// ============= AUDIT PROGRAMS =============
export function useIAAuditPrograms() {
  return useIACrud('ia_audit_programs', 'ia_audit_programs');
}

export function useIAAuditProcedures(programId?: string) {
  return useQuery({
    queryKey: ['ia_audit_procedures', programId],
    queryFn: async () => {
      let q = supabase.from('ia_audit_procedures' as any).select('*').order('sort_order');
      if (programId) q = q.eq('audit_program_id', programId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!programId,
  });
}

// ============= RCM =============
export function useIARCMProcesses() {
  return useIACrud('ia_rcm_processes', 'ia_rcm_processes', { orderBy: 'process_name' });
}

export function useIARCMRisks(processId?: string) {
  return useQuery({
    queryKey: ['ia_rcm_risks', processId],
    queryFn: async () => {
      let q = supabase.from('ia_rcm_risks' as any).select('*').eq('is_active', true);
      if (processId) q = q.eq('process_id', processId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useIARCMControls(riskId?: string) {
  return useQuery({
    queryKey: ['ia_rcm_controls', riskId],
    queryFn: async () => {
      let q = supabase.from('ia_rcm_controls' as any).select('*').eq('is_active', true);
      if (riskId) q = q.eq('risk_id', riskId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

// ============= CONTROL TESTING =============
export function useIAControlTests() {
  return useIACrud('ia_control_tests', 'ia_control_tests');
}

// ============= TIME TRACKING =============
export function useIATimeLogs() {
  return useIACrud('ia_time_logs', 'ia_time_logs', { orderBy: 'work_date' });
}

// ============= QUALITY REVIEW =============
export function useIAQualityReviews() {
  return useIACrud('ia_quality_reviews', 'ia_quality_reviews');
}

// ============= SLA RULES =============
export function useIASLARules() {
  return useIACrud('ia_sla_rules', 'ia_sla_rules');
}

// ============= ACTION PLAN MILESTONES =============
export function useIAActionPlanMilestones(actionId?: string) {
  return useQuery({
    queryKey: ['ia_action_plan_milestones', actionId],
    queryFn: async () => {
      let q = supabase.from('ia_action_plan_milestones' as any).select('*').order('target_date');
      if (actionId) q = q.eq('action_id', actionId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}
