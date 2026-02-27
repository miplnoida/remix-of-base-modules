import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Eye, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIAAnnualPlans, useIAAnnualPlanMutations, useIADepartmentAudits, useIADepartmentAuditMutations } from '@/hooks/useAuditData';
import { PageShell, SearchBar, FilterBar, DataTable, StatusBadge, EntityModal, ConfirmDialog } from '@/components/common';
import type { DataTableColumn, FilterField } from '@/components/common';

export default function PlanApproval() {
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ planType: 'all', fiscalYear: 'all' });
  const [approvalComments, setApprovalComments] = useState('');
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | 'changes'>('approve');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedItemType, setSelectedItemType] = useState<'annual' | 'department'>('annual');
  const [isActionOpen, setIsActionOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);

  const { data: plans = [], isLoading: plansLoading } = useIAAnnualPlans();
  const { data: deptAudits = [], isLoading: auditsLoading } = useIADepartmentAudits();
  const { update: updatePlan } = useIAAnnualPlanMutations();
  const { update: updateDept } = useIADepartmentAuditMutations();

  // Combine submitted items into a single queue
  const submittedPlans = plans.filter((p: any) => p.status === 'Submitted').map((p: any) => ({ ...p, _type: 'annual' as const, _label: 'Annual Plan' }));
  const submittedDepts = deptAudits.filter((d: any) => d.status === 'Submitted').map((d: any) => ({ ...d, _type: 'department' as const, _label: 'Department Audit', title: d.department_name }));

  const allSubmitted = [...submittedPlans, ...submittedDepts].filter((item: any) => {
    const matchesSearch = (item.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filters.planType === 'all' || item._type === filters.planType;
    return matchesSearch && matchesType;
  });

  const recentlyReviewed = [
    ...plans.filter((p: any) => ['Approved', 'Rejected'].includes(p.status)).map((p: any) => ({ ...p, _type: 'annual' as const, _label: 'Annual Plan' })),
    ...deptAudits.filter((d: any) => ['Approved', 'Rejected'].includes(d.status)).map((d: any) => ({ ...d, _type: 'department' as const, _label: 'Department Audit', title: d.department_name })),
  ];

  const handleAction = (item: any, action: 'approve' | 'reject' | 'changes') => {
    setSelectedItem(item);
    setSelectedItemType(item._type);
    setApprovalAction(action);
    setApprovalComments('');
    setIsActionOpen(true);
  };

  const confirmAction = () => {
    if (!selectedItem) return;
    const newStatus = approvalAction === 'approve' ? 'Approved' : approvalAction === 'reject' ? 'Rejected' : 'Draft';
    const payload = { id: selectedItem.id, status: newStatus, approval_comments: approvalComments, approved_date: new Date().toISOString() };
    if (selectedItemType === 'annual') updatePlan.mutate(payload);
    else updateDept.mutate(payload);
    setIsActionOpen(false);
  };

  const filterFields: FilterField[] = [
    { key: 'planType', label: 'Plan Type', type: 'select', options: [
      { value: 'all', label: 'All Types' }, { value: 'annual', label: 'Annual Plan' }, { value: 'department', label: 'Department Audit' },
    ]},
  ];

  const columns: DataTableColumn<any>[] = [
    { key: '_label', header: 'Type', render: (r) => <StatusBadge status={r._label} /> },
    { key: 'title', header: 'Title / Department', render: (r) => <span className="font-medium">{r.title || r.fiscal_year}</span> },
    { key: 'fiscal_year', header: 'Fiscal Year' },
    { key: 'submitted_date', header: 'Submitted', render: (r) => r.submitted_date ? new Date(r.submitted_date).toLocaleDateString() : '-' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  const reviewedColumns: DataTableColumn<any>[] = [
    ...columns,
    { key: 'approved_date', header: 'Reviewed', render: (r) => r.approved_date ? new Date(r.approved_date).toLocaleDateString() : '-' },
  ];

  const actionLabels = { approve: 'Approve', reject: 'Reject', changes: 'Request Changes' };

  return (
    <PageShell
      title="Plan Approval"
      subtitle="Review and approve submitted audit plans"
      breadcrumbs={[{ label: 'Internal Audit' }, { label: 'Plan Approval' }]}
      isLoading={plansLoading || auditsLoading}
      noPermission={!hasPermission('approve_audit_plans')}
    >
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search submitted plans..." />
            <FilterBar filters={filterFields} values={filters} onChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))} onReset={() => setFilters({ planType: 'all', fiscalYear: 'all' })} />
          </div>
        </CardContent>
      </Card>

      {/* Approval Queue */}
      <Card>
        <CardHeader><CardTitle>Awaiting Approval ({allSubmitted.length})</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={allSubmitted}
            emptyMessage="No plans awaiting approval"
            renderActions={(item) => (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewItem(item)}><Eye className="h-4 w-4" /></Button>
                <Button size="sm" onClick={() => handleAction(item, 'approve')} className="bg-green-600 hover:bg-green-700 h-8">
                  <CheckCircle className="w-4 h-4 mr-1" />Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleAction(item, 'changes')} className="h-8">
                  <MessageSquare className="w-4 h-4 mr-1" />Changes
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleAction(item, 'reject')} className="h-8">
                  <XCircle className="w-4 h-4 mr-1" />Reject
                </Button>
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Recently Reviewed */}
      {recentlyReviewed.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recently Reviewed</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={reviewedColumns} data={recentlyReviewed} emptyMessage="No recently reviewed plans" onView={(item) => setViewItem(item)} />
          </CardContent>
        </Card>
      )}

      {/* View Modal */}
      <EntityModal open={!!viewItem} onOpenChange={() => setViewItem(null)} title="Plan Details" mode="view">
        {viewItem && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Type</Label><p className="font-medium">{viewItem._label || 'Annual Plan'}</p></div>
              <div><Label className="text-muted-foreground">Status</Label><div className="mt-1"><StatusBadge status={viewItem.status} /></div></div>
              <div><Label className="text-muted-foreground">Fiscal Year</Label><p>{viewItem.fiscal_year || '-'}</p></div>
              <div><Label className="text-muted-foreground">Title</Label><p>{viewItem.title || '-'}</p></div>
            </div>
            <div><Label className="text-muted-foreground">Objective</Label><p>{viewItem.objective || 'N/A'}</p></div>
            {viewItem.approval_comments && <div><Label className="text-muted-foreground">Comments</Label><p>{viewItem.approval_comments}</p></div>}
          </div>
        )}
      </EntityModal>

      {/* Approve/Reject/Changes Modal */}
      <EntityModal
        open={isActionOpen}
        onOpenChange={setIsActionOpen}
        title={`${actionLabels[approvalAction]} Plan`}
        mode="edit"
        onSave={confirmAction}
        saveLabel={actionLabels[approvalAction]}
        isSaving={updatePlan.isPending || updateDept.isPending}
      >
        {selectedItem && (
          <div className="space-y-4">
            <p><strong>Plan:</strong> {selectedItem.title || selectedItem.fiscal_year}</p>
            <div className="space-y-2">
              <Label>{approvalAction === 'approve' ? 'Approval Comments (optional)' : approvalAction === 'reject' ? 'Rejection Reason' : 'What changes are needed?'}</Label>
              <Textarea value={approvalComments} onChange={(e) => setApprovalComments(e.target.value)} placeholder="Enter comments..." />
            </div>
          </div>
        )}
      </EntityModal>
    </PageShell>
  );
}
