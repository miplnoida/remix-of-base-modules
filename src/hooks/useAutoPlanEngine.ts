import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useAutoPlanCandidates(planId?: string) {
  return useQuery({
    queryKey: ['ia_auto_plan_candidates', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_auto_plan_candidates' as any)
        .select('*')
        .eq('plan_id', planId!)
        .order('rank_position', { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!planId,
  });
}

export function usePlanningWeights() {
  return useQuery({
    queryKey: ['ia_planning_scoring_weights'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_planning_scoring_weights' as any)
        .select('*')
        .eq('is_active', true)
        .order('factor_key');
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useFrequencyPolicies() {
  return useQuery({
    queryKey: ['ia_risk_band_frequency_policy'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_risk_band_frequency_policy' as any)
        .select('*')
        .eq('is_active', true)
        .order('max_months_between_audits');
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useGenerateAutoPlan(planId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('ia_generate_auto_plan_candidates' as any, {
        p_plan_id: planId,
        p_fiscal_year: null,
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['ia_auto_plan_candidates', planId] });
      toast({
        title: 'Auto-Plan Generated',
        description: `${result?.candidates_generated || 0} candidates scored and ranked.`,
      });
    },
    onError: (e: any) => {
      toast({ title: 'Generation Failed', description: e.message, variant: 'destructive' });
    },
  });
}

export function useManualOverride(planId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      override_type: string;
      engagement_id?: string;
      candidate_id?: string;
      changes?: any;
      reason: string;
      changed_by: string;
    }) => {
      const { data, error } = await supabase.rpc('ia_apply_manual_override' as any, {
        p_plan_id: planId,
        p_override_type: params.override_type,
        p_engagement_id: params.engagement_id || null,
        p_candidate_id: params.candidate_id || null,
        p_changes: params.changes || {},
        p_reason: params.reason,
        p_changed_by: params.changed_by,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_auto_plan_candidates', planId] });
      queryClient.invalidateQueries({ queryKey: ['ia_plan_engagements', planId] });
      queryClient.invalidateQueries({ queryKey: ['ia_plan_change_log', planId] });
      toast({ title: 'Override Applied', description: 'The manual override has been recorded.' });
    },
    onError: (e: any) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });
}

export function useCapacitySchedule(planId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('ia_capacity_schedule_candidates' as any, {
        p_plan_id: planId,
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['ia_auto_plan_candidates', planId] });
      toast({
        title: 'Capacity Scheduled',
        description: `${result?.assigned || 0} candidates assigned to auditor slots. ${result?.conflicts_detected || 0} conflicts detected.`,
      });
    },
    onError: (e: any) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });
}

export function useConvertCandidates(planId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (createdBy: string) => {
      const { data, error } = await supabase.rpc('ia_convert_candidates_to_engagements' as any, {
        p_plan_id: planId,
        p_created_by: createdBy,
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['ia_auto_plan_candidates', planId] });
      queryClient.invalidateQueries({ queryKey: ['ia_plan_engagements', planId] });
      queryClient.invalidateQueries({ queryKey: ['ia_annual_plans'] });
      toast({
        title: 'Engagements Created',
        description: `${result?.engagements_created || 0} engagements created from accepted candidates.`,
      });
    },
    onError: (e: any) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });
}

export function useAvailabilityConflicts(planId?: string) {
  return useQuery({
    queryKey: ['ia_availability_conflicts', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_availability_conflicts' as any)
        .select('*')
        .eq('plan_id', planId!)
        .order('detected_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!planId,
  });
}
