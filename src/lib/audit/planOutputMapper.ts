/**
 * Maps raw audit plan data + resolved plan template config into a render-ready structure.
 * BoardPackTab and future plan preview/export components consume this output.
 */
import type { ResolvedPlanOutput } from './documentTemplateResolver';

export interface MappedPlanCover {
  titleText: string;
  showDepartmentLine: boolean;
  fiscalYearDisplay: string;
}

export interface MappedPlanOutput {
  /** Cover page rendering config */
  cover: MappedPlanCover;
  /** Plan summary title (may be overridden) */
  planSummaryTitle: string;
  /** Whether to split the summary into typed sections */
  splitByType: boolean;
  /** Enabled plan summary section keys */
  enabledSummarySections: { key: string; label: string }[];
  /** Whether to hide exact start/end dates in summary tables */
  hideExactDates: boolean;
  /** Enabled columns per section */
  columnsBySection: Record<string, { key: string; label: string }[]>;
  /** Resource plan settings */
  resourcePlan: ResolvedPlanOutput['resourcePlan'];
  /** Whether risk coverage section is visible */
  showRiskCoverage: boolean;
  /** Governance labels and visibility */
  governance: ResolvedPlanOutput['governance'];
  /** Full resolved output for advanced access */
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
    showDepartmentLine: resolved.coverPage.showDepartmentLine,
    fiscalYearDisplay: formatFiscalYear(plan?.fiscal_year, resolved.coverPage.fiscalYearMode),
  };

  const enabledSummarySections = resolved.planSummary.sections
    .filter((s) => s.enabled)
    .map((s) => ({ key: s.key, label: s.label }));

  const columnsBySection: Record<string, { key: string; label: string }[]> = {};
  for (const [section, cols] of Object.entries(resolved.columnsBySection)) {
    columnsBySection[section] = cols.map((c) => ({ key: c.key, label: c.label }));
  }

  return {
    cover,
    planSummaryTitle: resolved.planSummary.titleOverride || 'Audit Plan Summary',
    splitByType: resolved.planSummary.splitByType,
    enabledSummarySections,
    hideExactDates: resolved.planSummary.hideExactDates,
    columnsBySection,
    resourcePlan: resolved.resourcePlan,
    showRiskCoverage: resolved.riskCoverageEnabled,
    governance: resolved.governance,
    resolved,
  };
}
