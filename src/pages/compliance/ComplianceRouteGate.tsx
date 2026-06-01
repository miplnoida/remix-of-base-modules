import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { PermissionProtectedRoute } from '@/components/auth/PermissionProtectedRoute';
import { MODULE_NAMES } from '@/hooks/useActionPermission';
import { useComplianceFeatureFlagsBootstrap } from '@/hooks/compliance/useComplianceFeatureFlags';
import { isComplianceDbFlagEnabled } from '@/lib/compliance/featureToggles';
import FeatureDisabled from '@/pages/compliance/FeatureDisabled';

/**
 * Path-prefix → app_modules.name map for the /compliance/* surface.
 *
 * Resolved longest-prefix-first so specific routes (e.g. `/admin/feature-toggles`)
 * win over their parents (`/admin`). The module name is then checked through the
 * existing `PermissionProtectedRoute` → `useCanAccessModule` chain, which calls
 * the canonical `get_user_permissions` RPC and honours the Admin bypass.
 *
 * Adding a new compliance route?
 *   1. Add its app_modules.name to MODULE_NAMES in src/hooks/useActionPermission.ts.
 *   2. Add the route-prefix → module entry below.
 *   3. Seed the module + actions + role grants through the standard
 *      app_modules / module_actions / role_permissions migration path.
 *
 * No hardcoded role checks. No parallel permission system.
 */
const ROUTE_MODULE_MAP: Array<[string, string]> = [
  // Workbench / dashboards
  ['/workbench/overview', MODULE_NAMES.CE_DASHBOARDS],
  ['/workbench/manager', MODULE_NAMES.CE_MANAGER_DASHBOARD],
  ['/workbench/inspector', MODULE_NAMES.CE_INSPECTOR_DASHBOARD],
  ['/workbench/legal', MODULE_NAMES.CE_LEGAL_DASHBOARD],
  ['/workbench/analytics', MODULE_NAMES.CE_ANALYTICS_DASHBOARD],
  ['/workbench/monitoring', MODULE_NAMES.CE_MONITORING],
  ['/workbench/queues', MODULE_NAMES.CE_ASSIGNMENT_QUEUES],
  ['/workbench/review-queue', MODULE_NAMES.CE_REVIEW_QUEUE],
  ['/workbench/reassignment', MODULE_NAMES.CE_REASSIGNMENT],
  ['/my-work-queue', MODULE_NAMES.CE_MY_WORK_QUEUE],

  // Violations
  ['/violations/manual-entry', MODULE_NAMES.CE_MANUAL_VIOLATION_ENTRY],
  ['/violations/verification-queue', MODULE_NAMES.CE_VIOLATIONS_VERIFICATION_QUEUE],
  ['/violations/duplicate-review', MODULE_NAMES.CE_VIOLATIONS_DUPLICATE_REVIEW],
  ['/violations/rule-detected', MODULE_NAMES.CE_VIOLATIONS_RULE_DETECTED],
  ['/violations/history', MODULE_NAMES.CE_VIOLATIONS_HISTORY],
  ['/violations', MODULE_NAMES.CE_ALL_VIOLATIONS],

  // Cases
  ['/cases/intake', MODULE_NAMES.CE_CASES_INTAKE],
  ['/cases/assigned', MODULE_NAMES.CE_CASES_ASSIGNED],
  ['/cases/merge-review', MODULE_NAMES.CE_CASES_MERGE_REVIEW],
  ['/cases/reopen-requests', MODULE_NAMES.CE_CASES_REOPEN],
  ['/cases/closure', MODULE_NAMES.CE_CASES_CLOSURE],
  ['/cases/queue', MODULE_NAMES.CE_CASE_QUEUE],
  ['/cases/penalties', MODULE_NAMES.CE_PENALTY_MGMT],
  ['/cases', MODULE_NAMES.CE_CASE_MANAGEMENT],

  // Notices
  ['/notices/register', MODULE_NAMES.CE_NOTICES_REGISTER],
  ['/notices/generate', MODULE_NAMES.CE_NOTICES_GENERATE],
  ['/notices/pending-approval', MODULE_NAMES.CE_NOTICES_PENDING_APPROVAL],
  ['/notices/delivery-tracking', MODULE_NAMES.CE_NOTICES_DELIVERY],
  ['/notices/employer-responses', MODULE_NAMES.CE_NOTICES_EMPLOYER_RESPONSES],
  ['/notices/communication-history', MODULE_NAMES.CE_NOTICES_HISTORY],
  ['/notices', MODULE_NAMES.CE_NOTICES],

  // Payment arrangements
  ['/arrangements/all', MODULE_NAMES.CE_ARR_ALL],
  ['/arrangements/new', MODULE_NAMES.CE_ARR_NEW],
  ['/arrangements/pending-approval', MODULE_NAMES.CE_ARR_PENDING],
  ['/arrangements/active', MODULE_NAMES.CE_ARR_ACTIVE],
  ['/arrangements/installments-due', MODULE_NAMES.CE_ARR_INSTALLMENTS_DUE],
  ['/arrangements/breaches', MODULE_NAMES.CE_ARR_BREACHES],
  ['/arrangements/payment-allocation', MODULE_NAMES.CE_ARR_PAYMENT_ALLOC],
  ['/arrangements', MODULE_NAMES.CE_PAYMENT_ARRANGEMENTS],
  ['/waivers', MODULE_NAMES.CE_WAIVERS],

  // Inspections
  ['/inspections/evidence', MODULE_NAMES.CE_INSP_EVIDENCE],
  ['/inspections/convert-finding', MODULE_NAMES.CE_INSP_CONVERT],
  ['/inspections', MODULE_NAMES.CE_INSPECTION_MGMT],

  // Field
  ['/field/plan-builder', MODULE_NAMES.CE_FIELD_PLAN_BUILDER],
  ['/field/my-plans', MODULE_NAMES.CE_FIELD_PLANS],
  ['/field/pending-review', MODULE_NAMES.CE_FIELD_PLAN_REVISIONS],
  ['/field/execution', MODULE_NAMES.CE_FIELD_EXECUTION],
  ['/field/operations', MODULE_NAMES.CE_FIELD_OPERATIONS],
  ['/field/inspections', MODULE_NAMES.CE_INSPECTION_MGMT],
  ['/field/findings', MODULE_NAMES.CE_FIELD_FINDINGS_GRP],
  ['/field/visit', MODULE_NAMES.CE_FIELD_VISITS],
  ['/field/employer-360', MODULE_NAMES.CE_FIELD_EMPLOYER_360],
  ['/field/audit-management', MODULE_NAMES.CE_FIELD_AUDIT_MGMT],
  ['/field/weekly-report-review', MODULE_NAMES.CE_FIELD_WEEKLY_REPORT_REVIEW],
  ['/field/weekly-report', MODULE_NAMES.CE_FIELD_WEEKLY_REPORT_SUBMIT],
  ['/field/my-upcoming', MODULE_NAMES.CE_FIELD_MY_UPCOMING],
  ['/field', MODULE_NAMES.CE_FIELD_PLANS],

  // Legal escalation
  ['/legal/pack-preparation', MODULE_NAMES.CE_LEGAL_PACK_PREP],
  ['/legal/approved-escalations', MODULE_NAMES.CE_LEGAL_APPROVED],
  ['/legal/returned-from-legal', MODULE_NAMES.CE_LEGAL_RETURNED],
  ['/enforcement/recommendation-queue', MODULE_NAMES.CE_LEGAL_RECOMMENDATION_QUEUE],
  ['/enforcement/legal-queue', MODULE_NAMES.CE_LEGAL_QUEUE],
  ['/enforcement', MODULE_NAMES.CE_LEGAL_ESCALATIONS],
  ['/legal', MODULE_NAMES.CE_LEGAL_QUEUE],

  // Risk
  ['/risk/score-details', MODULE_NAMES.CE_RISK_SCORE_DETAILS],
  ['/risk/repeat-defaulters', MODULE_NAMES.CE_RISK_REPEAT_DEFAULTERS],
  ['/risk/high-risk', MODULE_NAMES.CE_RISK_HIGH_RISK],
  ['/risk/watchlist', MODULE_NAMES.CE_RISK_WATCHLIST],
  ['/risk', MODULE_NAMES.CE_RISK_PROFILES],

  // Reports
  ['/reports/automation-jobs', MODULE_NAMES.CE_REPORTS_AUTOMATION_JOBS],
  ['/reports', MODULE_NAMES.CE_COMPLIANCE_REPORTS],

  // Administration / configuration
  ['/admin/setup-wizard', MODULE_NAMES.CE_ADMIN_SETUP_WIZARD],
  ['/admin/feature-toggles', MODULE_NAMES.CE_ADMIN_FEATURE_TOGGLES],
  ['/admin/calculation-rules', MODULE_NAMES.CE_ADMIN_CALC_RULES],
  ['/admin/escalation-rules', MODULE_NAMES.CE_ADMIN_ESCALATION_RULES],
  ['/admin/case-families', MODULE_NAMES.CE_ADMIN_CASE_FAMILIES],
  ['/admin/workflow-mapping', MODULE_NAMES.CE_ADMIN_WORKFLOW_MAPPING],
  ['/admin/schedule-settings', MODULE_NAMES.CE_ADMIN_SCHEDULE_SETTINGS],
  ['/admin/payment-arrangement-rules', MODULE_NAMES.CE_ADMIN_ARR_RULES],
  ['/admin/waiver-rules', MODULE_NAMES.CE_ADMIN_WAIVER_RULES],
  ['/admin/legal-handoff-rules', MODULE_NAMES.CE_ADMIN_LEGAL_HANDOFF_RULES],
  ['/admin/risk-operations', MODULE_NAMES.CE_RISK_SCORING_CONFIG],
  ['/admin/help', MODULE_NAMES.CE_ADMIN_HELP],
  ['/admin', MODULE_NAMES.CE_SETTINGS],
].sort((a, b) => b[0].length - a[0].length) as Array<[string, string]>; // longest prefix wins

function resolveModuleForPath(pathname: string): string | null {
  // pathname comes in absolute (e.g. /compliance/admin/help) — strip the /compliance prefix
  const rel = pathname.replace(/^\/compliance/, '') || '/';
  for (const [prefix, module] of ROUTE_MODULE_MAP) {
    if (rel === prefix || rel.startsWith(prefix + '/')) return module;
  }
  return null;
}

/**
 * Centralised gate for every /compliance/* route. Resolves the matching
 * app_modules.name from the current pathname and delegates to the existing
 * `PermissionProtectedRoute` (which performs the auth check, the
 * `get_user_permissions` RPC call, the Admin bypass, and the redirect to
 * `/unauthorized` on denial).
 *
 * If a path is not in the map, the gate falls through (auth-only) and the
 * screen's own `useActionPermissions(...)` check takes over — matching the
 * existing per-screen pattern documented in access_control_inventory.md.
 */
/**
 * Phase 1 feature-flag enforcement map: route path-suffix → DB feature_flags.flag_key.
 * If the flag is OFF, the route renders <FeatureDisabled /> instead of the page.
 * Permission check still runs first (unchanged).
 */
const FEATURE_FLAG_ROUTE_MAP: Array<{ prefix: string; flagKey: string; title: string }> = [
  { prefix: '/violations/verification-queue', flagKey: 'compliance.core.verification_queue', title: 'Verification Queue' },
  { prefix: '/arrangements/new', flagKey: 'compliance.payment.arrangement', title: 'New Payment Arrangement' },
  { prefix: '/arrangements/active', flagKey: 'compliance.payment.arrangement', title: 'Active Arrangements' },
  { prefix: '/arrangements/pending-approval', flagKey: 'compliance.payment.arrangement', title: 'Pending Arrangement Approvals' },
  { prefix: '/arrangements/installments-due', flagKey: 'compliance.payment.arrangement', title: 'Installments Due' },
  { prefix: '/arrangements/payment-allocation', flagKey: 'compliance.payment.arrangement', title: 'Payment Allocation' },
  { prefix: '/admin/automation/jobs', flagKey: 'compliance.risk.automation_jobs', title: 'Automation Jobs' },
  { prefix: '/reports/automation-jobs', flagKey: 'compliance.risk.automation_jobs', title: 'Automation Job Reports' },
];

function resolveFeatureFlagForPath(pathname: string): { flagKey: string; title: string } | null {
  const rel = pathname.replace(/^\/compliance/, '') || '/';
  // longest-prefix match
  const sorted = [...FEATURE_FLAG_ROUTE_MAP].sort((a, b) => b.prefix.length - a.prefix.length);
  for (const entry of sorted) {
    if (rel === entry.prefix || rel.startsWith(entry.prefix + '/')) return entry;
  }
  return null;
}

export const ComplianceRouteGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  const moduleName = useMemo(() => resolveModuleForPath(pathname), [pathname]);
  const featureFlag = useMemo(() => resolveFeatureFlagForPath(pathname), [pathname]);

  // Bootstrap DB-backed compliance.* feature flags into the runtime cache.
  // Safe loading: on transient failure, isComplianceDbFlagEnabled returns
  // true so the Compliance sidebar/routes do not vanish.
  useComplianceFeatureFlagsBootstrap();

  const content = featureFlag && !isComplianceDbFlagEnabled(featureFlag.flagKey)
    ? <FeatureDisabled title={featureFlag.title} flagKey={featureFlag.flagKey} />
    : children;

  return (
    <PermissionProtectedRoute moduleName={moduleName ?? undefined}>
      {content}
    </PermissionProtectedRoute>
  );
};
