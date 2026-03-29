import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Eye, MessageSquare, Clock, UserCheck, Send, ExternalLink, ShieldAlert } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { useIAAnnualPlans } from '@/hooks/useAuditData';
import { useIAPlanEngagements } from '@/hooks/useAuditPlanChangeLog';
import { useAuditPlanWorkflow, useIAPlanApprovalHistory } from '@/hooks/useAuditPlanApproval';
import { PageShell, StandardSearchFilterBar, DataTable, StatusBadge, EntityModal, ConfirmDialog } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { formatDateForDisplay } from '@/lib/format-config';
import { usePlanWorkflowAccess } from '@/hooks/useAuditPlanWorkflowAccess';

export default function PlanApproval() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ statusFilter: 'all' });
  const [activeTab, setActiveTab] = useState('pending');

  const [viewItem, setViewItem] = useState<any>(null);
  const [approveItem, setApproveItem] = useState<any>(null);
  const [rejectItem, setRejectItem] = useState<any>(null);
  const [changesItem, setChangesItem] = useState<any>(null);
  const [changesComment, setChangesComment] = useState('');
  const [approveComment, setApproveComment] = useState('');
  const [approveCommittee, setApproveCommittee] = useState('');
  const [approveMinutesRef, setApproveMinutesRef] = useState('');
  const [rejectComment, setRejectComment] = useState('');

  const { data: annualPlans = [], isLoading } = useIAAnnualPlans();
  const { approvePlan, rejectPlan, sendBackForChanges } = useAuditPlanWorkflow();

  const access = usePlanWorkflowAccess();

  // Fetch engagements for current viewed item
  const { data: viewEngagements = [] } = useIAPlanEngagements(viewItem?.id);

  // Fetch all approval actions for history
  const { data: allApprovalActions = [] } = useQuery({
    queryKey: ['ia_approval_actions_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_approval_actions' as any)
        .select('*')
        .eq('entity_type', 'annual_plan')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const pendingPlans = useMemo(() =>
    (annualPlans || []).filter((p: any) => ['Submitted', 'Under Review'].includes(p.status)), [annualPlans]);

  const decidedPlans = useMemo(() =>
    (annualPlans || []).filter((p: any) => ['Approved', 'Rejected', 'Changes Requested', 'Superseded'].includes(p.status)), [annualPlans]);

  const filterItems = (items: any[]) => items.filter((item: any) => {
    const matchesSearch =
      (item.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.fiscal_year || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Gate: only approvers can see this page
  if (access.isLoading) {
    return (
      <PageShell
        title="Plan Approval"
        subtitle="Review, approve, or return annual audit plans"
        breadcrumbs={[{ label: 'Internal Audit' }, { label: 'Plan Approval' }]}
        isLoading
      />
    );
  }

  if (!access.isApprover) {
    return (
      <PageShell
        title="Plan Approval"
        subtitle="Review, approve, or return annual audit plans"
        breadcrumbs={[{ label: 'Internal Audit' }, { label: 'Plan Approval' }]}
      >
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldAlert className="h-10 w-10 mx-auto text-destructive mb-3" />
            <p className="font-medium text-foreground">Access Denied</p>
            <p className="text-sm text-muted-foreground mt-1">
              You do not have the <strong>approve_audit_plans</strong> permission required to access this page.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/audit/audit-plans')}>
              Back to Plans
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const baseColumns: DataTableColumn<any>[] = [
    { key: 'fiscal_year', header: 'Fiscal Year' },
    { key: 'title', header: 'Plan Title' },
    { key: 'total_department_audits', header: 'Engagements', render: (row) => row.total_department_audits ?? 0 },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status || 'Submitted'} /> },
    { key: 'submitted_by', header: 'Submitted By', render: (row) => row.submitted_by || row.created_by || '—' },
    { key: 'submitted_date', header: 'Submitted', render: (row) => row.submitted_date ? formatDateForDisplay(row.submitted_date) : '—' },
  ];

  const historyColumns: DataTableColumn<any>[] = [
    { key: 'entity_id', header: 'Plan', render: (row) => <span className="font-mono text-xs">{(row.entity_id || '').slice(0, 8)}</span> },
    { key: 'action', header: 'Action', render: (row) => <StatusBadge status={row.action} /> },
    { key: 'performed_by', header: 'By', render: (row) => row.performed_by || '—' },
    { key: 'comments', header: 'Comments', render: (row) => <span className="text-xs text-muted-foreground max-w-[200px] truncate block">{row.comments || '—'}</span> },
    { key: 'created_at', header: 'Date', render: (row) => row.created_at ? formatDateForDisplay(row.created_at) : '—' },
  ];

  return (
    <PageShell
      title="Plan Approval"
      subtitle="Review, approve, or return annual audit plans"
      breadcrumbs={[{ label: 'Internal Audit' }, { label: 'Plan Approval' }]}
      isLoading={isLoading}
    >
      <StandardSearchFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by title or fiscal year..."
        filters={[]}
        filterValues={filters}
        onFilterChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        onReset={() => setFilters({ statusFilter: 'all' })}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            <Send className="w-3 h-3 mr-1" />
            Pending Review ({filterItems(pendingPlans).length})
          </TabsTrigger>
          <TabsTrigger value="decided">
            <CheckCircle className="w-3 h-3 mr-1" />
            Decided ({filterItems(decidedPlans).length})
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock className="w-3 h-3 mr-1" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardContent className="pt-6">
              <DataTable
                columns={baseColumns}
                data={filterItems(pendingPlans)}
                emptyMessage="No plans pending approval"
                renderActions={(row) => (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewItem(row)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" onClick={() => { setApproveItem(row); setApproveComment(''); setApproveCommittee(row.board_committee_name || ''); setApproveMinutesRef(''); }}>
                      <CheckCircle className="w-4 h-4 mr-1" />Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setChangesItem(row); setChangesComment(''); }}>
                      <MessageSquare className="w-4 h-4 mr-1" />Changes
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => { setRejectItem(row); setRejectComment(''); }}>
                      <XCircle className="w-4 h-4 mr-1" />Reject
                    </Button>
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="decided">
          <Card>
            <CardContent className="pt-6">
              <DataTable
                columns={[
                  ...baseColumns,
                  { key: 'approved_by', header: 'Decided By', render: (row) => row.approved_by || row.rejected_by || '—' },
                ]}
                data={filterItems(decidedPlans)}
                emptyMessage="No decided plans"
                renderActions={(row) => (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewItem(row)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/audit/audit-plans/${row.id}`)}>
                      <ExternalLink className="h-4 w-4 mr-1" />Open
                    </Button>
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="pt-6">
              <DataTable
                columns={historyColumns}
                data={allApprovalActions}
                emptyMessage="No approval actions recorded"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Plan Details with Engagements */}
      <EntityModal open={!!viewItem} onOpenChange={() => setViewItem(null)} title="Plan Review" mode="view">
        {viewItem && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Title:</span> <strong>{viewItem.title}</strong></div>
              <div><span className="text-muted-foreground">Fiscal Year:</span> <strong>{viewItem.fiscal_year}</strong></div>
              <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewItem.status} /></div>
              <div><span className="text-muted-foreground">Submitted By:</span> {viewItem.submitted_by || viewItem.created_by || '—'}</div>
            </div>
            {viewItem.executive_summary && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Executive Summary</p>
                <p className="text-sm whitespace-pre-wrap bg-muted/30 rounded p-2">{viewItem.executive_summary}</p>
              </div>
            )}
            {viewItem.objective && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Objective</p>
                <p className="text-sm whitespace-pre-wrap bg-muted/30 rounded p-2">{viewItem.objective}</p>
              </div>
            )}
            {viewItem.approval_comments && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Last Comments</p>
                <p className="text-sm italic border-l-2 border-muted pl-2">{viewItem.approval_comments}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Engagements ({viewEngagements.length})</p>
              {viewEngagements.length > 0 ? (
                <div className="space-y-2">
                  {viewEngagements.map((eng: any, idx: number) => (
                    <div key={eng.id} className="text-xs border rounded p-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{idx + 1}. {eng.title || eng.engagement_name || 'Untitled'}</span>
                        <StatusBadge status={eng.engagement_risk_rating || 'Medium'} />
                      </div>
                      <div className="text-muted-foreground">
                        {eng.department_name || '—'} • {eng.lead_auditor || 'No lead'} • {eng.estimated_days || 0} days
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No engagements found</p>
              )}
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={() => { setViewItem(null); navigate(`/audit/audit-plans/${viewItem.id}?tab=boardpack`); }}>
              <ExternalLink className="h-4 w-4 mr-1" />Open Full Plan & Board Pack
            </Button>
          </div>
        )}
      </EntityModal>

      {/* Approve Dialog */}
      <EntityModal
        open={!!approveItem}
        onOpenChange={() => setApproveItem(null)}
        title="Approve Annual Audit Plan"
        mode="edit"
        saveLabel="Approve"
        onSave={() => {
          if (!approveItem) return;
          approvePlan.mutate({
            planId: approveItem.id,
            comments: approveComment || undefined,
            committeeName: approveCommittee || undefined,
            minutesRef: approveMinutesRef || undefined,
          });
          setApproveItem(null);
        }}
        isSaving={approvePlan.isPending}
      >
        {approveItem && (
          <div className="space-y-4">
            <p className="text-sm"><strong>Plan:</strong> {approveItem.title} ({approveItem.fiscal_year})</p>
            <div className="space-y-2">
              <Label>Board / Committee Name</Label>
              <Input value={approveCommittee} onChange={(e) => setApproveCommittee(e.target.value)} placeholder="e.g. Audit Committee" />
            </div>
            <div className="space-y-2">
              <Label>Minutes Reference</Label>
              <Input value={approveMinutesRef} onChange={(e) => setApproveMinutesRef(e.target.value)} placeholder="e.g. AC-2026-03-001" />
            </div>
            <div className="space-y-2">
              <Label>Approval Comments (optional)</Label>
              <Textarea value={approveComment} onChange={(e) => setApproveComment(e.target.value)} placeholder="Add approval comments..." />
            </div>
          </div>
        )}
      </EntityModal>

      {/* Request Changes Dialog */}
      <EntityModal
        open={!!changesItem}
        onOpenChange={() => setChangesItem(null)}
        title="Request Changes"
        mode="edit"
        saveLabel="Send Back"
        onSave={() => {
          if (!changesItem || !changesComment.trim()) return;
          sendBackForChanges.mutate({ planId: changesItem.id, comments: changesComment });
          setChangesItem(null);
          setChangesComment('');
        }}
        isSaving={sendBackForChanges.isPending}
      >
        {changesItem && (
          <div className="space-y-3">
            <p className="text-sm"><strong>Plan:</strong> {changesItem.title}</p>
            <div className="space-y-2">
              <Label>What changes are required? <span className="text-destructive">*</span></Label>
              <Textarea value={changesComment} onChange={(e) => setChangesComment(e.target.value)} placeholder="Describe the changes needed..." className="min-h-[100px]" />
            </div>
          </div>
        )}
      </EntityModal>

      {/* Reject Dialog */}
      <EntityModal
        open={!!rejectItem}
        onOpenChange={() => setRejectItem(null)}
        title="Reject Plan"
        mode="edit"
        saveLabel="Reject"
        onSave={() => {
          if (!rejectItem || !rejectComment.trim()) return;
          rejectPlan.mutate({ planId: rejectItem.id, comments: rejectComment });
          setRejectItem(null);
        }}
        isSaving={rejectPlan.isPending}
      >
        {rejectItem && (
          <div className="space-y-3">
            <p className="text-sm"><strong>Plan:</strong> {rejectItem.title}</p>
            <div className="space-y-2">
              <Label>Rejection reason <span className="text-destructive">*</span></Label>
              <Textarea value={rejectComment} onChange={(e) => setRejectComment(e.target.value)} placeholder="Provide reason for rejection..." className="min-h-[100px]" />
            </div>
          </div>
        )}
      </EntityModal>
    </PageShell>
  );
}
