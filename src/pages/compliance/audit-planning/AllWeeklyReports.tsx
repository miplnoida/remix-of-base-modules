import { useState, useEffect } from 'react';
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
import { Calendar, Eye, FileText, Users, TrendingUp } from 'lucide-react';
import { WeeklyAuditPlan, WeeklyPlanWorkflowStatus } from '@/types/weeklyAuditPlan';
import { weeklyAuditPlanService } from '@/services/weeklyAuditPlanService';
import { useNavigate } from 'react-router-dom';

export default function AllWeeklyReports() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<WeeklyAuditPlan[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAllPlans();
  }, []);

  const loadAllPlans = async () => {
    setLoading(true);
    try {
      // Manager view - load all reports from all inspectors
      const data = await weeklyAuditPlanService.getAll();
      const relevantPlans = data.filter(p => 
        p.status === WeeklyPlanWorkflowStatus.IN_EXECUTION ||
        p.status === WeeklyPlanWorkflowStatus.COMPLETED
      );
      setPlans(relevantPlans);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load weekly reports',
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
              {new Set(plans.map(p => p.inspectorId)).size}
            </div>
          </CardContent>
        </Card>
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
              Completed Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {plans.filter(p => p.weeklyReportSubmittedAt).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Visits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {plans.reduce((sum, p) => sum + p.completedVisits, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Weekly Plans & Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading reports...</p>
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
                      <TableCell className="font-medium">{plan.inspectorName}</TableCell>
                      <TableCell>{plan.planNumber}</TableCell>
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
                          <div className={`text-sm ${rate >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                            {rate}%
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {plan.weeklyReportSubmittedAt ? (
                          <Badge variant="secondary">Submitted</Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/compliance/audit-planning/weekly-reports?planId=${plan.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Report
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
    </div>
  );
}
