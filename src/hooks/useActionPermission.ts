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
  BATCH_DETAIL_CHANGE_REQUESTS: 'batch_detail_change_requests',
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
  // ─── Compliance & Enforcement (ce_*) ────────────────────────────────
  // Workbench / dashboards
  CE_DASHBOARDS: 'ce_dashboards',
  CE_MY_WORK_QUEUE: 'ce_my_work_queue',
  CE_MANAGER_DASHBOARD: 'ce_manager_dashboard',
  CE_INSPECTOR_DASHBOARD: 'ce_inspector_dashboard',
  CE_LEGAL_DASHBOARD: 'ce_legal_dashboard',
  CE_ANALYTICS_DASHBOARD: 'ce_analytics_dashboard',
  CE_MONITORING: 'ce_monitoring',
  CE_ASSIGNMENT_QUEUES: 'ce_assignment_queues',
  CE_REVIEW_QUEUE: 'ce_review_queue',
  CE_REASSIGNMENT: 'ce_reassignment',
  // Violations
  CE_ALL_VIOLATIONS: 'all_violations',
  CE_MANUAL_VIOLATION_ENTRY: 'manual_violation_entry',
  CE_VIOLATIONS_VERIFICATION_QUEUE: 'ce_violations_verification_queue',
  CE_VIOLATIONS_DUPLICATE_REVIEW: 'ce_violations_duplicate_review',
  CE_VIOLATIONS_HISTORY: 'ce_violations_history',
  CE_VIOLATIONS_RULE_DETECTED: 'ce_violations_rule_detected',
  // Cases
  CE_CASES: 'ce_cases',
  CE_CASE_MANAGEMENT: 'ce_case_management',
  CE_CASE_QUEUE: 'ce_case_queue',
  CE_CASES_INTAKE: 'ce_cases_intake',
  CE_CASES_ASSIGNED: 'ce_cases_assigned',
  CE_CASES_MERGE_REVIEW: 'ce_cases_merge_review',
  CE_CASES_REOPEN: 'ce_cases_reopen',
  CE_CASES_CLOSURE: 'ce_cases_closure',
  CE_PENALTY_MGMT: 'ce_penalty_mgmt',
  // Notices
  CE_NOTICES: 'compliance_notices',
  CE_NOTICES_REGISTER: 'ce_notices_register',
  CE_NOTICES_GENERATE: 'ce_notices_generate',
  CE_NOTICES_PENDING_APPROVAL: 'ce_notices_pending_approval',
  CE_NOTICES_DELIVERY: 'ce_notices_delivery',
  CE_NOTICES_EMPLOYER_RESPONSES: 'ce_notices_employer_responses',
  CE_NOTICES_HISTORY: 'ce_notices_history',
  // Payment arrangements & waivers
  CE_PAYMENT_ARRANGEMENTS: 'ce_payment_arrangements',
  CE_ARR_ALL: 'ce_arr_all',
  CE_ARR_NEW: 'ce_arr_new',
  CE_ARR_PENDING: 'ce_arr_pending',
  CE_ARR_ACTIVE: 'ce_arr_active',
  CE_ARR_INSTALLMENTS_DUE: 'ce_arr_installments_due',
  CE_ARR_BREACHES: 'ce_arr_breaches',
  CE_ARR_PAYMENT_ALLOC: 'ce_arr_payment_alloc',
  CE_BREACH_MONITORING: 'ce_breach_monitoring',
  CE_WAIVERS: 'ce_waivers',
  CE_WAIVERS_OVERRIDES: 'ce_waivers_overrides',
  // Inspections
  CE_INSPECTION_MGMT: 'ce_inspection_mgmt',
  CE_INSPECTIONS: 'ce_inspections',
  CE_INSP_EVIDENCE: 'ce_insp_evidence',
  CE_INSP_CONVERT: 'ce_insp_convert',
  // Field / audit planning
  CE_FIELD_PLANS: 'ce_field_plans',
  CE_FIELD_PLAN_BUILDER: 'ce_field_plan_builder_v3',
  CE_FIELD_PLAN_REVISIONS: 'ce_field_plan_revisions',
  CE_FIELD_APPROVAL_INBOX: 'ce_field_approval_inbox',
  CE_FIELD_EXECUTION: 'ce_field_execution',
  CE_FIELD_OPERATIONS: 'ce_field_operations',
  CE_FIELD_VISITS: 'ce_field_visits',
  CE_FIELD_WEEKLY_REPORT_SUBMIT: 'ce_field_weekly_report_submit',
  CE_FIELD_WEEKLY_REPORT_REVIEW: 'ce_field_weekly_report_review',
  CE_FIELD_AUDIT_MGMT: 'ce_field_audit_mgmt',
  CE_FIELD_EMPLOYER_360: 'ce_field_employer_360',
  CE_FIELD_FINDINGS_GRP: 'ce_field_findings_grp',
  CE_FIELD_MY_UPCOMING: 'ce_field_my_upcoming',
  // Legal escalation
  CE_LEGAL_QUEUE: 'ce_legal_queue',
  CE_LEGAL_PROCEEDINGS: 'ce_legal_proceedings',
  CE_LEGAL_RECOMMENDATION_QUEUE: 'ce_legal_recommendation_queue',
  CE_LEGAL_PACK_PREP: 'ce_legal_pack_prep',
  CE_LEGAL_APPROVED: 'ce_legal_approved',
  CE_LEGAL_RETURNED: 'ce_legal_returned',
  CE_LEGAL_ESCALATIONS: 'ce_legal_escalations',
  CE_LEGAL_ESCALATION_POLICY: 'legal_escalation_policy',
  // Risk
  CE_RISK_PROFILES: 'ce_risk_profiles',
  CE_RISK_SCORE_DETAILS: 'ce_risk_score_details',
  CE_RISK_HIGH_RISK: 'ce_risk_high_risk',
  CE_RISK_REPEAT_DEFAULTERS: 'ce_risk_repeat_defaulters',
  CE_RISK_WATCHLIST: 'ce_risk_watchlist',
  CE_RISK_SCORING_CONFIG: 'ce_risk_scoring_config',
  CE_RISK_SIMULATOR: 'ce_risk_simulator',
  CE_RULE_SIMULATOR: 'ce_rule_simulator',
  // Reports
  CE_ALL_REPORTS: 'ce_all_reports',
  CE_REPORTS_AUTOMATION_JOBS: 'ce_reports_automation_jobs',
  CE_COMPLIANCE_REPORTS: 'compliance_reports',
  // Administration / settings
  CE_SETTINGS: 'compliance_settings_page',
  CE_TEMPLATES: 'compliance_templates',
  CE_TOOLS: 'compliance_tools',
  CE_ADMIN_AUTOMATION: 'ce_admin_automation',
  CE_ADMIN_CALC_RULES: 'ce_admin_calc_rules',
  CE_ADMIN_ESCALATION_RULES: 'ce_admin_escalation_rules',
  CE_ADMIN_FEATURE_TOGGLES: 'ce_admin_feature_toggles',
  CE_ADMIN_WORKFLOW_MAPPING: 'ce_admin_workflow_mapping',
  CE_ADMIN_CASE_FAMILIES: 'ce_admin_case_families',
  CE_ADMIN_WAIVER_RULES: 'ce_admin_waiver_rules',
  CE_ADMIN_LEGAL_HANDOFF_RULES: 'ce_admin_legal_handoff_rules',
  CE_ADMIN_SCHEDULE_SETTINGS: 'ce_admin_schedule_settings',
  CE_ADMIN_ARR_RULES: 'ce_admin_arr_rules',
  CE_ADMIN_SETUP_WIZARD: 'ce_admin_setup_wizard',
  CE_ADMIN_HELP: 'ce_admin_help',
  CE_ADMIN_INTEGRATIONS: 'ce_admin_integrations',
  CE_NOTICE_TEMPLATES: 'ce_notice_templates',
  CE_NUMBER_TEMPLATES: 'ce_number_templates',
  CE_REPORT_TEMPLATES: 'ce_report_templates',
  CE_VIOLATION_TYPES: 'ce_violation_types',
  CE_AUDIT_COMM_TEMPLATES: 'ce_audit_comm_templates',
  CE_DOCUMENT_FOUNDATION: 'ce_document_foundation',
  CE_ASSIGNMENT_ROUTING: 'ce_assignment_routing',
  CE_ONLINE_RESPONSE_CONFIG: 'ce_online_response_config',
  CE_C3_LEDGER_SYNC: 'ce_c3_ledger_sync',
  CE_EMPLOYER_JOBS: 'ce_employer_jobs',
  CE_JOB_CONFIG: 'ce_job_config',
  CE_JOB_HISTORY: 'ce_job_history',
  CE_GEOGRAPHY: 'ce_geography',
  CE_ZONES_MGMT: 'ce_zones_mgmt',
  CE_OFFICE_ZONE_MAP: 'ce_office_zone_map',
  CE_VILLAGE_ZONE_MAP: 'ce_village_zone_map',
  CE_OFFICERS: 'ce_officers',
  CE_SUPERVISORS: 'ce_supervisors',
  CE_QUEUE_MEMBERS_MGMT: 'ce_queue_members_mgmt',
  CE_SAMPLING_SETTINGS: 'ce_sampling_settings',
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
