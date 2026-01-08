import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DbRole {
  id: string;
  role_name: string;
  description: string | null;
  is_system_role: boolean;
  mfa_required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleHierarchy {
  id: string;
  role_id: string;
  parent_role_id: string | null;
  level: number;
  role?: DbRole;
  parent_role?: DbRole;
}

export function useRoleHierarchy() {
  return useQuery({
    queryKey: ['role-hierarchy'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_hierarchy')
        .select(`
          *,
          role:roles!role_hierarchy_role_id_fkey(*),
          parent_role:roles!role_hierarchy_parent_role_id_fkey(*)
        `)
        .order('level');
      if (error) throw error;
      return data as RoleHierarchy[];
    },
  });
}

export function useUpsertRoleHierarchy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { role_id: string; parent_role_id: string | null; level: number }) => {
      const { data: result, error } = await supabase
        .from('role_hierarchy')
        .upsert(data, { onConflict: 'role_id' })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-hierarchy'] });
      toast.success('Role hierarchy updated successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteRoleHierarchy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from('role_hierarchy')
        .delete()
        .eq('role_id', roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-hierarchy'] });
      toast.success('Hierarchy entry removed');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// Clone role functionality
export function useCloneRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sourceRoleId, newRoleName }: { sourceRoleId: string; newRoleName: string }) => {
      // 1. Get source role details
      const { data: sourceRole, error: roleError } = await supabase
        .from('roles')
        .select('*')
        .eq('id', sourceRoleId)
        .single();
      if (roleError) throw roleError;

      // 2. Create new role
      const { data: newRole, error: createError } = await supabase
        .from('roles')
        .insert({
          role_name: newRoleName,
          description: `Cloned from ${sourceRole.role_name}`,
          is_system_role: false,
          mfa_required: sourceRole.mfa_required,
          is_active: true,
        })
        .select()
        .single();
      if (createError) throw createError;

      // 3. Get source role permissions - role_permissions uses app_role enum
      // Clone only works for roles that match existing app_role enum values
      // For now, we'll skip permission copying for custom roles
      
      return newRole;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['db-roles'] });
      toast.success('Role cloned successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
