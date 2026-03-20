import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, ArrowLeft, Briefcase, CheckCircle, Clock, AlertTriangle, Building2, Shield, Calendar, User } from 'lucide-react';
import { useIAAnnualPlans, useIADepartments, useIAAuditors, useIADepartmentFunctions } from '@/hooks/useAuditData';
import { useIAEngagements } from '@/hooks/useAuditDataPhase2';
import { useIAPlanChangeLog, useIAPlanChangeLogMutations, useIAPlanEngagements } from '@/hooks/useAuditPlanChangeLog';
import { useIAPlanFunctions } from '@/hooks/useAuditPlanFunctions';
import { useAuth } from '@/contexts/AuthContext';
import { useUserCode } from '@/hooks/useUserCode';
import { PageShell, DataTable, StatusBadge } from '@/components/common';
import { StandardModal } from '@/components/common/StandardModal';
import type { DataTableColumn } from '@/components/common';
import { MetricCard } from '@/components/shared/MetricCard';
import { AddEngagementToPlanForm } from '@/components/audit/AddEngagementToPlanForm';
import { formatDateForDisplay } from '@/lib/format-config';

function DetailRow({ label, value }: { label: string; value: any }) {
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
  const userCodeData = useUserCode();

  const { data: plans = [], isLoading: plansLoading } = useIAAnnualPlans();
  const { data: engagements = [], isLoading: engLoading } = useIAPlanEngagements(id);
  const { data: changeLog = [], isLoading: logLoading } = useIAPlanChangeLog(id);
  const { data: departments = [] } = useIADepartments();
  const { data: auditors = [] } = useIAAuditors();
  const { data: planFunctions = [] } = useIAPlanFunctions(id);
  const { data: allFunctions = [] } = useIADepartmentFunctions('all');
  const { create: createEngagement } = useIAEngagements();
  const { create: createChangeLog } = useIAPlanChangeLogMutations();

  const [showAddEngagement, setShowAddEngagement] = useState(false);

  const plan = useMemo(() => plans.find((p: any) => p.id === id), [plans, id]);

  const canAddEngagement = plan && ['Draft', 'Approved', 'Active', 'In Progress'].includes(plan.status || '') &&
    (hasPermission('create_audit_plans') || hasPermission('edit_audit_plans'));

  const getDeptName = (deptId: string) => departments?.find((d: any) => d.id === deptId)?.name || '—';
  const getFunctionName = (fid: string) => (allFunctions || []).find((f: any) => f.id === fid)?.function_name || fid?.slice(0, 8) || '—';
  const getAuditorName = (aid: string) => auditors?.find((a: any) => a.id === aid)?.name || '—';

  const stats = useMemo(() => {
    const all = engagements || [];
    return {
      total: all.length,
      planned: all.filter((e: any) => e.status === 'Planned' || e.status === 'Draft').length,
      ongoing: all.filter((e: any) => ['In Progress', 'Fieldwork', 'Fieldwork Complete', 'Observation', 'Reporting'].includes(e.status)).length,
      completed: all.filter((e: any) => ['Closed', 'Closure', 'Completed'].includes(e.status)).length,
    };
  }, [engagements]);

  // Audit team from engagements
  const auditTeam = useMemo(() => {
    const team = new Map<string, string>();
    (engagements || []).forEach((eng: any) => {
      if (eng.lead_auditor_id) team.set(eng.lead_auditor_id, 'Lead Auditor');
      if (Array.isArray(eng.supportive_auditor_ids)) {
        eng.supportive_auditor_ids.forEach((aid: string) => team.set(aid, 'Team Member'));
      }
    });
    return [...team.entries()].map(([id, role]) => ({ id, name: getAuditorName(id), role }));
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
    { key: 'risk_score', header: 'Risk Score', render: (r) => r.risk_score || '—' },
    { key: 'risk_level', header: 'Risk Level', render: (r) => <StatusBadge status={r.risk_level || 'Low'} /> },
    { key: 'priority', header: 'Priority', render: (r) => <StatusBadge status={r.priority || 'Normal'} /> },
  ];

  const logColumns: DataTableColumn<any>[] = [
    { key: 'change_type', header: 'Change Type', render: (r) => <StatusBadge status={r.change_type} /> },
    { key: 'description', header: 'Description' },
    { key: 'changed_by', header: 'Changed By' },
    { key: 'change_date', header: 'Date', render: (r) => r.change_date ? formatDateForDisplay(r.change_date) : '—' },
  ];

  const handleAddEngagement = async (payload: any) => {
    try {
      await createEngagement.mutateAsync(payload);
      await createChangeLog.mutateAsync({
        plan_id: id!,
        change_type: 'Engagement Added',
        description: `${payload.engagement_name} added (${payload.engagement_type})`,
        changed_by: userCodeData.userCode || 'system',
      });
      setShowAddEngagement(false);
    } catch (err) {
      // error handled by mutation
    }
  };

  return (
    <PageShell
      title={plan?.title || 'Plan Detail'}
      subtitle={plan ? `Fiscal Year: ${plan.fiscal_year} • Status: ${plan.status || 'Draft'}` : ''}
      breadcrumbs={[{ label: 'Internal Audit' }, { label: 'Audit Plans', href: '/audit/audit-plans' }, { label: plan?.title || 'Detail' }]}
      isLoading={plansLoading || engLoading}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/audit/audit-plans')}>
            <ArrowLeft className="h-4 w-4 mr-2" />Back
          </Button>
          {canAddEngagement && (
            <Button onClick={() => setShowAddEngagement(true)}>
              <Plus className="h-4 w-4 mr-2" />Add Engagement
            </Button>
          )}
        </div>
      }
    >
      {/* Section 1: Plan Information */}
      {plan && (
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
              {plan.scope && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground">Scope</p>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{plan.scope}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Engagements" value={stats.total} icon={Briefcase} variant="info" />
        <MetricCard title="Pending" value={stats.planned} icon={Clock} variant="warning" />
        <MetricCard title="Ongoing" value={stats.ongoing} icon={AlertTriangle} variant="default" />
        <MetricCard title="Completed" value={stats.completed} icon={CheckCircle} variant="success" />
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="functions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="functions">Functions ({(planFunctions || []).length})</TabsTrigger>
          <TabsTrigger value="team">Audit Team ({auditTeam.length})</TabsTrigger>
          <TabsTrigger value="engagements">Engagements ({(engagements || []).length})</TabsTrigger>
          <TabsTrigger value="changelog">Change Log ({(changeLog || []).length})</TabsTrigger>
        </TabsList>

        {/* Section 2: Functions Included */}
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

        {/* Section 3: Audit Team */}
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

        {/* Section 4: Engagements */}
        <TabsContent value="engagements">
          <Card>
            <CardContent className="pt-6">
              <DataTable
                columns={engColumns}
                data={engagements || []}
                emptyMessage="No engagements linked to this plan yet."
                renderActions={(row) => (
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/audit/audits/${row.id}`)}>View</Button>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Change Log */}
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
      </Tabs>

      {/* Add Engagement Modal */}
      <StandardModal
        open={showAddEngagement}
        onOpenChange={setShowAddEngagement}
        title="Add Engagement to Plan"
        mode="create"
        size="4xl"
      >
        <AddEngagementToPlanForm
          planId={id!}
          onSave={handleAddEngagement}
          isSaving={createEngagement.isPending}
        />
      </StandardModal>
    </PageShell>
  );
}
