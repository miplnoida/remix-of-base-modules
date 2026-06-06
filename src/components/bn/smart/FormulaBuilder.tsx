/**
 * FormulaBuilder — variable-aware formula editor with live validation and a
 * test button driven by sample values from the registry.
 */
import * as React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle, Play, Plus } from 'lucide-react';
import { FORMULA_VARIABLES } from '@/services/bn/registries/formulaVariableRegistry';
import { parseFormula, testFormula } from '@/lib/bn/formulaParser';

interface Props {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

const OPERATORS = ['+', '-', '*', '/', '(', ')', 'min(', 'max(', 'round(', ','];

export function FormulaBuilder({ value, onChange, disabled }: Props) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [overrides, setOverrides] = React.useState<Record<string, string>>({});

  const parsed = React.useMemo(() => (value.trim() ? parseFormula(value) : null), [value]);

  const varsKey = parsed?.variablesUsed.join(',') ?? '';
  React.useEffect(() => { setOverrides({}); }, [varsKey]);

  const numericInputs = React.useMemo(() => {
    const out: Record<string, number> = {};
    (parsed?.variablesUsed ?? []).forEach((k) => {
      const raw = overrides[k];
      const def = FORMULA_VARIABLES.find((v) => v.key === k);
      const n = raw !== undefined && raw !== '' ? Number(raw) : NaN;
      out[k] = Number.isFinite(n) ? n : (def?.sample ?? 0);
    });
    return out;
  }, [overrides, parsed?.variablesUsed]);

  const live = React.useMemo(() => {
    if (!value.trim()) return null;
    return testFormula(value, numericInputs);
  }, [value, numericInputs]);

  const substituted = React.useMemo(() => {
    if (!parsed?.valid) return '';
    return value
      .replace(/[a-zA-Z_][a-zA-Z0-9_]*/g, (tok) => {
        if (['min', 'max', 'round'].includes(tok)) return tok;
        const v = numericInputs[tok];
        return v !== undefined ? String(v) : tok;
      })
      .replace(/\*/g, '×')
      .replace(/\//g, '÷');
  }, [value, parsed?.valid, numericInputs]);


  const insert = (token: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      onChange(value + token);
      return;
    }
    const start = ta.selectionStart ?? value.length;
    const end = ta.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    onChange(next);
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + token.length;
    }, 0);
  };

  const resetSamples = () => setOverrides({});


  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm font-medium">Formula expression</Label>
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="e.g. avg_weekly_wage * rate_pct / 100"
          rows={3}
          className="font-mono text-sm mt-1.5"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3 space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Variables</Label>
            <div className="flex flex-wrap gap-1.5">
              {FORMULA_VARIABLES.map((v) => (
                <Button
                  key={v.key}
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={disabled}
                  onClick={() => insert(v.key)}
                  className="h-7 text-xs font-mono"
                  title={`${v.label} (sample: ${v.sample})`}
                >
                  <Plus className="h-3 w-3 mr-0.5" />
                  {v.key}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Operators</Label>
            <div className="flex flex-wrap gap-1.5">
              {OPERATORS.map((op) => (
                <Button
                  key={op}
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={disabled}
                  onClick={() => insert(op)}
                  className="h-7 px-2 text-xs font-mono"
                >
                  {op}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {parsed && (
        <div className="flex items-center gap-2 text-sm">
          {parsed.valid ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-green-700 dark:text-green-400">Formula is valid.</span>
              {parsed.variablesUsed.length > 0 && (
                <span className="text-muted-foreground">Uses:</span>
              )}
              {parsed.variablesUsed.map((v) => (
                <Badge key={v} variant="outline" className="font-mono text-[10px]">{v}</Badge>
              ))}
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-destructive">{parsed.errors.join('; ')}</span>
            </>
          )}
        </div>
      )}

      {parsed?.valid && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Sample calculator
              </Label>
              {parsed.variablesUsed.length > 0 && (
                <Button type="button" size="sm" variant="ghost" className="h-6 text-xs" onClick={resetSamples}>
                  Reset to defaults
                </Button>
              )}
            </div>

            {parsed.variablesUsed.length > 0 && (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                {parsed.variablesUsed.map((k) => {
                  const def = FORMULA_VARIABLES.find((v) => v.key === k);
                  return (
                    <div key={k} className="space-y-1">
                      <Label htmlFor={`var_${k}`} className="text-[11px] font-mono text-muted-foreground">
                        {k} <span className="text-muted-foreground/60">({def?.type})</span>
                      </Label>
                      <input
                        id={`var_${k}`}
                        type="number"
                        inputMode="decimal"
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm font-mono"
                        placeholder={String(def?.sample ?? 0)}
                        value={overrides[k] ?? ''}
                        onChange={(e) => setOverrides((o) => ({ ...o, [k]: e.target.value }))}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <div className="rounded-md bg-background border p-3 space-y-1.5">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Substituted</div>
              <div className="font-mono text-sm break-all">{substituted || value}</div>
              <div className="flex items-baseline gap-2 pt-1 border-t">
                <span className="text-xs text-muted-foreground">Result =</span>
                {live?.ok ? (
                  <span className="font-mono text-2xl font-semibold text-primary">
                    {Number.isFinite(live.value!) ? live.value!.toFixed(2) : '—'}
                  </span>
                ) : (
                  <span className="text-sm text-destructive">{live?.errors.join('; ')}</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
