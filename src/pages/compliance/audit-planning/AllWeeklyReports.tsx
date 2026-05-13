import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import {
  Calendar,
  Eye,
  FileText,
  Users,
  TrendingUp,
  CheckCircle,
  Loader2,
  XCircle,
  Clock,
  Camera,
  Search,
  Scale,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
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
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

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
    setRejectMode(false);
    setRejectReason('');
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

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!reviewPlan || !rejectReason.trim()) throw new Error('Please provide a reason for rejection');
      // Send back to IN_EXECUTION so inspector can re-work and resubmit
      await weeklyPlanService.update(reviewPlan.id, {
        status: WeeklyPlanStatus.IN_EXECUTION,
        supervisor_comments: rejectReason,
        updated_by: userCode || userId || '',
      });
      // Log review action
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase.from('ce_weekly_plan_reviews').insert({
        plan_id: reviewPlan.id,
        action: 'OUTCOME_REJECTED',
        comments: rejectReason,
        performed_by: userCode || userId || '',
      });
    },
    onSuccess: () => {
      toast({ title: 'Report Returned', description: 'Report sent back to inspector for revision.' });
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

  const pendingCount = plans.filter(p => p.status === WeeklyPlanStatus.OUTCOME_SUBMITTED).length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="All Weekly Reports (Manager View)"
        subtitle="Review and approve weekly reports from inspectors"
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
        <Card className={pendingCount > 0 ? 'border-indigo-300' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{pendingCount}</div>
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
                    <TableRow key={plan.id} className={plan.status === WeeklyPlanStatus.OUTCOME_SUBMITTED ? 'bg-indigo-50/30' : ''}>
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
      <Dialog open={!!reviewPlan} onOpenChange={(open) => { if (!open) { setReviewPlan(null); setRejectMode(false); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Weekly Report</DialogTitle>
            <DialogDescription>
              {reviewPlan?.plan_number} — {reviewPlan?.inspector_name} — Week of {reviewPlan?.week_start_date}
            </DialogDescription>
          </DialogHeader>

          {loadingSummary ? (
            <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
          ) : reviewSummary && (
            <div className="space-y-6 py-4">
              {/* Visit Breakdown */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Visit Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="border rounded-lg p-3 text-center">
                    <div className="text-xl font-bold">{reviewSummary.total_planned}</div>
                    <div className="text-xs text-muted-foreground">Planned</div>
                  </div>
                  <div className="border rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-green-600">{reviewSummary.completed_visits}</div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </div>
                  <div className="border rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-yellow-600">{reviewSummary.rescheduled_visits}</div>
                    <div className="text-xs text-muted-foreground">Rescheduled</div>
                  </div>
                  <div className="border rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-orange-600">{reviewSummary.not_done_visits}</div>
                    <div className="text-xs text-muted-foreground">Not Done</div>
                  </div>
                  <div className="border rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-red-600">{reviewSummary.cancelled_visits}</div>
                    <div className="text-xs text-muted-foreground">Cancelled</div>
                  </div>
                </div>
              </div>

              {/* Execution Metrics */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Execution Metrics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="border rounded-lg p-3 flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xl font-bold">{reviewSummary.total_hours}h</p>
                      <p className="text-xs text-muted-foreground">Hours</p>
                    </div>
                  </div>
                  <div className="border rounded-lg p-3 flex items-center gap-3">
                    <Camera className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xl font-bold">{reviewSummary.evidence_count}</p>
                      <p className="text-xs text-muted-foreground">Evidence</p>
                    </div>
                  </div>
                  <div className="border rounded-lg p-3 flex items-center gap-3">
                    <Search className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xl font-bold">{reviewSummary.findings_count}</p>
                      <p className="text-xs text-muted-foreground">Findings</p>
                    </div>
                  </div>
                  <div className="border rounded-lg p-3 flex items-center gap-3">
                    <Scale className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xl font-bold">{reviewSummary.violations_created}</p>
                      <p className="text-xs text-muted-foreground">Violations</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Flags */}
              {(reviewSummary.still_planned > 0 || (reviewSummary.completed_visits > 0 && reviewSummary.findings_count === 0)) && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-1">
                  {reviewSummary.still_planned > 0 && (
                    <div className="flex items-center gap-2 text-sm text-amber-800">
                      <AlertTriangle className="h-4 w-4" />
                      <span>{reviewSummary.still_planned} item(s) were not addressed by the inspector</span>
                    </div>
                  )}
                  {reviewSummary.completed_visits > 0 && reviewSummary.findings_count === 0 && (
                    <div className="flex items-center gap-2 text-sm text-amber-800">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Completed visits have zero recorded findings</span>
                    </div>
                  )}
                </div>
              )}

              {/* Inspector Narrative */}
              {reviewSummary.outcome_narrative && (
                <div>
                  <Label className="text-sm text-muted-foreground">Inspector Narrative</Label>
                  <div className="mt-1 p-4 border rounded-lg bg-muted/30 text-sm whitespace-pre-wrap space-y-3">
                    {reviewSummary.outcome_narrative.split('\n---\n').map((section, i) => (
                      <div key={i}>
                        {i === 0 && <p className="text-xs font-medium text-muted-foreground mb-1">Weekly Summary</p>}
                        {i === 1 && <p className="text-xs font-medium text-muted-foreground mb-1">Exceptions & Blockers</p>}
                        {i === 2 && <p className="text-xs font-medium text-muted-foreground mb-1">Recommendations</p>}
                        <p>{section}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Supervisor Actions */}
              {reviewPlan?.status === WeeklyPlanStatus.OUTCOME_SUBMITTED && !rejectMode && (
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

              {/* Reject Mode */}
              {rejectMode && (
                <div className="space-y-3 p-4 border border-destructive/30 rounded-lg bg-destructive/5">
                  <h3 className="font-medium text-destructive flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Return Report for Revision
                  </h3>
                  <div className="space-y-2">
                    <Label>Reason for Return *</Label>
                    <Textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Explain what needs to be revised or corrected..."
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => rejectMutation.mutate()}
                      disabled={rejectMutation.isPending || !rejectReason.trim()}
                    >
                      {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                      Confirm Return
                    </Button>
                    <Button variant="outline" onClick={() => setRejectMode(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              {/* Completed Status */}
              {reviewPlan?.status === WeeklyPlanStatus.COMPLETED && (
                <div className="border-l-4 border-green-500 bg-green-50 p-4">
                  <p className="text-sm font-medium text-green-800">✓ Report approved</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setReviewPlan(null); setRejectMode(false); }}>Close</Button>
            {reviewPlan?.status === WeeklyPlanStatus.OUTCOME_SUBMITTED && !rejectMode && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setRejectMode(true)}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Return for Revision
                </Button>
                <Button
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                  Approve Report
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
