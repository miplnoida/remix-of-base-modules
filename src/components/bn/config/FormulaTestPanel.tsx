/**
 * FormulaTestPanel — inline simulator inside the Formula Library dialog.
 *
 * Parses the current formula expression, lists every referenced variable,
 * seeds sample values from `bn_formula_variable_registry` (with hardcoded
 * registry fallback), lets the user edit them, then evaluates and shows the
 * numeric result. Pure client-side — no DB writes.
 */
import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Play, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { parseFormula, testFormula } from '@/lib/bn/formulaParser';
import {
  useBnFormulaVariableRegistry,
  buildSampleMap,
  buildLabelMap,
} from '@/hooks/bn/useBnFormulaVariableRegistry';
import { useVariableResolver } from '@/hooks/bn/useVariableResolver';
import { getFormulaVariable } from '@/services/bn/registries/formulaVariableRegistry';

interface Props {
  expression: string;
  outputType?: string;
}

export function FormulaTestPanel({ expression, outputType = 'NUMBER' }: Props) {
  const { data: registry = [] } = useBnFormulaVariableRegistry();
  const dbSamples = useMemo(() => buildSampleMap(registry), [registry]);
  const dbLabels = useMemo(() => buildLabelMap(registry), [registry]);

  const parsed = useMemo(() => parseFormula(expression || ''), [expression]);
  const variables = parsed.variablesUsed;

  const [overrides, setOverrides] = useState<Record<string, string>>({});
  // Reset overrides when the variable set changes
  useEffect(() => {
    setOverrides({});
  }, [variables.join('|')]);

  const seeded = useMemo(() => {
    const out: Record<string, number> = {};
    for (const v of variables) {
      if (overrides[v] !== undefined && overrides[v] !== '') {
        const n = Number(overrides[v]);
        if (!Number.isNaN(n)) { out[v] = n; continue; }
      }
      if (dbSamples[v] !== undefined) { out[v] = dbSamples[v]; continue; }
      const def = getFormulaVariable(v);
      if (def) out[v] = def.sample;
    }
    return out;
  }, [variables, overrides, dbSamples]);

  const [result, setResult] = useState<{ ok: boolean; value?: number; errors: string[] } | null>(null);
  const runTest = () => setResult(testFormula(expression || '', seeded));

  if (!expression?.trim()) return null;

  const labelFor = (v: string) =>
    dbLabels[v] ?? getFormulaVariable(v)?.label ?? v;
  const sourceFor = (v: string) =>
    registry.find(r => r.variable_code === v)?.source_type ?? null;

  const formatted = (n: number) => {
    if (!isFinite(n)) return 'n/a';
    if (outputType === 'PERCENT') return `${n.toFixed(2)} %`;
    if (outputType === 'MONEY') return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return Number.isInteger(n) ? String(n) : n.toFixed(4);
  };

  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Test Formula</div>
        <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={runTest} disabled={!parsed.valid}>
          <Play className="h-3.5 w-3.5" /> Run
        </Button>
      </div>

      {!parsed.valid ? (
        <div className="flex items-start gap-2 text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <div>{parsed.errors.join('; ')}</div>
        </div>
      ) : variables.length === 0 ? (
        <div className="text-xs text-muted-foreground">Formula has no variables — uses constants only.</div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {variables.map((v) => (
            <div key={v} className="space-y-1">
              <Label htmlFor={`tf-${v}`} className="text-xs flex items-center gap-1.5">
                <span className="font-mono">{v}</span>
                {sourceFor(v) && <Badge variant="outline" className="text-[9px] py-0 px-1">{sourceFor(v)}</Badge>}
              </Label>
              <Input
                id={`tf-${v}`}
                type="number"
                step="any"
                placeholder={String(dbSamples[v] ?? getFormulaVariable(v)?.sample ?? 0)}
                value={overrides[v] ?? ''}
                onChange={(e) => setOverrides({ ...overrides, [v]: e.target.value })}
                className="h-8 text-xs"
              />
              <div className="text-[10px] text-muted-foreground truncate">{labelFor(v)}</div>
            </div>
          ))}
        </div>
      )}

      {result && (
        <div className={`flex items-center gap-2 text-sm rounded-md border p-2 ${result.ok ? 'bg-background' : 'bg-destructive/10 border-destructive/40'}`}>
          {result.ok ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Result:</span>
              <span className="font-mono font-semibold">{formatted(result.value ?? NaN)}</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-destructive text-xs">{result.errors.join('; ')}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
