import { useState, useEffect } from 'react';
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
  Calendar,
  Eye,
  Edit,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WeeklyAuditPlan, WeeklyPlanWorkflowStatus } from '@/types/weeklyAuditPlan';
import { weeklyAuditPlanService } from '@/services/weeklyAuditPlanService';
import { useNavigate } from 'react-router-dom';

export default function MyPlans() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<WeeklyAuditPlan[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMyPlans();
  }, []);

  const loadMyPlans = async () => {
    setLoading(true);
    try {
      const data = await weeklyAuditPlanService.getAll({
        inspectorId: 'inspector-001' // Would come from auth context
      });
      setPlans(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load plans',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPlan = async (planId: string) => {
    try {
      await weeklyAuditPlanService.submit(planId);
      toast({
        title: 'Plan Submitted',
        description: 'Weekly plan submitted for review'
      });
      await loadMyPlans();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit plan',
        variant: 'destructive'
      });
    }
  };

  const getStatusIcon = (status: WeeklyPlanWorkflowStatus) => {
    switch (status) {
      case WeeklyPlanWorkflowStatus.DRAFT:
        return <Edit className="h-4 w-4" />;
      case WeeklyPlanWorkflowStatus.SUBMITTED:
        return <Clock className="h-4 w-4" />;
      case WeeklyPlanWorkflowStatus.NEED_CHANGES:
        return <AlertCircle className="h-4 w-4" />;
      case WeeklyPlanWorkflowStatus.RESUBMITTED:
        return <Send className="h-4 w-4" />;
      case WeeklyPlanWorkflowStatus.APPROVED:
        return <CheckCircle className="h-4 w-4" />;
      case WeeklyPlanWorkflowStatus.IN_EXECUTION:
        return <Clock className="h-4 w-4" />;
      case WeeklyPlanWorkflowStatus.COMPLETED:
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
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

  const draftPlans = plans.filter(p => p.status === WeeklyPlanWorkflowStatus.DRAFT);
  const pendingPlans = plans.filter(p => 
    p.status === WeeklyPlanWorkflowStatus.SUBMITTED || 
    p.status === WeeklyPlanWorkflowStatus.RESUBMITTED
  );
  const approvedPlans = plans.filter(p => 
    p.status === WeeklyPlanWorkflowStatus.APPROVED ||
    p.status === WeeklyPlanWorkflowStatus.IN_EXECUTION
  );
  const completedPlans = plans.filter(p => p.status === WeeklyPlanWorkflowStatus.COMPLETED);

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
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Draft Plans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftPlans.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{pendingPlans.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Approved/Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedPlans.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{completedPlans.length}</div>
          </CardContent>
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
              <p className="text-muted-foreground">Loading plans...</p>
            </div>
          ) : plans.length === 0 ? (
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
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.planNumber}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{plan.weekStartDate} - {plan.weekEndDate}</span>
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
                    <TableCell>{plan.totalPlannedVisits}</TableCell>
                    <TableCell>
                      {plan.completedVisits} / {plan.totalPlannedVisits}
                    </TableCell>
                    <TableCell>
                      {plan.submittedAt ? new Date(plan.submittedAt).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        {plan.status === WeeklyPlanWorkflowStatus.DRAFT && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate('/compliance/audit-planning/weekly-plan-builder')}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSubmitPlan(plan.id)}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Submit
                            </Button>
                          </>
                        )}
                        {plan.status === WeeklyPlanWorkflowStatus.NEED_CHANGES && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/compliance/audit-planning/weekly-plan-builder')}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Update & Resubmit
                          </Button>
                        )}
                        {(plan.status === WeeklyPlanWorkflowStatus.APPROVED || 
                          plan.status === WeeklyPlanWorkflowStatus.IN_EXECUTION) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/compliance/audit-planning/field-execution')}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Execute
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                        >
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
      {plans.some(p => p.status === WeeklyPlanWorkflowStatus.NEED_CHANGES) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Plans Requiring Changes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {plans
                .filter(p => p.status === WeeklyPlanWorkflowStatus.NEED_CHANGES)
                .map(plan => (
                  <div key={plan.id} className="bg-white p-4 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{plan.planNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          Week: {plan.weekStartDate} - {plan.weekEndDate}
                        </p>
                        {plan.reviewComments && (
                          <p className="text-sm mt-2 text-yellow-800">
                            <span className="font-medium">Feedback:</span> {plan.reviewComments}
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
    </div>
  );
}
