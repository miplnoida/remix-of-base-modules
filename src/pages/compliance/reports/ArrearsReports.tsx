import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, TrendingUp, AlertTriangle, Calendar, Download, Loader2, Inbox } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function ArrearsReports() {
  const { data: arrearsData = [], isLoading } = useQuery({
    queryKey: ['ce_arrears_report_entries'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ce_arrears_report_entries').select('*').order('total_arrears', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const totalArrears = arrearsData.reduce((sum, r) => sum + Number(r.total_arrears || 0), 0);
  const over90 = arrearsData.filter(r => r.aging_category === '90+ days').reduce((sum, r) => sum + Number(r.total_arrears || 0), 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader title="Arrears & Collections Reports" subtitle="Outstanding balances, payment trends, and recovery metrics" breadcrumbs={[{ label: 'Compliance', href: '/compliance/dashboard' }, { label: 'Reports', href: '/compliance/reports' }, { label: 'Arrears' }]} />

      <Card><CardHeader><CardTitle>Filters</CardTitle></CardHeader><CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div><label className="text-sm font-medium mb-2 block">Date Range</label><Select defaultValue="current-year"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="last-quarter">Last Quarter</SelectItem><SelectItem value="last-6-months">Last 6 Months</SelectItem><SelectItem value="current-year">Current Year</SelectItem></SelectContent></Select></div>
          <div><label className="text-sm font-medium mb-2 block">Zone</label><Select defaultValue="all"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Zones</SelectItem><SelectItem value="zone-a">Zone A</SelectItem><SelectItem value="zone-b">Zone B</SelectItem><SelectItem value="zone-c">Zone C</SelectItem></SelectContent></Select></div>
          <div><label className="text-sm font-medium mb-2 block">Arrears Threshold</label><Select defaultValue="all"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Amounts</SelectItem><SelectItem value="50k">Over EC$ 50K</SelectItem><SelectItem value="100k">Over EC$ 100K</SelectItem></SelectContent></Select></div>
          <div className="flex items-end"><Button className="w-full">Apply Filters</Button></div>
        </div>
      </CardContent></Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Arrears</p><p className="text-2xl font-bold text-foreground">EC$ {(totalArrears / 1000).toFixed(0)}K</p></div><DollarSign className="h-8 w-8 text-destructive" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Employers</p><p className="text-2xl font-bold text-foreground">{arrearsData.length}</p></div><TrendingUp className="h-8 w-8 text-success" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">90+ Days Overdue</p><p className="text-2xl font-bold text-foreground">EC$ {(over90 / 1000).toFixed(0)}K</p></div><AlertTriangle className="h-8 w-8 text-warning" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Increasing</p><p className="text-2xl font-bold text-foreground">{arrearsData.filter(r => r.trend === 'increasing').length}</p></div><Calendar className="h-8 w-8 text-warning" /></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><div className="flex items-center justify-between"><CardTitle>Top Arrears Employers</CardTitle><Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export CSV</Button></div></CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : arrearsData.length === 0 ? <div className="flex flex-col items-center py-8"><Inbox className="h-10 w-10 text-muted-foreground mb-2" /><p className="text-muted-foreground">No arrears data</p></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Employer</TableHead><TableHead>Zone</TableHead><TableHead className="text-right">Total Arrears</TableHead><TableHead>Aging</TableHead><TableHead>Last Payment</TableHead><TableHead>Trend</TableHead></TableRow></TableHeader>
              <TableBody>
                {arrearsData.map((row) => (
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
