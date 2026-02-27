import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIADepartments, useIAAuditors } from '@/hooks/useAuditData';
import { useToast } from '@/hooks/use-toast';
import { PageShell, FilterBar } from '@/components/common';
import type { FilterField } from '@/components/common';

export default function AuditReports() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const { data: departments = [] } = useIADepartments();
  const { data: auditors = [] } = useIAAuditors();
  const [reportFilters, setReportFilters] = useState<Record<string, string>>({ department: 'all', period: '', status: 'all', auditor: 'all', dateFrom: '', dateTo: '' });

  const generateReport = (reportType: string) => {
    toast({ title: "Report Generated", description: `${reportType} report has been generated.` });
  };

  const reportTypes = [
    { id: 'plan-summary', title: 'Audit Plan Summary Report', description: 'Summary of audit plans by status, period, and department', icon: FileText, filters: ['department', 'status'] },
    { id: 'activity-schedule', title: 'Activity Schedule Report', description: 'Scheduled and completed activities with auditor assignments', icon: FileText, filters: ['department', 'auditor', 'dateFrom', 'dateTo'] },
    { id: 'auditor-workload', title: 'Auditor Workload Report', description: 'Activities distribution across auditors', icon: FileText, filters: ['auditor', 'dateFrom', 'dateTo'] },
    { id: 'findings-compliance', title: 'Findings & Compliance Report', description: 'Audit findings analysis with risk and compliance data', icon: FileText, filters: ['department', 'dateFrom', 'dateTo'] },
    { id: 'followup-register', title: 'Follow-Up Action Register', description: 'Pending and overdue corrective actions', icon: FileText, filters: ['status', 'dateFrom', 'dateTo'] },
  ];

  return (
    <PageShell
      title="Audit Reports"
      subtitle="Generate audit reports and analytics"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/plans' }, { label: 'Reports' }]}
      noPermission={!hasPermission('generate_reports')}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportTypes.map((rt) => (
          <Card key={rt.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <rt.icon className="w-5 h-5 text-primary" />{rt.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{rt.description}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rt.filters.includes('department') && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Department</Label>
                    <Select value={reportFilters.department} onValueChange={v => setReportFilters({...reportFilters, department: v})}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {rt.filters.includes('auditor') && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Auditor</Label>
                    <Select value={reportFilters.auditor} onValueChange={v => setReportFilters({...reportFilters, auditor: v})}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Auditors</SelectItem>
                        {auditors.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {rt.filters.includes('status') && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Select value={reportFilters.status} onValueChange={v => setReportFilters({...reportFilters, status: v})}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {rt.filters.includes('dateFrom') && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">From</Label>
                    <Input type="date" value={reportFilters.dateFrom} onChange={e => setReportFilters({...reportFilters, dateFrom: e.target.value})} className="h-10" />
                  </div>
                )}
                {rt.filters.includes('dateTo') && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">To</Label>
                    <Input type="date" value={reportFilters.dateTo} onChange={e => setReportFilters({...reportFilters, dateTo: e.target.value})} className="h-10" />
                  </div>
                )}
              </div>
              <Button onClick={() => generateReport(rt.title)} className="w-full">
                <Download className="w-4 h-4 mr-2" />Generate Report
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
