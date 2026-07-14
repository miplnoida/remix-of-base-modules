import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ShieldAlert } from 'lucide-react';
import {
  listSuspensionReasonCodes,
  type AwardSuspensionListItem,
  type SuspensionReasonOption,
} from '@/services/bn/awardSuspensionViewService';
import { ACTIONS_ENABLED, formatDate, formatMoney } from './suspensionViewModels';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  award: AwardSuspensionListItem | null;
  narrativeMinLength?: number;
}

export function SuspensionProposalDialog({
  open,
  onOpenChange,
  award,
  narrativeMinLength = 20,
}: Props) {
  const [reasonCode, setReasonCode] = useState<string>('');
  const [reasons, setReasons] = useState<SuspensionReasonOption[]>([]);
  const [effectiveDate, setEffectiveDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [narrative, setNarrative] = useState('');
  const [ack, setAck] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReasonCode('');
    setNarrative('');
    setAck(false);
    setEffectiveDate(new Date().toISOString().slice(0, 10));
    listSuspensionReasonCodes()
      .then(setReasons)
      .catch(() => setReasons([]));
  }, [open]);

  const validationErrors: string[] = [];
  if (!award) validationErrors.push('An eligible award must be selected.');
  if (award && award.awardStatus !== 'ACTIVE')
    validationErrors.push('The selected award is not currently ACTIVE.');
  if (award && award.openRequestId)
    validationErrors.push('An open suspension request already exists for this award.');
  if (reasons.length === 0) validationErrors.push('No active Award Suspension reasons are configured.');
  if (!reasonCode) validationErrors.push('A suspension reason is required.');
  if (!effectiveDate) validationErrors.push('An effective date is required.');
  if (narrative.trim().length < narrativeMinLength)
    validationErrors.push(
      `Narrative must be at least ${narrativeMinLength} characters (currently ${narrative.trim().length}).`
    );
  if (!ack) validationErrors.push('Acknowledge maker-checker responsibilities to continue.');
  const canSubmit = ACTIONS_ENABLED && validationErrors.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Suspension Request</DialogTitle>
          <DialogDescription>
            Propose a temporary suspension of an active award. The proposal will follow the
            configured maker-checker workflow.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <section className="rounded-md border p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Award selection
            </h4>
            {!award ? (
              <p className="text-sm text-muted-foreground italic">
                Choose an award from the Awards register to prefill this form.
              </p>
            ) : (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Award #</dt>
                <dd className="font-mono text-xs">
                  {award.awardNumber ?? award.awardId.slice(0, 8)}
                </dd>
                <dt className="text-muted-foreground">Claimant</dt>
                <dd>{award.claimantName}</dd>
                <dt className="text-muted-foreground">Benefit</dt>
                <dd>{award.benefitCode ?? '—'}</dd>
                <dt className="text-muted-foreground">Current status</dt>
                <dd>{award.awardStatus}</dd>
                <dt className="text-muted-foreground">Base amount</dt>
                <dd>{formatMoney(award.baseAmount, award.currency)}</dd>
                <dt className="text-muted-foreground">Start</dt>
                <dd>{formatDate(award.startDate)}</dd>
              </dl>
            )}
          </section>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="suspend-reason">Suspension reason *</Label>
              <Select
                value={reasonCode}
                onValueChange={setReasonCode}
                disabled={reasons.length === 0}
              >
                <SelectTrigger id="suspend-reason">
                  <SelectValue placeholder="Select a reason…" />
                </SelectTrigger>
                <SelectContent>
                  {reasons.map((r) => (
                    <SelectItem key={r.code} value={r.code}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {reasons.length === 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  No active Award Suspension reasons are configured.
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="suspend-effective">Effective from *</Label>
              <Input
                id="suspend-effective"
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="suspend-narrative">Narrative *</Label>
            <Textarea
              id="suspend-narrative"
              rows={4}
              placeholder={`Describe the situation, evidence and any beneficiary contact (min ${narrativeMinLength} characters).`}
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
            />
          </div>

          <div className="rounded-md border p-3 text-sm space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Approval route preview
            </p>
            <p className="text-xs text-muted-foreground">
              Levels and workbaskets are resolved from the sanctioned workflow configuration at
              the point of submission.
            </p>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="suspend-ack"
              checked={ack}
              onCheckedChange={(v) => setAck(Boolean(v))}
            />
            <Label htmlFor="suspend-ack" className="text-sm leading-snug">
              I understand that this proposal is subject to maker-checker approval and that no
              payment change will occur until the workflow is applied.
            </Label>
          </div>

          {!ACTIONS_ENABLED && (
            <div className="rounded-md border border-amber-400/60 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
              <ShieldAlert className="h-3.5 w-3.5 inline mr-1" aria-hidden />
              Submission unavailable while suspension controls are under verification.
            </div>
          )}

          {validationErrors.length > 0 && (
            <ul className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive space-y-1">
              {validationErrors.map((e) => (
                <li key={e}>• {e}</li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!canSubmit}
            aria-disabled={!canSubmit}
            title={
              !ACTIONS_ENABLED
                ? 'Submission unavailable while suspension controls are under verification.'
                : undefined
            }
          >
            Submit for approval
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
