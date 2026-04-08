/**
 * Audit Plan Formatting Engine — TypeScript Interfaces
 *
 * These types define the full configuration shape stored in
 * `ia_audit_plan_templates.config_json`. They are consumed by the
 * template editor UI, the resolver/mapper pipeline, and the
 * PDF/DOCX/print export engines.
 */

// ─── Color Palette ───

export interface AuditPlanColorPalette {
  /** Primary brand color — headings, cover accents, table headers */
  primary: string;
  /** Secondary color — sub-headings, borders, subtle accents */
  secondary: string;
  /** Light accent — background fills, callout boxes, TOC shading */
  accent: string;
  /** Table header background */
  tableHeader: string;
  /** Alternating table row fill */
  tableStripe: string;
  /** Base text color */
  text: string;
}

// ─── Branding & Cover ───

export type LogoMode = 'cover_only' | 'cover_and_header' | 'none';
export type LogoSize = 'small' | 'medium' | 'large';
export type LogoAlignment = 'left' | 'center' | 'right';
export type CoverStyle = 'formal' | 'minimal' | 'modern';

export interface AuditPlanBranding {
  logoMode: LogoMode;
  logoSource: string; // 'default' | storage URL
  logoSize: LogoSize;
  logoAlignment: LogoAlignment;
  orgName: string;
  confidentialLabel: string;
  showWatermark: boolean;
  watermarkText: string;
  colorPalette: AuditPlanColorPalette;
}

export interface AuditPlanCoverPageConfig {
  titleText: string;
  showOrgName: boolean;
  showAuditableEntity: boolean;
  showPeriodCovered: boolean;
  showVersionNumber: boolean;
  showIssueDate: boolean;
  showConfidentialLabel: boolean;
  fiscalYearMode: 'single' | 'range';
  coverStyle: CoverStyle;
}

// ─── TOC & Pagination ───

export type NumberingStyle = 'roman' | 'arabic' | 'alpha' | 'none';
export type PageNumberPosition = 'bottom-center' | 'bottom-right' | 'top-right';

export interface AuditPlanTocConfig {
  enabled: boolean;
  title: string;
  depth: 1 | 2 | 3;
  showLeaderDots: boolean;
  showPageNumbers: boolean;
}

export interface AuditPlanPaginationConfig {
  showPageNumbers: boolean;
  hideOnCover: boolean;
  frontMatterStyle: NumberingStyle;
  bodyStyle: 'arabic' | 'roman';
  appendixStyle: NumberingStyle;
  position: PageNumberPosition;
  pageBreakBetweenSections: boolean;
}

// ─── Page Layout ───

export type PageSize = 'letter' | 'a4' | 'legal';
export type PageOrientation = 'portrait' | 'landscape';

export interface AuditPlanPageMargins {
  top: number;    // inches
  bottom: number;
  left: number;
  right: number;
}

export interface AuditPlanPageLayout {
  pageSize: PageSize;
  orientation: PageOrientation;
  margins: AuditPlanPageMargins;
}

// ─── Section Configuration ───

export type SectionDisplayMode = 'narrative' | 'table' | 'auto';

export interface AuditPlanSection {
  id: string;
  label: string;
  enabled: boolean;
  order: number;
  inToc: boolean;
  startNewPage: boolean;
  displayMode: SectionDisplayMode;
  /** Whether this section is mandatory (cannot be disabled) */
  mandatory: boolean;
  /** Optional user-customized label override */
  labelOverride?: string;
}

// ─── Approval Block ───

export interface AuditPlanSignatory {
  label: string;
  defaultName: string;
  roleTitle: string;
}

export interface AuditPlanApprovalConfig {
  signatories: AuditPlanSignatory[];
  showDateField: boolean;
  showSignatureLine: boolean;
}

// ─── Table & Typography ───

export type TableFontSize = 'small' | 'normal';
export type TableAutoFitMode = 'fixed' | 'auto_fit_content' | 'auto_fit_window';

export interface AuditPlanTableStyle {
  headerBackground: string;
  headerTextColor: string;
  stripedRows: boolean;
  stripeColor: string;
  borderColor: string;
  repeatHeaderOnPageBreak: boolean;
  fontSize: TableFontSize;
  /** Auto-fit behavior for table column widths */
  autoFitMode: TableAutoFitMode;
  /** Bold the last (total) row in summary tables */
  boldTotalRows: boolean;
  /** Cell padding in pt */
  cellPadding: number;
}

export type HeadingSize = 'compact' | 'standard' | 'spacious';

export interface AuditPlanTypography {
  fontFamily: string;
  headingFont: string;
  baseFontSize: number; // pt
  headingColor: string;
  bodyColor: string;
  lineHeight: number;
  /** H1 size in pt */
  h1Size: number;
  /** H2 size in pt */
  h2Size: number;
  /** H3 size in pt */
  h3Size: number;
  /** Space before paragraphs in pt */
  paragraphSpacingBefore: number;
  /** Space after paragraphs in pt */
  paragraphSpacingAfter: number;
  /** Heading size preset */
  headingSizePreset: HeadingSize;
}

// ─── Export Defaults ───

export type ExportFormat = 'pdf' | 'docx' | 'print';

export interface AuditPlanExportDefaults {
  defaultFormat: ExportFormat;
  docxEditableNarratives: boolean;
  draftWatermark: boolean;
  draftWatermarkText: string;
}

// ─── Content-Specific Settings ───

export interface AuditPlanSummarySection {
  key: string;
  label: string;
  enabled: boolean;
}

export interface AuditPlanSummary {
  titleOverride: string;
  splitByType: boolean;
  sections: AuditPlanSummarySection[];
  hideExactDates: boolean;
}

export interface AuditPlanResourcePlan {
  metricOrder: string[];
  showTotalStaffFirst: boolean;
  showPercentages: boolean;
  dayTypes: string[];
}

export interface AuditPlanGovernance {
  showBoardLine: boolean;
  showApprovedByBlock: boolean;
  preparedByLabel: string;
  approvedByLabel: string;
}

export interface AuditPlanColumnConfig {
  key: string;
  label: string;
  enabled: boolean;
}

// ─── Root Template Config ───

export interface AuditPlanFullTemplateConfig {
  // Formatting
  branding: AuditPlanBranding;
  coverPage: AuditPlanCoverPageConfig;
  toc: AuditPlanTocConfig;
  pagination: AuditPlanPaginationConfig;
  pageLayout: AuditPlanPageLayout;
  sections: AuditPlanSection[];
  approval: AuditPlanApprovalConfig;
  tableStyle: AuditPlanTableStyle;
  typography: AuditPlanTypography;
  exportDefaults: AuditPlanExportDefaults;
  // Content-specific
  planSummary: AuditPlanSummary;
  columnsBySection: Record<string, AuditPlanColumnConfig[]>;
  resourcePlan: AuditPlanResourcePlan;
  riskCoverage: { enabled: boolean };
  governance: AuditPlanGovernance;
}

// ─── Profile Metadata (mirrors DB row) ───

export type AuditPlanAudience = 'board' | 'management' | 'external_auditor' | 'working';

export interface AuditPlanProfile {
  id: string;
  profile_name: string;
  description: string | null;
  template_id: string;
  audience: AuditPlanAudience;
  fiscal_year: string | null;
  is_active: boolean;
  is_default: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Template Row (mirrors DB row) ───

export interface AuditPlanTemplateRow {
  id: string;
  template_name: string;
  template_key: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  config_json: AuditPlanFullTemplateConfig;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Per-Document Override (ephemeral, not persisted to template) ───

export interface AuditPlanDocumentOverride {
  /** Override cover title for this specific plan */
  titleText?: string;
  /** Override fiscal year display mode */
  fiscalYearMode?: 'single' | 'range';
  /** Override section visibility per ID */
  sectionOverrides?: { id: string; enabled?: boolean; order?: number }[];
  /** Override signatory names/titles */
  signatoryOverrides?: Partial<AuditPlanSignatory>[];
  /** Force draft or final output mode */
  outputMode?: 'draft' | 'final' | 'auto';
  /** Override watermark text */
  watermarkText?: string;
  /** Override confidential label */
  confidentialLabel?: string;
  /** Override plan summary split */
  splitByType?: boolean;
  /** Override governance labels */
  preparedByLabel?: string;
  approvedByLabel?: string;
  /** Override board line visibility */
  showBoardLine?: boolean;
  /** Override risk coverage visibility */
  riskCoverageEnabled?: boolean;
}

// ─── Section Library (canonical list of all supported sections) ───

export const AUDIT_PLAN_SECTION_LIBRARY: Readonly<AuditPlanSection[]> = [
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
] as const;

// ─── Template Keys ───

export const TEMPLATE_KEYS = {
  AUDIT_BLUE_MINIMAL: 'audit_blue_minimal',
  GOVERNMENT_FORMAL: 'government_formal',
  PROFESSIONAL_MINIMAL: 'professional_minimal',
  AUDIT_COMMITTEE_PACK: 'audit_committee_pack',
  WORKING_DRAFT: 'working_draft',
} as const;

export type TemplateKey = typeof TEMPLATE_KEYS[keyof typeof TEMPLATE_KEYS];
