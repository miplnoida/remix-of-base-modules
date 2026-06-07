/**
 * Approval / Override Policies tab (new, policy-driven framework).
 *
 * One grouped card per policy area. Each card lets the configurator toggle
 * the policy on, set who can approve, what is required (reason, doc,
 * supervisor), thresholds, allowed/blocked statuses and rule codes.
 *
 * Persists to `bn_approval_policy` keyed by (product_version_id, policy_area,
 * action_code='DEFAULT'). All Workbench panels consume these rows via
 * `bnPolicyEvaluator` — no hardcoded role/status checks remain.
 */
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, AlertTriangle, CheckCircle2, Save } from 'lucide-react';
import { useProductPolicies } from '@/hooks/bn/usePolicy';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUserCode } from '@/hooks/useUserCode';
import type { ApprovalPolicy, PolicyArea } from '@/services/bn/policies/types';
import { POLICY_AREAS } from '@/services/bn/policies/types';

const AREA_META: Record<PolicyArea, { title: string; description: string }> = {
  ELIGIBILITY:   { title: 'Eligibility Overrides',   description: 'Permit officers to override failed eligibility rules with supervisor approval.' },
  CALCULATION:   { title: 'Calculation Overrides',   description: 'Override calculation inputs, caps, or the final benefit amount.' },
  DOCUMENTS:     { title: 'Document Waivers',        description: 'Waive a mandatory document or accept an alternate / expired document.' },
  AMENDMENTS:    { title: 'Claim Amendments',        description: 'Edit locked claim fields after the normal cutoff stage.' },
  PARTICIPANTS:  { title: 'Participant Changes',     description: 'Add, remove or edit participants once the claim is locked.' },
  WORKFLOW:      { title: 'Workflow Overrides',      description: 'Skip, re-route or unlock a workflow step on a specific claim.' },
  AWARD:         { title: 'Award Overrides',         description: 'Backdate effective date, override beneficiary share, suspend/resume.' },
  PAYMENT:       { title: 'Payment Overrides',       description: 'Release holds, change method/bank, adjust amount within threshold.' },
  COMMUNICATION: { title: 'Communication Overrides', description: 'Re-send, suppress or re-template participant communications.' },
};

interface Props {
  versionId: string | undefined;
  isReadOnly?: boolean;
}

const db = supabase as any;

export function ApprovalPoliciesTab({ versionId, isReadOnly }: Props) {
  const { toast } = useToast();
  const { userCode } = useUserCode();
  const qc = useQueryClient();
  const { data: policies = [], isLoading } = useProductPolicies(versionId);
  const [draft, setDraft] = useState<Record<string, Partial<ApprovalPolicy>>>({});
  const [savingArea, setSavingArea] = useState<string | null>(null);

  useEffect(() => { setDraft({}); }, [versionId]);

  if (!versionId) {
    return <Card><CardContent className="py-8 text-center text-muted-foreground">Save the product and select a version first.</CardContent></Card>;
  }

  const policyByArea: Record<string, ApprovalPolicy | undefined> = {};
  for (const p of policies) policyByArea[p.policy_area] = p;

  const merged = (area: PolicyArea): Partial<ApprovalPolicy> => ({
    ...(policyByArea[area] ?? {}),
    ...(draft[area] ?? {}),
  });

  const patch = (area: PolicyArea, partial: Partial<ApprovalPolicy>) =>
    setDraft((d) => ({ ...d, [area]: { ...(d[area] ?? {}), ...partial } }));

  const save = async (area: PolicyArea) => {
    const current = policyByArea[area];
    const next = merged(area);
    setSavingArea(area);
    try {
      const payload: any = {
        product_version_id: versionId,
        policy_area: area,
        action_code: 'DEFAULT',
        is_enabled: !!next.is_enabled,
        requires_reason_code: !!next.requires_reason_code,
        requires_justification: !!next.requires_justification,
        requires_document: !!next.requires_document,
        requires_supervisor_approval: !!next.requires_supervisor_approval,
        self_approval_allowed: !!next.self_approval_allowed,
        non_waivable: !!next.non_waivable,
        approval_role: next.approval_role || null,
        approval_workbasket_id: next.approval_workbasket_id || null,
        reason_code_group: next.reason_code_group || null,
        max_override_amount: next.max_override_amount ?? null,
        max_override_percent: next.max_override_percent ?? null,
        expiry_status: next.expiry_status || null,
        allowed_statuses: next.allowed_statuses ?? [],
        blocked_statuses: next.blocked_statuses ?? [],
        allowed_rule_codes: next.allowed_rule_codes ?? [],
        blocked_rule_codes: next.blocked_rule_codes ?? [],
        notes: next.notes || null,
        updated_by: userCode || 'SYSTEM',
      };
      if (current?.id) {
        const { error } = await db.from('bn_approval_policy').update(payload).eq('id', current.id);
        if (error) throw error;
      } else {
        payload.created_by = userCode || 'SYSTEM';
        const { error } = await db.from('bn_approval_policy').insert(payload);
        if (error) throw error;
      }
      toast({ title: 'Saved', description: `${AREA_META[area].title} updated.` });
      setDraft((d) => { const { [area]: _, ...rest } = d; return rest; });
      qc.invalidateQueries({ queryKey: ['bn', 'approval-policies', versionId] });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Save failed', description: e?.message ?? 'Unknown error' });
    } finally {
      setSavingArea(null);
    }
  };

  // ── Coverage validation ──────────────────────────────────────────────
  const coverageIssues: string[] = [];
  for (const area of POLICY_AREAS) {
    const p = merged(area);
    if (p.is_enabled) {
      if (p.requires_supervisor_approval && !p.approval_role) {
        coverageIssues.push(`${AREA_META[area].title}: approval required but no approver role set.`);
      }
      if (p.requires_reason_code && !p.reason_code_group) {
        coverageIssues.push(`${AREA_META[area].title}: reason required but no reason code group set.`);
      }
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Approval / Override Policies</CardTitle>
          <CardDescription>
            Configure how overrides and supervisor approvals behave for this product version. The Workbench reads these
            rules at runtime — no role or status is hardcoded.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {coverageIssues.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> Coverage validation passed.
            </div>
          ) : (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
              <div className="flex items-center gap-2 font-medium text-amber-700">
                <AlertTriangle className="h-4 w-4" /> Policy coverage gaps ({coverageIssues.length})
              </div>
              <ul className="mt-2 list-disc pl-5 text-amber-700">
                {coverageIssues.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading && <div className="text-sm text-muted-foreground">Loading policies…</div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {POLICY_AREAS.map((area) => {
          const p = merged(area);
          const dirty = !!draft[area];
          return (
            <Card key={area} className={dirty ? 'border-primary' : undefined}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{AREA_META[area].title}</CardTitle>
                    <CardDescription className="mt-1">{AREA_META[area].description}</CardDescription>
                  </div>
                  <Badge variant={p.is_enabled ? 'default' : 'outline'}>{p.is_enabled ? 'Enabled' : 'Disabled'}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Row label="Enabled">
                  <Switch checked={!!p.is_enabled} disabled={isReadOnly}
                    onCheckedChange={(v) => patch(area, { is_enabled: v })} />
                </Row>
                <Row label="Reason code required">
                  <Switch checked={!!p.requires_reason_code} disabled={isReadOnly || !p.is_enabled}
                    onCheckedChange={(v) => patch(area, { requires_reason_code: v })} />
                </Row>
                <Row label="Justification required">
                  <Switch checked={!!p.requires_justification} disabled={isReadOnly || !p.is_enabled}
                    onCheckedChange={(v) => patch(area, { requires_justification: v })} />
                </Row>
                <Row label="Supporting document required">
                  <Switch checked={!!p.requires_document} disabled={isReadOnly || !p.is_enabled}
                    onCheckedChange={(v) => patch(area, { requires_document: v })} />
                </Row>
                <Row label="Supervisor approval required">
                  <Switch checked={!!p.requires_supervisor_approval} disabled={isReadOnly || !p.is_enabled}
                    onCheckedChange={(v) => patch(area, { requires_supervisor_approval: v })} />
                </Row>
                <Row label="Self-approval allowed">
                  <Switch checked={!!p.self_approval_allowed} disabled={isReadOnly || !p.is_enabled}
                    onCheckedChange={(v) => patch(area, { self_approval_allowed: v })} />
                </Row>
                {area === 'DOCUMENTS' && (
                  <Row label="Non-waivable">
                    <Switch checked={!!p.non_waivable} disabled={isReadOnly || !p.is_enabled}
                      onCheckedChange={(v) => patch(area, { non_waivable: v })} />
                  </Row>
                )}

                <div>
                  <Label className="text-xs">Approver role</Label>
                  <Input className="mt-1" placeholder="e.g. BN_SUPERVISOR"
                    value={p.approval_role ?? ''} disabled={isReadOnly || !p.is_enabled}
                    onChange={(e) => patch(area, { approval_role: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Reason code group</Label>
                  <Input className="mt-1" placeholder="e.g. ELIGIBILITY_OVERRIDE"
                    value={p.reason_code_group ?? ''} disabled={isReadOnly || !p.is_enabled}
                    onChange={(e) => patch(area, { reason_code_group: e.target.value })} />
                </div>

                {(area === 'CALCULATION' || area === 'PAYMENT' || area === 'AWARD') && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Max override amount</Label>
                      <Input type="number" className="mt-1"
                        value={p.max_override_amount ?? ''} disabled={isReadOnly || !p.is_enabled}
                        onChange={(e) => patch(area, { max_override_amount: e.target.value === '' ? null : Number(e.target.value) })} />
                    </div>
                    <div>
                      <Label className="text-xs">Max override %</Label>
                      <Input type="number" step="0.01" className="mt-1"
                        value={p.max_override_percent ?? ''} disabled={isReadOnly || !p.is_enabled}
                        onChange={(e) => patch(area, { max_override_percent: e.target.value === '' ? null : Number(e.target.value) })} />
                    </div>
                  </div>
                )}

                <ArrayInput label="Allowed statuses" value={p.allowed_statuses ?? []}
                  disabled={isReadOnly || !p.is_enabled}
                  onChange={(v) => patch(area, { allowed_statuses: v })} />
                <ArrayInput label="Blocked statuses" value={p.blocked_statuses ?? []}
                  disabled={isReadOnly || !p.is_enabled}
                  onChange={(v) => patch(area, { blocked_statuses: v })} />
                {(area === 'ELIGIBILITY' || area === 'CALCULATION') && (
                  <>
                    <ArrayInput label="Allowed rule codes" value={p.allowed_rule_codes ?? []}
                      disabled={isReadOnly || !p.is_enabled}
                      onChange={(v) => patch(area, { allowed_rule_codes: v })} />
                    <ArrayInput label="Blocked rule codes" value={p.blocked_rule_codes ?? []}
                      disabled={isReadOnly || !p.is_enabled}
                      onChange={(v) => patch(area, { blocked_rule_codes: v })} />
                  </>
                )}

                <div>
                  <Label className="text-xs">Notes</Label>
                  <Textarea className="mt-1" rows={2}
                    value={p.notes ?? ''} disabled={isReadOnly || !p.is_enabled}
                    onChange={(e) => patch(area, { notes: e.target.value })} />
                </div>

                <div className="flex justify-end pt-1">
                  <Button size="sm" onClick={() => save(area)} disabled={!dirty || isReadOnly || savingArea === area}>
                    <Save className="mr-1 h-3 w-3" /> {savingArea === area ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-xs">{label}</Label>
      <div>{children}</div>
    </div>
  );
}

function ArrayInput({ label, value, onChange, disabled }: { label: string; value: string[]; onChange: (v: string[]) => void; disabled?: boolean }) {
  return (
    <div>
      <Label className="text-xs">{label} <span className="text-muted-foreground">(comma-separated)</span></Label>
      <Input className="mt-1" disabled={disabled} value={value.join(', ')}
        onChange={(e) => onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />
    </div>
  );
}

export default ApprovalPoliciesTab;
