import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Config type to table mapping for auto-applying approved changes
const CONFIG_TABLE_MAP: Record<string, string> = {
  'audit_settings': 'ia_audit_settings',
  'likelihood_levels': 'ia_likelihood_levels',
  'impact_levels': 'ia_impact_levels',
  'control_effectiveness': 'ia_control_effectiveness_levels',
  'risk_thresholds': 'ia_risk_classification_thresholds',
  'risk_criteria': 'ia_risk_criteria',
  'activity_types': 'ia_activity_types',
  'scoring_model': 'ia_risk_scoring_models',
};

async function applyConfigChange(request: any) {
  const tableName = CONFIG_TABLE_MAP[request.config_type];
  if (!tableName) {
    console.warn(`Unknown config_type "${request.config_type}" — cannot auto-apply.`);
    return;
  }

  try {
    if (tableName === 'ia_audit_settings') {
      await (supabase.from(tableName as any).update({
        setting_value: request.new_value,
      } as any).eq('setting_key', request.field_changed) as any);
      return;
    }

    // field_changed format: "field_name:record_id" for record-level updates
    const parts = request.field_changed.split(':');
    if (parts.length === 2) {
      const [fieldName, recordId] = parts;
      await (supabase.from(tableName as any).update({
        [fieldName]: request.new_value,
      } as any).eq('id', recordId) as any);
    } else {
      console.warn(`Cannot auto-apply: field_changed "${request.field_changed}" needs "field:id" format for table "${tableName}".`);
    }
  } catch (err) {
    console.error('Failed to auto-apply config change:', err);
  }
}

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
      const { data: request, error: fetchError } = await (supabase.from('ia_config_change_requests' as any)
        .select('*').eq('id', data.id).single() as any);
      if (fetchError) throw fetchError;

      const { data: result, error } = await (supabase.from('ia_config_change_requests' as any).update({
        status: data.status,
        approved_by: data.approved_by,
        reviewed_at: new Date().toISOString(),
      } as any).eq('id', data.id).select().single() as any);
      if (error) throw error;

      if (data.status === 'Approved' && request) {
        await applyConfigChange(request);
      }

      return result;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['ia_config_change_requests'] });
      queryClient.invalidateQueries({ queryKey: ['ia_audit_settings'] });
      queryClient.invalidateQueries({ queryKey: ['ia_likelihood_levels'] });
      queryClient.invalidateQueries({ queryKey: ['ia_impact_levels'] });
      queryClient.invalidateQueries({ queryKey: ['ia_control_effectiveness_levels'] });
      queryClient.invalidateQueries({ queryKey: ['ia_risk_classification_thresholds'] });
      queryClient.invalidateQueries({ queryKey: ['ia_risk_criteria'] });
      toast({ title: `Request ${vars.status}`, description: `The configuration change has been ${vars.status.toLowerCase()}.${vars.status === 'Approved' ? ' The change has been applied.' : ''}` });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { create, review };
}
