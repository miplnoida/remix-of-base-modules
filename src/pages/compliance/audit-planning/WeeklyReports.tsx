import { useState } from 'react';
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
  Eye,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { weeklyPlanService, WeeklyReportSummary } from '@/services/weeklyPlanService';
import { WeeklyPlan, WeeklyPlanStatus } from '@/types/weeklyPlan';
import { useUserCode } from '@/hooks/useUserCode';

export default function WeeklyReports() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { userCode, userId } = useUserCode();
  const [selectedPlan, setSelectedPlan] = useState<WeeklyPlan | null>(null);
  const [reportSummary, setReportSummary] = useState<WeeklyReportSummary | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [narrative, setNarrative] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);

  const plansQuery = useQuery({
    queryKey: ['weekly-report-plans'],
    queryFn: async () => {
      const data = await weeklyPlanService.getAll();
      return data.filter(p =>
        p.status === WeeklyPlanStatus.IN_EXECUTION ||
        p.status === WeeklyPlanStatus.OUTCOME_SUBMITTED ||
        p.status === WeeklyPlanStatus.COMPLETED ||
        p.status === WeeklyPlanStatus.APPROVED
      );
    },
  });

  const plans = plansQuery.data ?? [];

  const handleOpenReport = async (plan: WeeklyPlan) => {
    setSelectedPlan(plan);
    setNarrative(plan.outcome_narrative || '');
    setLoadingSummary(true);

    try {
      const summary = await weeklyPlanService.getReportSummary(plan.id);
      setReportSummary(summary);
      setReportDialogOpen(true);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to generate report summary', variant: 'destructive' });
    } finally {
      setLoadingSummary(false);
    }
  };

  const submitReportMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPlan || !narrative.trim()) throw new Error('Please provide a weekly narrative');
      await weeklyPlanService.submitWeeklyReport(selectedPlan.id, userCode || userId || '', narrative);
    },
    onSuccess: () => {
      toast({ title: 'Report Submitted', description: 'Weekly report submitted for supervisor review.' });
      setReportDialogOpen(false);
      setSelectedPlan(null);
      setNarrative('');
      queryClient.invalidateQueries({ queryKey: ['weekly-report-plans'] });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      [WeeklyPlanStatus.APPROVED]: 'bg-green-100 text-green-800',
      [WeeklyPlanStatus.IN_EXECUTION]: 'bg-cyan-100 text-cyan-800',
      [WeeklyPlanStatus.OUTCOME_SUBMITTED]: 'bg-indigo-100 text-indigo-800',
      [WeeklyPlanStatus.COMPLETED]: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  const completionRate = (plan: WeeklyPlan) => {
    if (plan.total_planned_visits === 0) return 0;
    return Math.round((plan.completed_visits / plan.total_planned_visits) * 100);
  };

  // Validation warnings for report submission
  const getReportWarnings = (summary: WeeklyReportSummary | null) => {
    const warnings: { text: string; blocking: boolean }[] = [];
    if (!summary) return warnings;

    if (summary.still_planned > 0) {
      warnings.push({ text: `${summary.still_planned} plan item(s) still in PLANNED status`, blocking: true });
    }
    if (summary.completed_visits > 0 && summary.findings_count === 0) {
      warnings.push({ text: 'Completed visits have no findings recorded', blocking: true });
    }
    if (summary.evidence_count === 0 && summary.completed_visits > 0) {
      warnings.push({ text: 'No evidence collected for completed visits', blocking: false });
    }
    return warnings;
  };

  const reportWarnings = getReportWarnings(reportSummary);
  const hasBlockingWarnings = reportWarnings.some(w => w.blocking);
  const isAlreadySubmitted = selectedPlan?.status === WeeklyPlanStatus.OUTCOME_SUBMITTED || selectedPlan?.status === WeeklyPlanStatus.COMPLETED;

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
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600">
              {plans.filter(p => p.status === WeeklyPlanStatus.IN_EXECUTION).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outcome Submitted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">
              {plans.filter(p => p.status === WeeklyPlanStatus.OUTCOME_SUBMITTED).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {plans.filter(p => p.status === WeeklyPlanStatus.COMPLETED).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Visits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {plans.reduce((sum, p) => sum + p.completed_visits, 0)}
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
          {plansQuery.isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : plans.length === 0 ? (
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
                      <TableCell className="font-medium">{plan.plan_number}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{plan.week_start_date} - {plan.week_end_date}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(plan.status)}>
                          {plan.status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {plan.completed_visits} / {plan.total_planned_visits}
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
                        {plan.status === WeeklyPlanStatus.OUTCOME_SUBMITTED || plan.status === WeeklyPlanStatus.COMPLETED ? (
                          <Badge variant="secondary">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {plan.status === WeeklyPlanStatus.COMPLETED ? 'Approved' : 'Submitted'}
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
                          disabled={loadingSummary}
                        >
                          {plan.status === WeeklyPlanStatus.OUTCOME_SUBMITTED || plan.status === WeeklyPlanStatus.COMPLETED ? (
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
              {selectedPlan?.plan_number} — Week of {selectedPlan?.week_start_date}
            </DialogDescription>
          </DialogHeader>

          {selectedPlan && reportSummary && (
            <div className="space-y-6 py-4">
              {/* Auto-Generated Summary Stats */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-foreground">{reportSummary.total_planned}</div>
                    <p className="text-xs text-muted-foreground mt-1">Planned</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">{reportSummary.completed_visits}</div>
                    <p className="text-xs text-muted-foreground mt-1">Completed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-yellow-600">{reportSummary.rescheduled_visits}</div>
                    <p className="text-xs text-muted-foreground mt-1">Rescheduled</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-red-600">{reportSummary.cancelled_visits}</div>
                    <p className="text-xs text-muted-foreground mt-1">Cancelled</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="border rounded-lg p-4">
                  <Label className="text-sm text-muted-foreground">Total Hours</Label>
                  <p className="text-2xl font-bold">{reportSummary.total_hours}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <Label className="text-sm text-muted-foreground">Evidence Collected</Label>
                  <p className="text-2xl font-bold">{reportSummary.evidence_count}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <Label className="text-sm text-muted-foreground">Findings</Label>
                  <p className="text-2xl font-bold">{reportSummary.findings_count}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <Label className="text-sm text-muted-foreground">Violations Created</Label>
                  <p className="text-2xl font-bold">{reportSummary.violations_created}</p>
                </div>
              </div>

              {/* Validation Warnings */}
              {reportWarnings.length > 0 && !isAlreadySubmitted && (
                <div className="space-y-2">
                  {reportWarnings.map((w, idx) => (
                    <div key={idx} className={`flex items-start gap-2 p-3 rounded-md text-sm ${w.blocking ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{w.text}{w.blocking ? ' (blocking)' : ' (warning)'}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label>Inspector Narrative *</Label>
                <Textarea
                  placeholder="Provide a comprehensive narrative of the week's activities, challenges, and outcomes..."
                  value={narrative}
                  onChange={(e) => setNarrative(e.target.value)}
                  rows={6}
                  disabled={isAlreadySubmitted}
                />
              </div>

              {isAlreadySubmitted && (
                <div className="border-l-4 border-green-500 bg-green-50 p-4">
                  <p className="text-sm font-medium text-green-800">
                    Report submitted on {selectedPlan.outcome_submitted_at ? new Date(selectedPlan.outcome_submitted_at).toLocaleString() : 'N/A'}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
              Close
            </Button>
            {selectedPlan && !isAlreadySubmitted && (
              <Button
                onClick={() => submitReportMutation.mutate()}
                disabled={submitReportMutation.isPending || hasBlockingWarnings || !narrative.trim()}
              >
                {submitReportMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Submit Weekly Report
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
