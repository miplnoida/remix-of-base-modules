import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, ArrowLeft, Briefcase, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useIAAnnualPlans, useIADepartments } from '@/hooks/useAuditData';
import { useIAEngagements } from '@/hooks/useAuditDataPhase2';
import { useIAPlanChangeLog, useIAPlanChangeLogMutations, useIAPlanEngagements } from '@/hooks/useAuditPlanChangeLog';
import { useAuth } from '@/contexts/AuthContext';
import { useUserCode } from '@/hooks/useUserCode';
import { PageShell, DataTable, StatusBadge } from '@/components/common';
import { StandardModal } from '@/components/common/StandardModal';
import type { DataTableColumn } from '@/components/common';
import { MetricCard } from '@/components/shared/MetricCard';
import { AddEngagementToPlanForm } from '@/components/audit/AddEngagementToPlanForm';
import { formatDateForDisplay } from '@/lib/format-config';

export default function AuditPlanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const userCode = useUserCode();

  const { data: plans = [], isLoading: plansLoading } = useIAAnnualPlans();
  const { data: engagements = [], isLoading: engLoading } = useIAPlanEngagements(id);
  const { data: changeLog = [], isLoading: logLoading } = useIAPlanChangeLog(id);
  const { data: departments = [] } = useIADepartments();
  const { create: createEngagement } = useIAEngagements();
  const { create: createChangeLog } = useIAPlanChangeLogMutations();

  const [showAddEngagement, setShowAddEngagement] = useState(false);

  const plan = useMemo(() => plans.find((p: any) => p.id === id), [plans, id]);

  const canAddEngagement = plan && ['Draft', 'Approved', 'Active', 'In Progress'].includes(plan.status || '') &&
    (hasPermission('create_audit_plans') || hasPermission('edit_audit_plans'));

  const getDeptName = (deptId: string) => departments?.find((d: any) => d.id === deptId)?.name || '-';

  const stats = useMemo(() => {
    const all = engagements || [];
    return {
      total: all.length,
      planned: all.filter((e: any) => e.status === 'Planned' || e.status === 'Draft').length,
      ongoing: all.filter((e: any) => ['In Progress', 'Fieldwork', 'Fieldwork Complete', 'Observation', 'Reporting'].includes(e.status)).length,
      completed: all.filter((e: any) => ['Closed', 'Closure', 'Completed'].includes(e.status)).length,
    };
  }, [engagements]);

  const engColumns: DataTableColumn<any>[] = [
    { key: 'engagement_code', header: 'Code' },
    { key: 'engagement_name', header: 'Engagement Title' },
    { key: 'engagement_type', header: 'Type', render: (r) => <StatusBadge status={r.engagement_type || 'Planned Audit'} /> },
    { key: 'department_id', header: 'Department', render: (r) => r.department_id ? getDeptName(r.department_id) : '-' },
    { key: 'engagement_risk_rating', header: 'Risk', render: (r) => <StatusBadge status={r.engagement_risk_rating || 'Medium'} /> },
    { key: 'planned_start_date', header: 'Start Date', render: (r) => r.planned_start_date ? formatDateForDisplay(r.planned_start_date) : '-' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status || 'Planned'} /> },
  ];

  const logColumns: DataTableColumn<any>[] = [
    { key: 'change_type', header: 'Change Type', render: (r) => <StatusBadge status={r.change_type} /> },
    { key: 'description', header: 'Description' },
    { key: 'changed_by', header: 'Changed By' },
    { key: 'change_date', header: 'Date', render: (r) => r.change_date ? formatDateForDisplay(r.change_date) : '-' },
  ];

  const handleAddEngagement = async (payload: any) => {
    try {
      await createEngagement.mutateAsync(payload);
      await createChangeLog.mutateAsync({
        plan_id: id!,
        change_type: 'Engagement Added',
        description: `${payload.engagement_name} added (${payload.engagement_type})`,
        changed_by: userCode || 'system',
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
      {/* Plan Summary */}
      {plan && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-muted-foreground">Plan Title</span><p className="font-medium">{plan.title}</p></div>
              <div><span className="text-muted-foreground">Fiscal Year</span><p className="font-medium">{plan.fiscal_year}</p></div>
              <div><span className="text-muted-foreground">Status</span><p><StatusBadge status={plan.status || 'Draft'} /></p></div>
              <div><span className="text-muted-foreground">Created</span><p className="font-medium">{plan.created_at ? formatDateForDisplay(plan.created_at) : '-'}</p></div>
            </div>
            {plan.objective && (
              <div className="mt-4 text-sm">
                <span className="text-muted-foreground">Objective</span>
                <p className="mt-1 whitespace-pre-wrap">{plan.objective}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Engagements" value={stats.total} icon={Briefcase} variant="info" />
        <MetricCard title="Pending" value={stats.planned} icon={Clock} variant="warning" />
        <MetricCard title="Ongoing" value={stats.ongoing} icon={AlertTriangle} variant="default" />
        <MetricCard title="Completed" value={stats.completed} icon={CheckCircle} variant="success" />
      </div>

      {/* Tabs: Engagements + Change Log */}
      <Tabs defaultValue="engagements" className="space-y-4">
        <TabsList>
          <TabsTrigger value="engagements">Engagements ({(engagements || []).length})</TabsTrigger>
          <TabsTrigger value="changelog">Change Log ({(changeLog || []).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="engagements">
          <Card>
            <CardContent className="pt-6">
              <DataTable
                columns={engColumns}
                data={engagements || []}
                emptyMessage="No engagements linked to this plan yet."
                renderActions={(row) => (
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/audit/engagements/${row.id}`)}>View</Button>
                )}
              />
            </CardContent>
          </Card>
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
