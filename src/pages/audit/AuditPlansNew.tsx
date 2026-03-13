import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Eye, Edit, Send, History, Zap } from 'lucide-react';
import { DiscussionThread } from '@/components/audit/DiscussionThread';

import { AnnualPlanForm } from '@/components/audit/AnnualPlanForm';
import { DepartmentAuditForm } from '@/components/audit/DepartmentAuditForm';
import { PlanAmendmentHistory } from '@/components/audit/PlanAmendmentHistory';
import { useIAAnnualPlans, useIAAnnualPlanMutations, useIADepartmentAudits, useIADepartmentAuditMutations, useIADepartments } from '@/hooks/useAuditData';
import { PageShell, StandardSearchFilterBar, DataTable, StatusBadge, EntityModal, ConfirmDialog } from '@/components/common';
import { StandardModal } from '@/components/common/StandardModal';
import type { DataTableColumn, StandardFilterField } from '@/components/common';

export default function AuditPlansNew() {
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ status: 'all', fiscalYear: 'all', departmentId: 'all', auditType: 'all' });

  const [viewAnnual, setViewAnnual] = useState<any>(null);
  const [editAnnual, setEditAnnual] = useState<any>(null);
  const [viewDept, setViewDept] = useState<any>(null);
  const [editDept, setEditDept] = useState<any>(null);
  const [amendmentPlanId, setAmendmentPlanId] = useState<string | null>(null);
  const [amendmentPlanType, setAmendmentPlanType] = useState<'annual' | 'department'>('annual');

  const [showCreatePicker, setShowCreatePicker] = useState(false);
  const [isCreateAnnualOpen, setIsCreateAnnualOpen] = useState(false);
  const [isCreateDeptPickerOpen, setIsCreateDeptPickerOpen] = useState(false);
  const [isCreateDeptOpen, setIsCreateDeptOpen] = useState(false);
  const [isCreateAdHocOpen, setIsCreateAdHocOpen] = useState(false);
  const [selectedAnnualPlanId, setSelectedAnnualPlanId] = useState<string>('');

  const [submitAnnualId, setSubmitAnnualId] = useState<string | null>(null);
  const [submitDeptId, setSubmitDeptId] = useState<string | null>(null);

  const { data: annualPlans = [], isLoading: plansLoading } = useIAAnnualPlans();
  const { data: departmentAudits = [], isLoading: auditsLoading } = useIADepartmentAudits();
  const { data: departments = [] } = useIADepartments();
  const { create: createAnnual, update: updateAnnual } = useIAAnnualPlanMutations();
  const { create: createDept, update: updateDept } = useIADepartmentAuditMutations();

  const planById = useMemo(
    () => new Map((annualPlans || []).map((plan: any) => [plan.id, plan])),
    [annualPlans]
  );

  const fiscalYears = useMemo(() => {
    const values = (annualPlans || []).map((p: any) => p.fiscal_year).filter(Boolean);
    return [...new Set(values)];
  }, [annualPlans]);

  const normalizedSearch = searchTerm.toLowerCase();

  const filteredAnnualPlans = (annualPlans || []).filter((plan: any) => {
    const matchesSearch =
      (plan.title || '').toLowerCase().includes(normalizedSearch) ||
      (plan.fiscal_year || '').toLowerCase().includes(normalizedSearch) ||
      (plan.id || '').toLowerCase().includes(normalizedSearch);
    const matchesStatus = filters.status === 'all' || (plan.status || '') === filters.status;
    const matchesFiscalYear = filters.fiscalYear === 'all' || (plan.fiscal_year || '') === filters.fiscalYear;
    const matchesDepartment =
      filters.departmentId === 'all' ||
      (departmentAudits || []).some((audit: any) => audit.annual_plan_id === plan.id && `${audit.department_id || ''}` === filters.departmentId);
    return matchesSearch && matchesStatus && matchesFiscalYear && matchesDepartment;
  });

  const filteredDepartmentAudits = (departmentAudits || []).filter((audit: any) => {
    const linkedPlan = planById.get(audit.annual_plan_id);
    const fiscalYear = linkedPlan?.fiscal_year || '';
    const auditType = audit.audit_type || 'planned';
    const matchesSearch =
      (audit.department_name || '').toLowerCase().includes(normalizedSearch) ||
      (audit.period || '').toLowerCase().includes(normalizedSearch) ||
      (audit.id || '').toLowerCase().includes(normalizedSearch);
    const matchesStatus = filters.status === 'all' || (audit.status || '') === filters.status;
    const matchesFiscalYear = filters.fiscalYear === 'all' || fiscalYear === filters.fiscalYear;
    const matchesDepartment = filters.departmentId === 'all' || `${audit.department_id || ''}` === filters.departmentId;
    const matchesAuditType = filters.auditType === 'all' || auditType === filters.auditType;
    return matchesSearch && matchesStatus && matchesFiscalYear && matchesDepartment && matchesAuditType;
  });

  const annualColumns: DataTableColumn<any>[] = [
    { key: 'id', header: 'Plan ID', render: (row) => <span className="font-medium">{(row.id || '').slice(0, 8)}</span> },
    { key: 'fiscal_year', header: 'Fiscal Year' },
    { key: 'title', header: 'Plan Name' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status || 'Draft'} /> },
    { key: 'created_at', header: 'Created On', render: (row) => (row.created_at ? new Date(row.created_at).toLocaleDateString() : '-') },
  ];

  const deptColumns: DataTableColumn<any>[] = [
    { key: 'id', header: 'Plan ID', render: (row) => <span className="font-medium">{(row.id || '').slice(0, 8)}</span> },
    { key: 'audit_type', header: 'Type', render: (row) => (
      <StatusBadge status={row.audit_type === 'ad_hoc' ? 'Ad-Hoc' : 'Planned'} />
    )},
    { key: 'department_name', header: 'Department', render: (row) => row.department_name || '-' },
    { key: 'period', header: 'Period', render: (row) => row.period || '-' },
    { key: 'fiscal_year', header: 'Fiscal Year', render: (row) => row.audit_type === 'ad_hoc' ? '-' : (planById.get(row.annual_plan_id)?.fiscal_year || '-') },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status || 'Draft'} /> },
  ];

  const filterFields: StandardFilterField[] = [
    { key: 'fiscalYear', label: 'Fiscal Year', type: 'select', options: [{ value: 'all', label: 'All Years' }, ...fiscalYears.map((year) => ({ value: year, label: year }))] },
    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'all', label: 'All Statuses' }, { value: 'Draft', label: 'Draft' }, { value: 'Submitted', label: 'Submitted' }, { value: 'Approved', label: 'Approved' }, { value: 'In Progress', label: 'In Progress' }, { value: 'Completed', label: 'Completed' }] },
    { key: 'departmentId', label: 'Department', type: 'select', options: [{ value: 'all', label: 'All Departments' }, ...(departments || []).map((d: any) => ({ value: d.id, label: d.name }))] },
    { key: 'auditType', label: 'Audit Type', type: 'select', options: [{ value: 'all', label: 'All Types' }, { value: 'planned', label: 'Planned' }, { value: 'ad_hoc', label: 'Ad-Hoc' }] },
  ];

  const resetFilters = () => setFilters({ status: 'all', fiscalYear: 'all', departmentId: 'all', auditType: 'all' });

  return (
    <PageShell
      title="Audit Plans"
      subtitle="Create and manage annual plans, department audit plans, and ad-hoc audits"
      breadcrumbs={[{ label: 'Internal Audit' }, { label: 'Audit Plans' }]}
      isLoading={plansLoading || auditsLoading}
      actions={<Button onClick={() => setShowCreatePicker(true)}><Plus className="w-4 h-4 mr-2" />Add New</Button>}
    >
      <StandardSearchFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search plan name, id, or department..."
        filters={filterFields}
        filterValues={filters}
        onFilterChange={(k, v) => setFilters((prev) => ({ ...prev, [k]: v }))}
        onReset={resetFilters}
      />

      <Tabs defaultValue="annual" className="space-y-4">
        <TabsList>
          <TabsTrigger value="annual">Annual Plans ({filteredAnnualPlans.length})</TabsTrigger>
          <TabsTrigger value="department">Department Audit Plans ({filteredDepartmentAudits.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="annual">
          <Card>
            <CardContent className="pt-6">
              <DataTable
                columns={annualColumns}
                data={filteredAnnualPlans}
                emptyMessage="No annual plans found"
                renderActions={(row) => (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewAnnual(row)}><Eye className="h-4 w-4" /></Button>
                    {row.status === 'Draft' && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditAnnual(row)}><Edit className="h-4 w-4" /></Button>}
                    {row.status === 'Approved' && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="View Amendments" onClick={() => { setAmendmentPlanId(row.id); setAmendmentPlanType('annual'); }}>
                        <History className="h-4 w-4" />
                      </Button>
                    )}
                    {row.status === 'Draft' && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSubmitAnnualId(row.id)}><Send className="h-4 w-4" /></Button>}
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
                data={filteredDepartmentAudits}
                emptyMessage="No department audit plans found"
                renderActions={(row) => (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewDept(row)}><Eye className="h-4 w-4" /></Button>
                    {(row.status === 'Draft' || row.status === 'Planned') && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditDept(row)}><Edit className="h-4 w-4" /></Button>}
                    {row.status === 'Approved' && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="View Amendments" onClick={() => { setAmendmentPlanId(row.id); setAmendmentPlanType('department'); }}>
                        <History className="h-4 w-4" />
                      </Button>
                    )}
                    {(row.status === 'Draft' || row.status === 'Planned') && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSubmitDeptId(row.id)}><Send className="h-4 w-4" /></Button>}
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Picker Modal */}
      <EntityModal open={showCreatePicker} onOpenChange={setShowCreatePicker} title="Create New Plan" mode="view">
        <div className="space-y-3">
          <Button className="w-full" onClick={() => { setShowCreatePicker(false); setIsCreateAnnualOpen(true); }}>
            Create Annual Plan
          </Button>
          <Button variant="outline" className="w-full" onClick={() => { setShowCreatePicker(false); setIsCreateDeptPickerOpen(true); }}>
            Create Department Audit Plan
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => { setShowCreatePicker(false); setIsCreateAdHocOpen(true); }}>
            <Zap className="w-4 h-4 mr-2" />
            Create Ad-Hoc Audit
          </Button>
        </div>
      </EntityModal>

      {/* Create Annual Plan */}
      <StandardModal open={isCreateAnnualOpen} onOpenChange={setIsCreateAnnualOpen} title="Create Annual Plan" mode="create" size="4xl">
        <AnnualPlanForm
          onClose={() => setIsCreateAnnualOpen(false)}
          onCreate={(data) => createAnnual.mutateAsync(data)}
          onUpdate={(data) => updateAnnual.mutateAsync(data)}
        />
      </StandardModal>

      {/* Select Annual Plan for Department Audit */}
      <EntityModal
        open={isCreateDeptPickerOpen}
        onOpenChange={setIsCreateDeptPickerOpen}
        title="Select Annual Plan"
        mode="edit"
        saveLabel="Continue"
        onSave={() => {
          if (!selectedAnnualPlanId) return;
          setIsCreateDeptPickerOpen(false);
          setIsCreateDeptOpen(true);
        }}
      >
        <div className="space-y-2">
          <Label>Annual Plan</Label>
          <Select value={selectedAnnualPlanId} onValueChange={setSelectedAnnualPlanId}>
            <SelectTrigger>
              <SelectValue placeholder="Select annual plan" />
            </SelectTrigger>
            <SelectContent>
              {(annualPlans || []).map((plan: any) => (
                <SelectItem key={plan.id} value={plan.id}>{plan.fiscal_year} - {plan.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </EntityModal>

      {/* Create Department Audit (under annual plan) */}
      <StandardModal open={isCreateDeptOpen} onOpenChange={setIsCreateDeptOpen} title="Create Department Audit Plan" mode="create" size="4xl">
        {selectedAnnualPlanId && (
          <DepartmentAuditForm
            annualPlanId={selectedAnnualPlanId}
            onClose={() => setIsCreateDeptOpen(false)}
            onCreate={(data) => createDept.mutateAsync(data)}
            onUpdate={(data) => updateDept.mutateAsync(data)}
          />
        )}
      </StandardModal>

      {/* Create Ad-Hoc Audit (no annual plan) */}
      <StandardModal open={isCreateAdHocOpen} onOpenChange={setIsCreateAdHocOpen} title="Create Ad-Hoc Audit" mode="create" size="4xl">
        <DepartmentAuditForm
          isAdHoc={true}
          onClose={() => setIsCreateAdHocOpen(false)}
          onCreate={(data) => createDept.mutateAsync(data)}
          onUpdate={(data) => updateDept.mutateAsync(data)}
        />
      </StandardModal>

      {/* Edit Annual Plan */}
      {editAnnual && (
        <StandardModal open={!!editAnnual} onOpenChange={() => setEditAnnual(null)} title="Edit Annual Plan" mode="edit" size="4xl">
          <AnnualPlanForm
            plan={editAnnual}
            onClose={() => setEditAnnual(null)}
            onCreate={(data) => createAnnual.mutateAsync(data)}
            onUpdate={(data) => updateAnnual.mutateAsync(data)}
          />
        </StandardModal>
      )}

      {/* Edit Department Audit */}
      {editDept && (
        <StandardModal open={!!editDept} onOpenChange={() => setEditDept(null)} title="Edit Department Audit Plan" mode="edit" size="4xl">
          <DepartmentAuditForm
            annualPlanId={editDept.annual_plan_id}
            departmentAudit={editDept}
            isAdHoc={editDept.audit_type === 'ad_hoc'}
            onClose={() => setEditDept(null)}
            onCreate={(data) => createDept.mutateAsync(data)}
            onUpdate={(data) => updateDept.mutateAsync(data)}
          />
        </StandardModal>
      )}

      {/* View Annual Plan */}
      <EntityModal open={!!viewAnnual} onOpenChange={() => setViewAnnual(null)} title="Annual Plan Details" mode="view">
        {viewAnnual && (
          <div className="space-y-3">
            <p><strong>Fiscal Year:</strong> {viewAnnual.fiscal_year || '-'}</p>
            <p><strong>Plan Name:</strong> {viewAnnual.title || '-'}</p>
            <p><strong>Status:</strong> <StatusBadge status={viewAnnual.status || 'Draft'} /></p>
            <p><strong>Objective:</strong> {viewAnnual.objective || '-'}</p>
          </div>
        )}
      </EntityModal>

      {/* View Department Audit */}
      <EntityModal open={!!viewDept} onOpenChange={() => setViewDept(null)} title="Department Audit Plan Details" mode="view">
        {viewDept && (
          <div className="space-y-3">
            <p><strong>Type:</strong> <StatusBadge status={viewDept.audit_type === 'ad_hoc' ? 'Ad-Hoc' : 'Planned'} /></p>
            <p><strong>Department:</strong> {viewDept.department_name || '-'}</p>
            <p><strong>Period:</strong> {viewDept.period || '-'}</p>
            {viewDept.audit_type !== 'ad_hoc' && (
              <p><strong>Fiscal Year:</strong> {planById.get(viewDept.annual_plan_id)?.fiscal_year || '-'}</p>
            )}
            <p><strong>Status:</strong> <StatusBadge status={viewDept.status || 'Draft'} /></p>
            <p><strong>Objective:</strong> {viewDept.objective || '-'}</p>
            <p><strong>Scope:</strong> {viewDept.scope || '-'}</p>
          </div>
        )}
      </EntityModal>

      {/* Amendment History */}
      <StandardModal
        open={!!amendmentPlanId}
        onOpenChange={() => setAmendmentPlanId(null)}
        title="Plan Amendment History"
        mode="view"
        size="2xl"
      >
        {amendmentPlanId && (
          <PlanAmendmentHistory planId={amendmentPlanId} planType={amendmentPlanType} />
        )}
      </StandardModal>

      {/* Submit Confirmations */}
      <ConfirmDialog
        open={submitAnnualId !== null}
        onOpenChange={() => setSubmitAnnualId(null)}
        title="Submit Annual Plan"
        description="This annual plan will be moved to the approval queue. Continue?"
        confirmLabel="Submit"
        onConfirm={() => {
          if (!submitAnnualId) return;
          updateAnnual.mutate({ id: submitAnnualId, status: 'Submitted', submitted_date: new Date().toISOString() });
          setSubmitAnnualId(null);
        }}
      />

      <ConfirmDialog
        open={submitDeptId !== null}
        onOpenChange={() => setSubmitDeptId(null)}
        title="Submit Department Audit Plan"
        description="This department audit plan will be moved to the approval queue. Continue?"
        confirmLabel="Submit"
        onConfirm={() => {
          if (!submitDeptId) return;
          updateDept.mutate({ id: submitDeptId, status: 'Submitted', submitted_date: new Date().toISOString() });
          setSubmitDeptId(null);
        }}
      />
    </PageShell>
  );
}
