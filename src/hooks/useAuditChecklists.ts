import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useAuditChecklists(auditId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['ia_audit_checklists', auditId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_audit_checklists' as any)
        .select('*')
        .eq('audit_id', auditId!)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!auditId,
  });

  const create = useMutation({
    mutationKey: ['InternalAudit', 'ia_audit_checklists', 'create'],
    mutationFn: async (record: any) => {
      const { data, error } = await supabase
        .from('ia_audit_checklists' as any)
        .insert({ ...record, audit_id: auditId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_audit_checklists', auditId] });
      toast({ title: 'Checklist item added' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationKey: ['InternalAudit', 'ia_audit_checklists', 'create'],
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('ia_audit_checklists' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_audit_checklists', auditId] });
      toast({ title: 'Checklist item updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const archive = useMutation({
    mutationKey: ['InternalAudit', 'ia_audit_checklists', 'update'],
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ia_audit_checklists' as any)
        .update({ is_active: false } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_audit_checklists', auditId] });
      toast({ title: 'Checklist item removed' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { ...query, create, update, archive };
}
