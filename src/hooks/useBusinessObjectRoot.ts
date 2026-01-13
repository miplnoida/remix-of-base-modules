import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ModuleBusinessObjectRoot {
  id: string;
  name: string;
  display_name: string;
  primary_table: string | null;
  primary_key_column: string | null;
  business_key_column: string | null;
}

export function useModuleBusinessObjectRoot(moduleId?: string) {
  return useQuery({
    queryKey: ['module-business-object-root', moduleId],
    queryFn: async () => {
      if (!moduleId) return null;
      
      const { data, error } = await supabase
        .from('app_modules')
        .select('id, name, display_name, primary_table, primary_key_column, business_key_column')
        .eq('id', moduleId)
        .single();
      
      if (error) throw error;
      return data as ModuleBusinessObjectRoot;
    },
    enabled: !!moduleId,
  });
}

export function useUpdateModuleBusinessObjectRoot() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      id: string;
      primary_table?: string | null;
      primary_key_column?: string | null;
      business_key_column?: string | null;
    }) => {
      const { error } = await supabase
        .from('app_modules')
        .update({
          primary_table: data.primary_table,
          primary_key_column: data.primary_key_column || 'id',
          business_key_column: data.business_key_column,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['module-business-object-root', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['app-modules'] });
      toast({
        title: 'Success',
        description: 'Business Object Root configuration saved',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Apply field updates when a workflow action is executed
export async function applyBusinessObjectFieldUpdates(
  instanceId: string,
  actionId: string,
  userId?: string,
  userName?: string
): Promise<any[]> {
  const { data, error } = await supabase.rpc('apply_workflow_field_updates', {
    p_instance_id: instanceId,
    p_action_id: actionId,
    p_user_id: userId || null,
    p_user_name: userName || 'System',
  });
  
  if (error) {
    console.error('Error applying field updates:', error);
    return [];
  }
  
  // Handle the response - it could be a jsonb array
  if (Array.isArray(data)) {
    return data;
  }
  
  // If data is a string (JSON), parse it
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }
  
  return [];
}

// Resolve notification placeholders from Business Object Root
export async function resolveRootPlaceholders(
  template: string,
  instanceId: string
): Promise<string> {
  const { data, error } = await supabase.rpc('resolve_root_placeholders', {
    p_template: template,
    p_instance_id: instanceId,
  });
  
  if (error) {
    console.error('Error resolving placeholders:', error);
    return template;
  }
  
  return data || template;
}

// Validate that a module has Business Object Root configured
export function useValidateModuleForWorkflow(moduleId?: string) {
  const { data: module } = useModuleBusinessObjectRoot(moduleId);
  
  return {
    isValid: !!module?.primary_table,
    primaryTable: module?.primary_table,
    primaryKeyColumn: module?.primary_key_column || 'id',
    businessKeyColumn: module?.business_key_column,
    errorMessage: !module?.primary_table 
      ? 'This module does not have a Business Object Root configured. Configure it in Module Management first.'
      : null,
  };
}
