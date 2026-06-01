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

import { getComplianceDbFlag } from '@/lib/compliance/featureFlagCache';


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
  | 'enforcement.waivers'
  | 'inspections'
  | 'inspections.planning'
  | 'inspections.evidence'
  | 'inspections.convertFinding'
  | 'legal.handoff'
  | 'legal.packPreparation'
  | 'legal.courtMonitoring'
  | 'legal.approvedEscalations'
  | 'legal.returnedFromLegal'
  | 'risk.scoring'
  | 'risk.ruleSimulator'
  | 'risk.riskSimulator'
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
  'enforcement.waivers': true,
  inspections: true,
  'inspections.planning': true,
  'inspections.evidence': true,
  'inspections.convertFinding': true,
  'legal.handoff': true,
  'legal.packPreparation': true,
  'legal.courtMonitoring': true,
  'legal.approvedEscalations': true,
  'legal.returnedFromLegal': true,
  'risk.scoring': true,
  'risk.ruleSimulator': true,
  'risk.riskSimulator': true,
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

/**
 * Phase 1 bridge — map legacy helper keys to canonical DB `feature_flags.flag_key`s.
 * Only Phase 1 toggles are mapped. Unmapped helper keys continue using the
 * static DEFAULT_TOGGLES / env behavior (documented as Phase 2/3).
 */
export const COMPLIANCE_HELPER_TO_DB_FLAG: Partial<Record<ComplianceFeatureKey, string>> = {
  // ── Phase 1 ──
  'violations.verificationQueue': 'compliance.core.verification_queue',
  'arrangements.new': 'compliance.payment.arrangement',
  'arrangements.active': 'compliance.payment.arrangement',
  'arrangements.pendingApproval': 'compliance.payment.arrangement',
  'arrangements.installmentsDue': 'compliance.payment.arrangement',
  'arrangements.paymentAllocation': 'compliance.payment.arrangement',
  'reports.automationJobs': 'compliance.risk.automation_jobs',
  // ── Phase 2 ──
  // Core Case Flow
  'cases.mergeReview': 'compliance.core.case_merge',
  'cases.reopenRequests': 'compliance.core.case_reopen',
  'notices.pendingApproval': 'compliance.core.notice_approval',
  'cases.closure': 'compliance.core.case_closure_approval',
  // Payment & Recovery
  'enforcement.waivers': 'compliance.payment.waiver_requests',
  // Inspection
  inspections: 'compliance.inspection.field',
  'inspections.planning': 'compliance.inspection.planning',
  'inspections.evidence': 'compliance.inspection.evidence',
  'inspections.convertFinding': 'compliance.inspection.convert_finding',
  // Legal
  'legal.handoff': 'compliance.legal.handoff',
  'legal.approvedEscalations': 'compliance.legal.handoff',
  'legal.packPreparation': 'compliance.legal.pack_generation',
  'legal.courtMonitoring': 'compliance.legal.court_monitoring',
  'legal.returnedFromLegal': 'compliance.legal.returned_handling',
  // Risk & Automation
  'risk.scoring': 'compliance.risk.scoring',
  'risk.scoreDetails': 'compliance.risk.scoring',
  'risk.repeatDefaulters': 'compliance.risk.scoring',
  'risk.highRiskEmployers': 'compliance.risk.scoring',
  'risk.watchlist': 'compliance.risk.scoring',
  'risk.ruleSimulator': 'compliance.risk.rule_simulator',
  'risk.riskSimulator': 'compliance.risk.risk_simulator',
};


/** Reverse lookup: DB key → helper keys (for direct DB-key checks). */
export const COMPLIANCE_DB_FLAG_TO_HELPERS: Record<string, ComplianceFeatureKey[]> = (() => {
  const out: Record<string, ComplianceFeatureKey[]> = {};
  (Object.entries(COMPLIANCE_HELPER_TO_DB_FLAG) as Array<[ComplianceFeatureKey, string]>)
    .forEach(([h, db]) => { (out[db] ||= []).push(h); });
  return out;
})();


export function isComplianceFeatureEnabled(key: ComplianceFeatureKey): boolean {
  if (envDisabled.has(key)) return false;
  // Phase 1 bridge: consult DB-backed flag if mapped & cache is loaded.
  const dbKey = COMPLIANCE_HELPER_TO_DB_FLAG[key];
  if (dbKey) {
    const dbVal = getComplianceDbFlag(dbKey);
    if (dbVal !== undefined) return dbVal;
    // Cache not loaded yet OR flag missing → fall back to DEFAULT_TOGGLES
    // (do NOT hide UI on transient load failure).
  }
  return DEFAULT_TOGGLES[key] ?? true;
}

/** Direct DB-key check (post-load value, or default `true` while loading). */
export function isComplianceDbFlagEnabled(dbKey: string): boolean {
  const v = getComplianceDbFlag(dbKey);
  return v === undefined ? true : v;
}
