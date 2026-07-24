import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/shared/PageHeader';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ClipboardList } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

const MODULE = 'manage_compliance';

const AssignedCases = () => {
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  const [q, setQ] = useState('');
  const [mineOnly, setMineOnly] = useState(true);
  const ql = useDebounce(q, 300);

  // Resolve every identifier that ce_cases.assigned_officer_id might contain
  // for the current user: ce_inspectors.id (UUID), inspector_code, and
  // legacy_inspector_code. The column is mixed-shape across legacy and new
  // assignment paths, so we must match on all of them.
  const { data: myOfficerIds = [] } = useQuery({
    queryKey: ['ce_my_officer_ids', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_inspectors')
        .select('id, inspector_code, legacy_inspector_code')
        .eq('profile_id', user!.id);
      if (error) throw error;
      const out = new Set<string>();
      (data || []).forEach((r: any) => {
        if (r.id) out.add(r.id);
        if (r.inspector_code) out.add(r.inspector_code);
        if (r.legacy_inspector_code) out.add(r.legacy_inspector_code);
      });
      return Array.from(out);
    },
  });


  const { data = [], isLoading } = useQuery({
    queryKey: ['ce_cases_assigned', ql, mineOnly, myInspectorId],
    enabled: !mineOnly || !!myInspectorId,
    queryFn: async () => {
      let query = supabase
        .from('ce_cases')
        .select('id, case_number, employer_id, employer_name, status, priority, opened_date, total_amount, assigned_officer_id, assigned_officer_name, target_resolution_date')
        .eq('is_deleted', false)
        .not('assigned_officer_id', 'is', null)
        .not('status', 'in', '(CLOSED,RESOLVED)')
        .order('opened_date', { ascending: false })
        .limit(300);
      if (mineOnly && myInspectorId) query = query.eq('assigned_officer_id', myInspectorId);
      if (ql) query = query.or(`case_number.ilike.%${ql}%,employer_name.ilike.%${ql}%,assigned_officer_name.ilike.%${ql}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });


  return (
    <PermissionWrapper moduleName={MODULE}>
      <div className="container mx-auto p-6 space-y-6">
        <PageHeader title="Assigned Cases" subtitle="Cases currently assigned to officers" />

        <Card>
          <CardContent className="pt-4 flex gap-3 items-center flex-wrap">
            <Input placeholder="Search case, employer or officer…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />
            <Button size="sm" variant={mineOnly ? 'default' : 'outline'} onClick={() => setMineOnly(!mineOnly)}>
              {mineOnly ? 'Showing: My Cases' : 'Showing: All Officers'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : data.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">No assigned cases</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case #</TableHead>
                    <TableHead>Employer</TableHead>
                    <TableHead>Officer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.case_number}</TableCell>
                      <TableCell>
                        <div className="font-medium">{r.employer_name}</div>
                        <div className="text-xs text-muted-foreground">{r.employer_id}</div>
                      </TableCell>
                      <TableCell>{r.assigned_officer_name || '—'}</TableCell>
                      <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={r.priority === 'Critical' ? 'destructive' : r.priority === 'High' ? 'default' : 'secondary'}>
                          {r.priority || 'Medium'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{r.target_resolution_date || '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => navigate(`/compliance/cases/${r.id}`)}>Open</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </PermissionWrapper>
  );
};

export default AssignedCases;
