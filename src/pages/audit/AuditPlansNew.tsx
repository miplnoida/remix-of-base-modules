import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Eye, Edit, ClipboardList, Link2, ShieldAlert } from 'lucide-react';
import { AnnualPlanForm } from '@/components/audit/AnnualPlanForm';
import { PageShell, StandardSearchFilterBar, DataTable, StatusBadge } from '@/components/common';
import { StandardModal } from '@/components/common/StandardModal';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { formatDateForDisplay } from '@/lib/format-config';
import { useIAAnnualPlans, useIAAnnualPlanMutations, useIADepartments, useIADepartmentFunctions } from '@/hooks/useAuditData';
import { useIARiskAssessments } from '@/hooks/useAuditDataPhase2';

export default function AuditPlansNew() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ status: 'all', risk: 'all', department: 'all' });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<any>(null);

  const { data: plans = [], isLoading } = useIAAnnualPlans();
  const { data: departments = [] } = useIADepartments();
  const { data: functions = [] } = useIADepartmentFunctions('all');
  const { data: assessments = [] } = useIARiskAssessments();
  const { create, update } = useIAAnnualPlanMutations();

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
    active: enrichedPlans.filter((plan: any) => ['Approved', 'Active'].includes(plan.status || '')).length,
  };

  const fiscalYears = [...new Set(enrichedPlans.map((plan: any) => plan.fiscal_year).filter(Boolean))];
  const departmentOptions = [...new Set(enrichedPlans.map((plan: any) => plan.department_name).filter((value: string) => value && value !== 'Not linked'))];

  const columns: DataTableColumn<any>[] = [
    { key: 'title', header: 'Audit Plan', render: (row) => <span className="font-medium">{row.title}</span> },
    { key: 'fiscal_year', header: 'Plan Year' },
    { key: 'department_name', header: 'Department' },
    { key: 'function_name', header: 'Function' },
    { key: 'derived_risk_level', header: 'Risk Level', render: (row) => <StatusBadge status={row.derived_risk_level} /> },
    { key: 'assigned_auditor', header: 'Assigned Auditor', render: (row) => row.assigned_auditor || '—' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status || 'Draft'} /> },
    { key: 'updated_at', header: 'Last Updated', render: (row) => row.updated_at ? formatDateForDisplay(row.updated_at) : '—' },
  ];

  const filterFields: StandardFilterField[] = [
    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'all', label: 'All Statuses' }, { value: 'Draft', label: 'Draft' }, { value: 'Approved', label: 'Approved' }, { value: 'Active', label: 'Active' }, { value: 'Completed', label: 'Completed' }] },
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
                {!['Completed', 'Closed'].includes(row.status || '') && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditPlan(row)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>

      <StandardModal open={isCreateOpen} onOpenChange={setIsCreateOpen} title="Create Audit Plan" mode="create" size="4xl">
        <AnnualPlanForm
          onClose={() => setIsCreateOpen(false)}
          onCreate={(data) => create.mutateAsync(data)}
          onUpdate={(data) => update.mutateAsync(data)}
        />
      </StandardModal>

      <StandardModal open={!!editPlan} onOpenChange={(open) => !open && setEditPlan(null)} title="Edit Audit Plan" mode="edit" size="4xl">
        {editPlan && (
          <AnnualPlanForm
            initialData={editPlan}
            onClose={() => setEditPlan(null)}
            onCreate={(data) => create.mutateAsync(data)}
            onUpdate={(data) => update.mutateAsync(data)}
          />
        )}
      </StandardModal>
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
