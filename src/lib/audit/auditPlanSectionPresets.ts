/**
 * Audit Plan Section Presets
 *
 * Section presets control WHAT content appears in an audit plan (sections,
 * TOC, approval, watermark, export defaults). They are independent of
 * visual formatting (colors, fonts, table styles) which is handled by
 * template presets in auditPlanTemplatePresets.ts.
 *
 * ┌─────────────────────────────┬───────────┬──────────┬───────────┬───────────┬──────────────┐
 * │ Preset                      │ Sections  │ TOC      │ Approval  │ Watermark │ Export       │
 * ├─────────────────────────────┼───────────┼──────────┼───────────┼───────────┼──────────────┤
 * │ Full Audit Plan ★           │ 22 of 22  │ depth-3  │ 3 sigs    │ off       │ PDF/DOCX     │
 * │ Concise Audit Plan          │ 10 of 22  │ depth-2  │ 2 sigs    │ off       │ PDF          │
 * │ Audit Committee Version     │ 16 of 22  │ depth-2  │ 4 sigs    │ off       │ PDF          │
 * │ Working Draft Version       │ 10 of 22  │ off      │ none      │ on        │ PDF/DOCX     │
 * │ External Review Version     │ 18 of 22  │ depth-3  │ 3 sigs    │ off       │ PDF only     │
 * └─────────────────────────────┴───────────┴──────────┴───────────┴───────────┴──────────────┘
 *
 * ★ = Recommended default
 *
 * Usage:
 *   import { applySectionPreset } from './auditPlanSectionPresets';
 *   const finalConfig = applySectionPreset(templateConfig, 'full_audit_plan');
 */

import type {
  AuditPlanFullTemplateConfig,
  AuditPlanSection,
  AuditPlanSignatory,
  AuditPlanTocConfig,
  AuditPlanApprovalConfig,
  AuditPlanExportDefaults,
} from './auditPlanTemplateTypes';

// ─── Section Preset Interface ───

export interface SectionPresetSectionOverride {
  id: string;
  enabled: boolean;
  /** Override display label for this preset context */
  labelOverride?: string;
  /** Override TOC inclusion */
  inToc?: boolean;
  /** Override page break behavior */
  startNewPage?: boolean;
}

export interface SectionPresetTocConfig {
  enabled: boolean;
  depth: 1 | 2 | 3;
  showLeaderDots: boolean;
}

export interface SectionPresetApprovalConfig {
  signatories: AuditPlanSignatory[];
  showDateField: boolean;
  showSignatureLine: boolean;
}

export interface SectionPresetWatermarkConfig {
  showWatermark: boolean;
  watermarkText: string;
}

export interface SectionPresetExportConfig {
  defaultFormat: 'pdf' | 'docx' | 'print';
  docxEditableNarratives: boolean;
  draftWatermark: boolean;
  draftWatermarkText: string;
}

export interface SectionPresetAppendixConfig {
  enabled: boolean;
  /** Whether appendices start on a new page */
  startNewPage: boolean;
  /** Appendix numbering style */
  numberingStyle: 'alpha' | 'arabic' | 'roman';
}

export interface AuditPlanSectionPreset {
  key: string;
  name: string;
  description: string;
  audience: string;
  /** Whether this is the recommended default */
  isDefault: boolean;
  /** Section visibility and label overrides */
  sectionOverrides: SectionPresetSectionOverride[];
  /** TOC configuration */
  toc: SectionPresetTocConfig;
  /** Appendix configuration */
  appendix: SectionPresetAppendixConfig;
  /** Approval block configuration */
  approval: SectionPresetApprovalConfig;
  /** Watermark configuration */
  watermark: SectionPresetWatermarkConfig;
  /** Export defaults */
  exportDefaults: SectionPresetExportConfig;
  /** Governance overrides */
  governance: {
    showBoardLine: boolean;
    showApprovedByBlock: boolean;
  };
  /** Risk coverage visibility */
  riskCoverageEnabled: boolean;
  /** Plan summary behavior */
  planSummary: {
    hideExactDates: boolean;
    splitByType: boolean;
  };
}

// ─── Preset Keys ───

export const SECTION_PRESET_KEYS = {
  FULL_AUDIT_PLAN: 'full_audit_plan',
  CONCISE_AUDIT_PLAN: 'concise_audit_plan',
  AUDIT_COMMITTEE_VERSION: 'audit_committee_version',
  WORKING_DRAFT_VERSION: 'working_draft_version',
  EXTERNAL_REVIEW_VERSION: 'external_review_version',
} as const;

export type SectionPresetKey = typeof SECTION_PRESET_KEYS[keyof typeof SECTION_PRESET_KEYS];

// ─── All 22 section IDs (canonical order) ───

const ALL_SECTION_IDS = [
  'cover_page', 'document_control', 'approval_signoff', 'table_of_contents',
  'executive_summary', 'audit_background', 'audit_objective', 'audit_scope',
  'audit_criteria', 'risk_assessment_summary', 'focus_areas', 'methodology',
  'planned_procedures', 'sampling_strategy', 'information_required',
  'resource_plan', 'timeline_milestones', 'deliverables',
  'communication_protocol', 'independence_statement', 'limitations', 'appendices',
] as const;

// ─── Helper: build section overrides from enable/disable sets ───

function buildOverrides(
  enabledIds: string[],
  labelOverrides?: Record<string, string>,
  tocOverrides?: Record<string, boolean>,
  pageBreakOverrides?: Record<string, boolean>,
): SectionPresetSectionOverride[] {
  const enabledSet = new Set(enabledIds);
  return ALL_SECTION_IDS.map((id) => ({
    id,
    enabled: enabledSet.has(id),
    ...(labelOverrides?.[id] ? { labelOverride: labelOverrides[id] } : {}),
    ...(tocOverrides?.[id] !== undefined ? { inToc: tocOverrides[id] } : {}),
    ...(pageBreakOverrides?.[id] !== undefined ? { startNewPage: pageBreakOverrides[id] } : {}),
  }));
}

// ════════════════════════════════════════════════════════════════
// 1. FULL AUDIT PLAN ★ (Recommended Default)
// ════════════════════════════════════════════════════════════════
//
// All 22 sections enabled. Full TOC at depth 3. Three signatories.
// No watermark. Supports both PDF and DOCX. Appendices with alpha
// numbering. Every section in TOC. Page breaks on major transitions.
//
// Use case: Complete audit plans for formal issuance to management
//           and oversight bodies. Maximum documentation coverage.

export const PRESET_FULL_AUDIT_PLAN: AuditPlanSectionPreset = {
  key: SECTION_PRESET_KEYS.FULL_AUDIT_PLAN,
  name: 'Full Audit Plan',
  description: 'Complete plan with all 22 sections enabled. Maximum documentation coverage for formal issuance.',
  audience: 'Management / Governance',
  isDefault: true,
  sectionOverrides: buildOverrides(
    [...ALL_SECTION_IDS], // all enabled
    {},
    {},
    {
      table_of_contents: true,
      executive_summary: true,
      risk_assessment_summary: true,
      resource_plan: true,
      communication_protocol: true,
      appendices: true,
    },
  ),
  toc: { enabled: true, depth: 3, showLeaderDots: true },
  appendix: { enabled: true, startNewPage: true, numberingStyle: 'alpha' },
  approval: {
    signatories: [
      { label: 'Prepared By', defaultName: '', roleTitle: 'Internal Auditor' },
      { label: 'Reviewed By', defaultName: '', roleTitle: 'Manager, Internal Audit' },
      { label: 'Approved By', defaultName: '', roleTitle: 'Chief Audit Executive' },
    ],
    showDateField: true,
    showSignatureLine: true,
  },
  watermark: { showWatermark: false, watermarkText: 'DRAFT' },
  exportDefaults: {
    defaultFormat: 'pdf',
    docxEditableNarratives: true,
    draftWatermark: false,
    draftWatermarkText: 'DRAFT',
  },
  governance: { showBoardLine: true, showApprovedByBlock: true },
  riskCoverageEnabled: true,
  planSummary: { hideExactDates: false, splitByType: false },
};

// ════════════════════════════════════════════════════════════════
// 2. CONCISE AUDIT PLAN
// ════════════════════════════════════════════════════════════════
//
// Stripped to 10 core sections. No Document Control, Background,
// Criteria, Planned Procedures, Sampling, Info Required, Independence,
// Limitations, Appendices, Communication Protocol. Two signatories.
// Depth-2 TOC. Compact labels.
//
// Use case: Quick-turnaround plans for low-risk engagements,
//           advisory work, or follow-up reviews.

export const PRESET_CONCISE_AUDIT_PLAN: AuditPlanSectionPreset = {
  key: SECTION_PRESET_KEYS.CONCISE_AUDIT_PLAN,
  name: 'Concise Audit Plan',
  description: 'Streamlined 10-section plan for low-risk or advisory engagements. Minimal boilerplate.',
  audience: 'Management (Concise)',
  isDefault: false,
  sectionOverrides: buildOverrides(
    [
      'cover_page', 'approval_signoff', 'table_of_contents',
      'executive_summary', 'audit_objective', 'audit_scope',
      'risk_assessment_summary', 'focus_areas', 'methodology',
      'resource_plan',
    ],
    {
      executive_summary: 'Summary',
      audit_objective: 'Objective',
      audit_scope: 'Scope',
      risk_assessment_summary: 'Risk Assessment',
      focus_areas: 'Focus Areas',
      methodology: 'Methodology',
      resource_plan: 'Resources',
    },
    {},
    { executive_summary: true, risk_assessment_summary: true },
  ),
  toc: { enabled: true, depth: 2, showLeaderDots: true },
  appendix: { enabled: false, startNewPage: true, numberingStyle: 'alpha' },
  approval: {
    signatories: [
      { label: 'Prepared By', defaultName: '', roleTitle: 'Internal Auditor' },
      { label: 'Approved By', defaultName: '', roleTitle: 'Manager, Internal Audit' },
    ],
    showDateField: true,
    showSignatureLine: false,
  },
  watermark: { showWatermark: false, watermarkText: 'DRAFT' },
  exportDefaults: {
    defaultFormat: 'pdf',
    docxEditableNarratives: false,
    draftWatermark: false,
    draftWatermarkText: 'DRAFT',
  },
  governance: { showBoardLine: false, showApprovedByBlock: true },
  riskCoverageEnabled: true,
  planSummary: { hideExactDates: false, splitByType: false },
};

// ════════════════════════════════════════════════════════════════
// 3. AUDIT COMMITTEE VERSION
// ════════════════════════════════════════════════════════════════
//
// 16 sections — all core + Independence + Appendices. Executive
// Summary emphasized. Four signatories including "Noted By" for
// Audit Committee Chair. Depth-2 TOC with leader dots. Board line
// in governance block. Dates split by type for clarity.
//
// Use case: Annual audit plans presented to the Board or Audit
//           Committee for review and notation.

export const PRESET_AUDIT_COMMITTEE_VERSION: AuditPlanSectionPreset = {
  key: SECTION_PRESET_KEYS.AUDIT_COMMITTEE_VERSION,
  name: 'Audit Committee Version',
  description: 'Board-grade plan with 16 sections. Four signatories including Committee Chair notation.',
  audience: 'Board / Audit Committee',
  isDefault: false,
  sectionOverrides: buildOverrides(
    [
      'cover_page', 'document_control', 'approval_signoff', 'table_of_contents',
      'executive_summary', 'audit_background', 'audit_objective', 'audit_scope',
      'risk_assessment_summary', 'focus_areas', 'methodology',
      'resource_plan', 'timeline_milestones', 'deliverables',
      'communication_protocol', 'independence_statement', 'appendices',
    ],
    {
      focus_areas: 'Key Focus Areas',
      methodology: 'Audit Methodology',
      timeline_milestones: 'Timeline & Key Milestones',
      independence_statement: 'Independence & Confidentiality',
    },
    {},
    {
      table_of_contents: true,
      executive_summary: true,
      risk_assessment_summary: true,
      resource_plan: true,
      communication_protocol: true,
      appendices: true,
    },
  ),
  toc: { enabled: true, depth: 2, showLeaderDots: true },
  appendix: { enabled: true, startNewPage: true, numberingStyle: 'alpha' },
  approval: {
    signatories: [
      { label: 'Prepared By', defaultName: '', roleTitle: 'Internal Auditor' },
      { label: 'Reviewed By', defaultName: '', roleTitle: 'Manager, Internal Audit' },
      { label: 'Approved By', defaultName: '', roleTitle: 'Chief Audit Executive' },
      { label: 'Noted By', defaultName: '', roleTitle: 'Chair, Audit Committee' },
    ],
    showDateField: true,
    showSignatureLine: true,
  },
  watermark: { showWatermark: false, watermarkText: 'DRAFT' },
  exportDefaults: {
    defaultFormat: 'pdf',
    docxEditableNarratives: false,
    draftWatermark: false,
    draftWatermarkText: 'DRAFT',
  },
  governance: { showBoardLine: true, showApprovedByBlock: true },
  riskCoverageEnabled: true,
  planSummary: { hideExactDates: false, splitByType: true },
};

// ════════════════════════════════════════════════════════════════
// 4. WORKING DRAFT VERSION
// ════════════════════════════════════════════════════════════════
//
// 10 sections — content-only, no formalities. TOC disabled. No
// approval block, no signature lines. Watermark always on. DOCX
// editable by default so team members can annotate. No board line.
// Exact dates hidden (shows quarters/months only). No appendices.
//
// Use case: Internal team collaboration during the planning phase.
//           Not for distribution outside the audit department.

export const PRESET_WORKING_DRAFT_VERSION: AuditPlanSectionPreset = {
  key: SECTION_PRESET_KEYS.WORKING_DRAFT_VERSION,
  name: 'Working Draft Version',
  description: 'Lightweight internal draft with watermark. No approval block — for team collaboration only.',
  audience: 'Internal Audit Team',
  isDefault: false,
  sectionOverrides: buildOverrides(
    [
      'cover_page', 'executive_summary',
      'audit_objective', 'audit_scope',
      'risk_assessment_summary', 'focus_areas', 'methodology',
      'resource_plan', 'timeline_milestones', 'deliverables',
    ],
    {
      executive_summary: 'Summary',
      audit_objective: 'Objective',
      audit_scope: 'Scope',
      risk_assessment_summary: 'Risk Assessment',
      focus_areas: 'Focus Areas',
      methodology: 'Methodology',
      resource_plan: 'Resources',
      timeline_milestones: 'Timeline',
      deliverables: 'Deliverables',
    },
    // All inToc = false (TOC disabled anyway)
    Object.fromEntries(ALL_SECTION_IDS.map(id => [id, false])),
    // No page breaks for compact layout
    {},
  ),
  toc: { enabled: false, depth: 1, showLeaderDots: false },
  appendix: { enabled: false, startNewPage: true, numberingStyle: 'alpha' },
  approval: {
    signatories: [],
    showDateField: false,
    showSignatureLine: false,
  },
  watermark: { showWatermark: true, watermarkText: 'WORKING DRAFT' },
  exportDefaults: {
    defaultFormat: 'pdf',
    docxEditableNarratives: true,
    draftWatermark: true,
    draftWatermarkText: 'WORKING DRAFT',
  },
  governance: { showBoardLine: false, showApprovedByBlock: false },
  riskCoverageEnabled: false,
  planSummary: { hideExactDates: true, splitByType: false },
};

// ════════════════════════════════════════════════════════════════
// 5. EXTERNAL REVIEW VERSION
// ════════════════════════════════════════════════════════════════
//
// 18 sections — nearly full, adding Independence, Criteria, Sampling,
// and Planned Procedures over the standard. Three signatories.
// Depth-3 TOC for external reviewer navigation. PDF-only export
// (no editable DOCX for external parties). No draft watermark.
// Full appendix support with roman numbering.
//
// Use case: Plans shared with external auditors, regulators, or
//           quality assurance reviewers. Maximum transparency
//           without internal-only working sections.

export const PRESET_EXTERNAL_REVIEW_VERSION: AuditPlanSectionPreset = {
  key: SECTION_PRESET_KEYS.EXTERNAL_REVIEW_VERSION,
  name: 'External Review Version',
  description: 'Near-complete plan for external auditors and regulators. PDF-only, full appendix support.',
  audience: 'External Auditors / Regulators',
  isDefault: false,
  sectionOverrides: buildOverrides(
    [
      'cover_page', 'document_control', 'approval_signoff', 'table_of_contents',
      'executive_summary', 'audit_background', 'audit_objective', 'audit_scope',
      'audit_criteria', 'risk_assessment_summary', 'focus_areas', 'methodology',
      'planned_procedures', 'sampling_strategy',
      'resource_plan', 'timeline_milestones', 'deliverables',
      'communication_protocol', 'independence_statement', 'limitations',
      'appendices',
    ],
    {
      planned_procedures: 'Planned Procedures Summary',
      sampling_strategy: 'Sampling Approach',
      independence_statement: 'Independence & Objectivity Statement',
      limitations: 'Scope Limitations & Assumptions',
    },
    {},
    {
      table_of_contents: true,
      executive_summary: true,
      risk_assessment_summary: true,
      planned_procedures: true,
      resource_plan: true,
      communication_protocol: true,
      independence_statement: true,
      appendices: true,
    },
  ),
  toc: { enabled: true, depth: 3, showLeaderDots: true },
  appendix: { enabled: true, startNewPage: true, numberingStyle: 'roman' },
  approval: {
    signatories: [
      { label: 'Prepared By', defaultName: '', roleTitle: 'Internal Auditor' },
      { label: 'Reviewed By', defaultName: '', roleTitle: 'Manager, Internal Audit' },
      { label: 'Approved By', defaultName: '', roleTitle: 'Chief Audit Executive' },
    ],
    showDateField: true,
    showSignatureLine: true,
  },
  watermark: { showWatermark: false, watermarkText: 'DRAFT' },
  exportDefaults: {
    defaultFormat: 'pdf',
    docxEditableNarratives: false,
    draftWatermark: false,
    draftWatermarkText: 'DRAFT',
  },
  governance: { showBoardLine: true, showApprovedByBlock: true },
  riskCoverageEnabled: true,
  planSummary: { hideExactDates: false, splitByType: true },
};

// ─── Registry ───

export const SECTION_PRESETS: Record<string, AuditPlanSectionPreset> = {
  [SECTION_PRESET_KEYS.FULL_AUDIT_PLAN]: PRESET_FULL_AUDIT_PLAN,
  [SECTION_PRESET_KEYS.CONCISE_AUDIT_PLAN]: PRESET_CONCISE_AUDIT_PLAN,
  [SECTION_PRESET_KEYS.AUDIT_COMMITTEE_VERSION]: PRESET_AUDIT_COMMITTEE_VERSION,
  [SECTION_PRESET_KEYS.WORKING_DRAFT_VERSION]: PRESET_WORKING_DRAFT_VERSION,
  [SECTION_PRESET_KEYS.EXTERNAL_REVIEW_VERSION]: PRESET_EXTERNAL_REVIEW_VERSION,
};

export const SECTION_PRESET_LIST: AuditPlanSectionPreset[] = [
  PRESET_FULL_AUDIT_PLAN,
  PRESET_CONCISE_AUDIT_PLAN,
  PRESET_AUDIT_COMMITTEE_VERSION,
  PRESET_WORKING_DRAFT_VERSION,
  PRESET_EXTERNAL_REVIEW_VERSION,
];

export const RECOMMENDED_SECTION_PRESET_KEY = SECTION_PRESET_KEYS.FULL_AUDIT_PLAN;

/** Returns a preset by key or falls back to Full Audit Plan. */
export function getSectionPreset(key: string): AuditPlanSectionPreset {
  return SECTION_PRESETS[key] ?? PRESET_FULL_AUDIT_PLAN;
}

// ─── Preset Application ───

/**
 * Applies a section preset onto a template config, producing a new config
 * with section visibility, TOC, approval, watermark, and export settings
 * from the preset while preserving all visual formatting from the template.
 *
 * This is the core integration point between section presets and templates:
 * - Template controls HOW it looks (colors, fonts, table styles, page layout)
 * - Section preset controls WHAT appears (sections, TOC, approval, watermark)
 */
export function applySectionPreset(
  templateConfig: AuditPlanFullTemplateConfig,
  presetKey: string,
): AuditPlanFullTemplateConfig {
  const preset = getSectionPreset(presetKey);

  // Build section list by applying preset overrides to template sections
  const presetOverrideMap = new Map(
    preset.sectionOverrides.map((o) => [o.id, o])
  );

  const updatedSections: AuditPlanSection[] = templateConfig.sections.map((section) => {
    const override = presetOverrideMap.get(section.id);
    if (!override) return section;

    return {
      ...section,
      enabled: section.mandatory ? true : override.enabled,
      ...(override.labelOverride ? { labelOverride: override.labelOverride } : {}),
      ...(override.inToc !== undefined ? { inToc: override.inToc } : {}),
      ...(override.startNewPage !== undefined ? { startNewPage: override.startNewPage } : {}),
    };
  });

  return {
    ...templateConfig,
    sections: updatedSections,
    toc: {
      ...templateConfig.toc,
      enabled: preset.toc.enabled,
      depth: preset.toc.depth,
      showLeaderDots: preset.toc.showLeaderDots,
    },
    approval: {
      ...templateConfig.approval,
      signatories: preset.approval.signatories.length > 0
        ? preset.approval.signatories
        : templateConfig.approval.signatories,
      showDateField: preset.approval.showDateField,
      showSignatureLine: preset.approval.showSignatureLine,
    },
    branding: {
      ...templateConfig.branding,
      showWatermark: preset.watermark.showWatermark,
      watermarkText: preset.watermark.watermarkText,
    },
    exportDefaults: {
      ...preset.exportDefaults,
    },
    governance: {
      ...templateConfig.governance,
      showBoardLine: preset.governance.showBoardLine,
      showApprovedByBlock: preset.governance.showApprovedByBlock,
    },
    riskCoverage: { enabled: preset.riskCoverageEnabled },
    planSummary: {
      ...templateConfig.planSummary,
      hideExactDates: preset.planSummary.hideExactDates,
      splitByType: preset.planSummary.splitByType,
    },
  };
}

// ─── Comparison Utilities ───

export interface SectionPresetDiff {
  presetA: string;
  presetB: string;
  sectionDifferences: {
    sectionId: string;
    sectionLabel: string;
    enabledInA: boolean;
    enabledInB: boolean;
  }[];
  tocDifferences: string[];
  approvalDifferences: string[];
  watermarkDifferences: string[];
  exportDifferences: string[];
}

/**
 * Compares two section presets and returns their differences.
 * Useful for UI display when users are choosing between presets.
 */
export function compareSectionPresets(
  keyA: string,
  keyB: string,
): SectionPresetDiff {
  const a = getSectionPreset(keyA);
  const b = getSectionPreset(keyB);

  const overrideMapA = new Map(a.sectionOverrides.map((o) => [o.id, o]));
  const overrideMapB = new Map(b.sectionOverrides.map((o) => [o.id, o]));

  const sectionDifferences = ALL_SECTION_IDS
    .filter((id) => {
      const inA = overrideMapA.get(id)?.enabled ?? false;
      const inB = overrideMapB.get(id)?.enabled ?? false;
      return inA !== inB;
    })
    .map((id) => ({
      sectionId: id,
      sectionLabel: overrideMapA.get(id)?.labelOverride || overrideMapB.get(id)?.labelOverride || id.replace(/_/g, ' '),
      enabledInA: overrideMapA.get(id)?.enabled ?? false,
      enabledInB: overrideMapB.get(id)?.enabled ?? false,
    }));

  const tocDifferences: string[] = [];
  if (a.toc.enabled !== b.toc.enabled) tocDifferences.push(`TOC: ${a.toc.enabled ? 'on' : 'off'} vs ${b.toc.enabled ? 'on' : 'off'}`);
  if (a.toc.depth !== b.toc.depth) tocDifferences.push(`Depth: ${a.toc.depth} vs ${b.toc.depth}`);

  const approvalDifferences: string[] = [];
  if (a.approval.signatories.length !== b.approval.signatories.length) {
    approvalDifferences.push(`Signatories: ${a.approval.signatories.length} vs ${b.approval.signatories.length}`);
  }
  if (a.approval.showSignatureLine !== b.approval.showSignatureLine) {
    approvalDifferences.push(`Signature line: ${a.approval.showSignatureLine ? 'yes' : 'no'} vs ${b.approval.showSignatureLine ? 'yes' : 'no'}`);
  }

  const watermarkDifferences: string[] = [];
  if (a.watermark.showWatermark !== b.watermark.showWatermark) {
    watermarkDifferences.push(`Watermark: ${a.watermark.showWatermark ? 'on' : 'off'} vs ${b.watermark.showWatermark ? 'on' : 'off'}`);
  }

  const exportDifferences: string[] = [];
  if (a.exportDefaults.defaultFormat !== b.exportDefaults.defaultFormat) {
    exportDifferences.push(`Format: ${a.exportDefaults.defaultFormat} vs ${b.exportDefaults.defaultFormat}`);
  }
  if (a.exportDefaults.docxEditableNarratives !== b.exportDefaults.docxEditableNarratives) {
    exportDifferences.push(`Editable DOCX: ${a.exportDefaults.docxEditableNarratives ? 'yes' : 'no'} vs ${b.exportDefaults.docxEditableNarratives ? 'yes' : 'no'}`);
  }

  return {
    presetA: a.name,
    presetB: b.name,
    sectionDifferences,
    tocDifferences,
    approvalDifferences,
    watermarkDifferences,
    exportDifferences,
  };
}

// ─── Metadata for UI ───

export interface SectionPresetMeta {
  key: string;
  name: string;
  description: string;
  audience: string;
  isDefault: boolean;
  enabledSectionCount: number;
  tocEnabled: boolean;
  tocDepth: number;
  signatoryCount: number;
  hasWatermark: boolean;
  hasAppendix: boolean;
  defaultFormat: string;
}

export const SECTION_PRESET_METADATA: SectionPresetMeta[] = SECTION_PRESET_LIST.map((p) => ({
  key: p.key,
  name: p.name,
  description: p.description,
  audience: p.audience,
  isDefault: p.isDefault,
  enabledSectionCount: p.sectionOverrides.filter((s) => s.enabled).length,
  tocEnabled: p.toc.enabled,
  tocDepth: p.toc.depth,
  signatoryCount: p.approval.signatories.length,
  hasWatermark: p.watermark.showWatermark,
  hasAppendix: p.appendix.enabled,
  defaultFormat: p.exportDefaults.defaultFormat,
}));
