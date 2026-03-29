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
  APPLICATIONS_REVIEW: 'applications_review',
  WORKFLOW_INSTANCES: 'workflow_instances',
  // Sample Application module
  SAMPLE_APPLICATION: 'sample_application',
  INCOME_CATEGORY: 'income_category_management',
  SEP_CONTRIB_RATE: 'self_employed_contrib_rates',
  INCOME_CODE: 'income_code_management',
  // Master Data modules
  MD_ACTIVITY: 'md_activity',
  MD_BANK_CODE: 'md_bank_code',
  MD_BATCH_STATUS: 'md_batch_status',
  MD_C3_STATUS: 'md_c3_status',
  MD_COUNTRY: 'md_country',
  MD_DEPENDENT_RELATION: 'md_dependent_relation',
  MD_DISTRICT: 'md_district',
  MD_EYE_COLOR: 'md_eye_color',
  MD_INDUSTRY: 'md_industry',
  MD_INSPECTOR: 'md_inspector',
  MD_INVOICE_STATUS: 'md_invoice_status',
  MD_INVOICE_TYPES: 'md_invoice_types',
  MD_LEGAL_STATUS: 'md_legal_status',
  MD_MARITAL: 'md_marital',
  MD_MERCHANT: 'md_merchant',
  MD_METHOD_OF_PAYMENT: 'md_method_of_payment',
  MD_OCCUPATION: 'md_occupation',
  MD_PAYER_TYPE: 'md_payer_type',
  MD_PAYMENT_SOURCES: 'md_payment_sources',
  MD_PAYMENT_TYPE: 'md_payment_type',
  MD_PENALTY: 'md_penalty',
  MD_POSTAL_DISTRICT: 'md_postal_district',
  MD_RECEIPT_STATUS: 'md_receipt_status',
  MD_RELATION: 'md_relation',
  MD_SECTOR: 'md_sector',
  MD_SSC_RATES: 'md_ssc_rates',
  MD_VC_CONTRIB_RATE: 'md_vc_contrib_rate',
  MD_VC_ELIGIBILITY_CONFIG: 'md_vc_eligibility_config',
  MD_VERIFY: 'md_verify',
  MD_VILLAGES: 'md_villages',
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
  // Sample Application actions  
  SUBMIT: 'submit',
} as const;
