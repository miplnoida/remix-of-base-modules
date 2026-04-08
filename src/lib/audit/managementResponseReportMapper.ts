/**
 * Maps audit findings + management responses + actions into a single dataset
 * for the Management Response Report.
 */
import { formatDateForDisplay } from '@/lib/format-config';

export interface MgmtResponseRow {
  findingId: string;
  findingRef: string;
  findingTitle: string;
  riskRating: string;
  recommendation: string;
  managementResponse: string;
  agreedAction: string;
  responsibleOwner: string;
  targetDate: string;
  status: string;
}

export interface MgmtResponseReportData {
  auditName: string;
  department: string;
  auditPeriod: string;
  reportDate: string;
  rows: MgmtResponseRow[];
  summary: {
    totalFindings: number;
    openFindings: number;
    closedFindings: number;
    overdueActions: number;
  };
}

export function mapManagementResponseReport(
  audit: any,
  findings: any[],
  responses: any[],
  actions: any[],
  departmentName: string
): MgmtResponseReportData {
  const responseByFinding: Record<string, any> = {};
  responses.forEach((r: any) => {
    if (r.finding_id) {
      if (!responseByFinding[r.finding_id]) responseByFinding[r.finding_id] = r;
    }
  });

  const actionByFinding: Record<string, any> = {};
  actions.forEach((a: any) => {
    if (a.finding_id) {
      if (!actionByFinding[a.finding_id]) actionByFinding[a.finding_id] = a;
    }
  });

  const rows: MgmtResponseRow[] = findings.map((f: any, idx: number) => {
    const resp = responseByFinding[f.id];
    const action = actionByFinding[f.id];
    return {
      findingId: f.id,
      findingRef: `F-${String(idx + 1).padStart(2, '0')}`,
      findingTitle: f.title || 'Untitled',
      riskRating: f.risk_rating || 'Unrated',
      recommendation: f.recommendation || '—',
      managementResponse: resp?.response_text || '—',
      agreedAction: action?.action_description || '—',
      responsibleOwner: action?.responsible_person || resp?.responder_name || '—',
      targetDate: action?.target_date ? formatDateForDisplay(action.target_date) : '—',
      status: action?.status || f.status || 'Open',
    };
  });

  const openFindings = findings.filter((f: any) => !['Closed', 'Resolved'].includes(f.status || '')).length;
  const closedFindings = findings.length - openFindings;
  const overdueActions = actions.filter(
    (a: any) => a.target_date && !['Completed', 'Closed'].includes(a.status || '') && new Date(a.target_date) < new Date()
  ).length;

  const startDate = audit?.planned_start_date ? formatDateForDisplay(audit.planned_start_date) : '—';
  const endDate = audit?.planned_end_date ? formatDateForDisplay(audit.planned_end_date) : '—';

  return {
    auditName: audit?.engagement_name || 'Untitled Audit',
    department: departmentName || '—',
    auditPeriod: `${startDate} – ${endDate}`,
    reportDate: formatDateForDisplay(new Date().toISOString()),
    rows,
    summary: {
      totalFindings: findings.length,
      openFindings,
      closedFindings,
      overdueActions,
    },
  };
}
