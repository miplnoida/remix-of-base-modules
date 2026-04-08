/**
 * Resolves raw report/plan data against a template configuration
 * to produce a render-ready structure for preview and PDF export.
 *
 * ARCHITECTURE:
 * - Report: resolveReportTemplate() — status-aware (draft/final)
 * - Plan: resolvePlanTemplate() — uses full AuditPlanFullTemplateConfig
 *   and delegates section resolution to auditPlanSectionEngine.
 */
import type {
  AuditReportTemplateConfig,
  TemplateSection,
  TemplateColumn,
  TemplateSignatory,
} from './documentTemplateDefaults';
import type { AuditPlanFullTemplateConfig } from './auditPlanTemplateTypes';
import { resolveSections, type ResolvedSectionList } from './auditPlanSectionEngine';

// ─── Report Resolver ───

export interface ResolvedReportSection {
  id: string;
  label: string;
  order: number;
}

export interface ResolvedReportOutput {
  branding: AuditReportTemplateConfig['branding'];
  coverPage: AuditReportTemplateConfig['coverPage'];
  sections: ResolvedReportSection[];
  findingsLayout: AuditReportTemplateConfig['findingsLayout'];
  riskDistributionEnabled: boolean;
  actionPlanVisible: boolean;
  actionPlanColumns: TemplateColumn[];
  signatories: TemplateSignatory[];
  showWatermark: boolean;
  watermarkText: string;
  showIssuedStamp: boolean;
}

export function resolveReportTemplate(
  config: AuditReportTemplateConfig,
  reportStatus: string
): ResolvedReportOutput {
  const isDraft = reportStatus === 'Draft' || reportStatus === 'In Review';
  const isFinal = reportStatus === 'Final';

  const sections: ResolvedReportSection[] = config.sections
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order)
    .map((s) => ({ id: s.id, label: s.label, order: s.order }));

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

  return {
    branding: config.branding,
    coverPage: config.coverPage,
    sections,
    findingsLayout: config.findingsLayout,
    riskDistributionEnabled: config.riskDistribution.enabled,
    actionPlanVisible,
    actionPlanColumns,
    signatories: config.signOff.signatories,
    showWatermark: isDraft && config.draftRules.showWatermark,
    watermarkText: config.draftRules.watermarkText,
    showIssuedStamp: isFinal && config.finalRules.showIssuedStamp,
  };
}

// ─── Plan Resolver ───

export interface ResolvedPlanOutput {
  branding: AuditPlanFullTemplateConfig['branding'];
  coverPage: AuditPlanFullTemplateConfig['coverPage'];
  toc: AuditPlanFullTemplateConfig['toc'];
  pagination: AuditPlanFullTemplateConfig['pagination'];
  pageLayout: AuditPlanFullTemplateConfig['pageLayout'];
  resolvedSections: ResolvedSectionList;
  approval: AuditPlanFullTemplateConfig['approval'];
  tableStyle: AuditPlanFullTemplateConfig['tableStyle'];
  typography: AuditPlanFullTemplateConfig['typography'];
  exportDefaults: AuditPlanFullTemplateConfig['exportDefaults'];
  planSummary: AuditPlanFullTemplateConfig['planSummary'];
  columnsBySection: AuditPlanFullTemplateConfig['columnsBySection'];
  resourcePlan: AuditPlanFullTemplateConfig['resourcePlan'];
  riskCoverage: AuditPlanFullTemplateConfig['riskCoverage'];
  governance: AuditPlanFullTemplateConfig['governance'];
  /** Whether watermark is active */
  showWatermark: boolean;
  /** Watermark text */
  watermarkText: string;
}

/**
 * Resolves a full plan template config into a render-ready output.
 * Delegates section resolution to the section engine.
 */
export function resolvePlanTemplate(
  config: AuditPlanFullTemplateConfig,
  overrides?: import('./auditPlanTemplateTypes').AuditPlanDocumentOverride
): ResolvedPlanOutput {
  // Resolve sections via the section engine (handles overrides, mandatory enforcement)
  const resolvedSections = resolveSections(config, overrides);

  // Determine watermark state
  const isDraft = overrides?.outputMode === 'draft' ||
    (!overrides?.outputMode && config.exportDefaults.draftWatermark);

  return {
    branding: config.branding,
    coverPage: config.coverPage,
    toc: config.toc,
    pagination: config.pagination,
    pageLayout: config.pageLayout,
    resolvedSections,
    approval: config.approval,
    tableStyle: config.tableStyle,
    typography: config.typography,
    exportDefaults: config.exportDefaults,
    showWatermark: isDraft && (config.branding.showWatermark || config.exportDefaults.draftWatermark),
    watermarkText: overrides?.watermarkText || config.branding.watermarkText || config.exportDefaults.draftWatermarkText,
  };
}
