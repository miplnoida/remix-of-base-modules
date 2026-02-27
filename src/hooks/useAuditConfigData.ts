import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// ============= AUDIT SETTINGS =============
export function useIAAuditSettings(category?: string) {
  return useQuery({
    queryKey: ['ia_audit_settings', category],
    queryFn: async (): Promise<any[]> => {
      let query = supabase.from('ia_audit_settings').select('*').eq('is_active', true).order('setting_key');
      if (category) query = query.eq('setting_category', category);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useIAAuditSettingMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const upsert = useMutation({
    mutationFn: async (settings: { setting_category: string; setting_key: string; setting_value: string; setting_type?: string; updated_by?: string }[]) => {
      // Update each setting individually
      const promises = settings.map(async (s) => {
        const { data, error } = await supabase
          .from('ia_audit_settings')
          .update({ setting_value: s.setting_value, updated_at: new Date().toISOString(), updated_by: s.updated_by })
          .eq('setting_category', s.setting_category)
          .eq('setting_key', s.setting_key)
          .select()
          .single();
        if (error) throw error;
        return data;
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_audit_settings'] });
      toast({ title: 'Settings Saved', description: 'Settings have been updated successfully' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { upsert };
}

// ============= RISK CRITERIA =============
export function useIARiskCriteria() {
  return useQuery({
    queryKey: ['ia_risk_criteria'],
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await supabase.from('ia_risk_criteria').select('*').order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useIARiskCriteriaMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const create = useMutation({
    mutationFn: async (c: any) => { const { data, error } = await supabase.from('ia_risk_criteria').insert(c).select().single(); if (error) throw error; return data; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ia_risk_criteria'] }); toast({ title: 'Risk Criteria Added' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  const update = useMutation({
    mutationFn: async ({ id, ...u }: { id: string; [k: string]: any }) => { const { data, error } = await supabase.from('ia_risk_criteria').update(u).eq('id', id).select().single(); if (error) throw error; return data; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ia_risk_criteria'] }); toast({ title: 'Risk Criteria Updated' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  return { create, update };
}

// ============= ACTIVITY TYPES =============
export function useIAActivityTypes() {
  return useQuery({
    queryKey: ['ia_activity_types'],
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await supabase.from('ia_activity_types').select('*').order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useIAActivityTypeMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const create = useMutation({
    mutationFn: async (t: any) => { const { data, error } = await supabase.from('ia_activity_types').insert(t).select().single(); if (error) throw error; return data; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ia_activity_types'] }); toast({ title: 'Activity Type Added' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  const update = useMutation({
    mutationFn: async ({ id, ...u }: { id: string; [k: string]: any }) => { const { data, error } = await supabase.from('ia_activity_types').update(u).eq('id', id).select().single(); if (error) throw error; return data; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ia_activity_types'] }); toast({ title: 'Activity Type Updated' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  return { create, update };
}
