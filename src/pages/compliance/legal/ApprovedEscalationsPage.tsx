import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2 } from 'lucide-react';

const PERMISSION = 'manage_compliance';

export default function ApprovedEscalationsPage() {
  return (
    <PermissionWrapper moduleName={PERMISSION}>
      <Inner />
    </PermissionWrapper>
  );
}

function Inner() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['legal-approved-escalations'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('ce_legal_referrals' as any) as any)
        .select('id, referral_number, employer_name, employer_id, grand_total, status, submitted_date, accepted_date, accepted_by, legal_case_id, court_case_number')
        .in('status', ['SUBMITTED', 'ACCEPTED', 'SUBMITTED_TO_LEGAL', 'ACCEPTED_BY_LEGAL', 'IN_LEGAL_PROCEEDINGS'])
        .order('submitted_date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CheckCircle2 className="h-6 w-6 text-primary" />
          Approved Escalations
        </h1>
        <p className="text-sm text-muted-foreground">Referrals approved and submitted to (or accepted by) the Legal module.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{rows.length} approved escalation(s)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referral</TableHead>
                  <TableHead>Employer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Accepted</TableHead>
                  <TableHead>Legal Case</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.referral_number}</TableCell>
                    <TableCell>
                      <div>{r.employer_name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{r.employer_id}</div>
                    </TableCell>
                    <TableCell>${Number(r.grand_total).toLocaleString()}</TableCell>
                    <TableCell><Badge>{r.status}</Badge></TableCell>
                    <TableCell className="text-xs">{r.submitted_date?.slice(0, 10) || '—'}</TableCell>
                    <TableCell className="text-xs">{r.accepted_date?.slice(0, 10) || '—'}</TableCell>
                    <TableCell className="text-xs">
                      {r.court_case_number || r.legal_case_id || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No approved escalations</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
