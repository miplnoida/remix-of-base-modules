/**
 * Maps raw audit report data + resolved template config into a render-ready structure.
 * Both AuditReportPreview and AuditReportPDFExport consume this output.
 */
import type { ResolvedReportOutput } from './documentTemplateResolver';
import { formatDateForDisplay } from '@/lib/format-config';

// ─── Section content mapping ───

interface SectionContentMap {
  executive_summary: string | null;
  background: string | null;
  objective: string | null;
  scope: string | null;
  methodology: string | null;
  risk_overview: boolean;
  key_findings: boolean;
  detailed_findings: boolean;
  management_responses: boolean;
  action_plan: boolean;
  conclusion: boolean;
  distribution: string | null;
  approval: boolean;
}

export interface ReportCoverMeta {
  label: string;
  value: string;
}

export interface MappedReportOutput {
  /** Ordered section IDs that should render (enabled + have content) */
  orderedSections: string[];
  /** Cover page metadata in configured order */
  coverMetadata: ReportCoverMeta[];
  /** Whether to show risk distribution cards in Risk Overview */
  showRiskDistribution: boolean;
  /** Whether the action plan section is visible for this status */
  actionPlanVisible: boolean;
  /** Enabled action plan column keys */
  actionPlanColumnKeys: string[];
  /** Whether management responses should appear inline after each finding's recommendation */
  showInlineManagementResponse: boolean;
  /** All resolved template output (branding, signatories, watermark, etc.) */
  resolved: ResolvedReportOutput;
}

/**
 * Build the ordered list of section IDs that have content and are enabled in the template.
 */
function buildContentMap(reportData: any, findings: any[], responses: any[], actions: any[]): SectionContentMap {
  return {
    executive_summary: reportData.executive_summary || null,
    background: reportData.background || null,
    objective: reportData.audit_objective || null,
    scope: reportData.audit_scope || null,
    methodology: reportData.methodology || null,
    risk_overview: !!(reportData.risk_rating || findings.length > 0),
    key_findings: findings.length > 0,
    detailed_findings: findings.length > 0,
    management_responses: responses.length > 0,
    action_plan: actions.length > 0,
    conclusion: !!(reportData.conclusion || reportData.follow_up_actions),
    distribution: reportData.distribution_list || null,
    approval: true, // always available
  };
}

/**
 * Build cover metadata array in the configured field order.
 */
function buildCoverMetadata(
  resolved: ResolvedReportOutput,
  reportData: any,
  departmentName: string | undefined,
  isFinal: boolean
): ReportCoverMeta[] {
  const reportDate = reportData.generated_on
    ? formatDateForDisplay(reportData.generated_on)
    : new Date().toLocaleDateString();

  const fieldMap: Record<string, ReportCoverMeta> = {
    fiscal_year: { label: 'Fiscal Year', value: reportData.fiscal_year || '—' },
    department: { label: 'Department', value: departmentName || '—' },
    report_number: { label: 'Report Number', value: reportData.report_number || '—' },
    date: { label: 'Date', value: reportDate },
    prepared_by: { label: 'Prepared By', value: reportData.prepared_by || '—' },
    version: { label: 'Version', value: isFinal ? 'Final' : 'Draft' },
  };

  return resolved.coverPage.fieldOrder
    .filter((key) => fieldMap[key])
    .map((key) => fieldMap[key]);
}

/**
 * Primary mapper — call once, feed to preview and PDF.
 */
export function mapReportOutput(
  resolved: ResolvedReportOutput,
  reportData: any,
  findings: any[],
  responses: any[],
  actions: any[],
  departmentName?: string
): MappedReportOutput {
  const isFinal = reportData.status === 'Final';
  const content = buildContentMap(reportData, findings, responses, actions);

  // Filter resolved.sections to only those with content
  const contentCheck: Record<string, boolean> = {
    executive_summary: !!content.executive_summary,
    background: !!content.background,
    objective: !!content.objective,
    scope: !!content.scope,
    methodology: !!content.methodology,
    risk_overview: content.risk_overview && resolved.riskDistributionEnabled,
    key_findings: content.key_findings,
    detailed_findings: content.detailed_findings,
    management_responses: content.management_responses && !resolved.findingsLayout.showManagementResponseAfterRecommendation,
    action_plan: content.action_plan && resolved.actionPlanVisible,
    conclusion: content.conclusion,
    distribution: !!content.distribution,
    approval: content.approval,
  };

  const orderedSections = resolved.sections
    .filter((s) => contentCheck[s.id] !== false)
    .map((s) => s.id);

  const coverMetadata = buildCoverMetadata(resolved, reportData, departmentName, isFinal);

  const actionPlanColumnKeys = resolved.actionPlanColumns.map((c) => c.key);

  return {
    orderedSections,
    coverMetadata,
    showRiskDistribution: resolved.riskDistributionEnabled,
    actionPlanVisible: resolved.actionPlanVisible,
    actionPlanColumnKeys,
    showInlineManagementResponse: resolved.findingsLayout.showManagementResponseAfterRecommendation,
    resolved,
  };
}
