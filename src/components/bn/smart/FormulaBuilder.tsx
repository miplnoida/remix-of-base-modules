/**
 * FormulaBuilder — variable-aware formula editor.
 *
 * All identifiers are validated against the unified Variable Resolver:
 * Fact Registry, Derived Fact Registry, Product Parameter Registry, or a
 * Prior Formula Result. Unknown identifiers are surfaced with quick-create
 * links to the relevant registry editor.
 */
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { CheckCircle2, XCircle, Plus, AlertTriangle, ExternalLink, Search } from 'lucide-react';
import { parseFormula, testFormula } from '@/lib/bn/formulaParser';
import { useVariableResolver } from '@/hooks/bn/useVariableResolver';
import { classifyVariables, type ResolvedVariable, type VariableSource } from '@/services/bn/variableResolverService';

interface Props {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

const OPERATORS = ['+', '-', '*', '/', '(', ')', 'min(', 'max(', 'round(', ','];

const SOURCE_LABEL: Record<VariableSource, string> = {
  FACT: 'Fact',
  DERIVED_FACT: 'Derived',
  PRODUCT_PARAMETER: 'Param',
  PRIOR_RESULT: 'Prior',
};
const SOURCE_BADGE: Record<VariableSource, string> = {
  FACT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  DERIVED_FACT: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
  PRODUCT_PARAMETER: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  PRIOR_RESULT: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
};

const QUICK_CREATE_ROUTE: Record<VariableSource, string> = {
  DERIVED_FACT: '/bn/config/derived-facts',
  PRODUCT_PARAMETER: '/bn/config/product-parameters',
  FACT: '/bn/config/rules',
  PRIOR_RESULT: '/bn/config/formulas',
};

export function FormulaBuilder({ value, onChange, disabled }: Props) {
  const navigate = useNavigate();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [overrides, setOverrides] = React.useState<Record<string, string>>({});
  const [varSearch, setVarSearch] = React.useState('');
  const { data: resolver } = useVariableResolver();

  const parsed = React.useMemo(() => (value.trim() ? parseFormula(value, resolver ?? null) : null), [value, resolver]);

  const varsKey = parsed?.variablesUsed.join(',') ?? '';
  React.useEffect(() => { setOverrides({}); }, [varsKey]);

  const allVariables = React.useMemo<ResolvedVariable[]>(() => {
    if (!resolver) return [];
    return Array.from(resolver.values())
      .sort((a, b) => a.source.localeCompare(b.source) || a.code.localeCompare(b.code));
  }, [resolver]);

  const grouped = React.useMemo(() => {
    const groups: Record<VariableSource, ResolvedVariable[]> = {
      FACT: [], DERIVED_FACT: [], PRODUCT_PARAMETER: [], PRIOR_RESULT: [],
    };
    for (const v of allVariables) {
      if (varSearch && !v.code.toLowerCase().includes(varSearch.toLowerCase()) && !v.displayName.toLowerCase().includes(varSearch.toLowerCase())) continue;
      groups[v.source].push(v);
    }
    return groups;
  }, [allVariables, varSearch]);

  const classified = React.useMemo(() => {
    if (!parsed || !resolver) return null;
    return classifyVariables(parsed.variablesUsed, resolver);
  }, [parsed, resolver]);

  const numericInputs = React.useMemo(() => {
    const out: Record<string, number> = {};
    for (const r of classified?.resolved ?? []) {
      const raw = overrides[r.code];
      const n = raw !== undefined && raw !== '' ? Number(raw) : NaN;
      out[r.code] = Number.isFinite(n) ? n : (typeof r.sampleValue === 'number' ? r.sampleValue : 0);
    }
    return out;
  }, [overrides, classified]);

  const live = React.useMemo(() => {
    if (!value.trim()) return null;
    return testFormula(value, numericInputs, resolver ?? null);
  }, [value, numericInputs, resolver]);

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
    if (!ta) { onChange(value + token); return; }
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
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Variables</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" size="sm" variant="ghost" className="h-7 text-xs">Browse all…</Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 max-h-[60vh] overflow-y-auto p-0" align="end">
                  <div className="p-2 border-b sticky top-0 bg-background">
                    <div className="relative">
                      <Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
                      <Input
                        autoFocus
                        placeholder="Search variables…"
                        value={varSearch}
                        onChange={(e) => setVarSearch(e.target.value)}
                        className="pl-7 h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="p-2 space-y-3">
                    {(['FACT', 'DERIVED_FACT', 'PRODUCT_PARAMETER', 'PRIOR_RESULT'] as VariableSource[]).map((src) => (
                      grouped[src].length > 0 && (
                        <div key={src}>
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 px-1">
                            {SOURCE_LABEL[src]} ({grouped[src].length})
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {grouped[src].map((v) => (
                              <Button
                                key={`${src}_${v.code}`}
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => insert(v.code)}
                                disabled={disabled}
                                className="h-7 text-xs font-mono"
                                title={`${v.displayName}${typeof v.sampleValue === 'number' ? ` (sample: ${v.sampleValue})` : ''}`}
                              >
                                <span className={`mr-1 inline-flex items-center rounded px-1 py-0.5 text-[9px] font-medium ${SOURCE_BADGE[src]}`}>
                                  {SOURCE_LABEL[src]}
                                </span>
                                {v.code}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )
                    ))}
                    {Object.values(grouped).every(g => g.length === 0) && (
                      <div className="text-xs text-muted-foreground p-3 text-center">No variables match.</div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allVariables.slice(0, 18).map((v) => (
                <Button
                  key={`${v.source}_${v.code}`}
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={disabled}
                  onClick={() => insert(v.code)}
                  className="h-7 text-xs font-mono"
                  title={`${SOURCE_LABEL[v.source]} — ${v.displayName}`}
                >
                  <Plus className="h-3 w-3 mr-0.5" />
                  {v.code}
                </Button>
              ))}
              {allVariables.length > 18 && (
                <span className="text-[10px] text-muted-foreground self-center">+{allVariables.length - 18} more — use Browse</span>
              )}
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
        <Card className={parsed.valid ? 'border-green-300 bg-green-50/40 dark:bg-green-950/20' : 'border-destructive/40 bg-destructive/5'}>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              {parsed.valid ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-700 dark:text-green-400">All variables resolved.</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="font-medium text-destructive">
                    {parsed.unresolved.length > 0
                      ? `${parsed.unresolved.length} unresolved variable${parsed.unresolved.length === 1 ? '' : 's'} — save blocked.`
                      : parsed.errors[0]}
                  </span>
                </>
              )}
            </div>

            {classified && classified.resolved.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {classified.resolved.map((r) => (
                  <span
                    key={r.code}
                    className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-mono"
                    title={`${r.displayName}${r.unit ? ` (${r.unit})` : ''}`}
                  >
                    <span className={`inline-flex items-center rounded px-1 py-0.5 text-[9px] font-medium ${SOURCE_BADGE[r.source]}`}>
                      {SOURCE_LABEL[r.source]}
                    </span>
                    {r.code}
                  </span>
                ))}
              </div>
            )}

            {parsed.unresolved.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t">
                {parsed.unresolved.map((u) => (
                  <div key={u.variable} className="flex flex-wrap items-center gap-2 text-xs">
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    <span className="font-mono font-medium text-destructive">{u.variable}</span>
                    <span className="text-muted-foreground">— no registered source.</span>
                    {u.suggestedSources.map((s) => (
                      <Button
                        key={s}
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-6 text-[11px] gap-1"
                        onClick={() => navigate(`${QUICK_CREATE_ROUTE[s]}?newCode=${encodeURIComponent(u.variable)}`)}
                      >
                        <ExternalLink className="h-3 w-3" />
                        Create as {SOURCE_LABEL[s]}
                      </Button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {parsed?.valid && classified && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Sample calculator
              </Label>
              {classified.resolved.length > 0 && (
                <Button type="button" size="sm" variant="ghost" className="h-6 text-xs" onClick={resetSamples}>
                  Reset to defaults
                </Button>
              )}
            </div>

            {classified.resolved.length > 0 && (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                {classified.resolved.map((r) => (
                  <div key={r.code} className="space-y-1">
                    <Label htmlFor={`var_${r.code}`} className="text-[11px] font-mono text-muted-foreground">
                      {r.code} <span className="text-muted-foreground/60">({r.dataType || '—'})</span>
                    </Label>
                    <input
                      id={`var_${r.code}`}
                      type="number"
                      inputMode="decimal"
                      className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm font-mono"
                      placeholder={String(r.sampleValue ?? 0)}
                      value={overrides[r.code] ?? ''}
                      onChange={(e) => setOverrides((o) => ({ ...o, [r.code]: e.target.value }))}
                    />
                  </div>
                ))}
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
