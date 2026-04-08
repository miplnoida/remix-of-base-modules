/**
 * TypeScript interfaces and default configurations for Internal Audit Document Templates.
 * These defaults match the current hardcoded behavior exactly.
 */

// ─── Shared Types ───

export interface TemplateColumn {
  key: string;
  label: string;
  enabled: boolean;
}

export interface TemplateSection {
  id: string;
  label: string;
  enabled: boolean;
  order: number;
}

export interface TemplateSignatory {
  label: string;
  defaultName: string;
  roleTitle: string;
}

// ─── Audit Report Template Config ───

export interface AuditReportBranding {
  showLogo: boolean;
  logoSource: string;
  orgName: string;
  country: string;
  address: string;
  phone: string;
}

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

export interface AuditReportSignOff {
  signatories: TemplateSignatory[];
}

export interface AuditReportDraftRules {
  showWatermark: boolean;
  watermarkText: string;
}

export interface AuditReportFinalRules {
  showIssuedStamp: boolean;
}

export interface AuditReportTemplateConfig {
  branding: AuditReportBranding;
  coverPage: AuditReportCoverPage;
  sections: TemplateSection[];
  findingsLayout: AuditReportFindingsLayout;
  riskDistribution: { enabled: boolean };
  actionPlanSummary: AuditReportActionPlanSummary;
  signOff: AuditReportSignOff;
  draftRules: AuditReportDraftRules;
  finalRules: AuditReportFinalRules;
}

// ─── Audit Plan Template Config ───

export interface AuditPlanCoverPage {
  titleText: string;
  showDepartmentLine: boolean;
  fiscalYearMode: 'single' | 'range';
}

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

export interface AuditPlanTemplateConfig {
  coverPage: AuditPlanCoverPage;
  planSummary: AuditPlanSummary;
  columnsBySection: Record<string, TemplateColumn[]>;
  resourcePlan: AuditPlanResourcePlan;
  riskCoverage: { enabled: boolean };
  governance: AuditPlanGovernance;
}

// ─── Defaults ───

export const DEFAULT_AUDIT_REPORT_CONFIG: AuditReportTemplateConfig = {
  branding: {
    showLogo: true,
    logoSource: 'default',
    orgName: 'SOCIAL SECURITY BOARD',
    country: 'ST. KITTS AND NEVIS',
    address: 'Bay Road, P.O. Box 79, Basseterre, St. Kitts',
    phone: '(869) 465-2521',
  },
  coverPage: {
    reportTitle: 'Audit Report',
    showSubtitle: true,
    subtitleText: 'Engagement Report',
    showAuditPeriod: true,
    confidentialityText:
      'This document is the property of the Social Security Board, St. Kitts and Nevis. It contains confidential information intended solely for the use of the addressee. Unauthorized distribution, copying, or disclosure is strictly prohibited.',
    fieldOrder: ['fiscal_year', 'department', 'report_number', 'date', 'prepared_by', 'version'],
  },
  sections: [
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
  ],
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
  signOff: {
    signatories: [
      { label: 'Prepared By', defaultName: '', roleTitle: 'Internal Auditor' },
      { label: 'Reviewed By', defaultName: '', roleTitle: 'Manager, Internal Audit' },
      { label: 'Approved By', defaultName: '', roleTitle: 'Director' },
    ],
  },
  draftRules: { showWatermark: true, watermarkText: 'DRAFT' },
  finalRules: { showIssuedStamp: true },
};

export const DEFAULT_AUDIT_PLAN_CONFIG: AuditPlanTemplateConfig = {
  coverPage: {
    titleText: 'Internal Audit Plan',
    showDepartmentLine: true,
    fiscalYearMode: 'single',
  },
  planSummary: {
    titleOverride: 'Audit Plan Summary',
    splitByType: false,
    sections: [
      { key: 'assurance', label: 'Planned Assurance Engagements', enabled: true },
      { key: 'advisory', label: 'Planned Advisory/Consulting Engagements', enabled: true },
      { key: 'followup', label: 'Follow-up Reviews', enabled: true },
    ],
    hideExactDates: false,
  },
  columnsBySection: {
    assurance: [
      { key: 'engagement_name', label: 'Engagement', enabled: true },
      { key: 'department', label: 'Department', enabled: true },
      { key: 'risk_level', label: 'Risk Level', enabled: true },
      { key: 'planned_start', label: 'Start Date', enabled: true },
      { key: 'planned_end', label: 'End Date', enabled: true },
      { key: 'lead_auditor', label: 'Lead Auditor', enabled: true },
    ],
  },
  resourcePlan: {
    metricOrder: ['total_staff', 'assurance_days', 'advisory_days', 'followup_days', 'admin_days', 'training_days'],
    showTotalStaffFirst: true,
    showPercentages: true,
    dayTypes: ['Assurance', 'Advisory', 'Follow-up', 'Administration', 'Training'],
  },
  riskCoverage: { enabled: true },
  governance: {
    showBoardLine: true,
    showApprovedByBlock: true,
    preparedByLabel: 'Prepared By',
    approvedByLabel: 'Approved By',
  },
};
