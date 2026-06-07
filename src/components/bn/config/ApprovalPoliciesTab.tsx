/**
 * Approval / Override Policies tab (unified, policy-driven framework).
 *
 * One card per policy area with searchable pickers backed by master data
 * — roles, reason categories, statuses, rule codes, workbaskets. Workbench
 * panels consume these rows via `bnPolicyEvaluator`; no role/status check
 * is hardcoded anywhere else.
 */
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, AlertTriangle, CheckCircle2, Save, Database, Loader2 } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MultiSelectChips } from './MultiSelectChips';
import { useProductPolicies } from '@/hooks/bn/usePolicy';
import {
  useClaimStatusOptions,
  useReasonCategoryOptions,
  useRoleOptions,
  useRuleCodeOptions,
  useWorkbasketOptions,
} from '@/hooks/bn/usePolicyMetadata';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUserCode } from '@/hooks/useUserCode';
import type { ApprovalPolicy, PolicyArea } from '@/services/bn/policies/types';
import { POLICY_AREAS } from '@/services/bn/policies/types';
import {
  countLegacyOverridePolicies,
  migrateLegacyOverridePoliciesToApprovalPolicies,
} from '@/services/bn/policies/migrateLegacyPolicies';
import { useQuery } from '@tanstack/react-query';

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
  const [migrating, setMigrating] = useState(false);

  // Master data
  const { data: roleOptions = [] } = useRoleOptions();
  const { data: reasonCategoryOptions = [] } = useReasonCategoryOptions();
  const { data: statusOptions = [] } = useClaimStatusOptions();
  const { data: workbasketOptions = [] } = useWorkbasketOptions();
  const { data: ruleOptions = [] } = useRuleCodeOptions(versionId);

  // Legacy migration banner — count legacy rows for the product this version belongs to.
  const { data: productIdForVersion } = useQuery({
    queryKey: ['bn', 'product-id-for-version', versionId],
    queryFn: async () => {
      if (!versionId) return null;
      const { data } = await db.from('bn_product_version').select('product_id').eq('id', versionId).maybeSingle();
      return data?.product_id ?? null;
    },
    enabled: !!versionId,
  });

  const { data: legacyCount = 0, refetch: refetchLegacy } = useQuery({
    queryKey: ['bn', 'legacy-override-count', productIdForVersion],
    queryFn: () => countLegacyOverridePolicies(productIdForVersion ?? undefined),
    enabled: !!productIdForVersion,
  });

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

  const runMigration = async (force: boolean) => {
    setMigrating(true);
    try {
      const stats = await migrateLegacyOverridePoliciesToApprovalPolicies({
        productVersionId: versionId,
        actor: userCode || 'SYSTEM',
        force,
      });
      toast({
        title: stats.errors.length ? 'Migration completed with warnings' : 'Migration completed',
        description: `Inserted ${stats.inserted}, updated ${stats.updated}, skipped ${stats.skipped} of ${stats.legacyRows} legacy rows.${stats.errors.length ? ' ' + stats.errors.slice(0, 2).join('; ') : ''}`,
        variant: stats.errors.length ? 'destructive' : undefined,
      });
      qc.invalidateQueries({ queryKey: ['bn', 'approval-policies', versionId] });
      refetchLegacy();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Migration failed', description: e?.message });
    } finally {
      setMigrating(false);
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
        <CardContent className="space-y-3">
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

          {legacyCount > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50/60 p-3 text-sm space-y-2">
              <div className="flex items-center gap-2 font-medium text-amber-700">
                <Database className="h-4 w-4" /> Legacy override policies detected
              </div>
              <p className="text-amber-700">
                {legacyCount} row{legacyCount === 1 ? '' : 's'} still live in the legacy <code>bn_override_policy</code> table.
                Migrate them into the unified framework so the Workbench can evaluate them.
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={migrating || isReadOnly} onClick={() => runMigration(false)}>
                  {migrating && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  Migrate (skip existing)
                </Button>
                <Button size="sm" variant="ghost" disabled={migrating || isReadOnly} onClick={() => runMigration(true)}>
                  Force overwrite
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading && <div className="text-sm text-muted-foreground">Loading policies…</div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {POLICY_AREAS.map((area) => {
          const p = merged(area);
          const dirty = !!draft[area];
          const disabled = !!isReadOnly || !p.is_enabled;
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
                  <Switch checked={!!p.requires_reason_code} disabled={disabled}
                    onCheckedChange={(v) => patch(area, { requires_reason_code: v })} />
                </Row>
                <Row label="Justification required">
                  <Switch checked={!!p.requires_justification} disabled={disabled}
                    onCheckedChange={(v) => patch(area, { requires_justification: v })} />
                </Row>
                <Row label="Supporting document required">
                  <Switch checked={!!p.requires_document} disabled={disabled}
                    onCheckedChange={(v) => patch(area, { requires_document: v })} />
                </Row>
                <Row label="Supervisor approval required">
                  <Switch checked={!!p.requires_supervisor_approval} disabled={disabled}
                    onCheckedChange={(v) => patch(area, { requires_supervisor_approval: v })} />
                </Row>
                <Row label="Self-approval allowed">
                  <Switch checked={!!p.self_approval_allowed} disabled={disabled}
                    onCheckedChange={(v) => patch(area, { self_approval_allowed: v })} />
                </Row>
                {area === 'DOCUMENTS' && (
                  <Row label="Non-waivable">
                    <Switch checked={!!p.non_waivable} disabled={disabled}
                      onCheckedChange={(v) => patch(area, { non_waivable: v })} />
                  </Row>
                )}

                <div>
                  <Label className="text-xs">Approver role</Label>
                  <div className="mt-1">
                    <SearchableSelect
                      options={roleOptions}
                      value={(p.approval_role ?? '').toString().toUpperCase()}
                      onValueChange={(v) => patch(area, { approval_role: v || null })}
                      placeholder="Select role…"
                      emptyMessage="No active roles."
                      disabled={disabled}
                      includeAllOption="— None —"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Reason code group</Label>
                  <div className="mt-1">
                    <SearchableSelect
                      options={reasonCategoryOptions}
                      value={p.reason_code_group ?? ''}
                      onValueChange={(v) => patch(area, { reason_code_group: v || null })}
                      placeholder="Select reason group…"
                      emptyMessage="No reason categories. Add some in master data."
                      disabled={disabled || !p.requires_reason_code}
                      includeAllOption="— None —"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Approval workbasket</Label>
                  <div className="mt-1">
                    <SearchableSelect
                      options={workbasketOptions}
                      value={p.approval_workbasket_id ?? ''}
                      onValueChange={(v) => patch(area, { approval_workbasket_id: v || null })}
                      placeholder="Select workbasket…"
                      emptyMessage="No workbaskets configured."
                      disabled={disabled || !p.requires_supervisor_approval}
                      includeAllOption="— None —"
                    />
                  </div>
                </div>

                {(area === 'CALCULATION' || area === 'PAYMENT' || area === 'AWARD') && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Max override amount</Label>
                      <Input type="number" className="mt-1"
                        value={p.max_override_amount ?? ''} disabled={disabled}
                        onChange={(e) => patch(area, { max_override_amount: e.target.value === '' ? null : Number(e.target.value) })} />
                    </div>
                    <div>
                      <Label className="text-xs">Max override %</Label>
                      <Input type="number" step="0.01" className="mt-1"
                        value={p.max_override_percent ?? ''} disabled={disabled}
                        onChange={(e) => patch(area, { max_override_percent: e.target.value === '' ? null : Number(e.target.value) })} />
                    </div>
                  </div>
                )}

                <MultiSelectChips
                  label="Allowed statuses"
                  hint="claim must be in one of these"
                  options={statusOptions}
                  value={p.allowed_statuses ?? []}
                  onChange={(v) => patch(area, { allowed_statuses: v })}
                  disabled={disabled}
                />
                <MultiSelectChips
                  label="Blocked statuses"
                  hint="never allowed in these statuses"
                  options={statusOptions}
                  value={p.blocked_statuses ?? []}
                  onChange={(v) => patch(area, { blocked_statuses: v })}
                  disabled={disabled}
                />
                {(area === 'ELIGIBILITY' || area === 'CALCULATION') && (
                  <>
                    <MultiSelectChips
                      label="Allowed rule codes"
                      hint="leave empty to allow all"
                      options={ruleOptions}
                      value={p.allowed_rule_codes ?? []}
                      onChange={(v) => patch(area, { allowed_rule_codes: v })}
                      disabled={disabled}
                    />
                    <MultiSelectChips
                      label="Blocked rule codes"
                      options={ruleOptions}
                      value={p.blocked_rule_codes ?? []}
                      onChange={(v) => patch(area, { blocked_rule_codes: v })}
                      disabled={disabled}
                    />
                  </>
                )}

                <div>
                  <Label className="text-xs">Notes</Label>
                  <Textarea className="mt-1" rows={2}
                    value={p.notes ?? ''} disabled={disabled}
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

export default ApprovalPoliciesTab;
