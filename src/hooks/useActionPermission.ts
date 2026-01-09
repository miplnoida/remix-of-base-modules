import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import { useIsAdmin } from "@/hooks/useNavigationMenu";

/**
 * Hook to get all action permissions for a specific module for the current user.
 * Returns a helper function to check if the user has a specific action permission.
 * Admin users always have all permissions.
 */
export function useActionPermissions(moduleName: string) {
  const { user } = useSupabaseAuth();
  const isAdmin = useIsAdmin();

  const { data: permissions = [], isLoading, error } = useQuery({
    queryKey: ['action-permissions', user?.id, moduleName],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.rpc('get_user_permissions', { _user_id: user.id });
      if (error) throw error;
      return (data as Array<{ module_name: string; action_name: string }>)
        .filter(p => p.module_name === moduleName)
        .map(p => p.action_name);
    },
    enabled: !!user?.id && !!moduleName,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  /**
   * Check if user has permission for a specific action
   * Admin users always return true
   */
  const can = (actionName: string): boolean => {
    if (isAdmin) return true;
    return permissions.includes(actionName);
  };

  /**
   * Check if user can view the module (has 'view' action)
   */
  const canView = (): boolean => {
    if (isAdmin) return true;
    return permissions.includes('view');
  };

  return {
    can,
    canView,
    permissions,
    isLoading,
    isAdmin,
    error,
  };
}

/**
 * Module names as constants for type safety
 */
export const MODULE_NAMES = {
  ROLE_MANAGEMENT: 'role_management',
  MODULE_MANAGEMENT: 'module_management',
  USER_MANAGEMENT: 'user_management',
  ROLE_PERMISSIONS: 'Role Permissions',
  PASSWORD_POLICY: 'Password Policy',
  AUDIT_LOGS: 'Audit Logs',
  NOTIFICATIONS: 'Notifications',
  NOTIFICATION_PROVIDERS: 'Notification Providers',
  DESIGNATION_HIERARCHY: 'designation_heirarchy',
  ROLE_HIERARCHY: 'role_heirarchy',
  USER_NOTIFICATION_PREFERENCES: 'user_notification_preferences',
  OFFICE_MANAGEMENT: 'office_management',
  DEPARTMENT_MANAGEMENT: 'department_management',
  DESIGNATION_MANAGEMENT: 'designation_management',
  // Workflow modules
  WORKFLOW_MANAGEMENT: 'workflow_management',
  WORKFLOW_TRIGGERS: 'workflow_triggers',
  WORKFLOW_TASKS: 'workflow_tasks',
  WORKFLOW_LOGS: 'workflow_logs',
  WORKFLOW_ANALYTICS: 'workflow_analytics',
} as const;

/**
 * Action names as constants for type safety
 */
export const ACTION_NAMES = {
  VIEW: 'view',
  CREATE: 'create',
  EDIT: 'edit',
  DELETE: 'delete',
  DISABLE: 'disable',
  EXPORT: 'export',
  CREATE_ROLE: 'create-role',
  CONFIGURE_PERMISSIONS: 'configure-permissions',
  CLONE_ROLE: 'clone-role',
  EDIT_ROLE: 'edit-role',
  DELETE_ROLE: 'delete-role',
  ADD_MODULE: 'add-module',
  ENABLE_DISABLE: 'enable-disable',
  ADD_ACTIONS: 'add-actions',
  CREATE_USER: 'create-user',
  VIEW_USER: 'view-user',
  MANAGE_ROLES: 'manage-roles',
  DISABLE_USER: 'disable-user',
  SAVE_POLICY: 'save-policy',
  EXPORT_CSV: 'export-csv',
  VIEW_LOG: 'view-log',
  NEW_TEMPLATE: 'new-template',
  EDIT_TEMPLATE: 'edit-template',
  DELETE_TEMPLATE: 'delete-template',
  VIEW_LOGS: 'view-logs',
  ADD_PROVIDER: 'add-provider',
  TEST_PROVIDER: 'test-provider',
  EDIT_PROVIDER: 'edit-provider',
  ADD_TO_HIERARCHY: 'add-to-hierarchy',
  ADD_DESIGNATION: 'add-designation',
  ADD_ROLE: 'add-role',
  SELECT_USER: 'select-user',
  SAVE_CHANGES: 'save-changes',
  ADD_OFFICE: 'add-office',
  EDIT_OFFICE: 'edit-office',
  ADD_DEPARTMENT: 'add-department',
  EDIT_DEPARTMENT: 'edit-department',
  DELETE_DEPARTMENT: 'delete-department',
  EDIT_DESIGNATION: 'edit-designation',
  DELETE_DESIGNATION: 'delete-designation',
  // Workflow actions
  VIEW_ANALYTICS: 'view-analytics',
} as const;
