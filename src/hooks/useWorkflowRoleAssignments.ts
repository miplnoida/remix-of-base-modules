import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserCode } from '@/hooks/useUserCode';

export interface WorkflowRoleAssignment {
  id: string;
  role_id: string;
  workflow_id: string;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
}

// Fetch all assignments with joined names
export function useWorkflowRoleAssignments() {
  return useQuery({
    queryKey: ['workflow-role-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_role_assignments')
        .select(`
          *,
          role:roles(id, role_name),
          workflow:workflow_definitions(id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (WorkflowRoleAssignment & {
        role: { id: string; role_name: string } | null;
        workflow: { id: string; name: string } | null;
      })[];
    },
  });
}

// Add assignment(s) for a role
export function useAssignWorkflowsToRole() {
  const queryClient = useQueryClient();
  const { userCode } = useUserCode();

  return useMutation({
    mutationFn: async ({ roleId, workflowIds }: { roleId: string; workflowIds: string[] }) => {
      if (workflowIds.length === 0) return;

      const rows = workflowIds.map((wfId) => ({
        role_id: roleId,
        workflow_id: wfId,
        assigned_by: userCode || 'SYSTEM',
      }));

      const { error } = await supabase
        .from('workflow_role_assignments')
        .upsert(rows, { onConflict: 'role_id,workflow_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-role-assignments'] });
      toast.success('Workflows assigned successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// Remove a single assignment
export function useRemoveWorkflowRoleAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workflow_role_assignments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-role-assignments'] });
      toast.success('Assignment removed');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// Get workflow IDs accessible to the current user based on their role(s)
export function useUserAssignedWorkflowIds() {
  return useQuery({
    queryKey: ['user-assigned-workflow-ids'],
    queryFn: async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return { ids: null, isAdmin: false };

      // Get user roles from user_roles table
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (rolesError) throw rolesError;
      if (!userRoles || userRoles.length === 0) return { ids: [], isAdmin: false };

      const roleNames = userRoles.map((ur) => ur.role);

      // Admin sees everything
      if (roleNames.includes('Admin')) {
        return { ids: null, isAdmin: true };
      }

      // Resolve role names to role IDs from the roles table
      const { data: roles, error: roleIdError } = await supabase
        .from('roles')
        .select('id')
        .in('role_name', roleNames);

      if (roleIdError) throw roleIdError;
      if (!roles || roles.length === 0) return { ids: [], isAdmin: false };

      const roleIds = roles.map((r) => r.id);

      // Get assigned workflow IDs
      const { data: assignments, error: assignError } = await supabase
        .from('workflow_role_assignments')
        .select('workflow_id')
        .in('role_id', roleIds);

      if (assignError) throw assignError;

      const uniqueIds = [...new Set((assignments || []).map((a) => a.workflow_id))];
      return { ids: uniqueIds, isAdmin: false };
    },
    staleTime: 60_000,
  });
}
