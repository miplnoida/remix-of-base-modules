/**
 * Resolves raw report/plan data against a template configuration
 * to produce a render-ready structure for preview and PDF export.
 */
import type {
  AuditReportTemplateConfig,
  AuditPlanTemplateConfig,
  TemplateSection,
  TemplateColumn,
  TemplateSignatory,
} from './documentTemplateDefaults';

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

  // Resolve sections — only enabled, sorted by order
  const sections: ResolvedReportSection[] = config.sections
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order)
    .map((s) => ({ id: s.id, label: s.label, order: s.order }));

  // Resolve action plan visibility
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
  coverPage: AuditPlanTemplateConfig['coverPage'];
  planSummary: AuditPlanTemplateConfig['planSummary'];
  columnsBySection: Record<string, TemplateColumn[]>;
  resourcePlan: AuditPlanTemplateConfig['resourcePlan'];
  riskCoverageEnabled: boolean;
  governance: AuditPlanTemplateConfig['governance'];
}

export function resolvePlanTemplate(config: AuditPlanTemplateConfig): ResolvedPlanOutput {
  // Filter enabled columns per section
  const columnsBySection: Record<string, TemplateColumn[]> = {};
  for (const [section, cols] of Object.entries(config.columnsBySection)) {
    columnsBySection[section] = cols.filter((c) => c.enabled);
  }

  return {
    coverPage: config.coverPage,
    planSummary: config.planSummary,
    columnsBySection,
    resourcePlan: config.resourcePlan,
    riskCoverageEnabled: config.riskCoverage.enabled,
    governance: config.governance,
  };
}
