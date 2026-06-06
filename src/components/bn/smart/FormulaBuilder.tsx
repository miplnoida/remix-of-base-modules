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

      <div className="flex items-center gap-2">
        <Button type="button" size="sm" onClick={runTest} disabled={disabled || !parsed?.valid}>
          <Play className="h-3.5 w-3.5 mr-1" /> Test formula
        </Button>
        {testResult && (
          testResult.ok ? (
            <span className="text-sm text-green-700 dark:text-green-400">
              = <span className="font-mono font-semibold">{testResult.value?.toFixed(2)}</span> (using registry sample values)
            </span>
          ) : (
            <span className="text-sm text-destructive">{testResult.errors.join('; ')}</span>
          )
        )}
      </div>
    </div>
  );
}
