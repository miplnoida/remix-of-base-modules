import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart3, FileSearch, CheckCircle, AlertTriangle, Clock, Users, 
  CalendarDays, TrendingUp, Shield, FileText 
} from 'lucide-react';
import { useIAAnnualPlans, useIAActivities, useIAFindings, useIAAuditors, useIAFollowUps, useIAWorkingPapers, useIAActionTracking, useIADepartments } from '@/hooks/useAuditData';
import { PageShell, StatusBadge, DataTable } from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function AuditDashboard() {
  const navigate = useNavigate();
  const { data: plans = [], isLoading: plansLoading } = useIAAnnualPlans();
  const { data: activities = [] } = useIAActivities();
  const { data: findings = [] } = useIAFindings();
  const { data: auditors = [] } = useIAAuditors();
  const { data: followUps = [] } = useIAFollowUps();
  const { data: workingPapers = [] } = useIAWorkingPapers();
  const { data: actions = [] } = useIAActionTracking();
  const { data: departments = [] } = useIADepartments();

  const activePlans = plans.filter((p: any) => p.status === 'Approved' || p.status === 'In Progress');
  const completedActivities = activities.filter((a: any) => a.status === 'Completed');
  const openFindings = findings.filter((f: any) => f.status !== 'Closed');
  const highRiskFindings = findings.filter((f: any) => f.risk_rating === 'High' && f.status !== 'Closed');
  const overdueFollowUps = followUps.filter((fu: any) => fu.status !== 'Resolved' && fu.due_date && new Date(fu.due_date) < new Date());
  const pendingActions = actions.filter((a: any) => a.status === 'Not Started' || a.status === 'In Progress');

  const activityCompletion = activities.length > 0 ? Math.round((completedActivities.length / activities.length) * 100) : 0;

  const kpiCards = [
    { label: 'Active Plans', value: activePlans.length, icon: CalendarDays, color: 'text-primary' },
    { label: 'Activities', value: `${completedActivities.length}/${activities.length}`, icon: BarChart3, color: 'text-blue-600' },
    { label: 'Open Findings', value: openFindings.length, icon: FileSearch, color: 'text-orange-600' },
    { label: 'High Risk', value: highRiskFindings.length, icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Overdue Follow-ups', value: overdueFollowUps.length, icon: Clock, color: overdueFollowUps.length > 0 ? 'text-destructive' : 'text-green-600' },
    { label: 'Pending Actions', value: pendingActions.length, icon: Shield, color: 'text-purple-600' },
    { label: 'Working Papers', value: workingPapers.filter((wp: any) => wp.status === 'Draft').length, icon: FileText, subLabel: 'In Draft' },
    { label: 'Auditors', value: auditors.length, icon: Users, color: 'text-muted-foreground' },
  ];

  // Recent findings
  const recentFindings = [...findings].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
  const findingColumns: DataTableColumn<any>[] = [
    { key: 'finding_id', header: 'ID', render: (f) => <span className="text-xs font-mono">{f.finding_id || f.id?.slice(0, 8)}</span> },
    { key: 'title', header: 'Title', render: (f) => <span className="font-medium">{f.title}</span> },
    { key: 'risk_rating', header: 'Risk', render: (f) => <StatusBadge status={f.risk_rating || 'Medium'} /> },
    { key: 'status', header: 'Status', render: (f) => <StatusBadge status={f.status} /> },
  ];

  // Upcoming activities
  const upcomingActivities = activities
    .filter((a: any) => a.scheduled_date && new Date(a.scheduled_date) >= new Date() && a.status !== 'Completed')
    .sort((a: any, b: any) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
    .slice(0, 5);
  const activityColumns: DataTableColumn<any>[] = [
    { key: 'title', header: 'Activity', render: (a) => <span className="font-medium">{a.title}</span> },
    { key: 'scheduled_date', header: 'Date', render: (a) => a.scheduled_date ? new Date(a.scheduled_date).toLocaleDateString() : '-' },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
  ];

  // Finding distribution by risk
  const riskDistribution = [
    { label: 'High', count: findings.filter((f: any) => f.risk_rating === 'High').length, color: 'bg-destructive' },
    { label: 'Medium', count: findings.filter((f: any) => f.risk_rating === 'Medium').length, color: 'bg-orange-500' },
    { label: 'Low', count: findings.filter((f: any) => f.risk_rating === 'Low').length, color: 'bg-green-500' },
  ];
  const totalRisk = riskDistribution.reduce((s, r) => s + r.count, 0) || 1;

  return (
    <PageShell
      title="Internal Audit Dashboard"
      subtitle="Overview of audit activities, findings, and key performance indicators"
      breadcrumbs={[{ label: 'Internal Audit' }, { label: 'Dashboard' }]}
      isLoading={plansLoading}
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <card.icon className={`h-5 w-5 ${card.color || 'text-muted-foreground'}`} />
                <div className="ml-3">
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className={`text-2xl font-bold ${card.color || ''}`}>{card.value}</p>
                  {card.subLabel && <p className="text-xs text-muted-foreground">{card.subLabel}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity Completion & Risk Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Activity Completion Rate</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-medium">{activityCompletion}%</span>
              </div>
              <Progress value={activityCompletion} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{completedActivities.length} completed</span>
                <span>{activities.filter((a: any) => a.status === 'In Progress').length} in progress</span>
                <span>{activities.filter((a: any) => a.status === 'Planned').length} planned</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Finding Risk Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {riskDistribution.map((r) => (
                <div key={r.label} className="flex items-center gap-3">
                  <span className="text-sm w-16">{r.label}</span>
                  <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                    <div className={`h-full ${r.color} rounded-full transition-all`} style={{ width: `${(r.count / totalRisk) * 100}%` }} />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{r.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-1" onClick={() => navigate('/audit/audit-plans')}>
          <CalendarDays className="h-5 w-5" />
          <span className="text-xs">Audit Plans</span>
        </Button>
        <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-1" onClick={() => navigate('/audit/findings')}>
          <FileSearch className="h-5 w-5" />
          <span className="text-xs">Findings</span>
        </Button>
        <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-1" onClick={() => navigate('/audit/follow-up-tracker')}>
          <TrendingUp className="h-5 w-5" />
          <span className="text-xs">Follow-ups</span>
        </Button>
        <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-1" onClick={() => navigate('/audit/audit-reports')}>
          <FileText className="h-5 w-5" />
          <span className="text-xs">Reports</span>
        </Button>
      </div>

      {/* Recent Findings & Upcoming Activities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Recent Findings</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/audit/findings')}>View All</Button>
          </CardHeader>
          <CardContent>
            <DataTable columns={findingColumns} data={recentFindings} emptyMessage="No findings yet" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Upcoming Activities</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/audit/calendar')}>View Calendar</Button>
          </CardHeader>
          <CardContent>
            <DataTable columns={activityColumns} data={upcomingActivities} emptyMessage="No upcoming activities" />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
