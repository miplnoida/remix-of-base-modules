import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { auditPlans, auditPlanEmployers, zones, employers } from '@/data/auditData';
import { useToast } from '@/hooks/use-toast';

export default function PlanApproval() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [approvalComments, setApprovalComments] = useState('');
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');

  const pendingPlans = auditPlans.filter(plan => plan.status === 'Submitted');

  const handleApprovalAction = (plan: any, action: 'approve' | 'reject') => {
    setSelectedPlan(plan);
    setApprovalAction(action);
    setApprovalComments('');
    setIsApprovalDialogOpen(true);
  };

  const confirmApproval = () => {
    if (approvalAction === 'approve') {
      toast({
        title: "Plan Approved",
        description: "Audit plan has been approved and activities can now be scheduled."
      });
    } else {
      toast({
        title: "Plan Rejected",
        description: "Audit plan has been rejected and returned to the officer."
      });
    }
    setIsApprovalDialogOpen(false);
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      'Submitted': 'bg-blue-500',
      'Approved': 'bg-green-500',
      'Rejected': 'bg-red-500'
    };
    return <Badge className={colors[status as keyof typeof colors] || 'bg-gray-500'}>{status}</Badge>;
  };

  const getPlanEmployers = (planId: string) => {
    return auditPlanEmployers.filter(pe => pe.planId === planId);
  };

  if (!hasPermission('approve_audit_plans')) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">You don't have permission to approve audit plans.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Plan Approval</h1>
        <p className="text-muted-foreground">Review and approve submitted audit plans</p>
      </div>

      {/* Pending Approvals */}
      <Card>
        <CardHeader>
          <CardTitle>Plans Awaiting Approval ({pendingPlans.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingPlans.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No plans awaiting approval</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan Details</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Employers</TableHead>
                  <TableHead>Submitted Date</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingPlans.map((plan) => {
                  const planEmployers = getPlanEmployers(plan.id);
                  const zoneName = zones.find(z => z.id === plan.zone)?.name;
                  
                  return (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{plan.monthYear}</div>
                          <div className="text-sm text-muted-foreground">{plan.period}</div>
                          {getStatusBadge(plan.status)}
                        </div>
                      </TableCell>
                      <TableCell>{zoneName}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{planEmployers.length} assigned</div>
                          <div className="text-sm text-muted-foreground">
                            High: {planEmployers.filter(pe => pe.riskRating === 'High').length} |
                            Medium: {planEmployers.filter(pe => pe.riskRating === 'Medium').length} |
                            Low: {planEmployers.filter(pe => pe.riskRating === 'Low').length}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{plan.submittedDate ? new Date(plan.submittedDate).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>{plan.createdBy}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Plan Details - {plan.monthYear} ({zoneName})</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Card>
                                  <CardHeader>
                                    <CardTitle>Employer Assignments</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Employer</TableHead>
                                          <TableHead>Risk Rating</TableHead>
                                          <TableHead>Auditor</TableHead>
                                          <TableHead>Rationale</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {planEmployers.map((pe) => (
                                          <TableRow key={pe.id}>
                                            <TableCell>
                                              <div>
                                                <div className="font-medium">{pe.employer.name}</div>
                                                <div className="text-sm text-muted-foreground">{pe.employer.registrationNumber}</div>
                                              </div>
                                            </TableCell>
                                            <TableCell>
                                              <Badge className={
                                                pe.riskRating === 'High' ? 'bg-red-500' :
                                                pe.riskRating === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                                              }>
                                                {pe.riskRating}
                                              </Badge>
                                            </TableCell>
                                            <TableCell>{pe.auditorName || 'Not assigned'}</TableCell>
                                            <TableCell>{pe.rationale}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </CardContent>
                                </Card>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button 
                            size="sm" 
                            onClick={() => handleApprovalAction(plan, 'approve')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleApprovalAction(plan, 'reject')}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === 'approve' ? 'Approve' : 'Reject'} Audit Plan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPlan && (
              <div>
                <p><strong>Plan:</strong> {selectedPlan.monthYear}</p>
                <p><strong>Zone:</strong> {zones.find(z => z.id === selectedPlan.zone)?.name}</p>
                <p><strong>Created by:</strong> {selectedPlan.createdBy}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="comments">
                {approvalAction === 'approve' ? 'Approval Comments' : 'Rejection Reason'}
              </Label>
              <Textarea
                id="comments"
                placeholder={
                  approvalAction === 'approve' 
                    ? "Enter approval comments (optional)..." 
                    : "Please provide reason for rejection..."
                }
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
                required={approvalAction === 'reject'}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsApprovalDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={confirmApproval}
                className={approvalAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
                variant={approvalAction === 'reject' ? 'destructive' : 'default'}
                disabled={approvalAction === 'reject' && !approvalComments.trim()}
              >
                {approvalAction === 'approve' ? 'Approve Plan' : 'Reject Plan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}