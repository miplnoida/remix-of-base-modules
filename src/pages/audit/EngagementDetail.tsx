import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Clock, Building2, Shield, User, Briefcase, FileText,
  ClipboardCheck, Star, ExternalLink, MessageSquare, RefreshCw, CheckCircle,
  Mail, BarChart3, GitBranch, Loader2, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge, DataTable } from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { PageHeader } from '@/components/common/PageHeader';
import { useIAEngagements } from '@/hooks/useAuditDataPhase2';
import { useIADepartments, useIAAnnualPlans, useIAAuditors, useIADepartmentFunctions } from '@/hooks/useAuditData';
import { usePreparationChecklists, usePreparationDocuments } from '@/hooks/useAuditPreparation';
import { useWorkPrograms } from '@/hooks/useWorkPrograms';
import {
  useEngagementActivities, useEngagementFindings, useEngagementControlTests,
  useEngagementTimeLogs, useEngagementQualityReviews, useEngagementFollowUps,
  useEngagementEvidence, useEngagementWorkingPapers, useEngagementActions,
  useEngagementReports, useEngagementCommunications, useEngagementManagementResponses,
} from '@/hooks/useEngagementData';
import { useEngagementLifecycle } from '@/hooks/useEngagementClosure';
import { LifecycleStepper, type LifecycleStage } from '@/components/audit/LifecycleStepper';
import { WorkProgramPanel } from '@/components/audit/WorkProgramPanel';
import { EngagementClosurePanel } from '@/components/audit/EngagementClosurePanel';
import { formatDateForDisplay } from '@/lib/format-config';

// ===== Summary card =====
function SummaryCard({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-semibold truncate">{value || '—'}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%] truncate">{value ?? '—'}</span>
    </div>
  );
}

// ===== Tab content wrapper =====
function TabSection({ title, icon: Icon, count, modulePath, engagementId, children }: {
  title: string; icon: any; count?: number; modulePath?: string; engagementId: string; children: React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />{title}{count !== undefined && ` (${count})`}
          </CardTitle>
          {modulePath && (
            <Button variant="outline" size="sm" onClick={() => navigate(`${modulePath}?engagement_id=${engagementId}`)}>
              <ExternalLink className="h-3 w-3 mr-1" />Open Full View
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function EngagementDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Core data
  const { data: engagements = [], isLoading } = useIAEngagements();
  const { data: departments = [] } = useIADepartments();
  const { data: plans = [] } = useIAAnnualPlans();
  const { data: auditors = [] } = useIAAuditors();
  const engagement = useMemo(() => engagements.find((e: any) => e.id === id), [engagements, id]);
  const { data: deptFunctions = [] } = useIADepartmentFunctions(engagement?.department_id || undefined);

  // Lifecycle
  const { transition } = useEngagementLifecycle();
  const lifecycleStatus = engagement?.lifecycle_status || engagement?.status || 'Planned';
  const isCompleted = lifecycleStatus.toLowerCase() === 'completed';

  // All engagement data
  const { data: activities = [], isLoading: activitiesLoading } = useEngagementActivities(id);
  const { data: findings = [], isLoading: findingsLoading } = useEngagementFindings(id);
  const findingIds = useMemo(() => findings.map((f: any) => f.id), [findings]);
  const { data: controlTests = [], isLoading: ctLoading } = useEngagementControlTests(id);
  const { data: timeLogs = [] } = useEngagementTimeLogs(id);
  const { data: qualityReviews = [], isLoading: qrLoading } = useEngagementQualityReviews(id);
  const { data: managementResponses = [], isLoading: mrLoading } = useEngagementManagementResponses(id, findingIds);
  const { data: followUps = [], isLoading: fuLoading } = useEngagementFollowUps(id);
  const { data: evidence = [], isLoading: evLoading } = useEngagementEvidence(id);
  const { data: workingPapers = [], isLoading: wpLoading } = useEngagementWorkingPapers(id);
  const { data: actions = [], isLoading: actLoading } = useEngagementActions(id);
  const { data: reports = [], isLoading: rpLoading } = useEngagementReports(id);
  const { data: communications = [], isLoading: cmLoading } = useEngagementCommunications(id);
  const { data: checklists = [] } = usePreparationChecklists(undefined, id);
  const { data: prepDocuments = [] } = usePreparationDocuments(undefined, id);
  const { data: workPrograms = [] } = useWorkPrograms(id);

  // Helpers
  const getDeptName = (did: string) => departments?.find((d: any) => d.id === did)?.name || '—';
  const getFunctionName = (fid: string) => deptFunctions?.find((f: any) => f.id === fid)?.function_name || '—';
  const getPlanName = (pid: string) => plans?.find((p: any) => p.id === pid)?.title || '—';
  const getAuditorName = (aid: string) => auditors?.find((a: any) => a.id === aid)?.name || '—';
  const totalHoursLogged = useMemo(() => timeLogs.reduce((sum: number, t: any) => sum + (t.hours_spent || 0), 0), [timeLogs]);
  const checklistCompleted = checklists.filter((c: any) => c.is_completed).length;
  const openFindings = findings.filter((f: any) => f.status !== 'Closed' && f.status !== 'Resolved').length;
  const verifiedActions = actions.filter((a: any) => a.status === 'Verified' || a.status === 'Closed').length;

  const handleLifecycleTransition = (status: LifecycleStage) => {
    if (id) transition.mutate({ engagementId: id, status });
  };

  // Quick navigation links
  const quickLinks = [
    { label: 'Preparation', path: '/audit/preparation', icon: CheckCircle, section: 'Preparation' },
    { label: 'Activities', path: '/audit/activity-workbench', icon: FileText, section: 'Execution' },
    { label: 'Evidence', path: '/audit/evidence', icon: FileText, section: 'Execution' },
    { label: 'Working Papers', path: '/audit/working-papers', icon: FileText, section: 'Execution' },
    { label: 'Control Testing', path: '/audit/control-testing', icon: ClipboardCheck, section: 'Execution' },
    { label: 'RCM', path: '/audit/risk-control-matrix', icon: GitBranch, section: 'Execution' },
    { label: 'Findings', path: '/audit/findings', icon: Shield, section: 'Issues' },
    { label: 'Mgmt Responses', path: '/audit/management-responses', icon: MessageSquare, section: 'Issues' },
    { label: 'Action Tracking', path: '/audit/actions', icon: ClipboardCheck, section: 'Issues' },
    { label: 'Follow-Ups', path: '/audit/follow-up-tracker', icon: RefreshCw, section: 'Issues' },
    { label: 'Quality Review', path: '/audit/quality-review', icon: Star, section: 'Closure' },
    { label: 'Reports', path: '/audit/audit-reports', icon: BarChart3, section: 'Reporting' },
    { label: 'Communication', path: '/audit/communication-center', icon: Mail, section: 'Reporting' },
  ];

  const groupedLinks = quickLinks.reduce((acc, link) => {
    if (!acc[link.section]) acc[link.section] = [];
    acc[link.section].push(link);
    return acc;
  }, {} as Record<string, typeof quickLinks>);

  // ===== Column definitions =====
  const activityCols: DataTableColumn<any>[] = [
    { key: 'name', header: 'Activity Name' },
    { key: 'activity_type', header: 'Type' },
    { key: 'priority', header: 'Priority', render: (r) => r.priority ? <StatusBadge status={r.priority} /> : '—' },
    { key: 'status', header: 'Status', render: (r) => r.status ? <StatusBadge status={r.status} /> : '—' },
    { key: 'planned_date_from', header: 'Start', render: (r) => r.planned_date_from ? formatDateForDisplay(r.planned_date_from) : '—' },
  ];

  const findingCols: DataTableColumn<any>[] = [
    { key: 'finding_id', header: 'Finding ID' },
    { key: 'title', header: 'Title' },
    { key: 'risk_rating', header: 'Risk', render: (r) => r.risk_rating ? <StatusBadge status={r.risk_rating} /> : '—' },
    { key: 'root_cause_category', header: 'Root Cause' },
    { key: 'status', header: 'Status', render: (r) => r.status ? <StatusBadge status={r.status} /> : '—' },
  ];

  const ctCols: DataTableColumn<any>[] = [
    { key: 'test_date', header: 'Date', render: (r) => r.test_date ? formatDateForDisplay(r.test_date) : '—' },
    { key: 'tested_by', header: 'Tested By' },
    { key: 'sample_size', header: 'Sample' },
    { key: 'result', header: 'Result', render: (r) => r.result ? <StatusBadge status={r.result} /> : '—' },
  ];

  const evidenceCols: DataTableColumn<any>[] = [
    { key: 'title', header: 'Title', render: (r) => r.title || r.file_name || '—' },
    { key: 'evidence_type', header: 'Type' },
    { key: 'status', header: 'Status', render: (r) => r.status ? <StatusBadge status={r.status} /> : '—' },
  ];

  const wpCols: DataTableColumn<any>[] = [
    { key: 'title', header: 'Title', render: (r) => r.title || r.reference_number || '—' },
    { key: 'paper_type', header: 'Type' },
    { key: 'status', header: 'Status', render: (r) => r.status ? <StatusBadge status={r.status} /> : '—' },
  ];

  const mrCols: DataTableColumn<any>[] = [
    { key: 'finding', header: 'Finding', render: (r) => { const f = findings.find((f2: any) => f2.id === r.finding_id); return f?.title || '—'; } },
    { key: 'response_text', header: 'Response', render: (r) => <span className="truncate max-w-[200px] block">{r.response_text || '—'}</span> },
    { key: 'status', header: 'Status', render: (r) => r.status ? <StatusBadge status={r.status} /> : '—' },
  ];

  const actionCols: DataTableColumn<any>[] = [
    { key: 'action_description', header: 'Action', render: (r) => <span className="truncate max-w-[200px] block">{r.action_description || '—'}</span> },
    { key: 'target_date', header: 'Due', render: (r) => r.target_date ? formatDateForDisplay(r.target_date) : '—' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status || 'Not Started'} /> },
  ];

  const fuCols: DataTableColumn<any>[] = [
    { key: 'action_required', header: 'Action', render: (r) => <span className="truncate max-w-[200px] block">{r.action_required || r.description || '—'}</span> },
    { key: 'due_date', header: 'Due', render: (r) => r.due_date ? formatDateForDisplay(r.due_date) : '—' },
    { key: 'status', header: 'Status', render: (r) => r.status ? <StatusBadge status={r.status} /> : '—' },
  ];

  const checklistCols: DataTableColumn<any>[] = [
    { key: 'item_text', header: 'Item' },
    { key: 'category', header: 'Category' },
    { key: 'is_completed', header: 'Status', render: (r) => <StatusBadge status={r.is_completed ? 'Completed' : 'Pending'} /> },
  ];

  const reportCols: DataTableColumn<any>[] = [
    { key: 'report_number', header: 'ID', render: (r) => r.report_number || (r.id || '').slice(0, 8) },
    { key: 'title', header: 'Title' },
    { key: 'report_type', header: 'Type' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  const commCols: DataTableColumn<any>[] = [
    { key: 'sent_date', header: 'Date', render: (r) => r.sent_date ? formatDateForDisplay(r.sent_date) : '—' },
    { key: 'subject', header: 'Subject' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status || 'Sent'} /> },
  ];

  const qrCols: DataTableColumn<any>[] = [
    { key: 'review_date', header: 'Date', render: (r) => r.review_date ? formatDateForDisplay(r.review_date) : '—' },
    { key: 'review_type', header: 'Type' },
    { key: 'quality_rating', header: 'Rating', render: (r) => r.quality_rating ? <StatusBadge status={r.quality_rating} /> : '—' },
    { key: 'required_rework', header: 'Rework', render: (r) => r.required_rework ? 'Yes' : 'No' },
  ];

  const tlCols: DataTableColumn<any>[] = [
    { key: 'work_date', header: 'Date', render: (r) => r.work_date ? formatDateForDisplay(r.work_date) : '—' },
    { key: 'work_type', header: 'Type' },
    { key: 'hours_spent', header: 'Hours' },
    { key: 'notes', header: 'Notes', render: (r) => <span className="truncate max-w-[200px] block">{r.notes || '—'}</span> },
  ];

  // ===== Loading / Not Found =====
  if (isLoading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-10 w-10 animate-spin text-muted-foreground" /></div>;
  }
  if (!engagement) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" onClick={() => navigate('/audit/engagements')}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        <p className="text-muted-foreground">Engagement not found.</p>
      </div>
    );
  }

  const supportiveNames = Array.isArray(engagement.supportive_auditor_ids)
    ? engagement.supportive_auditor_ids.map((aid: string) => getAuditorName(aid)).join(', ')
    : '—';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/audit/engagements')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <PageHeader
            title={engagement.engagement_name || 'Untitled Engagement'}
            breadcrumbs={[
              { label: 'Internal Audit', href: '/audit/dashboard' },
              { label: 'Engagements', href: '/audit/engagements' },
              { label: engagement.engagement_code || 'Detail' },
            ]}
          />
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={engagement.status} />
          <StatusBadge status={engagement.engagement_risk_rating} />
          {isCompleted && <Lock className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      {/* Lifecycle Stepper */}
      <Card>
        <CardContent className="py-3">
          <LifecycleStepper
            currentStatus={lifecycleStatus}
            onTransition={isCompleted ? undefined : handleLifecycleTransition}
            isTransitioning={transition.isPending}
          />
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <SummaryCard icon={Building2} label="Department" value={engagement.department_id ? getDeptName(engagement.department_id) : '—'} />
        <SummaryCard icon={Briefcase} label="Function" value={engagement.function_id ? getFunctionName(engagement.function_id) : '—'} />
        <SummaryCard icon={User} label="Lead Auditor" value={engagement.lead_auditor_id ? getAuditorName(engagement.lead_auditor_id) : '—'} />
        <SummaryCard icon={Calendar} label="Period" value={engagement.planned_start_date ? `${formatDateForDisplay(engagement.planned_start_date)} – ${engagement.planned_end_date ? formatDateForDisplay(engagement.planned_end_date) : ''}` : '—'} />
        <SummaryCard icon={Clock} label="Hours (Est/Actual)" value={`${engagement.estimated_hours || 0} / ${totalHoursLogged}`} />
        <SummaryCard icon={Shield} label="Findings" value={`${findings.length} (${openFindings} open)`} />
      </div>

      {/* Quick Navigation */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Quick Navigation</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {Object.entries(groupedLinks).map(([section, links]) => (
              <div key={section} className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-muted-foreground w-20 shrink-0">{section}</span>
                {links.map((link) => (
                  <Button key={link.path} variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate(`${link.path}?engagement_id=${id}`)}>
                    <link.icon className="h-3 w-3 mr-1" />{link.label}<ExternalLink className="h-3 w-3 ml-1 opacity-50" />
                  </Button>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="preparation">Preparation ({checklists.length})</TabsTrigger>
          <TabsTrigger value="work-program">Work Program ({workPrograms.length})</TabsTrigger>
          <TabsTrigger value="execution">Execution ({activities.length})</TabsTrigger>
          <TabsTrigger value="rcm">RCM</TabsTrigger>
          <TabsTrigger value="evidence">Evidence ({evidence.length})</TabsTrigger>
          <TabsTrigger value="working-papers">Papers ({workingPapers.length})</TabsTrigger>
          <TabsTrigger value="findings">Findings ({findings.length})</TabsTrigger>
          <TabsTrigger value="mgmt-response">Mgmt Response ({managementResponses.length})</TabsTrigger>
          <TabsTrigger value="actions">Actions ({actions.length})</TabsTrigger>
          <TabsTrigger value="follow-up">Follow-Up ({followUps.length})</TabsTrigger>
          <TabsTrigger value="closure">Closure</TabsTrigger>
          <TabsTrigger value="reports">Reports ({reports.length})</TabsTrigger>
          <TabsTrigger value="communication">Comms ({communications.length})</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Engagement Details</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                <DetailRow label="Engagement Code" value={engagement.engagement_code} />
                <DetailRow label="Annual Plan" value={engagement.annual_plan_id ? getPlanName(engagement.annual_plan_id) : '—'} />
                <DetailRow label="Risk Rating" value={engagement.engagement_risk_rating} />
                <DetailRow label="Lifecycle Status" value={lifecycleStatus} />
                <DetailRow label="Estimated Budget" value={engagement.estimated_budget ? `$${Number(engagement.estimated_budget).toLocaleString()}` : '—'} />
                <DetailRow label="Estimated Hours" value={engagement.estimated_hours || '—'} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Audit Team</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                <DetailRow label="Lead Auditor" value={engagement.lead_auditor_id ? getAuditorName(engagement.lead_auditor_id) : '—'} />
                <DetailRow label="Supportive Auditors" value={supportiveNames} />
                <DetailRow label="Department" value={engagement.department_id ? getDeptName(engagement.department_id) : '—'} />
                <DetailRow label="Function" value={engagement.function_id ? getFunctionName(engagement.function_id) : '—'} />
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Scope, Objectives & Methodology</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><p className="text-sm font-medium text-muted-foreground mb-1">Scope</p><p className="text-sm whitespace-pre-wrap">{engagement.scope || '—'}</p></div>
                <div><p className="text-sm font-medium text-muted-foreground mb-1">Objectives</p><p className="text-sm whitespace-pre-wrap">{engagement.objectives || '—'}</p></div>
                <div><p className="text-sm font-medium text-muted-foreground mb-1">Methodology</p><p className="text-sm whitespace-pre-wrap">{engagement.methodology || '—'}</p></div>
              </CardContent>
            </Card>
            {/* Time Logs summary */}
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Time Logs ({timeLogs.length})</CardTitle></CardHeader>
              <CardContent>
                <DataTable columns={tlCols} data={timeLogs} emptyMessage="No time logs" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Preparation */}
        <TabsContent value="preparation">
          <div className="space-y-4">
            <TabSection title="Preparation Checklist" icon={CheckCircle} count={checklists.length} modulePath="/audit/preparation" engagementId={id!}>
              <div className="mb-2 text-xs text-muted-foreground">{checklistCompleted} of {checklists.length} completed</div>
              <DataTable columns={checklistCols} data={checklists} emptyMessage="No checklist items" />
            </TabSection>
            <TabSection title="Documents" icon={FileText} count={prepDocuments.length} modulePath="/audit/preparation" engagementId={id!}>
              {prepDocuments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No preparation documents</p>
              ) : (
                <div className="space-y-2">
                  {prepDocuments.map((doc: any) => (
                    <div key={doc.id} className="flex items-center gap-3 p-2 rounded border">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{doc.file_name}</span>
                      <span className="text-xs text-muted-foreground">({doc.document_type})</span>
                    </div>
                  ))}
                </div>
              )}
            </TabSection>
          </div>
        </TabsContent>

        {/* Work Program */}
        <TabsContent value="work-program">
          <WorkProgramPanel engagementId={id!} readOnly={isCompleted} />
        </TabsContent>

        {/* Execution */}
        <TabsContent value="execution">
          <TabSection title="Activities" icon={FileText} count={activities.length} modulePath="/audit/activity-workbench" engagementId={id!}>
            <DataTable columns={activityCols} data={activities} isLoading={activitiesLoading} emptyMessage="No activities" />
          </TabSection>
        </TabsContent>

        {/* RCM */}
        <TabsContent value="rcm">
          <TabSection title="Risk Control Matrix" icon={GitBranch} modulePath="/audit/rcm" engagementId={id!}>
            <p className="text-sm text-muted-foreground text-center py-6">
              Open the full RCM view to see controls scoped to this engagement's department and function.
            </p>
          </TabSection>
        </TabsContent>

        {/* Evidence */}
        <TabsContent value="evidence">
          <TabSection title="Evidence" icon={FileText} count={evidence.length} modulePath="/audit/evidence" engagementId={id!}>
            <DataTable columns={evidenceCols} data={evidence} isLoading={evLoading} emptyMessage="No evidence" />
          </TabSection>
        </TabsContent>

        {/* Working Papers */}
        <TabsContent value="working-papers">
          <TabSection title="Working Papers" icon={FileText} count={workingPapers.length} modulePath="/audit/working-papers" engagementId={id!}>
            <DataTable columns={wpCols} data={workingPapers} isLoading={wpLoading} emptyMessage="No working papers" />
          </TabSection>
        </TabsContent>

        {/* Findings */}
        <TabsContent value="findings">
          <TabSection title="Findings" icon={Shield} count={findings.length} modulePath="/audit/findings" engagementId={id!}>
            <DataTable columns={findingCols} data={findings} isLoading={findingsLoading} emptyMessage="No findings" />
          </TabSection>
        </TabsContent>

        {/* Mgmt Response */}
        <TabsContent value="mgmt-response">
          <TabSection title="Management Responses" icon={MessageSquare} count={managementResponses.length} modulePath="/audit/responses" engagementId={id!}>
            <DataTable columns={mrCols} data={managementResponses} isLoading={mrLoading} emptyMessage="No responses" />
          </TabSection>
        </TabsContent>

        {/* Corrective Actions */}
        <TabsContent value="actions">
          <TabSection title="Corrective Actions" icon={ClipboardCheck} count={actions.length} modulePath="/audit/actions" engagementId={id!}>
            <DataTable columns={actionCols} data={actions} isLoading={actLoading} emptyMessage="No actions" />
          </TabSection>
        </TabsContent>

        {/* Follow-Up */}
        <TabsContent value="follow-up">
          <TabSection title="Follow-Up" icon={RefreshCw} count={followUps.length} modulePath="/audit/follow-up-tracker" engagementId={id!}>
            <DataTable columns={fuCols} data={followUps} isLoading={fuLoading} emptyMessage="No follow-ups" />
          </TabSection>
        </TabsContent>

        {/* Closure */}
        <TabsContent value="closure">
          <div className="space-y-4">
            <EngagementClosurePanel
              engagementId={id!}
              findingsCount={findings.length}
              openFindingsCount={openFindings}
              responsesCount={managementResponses.length}
              actionsCount={actions.length}
              verifiedActionsCount={verifiedActions}
              documentsCount={prepDocuments.length}
              lifecycleStatus={lifecycleStatus}
            />
            <TabSection title="Quality Reviews" icon={Star} count={qualityReviews.length} modulePath="/audit/quality-review" engagementId={id!}>
              <DataTable columns={qrCols} data={qualityReviews} isLoading={qrLoading} emptyMessage="No quality reviews" />
            </TabSection>
          </div>
        </TabsContent>

        {/* Reports */}
        <TabsContent value="reports">
          <TabSection title="Reports" icon={BarChart3} count={reports.length} modulePath="/audit/audit-reports" engagementId={id!}>
            <DataTable columns={reportCols} data={reports} isLoading={rpLoading} emptyMessage="No reports" />
          </TabSection>
        </TabsContent>

        {/* Communication */}
        <TabsContent value="communication">
          <TabSection title="Communication" icon={Mail} count={communications.length} modulePath="/audit/communication-center" engagementId={id!}>
            <DataTable columns={commCols} data={communications} isLoading={cmLoading} emptyMessage="No communications" />
          </TabSection>
        </TabsContent>
      </Tabs>
    </div>
  );
}
