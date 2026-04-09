/**
 * TypeScript interfaces and default configurations for Internal Audit Document Templates.
 *
 * ARCHITECTURE (Foundation-First Separation):
 * ═══════════════════════════════════════════
 * 
 * 1. FOUNDATION (ia_org_document_foundation)
 *    - Branding, Logo, Colors, Typography, Page Layout, Margins
 *    - Pagination, Table Style, Sign-off/Governance, Draft/Final Rules
 *    - ALL documents inherit these. No template can override them.
 *
 * 2. SECTION LIBRARY (ia_document_section_library)
 *    - Master catalog of all sections across all document types
 *    - Each section has: key, label, category, display_mode, mandatory flag
 *    - Templates REFERENCE sections from here — never define their own.
 *
 * 3. DOCUMENT TEMPLATES (ia_document_template_settings / ia_audit_plan_templates)
 *    - Structure only: which sections, what order, visibility, label overrides
 *    - Content-specific settings (e.g., Findings Layout for Reports)
 *    - NO formatting — formatting comes exclusively from Foundation.
 *
 * Legacy Note: Some template configs in the DB may still carry formatting
 * fields (branding, typography, etc.) from before this separation.
 * The resolver ALWAYS uses Foundation for formatting, ignoring any
 * template-level formatting fields.
 */

import type { AuditPlanFullTemplateConfig } from './auditPlanTemplateTypes';
import { PRESET_AUDIT_BLUE_MINIMAL } from './auditPlanTemplatePresets';

// ─── Shared Types ───

export interface TemplateColumn {
  key: string;
  label: string;
  enabled: boolean;
}

/**
 * Reference to a section from the Section Library.
 * Templates only control: enabled, order, labelOverride.
 * The section definition (key, display_mode, mandatory, category) lives in the library.
 */
export interface TemplateSectionRef {
  /** Section key matching ia_document_section_library.section_key */
  id: string;
  /** Display label (from library, or overridden here) */
  label: string;
  /** Whether this section is included in the output */
  enabled: boolean;
  /** Display order within the document */
  order: number;
  /** Optional label override (if different from library default) */
  labelOverride?: string;
}

/** @deprecated Use TemplateSectionRef instead */
export type TemplateSection = TemplateSectionRef;

export interface TemplateSignatory {
  label: string;
  defaultName: string;
  roleTitle: string;
}

// ─── Audit Report Template Config ───
// Structure + content settings ONLY. Formatting comes from Foundation.

export interface AuditReportCoverPage {
  reportTitle: string;
  showSubtitle: boolean;
  subtitleText: string;
  showAuditPeriod: boolean;
  confidentialityText: string;
  fieldOrder: string[];
}

export interface AuditReportFindingsLayout {
  showManagementResponseAfterRecommendation: boolean;
  detailedFindingFields: string[];
}

export interface AuditReportActionPlanSummary {
  visibility: 'hidden' | 'draft_only' | 'final_only' | 'always';
  columns: TemplateColumn[];
}

/**
 * Audit Report Template Configuration.
 * Contains ONLY structure and content-specific settings.
 * All formatting (branding, typography, colors, pagination, table style,
 * sign-off, draft/final rules) is inherited from Foundation.
 */
export interface AuditReportTemplateConfig {
  /** Cover page content settings */
  coverPage: AuditReportCoverPage;
  /** Section references from the Section Library (order + visibility + label overrides) */
  sectionRefs: TemplateSectionRef[];
  /** Findings layout — report-specific content setting */
  findingsLayout: AuditReportFindingsLayout;
  /** Risk distribution chart toggle */
  riskDistribution: { enabled: boolean };
  /** Action plan summary — report-specific content setting */
  actionPlanSummary: AuditReportActionPlanSummary;

  // ─── LEGACY FIELDS (deprecated — now inherited from Foundation) ───
  // These exist for backward compatibility with configs already stored in DB.
  // The resolver ignores these and always uses Foundation values.

  /** @deprecated Inherited from Foundation. Ignored by resolver. */
  branding?: {
    showLogo: boolean;
    logoSource: string;
    orgName: string;
    country: string;
    address: string;
    phone: string;
  };
  /** @deprecated Inherited from Foundation. Ignored by resolver. */
  signOff?: {
    signatories: TemplateSignatory[];
  };
  /** @deprecated Inherited from Foundation. Ignored by resolver. */
  draftRules?: {
    showWatermark: boolean;
    watermarkText: string;
  };
  /** @deprecated Inherited from Foundation. Ignored by resolver. */
  finalRules?: {
    showIssuedStamp: boolean;
  };
  /** @deprecated Use sectionRefs instead. Kept for migration compatibility. */
  sections?: TemplateSectionRef[];
}

// ─── Legacy type aliases ───

/** @deprecated Use AuditReportCoverPage */
export type AuditReportBranding = NonNullable<AuditReportTemplateConfig['branding']>;
/** @deprecated Use FoundationSignatory from documentFoundationTypes */
export type AuditReportSignOff = NonNullable<AuditReportTemplateConfig['signOff']>;
/** @deprecated Use FoundationDraftRules from documentFoundationTypes */
export type AuditReportDraftRules = NonNullable<AuditReportTemplateConfig['draftRules']>;
/** @deprecated Use FoundationDraftRules from documentFoundationTypes */
export type AuditReportFinalRules = NonNullable<AuditReportTemplateConfig['finalRules']>;

// ─── Audit Plan Template Config ───
// The full plan config lives in auditPlanTemplateTypes.ts.
// This alias keeps backward compatibility for existing consumers.

export type AuditPlanTemplateConfig = AuditPlanFullTemplateConfig;

// ─── Defaults ───

/**
 * @deprecated Hardcoded section list — sections should come from Section Library (DB).
 * Kept only as a last-resort fallback if the library query fails.
 * Templates should populate sectionRefs from ia_document_section_library at load time.
 */
const FALLBACK_SECTION_REFS: TemplateSectionRef[] = [
  { id: 'executive_summary', label: 'Executive Summary', enabled: true, order: 1 },
  { id: 'background', label: 'Audit Background', enabled: true, order: 2 },
  { id: 'objective', label: 'Audit Objective', enabled: true, order: 3 },
  { id: 'scope', label: 'Scope', enabled: true, order: 4 },
  { id: 'methodology', label: 'Methodology', enabled: true, order: 5 },
  { id: 'risk_overview', label: 'Risk Overview', enabled: true, order: 6 },
  { id: 'key_findings', label: 'Key Findings Snapshot', enabled: true, order: 7 },
  { id: 'detailed_findings', label: 'Detailed Findings', enabled: true, order: 8 },
  { id: 'management_responses', label: 'Management Responses', enabled: true, order: 9 },
  { id: 'action_plan', label: 'Agreed Action Plan', enabled: true, order: 10 },
  { id: 'conclusion', label: 'Conclusion', enabled: true, order: 11 },
  { id: 'distribution', label: 'Distribution', enabled: true, order: 12 },
  { id: 'approval', label: 'Approval & Sign-off', enabled: true, order: 13 },
];

export const DEFAULT_AUDIT_REPORT_CONFIG: AuditReportTemplateConfig = {
  coverPage: {
    reportTitle: 'Audit Report',
    showSubtitle: true,
    subtitleText: 'Engagement Report',
    showAuditPeriod: true,
    confidentialityText:
      'This document is the property of the Social Security Board, St. Kitts and Nevis. It contains confidential information intended solely for the use of the addressee. Unauthorized distribution, copying, or disclosure is strictly prohibited.',
    fieldOrder: ['fiscal_year', 'department', 'report_number', 'date', 'prepared_by', 'version'],
  },
  sectionRefs: FALLBACK_SECTION_REFS,
  // Legacy alias for backward compat
  sections: FALLBACK_SECTION_REFS,
  findingsLayout: {
    showManagementResponseAfterRecommendation: false,
    detailedFindingFields: ['criteria', 'condition', 'cause', 'effect', 'recommendation'],
  },
  riskDistribution: { enabled: true },
  actionPlanSummary: {
    visibility: 'always',
    columns: [
      { key: 'finding', label: 'Finding', enabled: true },
      { key: 'action', label: 'Action', enabled: true },
      { key: 'owner', label: 'Owner', enabled: true },
      { key: 'due_date', label: 'Due Date', enabled: true },
      { key: 'status', label: 'Status', enabled: true },
    ],
  },
};

/**
 * Default Audit Plan config — uses the Audit Blue Minimal preset.
 * This is the single source of truth for plan defaults.
 */
export const DEFAULT_AUDIT_PLAN_CONFIG: AuditPlanTemplateConfig = PRESET_AUDIT_BLUE_MINIMAL;
