/**
 * Single Source of Truth for Internal Audit Module Routes
 */

export interface AuditRouteEntry {
  moduleKey: string;
  label: string;
  path: string;
  permission: string;
  enabled: boolean;
  category: 'management' | 'planning' | 'execution' | 'followup' | 'reports' | 'administration' | 'governance' | 'methodology';
  component: string;
}

export const AUDIT_FEATURE_FLAGS = {
  // Existing flags
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
  // New Phase 1–9 flags
  FEATURE_AUDIT_UNIVERSE: true,
  FEATURE_AUDIT_RISK_ASSESSMENT: true,
  FEATURE_AUDIT_ENGAGEMENTS: true,
  FEATURE_AUDIT_PROGRAMS: true,
  FEATURE_AUDIT_RCM: true,
  FEATURE_AUDIT_CONTROL_TESTING: true,
  FEATURE_AUDIT_TIME_TRACKING: true,
  FEATURE_AUDIT_QUALITY_REVIEW: true,
  FEATURE_AUDIT_EXECUTIVE_DASHBOARD: true,
  FEATURE_AUDIT_COMMITTEE_REPORTS: true,
} as const;

export type AuditFeatureFlag = keyof typeof AUDIT_FEATURE_FLAGS;

export function isAuditFeatureEnabled(flag: AuditFeatureFlag): boolean {
  return AUDIT_FEATURE_FLAGS[flag] ?? false;
}

export function getFeatureFlagForModule(moduleKey: string): AuditFeatureFlag | null {
  const entry = auditRouteConfig.find(r => r.moduleKey === moduleKey);
  if (!entry) return null;
  const flagKey = `FEATURE_AUDIT_${moduleKey.toUpperCase().replace(/-/g, '_')}` as AuditFeatureFlag;
  return flagKey in AUDIT_FEATURE_FLAGS ? flagKey : null;
}

export const auditRouteConfig: AuditRouteEntry[] = [
  // ===== Auditor Management =====
  { moduleKey: 'auditor-profiles', label: 'Auditor Profiles', path: '/audit/auditors', permission: 'configure_audit_system', enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_AUDITOR_PROFILES, category: 'management', component: 'AuditorProfiles' },
  { moduleKey: 'workload-capacity', label: 'Workload & Capacity', path: '/audit/workload', permission: 'assign_auditors', enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_WORKLOAD_CAPACITY, category: 'management', component: 'WorkloadCapacity' },
  { moduleKey: 'leave-management', label: 'Leave and Vacation Management', path: '/audit/leave', permission: 'assign_auditors', enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_LEAVE_MANAGEMENT, category: 'management', component: 'LeaveManagement' },
  { moduleKey: 'holiday-management', label: 'Holiday Management', path: '/audit/holidays', permission: 'assign_auditors', enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_HOLIDAY_MANAGEMENT, category: 'management', component: 'HolidayManagement' },
  { moduleKey: 'time-tracking', label: 'Time Tracking', path: '/audit/time-tracking', permission: 'execute_audit_activities', enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_TIME_TRACKING, category: 'management', component: 'TimeTracking' },

  // ===== Governance & Risk =====
  { moduleKey: 'universe', label: 'Audit Universe', path: '/audit/audit-universe', permission: 'configure_audit_system', enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_UNIVERSE, category: 'governance', component: 'AuditUniverse' },
  { moduleKey: 'risk-assessment', label: 'Risk Assessment', path: '/audit/risk-assessment', permission: 'configure_audit_system', enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_RISK_ASSESSMENT, category: 'governance', component: 'RiskAssessment' },

  // ===== Audit Planning =====
  { moduleKey: 'plans', label: 'Audit Plans', path: '/audit/audit-plans', permission: 'create_audit_plans', enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_PLANS, category: 'planning', component: 'AuditPlansNew' },
  { moduleKey: 'plan-approval', label: 'Plan Approval', path: '/audit/plan-approval', permission: 'approve_audit_plans', enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_PLAN_APPROVAL, category: 'planning', component: 'PlanApproval' },
  { moduleKey: 'engagements', label: 'Audit Engagements', path: '/audit/engagements', permission: 'create_audit_plans', enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_ENGAGEMENTS, category: 'planning', component: 'AuditEngagements' },

  // ===== Methodology =====
  { moduleKey: 'programs', label: 'Audit Programs', path: '/audit/audit-programs', permission: 'create_audit_plans', enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_PROGRAMS, category: 'methodology', component: 'AuditPrograms' },
  { moduleKey: 'rcm', label: 'Risk Control Matrix', path: '/audit/rcm', permission: 'enter_audit_findings', enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_RCM, category: 'methodology', component: 'RiskControlMatrix' },
  { moduleKey: 'control-testing', label: 'Control Testing', path: '/audit/control-testing', permission: 'execute_audit_activities', enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_CONTROL_TESTING, category: 'methodology', component: 'ControlTesting' },

  // ===== Audit Execution =====
  { moduleKey: 'activity-calendar', label: 'Activity Calendar', path: '/audit/calendar', permission: 'view_audit_assignments', enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_ACTIVITY_CALENDAR, category: 'execution', component: 'ActivityCalendar' },
  { moduleKey: 'activity-workbench', label: 'Activity Workbench', path: '/audit/activity-workbench', permission: 'execute_audit_activities', enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_ACTIVITY_WORKBENCH, category: 'execution', component: 'ActivityWorkbench' },
  { moduleKey: 'evidence-management', label: 'Evidence Management', path: '/audit/evidence', permission: 'enter_audit_findings', enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_EVIDENCE_MANAGEMENT, category: 'execution', component: 'EvidenceManagement' },
  { moduleKey: 'working-papers', label: 'Working Papers', path: '/audit/working-papers', permission: 'enter_audit_findings', enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_WORKING_PAPERS, category: 'execution', component: 'WorkingPapers' },
  { moduleKey: 'findings', label: 'Findings & Recommendations', path: '/audit/findings', permission: 'enter_audit_findings', enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_FINDINGS, category: 'execution', component: 'FindingsManagement' },

  // ===== Follow-up & Closure =====
  { moduleKey: 'management-responses', label: 'Management Responses', path: '/audit/responses', permission: 'view_audit_assignments', enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_MANAGEMENT_RESPONSES, category: 'followup', component: 'ManagementResponses' },
  { moduleKey: 'action-tracking', label: 'Action Tracking', path: '/audit/actions', permission: 'manage_audit_followups', enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_ACTION_TRACKING, category: 'followup', component: 'ActionTracking' },
  { moduleKey: 'followup-tracker', label: 'Follow-Up Tracker', path: '/audit/follow-up-tracker', permission: 'manage_audit_followups', enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_FOLLOWUP_TRACKER, category: 'followup', component: 'FollowUpTracker' },
  { moduleKey: 'plan-closeout', label: 'Plan Closeout', path: '/audit/plan-closeout', permission: 'approve_audit_closeouts', enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_PLAN_CLOSEOUT, category: 'followup', component: 'PlanCloseout' },
  { moduleKey: 'quality-review', label: 'Quality Assurance Review', path: '/audit/quality-review', permission: 'approve_audit_closeouts', enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_QUALITY_REVIEW, category: 'followup', component: 'QualityReview' },

  // ===== Reports & Communications =====
  { moduleKey: 'executive-dashboard', label: 'Executive Dashboard', path: '/audit/executive-dashboard', permission: 'generate_reports', enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_EXECUTIVE_DASHBOARD, category: 'reports', component: 'ExecutiveDashboard' },
  { moduleKey: 'reports', label: 'Audit Reports', path: '/audit/audit-reports', permission: 'generate_reports', enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_REPORTS, category: 'reports', component: 'AuditReports' },
  { moduleKey: 'committee-reports', label: 'Committee Reports', path: '/audit/committee-reports', permission: 'generate_reports', enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_COMMITTEE_REPORTS, category: 'reports', component: 'CommitteeReports' },
  { moduleKey: 'letter-generation', label: 'Letter Generation', path: '/audit/letters', permission: 'create_audit_plans', enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_LETTER_GENERATION, category: 'reports', component: 'LetterGeneration' },
  { moduleKey: 'report-builder', label: 'Report Builder', path: '/audit/report-builder', permission: 'enter_audit_findings', enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_REPORT_BUILDER, category: 'reports', component: 'ReportBuilder' },
  { moduleKey: 'communication-center', label: 'Communication Center', path: '/audit/communication-center', permission: 'create_audit_plans', enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_COMMUNICATION_CENTER, category: 'reports', component: 'CommunicationCenter' },

  // ===== Administration =====
  { moduleKey: 'system-config', label: 'System Configuration', path: '/audit/config', permission: 'configure_audit_system', enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_SYSTEM_CONFIG, category: 'administration', component: 'AuditConfig' },
  { moduleKey: 'department-master', label: 'Department Master', path: '/audit/departments', permission: 'configure_audit_system', enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_DEPARTMENT_MASTER, category: 'administration', component: 'DepartmentMaster' },
  { moduleKey: 'function-master', label: 'Function Master', path: '/audit/functions', permission: 'configure_audit_system', enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_FUNCTION_MASTER, category: 'administration', component: 'FunctionMaster' },
  { moduleKey: 'templates', label: 'Templates', path: '/audit/templates', permission: 'configure_audit_system', enabled: AUDIT_FEATURE_FLAGS.FEATURE_AUDIT_TEMPLATES, category: 'administration', component: 'ModuleTemplates' },
];

export function getAuditRouteByPath(path: string): AuditRouteEntry | undefined {
  return auditRouteConfig.find(r => r.path === path);
}

export function getAuditRouteByKey(key: string): AuditRouteEntry | undefined {
  return auditRouteConfig.find(r => r.moduleKey === key);
}

export function getEnabledAuditRoutes(): AuditRouteEntry[] {
  return auditRouteConfig.filter(r => r.enabled);
}

export function getDisabledAuditRoutes(): AuditRouteEntry[] {
  return auditRouteConfig.filter(r => !r.enabled);
}

export const AUDIT_MODULE_STATUS: Record<string, 'functional' | 'placeholder'> = Object.fromEntries(
  auditRouteConfig.map(r => [r.moduleKey, r.enabled ? 'functional' : 'placeholder'])
);
