import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { PermissionButton } from '@/components/ui/permission-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Copy, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useUserCode } from '@/hooks/useUserCode';
import {
  listDuplicateCandidates,
  getVerificationSettings,
  markAsDuplicate,
  type VerificationRow,
} from '@/services/verificationQueueService';

const MODULE = 'manage_compliance';

const currencyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'XCD', minimumFractionDigits: 2 });
const fmt = (v: number | null | undefined) => (v != null ? currencyFmt.format(Number(v)) : '—');
const resolveTotal = (r: any): number | null => {
  if (!r) return null;
  const t = r.total_amount;
  if (t != null && Number(t) !== 0) return Number(t);
  const sum = (Number(r.principal_amount ?? 0) || 0) + (Number(r.penalty_amount ?? 0) || 0) + (Number(r.interest_amount ?? 0) || 0);
  if (sum !== 0) return sum;
  return t != null ? Number(t) : null;
};

function DuplicateReviewInner() {
  const queryClient = useQueryClient();
  const { userCode } = useUserCode();

  const settingsQ = useQuery({ queryKey: ['ce-verification-settings'], queryFn: getVerificationSettings });
  const groupsQ = useQuery({ queryKey: ['ce-duplicate-groups'], queryFn: () => listDuplicateCandidates(200) });

  const [pair, setPair] = useState<{ duplicate: VerificationRow; master: VerificationRow } | null>(null);
  const [notes, setNotes] = useState('');

  const mut = useMutation({
    mutationFn: () => markAsDuplicate(pair!.duplicate.id, pair!.master.id, userCode || 'SYSTEM', notes),
    onSuccess: () => {
      toast.success('Marked as duplicate.');
      setPair(null);
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['ce-duplicate-groups'] });
      queryClient.invalidateQueries({ queryKey: ['ce-verification-queue'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to mark duplicate'),
  });

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Duplicate Review"
        subtitle="Possible duplicate violations grouped by configured match keys."
      />

      {settingsQ.data && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Active duplicate-detection configuration</AlertTitle>
          <AlertDescription>
            Match fields: <strong>{settingsQ.data.matchFields.join(', ') || '—'}</strong>
            &nbsp;· Window: <strong>{settingsQ.data.windowDays} days</strong>
            &nbsp;· Open-case blocks: <strong>{settingsQ.data.openCaseBlocks ? 'Yes' : 'No'}</strong>
          </AlertDescription>
        </Alert>
      )}

      {groupsQ.isLoading && <div className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>}

      {groupsQ.data && groupsQ.data.length === 0 && (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No possible duplicate groups detected within the configured window.</CardContent></Card>
      )}

      {groupsQ.data?.map((group, idx) => (
        <Card key={idx}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Group {idx + 1} · {group[0].employer_name ?? group[0].employer_id ?? 'Unknown employer'}
              <Badge variant="outline" className="ml-2">{group.length} possible duplicates</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2">
              {group.map((row) => (
                <Card key={row.id} className="border-2">
                  <CardContent className="p-3 text-sm space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-xs">{row.violation_number}</span>
                      <Badge variant="outline">{row.status}</Badge>
                    </div>
                    <Row label="Employer" value={`${row.employer_name ?? '—'} (${row.employer_id ?? '—'})`} />
                    <Row label="Fund / Period" value={`${row.fund_type ?? '—'} · ${row.period_from ?? '—'}`} />
                    <Row label="Type" value={row.violation_type_name ?? row.violation_type_code ?? '—'} />
                    <Row label="Source" value={`${row.source_type ?? '—'}${row.source_rule_id ? ' · rule ' + row.source_rule_id.slice(0, 8) : ''}`} />
                    <Row label="Total" value={fmt(row.total_amount)} />
                    <Row label="Discovered" value={`${row.discovered_date} · ${row.discovered_by ?? '—'}`} />
                    <div className="pt-2 flex gap-2 flex-wrap">
                      {group.filter((g) => g.id !== row.id).map((other) => (
                        <PermissionButton
                          key={other.id}
                          moduleName={MODULE}
                          actionName="edit"
                          size="sm"
                          variant="outline"
                          onClick={() => setPair({ duplicate: row, master: other })}
                        >
                          <Copy className="h-3 w-3 mr-1" /> Mark as duplicate of {other.violation_number}
                        </PermissionButton>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!pair} onOpenChange={(o) => { if (!o) { setPair(null); setNotes(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm duplicate decision</DialogTitle>
          </DialogHeader>
          {pair && (
            <div className="space-y-3 text-sm">
              <p>
                Mark <strong>{pair.duplicate.violation_number}</strong> as a duplicate of{' '}
                <strong>{pair.master.violation_number}</strong>?
              </p>
              <p className="text-muted-foreground">
                The duplicate violation will be cancelled and a duplicate link recorded. This action is auditable.
              </p>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Decision notes (required)…"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPair(null); setNotes(''); }}>Cancel</Button>
            <PermissionButton
              moduleName={MODULE}
              actionName="edit"
              disabled={!notes.trim() || mut.isPending}
              onClick={() => mut.mutate()}
            >
              Confirm
            </PermissionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

export default function DuplicateReview() {
  return (
    <PermissionWrapper moduleName={MODULE}>
      <DuplicateReviewInner />
    </PermissionWrapper>
  );
}
