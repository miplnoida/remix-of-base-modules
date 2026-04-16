import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Edit,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Play,
  Undo2,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { weeklyPlanService } from '@/services/weeklyPlanService';
import { WeeklyPlan, WeeklyPlanStatus } from '@/types/weeklyPlan';
import { useNavigate } from 'react-router-dom';
import { useUserCode } from '@/hooks/useUserCode';

export default function MyPlans() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userCode, userId } = useUserCode();
  const [withdrawDialogPlan, setWithdrawDialogPlan] = useState<WeeklyPlan | null>(null);
  const [withdrawReason, setWithdrawReason] = useState('');

  const plansQuery = useQuery({
    queryKey: ['my-weekly-plans'],
    queryFn: () => weeklyPlanService.getAll(),
  });

  const plans = plansQuery.data ?? [];
  const loading = plansQuery.isLoading;

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      if (!withdrawDialogPlan) throw new Error('No plan selected');
      await weeklyPlanService.withdraw(withdrawDialogPlan.id, userCode || userId || '', withdrawReason);
    },
    onSuccess: () => {
      toast({ title: 'Plan Withdrawn', description: 'Your plan has been withdrawn and is now editable.' });
      setWithdrawDialogPlan(null);
      setWithdrawReason('');
      queryClient.invalidateQueries({ queryKey: ['my-weekly-plans'] });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case WeeklyPlanStatus.DRAFT: return <Edit className="h-4 w-4" />;
      case WeeklyPlanStatus.SUBMITTED: return <Clock className="h-4 w-4" />;
      case WeeklyPlanStatus.NEEDS_CHANGES: return <AlertCircle className="h-4 w-4" />;
      case WeeklyPlanStatus.RESUBMITTED: return <Send className="h-4 w-4" />;
      case WeeklyPlanStatus.APPROVED: return <CheckCircle className="h-4 w-4" />;
      case WeeklyPlanStatus.IN_EXECUTION: return <Play className="h-4 w-4" />;
      case WeeklyPlanStatus.OUTCOME_SUBMITTED: return <FileText className="h-4 w-4" />;
      case WeeklyPlanStatus.COMPLETED: return <CheckCircle className="h-4 w-4" />;
      case WeeklyPlanStatus.WITHDRAWN: return <Undo2 className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      [WeeklyPlanStatus.DRAFT]: 'bg-gray-100 text-gray-800',
      [WeeklyPlanStatus.SUBMITTED]: 'bg-blue-100 text-blue-800',
      [WeeklyPlanStatus.NEEDS_CHANGES]: 'bg-yellow-100 text-yellow-800',
      [WeeklyPlanStatus.RESUBMITTED]: 'bg-purple-100 text-purple-800',
      [WeeklyPlanStatus.APPROVED]: 'bg-green-100 text-green-800',
      [WeeklyPlanStatus.IN_EXECUTION]: 'bg-cyan-100 text-cyan-800',
      [WeeklyPlanStatus.OUTCOME_SUBMITTED]: 'bg-indigo-100 text-indigo-800',
      [WeeklyPlanStatus.COMPLETED]: 'bg-gray-100 text-gray-800',
      [WeeklyPlanStatus.WITHDRAWN]: 'bg-red-50 text-red-600',
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  const activePlans = plans.filter(p => p.status !== WeeklyPlanStatus.WITHDRAWN);
  const needsChangesPlans = activePlans.filter(p => p.status === WeeklyPlanStatus.NEEDS_CHANGES);
  const draftPlans = activePlans.filter(p => p.status === WeeklyPlanStatus.DRAFT);
  const pendingPlans = activePlans.filter(p =>
    p.status === WeeklyPlanStatus.SUBMITTED ||
    p.status === WeeklyPlanStatus.RESUBMITTED
  );
  const approvedPlans = activePlans.filter(p =>
    p.status === WeeklyPlanStatus.APPROVED ||
    p.status === WeeklyPlanStatus.IN_EXECUTION
  );
  const completedPlans = activePlans.filter(p => p.status === WeeklyPlanStatus.COMPLETED);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="My Weekly Plans"
        subtitle="View and manage your weekly audit plans"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance/dashboard' },
          { label: 'Audit Planning', href: '/compliance/audit-planning/sampling-dashboard' },
          { label: 'My Plans' }
        ]}
        actions={
          <Button onClick={() => navigate('/compliance/audit-planning/weekly-plan-builder')}>
            <Calendar className="h-4 w-4 mr-2" />
            Create New Plan
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Draft Plans</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{draftPlans.length}</div></CardContent>
        </Card>
        <Card className={needsChangesPlans.length > 0 ? 'border-amber-300' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Needs Changes</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-amber-600">{needsChangesPlans.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-600">{pendingPlans.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved/Active</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{approvedPlans.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-foreground">{completedPlans.length}</div></CardContent>
        </Card>
      </div>

      {/* Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle>All My Plans</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : activePlans.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No plans found</p>
              <p className="text-sm text-muted-foreground mb-4">Create your first weekly plan to get started</p>
              <Button onClick={() => navigate('/compliance/audit-planning/weekly-plan-builder')}>
                <Calendar className="h-4 w-4 mr-2" />
                Create Plan
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan Number</TableHead>
                  <TableHead>Week Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Planned Visits</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activePlans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.plan_number}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{plan.week_start_date} - {plan.week_end_date}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(plan.status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(plan.status)}
                          {plan.status.replace(/_/g, ' ')}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>{plan.total_planned_visits}</TableCell>
                    <TableCell>
                      {plan.completed_visits} / {plan.total_planned_visits}
                    </TableCell>
                    <TableCell>
                      {plan.submitted_date ? new Date(plan.submitted_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end flex-wrap">
                        {plan.status === WeeklyPlanStatus.DRAFT && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/compliance/audit-planning/weekly-plan-builder')}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        )}
                        {plan.status === WeeklyPlanStatus.NEEDS_CHANGES && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/compliance/audit-planning/weekly-plan-builder')}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Update & Resubmit
                          </Button>
                        )}
                        {(plan.status === WeeklyPlanStatus.SUBMITTED || plan.status === WeeklyPlanStatus.RESUBMITTED) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive border-destructive/30 hover:bg-destructive/5"
                            onClick={() => setWithdrawDialogPlan(plan)}
                          >
                            <Undo2 className="h-4 w-4 mr-1" />
                            Withdraw
                          </Button>
                        )}
                        {(plan.status === WeeklyPlanStatus.APPROVED ||
                          plan.status === WeeklyPlanStatus.IN_EXECUTION ||
                          plan.status === WeeklyPlanStatus.OUTCOME_SUBMITTED ||
                          plan.status === WeeklyPlanStatus.COMPLETED) && (
                          <Button
                            size="sm"
                            onClick={() => navigate(`/compliance/field/execution-dashboard/${plan.id}`)}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            {plan.status === WeeklyPlanStatus.COMPLETED ? 'View' : 'Execute'}
                          </Button>
                        )}
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
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

      {/* Need Changes Section */}
      {needsChangesPlans.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Plans Requiring Changes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {needsChangesPlans.map(plan => (
                <div key={plan.id} className="bg-white p-4 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{plan.plan_number}</p>
                      <p className="text-sm text-muted-foreground">
                        Week: {plan.week_start_date} - {plan.week_end_date}
                      </p>
                      {plan.reviewer_comments && (
                        <p className="text-sm mt-2 text-yellow-800">
                          <span className="font-medium">Feedback:</span> {plan.reviewer_comments}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/compliance/audit-planning/weekly-plan-builder')}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Update Plan
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Withdraw Confirmation Dialog */}
      <Dialog open={!!withdrawDialogPlan} onOpenChange={(open) => !open && setWithdrawDialogPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Plan</DialogTitle>
            <DialogDescription>
              Withdraw {withdrawDialogPlan?.plan_number} from review? It will become editable again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Reason (optional)</Label>
            <Textarea
              value={withdrawReason}
              onChange={(e) => setWithdrawReason(e.target.value)}
              placeholder="Why are you withdrawing this plan?"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawDialogPlan(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => withdrawMutation.mutate()}
              disabled={withdrawMutation.isPending}
            >
              {withdrawMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Undo2 className="h-4 w-4 mr-1" />}
              Withdraw Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
