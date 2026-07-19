import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useClaimantPersona } from '@/hooks/external/useClaimantPersona';
import { useExternalClaims } from '@/portals/_shared/externalHooks';
import { auditPortalAction } from '@/services/external/auditPortalAction';
import { useSubmitClaimantAppeal } from '@/hooks/bn/appeals/useSubmitClaimantAppeal';
import { useMyAppeals } from '@/hooks/bn/appeals/useMyAppeals';
import {
  BN_APPEAL_TYPE_CATALOG,
  BN_APPEAL_GROUND_CODES,
} from '@/types/bn/gap/appeals/appealStateMachine';

/**
 * Claimant Appeals — portal page.
 *
 * ARCHITECTURE: This page NEVER performs direct writes to any `bn_appeal*`
 * table (nor to the legacy `bn_claim_decision` shortcut it previously used).
 * All submissions flow through `useSubmitClaimantAppeal` → the
 * `bn-appeals-claimant-submit` edge function → the `bn_appeal_submit_claimant`
 * RPC, which validates ownership via SSN linkage.
 */
export default function AppealsPage() {
  const { userId, userCode } = useClaimantPersona();
  const { data: claimsData } = useExternalClaims();
  const claims = useMemo(() => (claimsData?.claims ?? []) as any[], [claimsData]);
  const claimIds = useMemo(() => claims.map((c) => c.id), [claims]);

  const [claimId, setClaimId] = useState<string>('');
  const [appealType, setAppealType] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [selectedGrounds, setSelectedGrounds] = useState<string[]>([]);

  const submit = useSubmitClaimantAppeal();
  const historyQuery = useMyAppeals(claimIds);

  const availableTypes = useMemo(() => {
    // In the claimant portal, only decisions on their claims are appealable.
    return BN_APPEAL_TYPE_CATALOG.filter((t) => t.appliesTo.includes('bn_claim'));
  }, []);

  const resolvedUserCode = (userCode ?? '').trim();
  const canSubmit =
    !!claimId &&
    !!appealType &&
    reason.trim().length >= 10 &&
    selectedGrounds.length > 0 &&
    !!resolvedUserCode &&
    !submit.isPending;

  async function handleSubmit() {
    if (!canSubmit) {
      toast.error('Please complete every required field before submitting.');
      return;
    }
    try {
      const grounds = selectedGrounds.map((code) => ({
        groundCode: code,
        groundText:
          code === 'GENERAL' ? reason.trim().slice(0, 500) : code.replace(/_/g, ' ').toLowerCase(),
      }));
      const result = await submit.mutateAsync({
        bnClaimId: claimId,
        appealTypeCode: appealType,
        reasonSummary: reason.trim(),
        grounds,
        actorUserCode: resolvedUserCode,
        idempotencyKey: crypto.randomUUID(),
        correlationId: crypto.randomUUID(),
      });
      auditPortalAction('APPEAL_SUBMITTED', {
        userId,
        targetClaimId: claimId,
        appealId: result.appealId,
      });
      toast.success(`Appeal ${result.appealNumber} submitted.`, {
        description: 'The Appeals Officer will review your submission.',
      });
      setReason('');
      setClaimId('');
      setAppealType('');
      setSelectedGrounds([]);
    } catch (e) {
      const err = e as Error & { code?: string };
      const description =
        err.code === 'CLAIM_NOT_OWNED'
          ? 'You can only appeal decisions on claims linked to your identity.'
          : err.code === 'NOT_AUTHENTICATED'
            ? 'Please sign in and try again.'
            : err.message;
      toast.error('Could not submit appeal', { description });
    }
  }

  const historyRows = historyQuery.data ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Submit an appeal</CardTitle>
          <CardDescription>
            Request formal review of a decision on one of your claims. You have 30 days
            from the decision date to file an appeal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Claim</Label>
            <Select value={claimId} onValueChange={setClaimId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a claim" />
              </SelectTrigger>
              <SelectContent>
                {claims.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {(c.claim_number ?? c.id.slice(0, 8))} —{' '}
                    {c.legacy_benefit_type ?? c.benefit_code ?? '—'} ({c.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Appeal type</Label>
            <Select value={appealType} onValueChange={setAppealType}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an appeal type" />
              </SelectTrigger>
              <SelectContent>
                {availableTypes.map((t) => (
                  <SelectItem key={t.code} value={t.code}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Grounds for appeal</Label>
            <p className="text-xs text-muted-foreground">
              Select at least one reason that best describes your dispute.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {BN_APPEAL_GROUND_CODES.map((code) => {
                const checked = selectedGrounds.includes(code);
                return (
                  <label
                    key={code}
                    className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer hover:bg-accent"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) =>
                        setSelectedGrounds((prev) =>
                          v ? [...prev, code] : prev.filter((c) => c !== code),
                        )
                      }
                    />
                    <span className="text-sm">{code.replace(/_/g, ' ')}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Reason for appeal</Label>
            <Textarea
              rows={5}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={2000}
              placeholder="Explain why you believe the decision should be reconsidered."
            />
            <p className="text-xs text-muted-foreground">{reason.length}/2000</p>
          </div>

          {!resolvedUserCode && (
            <Alert variant="destructive">
              <AlertTitle>Cannot submit yet</AlertTitle>
              <AlertDescription>
                Your account is missing a user code. Please contact support.
              </AlertDescription>
            </Alert>
          )}

          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submit.isPending ? 'Submitting…' : 'Submit appeal'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appeal history</CardTitle>
        </CardHeader>
        <CardContent>
          {historyQuery.isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : historyRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No appeals filed yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Deadline</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyRows.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-mono text-xs">{h.appeal_number}</TableCell>
                    <TableCell>
                      {h.submitted_at ? h.submitted_at.slice(0, 10) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{h.appeal_type_code}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge>{h.status}</Badge>
                    </TableCell>
                    <TableCell>{h.filing_deadline_date ?? '—'}</TableCell>
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
