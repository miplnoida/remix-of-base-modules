import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useUserCode } from '@/hooks/useUserCode';
import {
  useIAAnnualPlans,
  useIAAnnualPlanMutations,
  useIADepartmentAudits,
  useIADepartmentAuditMutations,
  useIAFindings,
  useIAFollowUps,
  useIAAuditors,
} from '@/hooks/useAuditData';
import { useIAEngagements } from '@/hooks/useAuditDataPhase2';
import { PageShell, StandardSearchFilterBar, DataTable, StatusBadge, EntityModal, ConfirmDialog, StandardModal } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { EngagementFilterBanner } from '@/components/audit/EngagementFilterBanner';
import { Progress } from '@/components/ui/progress';
import { notifyPlanClosed } from '@/services/auditNotificationService';
import { useToast } from '@/hooks/use-toast';

const FINAL_RATINGS = ['Satisfactory', 'Needs Improvement', 'Unsatisfactory'];

interface CloseoutRow {
  id: string;
  sourceType: 'annual' | 'department';
  planType: 'Annual' | 'Department';
  fiscalYear: string;
  planName: string;
  department: string;
  departmentId?: string;
  period: string;
  status: string;
  final_rating?: string;
  closure_notes?: string;
  closure_approved_by?: string;
  closure_approval_date?: string;
}

export default function PlanCloseout() {
  const { hasPermission } = useAuth();
  const { userCode } = useUserCode();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ fiscalYear: 'all', planType: 'all', status: 'all' });

  const [viewItem, setViewItem] = useState<CloseoutRow | null>(null);
  const [closeItem, setCloseItem] = useState<CloseoutRow | null>(null);
  const [reopenItem, setReopenItem] = useState<CloseoutRow | null>(null);

  const [finalRating, setFinalRating] = useState('');
  const [closureNotes, setClosureNotes] = useState('');
  const [closureApprovedBy, setClosureApprovedBy] = useState('');
  const [closureApprovalDate, setClosureApprovalDate] = useState(new Date().toISOString().slice(0, 10));
  const [checkFindings, setCheckFindings] = useState(false);
  const [checkResponses, setCheckResponses] = useState(false);
  const [checkEvidence, setCheckEvidence] = useState(false);
  const [checkSupervisor, setCheckSupervisor] = useState(false);

  const { data: annualPlans = [], isLoading: annualLoading } = useIAAnnualPlans();
  const { data: departmentAudits = [], isLoading: deptLoading } = useIADepartmentAudits();
  const { data: allEngagements = [] } = useIAEngagements();
  const { data: findings = [] } = useIAFindings();
  const { data: followUps = [] } = useIAFollowUps();
  const { data: auditors = [] } = useIAAuditors();

  const { update: updateAnnual } = useIAAnnualPlanMutations();
  const { update: updateDepartment } = useIADepartmentAuditMutations();

  const planById = useMemo(
    () => new Map((annualPlans || []).map((plan: any) => [plan.id, plan])),
    [annualPlans]
  );

  const allRows = useMemo<CloseoutRow[]>(() => {
    const annualRows = (annualPlans || []).map((plan: any) => ({
      id: plan.id,
      sourceType: 'annual' as const,
      planType: 'Annual' as const,
      fiscalYear: plan.fiscal_year || '-',
      planName: plan.title || 'Annual Plan',
      department: '-',
      departmentId: plan.department_id,
      period: plan.fiscal_year || '-',
      status: plan.status || 'Draft',
    }));

    const departmentRows = (departmentAudits || []).map((audit: any) => ({
      id: audit.id,
      sourceType: 'department' as const,
      planType: 'Department' as const,
      fiscalYear: planById.get(audit.annual_plan_id)?.fiscal_year || '-',
      planName: audit.department_name || 'Department Audit',
      department: audit.department_name || '-',
      departmentId: audit.department_id,
      period: audit.period || '-',
      status: audit.status || 'Draft',
      final_rating: audit.final_rating,
      closure_notes: audit.closure_notes,
      closure_approved_by: audit.closure_approved_by,
      closure_approval_date: audit.closure_approval_date,
    }));

    return [...annualRows, ...departmentRows];
  }, [annualPlans, departmentAudits, planById]);

  const fiscalYears = useMemo(() => {
    const values = allRows.map((row) => row.fiscalYear).filter((value) => value && value !== '-');
    return [...new Set(values)];
  }, [allRows]);

  // Engagement-based progress for annual plans
  const getProgress = (row: CloseoutRow) => {
    if (row.sourceType === 'annual') {
      const planEngagements = (allEngagements || []).filter((e: any) => e.annual_plan_id === row.id);
      const closed = planEngagements.filter((e: any) => ['Closed', 'Completed'].includes(e.status));
      return planEngagements.length === 0 ? 0 : Math.round((closed.length / planEngagements.length) * 100);
    }
    // Department audits — fallback
    return row.status === 'Completed' || row.status === 'Closed' ? 100 : 0;
  };

  const getEngagementStats = (row: CloseoutRow) => {
    if (row.sourceType !== 'annual') return null;
    const planEngagements = (allEngagements || []).filter((e: any) => e.annual_plan_id === row.id);
    const closed = planEngagements.filter((e: any) => ['Closed', 'Completed'].includes(e.status));
    return { total: planEngagements.length, closed: closed.length };
  };

  const canClose = (row: CloseoutRow): { allowed: boolean; reason?: string } => {
    if (row.sourceType === 'annual') {
      const stats = getEngagementStats(row);
      if (!stats || stats.total === 0) return { allowed: false, reason: 'No engagements found under this plan.' };
      if (stats.closed < stats.total) return { allowed: false, reason: `Audit Plan cannot be closed because some audits are still in progress. (${stats.closed}/${stats.total} completed)` };
      return { allowed: true };
    }
    return { allowed: true };
  };

  const filteredRows = allRows.filter((row) => {
    const matchesSearch =
      row.planName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFiscalYear = filters.fiscalYear === 'all' || row.fiscalYear === filters.fiscalYear;
    const matchesPlanType = filters.planType === 'all' || row.planType === filters.planType;
    const matchesStatus = filters.status === 'all' || row.status === filters.status;

    return matchesSearch && matchesFiscalYear && matchesPlanType && matchesStatus;
  });

  const columns: DataTableColumn<CloseoutRow>[] = [
    { key: 'id', header: 'Plan ID', render: (row) => <span className="font-medium">{row.id.slice(0, 8)}</span> },
    { key: 'planName', header: 'Plan Name' },
    { key: 'department', header: 'Department' },
    { key: 'period', header: 'Period' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'completion', header: 'Completion', render: (row) => {
      const pct = getProgress(row);
      return (
        <div className="flex items-center gap-2 min-w-[100px]">
          <Progress value={pct} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
        </div>
      );
    }},
    { key: 'final_rating', header: 'Final Rating', render: (row) => row.final_rating ? <StatusBadge status={row.final_rating} /> : '—' },
  ];

  const filterFields: StandardFilterField[] = [
    { key: 'fiscalYear', label: 'Fiscal Year', type: 'select', options: [{ value: 'all', label: 'All Years' }, ...fiscalYears.map((year) => ({ value: year, label: year }))] },
    { key: 'planType', label: 'Plan Type', type: 'select', options: [{ value: 'all', label: 'All Types' }, { value: 'Annual', label: 'Annual' }, { value: 'Department', label: 'Department' }] },
    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'all', label: 'All Statuses' }, { value: 'In Progress', label: 'In Progress' }, { value: 'Active', label: 'Active' }, { value: 'Completed', label: 'Completed' }, { value: 'Closed', label: 'Closed' }] },
  ];

  const openCloseModal = (row: CloseoutRow) => {
    const check = canClose(row);
    if (!check.allowed) {
      toast({ title: 'Cannot Close Plan', description: check.reason, variant: 'destructive' });
      return;
    }
    setFinalRating('');
    setClosureNotes('');
    setClosureApprovedBy('');
    setClosureApprovalDate(new Date().toISOString().slice(0, 10));
    setCheckFindings(false);
    setCheckResponses(false);
    setCheckEvidence(false);
    setCheckSupervisor(false);
    setCloseItem(row);
  };

  const handleCloseSubmit = () => {
    if (!closeItem) return;
    const payload: any = {
      id: closeItem.id,
      status: 'Closed',
      is_closed: true,
      closed_date: new Date().toISOString(),
      closed_by: userCode || 'system',
      final_rating: finalRating || null,
      closure_notes: closureNotes || null,
      closure_approved_by: closureApprovedBy || null,
      closure_approval_date: closureApprovalDate || null,
    };

    if (closeItem.sourceType === 'annual') {
      updateAnnual.mutate(payload);
      if (closeItem.departmentId) {
        notifyPlanClosed(closeItem.planName, closeItem.departmentId).catch(console.error);
      }
    } else {
      updateDepartment.mutate(payload);
    }
    setCloseItem(null);
  };

  const allChecked = checkFindings && checkResponses && checkEvidence && checkSupervisor;

  return (
    <PageShell title="Plan Closeout" subtitle="Close completed audit plans with formal approval"
      breadcrumbs={[{ label: 'Internal Audit' }, { label: 'Plan Closeout' }]}
      isLoading={annualLoading || deptLoading}>

      <EngagementFilterBanner />
      <StandardSearchFilterBar searchValue={searchTerm} onSearchChange={setSearchTerm} searchPlaceholder="Search plan id, name, or department..."
        filters={filterFields} filterValues={filters} onFilterChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        onReset={() => setFilters({ fiscalYear: 'all', planType: 'all', status: 'all' })} />

      <Card>
        <CardContent className="pt-6">
          <DataTable columns={columns} data={filteredRows} emptyMessage="No plans found"
            renderActions={(row) => (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewItem(row)}><Eye className="h-4 w-4" /></Button>
                {row.status !== 'Closed' && row.status !== 'Completed' && <Button size="sm" onClick={() => openCloseModal(row)}>Close Plan</Button>}
                {(row.status === 'Completed' || row.status === 'Closed') && hasPermission('configure_audit_system') && (
                  <Button size="sm" variant="outline" onClick={() => setReopenItem(row)}>Reopen</Button>
                )}
              </div>
            )} />
        </CardContent>
      </Card>

      {/* View Modal */}
      <EntityModal open={!!viewItem} onOpenChange={() => setViewItem(null)} title="Plan Summary" mode="view">
        {viewItem && (
          <div className="space-y-3">
            <p><strong>Plan ID:</strong> {viewItem.id.slice(0, 8)}</p>
            <p><strong>Plan Type:</strong> {viewItem.planType}</p>
            <p><strong>Plan Name:</strong> {viewItem.planName}</p>
            <p><strong>Department:</strong> {viewItem.department}</p>
            <p><strong>Status:</strong> <StatusBadge status={viewItem.status} /></p>
            <p><strong>Completion:</strong> {getProgress(viewItem)}%</p>
            {viewItem.sourceType === 'annual' && (() => {
              const stats = getEngagementStats(viewItem);
              if (!stats) return null;
              return <p><strong>Engagements:</strong> {stats.closed}/{stats.total} closed</p>;
            })()}
            {viewItem.final_rating && <p><strong>Final Rating:</strong> <StatusBadge status={viewItem.final_rating} /></p>}
            {viewItem.closure_notes && <p><strong>Closure Notes:</strong> {viewItem.closure_notes}</p>}
            {viewItem.closure_approved_by && <p><strong>Approved By:</strong> {viewItem.closure_approved_by}</p>}
            {viewItem.closure_approval_date && <p><strong>Closure Approval Date:</strong> {viewItem.closure_approval_date}</p>}
          </div>
        )}
      </EntityModal>

      {/* Closeout Form Modal */}
      <StandardModal open={!!closeItem} onOpenChange={() => setCloseItem(null)}
        title="Audit Closeout" mode="create" onSave={handleCloseSubmit}
        saveLabel="Confirm Closure" isSaving={updateAnnual.isPending || updateDepartment.isPending}>
        {closeItem && (
          <div className="space-y-5">
            <div className="p-3 rounded-md bg-muted">
              <p className="text-sm"><strong>Plan:</strong> {closeItem.planName}</p>
              <p className="text-sm"><strong>Department:</strong> {closeItem.department}</p>
              <p className="text-sm"><strong>Completion:</strong> {getProgress(closeItem)}%</p>
            </div>

            {/* Closure Checklist */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Closure Checklist</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="check-findings" checked={checkFindings} onCheckedChange={(v) => setCheckFindings(!!v)} />
                  <label htmlFor="check-findings" className="text-sm">All findings reviewed</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="check-responses" checked={checkResponses} onCheckedChange={(v) => setCheckResponses(!!v)} />
                  <label htmlFor="check-responses" className="text-sm">Management responses received</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="check-evidence" checked={checkEvidence} onCheckedChange={(v) => setCheckEvidence(!!v)} />
                  <label htmlFor="check-evidence" className="text-sm">Evidence verified</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="check-supervisor" checked={checkSupervisor} onCheckedChange={(v) => setCheckSupervisor(!!v)} />
                  <label htmlFor="check-supervisor" className="text-sm">Supervisor approval obtained</label>
                </div>
              </div>
            </div>

            {/* Closure Fields */}
            <div>
              <Label>Final Audit Rating <span className="text-destructive">*</span></Label>
              <Select value={finalRating} onValueChange={setFinalRating}>
                <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
                <SelectContent>
                  {FINAL_RATINGS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Closure Notes</Label>
              <Textarea value={closureNotes} onChange={e => setClosureNotes(e.target.value)} placeholder="Summary notes for audit closure..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Approved By</Label>
                <Select value={closureApprovedBy} onValueChange={setClosureApprovedBy}>
                  <SelectTrigger><SelectValue placeholder="Select approver" /></SelectTrigger>
                  <SelectContent>
                    {(auditors as any[]).map((a: any) => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Closure Approval Date</Label>
                <Input type="date" value={closureApprovalDate} onChange={e => setClosureApprovalDate(e.target.value)} />
              </div>
            </div>

            {!allChecked && (
              <p className="text-xs text-muted-foreground italic">Please complete all checklist items before closing.</p>
            )}
          </div>
        )}
      </StandardModal>

      {/* Reopen Confirm */}
      <ConfirmDialog open={!!reopenItem} onOpenChange={() => setReopenItem(null)}
        title="Reopen Plan" description="Are you sure you want to reopen this plan?"
        confirmLabel="Reopen"
        onConfirm={() => {
          if (!reopenItem) return;
          const payload = { id: reopenItem.id, status: 'Active', is_closed: false };
          if (reopenItem.sourceType === 'annual') updateAnnual.mutate(payload);
          else updateDepartment.mutate(payload);
          setReopenItem(null);
        }}
        isLoading={updateAnnual.isPending || updateDepartment.isPending} />
    </PageShell>
  );
}
