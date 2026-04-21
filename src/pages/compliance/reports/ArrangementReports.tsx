import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, CheckCircle, XCircle, TrendingUp, Download, Loader2, Inbox } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { exportReportToExcel } from '@/utils/reportExcelExport';

export default function ArrangementReports() {
  const [zone, setZone] = useState('all');
  const [status, setStatus] = useState('all');
  const [appliedZone, setAppliedZone] = useState('all');
  const [appliedStatus, setAppliedStatus] = useState('all');

  const { data: arrangements = [], isLoading } = useQuery({
    queryKey: ['ce_arrangement_report_entries'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ce_arrangement_report_entries').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    return arrangements.filter((r: any) => {
      if (appliedZone !== 'all') {
        const zoneLabel = appliedZone.replace('zone-', 'Zone ');
        if ((r.zone || '') !== zoneLabel) return false;
      }
      if (appliedStatus !== 'all' && (r.status || '').toLowerCase() !== appliedStatus) return false;
      return true;
    });
  }, [arrangements, appliedZone, appliedStatus]);

  const active = filtered.filter(r => r.status === 'Active').length;
  const completed = filtered.filter(r => r.status === 'Completed').length;
  const defaulted = filtered.filter(r => r.status === 'Defaulted').length;
  const totalDebt = filtered.filter(r => r.status === 'Active').reduce((sum, r) => sum + Number(r.total_debt || 0), 0);

  const handleApply = () => { setAppliedZone(zone); setAppliedStatus(status); };

  const handleExport = async () => {
    await exportReportToExcel(
      filtered.map((r: any) => ({
        employer_name: r.employer_name,
        zone: r.zone,
        total_debt: Number(r.total_debt || 0),
        installment: Number(r.installment || 0),
        progress: `${r.payments_made}/${r.total_payments}`,
        status: r.status,
        next_due: r.next_due,
      })),
      [
        { header: 'Employer', key: 'employer_name', width: 32 },
        { header: 'Zone', key: 'zone', width: 14 },
        { header: 'Total Debt (EC$)', key: 'total_debt', width: 18 },
        { header: 'Installment (EC$)', key: 'installment', width: 18 },
        { header: 'Progress', key: 'progress', width: 14 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'Next Due', key: 'next_due', width: 14 },
      ],
      'payment_arrangements',
      'Arrangements'
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader title="Payment Arrangement Reports" subtitle="Active arrangements, defaults, and compliance tracking" breadcrumbs={[{ label: 'Compliance', href: '/compliance/dashboard' }, { label: 'Reports', href: '/compliance/reports' }, { label: 'Arrangements' }]} />

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
          <div><label className="text-sm font-medium mb-2 block">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="defaulted">Defaulted</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end md:col-start-4"><Button className="w-full" onClick={handleApply}>Apply Filters</Button></div>
        </div>
      </CardContent></Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Active Arrangements</p><p className="text-2xl font-bold text-foreground">{active}</p><p className="text-xs text-primary">Total: EC$ {(totalDebt / 1000).toFixed(0)}K</p></div><Calendar className="h-8 w-8 text-primary" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Completed</p><p className="text-2xl font-bold text-foreground">{completed}</p></div><CheckCircle className="h-8 w-8 text-success" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Defaulted</p><p className="text-2xl font-bold text-foreground">{defaulted}</p></div><XCircle className="h-8 w-8 text-destructive" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Plans</p><p className="text-2xl font-bold text-foreground">{filtered.length}</p></div><TrendingUp className="h-8 w-8 text-success" /></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><div className="flex items-center justify-between"><CardTitle>Payment Arrangement Details</CardTitle><Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}><Download className="h-4 w-4 mr-2" />Export CSV</Button></div></CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : filtered.length === 0 ? <div className="flex flex-col items-center py-8"><Inbox className="h-10 w-10 text-muted-foreground mb-2" /><p className="text-muted-foreground">No arrangement data</p></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Employer</TableHead><TableHead>Zone</TableHead><TableHead className="text-right">Total Debt</TableHead><TableHead className="text-right">Installment</TableHead><TableHead className="text-center">Progress</TableHead><TableHead>Status</TableHead><TableHead>Next Due</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.employer_name}</TableCell>
                    <TableCell>{row.zone}</TableCell>
                    <TableCell className="text-right">EC$ {(Number(row.total_debt) / 1000).toFixed(0)}K</TableCell>
                    <TableCell className="text-right">EC$ {(Number(row.installment) / 1000).toFixed(1)}K</TableCell>
                    <TableCell className="text-center">{row.payments_made}/{row.total_payments}</TableCell>
                    <TableCell><span className={row.status === 'Active' ? 'text-primary' : row.status === 'Completed' ? 'text-success' : 'text-destructive'}>{row.status}</span></TableCell>
                    <TableCell>{row.next_due || '-'}</TableCell>
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
