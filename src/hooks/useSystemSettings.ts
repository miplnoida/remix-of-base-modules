import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logAuditTrail } from '@/services/auditService';

export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  setting_type: string;
  display_name: string;
  description: string | null;
  category: string;
  allowed_values: { value: string; label: string }[] | null;
  is_editable: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

// Cache for system settings to avoid repeated queries
let settingsCache: Map<string, string> = new Map();
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60000; // 1 minute cache

export const useSystemSettings = (category?: string) => {
  return useQuery({
    queryKey: ['system-settings', category],
    queryFn: async () => {
      let query = supabase
        .from('system_settings')
        .select('*')
        .order('category')
        .order('display_name');
      
      if (category) {
        query = query.eq('category', category);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Update cache
      (data as SystemSetting[])?.forEach(setting => {
        settingsCache.set(setting.setting_key, setting.setting_value);
      });
      cacheTimestamp = Date.now();
      
      return data as SystemSetting[];
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
};

export const useSystemSetting = (settingKey: string) => {
  return useQuery({
    queryKey: ['system-setting', settingKey],
    queryFn: async () => {
      // Check cache first
      if (settingsCache.has(settingKey) && Date.now() - cacheTimestamp < CACHE_DURATION) {
        return settingsCache.get(settingKey)!;
      }
      
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', settingKey)
        .single();
      
      if (error) throw error;
      
      // Update cache
      settingsCache.set(settingKey, data.setting_value);
      cacheTimestamp = Date.now();
      
      return data.setting_value;
    },
    staleTime: 30000,
  });
};

export const useUpdateSystemSetting = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      settingKey, 
      settingValue, 
      userCode 
    }: { 
      settingKey: string; 
      settingValue: string; 
      userCode?: string;
    }) => {
      // Fetch the current value before updating for audit trail
      const { data: current } = await supabase
        .from('system_settings')
        .select('setting_value, display_name, category')
        .eq('setting_key', settingKey)
        .single();

      const oldValue = current?.setting_value;

      const { data, error } = await supabase
        .from('system_settings')
        .update({
          setting_value: settingValue,
          updated_at: new Date().toISOString(),
          updated_by: userCode || 'SYSTEM'
        })
        .eq('setting_key', settingKey)
        .eq('is_editable', true)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update cache immediately
      settingsCache.set(settingKey, settingValue);
      cacheTimestamp = Date.now();

      // Write audit trail entry automatically
      await logAuditTrail({
        action: 'update',
        entityType: 'system_setting',
        entityId: settingKey,
        module: 'Global Settings',
        beforeValue: { setting_key: settingKey, setting_value: oldValue, display_name: current?.display_name },
        afterValue: { setting_key: settingKey, setting_value: settingValue, display_name: current?.display_name },
        userCode: userCode || 'SYSTEM',
        metadata: { category: current?.category, source: '/admin/global-settings' },
      });
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      queryClient.invalidateQueries({ queryKey: ['system-setting', variables.settingKey] });
      toast.success('Setting updated successfully');
    },
    onError: (error) => {
      console.error('Failed to update setting:', error);
      toast.error('Failed to update setting');
    }
  });
};

// Function to get a setting value synchronously from cache (with fallback)
export const getSystemSettingFromCache = (settingKey: string, fallback: string): string => {
  if (settingsCache.has(settingKey)) {
    return settingsCache.get(settingKey)!;
  }
  return fallback;
};

// Function to invalidate cache (call when settings are updated)
export const invalidateSettingsCache = () => {
  settingsCache.clear();
  cacheTimestamp = 0;
};
