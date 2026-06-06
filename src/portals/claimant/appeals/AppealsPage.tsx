import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useClaimantPersona } from '@/hooks/external/useClaimantPersona';
import { useExternalClaims } from '@/portals/_shared/externalHooks';
import { auditPortalAction } from '@/services/external/auditPortalAction';

interface AppealRow {
  id: string;
  bn_claim_id: string;
  decision_type: string;
  decision_date: string;
  notes: string | null;
  modified_at: string;
}

export default function AppealsPage() {
  const { userId } = useClaimantPersona();
  const { data: claimsData } = useExternalClaims();
  const claims = (claimsData?.claims ?? []) as any[];
  const [claimId, setClaimId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<AppealRow[] | null>(null);

  async function loadHistory() {
    const ids = claims.map(c => c.id);
    if (ids.length === 0) { setHistory([]); return; }
    const { data } = await (supabase as any)
      .from('bn_claim_decision')
      .select('id, bn_claim_id, decision_type, decision_date, notes, modified_at')
      .in('bn_claim_id', ids)
      .ilike('decision_type', '%APPEAL%')
      .order('modified_at', { ascending: false });
    setHistory(data ?? []);
  }
  useEffect(() => { loadHistory(); /* eslint-disable-next-line */ }, [claims.length]);

  async function submit() {
    if (!claimId || reason.trim().length < 10) {
      toast.error('Please select a claim and describe your reason (min 10 chars).');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from('bn_claim_decision').insert({
        bn_claim_id: claimId,
        decision_type: 'APPEAL_REQUESTED',
        decision_date: new Date().toISOString().slice(0, 10),
        notes: reason.trim(),
      });
      if (error) throw error;
      auditPortalAction('APPEAL_SUBMITTED', { userId, targetClaimId: claimId });
      toast.success('Appeal submitted. The Appeals Officer will be notified.');
      setReason('');
      setClaimId('');
      loadHistory();
    } catch (e) {
      toast.error('Could not submit appeal', { description: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Submit an Appeal</CardTitle>
          <CardDescription>Request review of a decision on one of your claims.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Claim</Label>
            <Select value={claimId} onValueChange={setClaimId}>
              <SelectTrigger><SelectValue placeholder="Choose a claim" /></SelectTrigger>
              <SelectContent>
                {claims.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {(c.claim_number ?? c.id.slice(0, 8))} — {c.legacy_benefit_type ?? c.benefit_code ?? '—'} ({c.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Reason for appeal</Label>
            <Textarea rows={5} value={reason} onChange={e => setReason(e.target.value)} maxLength={2000}
              placeholder="Explain why you believe the decision should be reconsidered." />
            <p className="text-xs text-muted-foreground">{reason.length}/2000</p>
          </div>
          <Button onClick={submit} disabled={submitting || !claimId || reason.trim().length < 10}>
            {submitting ? 'Submitting…' : 'Submit appeal'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Appeal history</CardTitle></CardHeader>
        <CardContent>
          {history === null ? <Skeleton className="h-20 w-full" /> : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No appeals filed yet.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Claim</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
              <TableBody>
                {history.map(h => (
                  <TableRow key={h.id}>
                    <TableCell>{h.decision_date}</TableCell>
                    <TableCell><Badge variant="outline">{h.decision_type}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{h.bn_claim_id.slice(0, 8)}</TableCell>
                    <TableCell className="max-w-md truncate">{h.notes ?? '—'}</TableCell>
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
