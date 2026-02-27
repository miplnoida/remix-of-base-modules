import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIAAnnualPlans, useIAAnnualPlanMutations } from '@/hooks/useAuditData';
import { useToast } from '@/hooks/use-toast';

export default function PlanApproval() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [approvalComments, setApprovalComments] = useState('');
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  const { data: plans = [], isLoading } = useIAAnnualPlans();
  const { update } = useIAAnnualPlanMutations();

  const pendingPlans = plans.filter((p: any) => p.status === 'Submitted');

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

  if (!hasPermission('approve_audit_plans')) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">You don't have permission to approve audit plans.</p></div>;
  }

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Plan Approval</h1>
        <p className="text-muted-foreground">Review and approve submitted audit plans</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Plans Awaiting Approval ({pendingPlans.length})</CardTitle></CardHeader>
        <CardContent>
          {pendingPlans.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No plans awaiting approval</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fiscal Year</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Objective</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingPlans.map((plan: any) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.fiscal_year}</TableCell>
                    <TableCell>{plan.title}</TableCell>
                    <TableCell className="max-w-xs truncate">{plan.objective}</TableCell>
                    <TableCell>{plan.created_at ? new Date(plan.created_at).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button size="sm" onClick={() => handleApprovalAction(plan, 'approve')} className="bg-green-600 hover:bg-green-700">
                          <CheckCircle className="w-4 h-4 mr-1" />Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleApprovalAction(plan, 'reject')}>
                          <XCircle className="w-4 h-4 mr-1" />Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{approvalAction === 'approve' ? 'Approve' : 'Reject'} Audit Plan</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {selectedPlan && (
              <div>
                <p><strong>Plan:</strong> {selectedPlan.title}</p>
                <p><strong>Fiscal Year:</strong> {selectedPlan.fiscal_year}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>{approvalAction === 'approve' ? 'Approval Comments' : 'Rejection Reason'}</Label>
              <Textarea value={approvalComments} onChange={(e) => setApprovalComments(e.target.value)} placeholder={approvalAction === 'approve' ? "Enter approval comments (optional)..." : "Please provide reason for rejection..."} required={approvalAction === 'reject'} />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsApprovalDialogOpen(false)}>Cancel</Button>
              <Button onClick={confirmApproval} className={approvalAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''} variant={approvalAction === 'reject' ? 'destructive' : 'default'} disabled={approvalAction === 'reject' && !approvalComments.trim()}>
                {approvalAction === 'approve' ? 'Approve Plan' : 'Reject Plan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
