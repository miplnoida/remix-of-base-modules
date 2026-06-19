import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, Edit, Search, Download, Plus, Loader2 } from 'lucide-react';
import { useLgCases, useLgReference } from '@/hooks/legal/useLgCases';
import { formatDateForDisplay } from '@/lib/format-config';

const ALL = '__all__';

const CaseTracking = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [typeFilter, setTypeFilter] = useState<string>(ALL);

  const { data: statuses = [] } = useLgReference('LG_CASE_STATUS');
  const { data: types = [] } = useLgReference('LG_CASE_TYPE');
  const { data: priorities = [] } = useLgReference('LG_PRIORITY');

  const { data: cases = [], isLoading } = useLgCases({
    search: searchTerm || undefined,
    status_code: statusFilter === ALL ? undefined : statusFilter,
    case_type_code: typeFilter === ALL ? undefined : typeFilter,
  });

  const statusLabel = (code: string) => statuses.find(s => s.code === code)?.label ?? code;
  const typeLabel = (code: string) => types.find(s => s.code === code)?.label ?? code;
  const priorityLabel = (code: string) => priorities.find(s => s.code === code)?.label ?? code;

  const priorityVariant = (code: string): 'default' | 'destructive' | 'secondary' | 'outline' => {
    switch (code) {
      case 'URGENT':
      case 'HIGH':
        return 'destructive';
      case 'MEDIUM':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const statusVariant = (code: string): 'default' | 'destructive' | 'secondary' | 'outline' => {
    switch (code) {
      case 'CLOSED':
      case 'SETTLED':
        return 'secondary';
      case 'PENDING_REVIEW':
        return 'outline';
      default:
        return 'default';
    }
  };

  const stats = useMemo(() => {
    const open = cases.filter(c => c.status_code !== 'CLOSED' && c.status_code !== 'SETTLED').length;
    const overdue = cases.filter(c => c.next_action_due_date && new Date(c.next_action_due_date) < new Date() && c.status_code !== 'CLOSED').length;
    return { total: cases.length, open, overdue };
  }, [cases]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Legal Case Tracking</h1>
              <p className="text-sm text-muted-foreground">Track and manage all legal cases</p>
            </div>
          </div>
          <Button onClick={() => navigate('/legal/cases/new')}>
            <Plus className="h-4 w-4 mr-1" /> New Case
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{stats.total}</div><div className="text-sm text-muted-foreground">Total cases</div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{stats.open}</div><div className="text-sm text-muted-foreground">Open / active</div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-destructive">{stats.overdue}</div><div className="text-sm text-muted-foreground">Overdue actions</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cases</CardTitle>
            <CardDescription>Search and filter legal cases</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by case no, summary, court ref..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="md:w-48"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All statuses</SelectItem>
                  {statuses.map(s => <SelectItem key={s.code} value={s.code}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="md:w-48"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All types</SelectItem>
                  {types.map(t => <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline"><Download className="h-4 w-4 mr-1" /> Export</Button>
            </div>

            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case No</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Opened</TableHead>
                    <TableHead>Next Action</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin inline" /></TableCell></TableRow>
                  ) : cases.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No legal cases found</TableCell></TableRow>
                  ) : cases.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.lg_case_no}</TableCell>
                      <TableCell>{typeLabel(c.case_type_code)}</TableCell>
                      <TableCell><Badge variant={statusVariant(c.status_code)}>{statusLabel(c.status_code)}</Badge></TableCell>
                      <TableCell>{c.current_stage_code}</TableCell>
                      <TableCell><Badge variant={priorityVariant(c.priority_code)}>{priorityLabel(c.priority_code)}</Badge></TableCell>
                      <TableCell>{formatDateForDisplay(c.opened_date)}</TableCell>
                      <TableCell>
                        <div className="text-sm">{c.next_action || '—'}</div>
                        {c.next_action_due_date && <div className="text-xs text-muted-foreground">{formatDateForDisplay(c.next_action_due_date)}</div>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/legal/lg/cases/${c.id}`)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/legal/cases/${c.id}/edit`)}><Edit className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CaseTracking;
