import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2, Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  SCHEDULED: 'outline',
  IN_PROGRESS: 'secondary',
  COMPLETED: 'default',
  CANCELLED: 'destructive',
};

export default function MyUpcomingAudits() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [territoryFilter, setTerritoryFilter] = useState('all');

  const { data: audits = [], isLoading } = useQuery({
    queryKey: ['my-upcoming-audits'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('ce_inspections')
        .select('id, inspection_number, employer_id, employer_name, territory, inspection_type, scheduled_date, status, inspector_name, case_id')
        .gte('scheduled_date', today)
        .in('status', ['SCHEDULED', 'IN_PROGRESS'])
        .order('scheduled_date', { ascending: true })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const territories = useMemo(
    () => Array.from(new Set(audits.map((a: any) => a.territory).filter(Boolean))),
    [audits]
  );

  const filtered = useMemo(() => audits.filter((a: any) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (territoryFilter !== 'all' && a.territory !== territoryFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        (a.employer_name || '').toLowerCase().includes(q) ||
        (a.employer_id || '').toLowerCase().includes(q) ||
        (a.inspection_number || '').toLowerCase().includes(q)
      );
    }
    return true;
  }), [audits, statusFilter, territoryFilter, searchTerm]);

  const summary = {
    total: audits.length,
    scheduled: audits.filter((a: any) => a.status === 'SCHEDULED').length,
    inProgress: audits.filter((a: any) => a.status === 'IN_PROGRESS').length,
    next7Days: (() => {
      const horizon = new Date();
      horizon.setDate(horizon.getDate() + 7);
      const horizonStr = horizon.toISOString().split('T')[0];
      return audits.filter((a: any) => a.scheduled_date && a.scheduled_date <= horizonStr).length;
    })(),
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="My Upcoming Audits"
        subtitle="Scheduled and in-progress audits assigned to inspectors"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance' },
          { label: 'Field Operations', href: '/compliance/field/operations' },
          { label: 'Upcoming Audits' },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Total Upcoming</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-primary">{summary.total}</div></CardContent></Card>
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Scheduled</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-warning">{summary.scheduled}</div></CardContent></Card>
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-primary">{summary.inProgress}</div></CardContent></Card>
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Due in 7 Days</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-destructive">{summary.next7Days}</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by employer, ID, or audit #"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              </SelectContent>
            </Select>
            <Select value={territoryFilter} onValueChange={setTerritoryFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Territory" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Territories</SelectItem>
                {territories.map((t: any) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Upcoming Audits</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Inbox className="h-10 w-10 mx-auto mb-2 opacity-50" />
              {audits.length === 0 ? 'No upcoming audits scheduled' : 'No audits match the selected filters'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Audit #</TableHead>
                  <TableHead>Employer</TableHead>
                  <TableHead>Territory</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Inspector</TableHead>
                  <TableHead>Scheduled Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((audit: any) => (
                  <TableRow key={audit.id}>
                    <TableCell className="font-mono text-xs">{audit.inspection_number}</TableCell>
                    <TableCell>
                      <div className="font-medium">{audit.employer_name}</div>
                      <div className="text-xs text-muted-foreground">{audit.employer_id}</div>
                    </TableCell>
                    <TableCell>{audit.territory || '—'}</TableCell>
                    <TableCell>{audit.inspection_type || '—'}</TableCell>
                    <TableCell><Badge variant={STATUS_VARIANT[audit.status] || 'outline'}>{audit.status}</Badge></TableCell>
                    <TableCell>{audit.inspector_name || 'Unassigned'}</TableCell>
                    <TableCell>{audit.scheduled_date || '—'}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/compliance/field/audit/${audit.id}`)}>
                        View
                      </Button>
                    </TableCell>
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
