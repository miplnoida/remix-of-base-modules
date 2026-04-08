/**
 * Audit Plan Formatting Engine — Built-in Template Presets
 *
 * Five professionally designed templates that ship with the system.
 * These are seeded in the DB via migration and used as fallback defaults
 * when the DB row hasn't been customized yet.
 *
 * ┌──────────────────────────┬──────────────┬─────────────┬──────────────┬──────────────────────┬────────────────┐
 * │ Template                 │ Palette      │ Cover Style │ Font         │ Sections Enabled     │ Audience       │
 * ├──────────────────────────┼──────────────┼─────────────┼──────────────┼──────────────────────┼────────────────┤
 * │ Audit Blue Minimal ★    │ Navy #1E3A5F │ minimal     │ Arial 11pt   │ 14 of 22             │ General/Mgmt   │
 * │ Government Formal        │ Dark #1B2838 │ formal      │ TNR 12pt     │ 22 of 22             │ Gov/Regulatory │
 * │ Professional Minimal     │ Char #2C3E50 │ modern      │ Calibri 11pt │ 12 of 22             │ Corporate      │
 * │ Audit Committee Pack     │ Blue #1A237E │ formal      │ Arial 11pt   │ 16 of 22             │ Board/AC       │
 * │ Working Draft            │ Slate #455A64│ minimal     │ Calibri 10pt │ 10 of 22             │ Internal WIP   │
 * └──────────────────────────┴──────────────┴─────────────┴──────────────┴──────────────────────┴────────────────┘
 *
 * ★ = Recommended house default
 */

import type { AuditPlanFullTemplateConfig, AuditPlanSection } from './auditPlanTemplateTypes';
import { TEMPLATE_KEYS } from './auditPlanTemplateTypes';

// ─── Helper: create section list with selective overrides ───

function buildSections(
  overrides: Partial<Record<string, Partial<AuditPlanSection>>>
): AuditPlanSection[] {
  const base: AuditPlanSection[] = [
    { id: 'cover_page', label: 'Cover Page', enabled: true, order: 1, inToc: false, startNewPage: false, displayMode: 'auto', mandatory: true },
    { id: 'document_control', label: 'Document Control', enabled: true, order: 2, inToc: true, startNewPage: false, displayMode: 'table', mandatory: false },
    { id: 'approval_signoff', label: 'Approval / Sign-off', enabled: true, order: 3, inToc: true, startNewPage: false, displayMode: 'table', mandatory: false },
    { id: 'table_of_contents', label: 'Table of Contents', enabled: true, order: 4, inToc: false, startNewPage: true, displayMode: 'auto', mandatory: false },
    { id: 'executive_summary', label: 'Executive Summary', enabled: true, order: 5, inToc: true, startNewPage: true, displayMode: 'narrative', mandatory: false },
    { id: 'audit_background', label: 'Audit Background', enabled: true, order: 6, inToc: true, startNewPage: false, displayMode: 'narrative', mandatory: false },
    { id: 'audit_objective', label: 'Audit Objective', enabled: true, order: 7, inToc: true, startNewPage: false, displayMode: 'narrative', mandatory: true },
    { id: 'audit_scope', label: 'Audit Scope', enabled: true, order: 8, inToc: true, startNewPage: false, displayMode: 'narrative', mandatory: true },
    { id: 'audit_criteria', label: 'Audit Criteria', enabled: false, order: 9, inToc: true, startNewPage: false, displayMode: 'narrative', mandatory: false },
    { id: 'risk_assessment_summary', label: 'Risk Assessment Summary', enabled: true, order: 10, inToc: true, startNewPage: true, displayMode: 'table', mandatory: false },
    { id: 'focus_areas', label: 'Focus Areas / Audit Questions', enabled: true, order: 11, inToc: true, startNewPage: false, displayMode: 'table', mandatory: false },
    { id: 'methodology', label: 'Audit Approach / Methodology', enabled: true, order: 12, inToc: true, startNewPage: false, displayMode: 'narrative', mandatory: false },
    { id: 'planned_procedures', label: 'Planned Procedures / Work Program', enabled: false, order: 13, inToc: true, startNewPage: false, displayMode: 'table', mandatory: false },
    { id: 'sampling_strategy', label: 'Sampling Strategy', enabled: false, order: 14, inToc: true, startNewPage: false, displayMode: 'narrative', mandatory: false },
    { id: 'information_required', label: 'Information Required', enabled: false, order: 15, inToc: true, startNewPage: false, displayMode: 'table', mandatory: false },
    { id: 'resource_plan', label: 'Resource Plan', enabled: true, order: 16, inToc: true, startNewPage: true, displayMode: 'table', mandatory: false },
    { id: 'timeline_milestones', label: 'Timeline / Milestones', enabled: true, order: 17, inToc: true, startNewPage: false, displayMode: 'table', mandatory: false },
    { id: 'deliverables', label: 'Deliverables', enabled: true, order: 18, inToc: true, startNewPage: false, displayMode: 'table', mandatory: false },
    { id: 'communication_protocol', label: 'Communication & Reporting Protocol', enabled: true, order: 19, inToc: true, startNewPage: false, displayMode: 'narrative', mandatory: false },
    { id: 'independence_statement', label: 'Independence / Confidentiality Statement', enabled: false, order: 20, inToc: true, startNewPage: false, displayMode: 'narrative', mandatory: false },
    { id: 'limitations', label: 'Limitations / Assumptions', enabled: false, order: 21, inToc: true, startNewPage: false, displayMode: 'narrative', mandatory: false },
    { id: 'appendices', label: 'Appendices', enabled: false, order: 22, inToc: true, startNewPage: true, displayMode: 'auto', mandatory: false },
  ];

  return base.map((s) => (overrides[s.id] ? { ...s, ...overrides[s.id] } : s));
}

// ════════════════════════════════════════════════════════════════
// 1. AUDIT BLUE MINIMAL ★ (Recommended House Default)
// ════════════════════════════════════════════════════════════════
//
// Audience:    General management, internal stakeholders
// Use case:    Day-to-day audit plans — balanced detail without excess
// Rationale:   Navy blue is authoritative yet restrained. Arial at 11pt
//              is universally readable. Minimal cover avoids visual clutter.
//              14 of 22 sections enabled — enough for substance without
//              drowning in boilerplate. Leader-dotted TOC at depth 2 for
//              quick navigation. Page breaks on major transitions only.
//
// Why default: Navy/slate is the most universally professional palette.
//              It prints well on mono and color printers, renders cleanly
//              on screens, and avoids the "too corporate" feel of black
//              or the "too branded" feel of vivid colors.

export const PRESET_AUDIT_BLUE_MINIMAL: AuditPlanFullTemplateConfig = {
  branding: {
    logoMode: 'cover_only',
    logoSource: 'default',
    logoSize: 'medium',
    logoAlignment: 'center',
    orgName: '',
    confidentialLabel: 'CONFIDENTIAL',
    showWatermark: false,
    watermarkText: 'DRAFT',
    colorPalette: {
      primary: '#1E3A5F',      // Navy — headings, cover accent bar, table headers
      secondary: '#4A7FB5',    // Medium blue — sub-headings, subtle borders
      accent: '#E8F0FE',       // Ice blue — TOC background, callout boxes
      tableHeader: '#1E3A5F',  // Navy
      tableStripe: '#F5F8FC',  // Very light blue-gray
      text: '#1A1A1A',         // Near-black for body text
    },
  },
  coverPage: {
    titleText: 'Internal Audit Plan',
    showOrgName: true,
    showAuditableEntity: true,
    showPeriodCovered: true,
    showVersionNumber: true,
    showIssueDate: true,
    showConfidentialLabel: true,
    fiscalYearMode: 'single',
    coverStyle: 'minimal',
  },
  toc: {
    enabled: true,
    title: 'Table of Contents',
    depth: 2,
    showLeaderDots: true,
    showPageNumbers: true,
  },
  pagination: {
    showPageNumbers: true,
    hideOnCover: true,
    frontMatterStyle: 'roman',
    bodyStyle: 'arabic',
    appendixStyle: 'arabic',
    position: 'bottom-center',
    pageBreakBetweenSections: true,
  },
  sections: buildSections({
    // Defaults are fine for this template — 14 enabled, 8 disabled
  }),
  approval: {
    signatories: [
      { label: 'Prepared By', defaultName: '', roleTitle: 'Internal Auditor' },
      { label: 'Reviewed By', defaultName: '', roleTitle: 'Manager, Internal Audit' },
      { label: 'Approved By', defaultName: '', roleTitle: 'Director' },
    ],
    showDateField: true,
    showSignatureLine: true,
  },
  tableStyle: {
    headerBackground: '#1E3A5F',
    headerTextColor: '#FFFFFF',
    stripedRows: true,
    stripeColor: '#F5F8FC',
    borderColor: '#D1D5DB',
    repeatHeaderOnPageBreak: true,
    fontSize: 'normal',
  },
  typography: {
    fontFamily: 'Arial',
    headingFont: 'Arial',
    baseFontSize: 11,
    headingColor: '#1E3A5F',
    bodyColor: '#1A1A1A',
    lineHeight: 1.5,
  },
  exportDefaults: {
    defaultFormat: 'pdf',
    docxEditableNarratives: true,
    draftWatermark: false,
    draftWatermarkText: 'DRAFT',
  },
};

// ════════════════════════════════════════════════════════════════
// 2. GOVERNMENT FORMAL
// ════════════════════════════════════════════════════════════════
//
// Audience:    Government audit offices, regulatory bodies, SAIs
// Use case:    Formal audit plans requiring full documentation coverage,
//              strict pagination, and conservative visual treatment
// Rationale:   All 22 sections enabled — government auditors typically
//              require every standard IIA section. Times New Roman 12pt
//              matches government document standards. Roman numeral front
//              matter signals formality. Depth-3 TOC ensures complete
//              navigability for lengthy documents. Formal cover with
//              centered logo, full confidentiality disclaimer.

export const PRESET_GOVERNMENT_FORMAL: AuditPlanFullTemplateConfig = {
  branding: {
    logoMode: 'cover_and_header',
    logoSource: 'default',
    logoSize: 'large',
    logoAlignment: 'center',
    orgName: '',
    confidentialLabel: 'CONFIDENTIAL — FOR OFFICIAL USE ONLY',
    showWatermark: false,
    watermarkText: 'DRAFT',
    colorPalette: {
      primary: '#1B2838',      // Dark charcoal-navy
      secondary: '#6B7B8D',    // Muted steel gray
      accent: '#E8ECF0',       // Light gray
      tableHeader: '#1B2838',
      tableStripe: '#F3F4F6',
      text: '#111111',
    },
  },
  coverPage: {
    titleText: 'Internal Audit Plan',
    showOrgName: true,
    showAuditableEntity: true,
    showPeriodCovered: true,
    showVersionNumber: true,
    showIssueDate: true,
    showConfidentialLabel: true,
    fiscalYearMode: 'range',
    coverStyle: 'formal',
  },
  toc: {
    enabled: true,
    title: 'Table of Contents',
    depth: 3,
    showLeaderDots: true,
    showPageNumbers: true,
  },
  pagination: {
    showPageNumbers: true,
    hideOnCover: true,
    frontMatterStyle: 'roman',
    bodyStyle: 'arabic',
    appendixStyle: 'roman',
    position: 'bottom-center',
    pageBreakBetweenSections: true,
  },
  sections: buildSections({
    // Enable ALL sections for government formal
    audit_criteria: { enabled: true },
    planned_procedures: { enabled: true, label: 'Planned Procedures / Work Program Summary', startNewPage: true },
    sampling_strategy: { enabled: true },
    information_required: { enabled: true },
    independence_statement: { enabled: true },
    limitations: { enabled: true },
    appendices: { enabled: true },
    communication_protocol: { startNewPage: true },
  }),
  approval: {
    signatories: [
      { label: 'Prepared By', defaultName: '', roleTitle: 'Internal Auditor' },
      { label: 'Reviewed By', defaultName: '', roleTitle: 'Senior Auditor' },
      { label: 'Approved By', defaultName: '', roleTitle: 'Chief Audit Executive' },
    ],
    showDateField: true,
    showSignatureLine: true,
  },
  tableStyle: {
    headerBackground: '#1B2838',
    headerTextColor: '#FFFFFF',
    stripedRows: true,
    stripeColor: '#F3F4F6',
    borderColor: '#C4C9CF',
    repeatHeaderOnPageBreak: true,
    fontSize: 'normal',
  },
  typography: {
    fontFamily: 'Times New Roman',
    headingFont: 'Times New Roman',
    baseFontSize: 12,
    headingColor: '#1B2838',
    bodyColor: '#111111',
    lineHeight: 1.6,
  },
  exportDefaults: {
    defaultFormat: 'pdf',
    docxEditableNarratives: true,
    draftWatermark: false,
    draftWatermarkText: 'DRAFT',
  },
};

// ════════════════════════════════════════════════════════════════
// 3. PROFESSIONAL MINIMAL
// ════════════════════════════════════════════════════════════════
//
// Audience:    Private-sector / corporate audit functions
// Use case:    Concise, modern-looking audit plans that cut boilerplate
// Rationale:   Only 12 sections enabled — strips Document Control,
//              Background, Criteria, Work Program, Sampling, Information
//              Required, Independence, Limitations, Appendices. Modern
//              cover with left-aligned small logo. No leader dots in TOC
//              for a cleaner look. Bottom-right page numbers. Calibri 11pt
//              is the standard corporate font. No page breaks between
//              sections — content flows continuously for a lean read.

export const PRESET_PROFESSIONAL_MINIMAL: AuditPlanFullTemplateConfig = {
  branding: {
    logoMode: 'cover_only',
    logoSource: 'default',
    logoSize: 'small',
    logoAlignment: 'left',
    orgName: '',
    confidentialLabel: 'Confidential',
    showWatermark: false,
    watermarkText: 'DRAFT',
    colorPalette: {
      primary: '#2C3E50',      // Charcoal
      secondary: '#7F8C8D',    // Warm gray
      accent: '#EBF0F5',       // Pale blue-gray
      tableHeader: '#2C3E50',
      tableStripe: '#FAFBFC',
      text: '#2C3E50',
    },
  },
  coverPage: {
    titleText: 'Audit Plan',
    showOrgName: true,
    showAuditableEntity: true,
    showPeriodCovered: true,
    showVersionNumber: false,
    showIssueDate: true,
    showConfidentialLabel: true,
    fiscalYearMode: 'single',
    coverStyle: 'modern',
  },
  toc: {
    enabled: true,
    title: 'Contents',
    depth: 2,
    showLeaderDots: false,
    showPageNumbers: true,
  },
  pagination: {
    showPageNumbers: true,
    hideOnCover: true,
    frontMatterStyle: 'none',
    bodyStyle: 'arabic',
    appendixStyle: 'alpha',
    position: 'bottom-right',
    pageBreakBetweenSections: false,
  },
  sections: buildSections({
    document_control: { enabled: false, inToc: false },
    approval_signoff: { label: 'Approval' },
    table_of_contents: { label: 'Contents' },
    audit_background: { enabled: false, label: 'Background' },
    audit_objective: { label: 'Objective' },
    audit_scope: { label: 'Scope' },
    audit_criteria: { enabled: false, label: 'Criteria' },
    focus_areas: { label: 'Focus Areas' },
    methodology: { label: 'Methodology' },
    resource_plan: { label: 'Resources' },
    timeline_milestones: { label: 'Timeline' },
    communication_protocol: { label: 'Communication Protocol' },
    independence_statement: { enabled: false, label: 'Independence Statement' },
    limitations: { enabled: false, label: 'Limitations' },
    appendices: { enabled: false },
  }),
  approval: {
    signatories: [
      { label: 'Prepared By', defaultName: '', roleTitle: 'Auditor' },
      { label: 'Approved By', defaultName: '', roleTitle: 'Audit Manager' },
    ],
    showDateField: true,
    showSignatureLine: false,
  },
  tableStyle: {
    headerBackground: '#2C3E50',
    headerTextColor: '#FFFFFF',
    stripedRows: true,
    stripeColor: '#FAFBFC',
    borderColor: '#E5E7EB',
    repeatHeaderOnPageBreak: true,
    fontSize: 'small',
  },
  typography: {
    fontFamily: 'Calibri',
    headingFont: 'Calibri',
    baseFontSize: 11,
    headingColor: '#2C3E50',
    bodyColor: '#2C3E50',
    lineHeight: 1.4,
  },
  exportDefaults: {
    defaultFormat: 'pdf',
    docxEditableNarratives: true,
    draftWatermark: false,
    draftWatermarkText: 'DRAFT',
  },
};

// ════════════════════════════════════════════════════════════════
// 4. AUDIT COMMITTEE PACK
// ════════════════════════════════════════════════════════════════
//
// Audience:    Board of Directors, Audit Committee members
// Use case:    Formal presentation-grade audit plans for governance
//              oversight. Emphasizes executive summary and risk assessment.
// Rationale:   Deep indigo blue conveys authority and seriousness.
//              4 signatories including "Noted By — Chair, Audit Committee".
//              Full confidentiality label for board-level sensitivity.
//              Year-range format for annual plans. 16 sections enabled —
//              all core content plus Independence and Appendices.
//              Focus Areas renamed to "Key Focus Areas" for board clarity.

export const PRESET_AUDIT_COMMITTEE_PACK: AuditPlanFullTemplateConfig = {
  branding: {
    logoMode: 'cover_and_header',
    logoSource: 'default',
    logoSize: 'medium',
    logoAlignment: 'left',
    orgName: '',
    confidentialLabel: 'CONFIDENTIAL — FOR BOARD USE ONLY',
    showWatermark: false,
    watermarkText: 'DRAFT',
    colorPalette: {
      primary: '#1A237E',      // Deep indigo
      secondary: '#3949AB',    // Medium indigo
      accent: '#E8EAF6',       // Pale indigo
      tableHeader: '#1A237E',
      tableStripe: '#F5F5FF',
      text: '#1A1A2E',
    },
  },
  coverPage: {
    titleText: 'Annual Internal Audit Plan',
    showOrgName: true,
    showAuditableEntity: false,
    showPeriodCovered: true,
    showVersionNumber: true,
    showIssueDate: true,
    showConfidentialLabel: true,
    fiscalYearMode: 'range',
    coverStyle: 'formal',
  },
  toc: {
    enabled: true,
    title: 'Table of Contents',
    depth: 2,
    showLeaderDots: true,
    showPageNumbers: true,
  },
  pagination: {
    showPageNumbers: true,
    hideOnCover: true,
    frontMatterStyle: 'roman',
    bodyStyle: 'arabic',
    appendixStyle: 'arabic',
    position: 'bottom-center',
    pageBreakBetweenSections: true,
  },
  sections: buildSections({
    focus_areas: { label: 'Key Focus Areas' },
    methodology: { label: 'Audit Methodology' },
    timeline_milestones: { label: 'Timeline & Key Milestones' },
    independence_statement: { enabled: true, label: 'Independence & Confidentiality' },
    appendices: { enabled: true },
    communication_protocol: { startNewPage: true },
  }),
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
  tableStyle: {
    headerBackground: '#1A237E',
    headerTextColor: '#FFFFFF',
    stripedRows: true,
    stripeColor: '#F5F5FF',
    borderColor: '#C5CAE9',
    repeatHeaderOnPageBreak: true,
    fontSize: 'normal',
  },
  typography: {
    fontFamily: 'Arial',
    headingFont: 'Arial',
    baseFontSize: 11,
    headingColor: '#1A237E',
    bodyColor: '#1A1A2E',
    lineHeight: 1.5,
  },
  exportDefaults: {
    defaultFormat: 'pdf',
    docxEditableNarratives: true,
    draftWatermark: false,
    draftWatermarkText: 'DRAFT',
  },
};

// ════════════════════════════════════════════════════════════════
// 5. WORKING DRAFT
// ════════════════════════════════════════════════════════════════
//
// Audience:    Internal audit team only — not for distribution
// Use case:    Rapidly evolving plans during planning phase. Watermark
//              signals "not final." No approval block, no cover branding,
//              no TOC — pure working content. Compact typography (10pt)
//              to fit more on screen/paper during review.
// Rationale:   Blue-gray slate is unobtrusive. No logo, no confidential
//              label — this isn't leaving the audit department. Only 10
//              sections: summary, objectives, scope, risk, focus areas,
//              methodology, resources, timeline, deliverables. Everything
//              else is noise at the drafting stage.

export const PRESET_WORKING_DRAFT: AuditPlanFullTemplateConfig = {
  branding: {
    logoMode: 'none',
    logoSource: 'default',
    logoSize: 'small',
    logoAlignment: 'left',
    orgName: '',
    confidentialLabel: '',
    showWatermark: true,
    watermarkText: 'WORKING DRAFT',
    colorPalette: {
      primary: '#455A64',      // Blue-gray slate
      secondary: '#90A4AE',    // Light slate
      accent: '#ECEFF1',       // Very light gray
      tableHeader: '#455A64',
      tableStripe: '#F5F5F5',
      text: '#37474F',
    },
  },
  coverPage: {
    titleText: 'Audit Plan — Working Draft',
    showOrgName: false,
    showAuditableEntity: true,
    showPeriodCovered: true,
    showVersionNumber: true,
    showIssueDate: true,
    showConfidentialLabel: false,
    fiscalYearMode: 'single',
    coverStyle: 'minimal',
  },
  toc: {
    enabled: false,
    title: 'Contents',
    depth: 1,
    showLeaderDots: false,
    showPageNumbers: false,
  },
  pagination: {
    showPageNumbers: true,
    hideOnCover: false,
    frontMatterStyle: 'none',
    bodyStyle: 'arabic',
    appendixStyle: 'arabic',
    position: 'bottom-right',
    pageBreakBetweenSections: false,
  },
  sections: buildSections({
    document_control: { enabled: false, inToc: false },
    approval_signoff: { enabled: false, label: 'Approval', inToc: false },
    table_of_contents: { enabled: false, label: 'Contents', inToc: false },
    executive_summary: { label: 'Summary', inToc: false },
    audit_background: { label: 'Background', inToc: false },
    audit_objective: { label: 'Objective', inToc: false },
    audit_scope: { label: 'Scope', inToc: false },
    audit_criteria: { enabled: false, label: 'Criteria', inToc: false },
    risk_assessment_summary: { label: 'Risk Assessment', inToc: false, startNewPage: false },
    focus_areas: { label: 'Focus Areas', inToc: false },
    methodology: { label: 'Methodology', inToc: false },
    planned_procedures: { enabled: false, label: 'Work Program', inToc: false },
    sampling_strategy: { enabled: false, label: 'Sampling', inToc: false },
    information_required: { enabled: false, label: 'Info Required', inToc: false },
    resource_plan: { label: 'Resources', inToc: false, startNewPage: false },
    timeline_milestones: { label: 'Timeline', inToc: false },
    deliverables: { label: 'Deliverables', inToc: false },
    communication_protocol: { enabled: false, label: 'Communication', inToc: false },
    independence_statement: { enabled: false, label: 'Independence', inToc: false },
    limitations: { enabled: false, label: 'Limitations', inToc: false },
    appendices: { enabled: false, inToc: false },
  }),
  approval: {
    signatories: [],
    showDateField: false,
    showSignatureLine: false,
  },
  tableStyle: {
    headerBackground: '#455A64',
    headerTextColor: '#FFFFFF',
    stripedRows: false,
    stripeColor: '#F5F5F5',
    borderColor: '#CFD8DC',
    repeatHeaderOnPageBreak: true,
    fontSize: 'small',
  },
  typography: {
    fontFamily: 'Calibri',
    headingFont: 'Calibri',
    baseFontSize: 10,
    headingColor: '#455A64',
    bodyColor: '#37474F',
    lineHeight: 1.4,
  },
  exportDefaults: {
    defaultFormat: 'pdf',
    docxEditableNarratives: true,
    draftWatermark: true,
    draftWatermarkText: 'WORKING DRAFT',
  },
};

// ─── Registry: all presets keyed by template_key ───

export const AUDIT_PLAN_TEMPLATE_PRESETS: Record<string, AuditPlanFullTemplateConfig> = {
  [TEMPLATE_KEYS.AUDIT_BLUE_MINIMAL]: PRESET_AUDIT_BLUE_MINIMAL,
  [TEMPLATE_KEYS.GOVERNMENT_FORMAL]: PRESET_GOVERNMENT_FORMAL,
  [TEMPLATE_KEYS.PROFESSIONAL_MINIMAL]: PRESET_PROFESSIONAL_MINIMAL,
  [TEMPLATE_KEYS.AUDIT_COMMITTEE_PACK]: PRESET_AUDIT_COMMITTEE_PACK,
  [TEMPLATE_KEYS.WORKING_DRAFT]: PRESET_WORKING_DRAFT,
};

/** Returns the default template config for a given key, or falls back to Audit Blue Minimal. */
export function getPresetConfig(key: string): AuditPlanFullTemplateConfig {
  return AUDIT_PLAN_TEMPLATE_PRESETS[key] ?? PRESET_AUDIT_BLUE_MINIMAL;
}

/** Returns the recommended house default. */
export const RECOMMENDED_DEFAULT_KEY = TEMPLATE_KEYS.AUDIT_BLUE_MINIMAL;

// ─── Template Metadata (for UI display) ───

export interface TemplatePresetMeta {
  key: string;
  name: string;
  description: string;
  audience: string;
  enabledSectionCount: number;
  coverStyle: string;
  font: string;
  primaryColor: string;
}

export const TEMPLATE_PRESET_METADATA: TemplatePresetMeta[] = [
  {
    key: TEMPLATE_KEYS.AUDIT_BLUE_MINIMAL,
    name: 'Audit Blue Minimal',
    description: 'Clean navy palette with balanced section coverage. The recommended default for most audit plans.',
    audience: 'General / Management',
    enabledSectionCount: PRESET_AUDIT_BLUE_MINIMAL.sections.filter(s => s.enabled).length,
    coverStyle: 'Minimal',
    font: 'Arial 11pt',
    primaryColor: '#1E3A5F',
  },
  {
    key: TEMPLATE_KEYS.GOVERNMENT_FORMAL,
    name: 'Government Formal',
    description: 'Full-coverage formal style with all 22 sections. Conservative typography for government audit offices.',
    audience: 'Government / Regulatory',
    enabledSectionCount: PRESET_GOVERNMENT_FORMAL.sections.filter(s => s.enabled).length,
    coverStyle: 'Formal',
    font: 'Times New Roman 12pt',
    primaryColor: '#1B2838',
  },
  {
    key: TEMPLATE_KEYS.PROFESSIONAL_MINIMAL,
    name: 'Professional Minimal',
    description: 'Modern, concise layout with reduced sections. Clean look for corporate audit functions.',
    audience: 'Corporate / Private Sector',
    enabledSectionCount: PRESET_PROFESSIONAL_MINIMAL.sections.filter(s => s.enabled).length,
    coverStyle: 'Modern',
    font: 'Calibri 11pt',
    primaryColor: '#2C3E50',
  },
  {
    key: TEMPLATE_KEYS.AUDIT_COMMITTEE_PACK,
    name: 'Audit Committee Pack',
    description: 'Formal deep-blue style with 4 signatories. Emphasizes executive summary and risk assessment for board presentation.',
    audience: 'Board / Audit Committee',
    enabledSectionCount: PRESET_AUDIT_COMMITTEE_PACK.sections.filter(s => s.enabled).length,
    coverStyle: 'Formal',
    font: 'Arial 11pt',
    primaryColor: '#1A237E',
  },
  {
    key: TEMPLATE_KEYS.WORKING_DRAFT,
    name: 'Working Draft',
    description: 'Lightweight internal template with watermark. Minimal formatting for plans still in development.',
    audience: 'Internal Audit Team',
    enabledSectionCount: PRESET_WORKING_DRAFT.sections.filter(s => s.enabled).length,
    coverStyle: 'Minimal',
    font: 'Calibri 10pt',
    primaryColor: '#455A64',
  },
];
