import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  FACT_SOURCE_TYPES, FACT_DATA_TYPES, FACT_IMPLEMENTATION_STATUSES,
  FACT_ALLOWED_OPERATORS, FACT_CATEGORIES, WINDOW_TYPES,
  validateEligibilityFact, isResolverRegistered,
  type EligibilityFactInput,
} from '@/services/bn/eligibilityFactService';
import { getRegisteredResolverNames } from '@/services/bn/eligibility/eligibilityFactResolver';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  value: EligibilityFactInput;
  isEdit: boolean;
  onSave: (v: EligibilityFactInput) => void;
  saving?: boolean;
}

export function FactEditorDialog({ open, onOpenChange, value, isEdit, onSave, saving }: Props) {
  const [v, setV] = useState<EligibilityFactInput>(value);
  useEffect(() => { setV(value); }, [value, open]);

  const resolvers = useMemo(() => getRegisteredResolverNames().sort(), []);
  const err = useMemo(() => validateEligibilityFact(v), [v]);
  const resolverOk = !v.resolver_function || isResolverRegistered(v.resolver_function);

  const set = <K extends keyof EligibilityFactInput>(k: K, val: EligibilityFactInput[K]) =>
    setV(prev => ({ ...prev, [k]: val }));

  const toggleOperator = (op: string) => {
    const cur = new Set(v.allowed_operators);
    if (cur.has(op)) cur.delete(op); else cur.add(op);
    set('allowed_operators', Array.from(cur));
  };

  const csv = (arr: string[]) => (arr ?? []).join(', ');
  const fromCsv = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean);

  const isDerived = v.source_type === 'DERIVED_AGGREGATE';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Fact' : 'Add Fact'}</DialogTitle>
          <DialogDescription>
            Configure a computable fact that rules can reference. Resolver code is developer-owned —
            select from registered resolvers only.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Fact Key *</Label>
            <Input value={v.fact_key} disabled={isEdit}
              onChange={e => set('fact_key', e.target.value.toLowerCase())}
              placeholder="contribution.weeks_last_13" className="font-mono" />
            <p className="text-xs text-muted-foreground mt-1">Lowercase dot notation. Immutable after creation.</p>
          </div>
          <div>
            <Label>Label *</Label>
            <Input value={v.label} onChange={e => set('label', e.target.value)} />
          </div>
          <div>
            <Label>Category *</Label>
            <Select value={v.category} onValueChange={x => set('category', x)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FACT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data Type *</Label>
            <Select value={v.data_type} onValueChange={x => set('data_type', x as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FACT_DATA_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Description</Label>
            <Textarea value={v.description ?? ''} onChange={e => set('description', e.target.value)} rows={2} />
          </div>

          <div>
            <Label>Source Type *</Label>
            <Select value={v.source_type} onValueChange={x => set('source_type', x as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FACT_SOURCE_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Implementation Status *</Label>
            <Select value={v.implementation_status} onValueChange={x => set('implementation_status', x as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FACT_IMPLEMENTATION_STATUSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {(v.source_type === 'DIRECT_FIELD' || v.source_type === 'DOCUMENT_CHECK' || v.source_type === 'EXISTENCE_CHECK') && (
            <>
              <div>
                <Label>Source Table {v.source_type === 'DIRECT_FIELD' ? '*' : ''}</Label>
                <Input value={v.source_table ?? ''} onChange={e => set('source_table', e.target.value || null)}
                  placeholder="ip_master" className="font-mono" />
              </div>
              <div>
                <Label>Source Column {v.source_type === 'DIRECT_FIELD' ? '*' : ''}</Label>
                <Input value={v.source_column ?? ''} onChange={e => set('source_column', e.target.value || null)}
                  placeholder="dob" className="font-mono" />
              </div>
            </>
          )}

          <div className="col-span-2">
            <Label>Resolver Function {(v.source_type === 'RESOLVER_ONLY' || v.source_type === 'DOCUMENT_CHECK' || v.source_type === 'EXISTENCE_CHECK') ? '*' : ''}</Label>
            <div className="flex gap-2 items-center">
              <Select value={v.resolver_function ?? '__none__'} onValueChange={x => set('resolver_function', x === '__none__' ? null : x)}>
                <SelectTrigger><SelectValue placeholder="Select registered resolver" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">(none)</SelectItem>
                  {resolvers.map(r => <SelectItem key={r} value={r} className="font-mono">{r}</SelectItem>)}
                </SelectContent>
              </Select>
              {v.resolver_function && (
                resolverOk
                  ? <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Registered</Badge>
                  : <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Missing</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Only resolvers registered in code are selectable. To add a new one, a developer must register it.</p>
          </div>

          {isDerived && (
            <div className="col-span-2 border rounded-md p-3 bg-muted/30 space-y-3">
              <div className="font-medium text-sm">Derived Aggregate Metadata</div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Base Table *</Label><Input className="font-mono" value={v.base_table ?? ''} onChange={e => set('base_table', e.target.value || null)} placeholder="ip_wages" /></div>
                <div><Label>Base Date Column *</Label><Input className="font-mono" value={v.base_date_column ?? ''} onChange={e => set('base_date_column', e.target.value || null)} placeholder="period" /></div>
                <div className="col-span-2"><Label>Base Value Columns (CSV)</Label><Input className="font-mono" value={csv(v.base_value_columns)} onChange={e => set('base_value_columns', fromCsv(e.target.value))} placeholder="wages_paid1, wages_paid2, ..." /></div>
                <div className="col-span-2"><Label>Base Code Columns (CSV)</Label><Input className="font-mono" value={csv(v.base_code_columns)} onChange={e => set('base_code_columns', fromCsv(e.target.value))} placeholder="paid_code1, paid_code2, ..." /></div>
                <div>
                  <Label>Window Type</Label>
                  <Select value={v.window_type ?? '__none__'} onValueChange={x => set('window_type', x === '__none__' ? null : x as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">(none)</SelectItem>
                      {WINDOW_TYPES.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Window Size</Label><Input type="number" value={v.window_size ?? ''} onChange={e => set('window_size', e.target.value ? Number(e.target.value) : null)} /></div>
                <div><Label>Window Anchor</Label><Input className="font-mono" value={v.window_anchor ?? ''} onChange={e => set('window_anchor', e.target.value || null)} placeholder="claim_date" /></div>
                <div><Label>Count Logic</Label><Input value={v.count_logic ?? ''} onChange={e => set('count_logic', e.target.value || null)} placeholder="count week if any wages_paid1..7 > 0" /></div>
                <div><Label>Output Table *</Label><Input className="font-mono" value={v.output_table ?? ''} onChange={e => set('output_table', e.target.value || null)} placeholder="bn_claim_contribution_snapshot" /></div>
                <div><Label>Output Column *</Label><Input className="font-mono" value={v.output_column ?? ''} onChange={e => set('output_column', e.target.value || null)} placeholder="contribution_json" /></div>
                <div><Label>Output JSON Key *</Label><Input className="font-mono" value={v.output_json_key ?? ''} onChange={e => set('output_json_key', e.target.value || null)} placeholder="window_13" /></div>
                <div><Label>Snapshot Builder *</Label><Input className="font-mono" value={v.snapshot_builder ?? ''} onChange={e => set('snapshot_builder', e.target.value || null)} placeholder="ensureContributionSnapshot" /></div>
              </div>
            </div>
          )}

          <div className="col-span-2">
            <Label>Allowed Operators *</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {FACT_ALLOWED_OPERATORS.map(op => {
                const on = v.allowed_operators.includes(op);
                return (
                  <Badge key={op} variant={on ? 'default' : 'outline'} className="cursor-pointer" onClick={() => toggleOperator(op)}>
                    {op}
                  </Badge>
                );
              })}
            </div>
          </div>

          <div className="col-span-2">
            <Label>Example Value</Label>
            <Input value={v.example_value ?? ''} onChange={e => set('example_value', e.target.value || null)} placeholder="13" />
          </div>

          <div className="col-span-2 grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between border rounded-md p-2">
              <Label className="cursor-pointer">Requires snapshot</Label>
              <Switch checked={v.requires_snapshot} onCheckedChange={x => set('requires_snapshot', x)} />
            </div>
            <div className="flex items-center justify-between border rounded-md p-2">
              <Label className="cursor-pointer">Requires claim context</Label>
              <Switch checked={v.requires_claim_context} onCheckedChange={x => set('requires_claim_context', x)} />
            </div>
            <div className="flex items-center justify-between border rounded-md p-2">
              <Label className="cursor-pointer">Requires SSN</Label>
              <Switch checked={v.requires_ssn} onCheckedChange={x => set('requires_ssn', x)} />
            </div>
            <div className="flex items-center justify-between border rounded-md p-2">
              <Label className="cursor-pointer">Requires deceased SSN</Label>
              <Switch checked={v.requires_deceased_ssn} onCheckedChange={x => set('requires_deceased_ssn', x)} />
            </div>
            <div className="flex items-center justify-between border rounded-md p-2 col-span-2">
              <Label className="cursor-pointer">Active</Label>
              <Switch checked={v.is_active} onCheckedChange={x => set('is_active', x)} />
            </div>
          </div>
        </div>

        {err && (
          <Alert variant="destructive" className="mt-3">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{err}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!!err || !!saving} onClick={() => onSave(v)}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Fact'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
