import { useMemo, useState } from 'react';
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
import { Loader2, Inbox } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

const MODULE = 'manage_compliance';

/**
 * Case Intake — unassigned / newly created cases awaiting officer assignment.
 * Driven by ce_cases.assigned_officer_id IS NULL OR status IN ('OPEN','UNDER_REVIEW').
 */
const CaseIntake = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const ql = useDebounce(q, 300);

  const { data = [], isLoading } = useQuery({
    queryKey: ['ce_cases_intake', ql],
    queryFn: async () => {
      let query = supabase
        .from('ce_cases')
        .select('id, case_number, employer_id, employer_name, status, priority, opened_date, total_amount, assigned_officer_name, case_family, fund_type')
        .eq('is_deleted', false)
        .is('assigned_officer_id', null)
        .order('opened_date', { ascending: false })
        .limit(200);
      if (ql) query = query.or(`case_number.ilike.%${ql}%,employer_name.ilike.%${ql}%,employer_id.ilike.%${ql}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const rows = useMemo(() => data, [data]);

  return (
    <PermissionWrapper moduleName={MODULE}>
      <div className="container mx-auto p-6 space-y-6">
        <PageHeader title="Case Intake" description="New cases awaiting officer assignment" icon={Inbox} />

        <Card>
          <CardContent className="pt-4">
            <Input placeholder="Search case #, employer name or ID…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : rows.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">No cases awaiting intake</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case #</TableHead>
                    <TableHead>Employer</TableHead>
                    <TableHead>Family</TableHead>
                    <TableHead>Fund</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Opened</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.case_number}</TableCell>
                      <TableCell>
                        <div className="font-medium">{r.employer_name}</div>
                        <div className="text-xs text-muted-foreground">{r.employer_id}</div>
                      </TableCell>
                      <TableCell>{r.case_family || '—'}</TableCell>
                      <TableCell>{r.fund_type || '—'}</TableCell>
                      <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={r.priority === 'Critical' ? 'destructive' : r.priority === 'High' ? 'default' : 'secondary'}>
                          {r.priority || 'Medium'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{r.opened_date}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => navigate(`/compliance/cases/${r.id}`)}>Review & Assign</Button>
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

export default CaseIntake;
