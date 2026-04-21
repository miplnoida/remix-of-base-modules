import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ClipboardCheck, TrendingDown, AlertTriangle, CheckCircle, Download, Loader2, Inbox } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchC3ComplianceSummary, fetchC3AggregateStats, fetchC3ByZone } from '@/services/complianceReportingService';
import { exportReportToExcel } from '@/utils/reportExcelExport';
import { useMemo, useState } from 'react';

export default function C3Compliance() {
  const [zoneFilter, setZoneFilter] = useState('all');
  const { data: employers = [], isLoading: empLoading } = useQuery({
    queryKey: ['ce_c3_compliance_summary'],
    queryFn: fetchC3ComplianceSummary,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['ce_c3_aggregate_stats'],
    queryFn: fetchC3AggregateStats,
  });

  const { data: zoneData = [], isLoading: zoneLoading } = useQuery({
    queryKey: ['ce_c3_by_zone'],
    queryFn: fetchC3ByZone,
  });

  const isLoading = empLoading || statsLoading || zoneLoading;

  const zoneOptions = useMemo(() => Array.from(new Set(employers.map((e: any) => e.zone).filter(Boolean))).sort(), [employers]);
  const filteredEmployers = useMemo(
    () => zoneFilter === 'all' ? employers : employers.filter((e: any) => e.zone === zoneFilter),
    [employers, zoneFilter]
  );

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const totalOnTime = stats?.total_on_time || 0;
  const totalLate = stats?.total_late || 0;
  const totalMissing = stats?.total_missing || 0;
  const totalAll = totalOnTime + totalLate + totalMissing;
  const complianceRate = totalAll > 0 ? ((totalOnTime / totalAll) * 100).toFixed(1) : '0.0';

  const submissionTypeData = [
    { name: 'On-Time', value: totalOnTime, color: 'hsl(var(--success))' },
    { name: 'Late', value: totalLate, color: 'hsl(var(--warning))' },
    { name: 'Missing', value: totalMissing, color: 'hsl(var(--destructive))' },
  ].filter(d => d.value > 0);

  const handleExport = async () => {
    await exportReportToExcel(
      filteredEmployers.map((r: any) => ({
        employer_name: r.employer_name || r.employer_id,
        zone: r.zone || '-',
        on_time: r.on_time,
        late: r.late,
        missing: r.missing,
        compliance_rate: `${r.compliance_rate}%`,
      })),
      [
        { header: 'Employer', key: 'employer_name', width: 32 },
        { header: 'Zone', key: 'zone', width: 14 },
        { header: 'On-Time', key: 'on_time', width: 12 },
        { header: 'Late', key: 'late', width: 12 },
        { header: 'Missing', key: 'missing', width: 12 },
        { header: 'Compliance Rate', key: 'compliance_rate', width: 16 },
      ],
      'c3_compliance',
      'C3 Compliance'
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="C3 Compliance Reports"
        subtitle="C3 submission rates, timeliness, and employer compliance"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance/dashboard' },
          { label: 'Reports', href: '/compliance/reports' },
          { label: 'C3 Compliance' }
        ]}
      />

      <Card><CardHeader><CardTitle>Filters</CardTitle></CardHeader><CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div><label className="text-sm font-medium mb-2 block">Zone</label>
            <Select value={zoneFilter} onValueChange={setZoneFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                {zoneOptions.map(z => <SelectItem key={z as string} value={z as string}>{z as string}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent></Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">On-Time Submissions</p><p className="text-2xl font-bold text-foreground">{totalOnTime}</p><p className="text-xs text-success">{complianceRate}% compliance</p></div><CheckCircle className="h-8 w-8 text-success" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Late Submissions</p><p className="text-2xl font-bold text-foreground">{totalLate}</p><p className="text-xs text-warning">{totalAll > 0 ? ((totalLate / totalAll) * 100).toFixed(1) : 0}% of total</p></div><AlertTriangle className="h-8 w-8 text-warning" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Missing C3s</p><p className="text-2xl font-bold text-foreground">{totalMissing}</p><p className="text-xs text-destructive">{totalAll > 0 ? ((totalMissing / totalAll) * 100).toFixed(1) : 0}% non-compliant</p></div><TrendingDown className="h-8 w-8 text-destructive" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Overall Compliance</p><p className="text-2xl font-bold text-foreground">{complianceRate}%</p><p className="text-xs text-primary">Target: 85%</p></div><ClipboardCheck className="h-8 w-8 text-primary" /></div></CardContent></Card>
      </div>

      {totalAll === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Inbox className="h-12 w-12 mx-auto mb-3 opacity-50" /><p className="font-medium">No C3 data available</p><p className="text-sm mt-1">C3 compliance data will appear once C3 submissions are recorded</p></CardContent></Card>
      ) : (
        <>
          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Submission Type Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={submissionTypeData} cx="50%" cy="50%" labelLine={false} label={(entry) => `${entry.name}: ${entry.value}`} outerRadius={100} dataKey="value">
                      {submissionTypeData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Compliance by Zone</CardTitle></CardHeader>
              <CardContent>
                {zoneData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={zoneData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="zone" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="on_time" fill="hsl(var(--success))" name="On-Time" />
                      <Bar dataKey="late" fill="hsl(var(--warning))" name="Late" />
                      <Bar dataKey="missing" fill="hsl(var(--destructive))" name="Missing" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center py-12 text-muted-foreground text-sm">No zone data available</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Data Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Employer C3 Compliance Details</CardTitle>
                <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredEmployers.length === 0}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employer</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead className="text-right">On-Time</TableHead>
                    <TableHead className="text-right">Late</TableHead>
                    <TableHead className="text-right">Missing</TableHead>
                    <TableHead className="text-right">Compliance Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployers.map((row: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{row.employer_name || row.employer_id}</TableCell>
                      <TableCell>{row.zone || '-'}</TableCell>
                      <TableCell className="text-right text-success">{row.on_time}</TableCell>
                      <TableCell className="text-right text-warning">{row.late}</TableCell>
                      <TableCell className="text-right text-destructive">{row.missing}</TableCell>
                      <TableCell className="text-right">
                        <span className={Number(row.compliance_rate) >= 85 ? 'text-success font-semibold' : 'text-foreground'}>
                          {row.compliance_rate}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredEmployers.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No employer compliance data</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
