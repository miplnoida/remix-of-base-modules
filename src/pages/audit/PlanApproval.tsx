import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Eye, MessageSquare } from 'lucide-react';

import { useIAAnnualPlans, useIAAnnualPlanMutations, useIADepartmentAudits, useIADepartmentAuditMutations } from '@/hooks/useAuditData';
import { PageShell, StandardSearchFilterBar, DataTable, StatusBadge, EntityModal, ConfirmDialog, ExportDropdown } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';

export default function PlanApproval() {
  

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ planType: 'all', fiscalYear: 'all' });

  const [viewItem, setViewItem] = useState<any>(null);
  const [approveItem, setApproveItem] = useState<any>(null);
  const [rejectItem, setRejectItem] = useState<any>(null);
  const [changesItem, setChangesItem] = useState<any>(null);
  const [changesComment, setChangesComment] = useState('');

  const { data: annualPlans = [], isLoading: annualLoading } = useIAAnnualPlans();
  const { data: departmentAudits = [], isLoading: deptLoading } = useIADepartmentAudits();
  const { update: updateAnnual } = useIAAnnualPlanMutations();
  const { update: updateDept } = useIADepartmentAuditMutations();

  const fiscalYears = useMemo(() => {
    const years = (annualPlans || []).map((plan: any) => plan.fiscal_year).filter(Boolean);
    return [...new Set(years)];
  }, [annualPlans]);

  const planById = useMemo(
    () => new Map((annualPlans || []).map((plan: any) => [plan.id, plan])),
    [annualPlans]
  );

  const queueItems = useMemo(() => {
    const annual = (annualPlans || [])
      .filter((plan: any) => plan.status === 'Submitted')
      .map((plan: any) => ({
        ...plan,
        _source: 'annual' as const,
        _typeLabel: 'Annual',
        _displayTitle: plan.title || 'Annual Plan',
        _fiscalYear: plan.fiscal_year || '-',
      }));

    const dept = (departmentAudits || [])
      .filter((audit: any) => audit.status === 'Submitted')
      .map((audit: any) => ({
        ...audit,
        _source: 'department' as const,
        _typeLabel: 'Department',
        _displayTitle: audit.department_name || 'Department Audit Plan',
        _fiscalYear: planById.get(audit.annual_plan_id)?.fiscal_year || '-',
      }));

    return [...annual, ...dept];
  }, [annualPlans, departmentAudits, planById]);

  const filteredQueue = queueItems.filter((item: any) => {
    const matchesSearch =
      (item._displayTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.id || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      filters.planType === 'all' ||
      (filters.planType === 'Annual' && item._source === 'annual') ||
      (filters.planType === 'Department' && item._source === 'department');

    const matchesFiscalYear = filters.fiscalYear === 'all' || item._fiscalYear === filters.fiscalYear;

    return matchesSearch && matchesType && matchesFiscalYear;
  });

  const handleDecision = (item: any, decision: 'Approved' | 'Rejected' | 'Draft', comments?: string) => {
    const payload = {
      id: item.id,
      status: decision,
      approval_comments: comments || null,
      approved_date: decision === 'Draft' ? null : new Date().toISOString(),
    };

    if (item._source === 'annual') {
      updateAnnual.mutate(payload);
    } else {
      updateDept.mutate(payload);
    }
  };

  const filterFields: StandardFilterField[] = [
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
      key: 'fiscalYear',
      label: 'Fiscal Year',
      type: 'select',
      options: [{ value: 'all', label: 'All Years' }, ...fiscalYears.map((year) => ({ value: year, label: year }))],
    },
  ];

  const columns: DataTableColumn<any>[] = [
    { key: 'id', header: 'Plan ID', render: (row) => <span className="font-medium">{(row.id || '').slice(0, 8)}</span> },
    { key: 'planType', header: 'Plan Type', render: (row) => <StatusBadge status={row._typeLabel} /> },
    { key: 'title', header: 'Plan Name', render: (row) => row._displayTitle },
    { key: 'fiscalYear', header: 'Fiscal Year', render: (row) => row._fiscalYear },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status || 'Submitted'} /> },
    { key: 'submitted_date', header: 'Submitted On', render: (row) => (row.submitted_date ? new Date(row.submitted_date).toLocaleDateString() : '-') },
  ];

  return (
    <PageShell
      title="Plan Approval"
      subtitle="Review submitted plans and execute approval workflow"
      breadcrumbs={[{ label: 'Internal Audit' }, { label: 'Plan Approval' }]}
      isLoading={annualLoading || deptLoading}
      
    >
      <StandardSearchFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by plan id or title..."
        filters={filterFields}
        filterValues={filters}
        onFilterChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        onReset={() => setFilters({ planType: 'all', fiscalYear: 'all' })}
      />

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={filteredQueue}
            emptyMessage="No submitted plans in approval queue"
            renderActions={(row) => (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewItem(row)}><Eye className="h-4 w-4" /></Button>
                <Button size="sm" onClick={() => setApproveItem(row)}><CheckCircle className="w-4 h-4 mr-1" />Approve</Button>
                <Button size="sm" variant="outline" onClick={() => { setChangesItem(row); setChangesComment(''); }}><MessageSquare className="w-4 h-4 mr-1" />Request Changes</Button>
                <Button size="sm" variant="destructive" onClick={() => setRejectItem(row)}><XCircle className="w-4 h-4 mr-1" />Reject</Button>
              </div>
            )}
          />
        </CardContent>
      </Card>

      <EntityModal open={!!viewItem} onOpenChange={() => setViewItem(null)} title="Plan Details" mode="view">
        {viewItem && (
          <div className="space-y-3">
            <p><strong>Plan ID:</strong> {(viewItem.id || '').slice(0, 8)}</p>
            <p><strong>Plan Type:</strong> {viewItem._typeLabel}</p>
            <p><strong>Plan Name:</strong> {viewItem._displayTitle}</p>
            <p><strong>Fiscal Year:</strong> {viewItem._fiscalYear}</p>
            <p><strong>Status:</strong> <StatusBadge status={viewItem.status || 'Submitted'} /></p>
            <p><strong>Objective:</strong> {viewItem.objective || '-'}</p>
          </div>
        )}
      </EntityModal>

      <EntityModal
        open={!!changesItem}
        onOpenChange={() => setChangesItem(null)}
        title="Request Changes"
        mode="edit"
        saveLabel="Submit Request"
        onSave={() => {
          if (!changesItem) return;
          handleDecision(changesItem, 'Draft', changesComment || 'Changes requested');
          setChangesItem(null);
          setChangesComment('');
        }}
        isSaving={updateAnnual.isPending || updateDept.isPending}
      >
        {changesItem && (
          <div className="space-y-3">
            <p><strong>Plan:</strong> {changesItem._displayTitle}</p>
            <div className="space-y-2">
              <Label>Change request comments</Label>
              <Textarea value={changesComment} onChange={(e) => setChangesComment(e.target.value)} placeholder="Add the requested changes..." />
            </div>
          </div>
        )}
      </EntityModal>

      <ConfirmDialog
        open={!!approveItem}
        onOpenChange={() => setApproveItem(null)}
        title="Approve Plan"
        description="Are you sure you want to approve this submitted plan?"
        confirmLabel="Approve"
        onConfirm={() => {
          if (!approveItem) return;
          handleDecision(approveItem, 'Approved');
          setApproveItem(null);
        }}
        isLoading={updateAnnual.isPending || updateDept.isPending}
      />

      <ConfirmDialog
        open={!!rejectItem}
        onOpenChange={() => setRejectItem(null)}
        title="Reject Plan"
        description="Are you sure you want to reject this submitted plan?"
        confirmLabel="Reject"
        variant="destructive"
        onConfirm={() => {
          if (!rejectItem) return;
          handleDecision(rejectItem, 'Rejected');
          setRejectItem(null);
        }}
        isLoading={updateAnnual.isPending || updateDept.isPending}
      />
    </PageShell>
  );
}
