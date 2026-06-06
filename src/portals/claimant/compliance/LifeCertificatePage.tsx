import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useClaimantPersona } from '@/hooks/external/useClaimantPersona';
import { auditPortalAction } from '@/services/external/auditPortalAction';

interface LifeRow {
  id: string;
  bn_award_id: string | null;
  required_for_period: string | null;
  due_date: string | null;
  submitted_date: string | null;
  verified_date: string | null;
  status: string | null;
  remarks: string | null;
}

export default function LifeCertificatePage() {
  const { userId, persona } = useClaimantPersona();
  const [rows, setRows] = useState<LifeRow[] | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [remarks, setRemarks] = useState<Record<string, string>>({});

  async function load() {
    if (!persona?.personSsn) {
      setRows([]);
      return;
    }
    const db = supabase as any;
    const { data: awards } = await db
      .from('bn_award').select('id').eq('ssn', persona.personSsn);
    const ids = (awards ?? []).map((a: any) => a.id);
    if (ids.length === 0) {
      setRows([]);
      return;
    }
    const { data } = await db
      .from('bn_life_certificate')
      .select('id, bn_award_id, required_for_period, due_date, submitted_date, verified_date, status, remarks')
      .in('bn_award_id', ids)
      .order('due_date', { ascending: false });
    setRows(data ?? []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [persona?.personSsn]);

  async function submitOne(row: LifeRow) {
    setSubmittingId(row.id);
    try {
      const db = supabase as any;
      const { error } = await db
        .from('bn_life_certificate')
        .update({
          submitted_date: new Date().toISOString().slice(0, 10),
          status: 'SUBMITTED',
          remarks: remarks[row.id] ?? row.remarks,
          modified_at: new Date().toISOString(),
        })
        .eq('id', row.id);
      if (error) throw error;
      toast.success('Life certificate submitted');
      auditPortalAction('LIFE_CERT_SUBMITTED', { userId, targetAwardId: row.bn_award_id });
      await load();
    } catch (e) {
      toast.error('Could not submit', { description: (e as Error).message });
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Life Certificates</CardTitle>
        <CardDescription>Annual proof-of-life submissions for pension awards.</CardDescription>
      </CardHeader>
      <CardContent>
        {rows === null ? <Skeleton className="h-32 w-full" /> : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No life certificates required.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="w-72">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(r => {
                const open = !r.submitted_date && r.status !== 'VERIFIED';
                return (
                  <TableRow key={r.id}>
                    <TableCell>{r.required_for_period ?? '—'}</TableCell>
                    <TableCell>{r.due_date ?? '—'}</TableCell>
                    <TableCell><Badge>{r.status ?? 'PENDING'}</Badge></TableCell>
                    <TableCell>{r.submitted_date ?? '—'}</TableCell>
                    <TableCell>
                      {open ? (
                        <div className="space-y-2">
                          <Label className="text-xs">Remarks (optional)</Label>
                          <Textarea
                            rows={2}
                            value={remarks[r.id] ?? ''}
                            onChange={e => setRemarks({ ...remarks, [r.id]: e.target.value })}
                          />
                          <Button size="sm" onClick={() => submitOne(r)} disabled={submittingId === r.id}>
                            {submittingId === r.id ? 'Submitting…' : 'Submit'}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No action needed</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
