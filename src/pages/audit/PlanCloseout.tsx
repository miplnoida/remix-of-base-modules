import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, Eye, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIAAnnualPlans, useIAAnnualPlanMutations, useIAActivities, useIAFindings, useIAManagementResponses, useIAFollowUps } from '@/hooks/useAuditData';
import { PageShell, SearchBar, FilterBar, DataTable, StatusBadge, EntityModal, ConfirmDialog } from '@/components/common';
import type { DataTableColumn, FilterField } from '@/components/common';

export default function PlanCloseout() {
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ status: 'all' });
  const [closeoutComments, setCloseoutComments] = useState('');
  const [isCloseoutOpen, setIsCloseoutOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [viewPlan, setViewPlan] = useState<any>(null);
  const [openItemsWarning, setOpenItemsWarning] = useState<string[]>([]);

  const { data: plans = [], isLoading } = useIAAnnualPlans();
  const { data: activities = [] } = useIAActivities();
  const { data: findings = [] } = useIAFindings();
  const { data: responses = [] } = useIAManagementResponses();
  const { data: followUps = [] } = useIAFollowUps();
  const { update } = useIAAnnualPlanMutations();

  const closablePlans = plans.filter((p: any) => ['In Progress', 'Approved'].includes(p.status));

  const filteredPlans = closablePlans.filter((p: any) => {
    const matchesSearch = (p.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || (p.fiscal_year || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filters.status === 'all' || p.status === filters.status;
    return matchesSearch && matchesStatus;
  });

  const getPlanSummary = (planId: string) => {
    const planActivities = activities.filter((a: any) => a.plan_id === planId);
    const completed = planActivities.filter((a: any) => a.status === 'Completed');
    const planFindings = findings.filter((f: any) => f.plan_id === planId);
    const pendingFollowUps = followUps.filter((fu: any) => fu.plan_id === planId && fu.status !== 'Resolved');
    const completion = planActivities.length > 0 ? Math.round((completed.length / planActivities.length) * 100) : 0;
    return { totalActivities: planActivities.length, completedActivities: completed.length, totalFindings: planFindings.length, pendingFollowUps: pendingFollowUps.length, completion };
  };

  const handleCloseout = (plan: any) => {
    const summary = getPlanSummary(plan.id);
    const warnings: string[] = [];
    if (summary.totalActivities > summary.completedActivities) warnings.push(`${summary.totalActivities - summary.completedActivities} activities not completed`);
    if (summary.pendingFollowUps > 0) warnings.push(`${summary.pendingFollowUps} pending follow-ups`);
    setOpenItemsWarning(warnings);
    setSelectedPlan(plan);
    setCloseoutComments('');
    setIsCloseoutOpen(true);
  };

  const confirmCloseout = () => {
    if (!selectedPlan) return;
    update.mutate({ id: selectedPlan.id, status: 'Completed', closeout_comments: closeoutComments, closeout_date: new Date().toISOString() });
    setIsCloseoutOpen(false);
  };

  const filterFields: FilterField[] = [
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'all', label: 'All' }, { value: 'In Progress', label: 'In Progress' }, { value: 'Approved', label: 'Approved' },
    ]},
  ];

  const columns: DataTableColumn<any>[] = [
    { key: 'fiscal_year', header: 'Fiscal Year', render: (p) => <span className="font-medium">{p.fiscal_year}</span> },
    { key: 'title', header: 'Plan Name' },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
    { key: 'progress', header: 'Progress', render: (p) => {
      const s = getPlanSummary(p.id);
      return (
        <div className="space-y-1">
          <div className="text-sm">Activities: {s.completedActivities}/{s.totalActivities}</div>
          <div className="w-full bg-muted rounded-full h-2">
            <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${s.completion}%` }} />
          </div>
          <div className="text-xs text-muted-foreground">{s.completion}% complete</div>
        </div>
      );
    }},
    { key: 'findings', header: 'Findings', render: (p) => getPlanSummary(p.id).totalFindings },
  ];

  return (
    <PageShell
      title="Plan Closeout"
      subtitle="Review and close completed audit plans"
      breadcrumbs={[{ label: 'Internal Audit' }, { label: 'Plan Closeout' }]}
      isLoading={isLoading}
      noPermission={!hasPermission('approve_audit_closeouts')}
    >
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search plans..." />
            <FilterBar filters={filterFields} values={filters} onChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))} onReset={() => setFilters({ status: 'all' })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Plans Ready for Closeout ({filteredPlans.length})</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredPlans}
            emptyMessage="No plans ready for closeout"
            renderActions={(plan) => (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewPlan(plan)}><Eye className="h-4 w-4" /></Button>
                <Button size="sm" onClick={() => handleCloseout(plan)} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4 mr-1" />Close Out
                </Button>
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* View Plan Summary */}
      <EntityModal open={!!viewPlan} onOpenChange={() => setViewPlan(null)} title="Plan Summary" mode="view">
        {viewPlan && (() => {
          const s = getPlanSummary(viewPlan.id);
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground">Fiscal Year</Label><p className="font-medium">{viewPlan.fiscal_year}</p></div>
                <div><Label className="text-muted-foreground">Status</Label><div className="mt-1"><StatusBadge status={viewPlan.status} /></div></div>
                <div><Label className="text-muted-foreground">Title</Label><p>{viewPlan.title}</p></div>
                <div><Label className="text-muted-foreground">Completion</Label><p>{s.completion}%</p></div>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-2">
                <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{s.completedActivities}/{s.totalActivities}</p><p className="text-xs text-muted-foreground">Activities</p></CardContent></Card>
                <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{s.totalFindings}</p><p className="text-xs text-muted-foreground">Findings</p></CardContent></Card>
                <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{s.pendingFollowUps}</p><p className="text-xs text-muted-foreground">Pending Follow-ups</p></CardContent></Card>
              </div>
            </div>
          );
        })()}
      </EntityModal>

      {/* Closeout Modal */}
      <EntityModal
        open={isCloseoutOpen}
        onOpenChange={setIsCloseoutOpen}
        title="Close Out Audit Plan"
        mode="edit"
        onSave={confirmCloseout}
        saveLabel="Complete Closeout"
        isSaving={update.isPending}
      >
        {selectedPlan && (
          <div className="space-y-4">
            <p><strong>Plan:</strong> {selectedPlan.title} ({selectedPlan.fiscal_year})</p>
            {openItemsWarning.length > 0 && (
              <div className="border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 font-medium">
                  <AlertTriangle className="h-4 w-4" />Open Items Warning
                </div>
                {openItemsWarning.map((w, i) => <p key={i} className="text-sm text-orange-600 dark:text-orange-400 ml-6">• {w}</p>)}
              </div>
            )}
            <div className="space-y-2">
              <Label>Closeout Comments</Label>
              <Textarea value={closeoutComments} onChange={(e) => setCloseoutComments(e.target.value)} placeholder="Enter closeout comments..." />
            </div>
          </div>
        )}
      </EntityModal>
    </PageShell>
  );
}
