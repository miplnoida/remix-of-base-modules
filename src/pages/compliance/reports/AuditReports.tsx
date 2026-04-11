import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, CheckCircle, AlertTriangle, Download, Loader2, Inbox } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function AuditReports() {
  const { data: auditData = [], isLoading } = useQuery({
    queryKey: ['ce_audit_report_entries'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ce_audit_report_entries').select('*').order('audit_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const totalFindings = auditData.reduce((sum, r) => sum + (r.findings_count || 0), 0);
  const highSeverity = auditData.filter(r => r.severity === 'High').reduce((sum, r) => sum + (r.findings_count || 0), 0);
  const resolved = auditData.filter(r => r.status === 'Resolved' || r.status === 'Compliant').length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader title="Audit & Inspection Reports" subtitle="Audit findings, inspection results, and risk assessments" breadcrumbs={[{ label: 'Compliance', href: '/compliance/dashboard' }, { label: 'Reports', href: '/compliance/reports' }, { label: 'Audit Reports' }]} />

      <Card><CardHeader><CardTitle>Filters</CardTitle></CardHeader><CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div><label className="text-sm font-medium mb-2 block">Date Range</label><Select defaultValue="last-quarter"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="last-month">Last Month</SelectItem><SelectItem value="last-quarter">Last Quarter</SelectItem><SelectItem value="current-year">Current Year</SelectItem></SelectContent></Select></div>
          <div><label className="text-sm font-medium mb-2 block">Zone</label><Select defaultValue="all"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Zones</SelectItem><SelectItem value="zone-a">Zone A</SelectItem><SelectItem value="zone-b">Zone B</SelectItem><SelectItem value="zone-c">Zone C</SelectItem></SelectContent></Select></div>
          <div><label className="text-sm font-medium mb-2 block">Severity</label><Select defaultValue="all"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Severities</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select></div>
          <div className="flex items-end"><Button className="w-full">Apply Filters</Button></div>
        </div>
      </CardContent></Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Audits Completed</p><p className="text-2xl font-bold text-foreground">{auditData.length}</p></div><BarChart3 className="h-8 w-8 text-primary" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Findings</p><p className="text-2xl font-bold text-foreground">{totalFindings}</p></div><AlertTriangle className="h-8 w-8 text-warning" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">High Severity</p><p className="text-2xl font-bold text-foreground">{highSeverity}</p></div><AlertTriangle className="h-8 w-8 text-destructive" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Resolved</p><p className="text-2xl font-bold text-foreground">{resolved}</p></div><CheckCircle className="h-8 w-8 text-success" /></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><div className="flex items-center justify-between"><CardTitle>Recent Audit Results</CardTitle><Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export CSV</Button></div></CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : auditData.length === 0 ? <div className="flex flex-col items-center py-8"><Inbox className="h-10 w-10 text-muted-foreground mb-2" /><p className="text-muted-foreground">No audit data</p></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Employer</TableHead><TableHead>Zone</TableHead><TableHead>Audit Date</TableHead><TableHead className="text-right">Findings</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {auditData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.employer_name}</TableCell>
                    <TableCell>{row.zone}</TableCell>
                    <TableCell>{row.audit_date}</TableCell>
                    <TableCell className="text-right">{row.findings_count}</TableCell>
                    <TableCell><span className={row.severity === 'High' ? 'text-destructive font-semibold' : row.severity === 'Medium' ? 'text-warning' : row.severity === 'Low' ? 'text-primary' : 'text-success'}>{row.severity}</span></TableCell>
                    <TableCell><span className={row.status === 'Resolved' || row.status === 'Compliant' ? 'text-success' : row.status === 'Open' ? 'text-destructive' : 'text-warning'}>{row.status}</span></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
