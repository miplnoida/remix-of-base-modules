import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useIAAuditClosure(engagementId?: string) {
  return useQuery({
    queryKey: ['ia_audit_closure', engagementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_audit_closure' as any)
        .select('*')
        .eq('engagement_id', engagementId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!engagementId,
  });
}

export function useIAAuditClosureMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const upsert = useMutation({
    mutationFn: async (record: {
      engagement_id: string;
      closure_summary?: string;
      lessons_learned?: string;
      approved_by?: string;
      closure_date?: string;
      status?: string;
    }) => {
      const { data, error } = await supabase
        .from('ia_audit_closure' as any)
        .upsert(
          { ...record, updated_at: new Date().toISOString() } as any,
          { onConflict: 'engagement_id' }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ia_audit_closure', variables.engagement_id] });
      toast({ title: 'Closure Updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { upsert };
}
