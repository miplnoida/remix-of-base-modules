import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertTriangle,
  CheckCircle,
  Calendar,
  Building2,
  MapPin,
  AlertCircle,
  Clock,
  FileText,
  Loader2,
  GitCompare,
  History,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUserCode } from '@/hooks/useUserCode';
import { weeklyPlanService } from '@/services/weeklyPlanService';
import { WeeklyPlan, WeeklyPlanItem, WeeklyPlanReview as PlanReview } from '@/types/weeklyPlan';
import { PlanCompareDialog } from '@/components/compliance/weekly-plan/PlanCompareDialog';
import { PlanVersionHistoryDialog } from '@/components/compliance/weekly-plan/PlanVersionHistoryDialog';
import { RecommendationReasonsPopover } from '@/components/compliance/weekly-plan/RecommendationReasonsPopover';

export function WeeklyPlanReview() {
  const navigate = useNavigate();
  const { planId } = useParams();
  const { toast } = useToast();
  const { userCode } = useUserCode();
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [managerComments, setManagerComments] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isActioning, setIsActioning] = useState(false);

  useEffect(() => {
    if (planId) loadPlan();
  }, [planId]);

  const loadPlan = async () => {
    setIsLoading(true);
    try {
      const data = await weeklyPlanService.getById(planId!);
      setPlan(data);
    } catch {
      toast({ title: 'Error', description: 'Failed to load plan', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const planItems: WeeklyPlanItem[] = plan?.ce_weekly_plan_items ?? [];
  const reviewHistory: PlanReview[] = plan?.ce_weekly_plan_reviews ?? [];

  const handleApprove = async () => {
    if (!planId || !userCode) return;
    setIsActioning(true);
    try {
      await weeklyPlanService.approve(planId, userCode, managerComments || undefined);
      toast({ title: 'Plan Approved', description: 'The weekly plan has been approved successfully.' });
      navigate('/compliance/field/pending-review');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to approve plan', variant: 'destructive' });
    } finally {
      setIsActioning(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!planId || !userCode) return;
    if (!managerComments.trim()) {
      toast({
        title: 'Comments Required',
        description: 'Please provide comments explaining the requested changes.',
        variant: 'destructive',
      });
      return;
    }
    setIsActioning(true);
    try {
      await weeklyPlanService.reject(planId, userCode, managerComments);
      toast({ title: 'Changes Requested', description: 'The plan has been sent back to the inspector with your comments.' });
      navigate('/compliance/field/pending-review');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to request changes', variant: 'destructive' });
    } finally {
      setIsActioning(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return <Badge className="bg-blue-100 text-blue-800">Submitted</Badge>;
      case 'RESUBMITTED': return <Badge className="bg-purple-100 text-purple-800">Resubmitted</Badge>;
      case 'APPROVED': return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'NEEDS_CHANGES': return <Badge variant="destructive">Needs Changes</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-muted-foreground">Plan not found.</p>
        <Button variant="outline" onClick={() => navigate('/compliance/field/pending-review')}>
          Back to Pending Review
        </Button>
      </div>
    );
  }

  // Group items by day
  const dayGroups: Record<string, WeeklyPlanItem[]> = {};
  for (const item of planItems) {
    const day = item.day_of_week || 'Unassigned';
    if (!dayGroups[day]) dayGroups[day] = [];
    dayGroups[day].push(item);
  }
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Unassigned'];
  const orderedDays = dayOrder.filter(d => dayGroups[d]?.length > 0);

  const isResubmission = plan.status === 'RESUBMITTED';
  const canAction = plan.status === 'SUBMITTED' || plan.status === 'RESUBMITTED';

  return (
    <div className="space-y-6 container mx-auto p-4 md:p-6">
      <PageHeader
        title="Review Weekly Plan"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance/dashboard' },
          { label: 'Pending Review', href: '/compliance/field/pending-review' },
          { label: 'Review Plan' },
        ]}
      />

      {/* Resubmission notice */}
      {isResubmission && (
        <Card className="border-purple-200 bg-purple-50 dark:bg-purple-900/10">
          <CardContent className="py-3 px-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-purple-800 dark:text-purple-300">
                  Resubmission — This plan was returned for changes and has been updated by the inspector.
                </p>
                {plan.rejection_count > 0 && (
                  <p className="text-xs text-purple-600 mt-1">
                    This plan has been returned {plan.rejection_count} time{plan.rejection_count > 1 ? 's' : ''}.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{plan.plan_number}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Week of {plan.week_start_date} to {plan.week_end_date}
              </p>
            </div>
            {getStatusBadge(plan.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Inspector</p>
              <p className="font-semibold">{plan.inspector_name || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Submitted</p>
              <p className="font-semibold">
                {plan.submitted_date ? new Date(plan.submitted_date).toLocaleString() : '—'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Items</p>
              <p className="font-semibold">{planItems.length} visits planned</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rejections</p>
              <p className="font-semibold">{plan.rejection_count || 0}</p>
            </div>
          </div>
          {plan.narrative && (
            <div className="mt-4 p-3 bg-muted/40 rounded-md">
              <p className="text-xs text-muted-foreground mb-1">Inspector Narrative</p>
              <p className="text-sm">{plan.narrative}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Items by Day */}
      <Tabs defaultValue="plan" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plan">
            <Calendar className="h-4 w-4 mr-1" />
            Planned Items ({planItems.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            <FileText className="h-4 w-4 mr-1" />
            Review History ({reviewHistory.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="space-y-4">
          {orderedDays.map(day => (
            <Card key={day}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {day}
                  <Badge variant="outline" className="ml-1 text-xs">{dayGroups[day].length} items</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dayGroups[day].map(item => (
                    <div key={item.id} className="border rounded-lg p-3 space-y-1">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm">{item.employer_name || item.area_name || 'Unnamed'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {item.priority && (
                            <Badge variant={item.priority === 'CRITICAL' || item.priority === 'HIGH' ? 'destructive' : 'secondary'} className="text-xs">
                              {item.priority}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">{item.item_type?.replace(/_/g, ' ')}</Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {item.territory && (
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{item.territory}</span>
                        )}
                        {item.scheduled_start_time && (
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{item.scheduled_start_time}{item.scheduled_end_time ? ` – ${item.scheduled_end_time}` : ''}</span>
                        )}
                        {item.visit_type && <span>{item.visit_type.replace(/_/g, ' ')}</span>}
                      </div>
                      {item.purpose && <p className="text-xs text-muted-foreground">{item.purpose}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          {planItems.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No items in this plan.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Review History</CardTitle>
            </CardHeader>
            <CardContent>
              {reviewHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No review history yet.</p>
              ) : (
                <div className="space-y-3">
                  {reviewHistory
                    .sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime())
                    .map(review => (
                      <div key={review.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">{review.action}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(review.performed_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">By: {review.performed_by}</p>
                        {review.comments && (
                          <p className="text-sm mt-1 bg-muted/30 p-2 rounded">{review.comments}</p>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Manager Actions */}
      {canAction && (
        <Card>
          <CardHeader>
            <CardTitle>Manager Review & Comments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="comments">Comments / Feedback</Label>
              <Textarea
                id="comments"
                placeholder="Provide feedback or guidance for the inspector..."
                value={managerComments}
                onChange={(e) => setManagerComments(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => navigate('/compliance/field/pending-review')}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={handleRequestChanges}
                disabled={isActioning}
              >
                {isActioning && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Request Changes
              </Button>
              <Button onClick={handleApprove} disabled={isActioning}>
                {isActioning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Approve Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Already reviewed */}
      {!canAction && plan.status !== 'DRAFT' && (
        <Card>
          <CardContent className="py-4 text-center text-muted-foreground">
            This plan has been {plan.status === 'APPROVED' ? 'approved' : plan.status === 'NEEDS_CHANGES' ? 'returned for changes' : plan.status.toLowerCase()}.
            {plan.reviewer_comments && (
              <p className="mt-2 text-sm"><strong>Comments:</strong> {plan.reviewer_comments}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
