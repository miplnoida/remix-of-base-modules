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
import { Calendar, CheckCircle, Clock, XCircle, Eye, Plus } from 'lucide-react';
import { MOCK_WEEKLY_PLANS, MOCK_INSPECTORS } from '@/services/mockData/complianceData';
import { WeeklyPlanStatus } from '@/types/compliance';

export default function InspectorPlans() {
  const [selectedInspector, setSelectedInspector] = useState<string>('ALL');

  const filteredPlans = selectedInspector === 'ALL' 
    ? MOCK_WEEKLY_PLANS 
    : MOCK_WEEKLY_PLANS.filter(p => p.inspectorId === selectedInspector);

  const getStatusColor = (status: WeeklyPlanStatus) => {
    const colors: Record<WeeklyPlanStatus, string> = {
      [WeeklyPlanStatus.PLAN_DRAFT]: 'bg-gray-100 text-gray-800',
      [WeeklyPlanStatus.PLAN_SUBMITTED]: 'bg-blue-100 text-blue-800',
      [WeeklyPlanStatus.PLAN_TBS]: 'bg-yellow-100 text-yellow-800',
      [WeeklyPlanStatus.PLAN_APPROVED]: 'bg-green-100 text-green-800',
    };
    return colors[status];
  };

  const getStatusIcon = (status: WeeklyPlanStatus) => {
    const icons: Record<WeeklyPlanStatus, JSX.Element> = {
      [WeeklyPlanStatus.PLAN_DRAFT]: <Clock className="h-4 w-4" />,
      [WeeklyPlanStatus.PLAN_SUBMITTED]: <Clock className="h-4 w-4" />,
      [WeeklyPlanStatus.PLAN_TBS]: <XCircle className="h-4 w-4" />,
      [WeeklyPlanStatus.PLAN_APPROVED]: <CheckCircle className="h-4 w-4" />,
    };
    return icons[status];
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Inspector Weekly Plans"
        subtitle="Manage weekly workplans, approvals, and scheduling"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance' },
          { label: 'Inspector Plans' }
        ]}
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Inspectors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{MOCK_INSPECTORS.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Plans This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {MOCK_WEEKLY_PLANS.filter(p => p.status === WeeklyPlanStatus.PLAN_APPROVED).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {MOCK_WEEKLY_PLANS.filter(p => p.status === WeeklyPlanStatus.PLAN_SUBMITTED).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed Visits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {MOCK_WEEKLY_PLANS.reduce((sum, p) => sum + p.completedVisits, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inspector Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filter by Inspector</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedInspector === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedInspector('ALL')}
            >
              All Inspectors
            </Button>
            {MOCK_INSPECTORS.map(inspector => (
              <Button
                key={inspector.id}
                variant={selectedInspector === inspector.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedInspector(inspector.id)}
              >
                {inspector.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Plans Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Weekly Plans ({filteredPlans.length})</CardTitle>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Create Plan
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan Number</TableHead>
                <TableHead>Inspector</TableHead>
                <TableHead>Week Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Planned Visits</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Approved By</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
                    No plans found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPlans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.planNumber}</TableCell>
                    <TableCell>{plan.inspectorName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div className="text-sm">
                          {new Date(plan.weekStartDate).toLocaleDateString()} -{' '}
                          {new Date(plan.weekEndDate).toLocaleDateString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(plan.status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(plan.status)}
                          {plan.status.replace('PLAN_', '').replace('_', ' ')}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{plan.totalPlannedVisits}</TableCell>
                    <TableCell className="text-center">{plan.completedVisits}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{
                              width: `${(plan.completedVisits / plan.totalPlannedVisits) * 100}%`,
                            }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground min-w-[40px]">
                          {Math.round((plan.completedVisits / plan.totalPlannedVisits) * 100)}%
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {plan.submittedDate
                        ? new Date(plan.submittedDate).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {plan.approvedByName || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
