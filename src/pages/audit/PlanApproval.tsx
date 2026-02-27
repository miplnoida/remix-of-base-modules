import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIAAnnualPlans, useIAAnnualPlanMutations } from '@/hooks/useAuditData';
import { PageShell, DataTable, StatusBadge, EntityModal, ConfirmDialog } from '@/components/common';
import type { DataTableColumn } from '@/components/common';

export default function PlanApproval() {
  const { hasPermission } = useAuth();
  const [approvalComments, setApprovalComments] = useState('');
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [viewPlan, setViewPlan] = useState<any>(null);

  const { data: plans = [], isLoading } = useIAAnnualPlans();
  const { update } = useIAAnnualPlanMutations();

  const pendingPlans = plans.filter((p: any) => p.status === 'Submitted');
  const allPlans = plans.filter((p: any) => ['Submitted', 'Approved', 'Rejected'].includes(p.status));

  const handleApprovalAction = (plan: any, action: 'approve' | 'reject') => {
    setSelectedPlan(plan);
    setApprovalAction(action);
    setApprovalComments('');
    setIsApprovalDialogOpen(true);
  };

  const confirmApproval = () => {
    if (!selectedPlan) return;
    const newStatus = approvalAction === 'approve' ? 'Approved' : 'Rejected';
    update.mutate({
      id: selectedPlan.id,
      status: newStatus,
      approval_comments: approvalComments,
      approved_date: new Date().toISOString(),
    });
    setIsApprovalDialogOpen(false);
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'fiscal_year', header: 'Fiscal Year', render: (p) => <span className="font-medium">{p.fiscal_year}</span> },
    { key: 'title', header: 'Title' },
    { key: 'objective', header: 'Objective', className: 'max-w-xs', render: (p) => <span className="truncate block max-w-xs">{p.objective}</span> },
    { key: 'submitted_date', header: 'Submitted', render: (p) => p.submitted_date ? new Date(p.submitted_date).toLocaleDateString() : '-' },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
  ];

  return (
    <PageShell
      title="Plan Approval"
      subtitle="Review and approve submitted audit plans"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/plans' }, { label: 'Plan Approval' }]}
      isLoading={isLoading}
      noPermission={!hasPermission('approve_audit_plans')}
    >
      {/* Pending Approval Queue */}
      <Card>
        <CardHeader><CardTitle>Plans Awaiting Approval ({pendingPlans.length})</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={pendingPlans}
            emptyMessage="No plans awaiting approval"
            renderActions={(plan) => (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewPlan(plan)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={() => handleApprovalAction(plan, 'approve')} className="bg-green-600 hover:bg-green-700 h-8">
                  <CheckCircle className="w-4 h-4 mr-1" />Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleApprovalAction(plan, 'reject')} className="h-8">
                  <XCircle className="w-4 h-4 mr-1" />Reject
                </Button>
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Recently Reviewed */}
      {allPlans.filter(p => p.status !== 'Submitted').length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recently Reviewed</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={allPlans.filter((p: any) => p.status !== 'Submitted')}
              emptyMessage="No recently reviewed plans"
              onView={(plan) => setViewPlan(plan)}
            />
          </CardContent>
        </Card>
      )}

      {/* View Plan Modal */}
      <EntityModal
        open={!!viewPlan}
        onOpenChange={() => setViewPlan(null)}
        title="Audit Plan Details"
        mode="view"
      >
        {viewPlan && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Fiscal Year</Label><p className="font-medium">{viewPlan.fiscal_year}</p></div>
              <div><Label className="text-muted-foreground">Status</Label><div className="mt-1"><StatusBadge status={viewPlan.status} /></div></div>
            </div>
            <div><Label className="text-muted-foreground">Title</Label><p className="font-medium">{viewPlan.title}</p></div>
            <div><Label className="text-muted-foreground">Objective</Label><p>{viewPlan.objective || 'N/A'}</p></div>
            {viewPlan.approval_comments && <div><Label className="text-muted-foreground">Approval Comments</Label><p>{viewPlan.approval_comments}</p></div>}
          </div>
        )}
      </EntityModal>

      {/* Approve/Reject Dialog */}
      <EntityModal
        open={isApprovalDialogOpen}
        onOpenChange={setIsApprovalDialogOpen}
        title={`${approvalAction === 'approve' ? 'Approve' : 'Reject'} Audit Plan`}
        mode="edit"
        onSave={confirmApproval}
        saveLabel={approvalAction === 'approve' ? 'Approve Plan' : 'Reject Plan'}
        isSaving={update.isPending}
      >
        {selectedPlan && (
          <div className="space-y-4">
            <div>
              <p><strong>Plan:</strong> {selectedPlan.title}</p>
              <p><strong>Fiscal Year:</strong> {selectedPlan.fiscal_year}</p>
            </div>
            <div className="space-y-2">
              <Label>{approvalAction === 'approve' ? 'Approval Comments' : 'Rejection Reason'}</Label>
              <Textarea
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
                placeholder={approvalAction === 'approve' ? "Enter approval comments (optional)..." : "Please provide reason for rejection..."}
              />
            </div>
          </div>
        )}
      </EntityModal>
    </PageShell>
  );
}
