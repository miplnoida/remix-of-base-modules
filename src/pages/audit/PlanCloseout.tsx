import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIAAnnualPlans, useIAAnnualPlanMutations, useIAActivities, useIAFindings, useIAManagementResponses } from '@/hooks/useAuditData';
import { PageShell, DataTable, StatusBadge, ConfirmDialog, EntityModal } from '@/components/common';
import type { DataTableColumn } from '@/components/common';

export default function PlanCloseout() {
  const { hasPermission } = useAuth();
  const [closeoutComments, setCloseoutComments] = useState('');
  const [isCloseoutDialogOpen, setIsCloseoutDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  const { data: plans = [], isLoading } = useIAAnnualPlans();
  const { data: activities = [] } = useIAActivities();
  const { data: findings = [] } = useIAFindings();
  const { data: responses = [] } = useIAManagementResponses();
  const { update } = useIAAnnualPlanMutations();

  const completedPlans = plans.filter((p: any) => p.status === 'In Progress' || p.status === 'Approved');

  const getPlanSummary = (planId: string) => {
    const planActivities = activities.filter((a: any) => a.plan_id === planId);
    const completed = planActivities.filter((a: any) => a.status === 'Completed');
    const planFindings = findings.filter((f: any) => f.plan_id === planId);
    const responded = planFindings.filter((f: any) => responses.some((r: any) => r.finding_id === f.id && r.status === 'Accepted'));
    return { totalActivities: planActivities.length, completedActivities: completed.length, totalFindings: planFindings.length, respondedFindings: responded.length };
  };

  const confirmCloseout = () => {
    if (!selectedPlan) return;
    update.mutate({ id: selectedPlan.id, status: 'Completed', closeout_comments: closeoutComments, closeout_date: new Date().toISOString() });
    setIsCloseoutDialogOpen(false);
    setCloseoutComments('');
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'title', header: 'Plan Title', render: (plan) => <span className="font-medium">{plan.title}</span> },
    { key: 'fiscal_year', header: 'Fiscal Year' },
    { key: 'status', header: 'Status', render: (plan) => <StatusBadge status={plan.status} /> },
    { key: 'summary', header: 'Progress', render: (plan) => {
      const s = getPlanSummary(plan.id);
      return (
        <div className="flex gap-4 text-sm">
          <span>Activities: {s.completedActivities}/{s.totalActivities}</span>
          <span>Findings: {s.totalFindings}</span>
          <span>Responses: {s.respondedFindings}/{s.totalFindings}</span>
        </div>
      );
    }},
  ];

  return (
    <PageShell
      title="Department Audit Closeout"
      subtitle="Review and close completed audits"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/plans' }, { label: 'Plan Closeout' }]}
      isLoading={isLoading}
      noPermission={!hasPermission('approve_audit_closeouts')}
    >
      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={completedPlans}
            emptyMessage="No plans ready for closeout"
            renderActions={(plan) => (
              <Button
                size="sm"
                onClick={() => { setSelectedPlan(plan); setIsCloseoutDialogOpen(true); }}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-1" />Close Out
              </Button>
            )}
          />
        </CardContent>
      </Card>

      <EntityModal
        open={isCloseoutDialogOpen}
        onOpenChange={setIsCloseoutDialogOpen}
        title="Close Out Audit Plan"
        mode="edit"
        onSave={confirmCloseout}
        saveLabel="Complete Closeout"
        isSaving={update.isPending}
      >
        {selectedPlan && <p className="mb-4"><strong>Plan:</strong> {selectedPlan.title}</p>}
        <div className="space-y-2">
          <Label>Closeout Comments</Label>
          <Textarea value={closeoutComments} onChange={(e) => setCloseoutComments(e.target.value)} placeholder="Enter closeout comments..." />
        </div>
      </EntityModal>
    </PageShell>
  );
}
