import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar, Eye, FileText, Users, TrendingUp, CheckCircle, Loader2, XCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { weeklyPlanService, WeeklyReportSummary } from '@/services/weeklyPlanService';
import { WeeklyPlan, WeeklyPlanStatus } from '@/types/weeklyPlan';
import { useNavigate } from 'react-router-dom';
import { useUserCode } from '@/hooks/useUserCode';

export default function AllWeeklyReports() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userCode, userId } = useUserCode();
  const [reviewPlan, setReviewPlan] = useState<WeeklyPlan | null>(null);
  const [reviewSummary, setReviewSummary] = useState<WeeklyReportSummary | null>(null);
  const [reviewComments, setReviewComments] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);

  const plansQuery = useQuery({
    queryKey: ['all-weekly-reports'],
    queryFn: async () => {
      const data = await weeklyPlanService.getAll();
      return data.filter(p =>
        p.status === WeeklyPlanStatus.IN_EXECUTION ||
        p.status === WeeklyPlanStatus.OUTCOME_SUBMITTED ||
        p.status === WeeklyPlanStatus.COMPLETED
      );
    },
  });

  const plans = plansQuery.data ?? [];

  const handleOpenReview = async (plan: WeeklyPlan) => {
    setReviewPlan(plan);
    setReviewComments('');
    setLoadingSummary(true);
    try {
      const summary = await weeklyPlanService.getReportSummary(plan.id);
      setReviewSummary(summary);
    } catch {
      setReviewSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  };

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!reviewPlan) throw new Error('No plan');
      await weeklyPlanService.complete(reviewPlan.id, userCode || userId || '', reviewComments);
    },
    onSuccess: () => {
      toast({ title: 'Report Approved', description: 'Weekly report has been approved and the plan is now completed.' });
      setReviewPlan(null);
      queryClient.invalidateQueries({ queryKey: ['all-weekly-reports'] });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="All Weekly Reports (Manager View)"
        subtitle="Review reports from all inspectors"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance/dashboard' },
          { label: 'Audit Planning', href: '/compliance/audit-planning/sampling-dashboard' },
          { label: 'All Reports' }
        ]}
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Inspectors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(plans.map(p => p.inspector_id)).size}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">
              {plans.filter(p => p.status === WeeklyPlanStatus.OUTCOME_SUBMITTED).length}
            </div>
          </CardContent>
        </Card>
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
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {plans.filter(p => p.status === WeeklyPlanStatus.COMPLETED).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Weekly Plans & Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {plansQuery.isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No reports available</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Inspector</TableHead>
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
                      <TableCell className="font-medium">{plan.inspector_name}</TableCell>
                      <TableCell>{plan.plan_number}</TableCell>
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
                        <div className={`text-sm ${rate >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                          {rate}%
                        </div>
                      </TableCell>
                      <TableCell>
                        {plan.status === WeeklyPlanStatus.OUTCOME_SUBMITTED ? (
                          <Badge className="bg-indigo-100 text-indigo-800">Awaiting Review</Badge>
                        ) : plan.status === WeeklyPlanStatus.COMPLETED ? (
                          <Badge variant="secondary">Approved</Badge>
                        ) : (
                          <Badge variant="outline">In Progress</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenReview(plan)}
                        >
                          {plan.status === WeeklyPlanStatus.OUTCOME_SUBMITTED ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Review
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              View
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

      {/* Review Dialog */}
      <Dialog open={!!reviewPlan} onOpenChange={(open) => !open && setReviewPlan(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Weekly Report</DialogTitle>
            <DialogDescription>
              {reviewPlan?.plan_number} — {reviewPlan?.inspector_name} — Week of {reviewPlan?.week_start_date}
            </DialogDescription>
          </DialogHeader>

          {loadingSummary ? (
            <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
          ) : reviewSummary && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="border rounded-lg p-3 text-center">
                  <div className="text-xl font-bold">{reviewSummary.total_planned}</div>
                  <div className="text-xs text-muted-foreground">Planned</div>
                </div>
                <div className="border rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-green-600">{reviewSummary.completed_visits}</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div className="border rounded-lg p-3 text-center">
                  <div className="text-xl font-bold">{reviewSummary.total_hours}h</div>
                  <div className="text-xs text-muted-foreground">Hours</div>
                </div>
                <div className="border rounded-lg p-3 text-center">
                  <div className="text-xl font-bold">{reviewSummary.findings_count}</div>
                  <div className="text-xs text-muted-foreground">Findings</div>
                </div>
              </div>

              {reviewSummary.outcome_narrative && (
                <div>
                  <Label className="text-sm text-muted-foreground">Inspector Narrative</Label>
                  <div className="mt-1 p-3 border rounded-lg bg-muted/30 text-sm whitespace-pre-wrap">
                    {reviewSummary.outcome_narrative}
                  </div>
                </div>
              )}

              {reviewPlan?.status === WeeklyPlanStatus.OUTCOME_SUBMITTED && (
                <div className="space-y-2">
                  <Label>Reviewer Comments (optional)</Label>
                  <Textarea
                    value={reviewComments}
                    onChange={(e) => setReviewComments(e.target.value)}
                    placeholder="Add comments for the inspector..."
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewPlan(null)}>Close</Button>
            {reviewPlan?.status === WeeklyPlanStatus.OUTCOME_SUBMITTED && (
              <Button
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                Approve Report
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
