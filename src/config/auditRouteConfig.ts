/**
 * Single Source of Truth for Internal Audit Module Routes
 * 
 * Every audit module/submodule is listed here with:
 * - moduleKey: unique identifier
 * - label: display name
 * - path: route path
 * - permission: required permission string
 * - enabled: feature flag (set to false to show placeholder)
 * - component: lazy-loaded component path reference (for documentation)
 */

export interface AuditRouteEntry {
  moduleKey: string;
  label: string;
  path: string;
  permission: string;
  enabled: boolean;
  category: 'management' | 'planning' | 'execution' | 'followup' | 'reports' | 'administration';
  component: string; // component file path for reference
}

/**
 * Feature flags for each audit module.
 * Set to `false` to route users to the "Under Activation" placeholder.
 * These can be toggled independently for safe rollback.
 */
export const AUDIT_FEATURE_FLAGS = {
  FEATURE_AUDIT_AUDITOR_PROFILES: true,
  FEATURE_AUDIT_WORKLOAD_CAPACITY: true,
  FEATURE_AUDIT_LEAVE_MANAGEMENT: true,
  FEATURE_AUDIT_HOLIDAY_MANAGEMENT: true,
  FEATURE_AUDIT_PLANS: true,
  FEATURE_AUDIT_PLAN_APPROVAL: true,
  FEATURE_AUDIT_ACTIVITY_CALENDAR: true,
  FEATURE_AUDIT_ACTIVITY_WORKBENCH: true,
  FEATURE_AUDIT_EVIDENCE_MANAGEMENT: true,
  FEATURE_AUDIT_WORKING_PAPERS: true,
  FEATURE_AUDIT_FINDINGS: true,
  FEATURE_AUDIT_MANAGEMENT_RESPONSES: true,
  FEATURE_AUDIT_ACTION_TRACKING: true,
  FEATURE_AUDIT_FOLLOWUP_TRACKER: true,
  FEATURE_AUDIT_PLAN_CLOSEOUT: true,
  FEATURE_AUDIT_REPORTS: true,
  FEATURE_AUDIT_LETTER_GENERATION: true,
  FEATURE_AUDIT_REPORT_BUILDER: true,
  FEATURE_AUDIT_COMMUNICATION_CENTER: true,
  FEATURE_AUDIT_SYSTEM_CONFIG: true,
  FEATURE_AUDIT_DEPARTMENT_MASTER: true,
  FEATURE_AUDIT_FUNCTION_MASTER: true,
  FEATURE_AUDIT_TEMPLATES: true,
} as const;

export type AuditFeatureFlag = keyof typeof AUDIT_FEATURE_FLAGS;

/**
 * Check if a specific audit feature is enabled
 */
export function isAuditFeatureEnabled(flag: AuditFeatureFlag): boolean {
  return AUDIT_FEATURE_FLAGS[flag] ?? false;
}

/**
 * Get feature flag key for a given module key
 */
export function getFeatureFlagForModule(moduleKey: string): AuditFeatureFlag | null {
  const entry = auditRouteConfig.find(r => r.moduleKey === moduleKey);
  if (!entry) return null;
  const flagKey = `FEATURE_AUDIT_${moduleKey.toUpperCase().replace(/-/g, '_')}` as AuditFeatureFlag;
  return flagKey in AUDIT_FEATURE_FLAGS ? flagKey : null;
}

/**
 * Complete route configuration for the Internal Audit module.
 * This is the single source of truth for all audit navigation.
 */
export const auditRouteConfig: AuditRouteEntry[] = [
  // Auditor Management
  {
    moduleKey: 'auditor-profiles',
    label: 'Auditor Profiles',
    path: '/audit/auditors',
    permission: 'configure_audit_system',
    enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_AUDITOR_PROFILES,
    category: 'management',
    component: 'src/pages/audit/AuditorProfiles.tsx',
  },
  {
    moduleKey: 'workload-capacity',
    label: 'Workload & Capacity',
    path: '/audit/workload',
    permission: 'assign_auditors',
    enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_WORKLOAD_CAPACITY,
    category: 'management',
    component: 'src/pages/audit/WorkloadCapacity.tsx',
  },
  {
    moduleKey: 'leave-management',
    label: 'Leave and Vacation Management',
    path: '/audit/leave',
    permission: 'assign_auditors',
    enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_LEAVE_MANAGEMENT,
    category: 'management',
    component: 'src/pages/audit/LeaveManagement.tsx',
  },
  {
    moduleKey: 'holiday-management',
    label: 'Holiday Management',
    path: '/audit/holidays',
    permission: 'assign_auditors',
    enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_HOLIDAY_MANAGEMENT,
    category: 'management',
    component: 'src/pages/audit/HolidayManagement.tsx',
  },
  // Audit Planning
  {
    moduleKey: 'plans',
    label: 'Audit Plans',
    path: '/audit/audit-plans',
    permission: 'create_audit_plans',
    enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_PLANS,
    category: 'planning',
    component: 'src/pages/audit/AuditPlansNew.tsx',
  },
  {
    moduleKey: 'plan-approval',
    label: 'Plan Approval',
    path: '/audit/plan-approval',
    permission: 'approve_audit_plans',
    enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_PLAN_APPROVAL,
    category: 'planning',
    component: 'src/pages/audit/PlanApproval.tsx',
  },
  // Audit Execution
  {
    moduleKey: 'activity-calendar',
    label: 'Activity Calendar',
    path: '/audit/calendar',
    permission: 'view_audit_assignments',
    enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_ACTIVITY_CALENDAR,
    category: 'execution',
    component: 'src/pages/audit/ActivityCalendar.tsx',
  },
  {
    moduleKey: 'activity-workbench',
    label: 'Activity Workbench',
    path: '/audit/activity-workbench',
    permission: 'execute_audit_activities',
    enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_ACTIVITY_WORKBENCH,
    category: 'execution',
    component: 'src/pages/audit/ActivityWorkbench.tsx',
  },
  {
    moduleKey: 'evidence-management',
    label: 'Evidence Management',
    path: '/audit/evidence',
    permission: 'enter_audit_findings',
    enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_EVIDENCE_MANAGEMENT,
    category: 'execution',
    component: 'src/pages/audit/EvidenceManagement.tsx',
  },
  {
    moduleKey: 'working-papers',
    label: 'Working Papers',
    path: '/audit/working-papers',
    permission: 'enter_audit_findings',
    enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_WORKING_PAPERS,
    category: 'execution',
    component: 'src/pages/audit/WorkingPapers.tsx',
  },
  {
    moduleKey: 'findings',
    label: 'Findings & Recommendations',
    path: '/audit/findings',
    permission: 'enter_audit_findings',
    enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_FINDINGS,
    category: 'execution',
    component: 'src/pages/audit/FindingsManagement.tsx',
  },
  // Follow-up & Closure
  {
    moduleKey: 'management-responses',
    label: 'Management Responses',
    path: '/audit/responses',
    permission: 'view_audit_assignments',
    enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_MANAGEMENT_RESPONSES,
    category: 'followup',
    component: 'src/pages/audit/ManagementResponses.tsx',
  },
  {
    moduleKey: 'action-tracking',
    label: 'Action Tracking',
    path: '/audit/actions',
    permission: 'manage_audit_followups',
    enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_ACTION_TRACKING,
    category: 'followup',
    component: 'src/pages/audit/ActionTracking.tsx',
  },
  {
    moduleKey: 'followup-tracker',
    label: 'Follow-Up Tracker',
    path: '/audit/follow-up-tracker',
    permission: 'manage_audit_followups',
    enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_FOLLOWUP_TRACKER,
    category: 'followup',
    component: 'src/pages/audit/FollowUpTracker.tsx',
  },
  {
    moduleKey: 'plan-closeout',
    label: 'Plan Closeout',
    path: '/audit/plan-closeout',
    permission: 'approve_audit_closeouts',
    enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_PLAN_CLOSEOUT,
    category: 'followup',
    component: 'src/pages/audit/PlanCloseout.tsx',
  },
  // Reports & Communications
  {
    moduleKey: 'reports',
    label: 'Audit Reports',
    path: '/audit/audit-reports',
    permission: 'generate_reports',
    enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_REPORTS,
    category: 'reports',
    component: 'src/pages/audit/AuditReports.tsx',
  },
  {
    moduleKey: 'letter-generation',
    label: 'Letter Generation',
    path: '/audit/letters',
    permission: 'create_audit_plans',
    enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_LETTER_GENERATION,
    category: 'reports',
    component: 'src/pages/audit/LetterGeneration.tsx',
  },
  {
    moduleKey: 'report-builder',
    label: 'Report Builder',
    path: '/audit/report-builder',
    permission: 'enter_audit_findings',
    enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_REPORT_BUILDER,
    category: 'reports',
    component: 'src/pages/audit/ReportBuilder.tsx',
  },
  {
    moduleKey: 'communication-center',
    label: 'Communication Center',
    path: '/audit/communication-center',
    permission: 'create_audit_plans',
    enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_COMMUNICATION_CENTER,
    category: 'reports',
    component: 'src/pages/audit/CommunicationCenter.tsx',
  },
  // Administration
  {
    moduleKey: 'system-config',
    label: 'System Configuration',
    path: '/audit/config',
    permission: 'configure_audit_system',
    enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_SYSTEM_CONFIG,
    category: 'administration',
    component: 'src/pages/audit/AuditConfig.tsx',
  },
  {
    moduleKey: 'department-master',
    label: 'Department Master',
    path: '/audit/departments',
    permission: 'configure_audit_system',
    enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_DEPARTMENT_MASTER,
    category: 'administration',
    component: 'src/pages/audit/DepartmentMaster.tsx',
  },
  {
    moduleKey: 'function-master',
    label: 'Function Master',
    path: '/audit/functions',
    permission: 'configure_audit_system',
    enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_FUNCTION_MASTER,
    category: 'administration',
    component: 'src/pages/audit/FunctionMaster.tsx',
  },
  {
    moduleKey: 'templates',
    label: 'Templates',
    path: '/audit/templates',
    permission: 'configure_audit_system',
    enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_TEMPLATES,
    category: 'administration',
    component: 'ModuleTemplates (module="InternalAudit")',
  },
];

/**
 * Get audit route config by path
 */
export function getAuditRouteByPath(path: string): AuditRouteEntry | undefined {
  return auditRouteConfig.find(r => r.path === path);
}

/**
 * Get audit route config by module key
 */
export function getAuditRouteByKey(key: string): AuditRouteEntry | undefined {
  return auditRouteConfig.find(r => r.moduleKey === key);
}

/**
 * Get all enabled audit routes
 */
export function getEnabledAuditRoutes(): AuditRouteEntry[] {
  return auditRouteConfig.filter(r => r.enabled);
}

/**
 * Get all disabled audit routes (placeholder modules)
 */
export function getDisabledAuditRoutes(): AuditRouteEntry[] {
  return auditRouteConfig.filter(r => !r.enabled);
}

/**
 * Module status checklist for documentation
 */
export const AUDIT_MODULE_STATUS: Record<string, 'functional' | 'placeholder'> = Object.fromEntries(
  auditRouteConfig.map(r => [r.moduleKey, r.enabled ? 'functional' : 'placeholder'])
);
