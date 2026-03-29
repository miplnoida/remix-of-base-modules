import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Eye, Edit, Send, Zap, ClipboardCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useIAAnnualPlans, useIAAnnualPlanMutations } from '@/hooks/useAuditData';
import { useToast } from '@/hooks/use-toast';
import { AnnualPlanForm } from '@/components/audit/AnnualPlanForm';
import { PageShell, StandardSearchFilterBar, DataTable, StatusBadge, ConfirmDialog, ExportDropdown } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { AUDIT_PLANS_SCHEMA, toExportColumns } from '@/config/moduleFieldSchemas';

const exportColumns = toExportColumns(AUDIT_PLANS_SCHEMA);

export default function AuditPlans() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ status: 'all' });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  

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
    { key: 'total_department_audits', header: 'Engagements', render: (row) => row.total_department_audits ?? 0 },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'created_at', header: 'Created', render: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : '—' },
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
          {hasPermission('create_audit_plans') && (
            <>
              <Button variant="outline" onClick={() => {
                // Create a new draft plan and navigate to its Auto Plan tab
                const handleAutoGenerate = async () => {
                  const currentYear = new Date().getFullYear();
                  try {
                    const result = await create.mutateAsync({
                      fiscal_year: `${currentYear}-${currentYear + 1}`,
                      title: `Auto-Generated Plan ${currentYear}-${currentYear + 1}`,
                      status: 'Draft',
                      created_by: 'system',
                      plan_owner: 'system',
                      prepared_by: 'system',
                      updated_by: 'system',
                    });
                    if (result?.id) {
                      navigate(`/audit/audit-plans/${result.id}?tab=autoplan`);
                    }
                  } catch {
                    toast({ title: 'Error', description: 'Failed to create auto-plan draft.', variant: 'destructive' });
                  }
                };
                handleAutoGenerate();
              }}>
                <Zap className="w-4 h-4 mr-2" />Auto Generate Plan
              </Button>
              <Button onClick={() => setIsCreateDialogOpen(!isCreateDialogOpen)}>
                <Plus className="w-4 h-4 mr-2" />Create Plan
              </Button>
            </>
          )}
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
        renderActions={(row) => {
          const canSubmitRow = ['Draft', 'Changes Requested', 'Rejected', 'Amendment Pending'].includes(row.status);
          const canEditRow = ['Draft', 'Changes Requested', 'Rejected'].includes(row.status);
          return (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Open Plan" onClick={() => navigate(`/audit/audit-plans/${row.id}`)}><Eye className="h-4 w-4" /></Button>
              {hasPermission('edit_audit_plans') && canEditRow && (
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit Plan" onClick={() => handleEditPlan(row)}><Edit className="h-4 w-4" /></Button>
              )}
              {hasPermission('edit_audit_plans') && canSubmitRow && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" title="Submit for Approval" onClick={() => navigate(`/audit/audit-plans/${row.id}?action=submit`)}><Send className="h-4 w-4" /></Button>
              )}
              {hasPermission('approve_audit_plans') && row.status === 'Submitted' && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-warning" title="Review & Approve" onClick={() => navigate(`/audit/plan-approval?planId=${row.id}`)}><ClipboardCheck className="h-4 w-4" /></Button>
              )}
            </div>
          );
        }}
        emptyMessage="No audit plans found."
      />

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Create Annual Audit Plan</DialogTitle>
            <DialogDescription>Set up a new annual plan. You can add engagements after creation.</DialogDescription>
          </DialogHeader>
          <AnnualPlanForm
            onClose={() => setIsCreateDialogOpen(false)}
            onCreate={(data) => create.mutateAsync(data)}
            onUpdate={(data) => update.mutateAsync(data)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen && !!selectedPlan} onOpenChange={(open) => { if (!open) setIsEditDialogOpen(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Annual Audit Plan</DialogTitle>
            <DialogDescription>Update plan details for {selectedPlan?.fiscal_year}.</DialogDescription>
          </DialogHeader>
          <AnnualPlanForm
            plan={selectedPlan}
            onClose={() => setIsEditDialogOpen(false)}
            onCreate={(data) => create.mutateAsync(data)}
            onUpdate={(data) => update.mutateAsync(data)}
          />
        </DialogContent>
      </Dialog>

    </PageShell>
  );
}