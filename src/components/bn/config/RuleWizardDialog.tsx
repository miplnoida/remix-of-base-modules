/**
 * RuleWizardDialog — executable-rule builder.
 *
 * Drives the rule definition off the typed `rule_kind` column instead of the
 * legacy free-form `field_name/operator/value` grid. The user picks a kind
 * (DATE_DIFFERENCE, DOCUMENT_STATUS, …) and the dialog renders only the
 * inputs that kind needs, with the fact picker scoped to the registry.
 */
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Wand2 } from 'lucide-react';
import { TestRulePanel } from './TestRulePanel';
import type { BnEligibilityRule } from '@/types/bn';
import { useToast } from '@/hooks/use-toast';
import { useUpsertBnEligibilityRule } from '@/hooks/bn/useBnProduct';
import {
  ELIGIBILITY_FACTS,
  CATEGORY_LABELS,
  RULE_GROUPS,
  defaultGroupForFact,
  getFact,
  type EligibilityCategory,
} from '@/services/bn/eligibility/eligibilityFactRegistry';
import { OPERATORS } from '@/services/bn/eligibility/operators';

type Kind = NonNullable<BnEligibilityRule['rule_kind']>;
const KINDS: { value: Kind; label: string; description: string }[] = [
  { value: 'LITERAL',         label: 'Literal comparison',     description: 'Compare a fact (number / enum / bool) to a fixed value.' },
  { value: 'FACT_TO_FACT',    label: 'Fact ↔ Fact',           description: 'Compare two facts directly (e.g. last worked date ≤ injury date).' },
  { value: 'DATE_DIFFERENCE', label: 'Date difference',        description: 'Compute days/weeks between two dates and compare (e.g. report within 3 days).' },
  { value: 'DOCUMENT_STATUS', label: 'Document status',        description: 'Verify a document on the claim has a required status.' },
  { value: 'EXISTS',          label: 'Existence check',        description: 'Check whether a fact exists (e.g. active award).' },
  { value: 'CROSS_PRODUCT',   label: 'Cross-product check',    description: 'Block when an overlapping claim/award exists on another product.' },
  { value: 'DERIVED_FACT',    label: 'Derived fact',           description: 'Same as Literal but flags that the source value is computed.' },
  { value: 'CONDITIONAL',     label: 'Conditional rule',       description: 'Only evaluate the inner check when a precondition fact matches.' },
];

const UNITS: BnEligibilityRule['unit'][] = ['DAYS', 'WEEKS', 'MONTHS', 'YEARS'];
const DOC_STATUSES = ['PENDING', 'RECEIVED', 'VERIFIED', 'REJECTED'];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  productVersionId: string;
  productCode?: string | null;
  initial?: Partial<BnEligibilityRule> | null;
  onSaved?: () => void;
}

const EMPTY: Partial<BnEligibilityRule> = {
  rule_code: '', rule_name: '', rule_kind: 'LITERAL',
  rule_definition: { operator: '>=', value: 0 },
  severity: 'BLOCK', fail_action: 'REJECT', is_active: true, overrideable: false, sort_order: 0,
  group_code: 'CORE_IDENTITY', rule_type: 'CONTRIBUTION', rule_group: 'GENERAL',
};

export function RuleWizardDialog({ open, onOpenChange, productVersionId, productCode, initial, onSaved }: Props) {
  const { toast } = useToast();
  const upsert = useUpsertBnEligibilityRule();
  const [rule, setRule] = useState<Partial<BnEligibilityRule>>(EMPTY);

  useEffect(() => {
    if (open) setRule({ ...EMPTY, ...(initial ?? {}), product_version_id: productVersionId });
  }, [open, initial, productVersionId]);

  const kind = (rule.rule_kind ?? 'LITERAL') as Kind;
  const def = (rule.rule_definition ?? {}) as Record<string, any>;
  const set = (patch: Partial<BnEligibilityRule>) => setRule((p) => ({ ...p, ...patch }));
  const setDef = (patch: Record<string, any>) => setRule((p) => ({ ...p, rule_definition: { ...(p.rule_definition as any), ...patch } }));

  const factsForProduct = useMemo(() => {
    if (!productCode) return ELIGIBILITY_FACTS;
    return ELIGIBILITY_FACTS.filter((f) => f.applicable_products.includes('*') || f.applicable_products.includes(productCode));
  }, [productCode]);

  const grouped = useMemo(() => {
    const m = new Map<EligibilityCategory, typeof ELIGIBILITY_FACTS>();
    for (const f of factsForProduct) {
      const arr = m.get(f.category) ?? [];
      arr.push(f);
      m.set(f.category, arr);
    }
    return Array.from(m.entries());
  }, [factsForProduct]);

  const FactSelect = ({ value, onValueChange, placeholder = 'Pick a fact…', dateOnly = false }: { value?: string | null; onValueChange: (v: string) => void; placeholder?: string; dateOnly?: boolean }) => (
    <Select value={value ?? ''} onValueChange={onValueChange}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent className="max-h-80">
        {grouped.map(([cat, facts]) => {
          const filtered = dateOnly ? facts.filter((f) => f.data_type === 'date') : facts;
          if (!filtered.length) return null;
          return (
            <div key={cat}>
              <div className="px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground">{CATEGORY_LABELS[cat]}</div>
              {filtered.map((f) => (
                <SelectItem key={f.fact_key} value={f.fact_key}>
                  <div className="flex flex-col">
                    <span>{f.label}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{f.fact_key} · {f.source_table}</span>
                  </div>
                </SelectItem>
              ))}
            </div>
          );
        })}
      </SelectContent>
    </Select>
  );

  const onKindChange = (k: Kind) => {
    // Reset kind-specific fields cleanly
    set({
      rule_kind: k,
      start_fact_key: null, end_fact_key: null, fallback_end_fact_key: null,
      compare_fact_key: null, document_type_code: null, required_status: null,
      existence_check_code: null, unit: k === 'DATE_DIFFERENCE' ? 'DAYS' : null,
      conditional_when: k === 'CONDITIONAL' ? {} : null,
      rule_definition: k === 'DATE_DIFFERENCE' ? { operator: '<=', value: 3 } : k === 'EXISTS' || k === 'CROSS_PRODUCT' ? { value: true } : { operator: '=', value: '' },
    });
  };

  const handleSave = async () => {
    if (!rule.rule_code || !rule.rule_name) { toast({ title: 'Code & Name required', variant: 'destructive' }); return; }
    if (kind === 'DATE_DIFFERENCE' && (!rule.start_fact_key || (!rule.end_fact_key && !rule.fallback_end_fact_key))) {
      toast({ title: 'Need start and end facts', variant: 'destructive' }); return;
    }
    if ((kind === 'LITERAL' || kind === 'DERIVED_FACT' || kind === 'EXISTS' || kind === 'CROSS_PRODUCT') && !rule.fact_key) {
      toast({ title: 'Pick a fact', variant: 'destructive' }); return;
    }
    if (kind === 'DOCUMENT_STATUS' && !rule.fact_key && !rule.document_type_code) {
      toast({ title: 'Pick a document fact or set document_type_code', variant: 'destructive' }); return;
    }
    if (kind === 'FACT_TO_FACT' && (!rule.fact_key || !rule.compare_fact_key)) {
      toast({ title: 'Pick both facts', variant: 'destructive' }); return;
    }
    try {
      const factDef = rule.fact_key ? getFact(rule.fact_key) : null;
      const payload: Partial<BnEligibilityRule> = {
        ...rule,
        product_version_id: productVersionId,
        group_code: rule.group_code ?? (rule.fact_key ? defaultGroupForFact(rule.fact_key) : 'CORE_IDENTITY'),
        data_source: factDef?.source_table ?? rule.data_source ?? null,
      };
      await upsert.mutateAsync(payload);
      toast({ title: 'Rule saved' });
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Save failed', description: e?.message, variant: 'destructive' });
    }
  };

  const factDef = rule.fact_key ? getFact(rule.fact_key) : null;
  const operators = factDef ? Object.values(OPERATORS).filter((o) => o.appliesTo.includes(factDef.data_type)) : Object.values(OPERATORS);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Wand2 className="h-4 w-4 text-primary" /> Eligibility Rule Wizard</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Identification */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Rule Code *</Label><Input value={rule.rule_code ?? ''} onChange={(e) => set({ rule_code: e.target.value.toUpperCase() })} maxLength={30} /></div>
            <div className="space-y-1"><Label>Rule Name *</Label><Input value={rule.rule_name ?? ''} onChange={(e) => set({ rule_name: e.target.value })} /></div>
          </div>

          {/* Kind */}
          <div className="space-y-1">
            <Label>Rule Kind *</Label>
            <Select value={kind} onValueChange={(v) => onKindChange(v as Kind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k.value} value={k.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{k.label}</span>
                      <span className="text-[10px] text-muted-foreground">{k.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Kind-specific configuration */}
          <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
            {kind === 'DATE_DIFFERENCE' && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Start date *</Label><FactSelect value={rule.start_fact_key} onValueChange={(v) => set({ start_fact_key: v })} dateOnly /></div>
                  <div className="space-y-1"><Label className="text-xs">End date *</Label><FactSelect value={rule.end_fact_key} onValueChange={(v) => set({ end_fact_key: v })} dateOnly /></div>
                  <div className="space-y-1"><Label className="text-xs">Fallback end</Label><FactSelect value={rule.fallback_end_fact_key} onValueChange={(v) => set({ fallback_end_fact_key: v })} dateOnly placeholder="(optional)" /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Operator</Label>
                    <Select value={(def.operator as string) ?? '<='} onValueChange={(v) => setDef({ operator: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(['<=', '<', '>=', '>', '=', '!='] as const).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Threshold</Label><Input type="number" value={def.value ?? 0} onChange={(e) => setDef({ value: Number(e.target.value) })} /></div>
                  <div className="space-y-1">
                    <Label className="text-xs">Unit</Label>
                    <Select value={(rule.unit ?? 'DAYS') as string} onValueChange={(v) => set({ unit: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{UNITS.map((u) => <SelectItem key={u!} value={u!}>{u}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {kind === 'DOCUMENT_STATUS' && (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1 col-span-2"><Label className="text-xs">Document fact (preferred)</Label><FactSelect value={rule.fact_key} onValueChange={(v) => set({ fact_key: v })} /></div>
                <div className="space-y-1">
                  <Label className="text-xs">Required status</Label>
                  <Select value={rule.required_status ?? 'VERIFIED'} onValueChange={(v) => set({ required_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DOC_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-3 space-y-1">
                  <Label className="text-xs">…or document type code (fallback)</Label>
                  <Input value={rule.document_type_code ?? ''} onChange={(e) => set({ document_type_code: e.target.value })} placeholder="e.g. MEDICAL_CERT" />
                </div>
              </div>
            )}

            {kind === 'FACT_TO_FACT' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Left fact *</Label><FactSelect value={rule.fact_key} onValueChange={(v) => set({ fact_key: v })} /></div>
                  <div className="space-y-1"><Label className="text-xs">Right fact *</Label><FactSelect value={rule.compare_fact_key} onValueChange={(v) => set({ compare_fact_key: v })} /></div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Operator</Label>
                  <Select value={(def.operator as string) ?? '='} onValueChange={(v) => setDef({ operator: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{operators.map((o) => <SelectItem key={o.key} value={o.key}>{o.label} ({o.key})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {(kind === 'EXISTS' || kind === 'CROSS_PRODUCT') && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2"><Label className="text-xs">Existence fact *</Label><FactSelect value={rule.fact_key} onValueChange={(v) => set({ fact_key: v })} /></div>
                <div className="space-y-1">
                  <Label className="text-xs">Expected</Label>
                  <Select value={String(def.value ?? true)} onValueChange={(v) => setDef({ value: v === 'true' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="true">Must exist (true)</SelectItem><SelectItem value="false">Must NOT exist (false)</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {(kind === 'LITERAL' || kind === 'DERIVED_FACT' || kind === 'CONDITIONAL') && (
              <div className="space-y-3">
                <div className="space-y-1"><Label className="text-xs">Fact *</Label><FactSelect value={rule.fact_key} onValueChange={(v) => set({ fact_key: v, group_code: defaultGroupForFact(v) })} /></div>
                {factDef && (
                  <p className="text-[11px] text-muted-foreground">{factDef.description} · <span className="font-mono">{factDef.source_table}.{factDef.source_column}</span> · type: <Badge variant="outline" className="text-[10px]">{factDef.data_type}</Badge></p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Operator</Label>
                    <Select value={(def.operator as string) ?? '='} onValueChange={(v) => setDef({ operator: v })} disabled={!factDef}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{operators.map((o) => <SelectItem key={o.key} value={o.key}>{o.label} ({o.key})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Expected value</Label>
                    {factDef?.data_type === 'bool' ? (
                      <Select value={String(def.value ?? 'true')} onValueChange={(v) => setDef({ value: v === 'true' })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="true">true</SelectItem><SelectItem value="false">false</SelectItem></SelectContent>
                      </Select>
                    ) : factDef?.data_type === 'enum' && factDef.allowed_values ? (
                      <Select value={String(def.value ?? '')} onValueChange={(v) => setDef({ value: v })}>
                        <SelectTrigger><SelectValue placeholder="Pick…" /></SelectTrigger>
                        <SelectContent>{factDef.allowed_values.map((v) => <SelectItem key={String(v)} value={String(v)}>{String(v)}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : (
                      <Input type={factDef?.data_type === 'number' ? 'number' : factDef?.data_type === 'date' ? 'date' : 'text'} value={def.value ?? ''} onChange={(e) => setDef({ value: factDef?.data_type === 'number' ? Number(e.target.value) : e.target.value })} />
                    )}
                  </div>
                </div>
                {kind === 'CONDITIONAL' && (
                  <div className="rounded border-l-2 border-primary/40 bg-background p-2 space-y-2">
                    <Label className="text-xs">Precondition (only evaluate inner rule when this matches)</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <FactSelect value={(rule.conditional_when as any)?.fact_key} onValueChange={(v) => set({ conditional_when: { ...(rule.conditional_when as any), fact_key: v } })} />
                      <Select value={((rule.conditional_when as any)?.operator as string) ?? '='} onValueChange={(v) => set({ conditional_when: { ...(rule.conditional_when as any), operator: v } })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{(['=', '!=', '>=', '<=', 'exists', 'not_exists'] as const).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input value={(rule.conditional_when as any)?.value ?? ''} onChange={(e) => set({ conditional_when: { ...(rule.conditional_when as any), value: e.target.value } })} placeholder="value" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Severity / Action / Override */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Severity</Label>
              <Select value={(rule.severity as string) ?? 'BLOCK'} onValueChange={(v) => set({ severity: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BLOCK">Block (hard fail)</SelectItem>
                  <SelectItem value="REFER">Refer (manual review)</SelectItem>
                  <SelectItem value="WARN">Warn (soft)</SelectItem>
                  <SelectItem value="INFO">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fail action</Label>
              <Select value={(rule.fail_action as string) ?? 'REJECT'} onValueChange={(v) => set({ fail_action: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="REJECT">REJECT</SelectItem>
                  <SelectItem value="REFER">REFER</SelectItem>
                  <SelectItem value="WARN">WARN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Group</Label>
              <Select value={(rule.group_code as string) ?? 'CORE_IDENTITY'} onValueChange={(v) => set({ group_code: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RULE_GROUPS.map((g) => <SelectItem key={g.code} value={g.code}>{g.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-md border bg-muted/30 p-2">
            <div className="flex items-center gap-2"><Switch checked={rule.overrideable ?? false} onCheckedChange={(v) => set({ overrideable: v })} /><Label className="text-sm">Allow override</Label></div>
            {rule.overrideable && <Input className="flex-1" placeholder="Override policy code (e.g. SUPERVISOR_L2)" value={rule.override_policy_code ?? ''} onChange={(e) => set({ override_policy_code: e.target.value || null })} />}
            <div className="flex items-center gap-2"><Switch checked={rule.is_active ?? true} onCheckedChange={(v) => set({ is_active: v })} /><Label className="text-sm">Active</Label></div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Message template</Label>
            <Textarea rows={2} value={rule.message_template ?? ''} onChange={(e) => set({ message_template: e.target.value })} placeholder="e.g. Reported {{actual}} days after the injury (limit {{expected}})." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Fail message (legacy fallback)</Label>
            <Textarea rows={2} value={rule.fail_message ?? ''} onChange={(e) => set({ fail_message: e.target.value })} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={upsert.isPending}>{upsert.isPending ? 'Saving…' : 'Save rule'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
