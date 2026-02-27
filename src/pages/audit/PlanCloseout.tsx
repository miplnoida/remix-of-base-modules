import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIAAnnualPlans, useIAAnnualPlanMutations, useIAActivities, useIAFindings, useIAManagementResponses } from '@/hooks/useAuditData';
import { useToast } from '@/hooks/use-toast';

export default function PlanCloseout() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
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
  };

  if (!hasPermission('approve_audit_closeouts')) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">No permission.</p></div>;
  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Department Audit Closeout</h1><p className="text-muted-foreground">Review and close completed audits</p></div>

      <Card>
        <CardHeader><CardTitle>Plans Ready for Closeout ({completedPlans.length})</CardTitle></CardHeader>
        <CardContent>
          {completedPlans.length === 0 ? <p className="text-center text-muted-foreground py-8">No plans ready for closeout</p> : (
            <div className="space-y-4">
              {completedPlans.map((plan: any) => {
                const summary = getPlanSummary(plan.id);
                return (
                  <Card key={plan.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-4 flex-1">
                          <h3 className="text-lg font-semibold">{plan.title}</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-3 bg-muted rounded-lg"><div className="text-2xl font-bold">{summary.completedActivities}/{summary.totalActivities}</div><div className="text-sm text-muted-foreground">Activities</div></div>
                            <div className="text-center p-3 bg-muted rounded-lg"><div className="text-2xl font-bold">{summary.totalFindings}</div><div className="text-sm text-muted-foreground">Findings</div></div>
                            <div className="text-center p-3 bg-muted rounded-lg"><div className="text-2xl font-bold">{summary.respondedFindings}/{summary.totalFindings}</div><div className="text-sm text-muted-foreground">Responses</div></div>
                          </div>
                        </div>
                        <Button onClick={() => { setSelectedPlan(plan); setIsCloseoutDialogOpen(true); }} className="bg-green-600 hover:bg-green-700"><CheckCircle className="w-4 h-4 mr-2" />Close Out</Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCloseoutDialogOpen} onOpenChange={setIsCloseoutDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Close Out Audit Plan</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {selectedPlan && <p><strong>Plan:</strong> {selectedPlan.title}</p>}
            <div className="space-y-2"><Label>Closeout Comments</Label><Textarea value={closeoutComments} onChange={(e) => setCloseoutComments(e.target.value)} placeholder="Enter comments..." /></div>
            <div className="flex justify-end space-x-2"><Button variant="outline" onClick={() => setIsCloseoutDialogOpen(false)}>Cancel</Button><Button onClick={confirmCloseout} className="bg-green-600 hover:bg-green-700">Complete Closeout</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
