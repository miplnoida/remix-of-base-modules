import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, TrendingUp, AlertTriangle, Calendar, Download, Loader2, Inbox } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { exportReportToExcel } from '@/utils/reportExcelExport';

export default function ArrearsReports() {
  const [zone, setZone] = useState('all');
  const [threshold, setThreshold] = useState('all');
  const [appliedZone, setAppliedZone] = useState('all');
  const [appliedThreshold, setAppliedThreshold] = useState('all');

  const { data: arrearsData = [], isLoading } = useQuery({
    queryKey: ['ce_arrears_report_entries'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ce_arrears_report_entries').select('*').order('total_arrears', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    return arrearsData.filter((r: any) => {
      if (appliedZone !== 'all') {
        const zoneLabel = appliedZone.replace('zone-', 'Zone ').toUpperCase().replace('ZONE ', 'Zone ');
        if ((r.zone || '') !== zoneLabel) return false;
      }
      if (appliedThreshold === '50k' && Number(r.total_arrears || 0) <= 50000) return false;
      if (appliedThreshold === '100k' && Number(r.total_arrears || 0) <= 100000) return false;
      return true;
    });
  }, [arrearsData, appliedZone, appliedThreshold]);

  const totalArrears = filtered.reduce((sum, r) => sum + Number(r.total_arrears || 0), 0);
  const over90 = filtered.filter(r => r.aging_category === '90+ days').reduce((sum, r) => sum + Number(r.total_arrears || 0), 0);

  const byZone = useMemo(() => {
    const map = new Map<string, { zone: string; total: number; employers: number }>();
    filtered.forEach((r: any) => {
      const z = r.zone || 'Unassigned';
      const cur = map.get(z) || { zone: z, total: 0, employers: 0 };
      cur.total += Number(r.total_arrears || 0);
      cur.employers += 1;
      map.set(z, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const asOf = useMemo(() => {
    if (!arrearsData.length) return null;
    const latest = arrearsData
      .map((r: any) => r.created_at)
      .filter(Boolean)
      .sort()
      .pop();
    return latest ? new Date(latest) : null;
  }, [arrearsData]);

  const handleApply = () => { setAppliedZone(zone); setAppliedThreshold(threshold); };

  const handleExport = async () => {
    await exportReportToExcel(
      filtered.map((r: any) => ({
        employer_name: r.employer_name,
        zone: r.zone,
        total_arrears: Number(r.total_arrears || 0),
        aging_category: r.aging_category,
        last_payment_date: r.last_payment_date,
        trend: r.trend,
      })),
      [
        { header: 'Employer', key: 'employer_name', width: 32 },
        { header: 'Zone', key: 'zone', width: 14 },
        { header: 'Total Arrears (EC$)', key: 'total_arrears', width: 18 },
        { header: 'Aging', key: 'aging_category', width: 16 },
        { header: 'Last Payment', key: 'last_payment_date', width: 16 },
        { header: 'Trend', key: 'trend', width: 14 },
      ],
      'arrears_collections',
      'Arrears'
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader title="Arrears & Collections Reports" subtitle="Outstanding balances, payment trends, and recovery metrics" breadcrumbs={[{ label: 'Compliance', href: '/compliance/dashboard' }, { label: 'Reports', href: '/compliance/reports' }, { label: 'Arrears' }]} />

      {asOf && (
        <p className="text-xs text-muted-foreground -mt-3">As of {asOf.toLocaleString()} · Source: ce_arrears_report_entries</p>
      )}

      <Card><CardHeader><CardTitle>Filters</CardTitle></CardHeader><CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div><label className="text-sm font-medium mb-2 block">Zone</label>
            <Select value={zone} onValueChange={setZone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                <SelectItem value="zone-a">Zone A</SelectItem>
                <SelectItem value="zone-b">Zone B</SelectItem>
                <SelectItem value="zone-c">Zone C</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><label className="text-sm font-medium mb-2 block">Arrears Threshold</label>
            <Select value={threshold} onValueChange={setThreshold}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Amounts</SelectItem>
                <SelectItem value="50k">Over EC$ 50K</SelectItem>
                <SelectItem value="100k">Over EC$ 100K</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end md:col-start-4"><Button className="w-full" onClick={handleApply}>Apply Filters</Button></div>
        </div>
      </CardContent></Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Arrears</p><p className="text-2xl font-bold text-foreground">EC$ {(totalArrears / 1000).toFixed(0)}K</p></div><DollarSign className="h-8 w-8 text-destructive" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Employers</p><p className="text-2xl font-bold text-foreground">{filtered.length}</p></div><TrendingUp className="h-8 w-8 text-success" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">90+ Days Overdue</p><p className="text-2xl font-bold text-foreground">EC$ {(over90 / 1000).toFixed(0)}K</p></div><AlertTriangle className="h-8 w-8 text-warning" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Increasing</p><p className="text-2xl font-bold text-foreground">{filtered.filter(r => r.trend === 'increasing').length}</p></div><Calendar className="h-8 w-8 text-warning" /></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><div className="flex items-center justify-between"><CardTitle>Top Arrears Employers</CardTitle><Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}><Download className="h-4 w-4 mr-2" />Export CSV</Button></div></CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : filtered.length === 0 ? <div className="flex flex-col items-center py-8"><Inbox className="h-10 w-10 text-muted-foreground mb-2" /><p className="text-muted-foreground">No arrears data</p></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Employer</TableHead><TableHead>Zone</TableHead><TableHead className="text-right">Total Arrears</TableHead><TableHead>Aging</TableHead><TableHead>Last Payment</TableHead><TableHead>Trend</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.employer_name}</TableCell>
                    <TableCell>{row.zone}</TableCell>
                    <TableCell className="text-right font-semibold text-destructive">EC$ {(Number(row.total_arrears) / 1000).toFixed(0)}K</TableCell>
                    <TableCell><span className={row.aging_category === '90+ days' ? 'text-destructive' : row.aging_category === '60-90 days' ? 'text-warning' : 'text-primary'}>{row.aging_category}</span></TableCell>
                    <TableCell>{row.last_payment_date}</TableCell>
                    <TableCell><span className={row.trend === 'increasing' ? 'text-destructive' : row.trend === 'decreasing' ? 'text-success' : 'text-muted-foreground'}>{row.trend}</span></TableCell>
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
