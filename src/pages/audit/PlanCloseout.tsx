import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  useIAAnnualPlans,
  useIAAnnualPlanMutations,
  useIADepartmentAudits,
  useIADepartmentAuditMutations,
  useIAActivities,
  useIAFindings,
  useIAFollowUps,
} from '@/hooks/useAuditData';
import { PageShell, SearchBar, FilterBar, DataTable, StatusBadge, EntityModal, ConfirmDialog } from '@/components/common';
import type { DataTableColumn, FilterField } from '@/components/common';

interface CloseoutRow {
  id: string;
  sourceType: 'annual' | 'department';
  planType: 'Annual' | 'Department';
  fiscalYear: string;
  planName: string;
  department: string;
  period: string;
  status: string;
}

export default function PlanCloseout() {
  const { hasPermission } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ fiscalYear: 'all', planType: 'all', status: 'all' });

  const [viewItem, setViewItem] = useState<CloseoutRow | null>(null);
  const [closeItem, setCloseItem] = useState<CloseoutRow | null>(null);
  const [reopenItem, setReopenItem] = useState<CloseoutRow | null>(null);

  const { data: annualPlans = [], isLoading: annualLoading } = useIAAnnualPlans();
  const { data: departmentAudits = [], isLoading: deptLoading } = useIADepartmentAudits();
  const { data: activities = [] } = useIAActivities();
  const { data: findings = [] } = useIAFindings();
  const { data: followUps = [] } = useIAFollowUps();

  const { update: updateAnnual } = useIAAnnualPlanMutations();
  const { update: updateDepartment } = useIADepartmentAuditMutations();

  const planById = useMemo(
    () => new Map((annualPlans || []).map((plan: any) => [plan.id, plan])),
    [annualPlans]
  );

  const allRows = useMemo<CloseoutRow[]>(() => {
    const annualRows = (annualPlans || []).map((plan: any) => ({
      id: plan.id,
      sourceType: 'annual' as const,
      planType: 'Annual' as const,
      fiscalYear: plan.fiscal_year || '-',
      planName: plan.title || 'Annual Plan',
      department: '-',
      period: plan.fiscal_year || '-',
      status: plan.status || 'Draft',
    }));

    const departmentRows = (departmentAudits || []).map((audit: any) => ({
      id: audit.id,
      sourceType: 'department' as const,
      planType: 'Department' as const,
      fiscalYear: planById.get(audit.plan_id)?.fiscal_year || '-',
      planName: audit.title || audit.department_name || 'Department Audit Plan',
      department: audit.department_name || '-',
      period: audit.period || '-',
      status: audit.status || 'Draft',
    }));

    return [...annualRows, ...departmentRows];
  }, [annualPlans, departmentAudits, planById]);

  const fiscalYears = useMemo(() => {
    const values = allRows.map((row) => row.fiscalYear).filter((value) => value && value !== '-');
    return [...new Set(values)];
  }, [allRows]);

  const getProgress = (row: CloseoutRow) => {
    const relatedActivities = (activities || []).filter((activity: any) => {
      if (row.sourceType === 'annual') {
        return activity.plan_id === row.id || activity.annual_plan_id === row.id;
      }
      return activity.department_audit_id === row.id;
    });

    const completed = relatedActivities.filter((activity: any) => activity.status === 'Completed').length;
    const total = relatedActivities.length;
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  };

  const getOpenItemWarnings = (row: CloseoutRow): string[] => {
    const pendingFindings = (findings || []).filter((finding: any) => {
      if (row.sourceType === 'annual') {
        return finding.plan_id === row.id && finding.status !== 'Closed';
      }
      return finding.department_audit_id === row.id && finding.status !== 'Closed';
    }).length;

    const pendingFollowUps = (followUps || []).filter((followup: any) => {
      if (row.sourceType === 'annual') {
        return followup.plan_id === row.id && followup.status !== 'Resolved';
      }
      return followup.department_audit_id === row.id && followup.status !== 'Resolved';
    }).length;

    const warnings: string[] = [];
    if (pendingFindings > 0) warnings.push(`${pendingFindings} pending findings`);
    if (pendingFollowUps > 0) warnings.push(`${pendingFollowUps} pending actions`);
    return warnings;
  };

  const filteredRows = allRows.filter((row) => {
    const matchesSearch =
      row.planName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFiscalYear = filters.fiscalYear === 'all' || row.fiscalYear === filters.fiscalYear;
    const matchesPlanType = filters.planType === 'all' || row.planType === filters.planType;
    const matchesStatus = filters.status === 'all' || row.status === filters.status;

    return matchesSearch && matchesFiscalYear && matchesPlanType && matchesStatus;
  });

  const columns: DataTableColumn<CloseoutRow>[] = [
    { key: 'id', header: 'Plan ID', render: (row) => <span className="font-medium">{row.id.slice(0, 8)}</span> },
    { key: 'planName', header: 'Plan Name' },
    { key: 'department', header: 'Department' },
    { key: 'period', header: 'Period' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'completion', header: 'Completion %', render: (row) => `${getProgress(row)}%` },
  ];

  const filterFields: FilterField[] = [
    {
      key: 'fiscalYear',
      label: 'Fiscal Year',
      type: 'select',
      options: [{ value: 'all', label: 'All Years' }, ...fiscalYears.map((year) => ({ value: year, label: year }))],
    },
    {
      key: 'planType',
      label: 'Plan Type',
      type: 'select',
      options: [
        { value: 'all', label: 'All Types' },
        { value: 'Annual', label: 'Annual' },
        { value: 'Department', label: 'Department' },
      ],
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'all', label: 'All Statuses' },
        { value: 'In Progress', label: 'In Progress' },
        { value: 'Completed', label: 'Completed' },
      ],
    },
  ];

  const performStatusUpdate = (row: CloseoutRow, status: string) => {
    const payload = {
      id: row.id,
      status,
      closeout_date: status === 'Completed' ? new Date().toISOString() : null,
    };

    if (row.sourceType === 'annual') {
      updateAnnual.mutate(payload);
    } else {
      updateDepartment.mutate(payload);
    }
  };

  const closeWarnings = closeItem ? getOpenItemWarnings(closeItem) : [];

  return (
    <PageShell
      title="Plan Closeout"
      subtitle="Close completed audit plans"
      breadcrumbs={[{ label: 'Internal Audit' }, { label: 'Plan Closeout' }]}
      isLoading={annualLoading || deptLoading}
      noPermission={!hasPermission('approve_audit_closeouts')}
    >
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search plan id, name, or department..." />
            <FilterBar
              filters={filterFields}
              values={filters}
              onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
              onReset={() => setFilters({ fiscalYear: 'all', planType: 'all', status: 'all' })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={filteredRows}
            emptyMessage="No plans found"
            renderActions={(row) => (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewItem(row)}>
                  <Eye className="h-4 w-4" />
                </Button>

                {row.status !== 'Completed' && (
                  <Button size="sm" onClick={() => setCloseItem(row)}>
                    Close Plan
                  </Button>
                )}

                {row.status === 'Completed' && hasPermission('configure_audit_system') && (
                  <Button size="sm" variant="outline" onClick={() => setReopenItem(row)}>
                    Reopen
                  </Button>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>

      <EntityModal open={!!viewItem} onOpenChange={() => setViewItem(null)} title="Plan Summary" mode="view">
        {viewItem && (
          <div className="space-y-3">
            <p><strong>Plan ID:</strong> {viewItem.id.slice(0, 8)}</p>
            <p><strong>Plan Type:</strong> {viewItem.planType}</p>
            <p><strong>Plan Name:</strong> {viewItem.planName}</p>
            <p><strong>Department:</strong> {viewItem.department}</p>
            <p><strong>Status:</strong> <StatusBadge status={viewItem.status} /></p>
            <p><strong>Completion:</strong> {getProgress(viewItem)}%</p>
          </div>
        )}
      </EntityModal>

      <ConfirmDialog
        open={!!closeItem}
        onOpenChange={() => setCloseItem(null)}
        title="Close Plan"
        description={
          closeItem
            ? closeWarnings.length > 0
              ? `Warning: ${closeWarnings.join(', ')}. Do you still want to close this plan?`
              : 'Are you sure you want to close this plan?'
            : 'Are you sure?'
        }
        confirmLabel="Close Plan"
        onConfirm={() => {
          if (!closeItem) return;
          performStatusUpdate(closeItem, 'Completed');
          setCloseItem(null);
        }}
        isLoading={updateAnnual.isPending || updateDepartment.isPending}
      />

      <ConfirmDialog
        open={!!reopenItem}
        onOpenChange={() => setReopenItem(null)}
        title="Reopen Plan"
        description="Are you sure you want to reopen this plan?"
        confirmLabel="Reopen"
        onConfirm={() => {
          if (!reopenItem) return;
          performStatusUpdate(reopenItem, 'In Progress');
          setReopenItem(null);
        }}
        isLoading={updateAnnual.isPending || updateDepartment.isPending}
      />
    </PageShell>
  );
}
