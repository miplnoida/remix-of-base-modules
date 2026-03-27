import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// ============= PLAN ARTIFACTS =============
export function useIAPlanArtifacts(planId?: string) {
  return useQuery({
    queryKey: ['ia_plan_artifacts', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_plan_artifacts' as any)
        .select('*')
        .eq('plan_id', planId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!planId,
  });
}

export function useIAPlanArtifactMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationFn: async (artifact: any) => {
      const { data, error } = await supabase
        .from('ia_plan_artifacts' as any)
        .insert(artifact)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ia_plan_artifacts', variables.plan_id] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('ia_plan_artifacts' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_plan_artifacts'] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { create, update };
}

// ============= DISTRIBUTION LOGS =============
export function useIAPlanDistributionLogs(planId?: string) {
  return useQuery({
    queryKey: ['ia_plan_distribution_logs', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_plan_distribution_logs' as any)
        .select('*')
        .eq('plan_id', planId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!planId,
  });
}

export function useIAPlanDistributionLogMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationFn: async (log: any) => {
      const { data, error } = await supabase
        .from('ia_plan_distribution_logs' as any)
        .insert(log)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ia_plan_distribution_logs', variables.plan_id] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { create };
}
