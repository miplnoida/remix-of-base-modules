import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Eye, MessageSquare, Clock, UserCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { useIAAnnualPlans, useIAAnnualPlanMutations, useIADepartmentAudits, useIADepartmentAuditMutations } from '@/hooks/useAuditData';
import { PageShell, StandardSearchFilterBar, DataTable, StatusBadge, EntityModal, ConfirmDialog } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { notifyPlanSubmitted, notifyPlanApproved, notifyDeptAcceptanceRequired } from '@/services/auditNotificationService';
import { useUserCode } from '@/hooks/useUserCode';

export default function PlanApproval() {
  const userCode = useUserCode();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ planType: 'all', fiscalYear: 'all', statusFilter: 'all' });
  const [activeTab, setActiveTab] = useState('pending');

  const [viewItem, setViewItem] = useState<any>(null);
  const [approveItem, setApproveItem] = useState<any>(null);
  const [rejectItem, setRejectItem] = useState<any>(null);
  const [changesItem, setChangesItem] = useState<any>(null);
  const [changesComment, setChangesComment] = useState('');
  const [approveComment, setApproveComment] = useState('');
  const [rejectComment, setRejectComment] = useState('');
  const [acceptItem, setAcceptItem] = useState<any>(null);

  const { data: annualPlans = [], isLoading: annualLoading } = useIAAnnualPlans();
  const { data: departmentAudits = [], isLoading: deptLoading } = useIADepartmentAudits();
  const { update: updateAnnual } = useIAAnnualPlanMutations();
  const { update: updateDept } = useIADepartmentAuditMutations();

  // Fetch approval actions history
  const { data: approvalActions = [] } = useQuery({
    queryKey: ['ia_approval_actions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_approval_actions' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const fiscalYears = useMemo(() => {
    const years = (annualPlans || []).map((plan: any) => plan.fiscal_year).filter(Boolean);
    return [...new Set(years)];
  }, [annualPlans]);

  const planById = useMemo(
    () => new Map((annualPlans || []).map((plan: any) => [plan.id, plan])),
    [annualPlans]
  );

  // Build queue items for different statuses
  const buildItems = (statusFilter: string[]) => {
    const annual = (annualPlans || [])
      .filter((plan: any) => statusFilter.includes(plan.status))
      .map((plan: any) => ({
        ...plan,
        _source: 'annual' as const,
        _typeLabel: 'Annual',
        _displayTitle: plan.title || 'Annual Plan',
        _fiscalYear: plan.fiscal_year || '-',
      }));

    const dept = (departmentAudits || [])
      .filter((audit: any) => statusFilter.includes(audit.status))
      .map((audit: any) => ({
        ...audit,
        _source: 'department' as const,
        _typeLabel: audit.audit_type === 'ad_hoc' ? 'Ad-Hoc' : 'Department',
        _displayTitle: audit.department_name || 'Department Audit Plan',
        _fiscalYear: planById.get(audit.annual_plan_id)?.fiscal_year || '-',
      }));

    return [...annual, ...dept];
  };

  const pendingItems = buildItems(['Submitted']);
  const awaitingAcceptance = buildItems(['Awaiting Dept Acceptance']);
  const approvedItems = buildItems(['Approved', 'Accepted']);
  const rejectedItems = buildItems(['Rejected']);

  const filterItems = (items: any[]) => items.filter((item: any) => {
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

  const logApprovalAction = async (entityType: string, entityId: string, action: string, comments?: string) => {
    try {
      await supabase.from('ia_approval_actions' as any).insert({
        entity_type: entityType,
        entity_id: entityId,
        action,
        performed_by: userCode || null,
        performer_name: null,
        comments: comments || null,
      });
    } catch (err) {
      console.error('Failed to log approval action:', err);
    }
  };

  const handleDecision = async (item: any, decision: string, comments?: string) => {
    let finalStatus = decision;
    
    // For annual plans, check fiscal year uniqueness on approval
    if (decision === 'Approved' && item._source === 'annual') {
      const otherApproved = (annualPlans || []).find(
        (p: any) => p.id !== item.id && p.fiscal_year === item._fiscalYear && p.status === 'Approved'
      );
      if (otherApproved) {
        // Supersede the old approved plan
        updateAnnual.mutate({ id: otherApproved.id, status: 'Superseded' });
        await logApprovalAction('annual_plan', otherApproved.id, 'Superseded', `Superseded by approval of plan ${item.id}`);
      }
    }

    const payload: any = {
      id: item.id,
      status: finalStatus,
      approval_comments: comments || null,
      approved_date: decision === 'Draft' ? null : new Date().toISOString(),
      ...(decision === 'Approved' ? { approved_by: userCode || null } : {}),
    };

    const entityType = item._source === 'annual' ? 'annual_plan' : 'department_audit';

    if (item._source === 'annual') {
      updateAnnual.mutate(payload);
    } else {
      updateDept.mutate(payload);
    }

    await logApprovalAction(entityType, item.id, finalStatus, comments);

    if (decision === 'Approved') {
      await notifyPlanApproved(item.id, item._displayTitle, item.department_id, item.team_member_ids);
      if (item._source === 'department' && item.department_id) {
        updateDept.mutate({ id: item.id, status: 'Awaiting Dept Acceptance' });
        await notifyDeptAcceptanceRequired(item.id, item._displayTitle, item.department_id);
      }
    }
  };

  const handleDeptAcceptance = async (item: any) => {
    updateDept.mutate({ id: item.id, status: 'Accepted' });
    await logApprovalAction('department_audit', item.id, 'Accepted', 'Department head accepted the audit');
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

  const baseColumns: DataTableColumn<any>[] = [
    { key: 'id', header: 'Plan ID', render: (row) => <span className="font-medium">{(row.id || '').slice(0, 8)}</span> },
    { key: 'planType', header: 'Plan Type', render: (row) => <StatusBadge status={row._typeLabel} /> },
    { key: 'title', header: 'Plan Name', render: (row) => row._displayTitle },
    { key: 'fiscalYear', header: 'Fiscal Year', render: (row) => row._fiscalYear },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status || 'Submitted'} /> },
    { key: 'submitted_date', header: 'Submitted On', render: (row) => (row.submitted_date ? new Date(row.submitted_date).toLocaleDateString() : '-') },
  ];

  const approvalHistoryColumns: DataTableColumn<any>[] = [
    { key: 'entity_type', header: 'Type', render: (row) => <StatusBadge status={row.entity_type === 'annual_plan' ? 'Annual' : 'Department'} /> },
    { key: 'entity_id', header: 'Plan ID', render: (row) => <span className="font-medium">{(row.entity_id || '').slice(0, 8)}</span> },
    { key: 'action', header: 'Decision', render: (row) => <StatusBadge status={row.action} /> },
    { key: 'performed_by', header: 'By', render: (row) => row.performed_by || '-' },
    { key: 'comments', header: 'Comments', render: (row) => <span className="text-sm text-muted-foreground">{row.comments || '-'}</span> },
    { key: 'created_at', header: 'Date', render: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : '-' },
  ];

  return (
    <PageShell
      title="Plan Approval"
      subtitle="Review submitted plans, approve/reject, and manage department acceptance"
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
        onReset={() => setFilters({ planType: 'all', fiscalYear: 'all', statusFilter: 'all' })}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Review ({filterItems(pendingItems).length})
          </TabsTrigger>
          <TabsTrigger value="acceptance">
            <Clock className="w-3 h-3 mr-1" />
            Dept Acceptance ({filterItems(awaitingAcceptance).length})
          </TabsTrigger>
          <TabsTrigger value="decided">
            Decided ({filterItems(approvedItems).length + filterItems(rejectedItems).length})
          </TabsTrigger>
          <TabsTrigger value="history">
            Approval History
          </TabsTrigger>
        </TabsList>

        {/* Pending Review Tab */}
        <TabsContent value="pending">
          <Card>
            <CardContent className="pt-6">
              <DataTable
                columns={baseColumns}
                data={filterItems(pendingItems)}
                emptyMessage="No submitted plans in approval queue"
                renderActions={(row) => (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewItem(row)}><Eye className="h-4 w-4" /></Button>
                    <Button size="sm" onClick={() => { setApproveItem(row); setApproveComment(''); }}><CheckCircle className="w-4 h-4 mr-1" />Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => { setChangesItem(row); setChangesComment(''); }}><MessageSquare className="w-4 h-4 mr-1" />Changes</Button>
                    <Button size="sm" variant="destructive" onClick={() => { setRejectItem(row); setRejectComment(''); }}><XCircle className="w-4 h-4 mr-1" />Reject</Button>
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Awaiting Department Acceptance Tab */}
        <TabsContent value="acceptance">
          <Card>
            <CardContent className="pt-6">
              <DataTable
                columns={baseColumns}
                data={filterItems(awaitingAcceptance)}
                emptyMessage="No plans awaiting department acceptance"
                renderActions={(row) => (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewItem(row)}><Eye className="h-4 w-4" /></Button>
                    <Button size="sm" onClick={() => setAcceptItem(row)}>
                      <UserCheck className="w-4 h-4 mr-1" />Accept
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => { setRejectItem(row); setRejectComment(''); }}>
                      <XCircle className="w-4 h-4 mr-1" />Decline
                    </Button>
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Decided Tab */}
        <TabsContent value="decided">
          <Card>
            <CardContent className="pt-6">
              <DataTable
                columns={baseColumns}
                data={[...filterItems(approvedItems), ...filterItems(rejectedItems)]}
                emptyMessage="No decided plans"
                renderActions={(row) => (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewItem(row)}><Eye className="h-4 w-4" /></Button>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approval History Tab */}
        <TabsContent value="history">
          <Card>
            <CardContent className="pt-6">
              <DataTable
                columns={approvalHistoryColumns}
                data={approvalActions}
                emptyMessage="No approval actions recorded"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Details */}
      <EntityModal open={!!viewItem} onOpenChange={() => setViewItem(null)} title="Plan Details" mode="view">
        {viewItem && (
          <div className="space-y-3">
            <p><strong>Plan ID:</strong> {(viewItem.id || '').slice(0, 8)}</p>
            <p><strong>Plan Type:</strong> {viewItem._typeLabel}</p>
            <p><strong>Plan Name:</strong> {viewItem._displayTitle}</p>
            <p><strong>Fiscal Year:</strong> {viewItem._fiscalYear}</p>
            <p><strong>Status:</strong> <StatusBadge status={viewItem.status || 'Submitted'} /></p>
            <p><strong>Objective:</strong> {viewItem.objective || '-'}</p>
            {viewItem.scope && <p><strong>Scope:</strong> {viewItem.scope}</p>}
            {viewItem.approval_comments && <p><strong>Last Comments:</strong> {viewItem.approval_comments}</p>}
          </div>
        )}
      </EntityModal>

      {/* Approve Dialog */}
      <EntityModal
        open={!!approveItem}
        onOpenChange={() => setApproveItem(null)}
        title="Approve Plan"
        mode="edit"
        saveLabel="Approve"
        onSave={() => {
          if (!approveItem) return;
          handleDecision(approveItem, 'Approved', approveComment);
          setApproveItem(null);
        }}
        isSaving={updateAnnual.isPending || updateDept.isPending}
      >
        {approveItem && (
          <div className="space-y-3">
            <p><strong>Plan:</strong> {approveItem._displayTitle}</p>
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

      {/* Reject Dialog */}
      <EntityModal
        open={!!rejectItem}
        onOpenChange={() => setRejectItem(null)}
        title="Reject Plan"
        mode="edit"
        saveLabel="Reject"
        onSave={() => {
          if (!rejectItem) return;
          handleDecision(rejectItem, 'Rejected', rejectComment || 'Plan rejected');
          setRejectItem(null);
        }}
        isSaving={updateAnnual.isPending || updateDept.isPending}
      >
        {rejectItem && (
          <div className="space-y-3">
            <p><strong>Plan:</strong> {rejectItem._displayTitle}</p>
            <div className="space-y-2">
              <Label>Rejection reason</Label>
              <Textarea value={rejectComment} onChange={(e) => setRejectComment(e.target.value)} placeholder="Provide reason for rejection..." />
            </div>
          </div>
        )}
      </EntityModal>

      {/* Department Acceptance Dialog */}
      <ConfirmDialog
        open={!!acceptItem}
        onOpenChange={() => setAcceptItem(null)}
        title="Accept Audit"
        description="By accepting, you confirm the audit team can proceed with fieldwork in your department."
        confirmLabel="Accept Audit"
        onConfirm={() => {
          if (!acceptItem) return;
          handleDeptAcceptance(acceptItem);
          setAcceptItem(null);
        }}
        isLoading={updateDept.isPending}
      />
    </PageShell>
  );
}
