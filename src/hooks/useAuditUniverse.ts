import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuditFields } from '@/hooks/useAuditTrail';

export const ENTITY_TYPES = [
  'Ministry', 'Department', 'Division', 'Programme', 'Project',
  'Fund', 'Process', 'System', 'Location', 'Agency', 'Committee', 'User/Role Domain',
] as const;

export const AUDIT_FREQUENCIES = ['Annual', 'Biannual', 'Triennial', 'Ad-hoc', 'Continuous'] as const;
export const MATERIALITY_LEVELS = ['High', 'Medium', 'Low'] as const;
export const ENTITY_STATUSES = ['Active', 'Inactive', 'Under Review', 'Archived'] as const;

export function useAuditUniverse() {
  return useQuery({
    queryKey: ['ia_audit_universe'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_audit_universe')
        .select('*')
        .order('entity_name');
      if (error) throw error;
      return data || [];
    },
  });
}

export function useActiveAuditUniverse() {
  return useQuery({
    queryKey: ['ia_audit_universe', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_audit_universe')
        .select('*')
        .eq('is_active', true)
        .order('entity_name');
      if (error) throw error;
      return data || [];
    },
  });
}

export function useAuditUniverseMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { getCreateFields, getUpdateFields } = useAuditFields();

  const create = useMutation({
    mutationFn: async (entity: {
      entity_name: string;
      entity_type: string;
      entity_code?: string;
      process_owner?: string;
      risk_category?: string;
      audit_frequency?: string;
      materiality?: string;
      regulatory_impact?: string;
      status?: string;
      department_id?: string;
      function_id?: string;
    }) => {
      const { data, error } = await supabase
        .from('ia_audit_universe')
        .insert({ ...entity, ...getCreateFields() })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_audit_universe'] });
      toast({ title: 'Entity Created', description: 'Audit universe entity added successfully.' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('ia_audit_universe')
        .update({ ...updates, ...getUpdateFields() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_audit_universe'] });
      toast({ title: 'Entity Updated', description: 'Audit universe entity updated.' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ia_audit_universe')
        .update({ is_active: false, ...getUpdateFields() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_audit_universe'] });
      toast({ title: 'Entity Deactivated', description: 'Entity has been deactivated.' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  return { create, update, remove };
}
