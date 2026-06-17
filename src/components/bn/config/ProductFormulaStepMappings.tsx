/**
 * ProductFormulaStepMappings — per-step variable/scope mappings used by the
 * Product Catalog → Calculation tab. Reads the bound formula version's
 * `steps_json` and renders the right editor for each step kind:
 *
 *   LOOKUP          → one row per rate-table dimension (source_type + source_key)
 *   MEDICAL_TARIFF  → policy scope picker + procedure/location/provider/amount source rows
 *   EXPRESSION      → one row per variable referenced in the expression
 *
 * Persisted into `bn_product_formula_binding.step_mapping_json`.
 */
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import type { StepsJson } from '@/components/bn/config/FormulaStepsBuilder';

const db = supabase as any;

const SOURCE_TYPES = [
  'FACT', 'DERIVED_FACT', 'PRODUCT_PARAMETER', 'PRIOR_FORMULA_RESULT',
  'CLAIM_FIELD', 'MANUAL_INPUT', 'CONSTANT',
] as const;

export interface StepMapping {
  kind: 'LOOKUP' | 'MEDICAL_TARIFF' | 'EXPRESSION';
  output_var?: string | null;
  /** policy scope code for MEDICAL_TARIFF steps (defaults to bn_medical_reimbursement_limit). */
  policy_scope?: string | null;
  inputs: Record<string, { source_type: string; source_key: string | null; default_value?: string | null }>;
}

export interface StepMappingJson {
  /** Keyed by step output_var (preferred) or `step_<idx>` fallback. */
  steps: Record<string, StepMapping>;
}

interface Props {
  formulaVersionId: string | null;
  value: StepMappingJson | null;
  onChange: (next: StepMappingJson) => void;
  disabled?: boolean;
}

interface RateTableDim { dimension_key: string }
interface RateTableLite { table_code: string; dims: RateTableDim[] }

const EXPR_VAR_RE = /[a-zA-Z_][a-zA-Z0-9_]*/g;
const RESERVED = new Set(['min', 'max', 'round', 'floor', 'ceil', 'abs', 'if', 'then', 'else', 'and', 'or', 'not', 'true', 'false']);

function extractExprVars(expr: string): string[] {
  const out = new Set<string>();
  for (const m of expr.matchAll(EXPR_VAR_RE)) {
    const v = m[0];
    if (!RESERVED.has(v) && !/^\d/.test(v)) out.add(v);
  }
  return [...out];
}

export function ProductFormulaStepMappings({ formulaVersionId, value, onChange, disabled }: Props) {
  const [loading, setLoading] = useState(false);
  const [stepsJson, setStepsJson] = useState<StepsJson | null>(null);
  const [expressionType, setExpressionType] = useState<string>('SIMPLE_EXPRESSION');
  const [rateTables, setRateTables] = useState<Record<string, RateTableLite>>({});

  useEffect(() => {
    if (!formulaVersionId) { setStepsJson(null); return; }
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const { data } = await db.from('bn_formula_version')
          .select('expression_type, expression, steps_json')
          .eq('id', formulaVersionId).single();
        if (!alive) return;
        const sj: StepsJson = (data?.steps_json ?? {}) as StepsJson;
        if (!Object.keys(sj).length && data?.expression) sj.expression = data.expression;
        setExpressionType(data?.expression_type ?? 'SIMPLE_EXPRESSION');
        setStepsJson(sj);

        // Pull rate tables referenced by any LOOKUP step.
        const lookupCodes = new Set<string>();
        if (sj.lookup?.table_code) lookupCodes.add(sj.lookup.table_code);
        for (const s of sj.steps ?? []) if ((s as any).kind === 'LOOKUP') lookupCodes.add((s as any).table_code);
        if (lookupCodes.size) {
          const { data: tbls } = await db.from('bn_rate_table')
            .select('id, table_code, bn_rate_table_dimension(dimension_key)')
            .in('table_code', [...lookupCodes]);
          const map: Record<string, RateTableLite> = {};
          for (const t of tbls ?? []) {
            map[t.table_code] = { table_code: t.table_code, dims: t.bn_rate_table_dimension ?? [] };
          }
          if (!alive) return;
          setRateTables(map);
        }
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [formulaVersionId]);

  const declaredSteps = useMemo(() => buildDeclaredSteps(expressionType, stepsJson), [expressionType, stepsJson]);

  // Merge declared steps into value so the UI always shows a row per expected input.
  useEffect(() => {
    if (!declaredSteps.length) return;
    const merged: StepMappingJson = { steps: { ...(value?.steps ?? {}) } };
    let changed = false;
    for (const ds of declaredSteps) {
      const key = ds.key;
      const cur = merged.steps[key] ?? { kind: ds.kind, inputs: {}, output_var: ds.output_var, policy_scope: ds.kind === 'MEDICAL_TARIFF' ? 'bn_medical_reimbursement_limit' : null };
      if (cur.kind !== ds.kind) { cur.kind = ds.kind; changed = true; }
      for (const input of ds.inputs) {
        if (!cur.inputs[input]) { cur.inputs[input] = { source_type: 'FACT', source_key: input }; changed = true; }
      }
      merged.steps[key] = cur;
    }
    if (changed || !value) onChange(merged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [declaredSteps.length]);

  if (!formulaVersionId) {
    return <p className="text-xs text-muted-foreground">Pick a formula version first.</p>;
  }
  if (loading) {
    return <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading formula steps…</div>;
  }
  if (!declaredSteps.length) {
    return <p className="text-xs text-muted-foreground">This formula has no step inputs to map.</p>;
  }

  const updateStep = (key: string, patch: Partial<StepMapping>) => {
    const merged: StepMappingJson = { steps: { ...(value?.steps ?? {}) } };
    merged.steps[key] = { ...(merged.steps[key] ?? { kind: 'EXPRESSION', inputs: {} }), ...patch } as StepMapping;
    onChange(merged);
  };
  const updateInput = (key: string, inputName: string, patch: Partial<{ source_type: string; source_key: string | null; default_value: string | null }>) => {
    const merged: StepMappingJson = { steps: { ...(value?.steps ?? {}) } };
    const step = { ...(merged.steps[key] ?? { kind: 'EXPRESSION', inputs: {} }) } as StepMapping;
    step.inputs = { ...step.inputs, [inputName]: { ...(step.inputs[inputName] ?? { source_type: 'FACT', source_key: inputName }), ...patch } };
    merged.steps[key] = step;
    onChange(merged);
  };

  return (
    <div className="space-y-3">
      {declaredSteps.map((ds) => {
        const cur = value?.steps?.[ds.key];
        const tbl = ds.kind === 'LOOKUP' ? rateTables[ds.tableCode ?? ''] : null;
        return (
          <Card key={ds.key} className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Badge variant="outline">{ds.kind}</Badge>
                <span className="font-mono text-xs">{ds.label}</span>
                {ds.output_var && <span className="text-xs text-muted-foreground">→ {ds.output_var}</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ds.kind === 'LOOKUP' && tbl && (
                <div className="text-xs text-muted-foreground">
                  Rate table <span className="font-mono">{tbl.table_code}</span> — dimensions auto-resolved.
                </div>
              )}
              {ds.kind === 'MEDICAL_TARIFF' && (
                <div>
                  <Label className="text-xs">Policy scope</Label>
                  <Input value={cur?.policy_scope ?? 'bn_medical_reimbursement_limit'} disabled className="font-mono text-xs" />
                </div>
              )}

              <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground">
                <div className="col-span-4">Input</div>
                <div className="col-span-4">Source type</div>
                <div className="col-span-4">Source key / default</div>
              </div>
              {ds.inputs.map((inp) => {
                const m = cur?.inputs?.[inp] ?? { source_type: 'FACT', source_key: inp };
                return (
                  <div key={inp} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4 font-mono text-xs">{inp}</div>
                    <div className="col-span-4">
                      <Select value={m.source_type} onValueChange={(v) => updateInput(ds.key, inp, { source_type: v })} disabled={disabled}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{SOURCE_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4">
                      {m.source_type === 'CONSTANT' ? (
                        <Input className="h-8" value={m.default_value ?? ''} onChange={(e) => updateInput(ds.key, inp, { default_value: e.target.value })} placeholder="constant value" disabled={disabled} />
                      ) : (
                        <Input className="h-8 font-mono text-xs" value={m.source_key ?? ''} onChange={(e) => updateInput(ds.key, inp, { source_key: e.target.value })} placeholder="key" disabled={disabled} />
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

interface DeclaredStep {
  key: string;
  kind: 'LOOKUP' | 'MEDICAL_TARIFF' | 'EXPRESSION';
  label: string;
  inputs: string[];
  output_var?: string | null;
  tableCode?: string;
}

function buildDeclaredSteps(expressionType: string, sj: StepsJson | null): DeclaredStep[] {
  if (!sj) return [];
  const out: DeclaredStep[] = [];

  if (expressionType === 'SIMPLE_EXPRESSION' && sj.expression) {
    out.push({ key: 'expression', kind: 'EXPRESSION', label: 'Expression', inputs: extractExprVars(sj.expression), output_var: 'result' });
  }
  if ((expressionType === 'RATE_TABLE_LOOKUP' || expressionType === 'MATRIX_LOOKUP') && sj.lookup) {
    const dims = Object.keys(sj.lookup.inputs ?? {});
    out.push({
      key: sj.lookup.output_var || 'lookup',
      kind: 'LOOKUP',
      label: `Lookup → ${sj.lookup.table_code}`,
      inputs: dims,
      output_var: sj.lookup.output_var,
      tableCode: sj.lookup.table_code,
    });
  }
  if (expressionType === 'MEDICAL_TARIFF_LOOKUP' && sj.medical) {
    out.push({
      key: sj.medical.output_var || 'medical',
      kind: 'MEDICAL_TARIFF',
      label: 'Medical tariff',
      inputs: ['procedure', 'location', 'provider', 'amount'],
      output_var: sj.medical.output_var,
    });
  }
  if (expressionType === 'MULTI_STEP' && sj.steps?.length) {
    sj.steps.forEach((s, idx) => {
      if ((s as any).kind === 'LOOKUP') {
        const ls = s as any;
        out.push({
          key: ls.output_var || `step_${idx}`,
          kind: 'LOOKUP',
          label: `Step ${idx + 1}: Lookup → ${ls.table_code}`,
          inputs: Object.keys(ls.inputs ?? {}),
          output_var: ls.output_var,
          tableCode: ls.table_code,
        });
      } else if ((s as any).kind === 'MEDICAL_TARIFF') {
        const ms = s as any;
        out.push({
          key: ms.output_var || `step_${idx}`,
          kind: 'MEDICAL_TARIFF',
          label: `Step ${idx + 1}: Medical tariff`,
          inputs: ['procedure', 'location', 'provider', 'amount'],
          output_var: ms.output_var,
        });
      } else if ((s as any).kind === 'EXPRESSION') {
        const es = s as any;
        out.push({
          key: es.output_var || `step_${idx}`,
          kind: 'EXPRESSION',
          label: `Step ${idx + 1}: Expression`,
          inputs: extractExprVars(es.expression ?? ''),
          output_var: es.output_var,
        });
      }
    });
  }
  if (expressionType === 'CONDITIONAL' && sj.conditional?.branches?.length) {
    sj.conditional.branches.forEach((br, idx) => {
      const vars = new Set<string>();
      extractExprVars(br.condition ?? '').forEach((v) => vars.add(v));
      extractExprVars(br.expression ?? '').forEach((v) => vars.add(v));
      out.push({
        key: `branch_${idx}`,
        kind: 'EXPRESSION',
        label: br.condition ? `If ${br.condition}` : 'Else',
        inputs: [...vars],
      });
    });
  }

  return out;
}
