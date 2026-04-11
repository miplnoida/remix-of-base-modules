import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CaseStatus, CaseType } from '@/types/compliance';
import { Loader2, Inbox } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchComplianceCases } from '@/services/complianceDataService';
import { fetchCaseMonthlyTrend, fetchCaseResolutionStats } from '@/services/complianceReportingService';

const COLORS = ['hsl(var(--primary))', 'hsl(142, 76%, 36%)', 'hsl(199, 89%, 48%)', 'hsl(45, 93%, 47%)', 'hsl(0, 84%, 60%)'];

export default function CaseAnalytics() {
  const { data: cases = [], isLoading: casesLoading } = useQuery({
    queryKey: ['ce_cases_analytics'],
    queryFn: () => fetchComplianceCases(),
  });

  const { data: monthlyTrend = [], isLoading: trendLoading } = useQuery({
    queryKey: ['ce_case_monthly_trend'],
    queryFn: fetchCaseMonthlyTrend,
  });

  const { data: resolutionStats = [], isLoading: resLoading } = useQuery({
    queryKey: ['ce_case_resolution_stats'],
    queryFn: fetchCaseResolutionStats,
  });

  const isLoading = casesLoading || trendLoading || resLoading;

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const casesByStatus = Object.values(CaseStatus).map(status => ({
    status: status.replace(/_/g, ' '),
    count: cases.filter((c: any) => c.status === status).length
  }));

  const casesByType = Object.values(CaseType).map(type => ({
    type: type.replace(/_/g, ' '),
    count: cases.filter((c: any) => c.case_type === type).length,
    value: cases.filter((c: any) => c.case_type === type).length
  }));

  const casesByZone = [
    { zone: 'Zone 1 - Basseterre', cases: cases.filter((c: any) => (c.territory || '').includes('Z1')).length, resolved: cases.filter((c: any) => (c.territory || '').includes('Z1') && c.status === 'COMPLETED').length },
    { zone: 'Zone 2 - St. Peters', cases: cases.filter((c: any) => (c.territory || '').includes('Z2')).length, resolved: cases.filter((c: any) => (c.territory || '').includes('Z2') && c.status === 'COMPLETED').length },
    { zone: 'Zone 3 - Nevis', cases: cases.filter((c: any) => (c.territory || '').includes('Z3')).length, resolved: cases.filter((c: any) => (c.territory || '').includes('Z3') && c.status === 'COMPLETED').length },
  ];

  const activeCases = cases.filter((c: any) => c.status === CaseStatus.ACTIVE);
  const completedCases = cases.filter((c: any) => c.status === CaseStatus.COMPLETED);
  const avgResolution = resolutionStats.length > 0
    ? Math.round(resolutionStats.reduce((s, r) => s + r.avg_days * r.case_count, 0) / Math.max(resolutionStats.reduce((s, r) => s + r.case_count, 0), 1))
    : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader title="Case Analytics Report" subtitle="Comprehensive case management statistics and trends" breadcrumbs={[{ label: 'Compliance', href: '/compliance' }, { label: 'Reports', href: '/compliance/reports' }, { label: 'Case Analytics' }]} />

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Total Cases</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-foreground">{cases.length}</div><p className="text-xs text-muted-foreground mt-1">All time</p></CardContent></Card>
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Active Cases</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-primary">{activeCases.length}</div><p className="text-xs text-muted-foreground mt-1">Currently open</p></CardContent></Card>
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-foreground">{completedCases.length}</div><p className="text-xs text-muted-foreground mt-1">Resolved</p></CardContent></Card>
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Avg Resolution</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-primary">{avgResolution}</div><p className="text-xs text-muted-foreground mt-1">Days</p></CardContent></Card>
      </div>

      {cases.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Inbox className="h-12 w-12 mx-auto mb-3 opacity-50" /><p className="font-medium">No cases found</p><p className="text-sm mt-1">Case analytics will appear once compliance cases are created</p></CardContent></Card>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <Card><CardHeader><CardTitle>Cases by Status</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><BarChart data={casesByStatus}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="status" tick={{ fontSize: 12 }} /><YAxis /><Tooltip /><Bar dataKey="count" fill="hsl(var(--primary))" /></BarChart></ResponsiveContainer></CardContent></Card>
            <Card><CardHeader><CardTitle>Cases by Type</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={casesByType.filter(d => d.value > 0)} cx="50%" cy="50%" labelLine={false} label={(entry) => entry.type.substring(0, 15)} outerRadius={100} fill="#8884d8" dataKey="value">{casesByType.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></CardContent></Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card><CardHeader><CardTitle>Monthly Case Trends</CardTitle></CardHeader><CardContent>
              {monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}><LineChart data={monthlyTrend}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="month_label" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="created" stroke="hsl(var(--primary))" strokeWidth={2} name="Created" /><Line type="monotone" dataKey="closed" stroke="hsl(199, 89%, 48%)" strokeWidth={2} name="Closed" /></LineChart></ResponsiveContainer>
              ) : (
                <p className="text-center py-12 text-muted-foreground text-sm">No trend data available yet</p>
              )}
            </CardContent></Card>
            <Card><CardHeader><CardTitle>Cases by Zone</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><BarChart data={casesByZone}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="zone" tick={{ fontSize: 11 }} /><YAxis /><Tooltip /><Legend /><Bar dataKey="cases" fill="hsl(var(--primary))" name="Total Cases" /><Bar dataKey="resolved" fill="hsl(199, 89%, 48%)" name="Resolved" /></BarChart></ResponsiveContainer></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Average Resolution Time by Case Type</CardTitle></CardHeader>
            <CardContent>
              {resolutionStats.length > 0 ? (
                <Table>
                  <TableHeader><TableRow><TableHead>Case Type</TableHead><TableHead>Cases</TableHead><TableHead>Average Days to Resolve</TableHead><TableHead>Performance</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {resolutionStats.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{(item.case_type || '').replace(/_/g, ' ')}</TableCell>
                        <TableCell>{item.case_count}</TableCell>
                        <TableCell>{item.avg_days} days</TableCell>
                        <TableCell><Badge variant={item.avg_days < 45 ? 'default' : item.avg_days < 60 ? 'secondary' : 'destructive'}>{item.avg_days < 45 ? 'Good' : item.avg_days < 60 ? 'Moderate' : 'Needs Improvement'}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-8 text-muted-foreground text-sm">No resolution data available</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
