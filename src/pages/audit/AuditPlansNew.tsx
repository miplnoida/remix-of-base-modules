import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Eye, Edit, ClipboardList, Link2, ShieldAlert, Send, AlertTriangle } from 'lucide-react';
import { AnnualPlanForm } from '@/components/audit/AnnualPlanForm';
import { PageShell, StandardSearchFilterBar, DataTable, StatusBadge, ConfirmDialog } from '@/components/common';
import { StandardModal } from '@/components/common/StandardModal';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { formatDateForDisplay } from '@/lib/format-config';
import { useIAAnnualPlans, useIAAnnualPlanMutations, useIADepartments, useIADepartmentFunctions } from '@/hooks/useAuditData';
import { useIARiskAssessments } from '@/hooks/useAuditDataPhase2';
import { useStartPlanApproval, useTeamAvailabilityCheck } from '@/hooks/useAuditWorkflowGates';
import { useAuth } from '@/contexts/AuthContext';
import { useUserCode } from '@/hooks/useUserCode';
import { useToast } from '@/hooks/use-toast';
import { ConflictAlertPanel } from '@/components/audit/ConflictAlertPanel';
import { PlanVersionHistory } from '@/components/audit/PlanVersionHistory';
import { ApprovalHistoryPanel } from '@/components/audit/ApprovalHistoryPanel';
import { notifyPlanSubmitted, notifyTeamConflict } from '@/services/iaNotificationService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AuditPlansNew() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { userCode } = useUserCode();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ status: 'all', risk: 'all', department: 'all' });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<any>(null);
  const [submitPlanId, setSubmitPlanId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [conflictResult, setConflictResult] = useState<any>(null);

  const { data: plans = [], isLoading } = useIAAnnualPlans();
  const { data: departments = [] } = useIADepartments();
  const { data: functions = [] } = useIADepartmentFunctions('all');
  const { data: assessments = [] } = useIARiskAssessments();
  const { create, update } = useIAAnnualPlanMutations();
  const startApproval = useStartPlanApproval();
  const checkAvailability = useTeamAvailabilityCheck();

  const functionMap = useMemo(() => Object.fromEntries((functions || []).map((fn: any) => [fn.id, fn])), [functions]);
  const departmentMap = useMemo(() => new Map((departments || []).map((dept: any) => [dept.id, dept])), [departments]);

  const latestRiskByFunction = useMemo(() => {
    const map = new Map<string, any>();
    (assessments || []).forEach((item: any) => {
      if (!item.function_id || map.has(item.function_id)) return;
      map.set(item.function_id, item);
    });
    return map;
  }, [assessments]);

  const enrichedPlans = useMemo(() => {
    return (plans || []).map((plan: any) => {
      const fn = plan.function_id ? functionMap[plan.function_id] : null;
      const dept = fn?.department_id ? departmentMap.get(fn.department_id) : null;
      const risk = plan.risk_level || latestRiskByFunction.get(plan.function_id)?.risk_level || 'Unrated';
      return {
        ...plan,
        function_name: fn?.function_name || 'Not linked',
        department_name: dept?.name || 'Not linked',
        derived_risk_level: risk,
      };
    });
  }, [plans, functionMap, departmentMap, latestRiskByFunction]);

  const filteredPlans = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    return enrichedPlans.filter((plan: any) => {
      const matchesSearch = !search || [plan.title, plan.fiscal_year, plan.function_name, plan.department_name, plan.assigned_auditor]
        .filter(Boolean)
        .some((value: string) => value.toLowerCase().includes(search));
      const matchesStatus = filters.status === 'all' || (plan.status || 'Draft') === filters.status;
      const matchesRisk = filters.risk === 'all' || plan.derived_risk_level === filters.risk;
      const matchesDepartment = filters.department === 'all' || plan.department_name === filters.department;
      return matchesSearch && matchesStatus && matchesRisk && matchesDepartment;
    });
  }, [enrichedPlans, searchTerm, filters]);

  const metrics = {
    total: enrichedPlans.length,
    linked: enrichedPlans.filter((plan: any) => !!plan.function_id).length,
    highRisk: enrichedPlans.filter((plan: any) => ['High', 'Critical'].includes(plan.derived_risk_level)).length,
    active: enrichedPlans.filter((plan: any) => ['Approved', 'Active', 'In Progress'].includes(plan.status || '')).length,
  };

  const departmentOptions = [...new Set(enrichedPlans.map((plan: any) => plan.department_name).filter((value: string) => value && value !== 'Not linked'))];

  const handleSubmitForApproval = async (planId: string) => {
    const plan = enrichedPlans.find((p: any) => p.id === planId);
    try {
      const conflicts = await checkAvailability.mutateAsync({ planId });
      setConflictResult(conflicts);

      if (conflicts.has_blocking) {
        toast({
          title: 'Blocking Conflicts Detected',
          description: `${conflicts.total_conflicts} conflict(s) found. Resolve blocking conflicts before submitting.`,
          variant: 'destructive',
        });
        // Fire conflict notification
        notifyTeamConflict(planId, {
          plan_title: plan?.title || 'Audit Plan',
          conflict_type: 'multiple',
          auditor_name: 'Team',
          conflict_dates: 'See details',
          severity: 'blocking',
        });
        return;
      }

      // Proceed with workflow submission
      await startApproval.mutateAsync({
        planId,
        submittedBy: userCode || 'SYSTEM',
        isRevision: false,
      });

      // Fire submitted notification
      notifyPlanSubmitted(planId, {
        plan_title: plan?.title || 'Audit Plan',
        fiscal_year: plan?.fiscal_year || '',
        submitted_by: userCode || 'SYSTEM',
        plan_id: planId,
        department_name: plan?.department_name || '',
        risk_level: plan?.derived_risk_level || '',
      });
    } catch (err: any) {
      toast({ title: 'Submission Failed', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitPlanId(null);
    }
  };

  const canSubmitPlan = (plan: any) => {
    return ['Draft', 'Rejected'].includes(plan.status || 'Draft') && hasPermission('create_audit_plans');
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'title', header: 'Audit Plan', render: (row) => <span className="font-medium">{row.title}</span> },
    { key: 'fiscal_year', header: 'Plan Year' },
    { key: 'department_name', header: 'Department' },
    { key: 'function_name', header: 'Function' },
    { key: 'derived_risk_level', header: 'Risk Level', render: (row) => <StatusBadge status={row.derived_risk_level} /> },
    { key: 'assigned_auditor', header: 'Assigned Auditor', render: (row) => row.assigned_auditor || '—' },
    {
      key: 'status', header: 'Status', render: (row) => {
        const status = row.status || 'Draft';
        return (
          <div className="flex items-center gap-1.5">
            <StatusBadge status={status} />
            {row.current_version_number > 1 && (
              <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded">v{row.current_version_number}</span>
            )}
          </div>
        );
      }
    },
    { key: 'updated_at', header: 'Last Updated', render: (row) => row.updated_at ? formatDateForDisplay(row.updated_at) : '—' },
  ];

  const filterFields: StandardFilterField[] = [
    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'all', label: 'All Statuses' }, { value: 'Draft', label: 'Draft' }, { value: 'Submitted', label: 'Submitted' }, { value: 'Approved', label: 'Approved' }, { value: 'In Progress', label: 'In Progress' }, { value: 'Revision Pending', label: 'Revision Pending' }, { value: 'Rejected', label: 'Rejected' }, { value: 'Completed', label: 'Completed' }] },
    { key: 'risk', label: 'Risk Level', type: 'select', options: [{ value: 'all', label: 'All Risk Levels' }, { value: 'Critical', label: 'Critical' }, { value: 'High', label: 'High' }, { value: 'Medium', label: 'Medium' }, { value: 'Low', label: 'Low' }, { value: 'Unrated', label: 'Unrated' }] },
    { key: 'department', label: 'Department', type: 'select', options: [{ value: 'all', label: 'All Departments' }, ...departmentOptions.map((name) => ({ value: name, label: name }))] },
  ];

  return (
    <PageShell
      title="Audit Plan"
      subtitle="Risk-driven annual plans linked directly to department functions"
      breadcrumbs={[{ label: 'Internal Audit' }, { label: 'Audit Plan' }]}
      isLoading={isLoading}
      actions={<Button onClick={() => setIsCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Create Plan</Button>}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={ClipboardList} label="Total Plans" value={metrics.total} />
        <SummaryCard icon={Link2} label="Function Linked" value={metrics.linked} />
        <SummaryCard icon={ShieldAlert} label="High / Critical" value={metrics.highRisk} />
        <SummaryCard icon={ClipboardList} label="Approved / Active" value={metrics.active} />
      </div>

      {/* Conflict Alert Panel */}
      {conflictResult && conflictResult.total_conflicts > 0 && (
        <ConflictAlertPanel conflicts={conflictResult.conflicts} onDismiss={() => setConflictResult(null)} />
      )}

      <Card>
        <CardContent className="p-4">
          <StandardSearchFilterBar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search plan year, function, department, or auditor..."
            filters={filterFields}
            filterValues={filters}
            onFilterChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
            onReset={() => setFilters({ status: 'all', risk: 'all', department: 'all' })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={filteredPlans}
            emptyMessage="No audit plans found."
            renderActions={(row) => (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/audit/audit-plans/${row.id}`)}>
                  <Eye className="h-4 w-4" />
                </Button>
                {!['Completed', 'Closed', 'Submitted', 'Revision Pending'].includes(row.status || '') && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditPlan(row)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {canSubmitPlan(row) && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => setSubmitPlanId(row.id)} title="Submit for Approval">
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Version & Approval History for selected plan */}
      {selectedPlanId && (
        <Tabs defaultValue="versions" className="w-full">
          <TabsList>
            <TabsTrigger value="versions">Version History</TabsTrigger>
            <TabsTrigger value="approvals">Approval History</TabsTrigger>
          </TabsList>
          <TabsContent value="versions">
            <PlanVersionHistory planId={selectedPlanId} />
          </TabsContent>
          <TabsContent value="approvals">
            <ApprovalHistoryPanel entityId={selectedPlanId} entityType="plan" />
          </TabsContent>
        </Tabs>
      )}

        <AnnualPlanForm
          onClose={() => setIsCreateOpen(false)}
          onCreate={(data) => create.mutateAsync(data)}
          onUpdate={(data) => update.mutateAsync(data)}
        />
      </StandardModal>

      <StandardModal open={!!editPlan} onOpenChange={(open) => !open && setEditPlan(null)} title="Edit Audit Plan" mode="edit" size="4xl">
        {editPlan && (
          <AnnualPlanForm
            plan={editPlan}
            onClose={() => setEditPlan(null)}
            onCreate={(data) => create.mutateAsync(data)}
            onUpdate={(data) => update.mutateAsync(data)}
          />
        )}
      </StandardModal>

      <ConfirmDialog
        open={submitPlanId !== null}
        onOpenChange={() => setSubmitPlanId(null)}
        title="Submit Plan for Approval"
        description="This will run a team availability check (holidays, leave, engagement overlaps) and then submit the plan through the approval workflow. The plan creator cannot approve it (maker-checker enforced)."
        onConfirm={() => submitPlanId && handleSubmitForApproval(submitPlanId)}
      />
    </PageShell>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="rounded-lg bg-primary/10 p-3 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
