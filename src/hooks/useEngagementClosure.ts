import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuditFields } from '@/hooks/useAuditTrail';

export function useEngagementClosure(engagementId?: string) {
  return useQuery({
    queryKey: ['ia_engagement_closure', engagementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_engagement_closure' as any)
        .select('*')
        .eq('engagement_id', engagementId!)
        .maybeSingle();
      if (error) throw error;
      return data as any | null;
    },
    enabled: !!engagementId,
  });
}

export function useEngagementClosureMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { getCreateFields, getUpdateFields } = useAuditFields();

  const upsert = useMutation({
    mutationKey: ['InternalAudit', 'ia_audit_closure', 'create'],
    mutationFn: async (record: any) => {
      // Check if closure record exists
      const { data: existing } = await supabase
        .from('ia_engagement_closure' as any)
        .select('id')
        .eq('engagement_id', record.engagement_id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('ia_engagement_closure' as any)
          .update({ ...record, ...getUpdateFields() })
          .eq('id', (existing as any).id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('ia_engagement_closure' as any)
          .insert({ ...record, ...getCreateFields() })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ia_engagement_closure'] });
      toast({ title: 'Closure Updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { upsert };
}

/**
 * Hook to update the lifecycle_status on the engagement itself.
 */
export function useEngagementLifecycle() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { getUpdateFields } = useAuditFields();

  const transition = useMutation({
    mutationKey: ['InternalAudit', 'ia_audit_closure', 'update'],
    mutationFn: async ({ engagementId, status }: { engagementId: string; status: string }) => {
      const { data, error } = await supabase
        .from('ia_audit_engagements' as any)
        .update({ lifecycle_status: status, ...getUpdateFields() } as any)
        .eq('id', engagementId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['ia_audit_engagements'] });
      toast({ title: `Status: ${vars.status}`, description: 'Engagement lifecycle updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { transition };
}
