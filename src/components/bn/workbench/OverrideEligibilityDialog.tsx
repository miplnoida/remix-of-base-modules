/**
 * Override Eligibility Dialog
 *
 * Officer-facing modal to request an eligibility-rule override. Submits via
 * the unified policy handler (bn_override_request) so all gating, required
 * fields, maker-checker and audit are driven by bn_approval_policy.
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
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSubmitOverride, usePolicy } from '@/hooks/bn/usePolicy';

export type OverrideScope = 'THIS_RULE_ONLY' | 'RULE_GROUP' | 'FULL_ELIGIBILITY';

export interface OverrideEligibilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claimId: string;
  productVersionId: string;
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
  userRoles: string[];
  claimStatus?: string;
}

async function fetchReasonCodes(group: string | null): Promise<Array<{ code: string; label: string }>> {
  const db = supabase as any;
  let q = db
    .from('bn_reason_code')
    .select('reason_code, reason_label, is_active, reason_category')
    .eq('is_active', true);
  q = q.eq('reason_category', group ?? 'ELIGIBILITY_OVERRIDE');
  const { data, error } = await q.order('reason_label');
  if (error) return [];
  return (data ?? []).map((r: any) => ({ code: r.reason_code, label: r.reason_label }));
}

export const OverrideEligibilityDialog: React.FC<OverrideEligibilityDialogProps> = ({
  open,
  onOpenChange,
  claimId,
  productVersionId,
  eligibilityResultId,
  rule,
  userCode,
  userRoles,
  claimStatus,
}) => {
  const { data: policy } = usePolicy(productVersionId, 'ELIGIBILITY');
  const submit = useSubmitOverride();

  const { data: reasons = [] } = useQuery({
    queryKey: ['bn', 'reason-codes', policy?.reason_code_group ?? 'ELIGIBILITY_OVERRIDE'],
    queryFn: () => fetchReasonCodes(policy?.reason_code_group ?? null),
    enabled: open,
  });

  const [reasonCode, setReasonCode] = useState('');
  const [justification, setJustification] = useState('');
  const [scope, setScope] = useState<OverrideScope>('THIS_RULE_ONLY');
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReasonCode('');
    setJustification('');
    setScope('THIS_RULE_ONLY');
    setConfirm(false);
  }, [open]);

  const reasonOptions = useMemo(
    () => reasons.map((r) => ({ value: r.code, label: r.label, searchText: r.code })),
    [reasons],
  );

  const requireReason = policy?.requires_reason_code !== false;
  const requireJustification = policy?.requires_justification !== false;
  const requireDoc = policy?.requires_document === true;

  const canSubmit =
    (!requireReason || !!reasonCode) &&
    (!requireJustification || justification.trim().length >= 10) &&
    confirm &&
    !submit.isPending;

  const handleSubmit = async () => {
    try {
      await submit.mutateAsync({
        claimId,
        productVersionId,
        area: 'ELIGIBILITY',
        actionCode: 'DEFAULT',
        targetEntityType: eligibilityResultId ? 'bn_claim_eligibility' : undefined,
        targetEntityId: eligibilityResultId ?? undefined,
        ruleCode: rule.rule_code,
        currentValue: {
          actual_value: rule.actual_value ?? null,
          expected_value: rule.expected_value ?? null,
          operator: rule.operator ?? null,
          rule_group_code: rule.rule_group_code ?? null,
          field_key: rule.field_key ?? null,
          source: rule.source ?? null,
          message: rule.message ?? null,
        },
        requestedValue: { override_scope: scope, passed: true },
        reasonCode: reasonCode || undefined,
        justification: justification || undefined,
        claimStatus,
        requestedBy: userCode,
        requestedByRoles: userRoles,
      });
      toast.success('Override request submitted', {
        description: policy?.requires_supervisor_approval
          ? 'A supervisor must review and approve before eligibility is updated.'
          : 'Override applied per policy.',
      });
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Could not submit override', { description: err?.message ?? 'Please try again.' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Request Eligibility Override</DialogTitle>
          <DialogDescription>
            Eligibility failures stay factual. This request follows the product's approval policy and is
            fully audited.
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

          {requireReason && (
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
                Manage codes in Admin → Reason Codes (category{' '}
                <span className="font-mono">{policy?.reason_code_group ?? 'ELIGIBILITY_OVERRIDE'}</span>).
              </p>
            </div>
          )}

          {requireJustification && (
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
          )}

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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submit.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submit.isPending
              ? 'Submitting…'
              : policy?.requires_supervisor_approval
                ? 'Submit for Supervisor Review'
                : 'Apply Override'}
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
