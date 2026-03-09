import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/common';
import { MetricCard } from '@/components/shared/MetricCard';
import { FileText, AlertTriangle, Clock, Download } from 'lucide-react';
import { useIAEngagements, useIAAuditUniverse } from '@/hooks/useAuditDataPhase2';
import { useIAFindings } from '@/hooks/useAuditDataExtended2';
import { useIAActions } from '@/hooks/useAuditData';
import { useToast } from '@/hooks/use-toast';

export default function CommitteeReports() {
  const { data: engagements = [] } = useIAEngagements();
  const { data: findings = [] } = useIAFindings();
  const { data: actions = [] } = useIAActions();
  const { data: universe = [] } = useIAAuditUniverse();
  const { toast } = useToast();

  const openFindings = findings.filter((f: any) => f.status !== 'Closed');
  const criticalFindings = openFindings.filter((f: any) => f.severity === 'Critical' || f.severity === 'High');
  const overdueActions = actions.filter((a: any) => a.status !== 'Closed' && a.target_date && new Date(a.target_date) < new Date());
  const highRiskEntities = universe.filter((u: any) => u.risk_category === 'High' || u.risk_category === 'Critical');

  const handleExport = (reportName: string) => { toast({ title: 'Export', description: `${reportName} export will be available in PDF format.` }); };

  const reports = [
    { title: 'Committee Summary Report', description: 'Overview of audit activities, key findings, and management actions.', count: engagements.length, icon: FileText },
    { title: 'Open Critical Issues', description: 'All open findings rated Critical or High.', count: criticalFindings.length, icon: AlertTriangle },
    { title: 'High-Risk Entity List', description: 'Entities rated as High or Critical risk.', count: highRiskEntities.length, icon: AlertTriangle },
    { title: 'Overdue Management Responses', description: 'Actions that have exceeded their target dates.', count: overdueActions.length, icon: Clock },
    { title: 'Audit Plan Progress', description: 'Status of all planned engagements.', count: engagements.filter((e: any) => e.status === 'Closed').length, icon: FileText },
  ];

  return (
    <PageShell title="Committee Reports" subtitle="Prepare board and committee-ready reporting packs"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/dashboard' }, { label: 'Committee Reports' }]}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Engagements" value={engagements.length} icon={FileText} variant="info" />
        <MetricCard title="Critical Issues" value={criticalFindings.length} icon={AlertTriangle} variant="error" />
        <MetricCard title="Overdue Actions" value={overdueActions.length} icon={Clock} variant="warning" />
        <MetricCard title="High-Risk Entities" value={highRiskEntities.length} icon={AlertTriangle} variant="error" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((report, idx) => (
          <Card key={idx} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="space-y-1"><CardTitle className="text-base">{report.title}</CardTitle><p className="text-sm text-muted-foreground">{report.description}</p></div>
              <report.icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{report.count}</span>
                <Button variant="outline" size="sm" onClick={() => handleExport(report.title)}><Download className="h-3 w-3 mr-1" />Export PDF</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
