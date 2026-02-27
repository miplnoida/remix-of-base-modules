import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Eye, Edit, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { AnnualPlanForm } from '@/components/audit/AnnualPlanForm';
import { DepartmentAuditForm } from '@/components/audit/DepartmentAuditForm';
import { Label } from '@/components/ui/label';
import { useIAAnnualPlans, useIAAnnualPlanMutations, useIADepartmentAudits, useIADepartments } from '@/hooks/useAuditData';
import { PageShell, SearchBar, FilterBar, DataTable, StatusBadge, EntityModal, ConfirmDialog } from '@/components/common';
import type { DataTableColumn, FilterField } from '@/components/common';

export default function AuditPlansNew() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ status: 'all', fiscalYear: 'all' });
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [isDeptAuditOpen, setIsDeptAuditOpen] = useState(false);
  const [selectedAnnualPlan, setSelectedAnnualPlan] = useState<any>(null);
  const [viewPlan, setViewPlan] = useState<any>(null);
  const [editPlan, setEditPlan] = useState<any>(null);
  const [viewDeptAudit, setViewDeptAudit] = useState<any>(null);
  const [editDeptAudit, setEditDeptAudit] = useState<any>(null);
  const [submitPlanId, setSubmitPlanId] = useState<string | null>(null);

  const { data: annualPlans = [], isLoading: plansLoading } = useIAAnnualPlans();
  const { data: departmentAudits = [], isLoading: auditsLoading } = useIADepartmentAudits();
  const { data: departments = [] } = useIADepartments();
  const { update } = useIAAnnualPlanMutations();

  const fiscalYears = [...new Set(annualPlans.map((p: any) => p.fiscal_year).filter(Boolean))];

  const filteredPlans = annualPlans.filter((p: any) => {
    const matchesSearch = (p.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || (p.fiscal_year || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filters.status === 'all' || p.status === filters.status;
    const matchesFY = filters.fiscalYear === 'all' || p.fiscal_year === filters.fiscalYear;
    return matchesSearch && matchesStatus && matchesFY;
  });

  const filteredDeptAudits = departmentAudits.filter((a: any) => {
    const matchesSearch = (a.department_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filters.status === 'all' || a.status === filters.status;
    return matchesSearch && matchesStatus;
  });

  const planColumns: DataTableColumn<any>[] = [
    { key: 'fiscal_year', header: 'Fiscal Year', render: (r) => <span className="font-medium">{r.fiscal_year}</span> },
    { key: 'title', header: 'Title' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'objective', header: 'Objective', className: 'max-w-xs', render: (r) => <span className="truncate block max-w-xs">{r.objective || '-'}</span> },
    { key: 'created_at', header: 'Created', render: (r) => r.created_at ? new Date(r.created_at).toLocaleDateString() : '-' },
  ];

  const deptColumns: DataTableColumn<any>[] = [
    { key: 'department_name', header: 'Department', render: (r) => <span className="font-medium">{r.department_name || 'N/A'}</span> },
    { key: 'period', header: 'Period' },
    { key: 'risk_rating', header: 'Risk', render: (r) => <StatusBadge status={r.risk_rating || 'Medium'} /> },
    { key: 'lead_auditor_name', header: 'Lead Auditor', render: (r) => r.lead_auditor_name || 'Unassigned' },
    { key: 'planned_start', header: 'Start', render: (r) => r.planned_start ? new Date(r.planned_start).toLocaleDateString() : 'TBD' },
    { key: 'planned_end', header: 'End', render: (r) => r.planned_end ? new Date(r.planned_end).toLocaleDateString() : 'TBD' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status || 'Draft'} /> },
  ];

  const filterFields: FilterField[] = [
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'all', label: 'All Statuses' }, { value: 'Draft', label: 'Draft' }, { value: 'Submitted', label: 'Submitted' },
      { value: 'Approved', label: 'Approved' }, { value: 'In Progress', label: 'In Progress' }, { value: 'Completed', label: 'Completed' },
    ]},
    { key: 'fiscalYear', label: 'Fiscal Year', type: 'select', options: [
      { value: 'all', label: 'All Years' }, ...fiscalYears.map(y => ({ value: y, label: y })),
    ]},
  ];

  return (
    <PageShell
      title="Audit Plans"
      subtitle="Create and manage annual plans & department audit plans"
      breadcrumbs={[{ label: 'Internal Audit' }, { label: 'Audit Plans' }]}
      isLoading={plansLoading || auditsLoading}
      noPermission={!hasPermission('create_audit_plans')}
      actions={
        <div className="flex gap-2">
          <Button onClick={() => setIsCreatePlanOpen(true)}><Plus className="w-4 h-4 mr-2" />Create Annual Plan</Button>
        </div>
      }
    >
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search plans..." />
            <FilterBar filters={filterFields} values={filters} onChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))} onReset={() => setFilters({ status: 'all', fiscalYear: 'all' })} />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="annual" className="space-y-4">
        <TabsList>
          <TabsTrigger value="annual">Annual Plans ({filteredPlans.length})</TabsTrigger>
          <TabsTrigger value="department">Department Audit Plans ({filteredDeptAudits.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="annual">
          <Card>
            <CardContent className="pt-6">
              <DataTable
                columns={planColumns}
                data={filteredPlans}
                emptyMessage="No annual plans found"
                renderActions={(row) => (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewPlan(row)}><Eye className="h-4 w-4" /></Button>
                    {row.status === 'Draft' && (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditPlan(row)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSubmitPlanId(row.id)}><Send className="h-4 w-4" /></Button>
                      </>
                    )}
                    {row.status === 'Approved' && (
                      <Button size="sm" variant="outline" onClick={() => { setSelectedAnnualPlan(row); setIsDeptAuditOpen(true); }}>
                        <Plus className="w-4 h-4 mr-1" />Dept Audit
                      </Button>
                    )}
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="department">
          <Card>
            <CardContent className="pt-6">
              <DataTable
                columns={deptColumns}
                data={filteredDeptAudits}
                emptyMessage="No department audit plans found"
                renderActions={(row) => (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewDeptAudit(row)}><Eye className="h-4 w-4" /></Button>
                    {row.status !== 'Completed' && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditDeptAudit(row)}><Edit className="h-4 w-4" /></Button>
                    )}
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Annual Plan */}
      <EntityModal open={!!viewPlan} onOpenChange={() => setViewPlan(null)} title="Annual Plan Details" mode="view">
        {viewPlan && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Fiscal Year</Label><p className="font-medium">{viewPlan.fiscal_year}</p></div>
              <div><Label className="text-muted-foreground">Status</Label><div className="mt-1"><StatusBadge status={viewPlan.status} /></div></div>
            </div>
            <div><Label className="text-muted-foreground">Title</Label><p className="font-medium">{viewPlan.title}</p></div>
            <div><Label className="text-muted-foreground">Objective</Label><p>{viewPlan.objective || 'N/A'}</p></div>
            {viewPlan.approval_comments && <div><Label className="text-muted-foreground">Comments</Label><p>{viewPlan.approval_comments}</p></div>}
          </div>
        )}
      </EntityModal>

      {/* View Dept Audit */}
      <EntityModal open={!!viewDeptAudit} onOpenChange={() => setViewDeptAudit(null)} title="Department Audit Details" mode="view">
        {viewDeptAudit && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Department</Label><p className="font-medium">{viewDeptAudit.department_name}</p></div>
              <div><Label className="text-muted-foreground">Status</Label><div className="mt-1"><StatusBadge status={viewDeptAudit.status || 'Draft'} /></div></div>
              <div><Label className="text-muted-foreground">Period</Label><p>{viewDeptAudit.period || 'N/A'}</p></div>
              <div><Label className="text-muted-foreground">Risk</Label><div className="mt-1"><StatusBadge status={viewDeptAudit.risk_rating || 'Medium'} /></div></div>
              <div><Label className="text-muted-foreground">Lead Auditor</Label><p>{viewDeptAudit.lead_auditor_name || 'Unassigned'}</p></div>
            </div>
          </div>
        )}
      </EntityModal>

      {/* Create Annual Plan */}
      <Dialog open={isCreatePlanOpen} onOpenChange={setIsCreatePlanOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Annual Audit Plan</DialogTitle></DialogHeader>
          <AnnualPlanForm onClose={() => setIsCreatePlanOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit Annual Plan */}
      {editPlan && (
        <Dialog open={!!editPlan} onOpenChange={() => setEditPlan(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Annual Audit Plan</DialogTitle></DialogHeader>
            <AnnualPlanForm plan={editPlan} onClose={() => setEditPlan(null)} />
          </DialogContent>
        </Dialog>
      )}

      {/* Add Dept Audit */}
      {isDeptAuditOpen && selectedAnnualPlan && (
        <Dialog open={isDeptAuditOpen} onOpenChange={setIsDeptAuditOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Department Audit to {selectedAnnualPlan.fiscal_year}</DialogTitle></DialogHeader>
            <DepartmentAuditForm annualPlanId={selectedAnnualPlan.id} onClose={() => setIsDeptAuditOpen(false)} />
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dept Audit */}
      {editDeptAudit && (
        <Dialog open={!!editDeptAudit} onOpenChange={() => setEditDeptAudit(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Department Audit</DialogTitle></DialogHeader>
            <DepartmentAuditForm annualPlanId={editDeptAudit.plan_id} onClose={() => setEditDeptAudit(null)} />
          </DialogContent>
        </Dialog>
      )}

      {/* Submit Confirm */}
      <ConfirmDialog
        open={submitPlanId !== null}
        onOpenChange={() => setSubmitPlanId(null)}
        title="Submit Plan for Approval"
        description="This plan will be sent to the approval queue. Continue?"
        confirmLabel="Submit"
        onConfirm={() => { if (submitPlanId) { update.mutate({ id: submitPlanId, status: 'Submitted', submitted_date: new Date().toISOString() }); setSubmitPlanId(null); } }}
      />
    </PageShell>
  );
}
