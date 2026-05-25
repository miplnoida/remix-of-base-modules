/**
 * Compliance & Enforcement — Feature Toggle Helper (placeholder)
 *
 * TODO: Wire this into a real feature-toggle / admin-flag table
 * (e.g. `ce_feature_toggles` or reuse `app_modules.is_enabled`).
 *
 * For now this is a static map so menu code can already opt-in/out
 * of feature areas without hardcoding `true` everywhere. Flip values
 * here OR override via VITE_COMPLIANCE_DISABLED_FEATURES (CSV).
 *
 * IMPORTANT: This helper does NOT replace permission checks. It is
 * an additional gate on top of the existing `requiresPermission`
 * model (see docs/compliance/access_control_inventory.md).
 */

export type ComplianceFeatureKey =
  | 'workQueue'
  | 'violations.verificationQueue'
  | 'violations.ruleDetected'
  | 'violations.duplicateReview'
  | 'violations.history'
  | 'cases.intake'
  | 'cases.assigned'
  | 'cases.review'
  | 'cases.mergeReview'
  | 'cases.reopenRequests'
  | 'cases.closure'
  | 'notices.generate'
  | 'notices.pendingApproval'
  | 'notices.deliveryTracking'
  | 'notices.employerResponses'
  | 'notices.communicationHistory'
  | 'arrangements.new'
  | 'arrangements.pendingApproval'
  | 'arrangements.active'
  | 'arrangements.installmentsDue'
  | 'arrangements.paymentAllocation'
  | 'inspections'
  | 'inspections.evidence'
  | 'inspections.convertFinding'
  | 'legal.packPreparation'
  | 'legal.approvedEscalations'
  | 'legal.returnedFromLegal'
  | 'risk.scoreDetails'
  | 'risk.repeatDefaulters'
  | 'risk.highRiskEmployers'
  | 'risk.watchlist'
  | 'reports.automationJobs'
  | 'admin.setupWizard'
  | 'admin.featureToggles'
  | 'admin.calculationRules'
  | 'admin.escalationRules'
  | 'admin.caseFamilies'
  | 'admin.workflowMapping'
  | 'admin.scheduleSettings'
  | 'admin.paymentArrangementRules'
  | 'admin.waiverRules'
  | 'admin.legalHandoffRules'
  | 'admin.helpAndInstructions';

/** Default-on for every feature key. Set to `false` to hide from menu. */
const DEFAULT_TOGGLES: Record<ComplianceFeatureKey, boolean> = {
  workQueue: true,
  'violations.verificationQueue': true,
  'violations.ruleDetected': true,
  'violations.duplicateReview': true,
  'violations.history': true,
  'cases.intake': true,
  'cases.assigned': true,
  'cases.review': true,
  'cases.mergeReview': true,
  'cases.reopenRequests': true,
  'cases.closure': true,
  'notices.generate': true,
  'notices.pendingApproval': true,
  'notices.deliveryTracking': true,
  'notices.employerResponses': true,
  'notices.communicationHistory': true,
  'arrangements.new': true,
  'arrangements.pendingApproval': true,
  'arrangements.active': true,
  'arrangements.installmentsDue': true,
  'arrangements.paymentAllocation': true,
  'inspections.evidence': true,
  'inspections.convertFinding': true,
  'legal.packPreparation': true,
  'legal.approvedEscalations': true,
  'legal.returnedFromLegal': true,
  'risk.scoreDetails': true,
  'risk.repeatDefaulters': true,
  'risk.highRiskEmployers': true,
  'risk.watchlist': true,
  'reports.automationJobs': true,
  'admin.setupWizard': true,
  'admin.featureToggles': true,
  'admin.calculationRules': true,
  'admin.escalationRules': true,
  'admin.caseFamilies': true,
  'admin.workflowMapping': true,
  'admin.scheduleSettings': true,
  'admin.paymentArrangementRules': true,
  'admin.waiverRules': true,
  'admin.legalHandoffRules': true,
  'admin.helpAndInstructions': true,
};

function parseEnvDisabled(): Set<string> {
  try {
    const raw = (import.meta as unknown as { env?: Record<string, string> }).env
      ?.VITE_COMPLIANCE_DISABLED_FEATURES;
    if (!raw) return new Set();
    return new Set(raw.split(',').map((s) => s.trim()).filter(Boolean));
  } catch {
    return new Set();
  }
}

const envDisabled = parseEnvDisabled();

export function isComplianceFeatureEnabled(key: ComplianceFeatureKey): boolean {
  if (envDisabled.has(key)) return false;
  return DEFAULT_TOGGLES[key] ?? true;
}
