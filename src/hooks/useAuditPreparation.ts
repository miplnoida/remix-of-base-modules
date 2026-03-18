import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// ============= PREPARATION CHECKLISTS =============
export function usePreparationChecklists(departmentAuditId?: string, engagementId?: string) {
  return useQuery({
    queryKey: ['ia_preparation_checklists', departmentAuditId, engagementId],
    queryFn: async () => {
      let q = supabase.from('ia_preparation_checklists' as any).select('*').order('sort_order');
      if (engagementId) q = q.eq('engagement_id', engagementId);
      else if (departmentAuditId) q = q.eq('department_audit_id', departmentAuditId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!(departmentAuditId || engagementId),
  });
}

export function usePreparationChecklistMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationFn: async (item: any) => {
      const { data, error } = await supabase.from('ia_preparation_checklists' as any).insert(item).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_preparation_checklists'] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from('ia_preparation_checklists' as any).update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_preparation_checklists'] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ia_preparation_checklists' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_preparation_checklists'] });
      toast({ title: 'Checklist item removed' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { create, update, remove };
}

// ============= PREPARATION DOCUMENTS =============
export function usePreparationDocuments(departmentAuditId?: string, engagementId?: string) {
  return useQuery({
    queryKey: ['ia_preparation_documents', departmentAuditId, engagementId],
    queryFn: async () => {
      let q = supabase.from('ia_preparation_documents' as any).select('*').order('created_at', { ascending: false });
      if (engagementId) q = q.eq('engagement_id', engagementId);
      else if (departmentAuditId) q = q.eq('department_audit_id', departmentAuditId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!(departmentAuditId || engagementId),
  });
}

export function usePreparationDocumentMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationFn: async (doc: any) => {
      const { data, error } = await supabase.from('ia_preparation_documents' as any).insert(doc).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_preparation_documents'] });
      toast({ title: 'Document added' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ia_preparation_documents' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_preparation_documents'] });
      toast({ title: 'Document removed' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { create, remove };
}
