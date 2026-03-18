import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Building2, Shield, User, Briefcase, FileText, ClipboardCheck, Timer, Star, ExternalLink, MessageSquare, RefreshCw, CheckCircle, Mail, BarChart3, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge, DataTable } from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { PageHeader } from '@/components/common/PageHeader';
import { useIAEngagements } from '@/hooks/useAuditDataPhase2';
import { useIADepartments, useIAAnnualPlans, useIAAuditors, useIADepartmentFunctions } from '@/hooks/useAuditData';
import { usePreparationChecklists, usePreparationDocuments } from '@/hooks/useAuditPreparation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDateForDisplay } from '@/lib/format-config';
import { Loader2 } from 'lucide-react';

// Direct queries for engagement-specific data
function useEngagementActivities(engagementId?: string) {
  return useQuery({
    queryKey: ['ia_activities_engagement', engagementId],
    queryFn: async () => {
      const { data, error } = await supabase.from('ia_activities' as any).select('*').eq('engagement_id', engagementId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!engagementId,
  });
}

function useEngagementFindings(engagementId?: string) {
  return useQuery({
    queryKey: ['ia_findings_engagement', engagementId],
    queryFn: async () => {
      const { data, error } = await supabase.from('ia_findings' as any).select('*').eq('engagement_id', engagementId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!engagementId,
  });
}

function useEngagementControlTests(engagementId?: string) {
  return useQuery({
    queryKey: ['ia_control_tests_engagement', engagementId],
    queryFn: async () => {
      const { data, error } = await supabase.from('ia_control_tests' as any).select('*').eq('engagement_id', engagementId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!engagementId,
  });
}

function useEngagementTimeLogs(engagementId?: string) {
  return useQuery({
    queryKey: ['ia_time_logs_engagement', engagementId],
    queryFn: async () => {
      const { data, error } = await supabase.from('ia_time_logs' as any).select('*').eq('engagement_id', engagementId).order('work_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!engagementId,
  });
}

function useEngagementQualityReviews(engagementId?: string) {
  return useQuery({
    queryKey: ['ia_quality_reviews_engagement', engagementId],
    queryFn: async () => {
      const { data, error } = await supabase.from('ia_quality_reviews' as any).select('*').eq('engagement_id', engagementId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!engagementId,
  });
}

function useEngagementManagementResponses(engagementId?: string, findingIds?: string[]) {
  return useQuery({
    queryKey: ['ia_mgmt_responses_engagement', engagementId, findingIds],
    queryFn: async () => {
      // Try direct engagement_id first
      let { data, error } = await supabase.from('ia_management_responses' as any).select('*').eq('engagement_id', engagementId).order('created_at', { ascending: false });
      if (error) throw error;
      // Fallback: also include responses linked via finding_ids
      if (findingIds && findingIds.length > 0) {
        const { data: indirectData, error: err2 } = await supabase.from('ia_management_responses' as any).select('*').in('finding_id', findingIds);
        if (!err2 && indirectData) {
          const existingIds = new Set((data || []).map((d: any) => d.id));
          const additional = indirectData.filter((d: any) => !existingIds.has(d.id));
          data = [...(data || []), ...additional];
        }
      }
      return (data ?? []) as any[];
    },
    enabled: !!engagementId,
  });
}

function useEngagementFollowUps(engagementId?: string) {
  return useQuery({
    queryKey: ['ia_follow_ups_engagement', engagementId],
    queryFn: async () => {
      const { data, error } = await supabase.from('ia_follow_ups' as any).select('*').eq('engagement_id', engagementId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!engagementId,
  });
}

function useEngagementEvidence(engagementId?: string) {
  return useQuery({
    queryKey: ['ia_evidence_engagement', engagementId],
    queryFn: async () => {
      const { data, error } = await supabase.from('ia_evidence' as any).select('*').eq('engagement_id', engagementId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!engagementId,
  });
}

function useEngagementWorkingPapers(engagementId?: string) {
  return useQuery({
    queryKey: ['ia_working_papers_engagement', engagementId],
    queryFn: async () => {
      const { data, error } = await supabase.from('ia_working_papers' as any).select('*').eq('engagement_id', engagementId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!engagementId,
  });
}

function useEngagementActions(engagementId?: string) {
  return useQuery({
    queryKey: ['ia_action_tracking_engagement', engagementId],
    queryFn: async () => {
      const { data, error } = await supabase.from('ia_action_tracking' as any).select('*').eq('engagement_id', engagementId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!engagementId,
  });
}

function useEngagementReports(engagementId?: string) {
  return useQuery({
    queryKey: ['ia_audit_reports_engagement', engagementId],
    queryFn: async () => {
      const { data, error } = await supabase.from('ia_audit_reports' as any).select('*').eq('engagement_id', engagementId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!engagementId,
  });
}

function useEngagementCommunications(engagementId?: string) {
  return useQuery({
    queryKey: ['ia_communications_engagement', engagementId],
    queryFn: async () => {
      const { data, error } = await supabase.from('ia_communications' as any).select('*').eq('engagement_id', engagementId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!engagementId,
  });
}

export default function EngagementDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: engagements = [], isLoading } = useIAEngagements();
  const { data: departments = [] } = useIADepartments();
  const { data: plans = [] } = useIAAnnualPlans();
  const { data: auditors = [] } = useIAAuditors();

  const engagement = useMemo(() => engagements.find((e: any) => e.id === id), [engagements, id]);

  const { data: deptFunctions = [] } = useIADepartmentFunctions(engagement?.department_id || undefined);
  const { data: activities = [], isLoading: activitiesLoading } = useEngagementActivities(id);
  const { data: findings = [], isLoading: findingsLoading } = useEngagementFindings(id);
  const findingIds = useMemo(() => findings.map((f: any) => f.id), [findings]);
  const { data: controlTests = [], isLoading: controlTestsLoading } = useEngagementControlTests(id);
  const { data: timeLogs = [], isLoading: timeLogsLoading } = useEngagementTimeLogs(id);
  const { data: qualityReviews = [], isLoading: qrLoading } = useEngagementQualityReviews(id);
  const { data: managementResponses = [], isLoading: mrLoading } = useEngagementManagementResponses(id, findingIds);
  const { data: followUps = [], isLoading: fuLoading } = useEngagementFollowUps(id);
  const { data: evidence = [], isLoading: evidenceLoading } = useEngagementEvidence(id);
  const { data: workingPapers = [], isLoading: wpLoading } = useEngagementWorkingPapers(id);
  const { data: actions = [], isLoading: actionsLoading } = useEngagementActions(id);
  const { data: reports = [], isLoading: reportsLoading } = useEngagementReports(id);
  const { data: communications = [], isLoading: commsLoading } = useEngagementCommunications(id);
  const { data: checklists = [] } = usePreparationChecklists(undefined, id);
  const { data: prepDocuments = [] } = usePreparationDocuments(undefined, id);

  const getDeptName = (did: string) => departments?.find((d: any) => d.id === did)?.name || '—';
  const getFunctionName = (fid: string) => deptFunctions?.find((f: any) => f.id === fid)?.function_name || '—';
  const getPlanName = (pid: string) => plans?.find((p: any) => p.id === pid)?.title || '—';
  const getAuditorName = (aid: string) => auditors?.find((a: any) => a.id === aid)?.name || '—';

  const totalHoursLogged = useMemo(() => timeLogs.reduce((sum: number, t: any) => sum + (t.hours_spent || 0), 0), [timeLogs]);
  const checklistCompleted = checklists.filter((c: any) => c.is_completed).length;

  const goToModule = (path: string) => navigate(`${path}?engagement_id=${id}`);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!engagement) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" onClick={() => navigate('/audit/engagements')}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back
        </Button>
        <p className="text-muted-foreground">Engagement not found.</p>
      </div>
    );
  }

  const supportiveAuditorNames = Array.isArray(engagement.supportive_auditor_ids)
    ? engagement.supportive_auditor_ids.map((aid: string) => getAuditorName(aid)).join(', ')
    : '—';

  // ===== Column definitions =====
  const activityColumns: DataTableColumn<any>[] = [
    { key: 'name', header: 'Activity Name' },
    { key: 'activity_type', header: 'Type' },
    { key: 'priority', header: 'Priority', render: (r) => r.priority ? <StatusBadge status={r.priority} /> : '—' },
    { key: 'status', header: 'Status', render: (r) => r.status ? <StatusBadge status={r.status} /> : '—' },
    { key: 'planned_date_from', header: 'Start', render: (r) => r.planned_date_from ? formatDateForDisplay(r.planned_date_from) : '—' },
    { key: 'planned_date_to', header: 'End', render: (r) => r.planned_date_to ? formatDateForDisplay(r.planned_date_to) : '—' },
  ];

  const findingColumns: DataTableColumn<any>[] = [
    { key: 'finding_id', header: 'Finding ID' },
    { key: 'title', header: 'Title' },
    { key: 'risk_rating', header: 'Risk', render: (r) => r.risk_rating ? <StatusBadge status={r.risk_rating} /> : '—' },
    { key: 'root_cause_category', header: 'Root Cause' },
    { key: 'status', header: 'Status', render: (r) => r.status ? <StatusBadge status={r.status} /> : '—' },
    { key: 'created_date', header: 'Date', render: (r) => r.created_date ? formatDateForDisplay(r.created_date) : '—' },
  ];

  const controlTestColumns: DataTableColumn<any>[] = [
    { key: 'test_date', header: 'Test Date', render: (r) => r.test_date ? formatDateForDisplay(r.test_date) : '—' },
    { key: 'tested_by', header: 'Tested By' },
    { key: 'sample_size', header: 'Sample Size' },
    { key: 'exceptions_found', header: 'Exceptions' },
    { key: 'result', header: 'Result', render: (r) => r.result ? <StatusBadge status={r.result} /> : '—' },
    { key: 'remarks', header: 'Remarks', render: (r) => <span className="truncate max-w-[200px] block">{r.remarks || '—'}</span> },
  ];

  const timeLogColumns: DataTableColumn<any>[] = [
    { key: 'work_date', header: 'Date', render: (r) => r.work_date ? formatDateForDisplay(r.work_date) : '—' },
    { key: 'auditor_id', header: 'Auditor', render: (r) => r.auditor_id ? getAuditorName(r.auditor_id) : '—' },
    { key: 'work_type', header: 'Type' },
    { key: 'hours_spent', header: 'Hours' },
    { key: 'notes', header: 'Notes', render: (r) => <span className="truncate max-w-[200px] block">{r.notes || '—'}</span> },
  ];

  const qrColumns: DataTableColumn<any>[] = [
    { key: 'review_date', header: 'Date', render: (r) => r.review_date ? formatDateForDisplay(r.review_date) : '—' },
    { key: 'review_type', header: 'Type' },
    { key: 'quality_rating', header: 'Rating', render: (r) => r.quality_rating ? <StatusBadge status={r.quality_rating} /> : '—' },
    { key: 'final_disposition', header: 'Disposition' },
    { key: 'required_rework', header: 'Rework', render: (r) => r.required_rework ? 'Yes' : 'No' },
    { key: 'observations', header: 'Observations', render: (r) => <span className="truncate max-w-[200px] block">{r.observations || '—'}</span> },
  ];

  const mgmtResponseColumns: DataTableColumn<any>[] = [
    { key: 'finding', header: 'Finding', render: (r) => { const f = findings.find((f: any) => f.id === r.finding_id); return <span className="font-medium">{f?.title || '—'}</span>; } },
    { key: 'response_text', header: 'Response', render: (r) => <span className="truncate max-w-[200px] block">{r.response_text || '—'}</span> },
    { key: 'responsible_person', header: 'Responsible' },
    { key: 'target_date', header: 'Target Date', render: (r) => r.target_date ? formatDateForDisplay(r.target_date) : '—' },
    { key: 'status', header: 'Status', render: (r) => r.status ? <StatusBadge status={r.status} /> : '—' },
  ];

  const followUpColumns: DataTableColumn<any>[] = [
    { key: 'id', header: 'ID', render: (r) => <span className="font-mono text-xs">{(r.id || '').slice(0, 8)}</span> },
    { key: 'action_required', header: 'Action Required', render: (r) => <span className="truncate max-w-[200px] block">{r.action_required || r.description || '—'}</span> },
    { key: 'due_date', header: 'Due Date', render: (r) => r.due_date ? formatDateForDisplay(r.due_date) : '—' },
    { key: 'status', header: 'Status', render: (r) => r.status ? <StatusBadge status={r.status} /> : '—' },
    { key: 'responsible_party', header: 'Responsible', render: (r) => r.responsible_party ? getAuditorName(r.responsible_party) : '—' },
  ];

  const evidenceColumns: DataTableColumn<any>[] = [
    { key: 'title', header: 'Title', render: (r) => r.title || r.file_name || '—' },
    { key: 'evidence_type', header: 'Type' },
    { key: 'status', header: 'Status', render: (r) => r.status ? <StatusBadge status={r.status} /> : '—' },
    { key: 'created_at', header: 'Date', render: (r) => r.created_at ? formatDateForDisplay(r.created_at) : '—' },
  ];

  const wpColumns: DataTableColumn<any>[] = [
    { key: 'title', header: 'Title', render: (r) => r.title || r.reference_number || '—' },
    { key: 'paper_type', header: 'Type' },
    { key: 'status', header: 'Status', render: (r) => r.status ? <StatusBadge status={r.status} /> : '—' },
    { key: 'created_at', header: 'Date', render: (r) => r.created_at ? formatDateForDisplay(r.created_at) : '—' },
  ];

  const actionColumns: DataTableColumn<any>[] = [
    { key: 'action_description', header: 'Action', render: (r) => <span className="truncate max-w-[200px] block">{r.action_description || '—'}</span> },
    { key: 'responsible_person', header: 'Responsible', render: (r) => r.responsible_person ? getAuditorName(r.responsible_person) : '—' },
    { key: 'target_date', header: 'Target Date', render: (r) => r.target_date ? formatDateForDisplay(r.target_date) : '—' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status || 'Not Started'} /> },
  ];

  const reportColumns: DataTableColumn<any>[] = [
    { key: 'report_number', header: 'Report ID', render: (r) => r.report_number || (r.id || '').slice(0, 8) },
    { key: 'title', header: 'Title' },
    { key: 'report_type', header: 'Type' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  const commColumns: DataTableColumn<any>[] = [
    { key: 'sent_date', header: 'Date', render: (r) => r.sent_date ? formatDateForDisplay(r.sent_date) : '—' },
    { key: 'subject', header: 'Subject' },
    { key: 'recipient_email', header: 'Recipient' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status || 'Sent'} /> },
  ];

  const checklistColumns: DataTableColumn<any>[] = [
    { key: 'item_text', header: 'Item' },
    { key: 'category', header: 'Category' },
    { key: 'is_completed', header: 'Status', render: (r) => <StatusBadge status={r.is_completed ? 'Completed' : 'Pending'} /> },
  ];

  // Quick action navigation links
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
    { label: 'Follow-Ups', path: '/audit/follow-up', icon: RefreshCw, section: 'Issues' },
    { label: 'Quality Review', path: '/audit/quality-review', icon: Star, section: 'Closure' },
    { label: 'Plan Closeout', path: '/audit/plan-closeout', icon: ClipboardCheck, section: 'Closure' },
    { label: 'Reports', path: '/audit/reports', icon: BarChart3, section: 'Reporting' },
    { label: 'Communication', path: '/audit/communication', icon: Mail, section: 'Reporting' },
  ];

  const groupedLinks = quickLinks.reduce((acc, link) => {
    if (!acc[link.section]) acc[link.section] = [];
    acc[link.section].push(link);
    return acc;
  }, {} as Record<string, typeof quickLinks>);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/audit/engagements')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <PageHeader
              title={engagement.engagement_name || 'Untitled Engagement'}
              breadcrumbs={[
                { label: 'Internal Audit', href: '/audit/dashboard' },
                { label: 'Engagements', href: '/audit/engagements' },
                { label: engagement.engagement_code || 'Detail' },
              ]}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={engagement.status} />
          <StatusBadge status={engagement.engagement_risk_rating} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <SummaryCard icon={Building2} label="Department" value={engagement.department_id ? getDeptName(engagement.department_id) : '—'} />
        <SummaryCard icon={Briefcase} label="Function" value={engagement.function_id ? getFunctionName(engagement.function_id) : '—'} />
        <SummaryCard icon={User} label="Lead Auditor" value={engagement.lead_auditor_id ? getAuditorName(engagement.lead_auditor_id) : '—'} />
        <SummaryCard icon={Calendar} label="Start Date" value={engagement.planned_start_date ? formatDateForDisplay(engagement.planned_start_date) : '—'} />
        <SummaryCard icon={Calendar} label="End Date" value={engagement.planned_end_date ? formatDateForDisplay(engagement.planned_end_date) : '—'} />
        <SummaryCard icon={Clock} label="Hours (Est/Logged)" value={`${engagement.estimated_hours || 0} / ${totalHoursLogged}`} />
      </div>

      {/* Quick Navigation Links */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Quick Navigation</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {Object.entries(groupedLinks).map(([section, links]) => (
              <div key={section} className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-muted-foreground w-20 shrink-0">{section}</span>
                {links.map((link) => (
                  <Button
                    key={link.path}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => goToModule(link.path)}
                  >
                    <link.icon className="h-3 w-3 mr-1" />
                    {link.label}
                    <ExternalLink className="h-3 w-3 ml-1 opacity-50" />
                  </Button>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="preparation">Preparation ({checklists.length})</TabsTrigger>
          <TabsTrigger value="activities">Activities ({activities.length})</TabsTrigger>
          <TabsTrigger value="evidence">Evidence ({evidence.length})</TabsTrigger>
          <TabsTrigger value="working-papers">Working Papers ({workingPapers.length})</TabsTrigger>
          <TabsTrigger value="findings">Findings ({findings.length})</TabsTrigger>
          <TabsTrigger value="mgmt-responses">Mgmt Responses ({managementResponses.length})</TabsTrigger>
          <TabsTrigger value="actions">Actions ({actions.length})</TabsTrigger>
          <TabsTrigger value="follow-ups">Follow-Ups ({followUps.length})</TabsTrigger>
          <TabsTrigger value="control-tests">Control Tests ({controlTests.length})</TabsTrigger>
          <TabsTrigger value="closure">Closure</TabsTrigger>
          <TabsTrigger value="reports">Reports ({reports.length})</TabsTrigger>
          <TabsTrigger value="communication">Communication ({communications.length})</TabsTrigger>
          <TabsTrigger value="time-logs">Time Logs ({timeLogs.length})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Engagement Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <DetailRow label="Engagement Code" value={engagement.engagement_code} />
                <DetailRow label="Annual Plan" value={engagement.annual_plan_id ? getPlanName(engagement.annual_plan_id) : '—'} />
                <DetailRow label="Risk Rating" value={engagement.engagement_risk_rating} />
                <DetailRow label="Estimated Budget" value={engagement.estimated_budget ? `$${Number(engagement.estimated_budget).toLocaleString()}` : '—'} />
                <DetailRow label="Estimated Hours" value={engagement.estimated_hours || '—'} />
                <DetailRow label="Status" value={engagement.status} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Audit Team</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <DetailRow label="Lead Auditor" value={engagement.lead_auditor_id ? getAuditorName(engagement.lead_auditor_id) : '—'} />
                <DetailRow label="Supportive Auditors" value={supportiveAuditorNames} />
                <DetailRow label="Department" value={engagement.department_id ? getDeptName(engagement.department_id) : '—'} />
                <DetailRow label="Function" value={engagement.function_id ? getFunctionName(engagement.function_id) : '—'} />
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Scope, Objectives & Methodology</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Scope</p>
                  <p className="text-sm whitespace-pre-wrap">{engagement.scope || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Objectives</p>
                  <p className="text-sm whitespace-pre-wrap">{engagement.objectives || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Methodology</p>
                  <p className="text-sm whitespace-pre-wrap">{engagement.methodology || '—'}</p>
                </div>
                {engagement.criteria && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Criteria</p>
                    <p className="text-sm whitespace-pre-wrap">{engagement.criteria}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Preparation Tab */}
        <TabsContent value="preparation">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5" />Preparation Checklist ({checklistCompleted}/{checklists.length})</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => goToModule('/audit/preparation')}>
                    <ExternalLink className="h-3 w-3 mr-1" />Open Preparation
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable columns={checklistColumns} data={checklists} emptyMessage="No checklist items for this engagement" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Documents ({prepDocuments.length})</CardTitle></CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Activities</CardTitle>
                <Button variant="outline" size="sm" onClick={() => goToModule('/audit/activity-workbench')}>
                  <ExternalLink className="h-3 w-3 mr-1" />Open in Workbench
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable columns={activityColumns} data={activities} isLoading={activitiesLoading} emptyMessage="No activities for this engagement" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evidence Tab */}
        <TabsContent value="evidence">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Evidence</CardTitle>
                <Button variant="outline" size="sm" onClick={() => goToModule('/audit/evidence')}>
                  <ExternalLink className="h-3 w-3 mr-1" />Open Evidence
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable columns={evidenceColumns} data={evidence} isLoading={evidenceLoading} emptyMessage="No evidence for this engagement" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Working Papers Tab */}
        <TabsContent value="working-papers">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Working Papers</CardTitle>
                <Button variant="outline" size="sm" onClick={() => goToModule('/audit/working-papers')}>
                  <ExternalLink className="h-3 w-3 mr-1" />Open Working Papers
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable columns={wpColumns} data={workingPapers} isLoading={wpLoading} emptyMessage="No working papers for this engagement" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Findings Tab */}
        <TabsContent value="findings">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Findings</CardTitle>
                <Button variant="outline" size="sm" onClick={() => goToModule('/audit/findings')}>
                  <ExternalLink className="h-3 w-3 mr-1" />Open Findings
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable columns={findingColumns} data={findings} isLoading={findingsLoading} emptyMessage="No findings for this engagement" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Management Responses Tab */}
        <TabsContent value="mgmt-responses">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />Management Responses</CardTitle>
                <Button variant="outline" size="sm" onClick={() => goToModule('/audit/management-responses')}>
                  <ExternalLink className="h-3 w-3 mr-1" />Open Responses
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable columns={mgmtResponseColumns} data={managementResponses} isLoading={mrLoading} emptyMessage="No management responses for this engagement" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Action Tracking Tab */}
        <TabsContent value="actions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5" />Corrective Actions</CardTitle>
                <Button variant="outline" size="sm" onClick={() => goToModule('/audit/actions')}>
                  <ExternalLink className="h-3 w-3 mr-1" />Open Action Tracking
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable columns={actionColumns} data={actions} isLoading={actionsLoading} emptyMessage="No corrective actions for this engagement" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Follow-Ups Tab */}
        <TabsContent value="follow-ups">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><RefreshCw className="h-5 w-5" />Follow-Ups</CardTitle>
                <Button variant="outline" size="sm" onClick={() => goToModule('/audit/follow-up')}>
                  <ExternalLink className="h-3 w-3 mr-1" />Open Follow-Up Tracker
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable columns={followUpColumns} data={followUps} isLoading={fuLoading} emptyMessage="No follow-ups for this engagement" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Control Tests Tab */}
        <TabsContent value="control-tests">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5" />Control Tests</CardTitle>
                <Button variant="outline" size="sm" onClick={() => goToModule('/audit/control-testing')}>
                  <ExternalLink className="h-3 w-3 mr-1" />Open Control Testing
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable columns={controlTestColumns} data={controlTests} isLoading={controlTestsLoading} emptyMessage="No control tests for this engagement" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Closure Tab */}
        <TabsContent value="closure">
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Star className="h-5 w-5" />Quality Reviews</CardTitle></CardHeader>
              <CardContent>
                <DataTable columns={qrColumns} data={qualityReviews} isLoading={qrLoading} emptyMessage="No quality reviews for this engagement" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Closure Status</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <DetailRow label="Total Findings" value={findings.length} />
                  <DetailRow label="Open Findings" value={findings.filter((f: any) => f.status !== 'Closed' && f.status !== 'Resolved').length} />
                  <DetailRow label="Mgmt Responses Received" value={managementResponses.length} />
                  <DetailRow label="Actions Verified/Closed" value={actions.filter((a: any) => a.status === 'Verified' || a.status === 'Closed').length} />
                  <DetailRow label="Quality Reviews" value={qualityReviews.length} />
                  <DetailRow label="Hours Logged" value={totalHoursLogged} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Reports</CardTitle>
                <Button variant="outline" size="sm" onClick={() => goToModule('/audit/reports')}>
                  <ExternalLink className="h-3 w-3 mr-1" />Open Reports
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable columns={reportColumns} data={reports} isLoading={reportsLoading} emptyMessage="No reports for this engagement" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communication Tab */}
        <TabsContent value="communication">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" />Communications</CardTitle>
                <Button variant="outline" size="sm" onClick={() => goToModule('/audit/communication')}>
                  <ExternalLink className="h-3 w-3 mr-1" />Open Communication Center
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable columns={commColumns} data={communications} isLoading={commsLoading} emptyMessage="No communications for this engagement" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Logs Tab */}
        <TabsContent value="time-logs">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Timer className="h-5 w-5" />Time Logs — Total: {totalHoursLogged}h</CardTitle></CardHeader>
            <CardContent>
              <DataTable columns={timeLogColumns} data={timeLogs} isLoading={timeLogsLoading} emptyMessage="No time logs for this engagement" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ===== Helper components =====
function SummaryCard({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-medium truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value ?? '—'}</span>
    </div>
  );
}
