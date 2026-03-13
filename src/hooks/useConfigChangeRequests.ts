import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useConfigChangeRequests(status?: string) {
  return useQuery({
    queryKey: ['ia_config_change_requests', status],
    queryFn: async (): Promise<any[]> => {
      let query = (supabase.from('ia_config_change_requests' as any).select('*') as any)
        .order('created_at', { ascending: false });
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useConfigChangeRequestMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationFn: async (data: { config_type: string; field_changed: string; old_value?: string; new_value: string; requested_by?: string; reason?: string }) => {
      const { data: result, error } = await (supabase.from('ia_config_change_requests' as any).insert(data as any).select().single() as any);
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_config_change_requests'] });
      toast({ title: 'Change Request Submitted', description: 'Your configuration change request has been submitted for approval.' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const review = useMutation({
    mutationFn: async (data: { id: string; status: 'Approved' | 'Rejected'; approved_by: string }) => {
      const { data: result, error } = await (supabase.from('ia_config_change_requests' as any).update({
        status: data.status,
        approved_by: data.approved_by,
        reviewed_at: new Date().toISOString(),
      } as any).eq('id', data.id).select().single() as any);
      if (error) throw error;
      return result;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['ia_config_change_requests'] });
      toast({ title: `Request ${vars.status}`, description: `The configuration change has been ${vars.status.toLowerCase()}.` });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { create, review };
}
