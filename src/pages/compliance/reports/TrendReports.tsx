import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Download, Loader2, Inbox } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchCaseMonthlyTrend, fetchCaseResolutionStats } from '@/services/complianceReportingService';
import { exportReportToExcel } from '@/utils/reportExcelExport';

export default function TrendReports() {
  const { data: monthly = [], isLoading: ml } = useQuery({
    queryKey: ['ce_v_case_monthly_trend'],
    queryFn: fetchCaseMonthlyTrend,
  });

  const { data: resolution = [], isLoading: rl } = useQuery({
    queryKey: ['ce_v_case_resolution_stats'],
    queryFn: fetchCaseResolutionStats,
  });

  const isLoading = ml || rl;

  const resolutionRate = monthly.map(m => ({
    month: m.month_label,
    rate: m.created > 0 ? Number(((m.closed / m.created) * 100).toFixed(1)) : 0,
  }));

  const handleExport = async () => {
    await exportReportToExcel(
      monthly.map(m => ({
        month: m.month_label,
        created: m.created,
        closed: m.closed,
        resolution_rate: m.created > 0 ? `${((m.closed / m.created) * 100).toFixed(1)}%` : '0.0%',
      })),
      [
        { header: 'Month', key: 'month', width: 16 },
        { header: 'Cases Created', key: 'created', width: 16 },
        { header: 'Cases Closed', key: 'closed', width: 16 },
        { header: 'Resolution Rate', key: 'resolution_rate', width: 18 },
      ],
      'compliance_trends',
      'Trends'
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Trend Analysis"
        subtitle="Historical trends and predictive analytics"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance' },
          { label: 'Reports', href: '/compliance/reports' },
          { label: 'Trend Analysis' },
        ]}
      />

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport} disabled={monthly.length === 0}>
          <Download className="h-4 w-4 mr-2" />Export CSV
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : monthly.length === 0 && resolution.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Inbox className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No trend data available</p>
          <p className="text-sm mt-1">Trend analytics will appear once compliance cases are created and closed</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Case Creation Trends (Monthly)</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {monthly.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month_label" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="created" stroke="hsl(var(--primary))" strokeWidth={2} name="Created" />
                    <Line type="monotone" dataKey="closed" stroke="hsl(var(--success))" strokeWidth={2} name="Closed" />
                  </LineChart>
                </ResponsiveContainer>
              ) : <p className="text-center py-12 text-muted-foreground text-sm">No monthly data</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Resolution Rate Trend (%)</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {resolutionRate.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={resolutionRate}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="rate" stroke="hsl(var(--success))" strokeWidth={2} name="Resolution %" />
                  </LineChart>
                </ResponsiveContainer>
              ) : <p className="text-center py-12 text-muted-foreground text-sm">No resolution data</p>}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Average Resolution Days by Case Type</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {resolution.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={resolution}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="case_type" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avg_days" fill="hsl(var(--primary))" name="Avg Days" />
                    <Bar dataKey="case_count" fill="hsl(var(--accent))" name="Case Count" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center py-12 text-muted-foreground text-sm">No resolution stats</p>}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
