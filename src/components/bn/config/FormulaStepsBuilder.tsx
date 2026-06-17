/**
 * FormulaStepsBuilder — visual editor for bn_formula_version.steps_json.
 *
 * Supports expression_type:
 *   SIMPLE_EXPRESSION       — single expression box
 *   RATE_TABLE_LOOKUP       — one LOOKUP step
 *   MATRIX_LOOKUP           — one LOOKUP step (multi-dim)
 *   MEDICAL_TARIFF_LOOKUP   — one MEDICAL_TARIFF step
 *   MULTI_STEP              — ordered list of any step kinds
 *   CONDITIONAL             — IF/ELSE branches each with an expression
 *
 * steps_json shape:
 *   { expression?: string,                     // SIMPLE_EXPRESSION
 *     steps?: Step[],                          // MULTI_STEP
 *     lookup?: LookupStep,                     // *_LOOKUP single
 *     medical?: MedicalStep,                   // MEDICAL_TARIFF_LOOKUP
 *     conditional?: { branches: ConditionalBranch[] } }
 */
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export type ExpressionType =
  | 'SIMPLE_EXPRESSION' | 'RATE_TABLE_LOOKUP' | 'MATRIX_LOOKUP'
  | 'MEDICAL_TARIFF_LOOKUP' | 'MULTI_STEP' | 'CONDITIONAL';

export interface LookupStep {
  kind: 'LOOKUP';
  table_code: string;
  inputs: Record<string, string>; // dim_key -> variable_code
  output_var: string;
}
export interface MedicalStep {
  kind: 'MEDICAL_TARIFF';
  procedure_var: string;
  location_var: string;
  provider_var: string;
  amount_var: string;
  output_var: string;
}
export interface ExpressionStep {
  kind: 'EXPRESSION';
  expression: string;
  output_var: string;
}
export interface ConditionalBranch {
  condition: string; // empty = else
  expression: string;
}
export type Step = LookupStep | MedicalStep | ExpressionStep;

export interface StepsJson {
  expression?: string;
  steps?: Step[];
  lookup?: LookupStep;
  medical?: MedicalStep;
  conditional?: { branches: ConditionalBranch[] };
}

interface RateTableInfo { table_code: string; table_type: string; dims: { dimension_key: string }[] }

export function FormulaStepsBuilder({
  expressionType, value, onChange, variables,
}: {
  expressionType: ExpressionType;
  value: StepsJson;
  onChange: (next: StepsJson) => void;
  variables: string[];
}) {
  const [tables, setTables] = useState<RateTableInfo[]>([]);

  useEffect(() => {
    (async () => {
      const { data: t } = await db.from('bn_rate_table').select('id, table_code, table_type').eq('status', 'ACTIVE');
      const { data: d } = await db.from('bn_rate_table_dimension').select('rate_table_id, dimension_key').order('sequence_no');
      const dimByT = new Map<string, { dimension_key: string }[]>();
      for (const r of (d ?? []) as any[]) {
        if (!dimByT.has(r.rate_table_id)) dimByT.set(r.rate_table_id, []);
        dimByT.get(r.rate_table_id)!.push({ dimension_key: r.dimension_key });
      }
      setTables(((t ?? []) as any[]).map((x) => ({
        table_code: x.table_code, table_type: x.table_type, dims: dimByT.get(x.id) ?? [],
      })));
    })();
  }, []);

  const matrixTables = tables.filter((t) => ['MATRIX', 'SHARE_TABLE'].includes(t.table_type));
  const rateTables = tables.filter((t) => !['MATRIX', 'SHARE_TABLE'].includes(t.table_type));

  if (expressionType === 'SIMPLE_EXPRESSION') {
    return (
      <div className="space-y-2">
        <Label className="text-xs">Expression</Label>
        <Textarea
          value={value.expression ?? ''}
          onChange={(e) => onChange({ ...value, expression: e.target.value })}
          rows={4}
          placeholder="e.g. AVG_WEEKLY_WAGE * REPLACEMENT_RATE"
          className="font-mono text-xs"
        />
      </div>
    );
  }

  if (expressionType === 'RATE_TABLE_LOOKUP' || expressionType === 'MATRIX_LOOKUP') {
    const available = expressionType === 'MATRIX_LOOKUP' ? matrixTables : rateTables;
    return (
      <LookupStepEditor
        step={value.lookup ?? { kind: 'LOOKUP', table_code: '', inputs: {}, output_var: '' }}
        tables={available}
        variables={variables}
        onChange={(lookup) => onChange({ ...value, lookup })}
      />
    );
  }

  if (expressionType === 'MEDICAL_TARIFF_LOOKUP') {
    return (
      <MedicalStepEditor
        step={value.medical ?? { kind: 'MEDICAL_TARIFF', procedure_var: '', location_var: '', provider_var: '', amount_var: '', output_var: '' }}
        variables={variables}
        onChange={(medical) => onChange({ ...value, medical })}
      />
    );
  }

  if (expressionType === 'CONDITIONAL') {
    const branches = value.conditional?.branches ?? [{ condition: '', expression: '' }];
    const update = (next: ConditionalBranch[]) => onChange({ ...value, conditional: { branches: next } });
    return (
      <div className="space-y-2">
        {branches.map((b, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
            <div className="space-y-1">
              <Label className="text-[10px]">If (empty = else)</Label>
              <Input className="h-8 text-xs font-mono" value={b.condition} onChange={(e) => {
                const c = [...branches]; c[i] = { ...c[i], condition: e.target.value }; update(c);
              }} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Then expression</Label>
              <Input className="h-8 text-xs font-mono" value={b.expression} onChange={(e) => {
                const c = [...branches]; c[i] = { ...c[i], expression: e.target.value }; update(c);
              }} />
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 mt-5" onClick={() => update(branches.filter((_, j) => j !== i))}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => update([...branches, { condition: '', expression: '' }])}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add branch
        </Button>
      </div>
    );
  }

  if (expressionType === 'MULTI_STEP') {
    const steps = value.steps ?? [];
    const update = (next: Step[]) => onChange({ ...value, steps: next });
    return (
      <div className="space-y-3">
        {steps.map((s, i) => (
          <div key={i} className="rounded-md border p-2 space-y-2 bg-muted/20">
            <div className="flex items-center justify-between">
              <Badge variant="outline">Step {i + 1} · {s.kind}</Badge>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={i === 0} onClick={() => {
                  const c = [...steps]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; update(c);
                }}><ArrowUp className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={i === steps.length - 1} onClick={() => {
                  const c = [...steps]; [c[i + 1], c[i]] = [c[i], c[i + 1]]; update(c);
                }}><ArrowDown className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => update(steps.filter((_, j) => j !== i))}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
            {s.kind === 'LOOKUP' && (
              <LookupStepEditor step={s} tables={tables} variables={variables}
                onChange={(ns) => { const c = [...steps]; c[i] = ns; update(c); }} compact />
            )}
            {s.kind === 'MEDICAL_TARIFF' && (
              <MedicalStepEditor step={s} variables={variables}
                onChange={(ns) => { const c = [...steps]; c[i] = ns; update(c); }} compact />
            )}
            {s.kind === 'EXPRESSION' && (
              <ExpressionStepEditor step={s}
                onChange={(ns) => { const c = [...steps]; c[i] = ns; update(c); }} />
            )}
          </div>
        ))}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => update([...steps, { kind: 'EXPRESSION', expression: '', output_var: '' }])}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Expression
          </Button>
          <Button size="sm" variant="outline" onClick={() => update([...steps, { kind: 'LOOKUP', table_code: '', inputs: {}, output_var: '' }])}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Lookup
          </Button>
          <Button size="sm" variant="outline" onClick={() => update([...steps, { kind: 'MEDICAL_TARIFF', procedure_var: '', location_var: '', provider_var: '', amount_var: '', output_var: '' }])}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Medical
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

function LookupStepEditor({
  step, tables, variables, onChange, compact = false,
}: {
  step: LookupStep; tables: RateTableInfo[]; variables: string[];
  onChange: (s: LookupStep) => void; compact?: boolean;
}) {
  const dims = tables.find((t) => t.table_code === step.table_code)?.dims ?? [];
  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px]">Rate table</Label>
          <Select value={step.table_code} onValueChange={(v) => onChange({ ...step, table_code: v, inputs: {} })}>
            <SelectTrigger className="h-8"><SelectValue placeholder="pick a table" /></SelectTrigger>
            <SelectContent>{tables.map((t) => <SelectItem key={t.table_code} value={t.table_code}>{t.table_code}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px]">Output variable</Label>
          <Input className="h-8 font-mono text-xs" value={step.output_var} onChange={(e) => onChange({ ...step, output_var: e.target.value })} placeholder="e.g. pension_rate" />
        </div>
      </div>
      {dims.length > 0 && (
        <div className="space-y-1">
          <Label className="text-[10px]">Map each dimension to a variable</Label>
          <div className="grid grid-cols-2 gap-2">
            {dims.map((d) => (
              <div key={d.dimension_key} className="flex items-center gap-2">
                <span className="font-mono text-[10px] w-32 truncate">{d.dimension_key}</span>
                <VariablePicker variables={variables} value={step.inputs[d.dimension_key] ?? ''}
                  onChange={(v) => onChange({ ...step, inputs: { ...step.inputs, [d.dimension_key]: v } })} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MedicalStepEditor({
  step, variables, onChange, compact = false,
}: {
  step: MedicalStep; variables: string[];
  onChange: (s: MedicalStep) => void; compact?: boolean;
}) {
  const fields: Array<[keyof MedicalStep, string]> = [
    ['procedure_var', 'Procedure code var'],
    ['location_var', 'Location var'],
    ['provider_var', 'Provider type var'],
    ['amount_var', 'Claimed amount var'],
    ['output_var', 'Output var'],
  ];
  return (
    <div className={`grid grid-cols-2 gap-2 ${compact ? '' : 'mt-1'}`}>
      {fields.map(([k, lbl]) => (
        <div key={k}>
          <Label className="text-[10px]">{lbl}</Label>
          {k === 'output_var' ? (
            <Input className="h-8 font-mono text-xs" value={step[k] as string} onChange={(e) => onChange({ ...step, [k]: e.target.value })} />
          ) : (
            <VariablePicker variables={variables} value={step[k] as string} onChange={(v) => onChange({ ...step, [k]: v })} />
          )}
        </div>
      ))}
    </div>
  );
}

function ExpressionStepEditor({ step, onChange }: { step: ExpressionStep; onChange: (s: ExpressionStep) => void }) {
  return (
    <div className="grid grid-cols-[1fr_180px] gap-2">
      <div>
        <Label className="text-[10px]">Expression</Label>
        <Input className="h-8 font-mono text-xs" value={step.expression} onChange={(e) => onChange({ ...step, expression: e.target.value })} />
      </div>
      <div>
        <Label className="text-[10px]">Output var</Label>
        <Input className="h-8 font-mono text-xs" value={step.output_var} onChange={(e) => onChange({ ...step, output_var: e.target.value })} />
      </div>
    </div>
  );
}

function VariablePicker({ value, onChange, variables }: { value: string; onChange: (v: string) => void; variables: string[] }) {
  return (
    <div className="flex-1">
      <Input list="bn-vars" className="h-8 font-mono text-xs" value={value} onChange={(e) => onChange(e.target.value)} placeholder="variable_code" />
      <datalist id="bn-vars">{variables.map((v) => <option key={v} value={v} />)}</datalist>
    </div>
  );
}
