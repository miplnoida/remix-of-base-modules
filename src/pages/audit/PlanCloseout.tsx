import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, FileText, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { auditPlans, auditPlanEmployers, auditActivities, auditActivityResults, zones } from '@/data/auditData';
import { useToast } from '@/hooks/use-toast';

export default function PlanCloseout() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [closeoutComments, setCloseoutComments] = useState('');
  const [isCloseoutDialogOpen, setIsCloseoutDialogOpen] = useState(false);

  const completedPlans = auditPlans.filter(plan => plan.status === 'In Progress');

  const getPlanSummary = (planId: string) => {
    const planEmployers = auditPlanEmployers.filter(pe => pe.planId === planId);
    const planActivities = auditActivities.filter(a => a.planId === planId);
    const completedActivities = planActivities.filter(a => a.status === 'Completed');
    const results = auditActivityResults.filter(r => 
      planActivities.some(a => a.id === r.activityId)
    );
    
    const complianceStats = results.reduce((acc, result) => {
      acc[result.complianceStatus] = (acc[result.complianceStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalVariance = results.reduce((sum, result) => sum + result.monetaryVariance, 0);

    return {
      totalEmployers: planEmployers.length,
      totalActivities: planActivities.length,
      completedActivities: completedActivities.length,
      complianceStats,
      totalVariance,
      results
    };
  };

  const handleCloseoutPlan = (plan: any) => {
    setSelectedPlan(plan);
    setCloseoutComments('');
    setIsCloseoutDialogOpen(true);
  };

  const confirmCloseout = () => {
    toast({
      title: "Plan Closed Out",
      description: "Audit plan has been completed and closed out successfully."
    });
    setIsCloseoutDialogOpen(false);
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      'In Progress': 'bg-yellow-500',
      'Completed': 'bg-green-500'
    };
    return <Badge className={colors[status as keyof typeof colors] || 'bg-gray-500'}>{status}</Badge>;
  };

  const getComplianceBadge = (status: string) => {
    const colors = {
      'Compliant': 'bg-green-500',
      'Partially Compliant': 'bg-yellow-500',
      'Non-Compliant': 'bg-red-500'
    };
    return <Badge className={colors[status as keyof typeof colors] || 'bg-gray-500'}>{status}</Badge>;
  };

  if (!hasPermission('approve_audit_closeouts')) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">You don't have permission to approve plan closeouts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Plan Closeout</h1>
        <p className="text-muted-foreground">Review and approve plan closeouts</p>
      </div>

      {/* Plans Ready for Closeout */}
      <Card>
        <CardHeader>
          <CardTitle>Plans Ready for Closeout ({completedPlans.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {completedPlans.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No plans ready for closeout</p>
          ) : (
            <div className="space-y-4">
              {completedPlans.map((plan) => {
                const summary = getPlanSummary(plan.id);
                const zoneName = zones.find(z => z.id === plan.zone)?.name;
                
                return (
                  <Card key={plan.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-4 flex-1">
                          <div className="flex items-center gap-4">
                            <h3 className="text-lg font-semibold">{plan.monthYear} - {zoneName}</h3>
                            {getStatusBadge(plan.status)}
                          </div>
                          
                          {/* Summary Statistics */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-3 bg-muted rounded-lg">
                              <div className="text-2xl font-bold">{summary.totalEmployers}</div>
                              <div className="text-sm text-muted-foreground">Employers</div>
                            </div>
                            <div className="text-center p-3 bg-muted rounded-lg">
                              <div className="text-2xl font-bold">{summary.completedActivities}/{summary.totalActivities}</div>
                              <div className="text-sm text-muted-foreground">Activities</div>
                            </div>
                            <div className="text-center p-3 bg-muted rounded-lg">
                              <div className="text-2xl font-bold">${summary.totalVariance.toLocaleString()}</div>
                              <div className="text-sm text-muted-foreground">Total Variance</div>
                            </div>
                            <div className="text-center p-3 bg-muted rounded-lg">
                              <div className="text-2xl font-bold">
                                {Math.round(((summary.complianceStats['Compliant'] || 0) / summary.results.length) * 100) || 0}%
                              </div>
                              <div className="text-sm text-muted-foreground">Compliance Rate</div>
                            </div>
                          </div>

                          {/* Compliance Breakdown */}
                          <div>
                            <h4 className="font-medium mb-2">Compliance Status Breakdown</h4>
                            <div className="flex gap-2">
                              {Object.entries(summary.complianceStats).map(([status, count]) => (
                                <div key={status} className="flex items-center gap-1">
                                  {getComplianceBadge(status)}
                                  <span className="text-sm">({count})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <BarChart3 className="w-4 h-4 mr-2" />
                                View Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Plan Summary - {plan.monthYear} ({zoneName})</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Employer</TableHead>
                                      <TableHead>Activities</TableHead>
                                      <TableHead>Compliance Status</TableHead>
                                      <TableHead>Variance</TableHead>
                                      <TableHead>Findings</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {auditPlanEmployers
                                      .filter(pe => pe.planId === plan.id)
                                      .map((pe) => {
                                        const employerActivities = auditActivities.filter(a => 
                                          a.planId === plan.id && a.employerId === pe.employerId
                                        );
                                        const employerResults = summary.results.filter(r =>
                                          employerActivities.some(a => a.id === r.activityId)
                                        );
                                        const avgCompliance = employerResults.length > 0 ? 
                                          employerResults[0]?.complianceStatus : 'Not Started';
                                        const totalVariance = employerResults.reduce((sum, r) => sum + r.monetaryVariance, 0);
                                        
                                        return (
                                          <TableRow key={pe.id}>
                                            <TableCell>{pe.employer.name}</TableCell>
                                            <TableCell>{employerActivities.length}</TableCell>
                                            <TableCell>{getComplianceBadge(avgCompliance)}</TableCell>
                                            <TableCell>${totalVariance.toLocaleString()}</TableCell>
                                            <TableCell>
                                              {employerResults.length > 0 ? 
                                                employerResults[0]?.findings.substring(0, 50) + '...' : 
                                                'No findings'
                                              }
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                  </TableBody>
                                </Table>
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          <Button 
                            onClick={() => handleCloseoutPlan(plan)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Close Out
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Closeout Dialog */}
      <Dialog open={isCloseoutDialogOpen} onOpenChange={setIsCloseoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Out Audit Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPlan && (
              <div>
                <p><strong>Plan:</strong> {selectedPlan.monthYear}</p>
                <p><strong>Zone:</strong> {zones.find(z => z.id === selectedPlan.zone)?.name}</p>
                <p><strong>Status:</strong> Ready for closeout</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="comments">Closeout Comments</Label>
              <Textarea
                id="comments"
                placeholder="Enter closeout comments (optional)..."
                value={closeoutComments}
                onChange={(e) => setCloseoutComments(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCloseoutDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={confirmCloseout}
                className="bg-green-600 hover:bg-green-700"
              >
                Complete Closeout
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}