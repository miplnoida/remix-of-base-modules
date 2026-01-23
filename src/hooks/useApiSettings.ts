import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ApiSetting {
  id: string;
  setting_key: string;
  setting_name: string;
  base_url: string | null;
  api_key: string | null;
  header_name: string | null;
  is_active: boolean | null;
  description: string | null;
  linked_module: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

/**
 * Fetch all API settings using raw query to avoid type issues
 */
export function useApiSettings() {
  return useQuery({
    queryKey: ['api-settings'],
    queryFn: async () => {
      // Using direct SQL-like approach via REST API
      const { data, error } = await supabase
        .from('api_settings' as any)
        .select('*')
        .order('setting_name');
      
      if (error) throw error;
      return (data || []) as unknown as ApiSetting[];
    },
  });
}

/**
 * Fetch a specific API setting by key
 */
export function useApiSettingByKey(settingKey: string) {
  return useQuery({
    queryKey: ['api-settings', settingKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_settings' as any)
        .select('*')
        .eq('setting_key', settingKey)
        .single();
      
      if (error) throw error;
      return data as unknown as ApiSetting;
    },
    enabled: !!settingKey,
  });
}

/**
 * Create a new API setting
 */
export function useCreateApiSetting() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (inputData: Omit<ApiSetting, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: result, error } = await supabase
        .from('api_settings' as any)
        .insert(inputData as any)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-settings'] });
      toast.success('API setting created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create API setting: ${error.message}`);
    },
  });
}

/**
 * Update an existing API setting
 */
export function useUpdateApiSetting() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...inputData }: Partial<ApiSetting> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('api_settings' as any)
        .update({
          ...inputData,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-settings'] });
      toast.success('API setting updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update API setting: ${error.message}`);
    },
  });
}

/**
 * Delete an API setting
 */
export function useDeleteApiSetting() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('api_settings' as any)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-settings'] });
      toast.success('API setting deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete API setting: ${error.message}`);
    },
  });
}

/**
 * Get API configuration for making external API calls by setting key
 */
export async function getApiConfig(settingKey: string): Promise<{
  baseUrl: string;
  headers: Record<string, string>;
  isActive: boolean;
} | null> {
  const { data, error } = await supabase
    .from('api_settings' as any)
    .select('*')
    .eq('setting_key', settingKey)
    .single();
  
  if (error || !data) {
    console.error('Failed to fetch API config:', error);
    return null;
  }
  
  const setting = data as unknown as ApiSetting;
  
  if (!setting.is_active) {
    return {
      baseUrl: setting.base_url || '',
      headers: {},
      isActive: false,
    };
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (setting.header_name && setting.api_key) {
    headers[setting.header_name] = setting.api_key;
  }
  
  return {
    baseUrl: setting.base_url || '',
    headers,
    isActive: true,
  };
}

/**
 * Get API configuration by linked module name
 */
export async function getApiConfigByModule(moduleName: string): Promise<{
  baseUrl: string;
  headers: Record<string, string>;
  isActive: boolean;
  settingKey: string;
  settingName: string;
} | null> {
  const { data, error } = await supabase
    .from('api_settings' as any)
    .select('*')
    .eq('linked_module', moduleName)
    .eq('is_active', true)
    .single();
  
  if (error || !data) {
    console.error('Failed to fetch API config by module:', error);
    return null;
  }
  
  const setting = data as unknown as ApiSetting;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (setting.header_name && setting.api_key) {
    headers[setting.header_name] = setting.api_key;
  }
  
  return {
    baseUrl: setting.base_url || '',
    headers,
    isActive: true,
    settingKey: setting.setting_key,
    settingName: setting.setting_name,
  };
}

/**
 * Fetch API settings by linked module
 */
export function useApiSettingsByModule(moduleName: string) {
  return useQuery({
    queryKey: ['api-settings', 'module', moduleName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_settings' as any)
        .select('*')
        .eq('linked_module', moduleName)
        .order('setting_name');
      
      if (error) throw error;
      return (data || []) as unknown as ApiSetting[];
    },
    enabled: !!moduleName,
  });
}
