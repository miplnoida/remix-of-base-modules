import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, TrendingUp, CheckCircle, AlertCircle, Download, Loader2, Inbox } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { exportReportToExcel } from '@/utils/reportExcelExport';

export default function InspectorPerformance() {
  const [zone, setZone] = useState('all');
  const [search, setSearch] = useState('');
  const [appliedZone, setAppliedZone] = useState('all');
  const [appliedSearch, setAppliedSearch] = useState('');

  const { data: perfData = [], isLoading } = useQuery({
    queryKey: ['ce_inspector_performance'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ce_inspector_performance').select('*').order('compliance_rate', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    return perfData.filter((r: any) => {
      if (appliedZone !== 'all' && (r.zone || '').toLowerCase() !== appliedZone.replace('zone-', 'zone ').toLowerCase()) return false;
      if (appliedSearch && !(r.inspector_name || '').toLowerCase().includes(appliedSearch.toLowerCase())) return false;
      return true;
    });
  }, [perfData, appliedZone, appliedSearch]);

  const totalVisits = filtered.reduce((sum, r) => sum + (r.field_visits || 0), 0);
  const totalCases = filtered.reduce((sum, r) => sum + (r.cases_handled || 0), 0);
  const avgRate = filtered.length > 0 ? (filtered.reduce((sum, r) => sum + Number(r.compliance_rate || 0), 0) / filtered.length).toFixed(0) : '0';
  const totalPlans = filtered.reduce((sum, r) => sum + (r.plans_submitted || 0), 0);
  const approvedPlans = filtered.reduce((sum, r) => sum + (r.plans_approved || 0), 0);
  const approvalRate = totalPlans > 0 ? ((approvedPlans / totalPlans) * 100).toFixed(0) : '0';

  const handleApply = () => {
    setAppliedZone(zone);
    setAppliedSearch(search);
  };

  const handleExport = async () => {
    await exportReportToExcel(
      filtered.map((r: any) => ({
        inspector_name: r.inspector_name,
        zone: r.zone,
        plans_submitted: r.plans_submitted,
        plans_approved: r.plans_approved,
        field_visits: r.field_visits,
        cases_handled: r.cases_handled,
        compliance_rate: Number(r.compliance_rate || 0).toFixed(0) + '%',
      })),
      [
        { header: 'Inspector', key: 'inspector_name', width: 28 },
        { header: 'Zone', key: 'zone', width: 14 },
        { header: 'Plans Submitted', key: 'plans_submitted', width: 16 },
        { header: 'Plans Approved', key: 'plans_approved', width: 16 },
        { header: 'Field Visits', key: 'field_visits', width: 14 },
        { header: 'Cases Handled', key: 'cases_handled', width: 14 },
        { header: 'Compliance Rate', key: 'compliance_rate', width: 16 },
      ],
      'inspector_performance',
      'Inspector Performance'
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader title="Inspector Performance Reports" subtitle="Field activity, plan compliance, and productivity metrics" breadcrumbs={[{ label: 'Compliance', href: '/compliance/dashboard' }, { label: 'Reports', href: '/compliance/reports' }, { label: 'Inspector Performance' }]} />

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
          <div className="md:col-span-2"><label className="text-sm font-medium mb-2 block">Inspector</label>
            <Input placeholder="Search inspector..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleApply()} />
          </div>
          <div className="flex items-end"><Button className="w-full" onClick={handleApply}>Apply Filters</Button></div>
        </div>
      </CardContent></Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Field Visits</p><p className="text-2xl font-bold text-foreground">{totalVisits}</p></div><Users className="h-8 w-8 text-primary" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Plan Approval Rate</p><p className="text-2xl font-bold text-foreground">{approvalRate}%</p></div><CheckCircle className="h-8 w-8 text-primary" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Cases Handled</p><p className="text-2xl font-bold text-foreground">{totalCases}</p></div><TrendingUp className="h-8 w-8 text-secondary" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Avg Compliance Rate</p><p className="text-2xl font-bold text-foreground">{avgRate}%</p></div><AlertCircle className="h-8 w-8 text-accent-foreground" /></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><div className="flex items-center justify-between"><CardTitle>Inspector Performance Details</CardTitle><Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}><Download className="h-4 w-4 mr-2" />Export CSV</Button></div></CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : filtered.length === 0 ? <div className="flex flex-col items-center py-8"><Inbox className="h-10 w-10 text-muted-foreground mb-2" /><p className="text-muted-foreground">No performance data</p></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Inspector</TableHead><TableHead>Zone</TableHead><TableHead className="text-right">Plans Submitted</TableHead><TableHead className="text-right">Plans Approved</TableHead><TableHead className="text-right">Field Visits</TableHead><TableHead className="text-right">Cases Handled</TableHead><TableHead className="text-right">Compliance Rate</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.inspector_name}</TableCell>
                    <TableCell>{row.zone}</TableCell>
                    <TableCell className="text-right">{row.plans_submitted}</TableCell>
                    <TableCell className="text-right">{row.plans_approved}</TableCell>
                    <TableCell className="text-right">{row.field_visits}</TableCell>
                    <TableCell className="text-right">{row.cases_handled}</TableCell>
                    <TableCell className="text-right"><span className={Number(row.compliance_rate) >= 95 ? 'text-primary font-semibold' : 'text-foreground'}>{Number(row.compliance_rate).toFixed(0)}%</span></TableCell>
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
