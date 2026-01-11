import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

// Types matching database schema
export interface DbRole {
  id: string;
  role_name: string;
  description: string | null;
  is_system_role: boolean;
  is_active: boolean;
  mfa_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbRolePermission {
  id: string;
  role_id: string;
  module_id: string;
  action_id: string | null;
  is_granted: boolean;
}

export interface ModuleWithActions {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  route: string | null;
  is_enabled: boolean;
  module_actions: {
    id: string;
    action_name: string;
    display_name: string;
    description: string | null;
  }[];
}

// Fetch all roles from database
export function useDbRoles() {
  return useQuery({
    queryKey: ['db-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('role_name');
      if (error) throw error;
      return data as DbRole[];
    },
  });
}

// Create a new role
export function useCreateDbRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { role_name: string; description: string; is_system_role?: boolean; mfa_required?: boolean }) => {
      const { data: result, error } = await supabase
        .from('roles')
        .insert({
          role_name: data.role_name,
          description: data.description,
          is_system_role: data.is_system_role || false,
          mfa_required: data.mfa_required || false,
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['db-roles'] });
      toast.success('Role created successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// Update an existing role
export function useUpdateDbRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<DbRole> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('roles')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['db-roles'] });
      toast.success('Role updated successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// Delete a role
export function useDeleteDbRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['db-roles'] });
      toast.success('Role deleted successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// Fetch role permissions by role id (uuid FK)
export function useRolePermissions(roleId: string) {
  return useQuery({
    queryKey: ['role-permissions', roleId],
    queryFn: async () => {
      if (!roleId) return [];
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role_id', roleId);
      if (error) throw error;
      return data as DbRolePermission[];
    },
    enabled: !!roleId,
  });
}

// Fetch modules with actions for permission assignment
export function useModulesWithActions() {
  return useQuery({
    queryKey: ['modules-with-actions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_modules')
        .select(`
          id,
          name,
          display_name,
          description,
          icon,
          route,
          is_enabled,
          module_actions(id, action_name, display_name, description)
        `)
        .eq('is_enabled', true)
        .order('sort_order');
      if (error) throw error;
      return data as unknown as ModuleWithActions[];
    },
  });
}

// Save role permissions
export function useSaveRolePermissions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ roleId, permissions }: { roleId: string; permissions: { module_id: string; action_id?: string | null; is_granted: boolean }[] }) => {
      if (!roleId) throw new Error('Role ID is required');
      
      // First delete all existing permissions for this role
      const { error: deleteError } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId);
      
      if (deleteError) throw deleteError;

      // Then insert new permissions
      if (permissions.length > 0) {
        const permissionsToInsert = permissions.map(p => ({
          role_id: roleId,
          module_id: p.module_id,
          action_id: p.action_id || null,
          is_granted: p.is_granted,
        }));

        const { error: insertError } = await supabase
          .from('role_permissions')
          .insert(permissionsToInsert);
        
        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions', variables.roleId] });
      toast.success('Permissions saved successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
