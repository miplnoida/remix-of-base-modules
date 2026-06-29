import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Eye } from 'lucide-react';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { useDebounce } from '@/hooks/useDebounce';

const MODULE = 'manage_compliance';
const PAGE_SIZE = 100;

function Inner() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 350);
  const [action, setAction] = useState('');

  const { data = [], isLoading, error } = useQuery({
    queryKey: ['ce_violation_history_all', debounced, action],
    queryFn: async () => {
      let q = supabase
        .from('ce_violation_history')
        .select('id, violation_id, action, from_value, to_value, notes, performed_by, performed_at, ce_violations!ce_violation_history_violation_id_fkey(violation_number, employer_id, employer_name)')
        .order('performed_at', { ascending: false })
        .limit(PAGE_SIZE);
      if (action) q = q.eq('action', action);
      if (debounced) q = q.or(`performed_by.ilike.%${debounced}%,notes.ilike.%${debounced}%,action.ilike.%${debounced}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Violation History"
        subtitle="Cross-violation audit trail of lifecycle events and decisions"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance' },
          { label: 'Violations', href: '/compliance/violations' },
          { label: 'History' },
        ]}
      />
      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Input placeholder="Search by user, action, notes…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Input placeholder="Action (e.g. STATUS_CHANGE)" value={action} onChange={(e) => setAction(e.target.value)} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            {data.length} record(s)
            {isLoading && <Loader2 className="inline-block ml-2 h-4 w-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Violation</TableHead>
                <TableHead>Employer</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>From → To</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No history records</TableCell></TableRow>
              ) : data.map((h: any) => (
                <TableRow key={h.id}>
                  <TableCell className="text-xs">{h.performed_at ? new Date(h.performed_at).toLocaleString() : '-'}</TableCell>
                  <TableCell className="font-mono text-xs">{h.ce_violations?.violation_number || '-'}</TableCell>
                  <TableCell className="text-xs">{h.ce_violations?.employer_name || h.ce_violations?.employer_id || '-'}</TableCell>
                  <TableCell><Badge variant="outline">{h.action || '-'}</Badge></TableCell>
                  <TableCell className="text-xs">
                    {h.from_value || '∅'} → {h.to_value || '∅'}
                  </TableCell>
                  <TableCell className="text-xs">{h.performed_by || '-'}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs">{h.notes || '-'}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/compliance/violations/${h.violation_id}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ViolationHistory() {
  return <PermissionWrapper moduleName={MODULE}><Inner /></PermissionWrapper>;
}
