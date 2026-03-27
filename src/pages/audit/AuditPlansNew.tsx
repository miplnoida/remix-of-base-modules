import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Eye, Edit, ClipboardList, ShieldAlert, Send, History, FileEdit, FileText, Copy, Download } from 'lucide-react';
import { AnnualPlanForm } from '@/components/audit/AnnualPlanForm';
import { PageShell, StandardSearchFilterBar, DataTable, StatusBadge, ConfirmDialog } from '@/components/common';
import { StandardModal } from '@/components/common/StandardModal';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { formatDateForDisplay } from '@/lib/format-config';
import { useIAAnnualPlans, useIAAnnualPlanMutations } from '@/hooks/useAuditData';
import { useStartPlanApproval, useTeamAvailabilityCheck } from '@/hooks/useAuditWorkflowGates';
import { useIAPlanEngagements } from '@/hooks/useAuditPlanChangeLog';
import { useAuth } from '@/contexts/AuthContext';
import { useUserCode } from '@/hooks/useUserCode';
import { useToast } from '@/hooks/use-toast';
import { ConflictAlertPanel } from '@/components/audit/ConflictAlertPanel';
import { PlanVersionHistory } from '@/components/audit/PlanVersionHistory';
import { ApprovalHistoryPanel } from '@/components/audit/ApprovalHistoryPanel';
import { PlanRevisionDialog } from '@/components/audit/PlanRevisionDialog';
import { notifyPlanSubmitted, notifyTeamConflict } from '@/services/iaNotificationService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AuditPlansNew() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { userCode } = useUserCode();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ status: 'all', fiscalYear: 'all', boardPack: 'all' });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<any>(null);
  const [submitPlanId, setSubmitPlanId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [conflictResult, setConflictResult] = useState<any>(null);
  const [revisionPlan, setRevisionPlan] = useState<any>(null);

  const { data: plans = [], isLoading } = useIAAnnualPlans();
  const { create, update } = useIAAnnualPlanMutations();
  const startApproval = useStartPlanApproval();
  const checkAvailability = useTeamAvailabilityCheck();

  // Get all fiscal years for filter
  const fiscalYears = useMemo(() => {
    const years = (plans || []).map((p: any) => p.fiscal_year).filter(Boolean);
    return [...new Set(years)].sort().reverse();
  }, [plans]);

  const enrichedPlans = useMemo(() => {
    return (plans || []).map((plan: any) => ({
      ...plan,
      _status: plan.status || 'Draft',
      _boardPackStatus: plan.board_pack_status || 'None',
    }));
  }, [plans]);

  const filteredPlans = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    return enrichedPlans.filter((plan: any) => {
      const matchesSearch = !search || [plan.title, plan.fiscal_year, plan.approved_by, plan.plan_owner]
        .filter(Boolean)
        .some((value: string) => value.toLowerCase().includes(search));
      const matchesStatus = filters.status === 'all' || plan._status === filters.status;
      const matchesFY = filters.fiscalYear === 'all' || plan.fiscal_year === filters.fiscalYear;
      const matchesBP = filters.boardPack === 'all' || plan._boardPackStatus === filters.boardPack;
      return matchesSearch && matchesStatus && matchesFY && matchesBP;
    });
  }, [enrichedPlans, searchTerm, filters]);

  const metrics = useMemo(() => ({
    total: enrichedPlans.length,
    approved: enrichedPlans.filter((p: any) => p._status === 'Approved').length,
    drafts: enrichedPlans.filter((p: any) => ['Draft', 'Submitted', 'Under Review', 'Amendment Pending', 'Rejected'].includes(p._status)).length,
    boardPacks: enrichedPlans.filter((p: any) => p._boardPackStatus !== 'None').length,
  }), [enrichedPlans]);

  const handleSubmitForApproval = async (planId: string) => {
    const plan = enrichedPlans.find((p: any) => p.id === planId);
    try {
      const conflicts = await checkAvailability.mutateAsync({ planId });
      setConflictResult(conflicts);
      if (conflicts.has_blocking) {
        toast({ title: 'Blocking Conflicts Detected', description: `${conflicts.total_conflicts} conflict(s) found.`, variant: 'destructive' });
        notifyTeamConflict(planId, {
          plan_title: plan?.title || 'Audit Plan', conflict_type: 'multiple',
          auditor_name: 'Team', conflict_dates: 'See details', severity: 'blocking',
        });
        return;
      }

      await startApproval.mutateAsync({ planId, submittedBy: userCode || 'SYSTEM', isRevision: false });
      notifyPlanSubmitted(planId, {
        plan_title: plan?.title || 'Audit Plan', fiscal_year: plan?.fiscal_year || '',
        submitted_by: userCode || 'SYSTEM', plan_id: planId,
        department_name: '', risk_level: '',
      });
    } catch (err: any) {
      toast({ title: 'Submission Failed', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitPlanId(null);
    }
  };

  const canSubmitPlan = (plan: any) => ['Draft', 'Rejected'].includes(plan._status) && hasPermission('create_audit_plans');

  const columns: DataTableColumn<any>[] = [
    { key: 'title', header: 'Plan Title', render: (row) => <span className="font-medium">{row.title}</span> },
    { key: 'fiscal_year', header: 'Fiscal Year' },
    { key: 'current_version_number', header: 'Version', render: (row) => <span className="text-xs bg-muted px-1.5 py-0.5 rounded">v{row.current_version_number || 1}</span> },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row._status} /> },
    { key: 'board_pack_status', header: 'Board Pack', render: (row) => <StatusBadge status={row._boardPackStatus} /> },
    { key: 'plan_owner', header: 'Plan Owner', render: (row) => row.plan_owner || '—' },
    { key: 'approved_by', header: 'Approved By', render: (row) => row.approved_by || '—' },
    { key: 'approved_date', header: 'Approved Date', render: (row) => row.approved_date ? formatDateForDisplay(row.approved_date) : '—' },
    { key: 'updated_at', header: 'Last Updated', render: (row) => row.updated_at ? formatDateForDisplay(row.updated_at) : '—' },
  ];

  const filterFields: StandardFilterField[] = [
    {
      key: 'status', label: 'Status', type: 'select', options: [
        { value: 'all', label: 'All Statuses' },
        { value: 'Draft', label: 'Draft' },
        { value: 'Submitted', label: 'Submitted' },
        { value: 'Under Review', label: 'Under Review' },
        { value: 'Approved', label: 'Approved' },
        { value: 'Superseded', label: 'Superseded' },
        { value: 'Amendment Pending', label: 'Amendment Pending' },
        { value: 'Archived', label: 'Archived' },
        { value: 'Rejected', label: 'Rejected' },
      ]
    },
    {
      key: 'fiscalYear', label: 'Fiscal Year', type: 'select',
      options: [{ value: 'all', label: 'All Years' }, ...fiscalYears.map(y => ({ value: y, label: y }))],
    },
    {
      key: 'boardPack', label: 'Board Pack', type: 'select', options: [
        { value: 'all', label: 'All' },
        { value: 'None', label: 'None' },
        { value: 'Generated', label: 'Generated' },
        { value: 'Final', label: 'Final' },
      ]
    },
  ];

  return (
    <PageShell
      title="Annual Audit Plans"
      subtitle="Board-ready annual audit plan portfolio"
      breadcrumbs={[{ label: 'Internal Audit' }, { label: 'Annual Plans' }]}
      isLoading={isLoading}
      actions={<Button onClick={() => setIsCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Create Annual Plan</Button>}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={ClipboardList} label="Total Plans" value={metrics.total} />
        <SummaryCard icon={ClipboardList} label="Approved This Year" value={metrics.approved} />
        <SummaryCard icon={ShieldAlert} label="Drafts / Pending" value={metrics.drafts} />
        <SummaryCard icon={FileText} label="Board Packs" value={metrics.boardPacks} />
      </div>

      {conflictResult && conflictResult.total_conflicts > 0 && (
        <ConflictAlertPanel conflicts={conflictResult.conflicts} onDismiss={() => setConflictResult(null)} />
      )}

      <Card>
        <CardContent className="p-4">
          <StandardSearchFilterBar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search by title, fiscal year, owner, or approver..."
            filters={filterFields}
            filterValues={filters}
            onFilterChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
            onReset={() => setFilters({ status: 'all', fiscalYear: 'all', boardPack: 'all' })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={filteredPlans}
            emptyMessage="No annual audit plans found."
            renderActions={(row) => (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedPlanId(row.id === selectedPlanId ? null : row.id)} title="History">
                  <History className={`h-4 w-4 ${row.id === selectedPlanId ? 'text-primary' : ''}`} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/audit/audit-plans/${row.id}`)} title="View Workspace">
                  <Eye className="h-4 w-4" />
                </Button>
                {!['Approved', 'Superseded', 'Archived', 'Submitted', 'Under Review'].includes(row._status) && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditPlan(row)} title="Edit">
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {['Approved'].includes(row._status) && hasPermission('create_audit_plans') && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600" onClick={() => setRevisionPlan(row)} title="Revise Plan">
                    <FileEdit className="h-4 w-4" />
                  </Button>
                )}
                {canSubmitPlan(row) && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => setSubmitPlanId(row.id)} title="Submit for Approval">
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>

      {selectedPlanId && (
        <Tabs defaultValue="versions" className="w-full">
          <TabsList>
            <TabsTrigger value="versions">Version History</TabsTrigger>
            <TabsTrigger value="approvals">Approval History</TabsTrigger>
          </TabsList>
          <TabsContent value="versions"><PlanVersionHistory planId={selectedPlanId} /></TabsContent>
          <TabsContent value="approvals"><ApprovalHistoryPanel entityId={selectedPlanId} entityType="plan" /></TabsContent>
        </Tabs>
      )}

      <StandardModal open={isCreateOpen} onOpenChange={setIsCreateOpen} title="Create Annual Audit Plan" mode="create" size="4xl">
        <AnnualPlanForm onClose={() => setIsCreateOpen(false)} onCreate={(data) => create.mutateAsync(data)} onUpdate={(data) => update.mutateAsync(data)} />
      </StandardModal>

      <StandardModal open={!!editPlan} onOpenChange={(open) => !open && setEditPlan(null)} title="Edit Annual Audit Plan" mode="edit" size="4xl">
        {editPlan && <AnnualPlanForm plan={editPlan} onClose={() => setEditPlan(null)} onCreate={(data) => create.mutateAsync(data)} onUpdate={(data) => update.mutateAsync(data)} />}
      </StandardModal>

      <ConfirmDialog
        open={submitPlanId !== null}
        onOpenChange={() => setSubmitPlanId(null)}
        title="Submit Plan for Approval"
        description="This will run team availability checks and submit the annual plan through the approval workflow."
        onConfirm={() => submitPlanId && handleSubmitForApproval(submitPlanId)}
      />

      <PlanRevisionDialog open={!!revisionPlan} onOpenChange={(open) => !open && setRevisionPlan(null)} plan={revisionPlan} />
    </PageShell>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="rounded-lg bg-primary/10 p-3 text-primary"><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
