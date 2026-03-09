import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageShell } from '@/components/common';
import { MetricCard } from '@/components/shared/MetricCard';
import { BarChart3, AlertTriangle, CheckCircle, Clock, TrendingUp, Shield, FileText } from 'lucide-react';
import { useIAAuditUniverse, useIAEngagements, useIAControlTests, useIAQualityReviews } from '@/hooks/useAuditDataPhase2';
import { useIAFindings, useIAActionTracking } from '@/hooks/useAuditDataExtended2';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--accent))', 'hsl(var(--secondary))', 'hsl(var(--muted))'];

export default function ExecutiveDashboard() {
  const { data: universe = [] } = useIAAuditUniverse();
  const { data: engagements = [] } = useIAEngagements();
  const { data: controlTests = [] } = useIAControlTests();
  const { data: qualityReviews = [] } = useIAQualityReviews();
  const { data: findings = [] } = useIAFindings();
  const { data: actions = [] } = useIAActions();

  const stats = {
    totalPlanned: engagements.length,
    completed: engagements.filter((e: any) => e.status === 'Closed').length,
    openFindings: findings.filter((f: any) => f.status !== 'Closed').length,
    overdueActions: actions.filter((a: any) => a.status !== 'Closed' && a.target_date && new Date(a.target_date) < new Date()).length,
    highRiskEntities: universe.filter((u: any) => u.risk_category === 'High' || u.risk_category === 'Critical').length,
    controlTestPass: controlTests.filter((t: any) => t.result === 'Pass').length,
    closureRate: engagements.length ? Math.round(engagements.filter((e: any) => e.status === 'Closed').length / engagements.length * 100) : 0,
    qaReviews: qualityReviews.length,
  };

  const findingsBySeverity = [
    { name: 'Critical', value: findings.filter((f: any) => f.severity === 'Critical').length },
    { name: 'High', value: findings.filter((f: any) => f.severity === 'High').length },
    { name: 'Medium', value: findings.filter((f: any) => f.severity === 'Medium').length },
    { name: 'Low', value: findings.filter((f: any) => f.severity === 'Low').length },
  ].filter(d => d.value > 0);

  const engagementsByStatus = [
    { name: 'Draft', count: engagements.filter((e: any) => e.status === 'Draft').length },
    { name: 'In Progress', count: engagements.filter((e: any) => e.status === 'In Progress').length },
    { name: 'Fieldwork', count: engagements.filter((e: any) => e.status === 'Fieldwork Complete').length },
    { name: 'Reporting', count: engagements.filter((e: any) => e.status === 'Reporting').length },
    { name: 'Closed', count: engagements.filter((e: any) => e.status === 'Closed').length },
  ];

  return (
    <PageShell title="Executive Audit Dashboard" subtitle="High-level overview of internal audit performance"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/dashboard' }, { label: 'Executive Dashboard' }]}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Audits Planned" value={stats.totalPlanned} icon={BarChart3} variant="info" />
        <MetricCard title="Audits Completed" value={stats.completed} icon={CheckCircle} variant="success" />
        <MetricCard title="Open Findings" value={stats.openFindings} icon={AlertTriangle} variant="error" />
        <MetricCard title="Overdue Actions" value={stats.overdueActions} icon={Clock} variant="warning" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="High-Risk Entities" value={stats.highRiskEntities} icon={Shield} variant="error" />
        <MetricCard title="Controls Passed" value={stats.controlTestPass} icon={CheckCircle} variant="success" />
        <MetricCard title="Closure Rate" value={`${stats.closureRate}%`} icon={TrendingUp} variant="info" />
        <MetricCard title="QA Reviews" value={stats.qaReviews} icon={FileText} variant="default" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Engagement Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={engagementsByStatus}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" className="text-xs" /><YAxis /><Tooltip /><Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Findings by Severity</CardTitle></CardHeader>
          <CardContent>
            {findingsBySeverity.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart><Pie data={findingsBySeverity} cx="50%" cy="50%" outerRadius={100} dataKey="value" nameKey="name" label>{findingsBySeverity.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart>
              </ResponsiveContainer>
            ) : <div className="flex items-center justify-center h-[300px] text-muted-foreground">No findings data</div>}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
