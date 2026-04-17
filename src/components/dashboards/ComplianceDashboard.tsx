import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Clock, Calendar, TrendingDown, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchComplianceMetrics, fetchRecentViolations, fetchUpcomingInspections } from '@/services/dashboardDataService';

export const ComplianceDashboard = () => {
  const navigate = useNavigate();

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboard_compliance_metrics'],
    queryFn: fetchComplianceMetrics,
  });

  const { data: violations = [], isLoading: violationsLoading } = useQuery({
    queryKey: ['dashboard_recent_violations'],
    queryFn: fetchRecentViolations,
  });

  const { data: inspections = [], isLoading: inspectionsLoading } = useQuery({
    queryKey: ['dashboard_upcoming_inspections'],
    queryFn: fetchUpcomingInspections,
  });

  const isLoading = metricsLoading;

  const complianceMetrics = [
    { label: 'Open Violations', value: String(metrics?.active_violations ?? 0), status: 'danger', icon: AlertTriangle, route: '/compliance/violations' },
    { label: 'Compliant Employers', value: String(metrics?.compliant_employers ?? 0), status: 'success', icon: CheckCircle, route: '/compliance/employers/management' },
    { label: 'Pending Audits', value: String(metrics?.pending_audits ?? 0), status: 'warning', icon: Clock, route: '/compliance/field/audit-management' },
    { label: 'Total Employers', value: String(metrics?.total_employers ?? 0), status: 'info', icon: Calendar, route: '/employers-management/dashboard' },
  ];

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Compliance Dashboard</h1>
        <p className="text-muted-foreground">Monitor compliance status and manage violations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {complianceMetrics.map((metric, index) => (
          <Card
            key={index}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(metric.route)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(metric.route); } }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
              <metric.icon className={`h-4 w-4 ${metric.status === 'danger' ? 'text-destructive' : metric.status === 'success' ? 'text-secondary' : metric.status === 'warning' ? 'text-accent-foreground' : 'text-primary'}`} />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{metric.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Active Violations</span>
              <Button size="sm" onClick={() => navigate('/compliance/violations')}>View All</Button>
            </CardTitle>
            <CardDescription>Current compliance violations requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            {violationsLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : violations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No active violations</div>
            ) : (
              <div className="space-y-4">
                {violations.slice(0, 4).map((v) => {
                  const daysOpen = Math.floor((new Date().getTime() - new Date(v.created_at).getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={v.id} className="border rounded-lg p-4 space-y-2 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate(`/compliance/violations/${v.id}`)}>
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{v.employer_name ?? 'Unknown'}</h4>
                        <Badge variant={v.severity === 'HIGH' || v.severity === 'CRITICAL' ? 'destructive' : v.severity === 'MEDIUM' ? 'default' : 'secondary'}>{v.severity}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{v.summary ?? v.violation_number}</p>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Assigned: {v.assigned_to_name ?? 'Unassigned'}</span>
                        <span>{daysOpen} days open</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" />Upcoming Inspections</span>
              <Button size="sm" onClick={() => navigate('/compliance/inspections')}>Schedule New</Button>
            </CardTitle>
            <CardDescription>Planned inspections and reviews</CardDescription>
          </CardHeader>
          <CardContent>
            {inspectionsLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : inspections.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No upcoming inspections</div>
            ) : (
              <div className="space-y-4">
                {inspections.slice(0, 4).map((insp, index) => (
                  <div key={insp.id || index} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{insp.employer_name ?? 'Unknown'}</h4>
                      <Badge variant="outline">{insp.inspection_type}</Badge>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{insp.scheduled_date}</span>
                      <span>Inspector: {insp.inspector_name ?? 'TBD'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingDown className="h-5 w-5 text-secondary" />Compliance Overview</CardTitle>
          <CardDescription>Current compliance posture</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              className="text-center cursor-pointer rounded-lg p-3 hover:bg-muted/60 transition-colors"
              onClick={() => navigate('/compliance/workbench/analytics')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/compliance/workbench/analytics'); } }}
            >
              <div className="text-2xl font-bold text-secondary">
                {metrics && metrics.total_employers > 0
                  ? ((metrics.compliant_employers / metrics.total_employers) * 100).toFixed(0)
                  : 0}%
              </div>
              <p className="text-sm text-muted-foreground">Overall Compliance Rate</p>
            </div>
            <div
              className="text-center cursor-pointer rounded-lg p-3 hover:bg-muted/60 transition-colors"
              onClick={() => navigate('/compliance/field/inspections')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/compliance/field/inspections'); } }}
            >
              <div className="text-2xl font-bold text-primary">{inspections.length}</div>
              <p className="text-sm text-muted-foreground">Upcoming Inspections</p>
            </div>
            <div
              className="text-center cursor-pointer rounded-lg p-3 hover:bg-muted/60 transition-colors"
              onClick={() => navigate('/compliance/violations')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/compliance/violations'); } }}
            >
              <div className="text-2xl font-bold text-accent-foreground">{violations.length}</div>
              <p className="text-sm text-muted-foreground">Active Violations</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
