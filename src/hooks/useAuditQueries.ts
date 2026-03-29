import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useIAAuditQueries(engagementId?: string) {
  return useQuery({
    queryKey: ['ia_audit_queries', engagementId],
    queryFn: async () => {
      let q = supabase
        .from('ia_audit_queries' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (engagementId) q = q.eq('engagement_id', engagementId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export function useIAAuditQueryMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationKey: ['InternalAudit', 'ia_audit_queries', 'create'],
    mutationFn: async (record: {
      engagement_id: string;
      department_id?: string;
      question: string;
      requested_document?: string;
      requested_by?: string;
      status?: string;
    }) => {
      const { data, error } = await supabase
        .from('ia_audit_queries' as any)
        .insert({ ...record, status: record.status || 'Pending' } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_audit_queries'] });
      toast({ title: 'Query Sent', description: 'Query sent to department' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationKey: ['InternalAudit', 'ia_audit_queries', 'update'],
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('ia_audit_queries' as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_audit_queries'] });
      toast({ title: 'Query Updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { create, update };
}
