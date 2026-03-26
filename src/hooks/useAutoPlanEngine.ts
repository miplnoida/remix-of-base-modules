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
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
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

  const updateWeight = useMutation({
    mutationFn: async (params: { id: string; weight: number; change_reason?: string; updated_by?: string }) => {
      const { error } = await supabase
        .from('ia_planning_scoring_weights' as any)
        .update({
          weight: params.weight,
          change_reason: params.change_reason || null,
          updated_by: params.updated_by || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_planning_scoring_weights'] });
      toast({ title: 'Weight Updated', description: 'Planning weight saved successfully.' });
    },
    onError: (e: any) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  return { ...query, updateWeight };
}

export function useFrequencyPolicies() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
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

  const updatePolicy = useMutation({
    mutationFn: async (params: { id: string; max_months_between_audits: number; change_reason?: string; updated_by?: string }) => {
      const { error } = await supabase
        .from('ia_risk_band_frequency_policy' as any)
        .update({
          max_months_between_audits: params.max_months_between_audits,
          change_reason: params.change_reason || null,
          updated_by: params.updated_by || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_risk_band_frequency_policy'] });
      toast({ title: 'Policy Updated', description: 'Frequency policy saved successfully.' });
    },
    onError: (e: any) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  return { ...query, updatePolicy };
}

export function usePlanningParameters() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['ia_planning_parameters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_planning_parameters' as any)
        .select('*')
        .eq('is_active', true)
        .order('parameter_group', { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const updateParam = useMutation({
    mutationFn: async (params: { id: string; value_json: any; change_reason: string; updated_by: string }) => {
      // Get current version
      const { data: current } = await supabase
        .from('ia_planning_parameters' as any)
        .select('version_no')
        .eq('id', params.id)
        .single();

      const { error } = await supabase
        .from('ia_planning_parameters' as any)
        .update({
          value_json: params.value_json,
          change_reason: params.change_reason,
          updated_by: params.updated_by,
          version_no: ((current as any)?.version_no || 1) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_planning_parameters'] });
      toast({ title: 'Parameter Updated', description: 'Planning parameter saved.' });
    },
    onError: (e: any) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  return { ...query, updateParam };
}

export function useScoreExplanations(planId?: string, candidateId?: string) {
  return useQuery({
    queryKey: ['ia_planning_score_explanations', planId, candidateId],
    queryFn: async () => {
      let query = supabase
        .from('ia_planning_score_explanations' as any)
        .select('*')
        .eq('plan_id', planId!);
      if (candidateId) {
        query = query.eq('candidate_id', candidateId);
      }
      const { data, error } = await query.order('final_composite_score', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!planId,
  });
}

export function useResourceRecommendations(planId?: string, candidateId?: string) {
  return useQuery({
    queryKey: ['ia_resource_recommendations', planId, candidateId],
    queryFn: async () => {
      let query = supabase
        .from('ia_resource_recommendations' as any)
        .select('*')
        .eq('plan_id', planId!);
      if (candidateId) {
        query = query.eq('candidate_id', candidateId);
      }
      const { data, error } = await query.order('recommendation_rank', { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!planId,
  });
}

export function useGenerateResourceRecommendations(planId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (candidateId?: string) => {
      const { data, error } = await supabase.rpc('ia_generate_resource_recommendations' as any, {
        p_plan_id: planId,
        p_candidate_id: candidateId || null,
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['ia_resource_recommendations', planId] });
      toast({
        title: 'Recommendations Generated',
        description: `${result?.recommendations_generated || 0} resource recommendations created.`,
      });
    },
    onError: (e: any) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });
}

export function useCheckDataReadiness() {
  return useMutation({
    mutationFn: async (planId?: string) => {
      const { data, error } = await supabase.rpc('ia_check_data_readiness' as any, {
        p_plan_id: planId || null,
      });
      if (error) throw error;
      return data as any;
    },
  });
}

export function useWizardState(planId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['ia_planning_wizard_state', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_planning_wizard_state' as any)
        .select('*')
        .eq('plan_id', planId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!planId,
  });

  const upsertState = useMutation({
    mutationFn: async (params: { plan_id: string; current_step: number; step_data?: any; data_readiness?: any; parameter_profile?: string; is_complete?: boolean; updated_by?: string }) => {
      const { data: existing } = await supabase
        .from('ia_planning_wizard_state' as any)
        .select('id')
        .eq('plan_id', params.plan_id)
        .maybeSingle();

      if ((existing as any)?.id) {
        const { error } = await supabase
          .from('ia_planning_wizard_state' as any)
          .update({
            current_step: params.current_step,
            step_data: params.step_data || {},
            data_readiness: params.data_readiness || {},
            parameter_profile: params.parameter_profile || 'global',
            is_complete: params.is_complete || false,
            updated_by: params.updated_by,
            updated_at: new Date().toISOString(),
          })
          .eq('id', (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ia_planning_wizard_state' as any)
          .insert({
            plan_id: params.plan_id,
            current_step: params.current_step,
            step_data: params.step_data || {},
            data_readiness: params.data_readiness || {},
            parameter_profile: params.parameter_profile || 'global',
            is_complete: params.is_complete || false,
            created_by: params.updated_by,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_planning_wizard_state', planId] });
    },
  });

  return { ...query, upsertState };
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
      queryClient.invalidateQueries({ queryKey: ['ia_planning_score_explanations', planId] });
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
