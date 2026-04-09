/**
 * Resolves raw report/plan data against a template configuration
 * to produce a render-ready structure for preview and PDF export.
 *
 * ARCHITECTURE (Foundation-First Resolution):
 * ════════════════════════════════════════════
 * ALL formatting (branding, typography, colors, pagination, table style,
 * sign-off, draft/final rules) is read from the FOUNDATION config.
 * Template configs only provide structure (sections, content settings).
 * Any legacy formatting fields in template configs are IGNORED.
 */
import type {
  AuditReportTemplateConfig,
  TemplateSectionRef,
  TemplateColumn,
} from './documentTemplateDefaults';
import type { DocumentFoundationConfig, FoundationSignatory } from './documentFoundationTypes';
import { DEFAULT_FOUNDATION } from './documentFoundationTypes';
import type { AuditPlanFullTemplateConfig } from './auditPlanTemplateTypes';
import { resolveSections, type ResolvedSectionList } from './auditPlanSectionEngine';

// ─── Inheritance Guard ───
// These keys on a template config are FOUNDATION-OWNED.
// The resolver strips them before merging so templates can never override formatting.

const FOUNDATION_OWNED_REPORT_KEYS: (keyof AuditReportTemplateConfig)[] = [
  'branding', 'signOff', 'draftRules', 'finalRules',
];

/**
 * Strips any Foundation-owned formatting fields from a template config.
 * Ensures templates can never leak formatting overrides into the pipeline.
 */
function stripFormattingFromReportTemplate(
  config: AuditReportTemplateConfig
): AuditReportTemplateConfig {
  const clean = { ...config };
  for (const key of FOUNDATION_OWNED_REPORT_KEYS) {
    delete (clean as any)[key];
  }
  return clean;
}

// ─── Report Resolver ───

export interface ResolvedReportSection {
  id: string;
  label: string;
  order: number;
}

export interface ResolvedReportOutput {
  /** Branding from Foundation */
  branding: {
    showLogo: boolean;
    logoSource: string;
    orgName: string;
    country: string;
    address: string;
    phone: string;
  };
  coverPage: AuditReportTemplateConfig['coverPage'];
  sections: ResolvedReportSection[];
  findingsLayout: AuditReportTemplateConfig['findingsLayout'];
  riskDistributionEnabled: boolean;
  actionPlanVisible: boolean;
  actionPlanColumns: TemplateColumn[];
  signatories: FoundationSignatory[];
  showWatermark: boolean;
  watermarkText: string;
  showIssuedStamp: boolean;
}

/**
 * Resolves a report template + Foundation into a render-ready output.
 * Foundation provides ALL formatting; template provides ONLY structure/content.
 */
export function resolveReportTemplate(
  rawConfig: AuditReportTemplateConfig,
  reportStatus: string,
  foundation?: DocumentFoundationConfig
): ResolvedReportOutput {
  const f = foundation || DEFAULT_FOUNDATION;
  // INHERITANCE GUARD: Strip any formatting fields from template before resolution
  const config = stripFormattingFromReportTemplate(rawConfig);
  const isDraft = reportStatus === 'Draft' || reportStatus === 'In Review';
  const isFinal = reportStatus === 'Final';

  // Use sectionRefs (preferred) or legacy sections field
  const rawSections = config.sectionRefs || config.sections || [];
  const sections: ResolvedReportSection[] = rawSections
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order)
    .map((s) => ({ id: s.id, label: s.labelOverride || s.label, order: s.order }));

  let actionPlanVisible = false;
  switch (config.actionPlanSummary.visibility) {
    case 'always':
      actionPlanVisible = true;
      break;
    case 'draft_only':
      actionPlanVisible = isDraft;
      break;
    case 'final_only':
      actionPlanVisible = isFinal;
      break;
    case 'hidden':
      actionPlanVisible = false;
      break;
  }

  const actionPlanColumns = config.actionPlanSummary.columns.filter((c) => c.enabled);

  // ALL formatting from Foundation — template formatting fields are IGNORED
  return {
    branding: {
      showLogo: f.branding.showLogo,
      logoSource: f.branding.logoSource,
      orgName: f.branding.orgName,
      country: f.branding.country,
      address: f.branding.address,
      phone: f.branding.phone,
    },
    coverPage: config.coverPage,
    sections,
    findingsLayout: config.findingsLayout,
    riskDistributionEnabled: config.riskDistribution.enabled,
    actionPlanVisible,
    actionPlanColumns,
    signatories: f.signOff,
    showWatermark: isDraft && f.draftRules.showWatermark,
    watermarkText: f.draftRules.watermarkText,
    showIssuedStamp: isFinal && f.draftRules.showIssuedStamp,
  };
}

// ─── Plan Resolver ───

export interface ResolvedPlanOutput {
  /** Branding from Foundation (not from template) */
  branding: AuditPlanFullTemplateConfig['branding'];
  coverPage: AuditPlanFullTemplateConfig['coverPage'];
  toc: AuditPlanFullTemplateConfig['toc'];
  /** Pagination from Foundation */
  pagination: AuditPlanFullTemplateConfig['pagination'];
  /** Page layout from Foundation */
  pageLayout: AuditPlanFullTemplateConfig['pageLayout'];
  resolvedSections: ResolvedSectionList;
  /** Approval/signatories from Foundation */
  approval: AuditPlanFullTemplateConfig['approval'];
  /** Table style from Foundation */
  tableStyle: AuditPlanFullTemplateConfig['tableStyle'];
  /** Typography from Foundation */
  typography: AuditPlanFullTemplateConfig['typography'];
  exportDefaults: AuditPlanFullTemplateConfig['exportDefaults'];
  planSummary: AuditPlanFullTemplateConfig['planSummary'];
  columnsBySection: AuditPlanFullTemplateConfig['columnsBySection'];
  resourcePlan: AuditPlanFullTemplateConfig['resourcePlan'];
  riskCoverage: AuditPlanFullTemplateConfig['riskCoverage'];
  governance: AuditPlanFullTemplateConfig['governance'];
  /** Whether watermark is active (from Foundation) */
  showWatermark: boolean;
  /** Watermark text (from Foundation) */
  watermarkText: string;
}

/**
 * Resolves a full plan template config into a render-ready output.
 * Foundation formatting is preferred over any template-level formatting.
 * Delegates section resolution to the section engine.
 */
export function resolvePlanTemplate(
  config: AuditPlanFullTemplateConfig,
  overrides?: import('./auditPlanTemplateTypes').AuditPlanDocumentOverride,
  foundation?: DocumentFoundationConfig
): ResolvedPlanOutput {
  const f = foundation || DEFAULT_FOUNDATION;

  // Resolve sections via the section engine (handles overrides, mandatory enforcement)
  const resolvedSections = resolveSections(config, overrides);

  // Determine watermark state — from Foundation
  const isDraft = overrides?.outputMode === 'draft' ||
    (!overrides?.outputMode && config.exportDefaults.draftWatermark);

  // Foundation-first: use Foundation formatting, template content settings
  return {
    // Formatting from Foundation (template values used as fallback only)
    branding: {
      ...config.branding,
      orgName: f.branding.orgName || config.branding.orgName,
      confidentialLabel: f.branding.confidentialLabel || config.branding.confidentialLabel,
      showWatermark: f.draftRules.showWatermark,
      watermarkText: f.draftRules.watermarkText,
      colorPalette: {
        primary: f.colorPalette.primary,
        secondary: f.colorPalette.secondary,
        accent: f.colorPalette.accent,
        tableHeader: f.colorPalette.tableHeader,
        tableStripe: f.colorPalette.tableStripe,
        text: f.colorPalette.text,
      },
    },
    coverPage: config.coverPage,
    toc: config.toc,
    pagination: {
      showPageNumbers: f.pagination.showPageNumbers,
      hideOnCover: f.pagination.hideOnCover,
      frontMatterStyle: f.pagination.frontMatterStyle,
      bodyStyle: f.pagination.bodyStyle,
      appendixStyle: f.pagination.appendixStyle,
      position: f.pagination.position,
      pageBreakBetweenSections: f.pagination.pageBreakBetweenSections,
    },
    pageLayout: {
      pageSize: f.pageLayout.pageSize,
      orientation: f.pageLayout.orientation,
      margins: { ...f.pageLayout.margins },
    },
    resolvedSections,
    approval: {
      signatories: f.signOff.map((s) => ({
        label: s.label,
        defaultName: s.defaultName,
        roleTitle: s.roleTitle,
      })),
      showDateField: config.approval?.showDateField ?? true,
      showSignatureLine: config.approval?.showSignatureLine ?? true,
    },
    tableStyle: {
      headerBackground: f.tableStyle.headerBackground,
      headerTextColor: f.tableStyle.headerTextColor,
      stripedRows: f.tableStyle.stripedRows,
      stripeColor: f.tableStyle.stripeColor,
      borderColor: f.tableStyle.borderColor,
      repeatHeaderOnPageBreak: f.tableStyle.repeatHeaderOnPageBreak,
      fontSize: f.tableStyle.fontSize,
      autoFitMode: f.tableStyle.autoFitMode,
      boldTotalRows: f.tableStyle.boldTotalRows,
      cellPadding: f.tableStyle.cellPadding,
    },
    typography: {
      fontFamily: f.typography.fontFamily,
      headingFont: f.typography.headingFont,
      baseFontSize: f.typography.baseFontSize,
      headingColor: f.typography.headingColor,
      bodyColor: f.typography.bodyColor,
      lineHeight: f.typography.lineHeight,
      h1Size: f.typography.h1Size,
      h2Size: f.typography.h2Size,
      h3Size: f.typography.h3Size,
      paragraphSpacingBefore: f.typography.paragraphSpacingBefore,
      paragraphSpacingAfter: f.typography.paragraphSpacingAfter,
      headingSizePreset: config.typography?.headingSizePreset || 'standard',
    },
    exportDefaults: config.exportDefaults,
    planSummary: config.planSummary,
    columnsBySection: config.columnsBySection,
    resourcePlan: config.resourcePlan,
    riskCoverage: config.riskCoverage,
    governance: config.governance,
    showWatermark: isDraft && f.draftRules.showWatermark,
    watermarkText: overrides?.watermarkText || f.draftRules.watermarkText,
  };
}
