import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIADepartments, useIAAuditors } from '@/hooks/useAuditData';
import { useToast } from '@/hooks/use-toast';

export default function AuditReports() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const { data: departments = [] } = useIADepartments();
  const { data: auditors = [] } = useIAAuditors();
  const [reportFilters, setReportFilters] = useState({ department: 'all', period: '', status: 'all', auditor: 'all', dateFrom: '', dateTo: '' });

  const generateReport = (reportType: string) => {
    toast({ title: "Report Generated", description: `${reportType} report has been generated.` });
  };

  const reportTypes = [
    { id: 'plan-summary', title: 'Audit Plan Summary Report', description: 'Summary of audit plans', filters: ['department', 'period', 'status'] },
    { id: 'activity-schedule', title: 'Activity Schedule Report', description: 'List of scheduled activities', filters: ['department', 'auditor', 'dateFrom', 'dateTo'] },
    { id: 'auditor-workload', title: 'Auditor Workload Report', description: 'Activities by auditor', filters: ['auditor', 'dateFrom', 'dateTo'] },
    { id: 'findings-compliance', title: 'Findings & Compliance Report', description: 'Observations and findings analysis', filters: ['department', 'dateFrom', 'dateTo'] },
    { id: 'followup-register', title: 'Follow-Up Action Register', description: 'Pending and overdue follow-ups', filters: ['status', 'dateFrom', 'dateTo'] },
  ];

  if (!hasPermission('generate_reports')) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">No permission.</p></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Audit Reports</h1><p className="text-muted-foreground">Generate audit reports and analytics</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportTypes.map((rt) => (
          <Card key={rt.id}>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />{rt.title}</CardTitle><p className="text-sm text-muted-foreground">{rt.description}</p></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rt.filters.includes('department') && <div className="space-y-2"><Label>Department</Label><Select value={reportFilters.department} onValueChange={v => setReportFilters({...reportFilters, department: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>}
                {rt.filters.includes('auditor') && <div className="space-y-2"><Label>Auditor</Label><Select value={reportFilters.auditor} onValueChange={v => setReportFilters({...reportFilters, auditor: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{auditors.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></div>}
                {rt.filters.includes('dateFrom') && <div className="space-y-2"><Label>From</Label><Input type="date" value={reportFilters.dateFrom} onChange={e => setReportFilters({...reportFilters, dateFrom: e.target.value})} /></div>}
                {rt.filters.includes('dateTo') && <div className="space-y-2"><Label>To</Label><Input type="date" value={reportFilters.dateTo} onChange={e => setReportFilters({...reportFilters, dateTo: e.target.value})} /></div>}
              </div>
              <Button onClick={() => generateReport(rt.title)} className="w-full"><Download className="w-4 h-4 mr-2" />Generate</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
