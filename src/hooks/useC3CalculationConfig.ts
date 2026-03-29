import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { C3CalculationConfig, ConfigCategory, CATEGORY_INFO, ConfigCategoryGroup } from '@/types/c3CalculationConfig';
import { toast } from 'sonner';
import { logC3ConfigChange } from '@/lib/c3AuditLogger';

// Fetch all active configurations
export function useC3CalculationConfigs() {
  return useQuery({
    queryKey: ['c3-calculation-configs'],
    queryFn: async (): Promise<C3CalculationConfig[]> => {
      const { data, error } = await supabase
        .from('c3_calculation_config')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('display_order');
      
      if (error) throw error;
      return data as C3CalculationConfig[];
    }
  });
}

// Fetch all configurations (for admin)
export function useAllC3CalculationConfigs() {
  return useQuery({
    queryKey: ['c3-calculation-configs-all'],
    queryFn: async (): Promise<C3CalculationConfig[]> => {
      const { data, error } = await supabase
        .from('c3_calculation_config')
        .select('*')
        .order('category')
        .order('display_order');
      
      if (error) throw error;
      return data as C3CalculationConfig[];
    }
  });
}

// Group configurations by category
export function useGroupedC3Configs() {
  const { data: configs, isLoading, error } = useAllC3CalculationConfigs();
  
  const groupedConfigs: ConfigCategoryGroup[] = configs 
    ? (Object.keys(CATEGORY_INFO) as ConfigCategory[]).map(category => ({
        category,
        displayName: CATEGORY_INFO[category].displayName,
        description: CATEGORY_INFO[category].description,
        configs: configs.filter(c => c.category === category)
      })).filter(group => group.configs.length > 0)
    : [];
  
  return { groupedConfigs, isLoading, error };
}

// Update a configuration value
export function useUpdateC3Config() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationKey: ['C3Config', 'c3_calculation_config', 'update'],
    mutationFn: async ({ 
      id, 
      config_key,
      oldValue,
      newValue, 
      reason 
    }: { 
      id: string; 
      config_key: string;
      oldValue: number;
      newValue: number; 
      reason?: string;
    }) => {
      // Get current user info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      // Update the config
      const { error: updateError } = await supabase
        .from('c3_calculation_config')
        .update({ 
          config_value: newValue,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      // Log to c3_calculation_config_audit (legacy)
      const { error: auditError } = await supabase
        .from('c3_calculation_config_audit')
        .insert({
          config_id: id,
          config_key,
          old_value: oldValue,
          new_value: newValue,
          changed_by: user.id,
          changed_by_name: profile?.full_name || user.email,
          reason
        });
      
      if (auditError) {
        console.error('Failed to log audit entry:', auditError);
      }

      // Note: The database trigger trg_audit_c3_calculation_config now automatically
      // writes to c3_unified_audit_log and system_audit_trail on every UPDATE.
      // No additional client-side logging needed.
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['c3-calculation-configs'] });
      queryClient.invalidateQueries({ queryKey: ['c3-calculation-configs-all'] });
      toast.success('Configuration updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update configuration: ' + error.message);
    }
  });
}

// Fetch config audit history
export function useC3ConfigAuditHistory(configId?: string) {
  return useQuery({
    queryKey: ['c3-config-audit', configId],
    queryFn: async () => {
      let query = supabase
        .from('c3_calculation_config_audit')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(50);
      
      if (configId) {
        query = query.eq('config_id', configId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!configId || configId === undefined
  });
}

// Get a single config value by key (for use in calculations)
export function useConfigValue(configKey: string) {
  const { data: configs } = useC3CalculationConfigs();
  return configs?.find(c => c.config_key === configKey)?.config_value;
}

// Get all config values as a map (for use in calculations)
export function useConfigValuesMap() {
  const { data: configs, isLoading } = useC3CalculationConfigs();
  
  const configMap: Record<string, number> = {};
  configs?.forEach(c => {
    configMap[c.config_key] = c.config_value;
  });
  
  return { configMap, isLoading };
}

// Get the configured week start day (1=Monday..7=Sunday, default 1)
export function useWeekStartDay(): number {
  const value = useConfigValue('week_start_day');
  return value ?? 1;
}
