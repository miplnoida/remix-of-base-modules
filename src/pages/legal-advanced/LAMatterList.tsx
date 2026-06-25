import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, RefreshCcw } from 'lucide-react';
import { useMatters, useWorkbaskets } from '@/hooks/legal-advanced/useLegalAdvancedData';

const STATUSES = ['DRAFT', 'SUBMITTED', 'ACCEPTED', 'IN_PROGRESS', 'PENDING_REVIEW', 'CLOSED', 'REJECTED', 'WITHDRAWN'];
const CATEGORIES = ['RECOVERY', 'ADVISORY', 'APPEAL', 'GOVERNANCE', 'INTERNAL_REVIEW', 'EXTERNAL_COUNSEL'];

export default function LAMatterList() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [category, setCategory] = useState<string>('all');
  const [wb, setWb] = useState<string>('all');

  const filters = useMemo(
    () => ({
      search: search || undefined,
      status: status !== 'all' ? status : undefined,
      category: category !== 'all' ? category : undefined,
      workbasket_id: wb !== 'all' ? wb : undefined,
    }),
    [search, status, category, wb]
  );

  const { data: matters = [], isLoading, isFetching, refetch } = useMatters(filters);
  const { data: workbaskets = [] } = useWorkbaskets();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Matters</h1>
          <p className="text-sm text-muted-foreground">All legal matters across categories</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCcw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild>
            <Link to="/legal-advanced/intake">
              <Plus className="h-4 w-4 mr-2" /> New Matter
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search matter no or title"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={wb} onValueChange={setWb}>
              <SelectTrigger><SelectValue placeholder="Workbasket" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All workbaskets</SelectItem>
                {workbaskets.map((w: any) => (
                  <SelectItem key={w.id} value={w.id}>{w.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matter No</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}><Skeleton className="h-6 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : matters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">
                    No matters found.
                  </TableCell>
                </TableRow>
              ) : (
                matters.map((m) => (
                  <TableRow key={m.id} className="cursor-pointer hover:bg-accent">
                    <TableCell>
                      <Link to={`/legal-advanced/matters/${m.id}`} className="font-medium text-primary hover:underline">
                        {m.matter_no}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">{m.title}</TableCell>
                    <TableCell><Badge variant="outline">{m.category}</Badge></TableCell>
                    <TableCell className="text-xs">{m.origin}</TableCell>
                    <TableCell><Badge>{m.status}</Badge></TableCell>
                    <TableCell className="text-xs">{m.priority}</TableCell>
                    <TableCell className="text-xs">{m.assigned_user_code || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(m.updated_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
