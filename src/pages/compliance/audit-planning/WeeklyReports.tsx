import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Send,
  CheckCircle,
  Calendar,
  TrendingUp,
  TrendingDown,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  WeeklyAuditPlan,
  WeeklyPlanWorkflowStatus,
  WeeklyReportSummary,
  SubmitWeeklyReportRequest
} from '@/types/weeklyAuditPlan';
import { weeklyAuditPlanService } from '@/services/weeklyAuditPlanService';

export default function WeeklyReports() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<WeeklyAuditPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<WeeklyAuditPlan | null>(null);
  const [reportSummary, setReportSummary] = useState<WeeklyReportSummary | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [narrative, setNarrative] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCompletedPlans();
  }, []);

  const loadCompletedPlans = async () => {
    try {
      const data = await weeklyAuditPlanService.getAll({
        inspectorId: 'inspector-001' // Would come from auth
      });
      
      // Filter plans that are IN_EXECUTION or COMPLETED
      const relevantPlans = data.filter(p => 
        p.status === WeeklyPlanWorkflowStatus.IN_EXECUTION ||
        p.status === WeeklyPlanWorkflowStatus.COMPLETED ||
        p.status === WeeklyPlanWorkflowStatus.APPROVED
      );
      
      setPlans(relevantPlans);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load plans',
        variant: 'destructive'
      });
    }
  };

  const handleOpenReport = async (plan: WeeklyAuditPlan) => {
    setSelectedPlan(plan);
    setNarrative(plan.weeklyReportNarrative || '');
    
    try {
      const summary = await weeklyAuditPlanService.generateWeeklyReportSummary(plan.id);
      setReportSummary(summary);
      setReportDialogOpen(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate report summary',
        variant: 'destructive'
      });
    }
  };

  const handleSubmitReport = async () => {
    if (!selectedPlan || !narrative.trim()) {
      toast({
        title: 'Missing Narrative',
        description: 'Please provide a weekly narrative',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const request: SubmitWeeklyReportRequest = {
        planId: selectedPlan.id,
        narrative
      };

      await weeklyAuditPlanService.submitWeeklyReport(request);

      toast({
        title: 'Report Submitted',
        description: 'Weekly report submitted for review'
      });

      setReportDialogOpen(false);
      setSelectedPlan(null);
      setNarrative('');
      await loadCompletedPlans();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit report',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: WeeklyPlanWorkflowStatus) => {
    const colors: Record<WeeklyPlanWorkflowStatus, string> = {
      [WeeklyPlanWorkflowStatus.DRAFT]: 'bg-gray-100 text-gray-800',
      [WeeklyPlanWorkflowStatus.SUBMITTED]: 'bg-blue-100 text-blue-800',
      [WeeklyPlanWorkflowStatus.NEED_CHANGES]: 'bg-yellow-100 text-yellow-800',
      [WeeklyPlanWorkflowStatus.RESUBMITTED]: 'bg-purple-100 text-purple-800',
      [WeeklyPlanWorkflowStatus.APPROVED]: 'bg-green-100 text-green-800',
      [WeeklyPlanWorkflowStatus.IN_EXECUTION]: 'bg-cyan-100 text-cyan-800',
      [WeeklyPlanWorkflowStatus.COMPLETED]: 'bg-gray-100 text-gray-800',
    };
    return colors[status];
  };

  const completionRate = (plan: WeeklyAuditPlan) => {
    if (plan.totalPlannedVisits === 0) return 0;
    return Math.round((plan.completedVisits / plan.totalPlannedVisits) * 100);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Weekly Reports"
        subtitle="Submit and track weekly execution reports"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance/dashboard' },
          { label: 'Audit Planning', href: '/compliance/audit-planning/sampling-dashboard' },
          { label: 'Weekly Reports' }
        ]}
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Plans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600">
              {plans.filter(p => p.status === WeeklyPlanWorkflowStatus.IN_EXECUTION).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {plans.filter(p => p.status === WeeklyPlanWorkflowStatus.COMPLETED).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Visits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {plans.reduce((sum, p) => sum + p.completedVisits, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {plans.length > 0 
                ? Math.round(plans.reduce((sum, p) => sum + completionRate(p), 0) / plans.length)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Plans & Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No active or completed plans</p>
              <p className="text-sm text-muted-foreground">Plans ready for reporting will appear here.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan Number</TableHead>
                  <TableHead>Week Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Visits</TableHead>
                  <TableHead>Completion</TableHead>
                  <TableHead>Report Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => {
                  const rate = completionRate(plan);
                  return (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.planNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{plan.weekStartDate} - {plan.weekEndDate}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(plan.status)}>
                          {plan.status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {plan.completedVisits} / {plan.totalPlannedVisits}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {rate >= 80 ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-yellow-600" />
                          )}
                          <span className={rate >= 80 ? 'text-green-600' : 'text-yellow-600'}>
                            {rate}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {plan.weeklyReportSubmittedAt ? (
                          <Badge variant="secondary">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Submitted
                          </Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenReport(plan)}
                        >
                          {plan.weeklyReportSubmittedAt ? (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </>
                          ) : (
                            <>
                              <FileText className="h-4 w-4 mr-2" />
                              Submit Report
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Weekly Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Weekly Report</DialogTitle>
            <DialogDescription>
              {selectedPlan?.planNumber} - Week of {selectedPlan?.weekStartDate}
            </DialogDescription>
          </DialogHeader>

          {selectedPlan && reportSummary && (
            <div className="space-y-6 py-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-foreground">{reportSummary.plannedVisits}</div>
                    <p className="text-xs text-muted-foreground mt-1">Planned</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">{reportSummary.completedVisits}</div>
                    <p className="text-xs text-muted-foreground mt-1">Completed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-yellow-600">{reportSummary.rescheduledVisits}</div>
                    <p className="text-xs text-muted-foreground mt-1">Rescheduled</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-red-600">{reportSummary.cancelledVisits}</div>
                    <p className="text-xs text-muted-foreground mt-1">Cancelled</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="border rounded-lg p-4">
                  <Label className="text-sm text-muted-foreground">Total Hours</Label>
                  <p className="text-2xl font-bold">{reportSummary.totalHoursSpent}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <Label className="text-sm text-muted-foreground">Evidence Collected</Label>
                  <p className="text-2xl font-bold">{reportSummary.evidenceCollected}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <Label className="text-sm text-muted-foreground">Violations Updated</Label>
                  <p className="text-2xl font-bold">{reportSummary.violationsUpdated}</p>
                </div>
              </div>

              {reportSummary.findingsSummary && (
                <div className="space-y-2">
                  <Label>Findings Summary</Label>
                  <div className="border rounded-lg p-3 bg-muted/50 text-sm">
                    {reportSummary.findingsSummary}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Inspector Narrative *</Label>
                <Textarea
                  placeholder="Provide a comprehensive narrative of the week's activities, challenges, and outcomes..."
                  value={narrative}
                  onChange={(e) => setNarrative(e.target.value)}
                  rows={6}
                  disabled={!!selectedPlan.weeklyReportSubmittedAt}
                />
              </div>

              {selectedPlan.weeklyReportSubmittedAt && (
                <div className="border-l-4 border-green-500 bg-green-50 p-4">
                  <p className="text-sm font-medium text-green-800">
                    Report submitted on {new Date(selectedPlan.weeklyReportSubmittedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
              Close
            </Button>
            {selectedPlan && !selectedPlan.weeklyReportSubmittedAt && (
              <Button onClick={handleSubmitReport} disabled={loading}>
                <Send className="h-4 w-4 mr-2" />
                Submit Weekly Report
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
