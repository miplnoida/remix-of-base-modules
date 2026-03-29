import React, { useState, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Briefcase, CheckCircle, Clock, AlertTriangle, ShieldCheck, Edit, Send, Undo2 } from 'lucide-react';
import { useIAAnnualPlans, useIAAnnualPlanMutations, useIADepartments, useIAAuditors, useIADepartmentFunctions } from '@/hooks/useAuditData';
import { useIAPlanChangeLog, useIAPlanChangeLogMutations, useIAPlanEngagements } from '@/hooks/useAuditPlanChangeLog';
import { EngagementBuilder } from '@/components/audit/EngagementBuilder';
import { AutoPlanSuggestions } from '@/components/audit/AutoPlanSuggestions';
import { PlanningWizard } from '@/components/audit/PlanningWizard';
import { PlanVersionHistory } from '@/components/audit/PlanVersionHistory';
import { CapacityCalendarPanel } from '@/components/audit/CapacityCalendarPanel';
import { PlanApprovalHistoryTimeline } from '@/components/audit/PlanApprovalHistoryTimeline';
import { PlanAmendmentHistory } from '@/components/audit/PlanAmendmentHistory';
import { PlanApprovalBanner } from '@/components/audit/PlanApprovalBanner';
import { PlanSubmissionReadiness } from '@/components/audit/PlanSubmissionReadiness';
import { BoardPackTab } from '@/components/audit/BoardPackTab';
import { PlanDistributionTab } from '@/components/audit/PlanDistributionTab';
import { CoverageRiskTab } from '@/components/audit/CoverageRiskTab';
import { AnnualPlanForm } from '@/components/audit/AnnualPlanForm';
import { useAuth } from '@/contexts/AuthContext';
import { useUserCode } from '@/hooks/useUserCode';
import { PageShell, DataTable, StatusBadge, ConfirmDialog } from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { MetricCard } from '@/components/shared/MetricCard';
import { formatDateForDisplay } from '@/lib/format-config';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Loader2, X } from 'lucide-react';
import { validatePlanReadiness, useAuditPlanWorkflow, isPlanEditable, isPlanLocked } from '@/hooks/useAuditPlanApproval';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = useAuth();
  const { userCode } = useUserCode();
  const { toast } = useToast();

  const { data: plans = [], isLoading: plansLoading } = useIAAnnualPlans();
  const { data: engagements = [], isLoading: engLoading } = useIAPlanEngagements(id);
  const { data: changeLog = [] } = useIAPlanChangeLog(id);
  const { data: departments = [] } = useIADepartments();
  const { data: auditors = [] } = useIAAuditors();
  const { update: updatePlan } = useIAAnnualPlanMutations();

  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [showReadiness, setShowReadiness] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  const { submitForApproval, withdrawSubmission } = useAuditPlanWorkflow();

  const plan = useMemo(() => (plans || []).find((p: any) => p.id === id), [plans, id]);

  // Auto-open submission readiness dialog when navigated with ?action=submit
  useEffect(() => {
    if (searchParams.get('action') === 'submit' && plan && !plansLoading) {
      const planStatus = plan.status || 'Draft';
      const canSubmitFromUrl = ['Draft', 'Changes Requested', 'Rejected', 'Amendment Pending'].includes(planStatus);
      if (canSubmitFromUrl) {
        setShowReadiness(true);
        searchParams.delete('action');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, plan, plansLoading]);

  const stats = useMemo(() => {
    const all = engagements || [];
    const closed = all.filter((e: any) => ['Closed', 'Completed'].includes(e.status));
    const ongoing = all.filter((e: any) => ['In Progress', 'Fieldwork', 'Fieldwork Complete', 'Observation', 'Reporting', 'Report Issued'].includes(e.status));
    const planned = all.filter((e: any) => ['Planned', 'Draft', 'Ready', 'In Preparation'].includes(e.status));
    const totalDays = all.reduce((sum: number, e: any) => sum + (Number(e.estimated_days) || 0), 0);
    const totalWeeks = all.reduce((sum: number, e: any) => sum + (Number(e.estimated_hours) || 0), 0);
    const highRisk = all.filter((e: any) => ['High', 'Critical'].includes(e.engagement_risk_rating)).length;
    return { total: all.length, planned: planned.length, ongoing: ongoing.length, completed: closed.length, totalDays, totalWeeks, highRisk };
  }, [engagements]);

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
  const planStatus = plan.status || 'Draft';
  const canEditHeader = isPlanEditable(planStatus);
  const locked = isPlanLocked(planStatus);
  const canSubmit = ['Draft', 'Changes Requested', 'Rejected', 'Amendment Pending'].includes(planStatus);
  const canWithdraw = planStatus === 'Submitted';
  const readinessChecks = validatePlanReadiness(plan, engagements || []);

  return (
    <PageShell
      title={plan.title || 'Plan Workspace'}
      subtitle={`Fiscal Year: ${plan.fiscal_year || '—'} • Version: v${plan.current_version_number || 1} • Status: ${planStatus}`}
      breadcrumbs={[{ label: 'Internal Audit' }, { label: 'Annual Plans', href: '/audit/audit-plans' }, { label: plan.title || 'Workspace' }]}
      isLoading={engLoading}
      actions={
        <div className="flex items-center gap-2">
          {canSubmit && hasPermission('edit_audit_plans') && (
            <Button onClick={() => setShowReadiness(true)}>
              <Send className="h-4 w-4 mr-2" />Submit for Approval
            </Button>
          )}
          {canWithdraw && hasPermission('edit_audit_plans') && (
            <Button variant="outline" onClick={() => setShowWithdraw(true)}>
              <Undo2 className="h-4 w-4 mr-2" />Withdraw
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate('/audit/audit-plans')}>
            <ArrowLeft className="h-4 w-4 mr-2" />Back
          </Button>
        </div>
      }
    >
      {/* Approval Status Banner */}
      <PlanApprovalBanner plan={plan} />
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard title="Engagements" value={stats.total} icon={Briefcase} variant="info" />
        <MetricCard title="Planned" value={stats.planned} icon={Clock} variant="warning" />
        <MetricCard title="In Progress" value={stats.ongoing} icon={AlertTriangle} variant="default" />
        <MetricCard title="Completed" value={stats.completed} icon={CheckCircle} variant="success" />
        <MetricCard title="High/Critical" value={stats.highRisk} icon={ShieldCheck} variant="default" />
        <MetricCard title="Total Days" value={`${stats.totalDays}d (${stats.totalWeeks}w)`} icon={Clock} variant="info" />
      </div>

      {/* 7-Tab Workspace */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="engagements">Engagements ({stats.total})</TabsTrigger>
          <TabsTrigger value="coverage">Coverage & Risk</TabsTrigger>
          <TabsTrigger value="capacity">Capacity & Schedule</TabsTrigger>
          <TabsTrigger value="autoplan">Auto Plan</TabsTrigger>
          <TabsTrigger value="approval">Approval & Amendments</TabsTrigger>
          <TabsTrigger value="boardpack">Board Pack</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          {isEditingHeader ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Edit Plan Header & Narrative</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setIsEditingHeader(false)}><X className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent>
                <AnnualPlanForm
                  plan={plan}
                  onClose={() => setIsEditingHeader(false)}
                  onCreate={async (data) => {}}
                  onUpdate={async (data) => { await updatePlan.mutateAsync(data); }}
                />
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-sm">Plan Information</CardTitle>
                    {canEditHeader && hasPermission('edit_audit_plans') && (
                      <Button variant="ghost" size="sm" onClick={() => setIsEditingHeader(true)}>
                        <Edit className="h-3.5 w-3.5 mr-1" />Edit
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    <DetailRow label="Plan Title" value={plan.title} />
                    <DetailRow label="Fiscal Year" value={plan.fiscal_year} />
                    <DetailRow label="Status" value={<StatusBadge status={plan.status || 'Draft'} />} />
                    <DetailRow label="Board Pack" value={<StatusBadge status={plan.board_pack_status || 'None'} />} />
                    <DetailRow label="Version" value={`v${plan.current_version_number || 1}`} />
                    <DetailRow label="Created By" value={plan.created_by || plan.plan_owner || '—'} />
                    <DetailRow label="Last Updated By" value={plan.updated_by || '—'} />
                    <DetailRow label="Approved By" value={plan.approved_by || '—'} />
                    <DetailRow label="Created" value={plan.created_at ? formatDateForDisplay(plan.created_at) : '—'} />
                    <DetailRow label="Last Updated" value={plan.updated_at ? formatDateForDisplay(plan.updated_at) : '—'} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-sm">Planning Narrative</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {plan.executive_summary && (
                      <div>
                        <p className="text-xs text-muted-foreground">Executive Summary</p>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{plan.executive_summary}</p>
                      </div>
                    )}
                    {plan.objective && (
                      <div>
                        <p className="text-xs text-muted-foreground">Objective</p>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{plan.objective}</p>
                      </div>
                    )}
                    {plan.methodology && (
                      <div>
                        <p className="text-xs text-muted-foreground">Methodology</p>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{plan.methodology}</p>
                      </div>
                    )}
                    {plan.planning_assumptions && (
                      <div>
                        <p className="text-xs text-muted-foreground">Planning Assumptions</p>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{plan.planning_assumptions}</p>
                      </div>
                    )}
                    {plan.exclusions && (
                      <div>
                        <p className="text-xs text-muted-foreground">Exclusions</p>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{plan.exclusions}</p>
                      </div>
                    )}
                    {!plan.executive_summary && !plan.objective && !plan.methodology && (
                      <p className="text-sm text-muted-foreground italic">No planning narrative entered yet. Click Edit to add details.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Resource & Governance Summary */}
              <div className="grid gap-4 md:grid-cols-2 mt-4">
              <Card>
                  <CardHeader><CardTitle className="text-sm">Resource Summary (Auto-Computed)</CardTitle></CardHeader>
                  <CardContent>
                    <DetailRow label="Total Planned Days" value={stats.totalDays > 0 ? `${stats.totalDays} days` : 'No engagements yet'} />
                    <DetailRow label="Total Planned Weeks" value={stats.totalWeeks > 0 ? `${stats.totalWeeks} weeks` : '—'} />
                    <DetailRow label="Unique Resources Assigned" value={(() => {
                      const resourceSet = new Set<string>();
                      (engagements || []).forEach((e: any) => {
                        if (e.lead_auditor) resourceSet.add(e.lead_auditor);
                        if (e.support_auditors) {
                          const arr = typeof e.support_auditors === 'string' ? e.support_auditors.split(',') : (Array.isArray(e.support_auditors) ? e.support_auditors : []);
                          arr.forEach((a: string) => { if (a.trim()) resourceSet.add(a.trim()); });
                        }
                      });
                      return resourceSet.size > 0 ? `${resourceSet.size} auditor(s)` : '—';
                    })()} />
                    <DetailRow label="Available Days (Team)" value={(() => {
                      const resourceSet = new Set<string>();
                      (engagements || []).forEach((e: any) => {
                        if (e.lead_auditor) resourceSet.add(e.lead_auditor);
                      });
                      const auditorCount = Math.max(resourceSet.size, 1);
                      const workingDaysPerYear = 240;
                      return stats.total > 0 ? `~${auditorCount * workingDaysPerYear} days (${auditorCount} × ${workingDaysPerYear})` : 'Add engagements to calculate';
                    })()} />
                    <DetailRow label="Contingency (10%)" value={(() => {
                      const resourceSet = new Set<string>();
                      (engagements || []).forEach((e: any) => { if (e.lead_auditor) resourceSet.add(e.lead_auditor); });
                      const available = Math.max(resourceSet.size, 1) * 240;
                      const contingency = Math.round(available * 0.1);
                      const netAvailable = available - contingency;
                      return stats.total > 0 ? `${contingency} days reserved (${netAvailable} net available)` : '—';
                    })()} />
                    {stats.total > 0 && (() => {
                      const resourceSet = new Set<string>();
                      (engagements || []).forEach((e: any) => { if (e.lead_auditor) resourceSet.add(e.lead_auditor); });
                      const available = Math.max(resourceSet.size, 1) * 240;
                      const contingency = Math.round(available * 0.1);
                      const net = available - contingency;
                      const utilPct = net > 0 ? Math.round((stats.totalDays / net) * 100) : 0;
                      return (
                        <div className="mt-3 space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Utilization ({stats.totalDays}d of {net}d net)</span>
                            <span className={cn("font-semibold", utilPct > 95 ? "text-destructive" : utilPct > 80 ? "text-warning" : "text-primary")}>{utilPct}%</span>
                          </div>
                          <Progress value={Math.min(100, utilPct)} className="h-2" />
                        </div>
                      );
                    })()}
                    {plan.resource_constraints && (
                      <div className="mt-3 pt-2 border-t border-border/50">
                        <p className="text-xs text-muted-foreground">Constraints</p>
                        <p className="text-sm mt-1">{plan.resource_constraints}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Governance & Approval</CardTitle></CardHeader>
                  <CardContent>
                    <DetailRow label="Board / Committee" value={plan.board_committee_name || '—'} />
                    <DetailRow label="Plan Status" value={<StatusBadge status={plan.status || 'Draft'} />} />
                    <DetailRow label="Approved By" value={plan.approved_by || 'Pending'} />
                    <DetailRow label="Approved Date" value={plan.approved_date ? formatDateForDisplay(plan.approved_date) : 'Pending'} />
                    <DetailRow label="Minutes Reference" value={plan.minutes_reference || 'To be recorded after approval'} />
                    {plan.approval_note && (
                      <div className="mt-3 pt-2 border-t border-border/50">
                        <p className="text-xs text-muted-foreground">Approval Note</p>
                        <p className="text-sm mt-1">{plan.approval_note}</p>
                      </div>
                    )}
                    <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <p className="text-xs text-primary">
                        <strong>Note:</strong> Approval details (approver, date, minutes reference) are automatically populated when the plan goes through the approval workflow via the "Approval & Amendments" tab.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Progress */}
              <Card className="mt-4">
                <CardHeader><CardTitle className="text-sm">Engagement Progress</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Overall Completion</span>
                    <span className="font-semibold">{progressPercent}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-3" />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Engagements Tab */}
        <TabsContent value="engagements">
          <EngagementBuilder planId={id!} planStatus={plan?.status || 'Draft'} planFiscalYear={plan?.fiscal_year} />
        </TabsContent>

        {/* Coverage & Risk Tab */}
        <TabsContent value="coverage">
          <CoverageRiskTab planId={id!} engagements={engagements || []} />
        </TabsContent>

        {/* Capacity & Schedule Tab */}
        <TabsContent value="capacity">
          <CapacityCalendarPanel planId={id!} />
        </TabsContent>

        {/* Auto Plan Tab */}
        <TabsContent value="autoplan">
          <PlanningWizard planId={id!} planStatus={plan?.status || 'Draft'} fiscalYear={plan?.fiscal_year} />
        </TabsContent>

        {/* Approval & Amendments Tab */}
        <TabsContent value="approval">
          <div className="space-y-4">
            <PlanApprovalHistoryTimeline planId={id!} />
            <Card>
              <CardHeader><CardTitle className="text-sm">Version History</CardTitle></CardHeader>
              <CardContent>
                <PlanVersionHistory planId={id!} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Change Log</CardTitle></CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'change_type', header: 'Type', render: (r: any) => <StatusBadge status={r.change_type} /> },
                    { key: 'description', header: 'Description' },
                    { key: 'changed_by', header: 'By' },
                    { key: 'change_date', header: 'Date', render: (r: any) => r.change_date ? formatDateForDisplay(r.change_date) : '—' },
                  ]}
                  data={changeLog || []}
                  emptyMessage="No changes recorded."
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Board Pack Tab */}
        <TabsContent value="boardpack">
          <BoardPackTab planId={id!} plan={plan} engagements={engagements || []} />
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution">
          <PlanDistributionTab planId={id!} plan={plan} />
        </TabsContent>
      </Tabs>

      {/* Submission Readiness Dialog */}
      <PlanSubmissionReadiness
        open={showReadiness}
        onOpenChange={setShowReadiness}
        checks={readinessChecks}
        engagementCount={(engagements || []).length}
        onSubmit={() => {
          submitForApproval.mutate({ planId: id! });
          setShowReadiness(false);
        }}
        isSubmitting={submitForApproval.isPending}
      />

      {/* Withdraw Confirmation */}
      <ConfirmDialog
        open={showWithdraw}
        onOpenChange={() => setShowWithdraw(false)}
        title="Withdraw Submission"
        description="Are you sure you want to withdraw this plan from approval? It will return to Draft status and can be edited again."
        onConfirm={() => {
          withdrawSubmission.mutate({ planId: id! });
          setShowWithdraw(false);
        }}
      />
    </PageShell>
  );
}
