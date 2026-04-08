/**
 * Maps raw audit plan data + resolved plan template config into a render-ready structure.
 * BoardPackTab and future plan preview/export components consume this output.
 *
 * ARCHITECTURE:
 * - Now consumes the full ResolvedPlanOutput from the consolidated resolver.
 * - Preserves the same public API for downstream consumers.
 */
import type { ResolvedPlanOutput } from './documentTemplateResolver';

export interface MappedPlanCover {
  titleText: string;
  showOrgName: boolean;
  showAuditableEntity: boolean;
  showPeriodCovered: boolean;
  showVersionNumber: boolean;
  showIssueDate: boolean;
  showConfidentialLabel: boolean;
  confidentialLabel: string;
  coverStyle: string;
  fiscalYearDisplay: string;
}

export interface MappedPlanOutput {
  /** Cover page rendering config */
  cover: MappedPlanCover;
  /** Resolved sections for rendering */
  sections: ResolvedPlanOutput['resolvedSections'];
  /** Approval config */
  approval: ResolvedPlanOutput['approval'];
  /** Table styling */
  tableStyle: ResolvedPlanOutput['tableStyle'];
  /** Typography */
  typography: ResolvedPlanOutput['typography'];
  /** TOC config */
  toc: ResolvedPlanOutput['toc'];
  /** Pagination */
  pagination: ResolvedPlanOutput['pagination'];
  /** Page layout */
  pageLayout: ResolvedPlanOutput['pageLayout'];
  /** Export defaults */
  exportDefaults: ResolvedPlanOutput['exportDefaults'];
  planSummary: ResolvedPlanOutput['planSummary'];
  columnsBySection: ResolvedPlanOutput['columnsBySection'];
  resourcePlan: ResolvedPlanOutput['resourcePlan'];
  riskCoverage: ResolvedPlanOutput['riskCoverage'];
  governance: ResolvedPlanOutput['governance'];
  showWatermark: boolean;
  watermarkText: string;
  resolved: ResolvedPlanOutput;
}

/**
 * Format fiscal year display based on mode.
 */
function formatFiscalYear(fiscalYear: string | number | undefined, mode: 'single' | 'range'): string {
  const fy = String(fiscalYear || new Date().getFullYear());
  if (mode === 'range') {
    const year = parseInt(fy, 10);
    return isNaN(year) ? fy : `${year}–${year + 1}`;
  }
  return fy;
}

/**
 * Primary mapper for plan output.
 */
export function mapPlanOutput(
  resolved: ResolvedPlanOutput,
  plan: any
): MappedPlanOutput {
  const cover: MappedPlanCover = {
    titleText: resolved.coverPage.titleText,
    showOrgName: resolved.coverPage.showOrgName,
    showAuditableEntity: resolved.coverPage.showAuditableEntity,
    showPeriodCovered: resolved.coverPage.showPeriodCovered,
    showVersionNumber: resolved.coverPage.showVersionNumber,
    showIssueDate: resolved.coverPage.showIssueDate,
    showConfidentialLabel: resolved.coverPage.showConfidentialLabel,
    confidentialLabel: resolved.branding.confidentialLabel,
    coverStyle: resolved.coverPage.coverStyle,
    fiscalYearDisplay: formatFiscalYear(plan?.fiscal_year, resolved.coverPage.fiscalYearMode),
  };

  return {
    cover,
    sections: resolved.resolvedSections,
    approval: resolved.approval,
    tableStyle: resolved.tableStyle,
    typography: resolved.typography,
    toc: resolved.toc,
    pagination: resolved.pagination,
    pageLayout: resolved.pageLayout,
    exportDefaults: resolved.exportDefaults,
    planSummary: resolved.planSummary,
    columnsBySection: resolved.columnsBySection,
    resourcePlan: resolved.resourcePlan,
    riskCoverage: resolved.riskCoverage,
    governance: resolved.governance,
    showWatermark: resolved.showWatermark,
    watermarkText: resolved.watermarkText,
    resolved,
  };
}
