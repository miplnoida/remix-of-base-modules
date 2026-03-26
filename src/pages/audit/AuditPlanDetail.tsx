import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Briefcase, CheckCircle, Clock, AlertTriangle, User, Lock, ShieldCheck } from 'lucide-react';
import { useIAAnnualPlans, useIAAnnualPlanMutations, useIADepartments, useIAAuditors, useIADepartmentFunctions } from '@/hooks/useAuditData';
import { useIAPlanChangeLog, useIAPlanChangeLogMutations, useIAPlanEngagements } from '@/hooks/useAuditPlanChangeLog';
import { useIAPlanFunctions } from '@/hooks/useAuditPlanFunctions';
import { EngagementBuilder } from '@/components/audit/EngagementBuilder';
import { PlanVersionHistory } from '@/components/audit/PlanVersionHistory';
import { AutoPlanSuggestions } from '@/components/audit/AutoPlanSuggestions';
import { CapacityCalendarPanel } from '@/components/audit/CapacityCalendarPanel';
import { useAuth } from '@/contexts/AuthContext';
import { useUserCode } from '@/hooks/useUserCode';
import { PageShell, DataTable, StatusBadge } from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { MetricCard } from '@/components/shared/MetricCard';
import { formatDateForDisplay } from '@/lib/format-config';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { notifyPlanClosed } from '@/services/auditNotificationService';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%] truncate">{value ?? '—'}</span>
    </div>
  );
}

export default function AuditPlanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { userCode } = useUserCode();
  const { toast } = useToast();

  const { data: plans = [], isLoading: plansLoading } = useIAAnnualPlans();
  const { data: engagements = [], isLoading: engLoading } = useIAPlanEngagements(id);
  const { data: changeLog = [] } = useIAPlanChangeLog(id);
  const { data: departments = [] } = useIADepartments();
  const { data: auditors = [] } = useIAAuditors();
  const { data: planFunctions = [] } = useIAPlanFunctions(id);
  const { data: allFunctions = [] } = useIADepartmentFunctions('all');
  const { update: updatePlan } = useIAAnnualPlanMutations();

  const [isClosing, setIsClosing] = useState(false);

  const plan = useMemo(() => (plans || []).find((p: any) => p.id === id), [plans, id]);

  const getDeptName = (deptId: string) => (departments || []).find((d: any) => d.id === deptId)?.name || '—';
  const getFunctionName = (fid: string) => (allFunctions || []).find((f: any) => f.id === fid)?.function_name || '—';
  const getAuditorName = (aid: string) => (auditors || []).find((a: any) => a.id === aid)?.name || '—';

  const stats = useMemo(() => {
    const all = engagements || [];
    const closed = all.filter((e: any) => ['Closed', 'Completed'].includes(e.status));
    const ongoing = all.filter((e: any) => ['In Progress', 'Fieldwork', 'Fieldwork Complete', 'Observation', 'Reporting', 'Report Issued'].includes(e.status));
    const planned = all.filter((e: any) => ['Planned', 'Draft'].includes(e.status));
    return {
      total: all.length,
      planned: planned.length,
      ongoing: ongoing.length,
      completed: closed.length,
    };
  }, [engagements]);

  const isPlanClosed = plan?.status === 'Closed';
  const canClosePlan = stats.completed === stats.total && stats.total > 0 && !isPlanClosed;

  const auditTeam = useMemo(() => {
    const team = new Map<string, string>();
    (engagements || []).forEach((eng: any) => {
      if (eng.lead_auditor_id) team.set(eng.lead_auditor_id, 'Lead Auditor');
      if (Array.isArray(eng.supportive_auditor_ids)) {
        eng.supportive_auditor_ids.forEach((aid: string) => team.set(aid, 'Team Member'));
      }
    });
    return [...team.entries()].map(([memberId, role]) => ({ id: memberId, name: getAuditorName(memberId), role }));
  }, [engagements, auditors]);

  const engColumns: DataTableColumn<any>[] = [
    { key: 'engagement_code', header: 'Code' },
    { key: 'engagement_name', header: 'Audit Title' },
    { key: 'engagement_type', header: 'Type', render: (r) => <StatusBadge status={r.engagement_type || 'Planned Audit'} /> },
    { key: 'department_id', header: 'Department', render: (r) => r.department_id ? getDeptName(r.department_id) : '—' },
    { key: 'engagement_risk_rating', header: 'Risk', render: (r) => <StatusBadge status={r.engagement_risk_rating || 'Medium'} /> },
    { key: 'planned_start_date', header: 'Start Date', render: (r) => r.planned_start_date ? formatDateForDisplay(r.planned_start_date) : '—' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status || 'Planned'} /> },
  ];

  const functionColumns: DataTableColumn<any>[] = [
    { key: 'function_id', header: 'Function', render: (r) => getFunctionName(r.function_id) },
    { key: 'risk_score', header: 'Risk Score', render: (r) => r.risk_score ?? '—' },
    { key: 'risk_level', header: 'Risk Level', render: (r) => <StatusBadge status={r.risk_level || 'Low'} /> },
    { key: 'priority', header: 'Priority', render: (r) => <StatusBadge status={r.priority || 'Normal'} /> },
  ];

  const logColumns: DataTableColumn<any>[] = [
    { key: 'change_type', header: 'Change Type', render: (r) => <StatusBadge status={r.change_type} /> },
    { key: 'description', header: 'Description' },
    { key: 'changed_by', header: 'Changed By' },
    { key: 'change_date', header: 'Date', render: (r) => r.change_date ? formatDateForDisplay(r.change_date) : '—' },
  ];

  const handleClosePlan = async () => {
    if (!id || !canClosePlan) return;
    setIsClosing(true);
    try {
      const closedDate = new Date().toISOString().slice(0, 10);
      updatePlan.mutate({
        id,
        status: 'Closed',
        closed_by: userCode || 'system',
        closed_date: closedDate,
      } as any);

      // Send notification
      if (plan?.department_id) {
        notifyPlanClosed(plan.title || 'Audit Plan', plan.department_id).catch(console.error);
      }

      toast({ title: 'Plan Closed', description: 'The audit plan has been closed successfully.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsClosing(false);
    }
  };

  if (plansLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Audit plan not found.</p>
        <Button variant="outline" onClick={() => navigate('/audit/audit-plans')}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back to Plans
        </Button>
      </div>
    );
  }

  const progressPercent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <PageShell
      title={plan.title || 'Plan Detail'}
      subtitle={`Fiscal Year: ${plan.fiscal_year || '—'} • Status: ${plan.status || 'Draft'}`}
      breadcrumbs={[{ label: 'Internal Audit' }, { label: 'Audit Plans', href: '/audit/audit-plans' }, { label: plan.title || 'Detail' }]}
      isLoading={engLoading}
      actions={
        <Button variant="outline" onClick={() => navigate('/audit/audit-plans')}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back
        </Button>
      }
    >
      {/* Plan Information */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Plan Information</CardTitle></CardHeader>
          <CardContent>
            <DetailRow label="Plan Title" value={plan.title} />
            <DetailRow label="Fiscal Year" value={plan.fiscal_year} />
            <DetailRow label="Department" value={plan.department_id ? getDeptName(plan.department_id) : 'All Departments'} />
            <DetailRow label="Risk Level" value={plan.risk_level ? <StatusBadge status={plan.risk_level} /> : '—'} />
            <DetailRow label="Status" value={<StatusBadge status={plan.status || 'Draft'} />} />
            <DetailRow label="Approved By" value={plan.approved_by || '—'} />
            <DetailRow label="Created" value={plan.created_at ? formatDateForDisplay(plan.created_at) : '—'} />
            {isPlanClosed && (
              <>
                <DetailRow label="Closed By" value={plan.closed_by || '—'} />
                <DetailRow label="Closed Date" value={plan.closed_date ? formatDateForDisplay(plan.closed_date) : '—'} />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Scope & Timeline</CardTitle></CardHeader>
          <CardContent>
            <DetailRow label="Planned Start" value={plan.planned_start_date ? formatDateForDisplay(plan.planned_start_date) : '—'} />
            <DetailRow label="Planned End" value={plan.planned_end_date ? formatDateForDisplay(plan.planned_end_date) : '—'} />
            {plan.objective && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground">Objective</p>
                <p className="text-sm mt-1 whitespace-pre-wrap">{plan.objective}</p>
              </div>
            )}
            {plan.audit_scope && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground">Scope</p>
                <p className="text-sm mt-1 whitespace-pre-wrap">{plan.audit_scope}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Engagements" value={stats.total} icon={Briefcase} variant="info" />
        <MetricCard title="Pending" value={stats.planned} icon={Clock} variant="warning" />
        <MetricCard title="Ongoing" value={stats.ongoing} icon={AlertTriangle} variant="default" />
        <MetricCard title="Completed" value={stats.completed} icon={CheckCircle} variant="success" />
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="engagements" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="auto-plan">Auto Plan</TabsTrigger>
          <TabsTrigger value="capacity">Capacity</TabsTrigger>
          <TabsTrigger value="engagements">Engagements ({(engagements || []).length})</TabsTrigger>
          <TabsTrigger value="functions">Functions ({(planFunctions || []).length})</TabsTrigger>
          <TabsTrigger value="team">Audit Team ({auditTeam.length})</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
          <TabsTrigger value="changelog">Change Log ({(changeLog || []).length})</TabsTrigger>
          <TabsTrigger value="closure">Closure</TabsTrigger>
        </TabsList>

        <TabsContent value="auto-plan">
          <AutoPlanSuggestions planId={id!} planStatus={plan?.status || 'Draft'} />
        </TabsContent>

        <TabsContent value="capacity">
          <CapacityCalendarPanel planId={id!} />
        </TabsContent>

        <TabsContent value="functions">
          <Card>
            <CardContent className="pt-6">
              <DataTable
                columns={functionColumns}
                data={planFunctions || []}
                emptyMessage="No functions linked to this plan yet."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card>
            <CardContent className="pt-6">
              {auditTeam.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No team members assigned via engagements yet.</p>
              ) : (
                <div className="space-y-2">
                  {auditTeam.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.role}</p>
                        </div>
                      </div>
                      <StatusBadge status={member.role} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagements">
          <EngagementBuilder planId={id!} planStatus={plan?.status || 'Draft'} />
        </TabsContent>

        <TabsContent value="versions">
          <PlanVersionHistory planId={id!} />
        </TabsContent>

        <TabsContent value="changelog">
          <Card>
            <CardContent className="pt-6">
              <DataTable
                columns={logColumns}
                data={changeLog || []}
                emptyMessage="No changes recorded yet."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Closure Tab */}
        <TabsContent value="closure">
          <div className="space-y-4">
            {/* Closed Banner */}
            {isPlanClosed && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="flex items-center gap-3 pt-6">
                  <Lock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">This plan has been closed</p>
                    <p className="text-xs text-muted-foreground">
                      Closed by {plan.closed_by || '—'} on {plan.closed_date ? formatDateForDisplay(plan.closed_date) : '—'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Progress Summary */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Engagement Progress Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Overall Completion</span>
                  <span className="font-semibold">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-3" />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-semibold text-foreground">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total Audits</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center border-green-200 bg-green-50/50">
                    <p className="text-2xl font-semibold text-green-700">{stats.completed}</p>
                    <p className="text-xs text-muted-foreground">Completed / Closed</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center border-blue-200 bg-blue-50/50">
                    <p className="text-2xl font-semibold text-blue-700">{stats.ongoing}</p>
                    <p className="text-xs text-muted-foreground">In Progress</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center border-amber-200 bg-amber-50/50">
                    <p className="text-2xl font-semibold text-amber-700">{stats.planned}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Engagement Status Breakdown */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Engagement Status Breakdown</CardTitle></CardHeader>
              <CardContent>
                {(engagements || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No engagements to display.</p>
                ) : (
                  <div className="space-y-2">
                    {(engagements || []).map((eng: any) => {
                      const isClosed = ['Closed', 'Completed'].includes(eng.status);
                      return (
                        <div key={eng.id} className={`flex items-center justify-between p-3 rounded-lg border ${isClosed ? 'border-green-200 bg-green-50/30' : 'border-amber-200 bg-amber-50/30'}`}>
                          <div className="flex items-center gap-3">
                            {isClosed ? (
                              <ShieldCheck className="h-4 w-4 text-green-600" />
                            ) : (
                              <Clock className="h-4 w-4 text-amber-600" />
                            )}
                            <div>
                              <p className="text-sm font-medium">{eng.engagement_name || eng.engagement_code || '—'}</p>
                              <p className="text-xs text-muted-foreground">{eng.department_id ? getDeptName(eng.department_id) : '—'}</p>
                            </div>
                          </div>
                          <StatusBadge status={eng.status || 'Planned'} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Close Plan Action */}
            {!isPlanClosed && (
              <Card>
                <CardContent className="pt-6">
                  {canClosePlan ? (
                    <div className="flex flex-col items-center gap-3 py-4">
                      <ShieldCheck className="h-8 w-8 text-green-600" />
                      <p className="text-sm text-center text-muted-foreground">All engagements are closed. You can now close this audit plan.</p>
                      <Button onClick={handleClosePlan} disabled={isClosing || updatePlan.isPending} className="mt-2">
                        {(isClosing || updatePlan.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Close Audit Plan
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-4">
                      <AlertTriangle className="h-8 w-8 text-amber-500" />
                      <p className="text-sm text-center font-medium text-foreground">
                        Audit Plan cannot be closed because some audits are still in progress.
                      </p>
                      <p className="text-xs text-center text-muted-foreground">
                        Complete all {stats.total - stats.completed} remaining engagement{stats.total - stats.completed !== 1 ? 's' : ''} before closing the plan.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
