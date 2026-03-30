import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Briefcase, Loader2, AlertTriangle, ClipboardCheck,
  FileText, MessageSquare, CheckCircle, BarChart3, Clock, Shield, ListChecks
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/common';
import { useIAEngagements } from '@/hooks/useAuditDataPhase2';
import { useIADepartments, useIAAnnualPlans, useIAAuditors, useIADepartmentFunctions, useIAFindings, useIAActionTracking, useIAManagementResponses } from '@/hooks/useAuditData';
import { useEngagementActivities, useEngagementEvidence, useEngagementWorkingPapers } from '@/hooks/useEngagementData';
import { formatDateForDisplay } from '@/lib/format-config';
import { useToast } from '@/hooks/use-toast';
import { useTransitionExecutionStatus, type ExecutionStatus } from '@/hooks/useEngagementExecution';
import { AuditWorkspaceShell } from '@/components/audit/workspace/AuditWorkspaceShell';
import { AuditEmptyState } from '@/components/audit/workspace/AuditEmptyState';

import {
  AuditOverviewTab,
  AuditPreparationTab,
  AuditActivitiesTab,
  AuditEvidenceTab,
  AuditWorkingPapersTab,
  AuditFindingsTab,
  AuditResponsesTab,
  AuditActionsTab,
  AuditReportTab,
  AuditTimelineTab,
  AuditControlTestsTab,
  AuditFollowUpsTab,
} from '@/components/audit/execution';

// ===== Smart Alerts =====
function SmartAlertsBanner({ audit, auditFindings, auditResponses, auditActions }: {
  audit: any; auditFindings: any[]; auditResponses: any[]; auditActions: any[];
}) {
  const alerts: { type: 'warning' | 'info' | 'error'; message: string }[] = [];
  const execStatus = audit.execution_status || 'Planned';

  // Start date alerts
  if ((execStatus === 'Planned' || execStatus === 'Ready for Launch') && audit.planned_start_date) {
    const daysUntilStart = Math.ceil((new Date(audit.planned_start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilStart <= 7 && daysUntilStart > 0) {
      alerts.push({ type: 'warning', message: `Planned start in ${daysUntilStart} day(s) — audit not yet launched.` });
    } else if (daysUntilStart <= 0) {
      alerts.push({ type: 'error', message: 'Planned start date has passed — audit not yet launched.' });
    }
  }

  // Pending management responses
  const pendingResponses = auditFindings.filter(f =>
    !auditResponses.find(r => r.finding_id === f.id) && f.status !== 'Closed'
  );
  if (pendingResponses.length > 0 && execStatus === 'Management Response Pending') {
    alerts.push({ type: 'warning', message: `${pendingResponses.length} finding(s) awaiting management response.` });
  }

  // Overdue actions
  const overdueActions = auditActions.filter(a =>
    a.target_date && !['Completed', 'Closed'].includes(a.status || '') && new Date(a.target_date) < new Date()
  );
  if (overdueActions.length > 0) {
    alerts.push({ type: 'error', message: `${overdueActions.length} overdue action item(s).` });
  }

  // Missing evidence on findings
  const findingsWithoutEvidence = auditFindings.filter(f =>
    f.status !== 'Closed' && (!f.evidence_ids || (Array.isArray(f.evidence_ids) && f.evidence_ids.length === 0))
  );
  if (findingsWithoutEvidence.length > 0) {
    alerts.push({ type: 'info', message: `${findingsWithoutEvidence.length} finding(s) have no supporting evidence attached.` });
  }

  // Unassigned actions
  const unassignedActions = auditActions.filter(a =>
    !a.assigned_to && !['Completed', 'Closed'].includes(a.status || '')
  );
  if (unassignedActions.length > 0) {
    alerts.push({ type: 'warning', message: `${unassignedActions.length} action(s) have no assignee.` });
  }

  // End date approaching
  if (audit.planned_end_date && !['Closed', 'Completed'].includes(execStatus)) {
    const daysUntilEnd = Math.ceil((new Date(audit.planned_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilEnd <= 3 && daysUntilEnd > 0) {
      alerts.push({ type: 'warning', message: `Planned end date is in ${daysUntilEnd} day(s).` });
    } else if (daysUntilEnd <= 0) {
      alerts.push({ type: 'error', message: `Planned end date has passed (${Math.abs(daysUntilEnd)} day(s) overdue).` });
    }
  }

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert, idx) => (
        <div key={idx} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium ${
          alert.type === 'error' ? 'bg-destructive/10 text-destructive border border-destructive/20' :
          alert.type === 'warning' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30' :
          'bg-primary/10 text-primary border border-primary/20'
        }`}>
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {alert.message}
        </div>
      ))}
    </div>
  );
}

// ===== Main Component =====
export default function EngagementDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const transitionMutation = useTransitionExecutionStatus();

  const { data: engagements = [], isLoading, update: updateAudit } = useIAEngagements();
  const { data: departments = [] } = useIADepartments();
  const { data: plans = [] } = useIAAnnualPlans();
  const { data: auditors = [] } = useIAAuditors();
  const audit = useMemo(() => engagements.find((e: any) => e.id === id), [engagements, id]);
  const { data: deptFunctions = [] } = useIADepartmentFunctions(audit?.department_id || undefined);

  const { data: allFindings = [] } = useIAFindings();
  const { data: allActions = [] } = useIAActionTracking();
  const { data: allResponses = [] } = useIAManagementResponses();

  const auditFindings = useMemo(() => allFindings.filter((f: any) => f.engagement_id === id), [allFindings, id]);
  const auditActions = useMemo(() => allActions.filter((a: any) => a.engagement_id === id), [allActions, id]);
  const auditResponses = useMemo(() => {
    const findingIds = auditFindings.map((f: any) => f.id);
    return allResponses.filter((r: any) => r.engagement_id === id || findingIds.includes(r.finding_id));
  }, [allResponses, auditFindings, id]);

  const openFindings = auditFindings.filter((f: any) => !['Closed', 'Resolved'].includes(f.status || ''));
  const overdueActionsCount = auditActions.filter((a: any) => a.target_date && !['Completed', 'Closed'].includes(a.status || '') && new Date(a.target_date) < new Date()).length;
  const pendingResponsesCount = auditFindings.filter((f: any) => !auditResponses.find((r: any) => r.finding_id === f.id) && f.status !== 'Closed').length;

  const getDeptName = (did: string) => departments?.find((d: any) => d.id === did)?.name || '—';
  const getDeptObj = (did: string) => departments?.find((d: any) => d.id === did);
  const getFunctionName = (fid: string) => deptFunctions?.find((f: any) => f.id === fid)?.function_name || '—';
  const getAuditorName = (aid: string) => auditors?.find((a: any) => a.id === aid)?.name || '—';
  const getPlanTitle = (pid: string) => plans?.find((p: any) => p.id === pid)?.title || '—';

  const engagementContext = useMemo(() => {
    if (!audit) return undefined;
    const dept = getDeptObj(audit.department_id);
    return {
      engagement_name: audit.engagement_name || '',
      department_name: dept?.name || '',
      department_head: dept?.head || '',
      department_email: dept?.email || '',
      lead_auditor_name: getAuditorName(audit.lead_auditor_id),
      planned_start_date: audit.planned_start_date || '',
      planned_end_date: audit.planned_end_date || '',
      objectives: audit.objectives || '',
      scope: audit.scope || '',
      function_name: getFunctionName(audit.function_id),
    };
  }, [audit, departments, auditors, deptFunctions]);

  const handleCloseAudit = () => {
    if (!id) return;
    transitionMutation.mutate({ engagementId: id, newStatus: 'Closed', notes: 'Audit closed' });
    updateAudit.mutate({ id, status: 'Closed', closure_date: new Date().toISOString().split('T')[0], closure_notes: '' } as any);
  };

  const handleStatusTransition = (newStatus: ExecutionStatus) => {
    if (!id) return;
    transitionMutation.mutate({ engagementId: id, newStatus });
  };

  if (!audit && !isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" onClick={() => navigate('/audit/audits')}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        <AuditEmptyState icon={Briefcase} title="Audit not found" description="The requested audit could not be found." />
      </div>
    );
  }

  const execStatus = audit?.execution_status || 'Planned';

  const sourceLabel = audit?.engagement_type === 'Ad Hoc' ? 'Ad Hoc' :
    audit?.engagement_type === 'Supplementary' ? 'Supplementary Plan' :
    audit?.annual_plan_id ? 'Annual Plan' : 'Ad Hoc';

  return (
    <div className="p-6">
      <AuditWorkspaceShell
        title={audit?.engagement_name || 'Untitled Audit'}
        code={audit?.engagement_code}
        subtitle={[
          audit?.department_id ? getDeptName(audit.department_id) : null,
          audit?.function_id ? getFunctionName(audit.function_id) : null,
        ].filter(Boolean).join(' › ') || undefined}
        backTo="/audit/audits"
        breadcrumbs={[
          { label: 'Internal Audit', href: '/audit/dashboard' },
          { label: 'Audits', href: '/audit/audits' },
          { label: audit?.engagement_code || 'Detail' },
        ]}
        status={audit?.status}
        executionStatus={execStatus}
        isLoading={isLoading}
        summaryProps={{
          department: audit?.department_id ? getDeptName(audit.department_id) : undefined,
          leadAuditor: audit?.lead_auditor_id ? getAuditorName(audit.lead_auditor_id) : undefined,
          startDate: audit?.planned_start_date,
          endDate: audit?.planned_end_date,
          riskRating: audit?.engagement_risk_rating,
          findingsCount: auditFindings.length,
          openFindingsCount: openFindings.length,
          overdueActions: overdueActionsCount,
          pendingResponses: pendingResponsesCount,
        }}
        actions={
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={`px-2 py-0.5 rounded-full font-medium ${
              sourceLabel === 'Annual Plan' ? 'bg-primary/10 text-primary' :
              sourceLabel === 'Supplementary Plan' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
              'bg-muted text-muted-foreground'
            }`}>{sourceLabel}</span>
          </div>
        }
        alerts={audit ? <SmartAlertsBanner audit={audit} auditFindings={auditFindings} auditResponses={auditResponses} auditActions={auditActions} /> : undefined}
      >
        {/* All Audit Workspace Tabs */}
        <Tabs defaultValue="overview" className="mt-2">
          <TabsList className="flex-wrap bg-transparent">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="preparation">Preparation</TabsTrigger>
            <TabsTrigger value="activities">
              <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" />Activities
            </TabsTrigger>
            <TabsTrigger value="evidence">
              <FileText className="h-3.5 w-3.5 mr-1.5" />Evidence
            </TabsTrigger>
            <TabsTrigger value="working-papers">
              <FileText className="h-3.5 w-3.5 mr-1.5" />Working Papers
            </TabsTrigger>
            <TabsTrigger value="findings">
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />Findings
              {auditFindings.length > 0 && <span className="ml-1.5 h-5 min-w-5 rounded-full bg-muted px-1.5 text-[10px] font-bold leading-5">{auditFindings.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="control-tests">
              <Shield className="h-3.5 w-3.5 mr-1.5" />Control Tests
            </TabsTrigger>
            <TabsTrigger value="responses">
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />Responses
              {pendingResponsesCount > 0 && <span className="ml-1.5 h-5 min-w-5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 text-[10px] font-bold leading-5">{pendingResponsesCount}</span>}
            </TabsTrigger>
            <TabsTrigger value="actions">
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />Actions
              {overdueActionsCount > 0 && <span className="ml-1.5 h-5 min-w-5 rounded-full bg-destructive/10 text-destructive px-1.5 text-[10px] font-bold leading-5">{overdueActionsCount}</span>}
            </TabsTrigger>
            <TabsTrigger value="report">
              <BarChart3 className="h-3.5 w-3.5 mr-1.5" />Report
            </TabsTrigger>
            <TabsTrigger value="follow-ups">
              <ListChecks className="h-3.5 w-3.5 mr-1.5" />Follow-ups
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <Clock className="h-3.5 w-3.5 mr-1.5" />Timeline
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <AuditOverviewTab
              audit={audit} auditId={id!} execStatus={execStatus}
              auditFindings={auditFindings} auditResponses={auditResponses} auditActions={auditActions}
              openFindings={openFindings} overdueActionsCount={overdueActionsCount} pendingResponsesCount={pendingResponsesCount}
              getDeptName={getDeptName} getFunctionName={getFunctionName} getAuditorName={getAuditorName} getPlanTitle={getPlanTitle}
            />
          </TabsContent>

          <TabsContent value="preparation">
            <AuditPreparationTab auditId={id!} audit={audit} engagementContext={engagementContext} />
          </TabsContent>

          <TabsContent value="activities">
            <AuditActivitiesTab auditId={id!} />
          </TabsContent>

          <TabsContent value="evidence">
            <AuditEvidenceTab auditId={id!} />
          </TabsContent>

          <TabsContent value="working-papers">
            <AuditWorkingPapersTab auditId={id!} />
          </TabsContent>

          <TabsContent value="findings">
            <AuditFindingsTab auditId={id!} auditFindings={auditFindings} auditResponses={auditResponses} auditActions={auditActions} departmentId={audit?.department_id} />
          </TabsContent>

          <TabsContent value="control-tests">
            <AuditControlTestsTab auditId={id!} />
          </TabsContent>

          <TabsContent value="responses">
            <AuditResponsesTab auditId={id!} auditFindings={auditFindings} auditResponses={auditResponses} departmentId={audit?.department_id} leadAuditorId={audit?.lead_auditor_id} />
          </TabsContent>

          <TabsContent value="actions">
            <AuditActionsTab auditId={id!} audit={audit} auditFindings={auditFindings} auditActions={auditActions} auditResponses={auditResponses} onClose={handleCloseAudit} />
          </TabsContent>

          <TabsContent value="report">
            <AuditReportTab auditId={id!} audit={audit} auditFindings={auditFindings} auditResponses={auditResponses} auditActions={auditActions} getDeptName={getDeptName} getAuditorName={getAuditorName} />
          </TabsContent>

          <TabsContent value="follow-ups">
            <AuditFollowUpsTab auditId={id!} />
          </TabsContent>

          <TabsContent value="timeline">
            <AuditTimelineTab auditId={id!} departmentId={audit?.department_id} />
          </TabsContent>
        </Tabs>
      </AuditWorkspaceShell>
    </div>
  );
}
