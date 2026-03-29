import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useIAAuditReports() {
  return useQuery({
    queryKey: ['ia_audit_reports'],
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await supabase
        .from('ia_audit_reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useIAAuditReportMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationKey: ['InternalAudit', 'ia_audit_reports', 'update'],
    mutationFn: async (report: any) => {
      const { data, error } = await supabase.from('ia_audit_reports').insert(report).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_audit_reports'] });
      toast({ title: 'Report Created' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationKey: ['InternalAudit', 'ia_audit_reports', 'create'],
    mutationFn: async ({ id, ...u }: { id: string; [k: string]: any }) => {
      const { data, error } = await supabase.from('ia_audit_reports').update(u).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_audit_reports'] });
      toast({ title: 'Report Updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationKey: ['InternalAudit', 'ia_audit_reports', 'update'],
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ia_audit_reports').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_audit_reports'] });
      toast({ title: 'Report Deleted' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { create, update, remove };
}
