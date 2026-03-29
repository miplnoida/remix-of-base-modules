import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useIAPlanFunctions(planId?: string) {
  return useQuery({
    queryKey: ['ia_audit_plan_functions', planId],
    queryFn: async () => {
      let q = supabase
        .from('ia_audit_plan_functions' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (planId) q = q.eq('plan_id', planId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!planId,
  });
}

export function useIAPlanFunctionMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationKey: ['InternalAudit', 'ia_audit_plan_functions', 'create'],
    mutationFn: async (record: { plan_id: string; function_id: string; risk_score?: number; risk_level?: string; priority?: string }) => {
      const { data, error } = await supabase
        .from('ia_audit_plan_functions' as any)
        .insert(record as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ia_audit_plan_functions', variables.plan_id] });
      toast({ title: 'Function Added', description: 'Function added to audit plan' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationKey: ['InternalAudit', 'ia_audit_plan_functions', 'create'],
    mutationFn: async ({ id, planId }: { id: string; planId: string }) => {
      const { error } = await supabase
        .from('ia_audit_plan_functions' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
      return planId;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ia_audit_plan_functions', variables.planId] });
      toast({ title: 'Function Removed', description: 'Function removed from audit plan' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { create, remove };
}
