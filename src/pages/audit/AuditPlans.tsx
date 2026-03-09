import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Eye, Edit, Send, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIAAnnualPlans, useIAAnnualPlanMutations, useIADepartments } from '@/hooks/useAuditData';
import { useToast } from '@/hooks/use-toast';
import { AnnualPlanForm } from '@/components/audit/AnnualPlanForm';
import { PageShell, StandardSearchFilterBar, DataTable, StatusBadge, ConfirmDialog, ExportDropdown } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { AUDIT_PLANS_SCHEMA, toExportColumns } from '@/config/moduleFieldSchemas';

const exportColumns = toExportColumns(AUDIT_PLANS_SCHEMA);

export default function AuditPlans() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ status: 'all' });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [submitPlanId, setSubmitPlanId] = useState<string | null>(null);

  const { data: plans = [], isLoading } = useIAAnnualPlans();
  const { create, update } = useIAAnnualPlanMutations();

  const filteredPlans = plans.filter((plan: any) => {
    const matchesSearch = (plan.fiscal_year || '').toLowerCase().includes(searchTerm.toLowerCase()) || (plan.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filters.status === 'all' || plan.status === filters.status;
    return matchesSearch && matchesStatus;
  });

  const handleEditPlan = (plan: any) => {
    if (plan.status !== 'Draft') {
      toast({ title: "Cannot Edit", description: "Only draft plans can be edited.", variant: "destructive" });
      return;
    }
    setSelectedPlan(plan);
    setIsEditDialogOpen(true);
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'fiscal_year', header: 'Fiscal Year' },
    { key: 'title', header: 'Plan Title' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'objective', header: 'Objective', className: 'max-w-xs truncate' },
    { key: 'created_at', header: 'Created', render: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : '-' },
  ];

  return (
    <PageShell
      title="Audit Plans"
      subtitle="Create and manage audit plans"
      breadcrumbs={[{ label: 'Internal Audit', href: '/' }, { label: 'Audit Plans' }]}
      isLoading={isLoading}
      actions={
        <div className="flex items-center gap-2">
          <ExportDropdown data={filteredPlans} columns={exportColumns} fileName={AUDIT_PLANS_SCHEMA.exportFileName} title={AUDIT_PLANS_SCHEMA.exportTitle} />
          {hasPermission('create_audit_plans') && <Button onClick={() => setIsCreateDialogOpen(!isCreateDialogOpen)}><Plus className="w-4 h-4 mr-2" />Create Plan</Button>}
        </div>
      }
    >
      <StandardSearchFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by period or title..."
        filters={[{ key: 'status', label: 'Status', type: 'select', options: [{ value: 'all', label: 'All Statuses' }, { value: 'Draft', label: 'Draft' }, { value: 'Submitted', label: 'Submitted' }, { value: 'Approved', label: 'Approved' }, { value: 'In Progress', label: 'In Progress' }, { value: 'Completed', label: 'Completed' }, { value: 'Rejected', label: 'Rejected' }] }] as StandardFilterField[]}
        filterValues={filters}
        onFilterChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))}
        onReset={() => setFilters({ status: 'all' })}
      />

      <DataTable
        columns={columns}
        data={filteredPlans}
        renderActions={(row) => (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
            {hasPermission('edit_audit_plans') && row.status === 'Draft' && (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditPlan(row)}><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSubmitPlanId(row.id)}><Send className="h-4 w-4" /></Button>
              </>
            )}
          </div>
        )}
        emptyMessage="No audit plans found."
      />

      {isCreateDialogOpen && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Create New Audit Plan</CardTitle><Button variant="ghost" size="icon" onClick={() => setIsCreateDialogOpen(false)}><X className="h-4 w-4" /></Button></CardHeader>
          <CardContent><AnnualPlanForm onClose={() => setIsCreateDialogOpen(false)} /></CardContent>
        </Card>
      )}

      {isEditDialogOpen && selectedPlan && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Edit Audit Plan</CardTitle><Button variant="ghost" size="icon" onClick={() => setIsEditDialogOpen(false)}><X className="h-4 w-4" /></Button></CardHeader>
          <CardContent><AnnualPlanForm plan={selectedPlan} onClose={() => setIsEditDialogOpen(false)} /></CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={submitPlanId !== null}
        onOpenChange={() => setSubmitPlanId(null)}
        title="Submit Plan for Approval"
        description="Are you sure you want to submit this plan? It will be sent for approval."
        onConfirm={() => { if (submitPlanId) { update.mutate({ id: submitPlanId, status: 'Submitted', submitted_date: new Date().toISOString() }); setSubmitPlanId(null); } }}
      />
    </PageShell>
  );
}