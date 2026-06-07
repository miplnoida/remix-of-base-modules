/**
 * Override Eligibility Dialog
 *
 * Officer-facing modal to request an eligibility-rule override.
 * Captures rule context, reason code, justification and override scope, then
 * submits a PENDING request to bn_eligibility_override_request which a
 * supervisor must approve before the rule is treated as passed.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  listOverrideReasonCodes,
  requestOverride,
  type OverrideScope,
  type ProductOverridePolicy,
} from '@/services/bn/eligibilityOverrideService';

export interface OverrideEligibilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claimId: string;
  eligibilityResultId?: string | null;
  rule: {
    rule_code: string;
    rule_name?: string;
    rule_group_code?: string | null;
    field_key?: string | null;
    source?: string | null;
    source_record_id?: string | null;
    actual_value?: unknown;
    expected_value?: unknown;
    operator?: string | null;
    message?: string;
  };
  userCode: string;
  policy: ProductOverridePolicy | null;
}

export const OverrideEligibilityDialog: React.FC<OverrideEligibilityDialogProps> = ({
  open,
  onOpenChange,
  claimId,
  eligibilityResultId,
  rule,
  userCode,
  policy,
}) => {
  const qc = useQueryClient();
  const [reasons, setReasons] = useState<Array<{ code: string; label: string }>>([]);
  const [reasonCode, setReasonCode] = useState('');
  const [justification, setJustification] = useState('');
  const [scope, setScope] = useState<OverrideScope>('THIS_RULE_ONLY');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReasonCode('');
    setJustification('');
    setScope('THIS_RULE_ONLY');
    setConfirm(false);
    listOverrideReasonCodes().then(setReasons).catch(() => setReasons([]));
  }, [open]);

  const reasonOptions = useMemo(
    () => reasons.map((r) => ({ value: r.code, label: r.label, searchText: r.code })),
    [reasons],
  );

  const requireDoc = policy?.override_requires_document === true;
  const canSubmit =
    !!reasonCode &&
    justification.trim().length >= 10 &&
    confirm &&
    !busy;

  const handleSubmit = async () => {
    setBusy(true);
    try {
      await requestOverride({
        claimId,
        eligibilityResultId: eligibilityResultId ?? null,
        ruleCode: rule.rule_code,
        ruleGroupCode: rule.rule_group_code ?? null,
        fieldKey: rule.field_key ?? null,
        sourceTable: rule.source ?? null,
        sourceRecordId: rule.source_record_id ?? null,
        actualValue: rule.actual_value ?? null,
        expectedValue: rule.expected_value ?? null,
        operator: rule.operator ?? null,
        overrideScope: scope,
        reasonCode,
        justification,
        requestedBy: userCode,
      });
      toast.success('Override request submitted', {
        description: 'A supervisor must review and approve before eligibility is updated.',
      });
      qc.invalidateQueries({ queryKey: ['bn', 'eligibility-overrides', claimId] });
      qc.invalidateQueries({ queryKey: ['bn', 'claim-events', claimId] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Could not submit override', { description: err?.message ?? 'Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Request Eligibility Override</DialogTitle>
          <DialogDescription>
            Eligibility failures stay factual. This request creates a separate maker-checker record; a
            supervisor must approve before the rule is treated as passed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded border p-3 space-y-2 bg-muted/30">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="font-medium text-sm">{rule.rule_name ?? rule.rule_code}</div>
              <Badge variant="outline" className="font-mono text-xs">{rule.rule_code}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div><span className="text-muted-foreground">Field:</span> <span className="font-mono">{rule.field_key ?? '—'}</span></div>
              <div><span className="text-muted-foreground">Source:</span> <span className="font-mono">{rule.source ?? '—'}</span></div>
              <div><span className="text-muted-foreground">Actual:</span> <span className="font-mono">{formatVal(rule.actual_value)}</span></div>
              <div><span className="text-muted-foreground">Expected:</span> <span className="font-mono">{rule.operator ?? ''} {formatVal(rule.expected_value)}</span></div>
            </div>
            {rule.message && <div className="text-xs text-destructive">{rule.message}</div>}
          </div>

          <div className="space-y-1.5">
            <Label>Reason code *</Label>
            <SearchableSelect
              options={reasonOptions}
              value={reasonCode}
              onValueChange={setReasonCode}
              placeholder="Select reason…"
              searchPlaceholder="Search reason codes…"
              emptyMessage="No override reason codes configured."
            />
            <p className="text-xs text-muted-foreground">
              Manage codes in Admin → Reason Codes (category <span className="font-mono">ELIGIBILITY_OVERRIDE</span>).
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Officer justification *</Label>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Explain why this rule should be overridden. Reference evidence, prior approvals, or applicable exceptions."
              maxLength={1000}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">{justification.length}/1000 — minimum 10 characters.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Override scope *</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {([
                { v: 'THIS_RULE_ONLY', label: 'This rule only', desc: 'Only the failed rule is treated as passed.' },
                { v: 'RULE_GROUP', label: 'Entire rule group', desc: 'All rules in the same group are treated as passed.' },
                { v: 'FULL_ELIGIBILITY', label: 'Full eligibility', desc: 'All failed rules are treated as passed.' },
              ] as { v: OverrideScope; label: string; desc: string }[]).map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setScope(opt.v)}
                  className={`text-left rounded border px-3 py-2 text-sm transition ${
                    scope === opt.v ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'
                  }`}
                >
                  <div className="font-medium">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {requireDoc && (
            <p className="text-xs text-amber-700 bg-amber-500/10 border border-amber-300 rounded px-3 py-2">
              Product policy requires a supporting document. Attach evidence in the Documents tab before
              this override can be approved.
            </p>
          )}

          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={confirm} onCheckedChange={(v) => setConfirm(v === true)} className="mt-0.5" />
            <span>
              I confirm this override is justified. All actions (request, approval, rejection) are audited.
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {busy ? 'Submitting…' : 'Submit for Supervisor Review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
