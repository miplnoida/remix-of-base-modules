import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Calculator, Search, X, ChevronDown, ChevronUp, Clock, Info,
  ArrowRight, TrendingUp, Hash,
} from 'lucide-react';
import type { BnSimFormulaTrace } from '@/types/bnSimulation';

import { formatNumber } from '@/lib/culture/culture';
interface Props {
  trace: BnSimFormulaTrace[];
}

type LayerFilter = 'ALL' | string;

// ── Helpers ──────────────────────────────────────────────

const layerColors: Record<string, string> = {
  FORMULA: 'bg-primary/10 text-primary',
  WAGE_AGGREGATION: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  CONTRIBUTION_WINDOW: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  BENEFICIARY_ALLOCATION: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  PAYMENT_SCHEDULE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
};

function formatValue(v: number | null | undefined): string {
  if (v == null) return '—';
  return formatNumber(v, 2);
}

// ── Stats ────────────────────────────────────────────────

function FormulaStats({ trace }: { trace: BnSimFormulaTrace[] }) {
  const layers = [...new Set(trace.map(t => t.engine_layer))];
  const totalDuration = trace.reduce((s, t) => s + (t.duration_ms || 0), 0);
  const outputValues = trace.filter(t => t.output_value != null);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-2">
        <Calculator className="h-4 w-4 text-primary" />
        <div>
          <p className="text-xs text-muted-foreground">Total Steps</p>
          <p className="text-lg font-bold leading-none">{trace.length}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-2">
        <Hash className="h-4 w-4 text-primary" />
        <div>
          <p className="text-xs text-muted-foreground">Layers</p>
          <p className="text-lg font-bold leading-none">{layers.length}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-2">
        <TrendingUp className="h-4 w-4 text-emerald-600" />
        <div>
          <p className="text-xs text-muted-foreground">Computed Values</p>
          <p className="text-lg font-bold leading-none">{outputValues.length}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-xs text-muted-foreground">Total Duration</p>
          <p className="text-lg font-bold leading-none">{totalDuration}ms</p>
        </div>
      </div>
    </div>
  );
}

// ── Detail panel ─────────────────────────────────────────

function FormulaDetailPanel({ step }: { step: BnSimFormulaTrace }) {
  // Detect rounding, cap, min, max from inputs or output_text
  const hints = useMemo(() => {
    const items: { label: string; value: string; type: 'info' | 'cap' | 'round' }[] = [];
    const inputs = step.inputs || {};

    if (inputs.rounding_rule) items.push({ label: 'Rounding Rule', value: String(inputs.rounding_rule), type: 'round' });
    if (inputs.min_value != null) items.push({ label: 'Minimum', value: formatValue(Number(inputs.min_value)), type: 'cap' });
    if (inputs.max_value != null) items.push({ label: 'Maximum', value: formatValue(Number(inputs.max_value)), type: 'cap' });
    if (inputs.cap != null) items.push({ label: 'Cap', value: formatValue(Number(inputs.cap)), type: 'cap' });
    if (inputs.floor != null) items.push({ label: 'Floor', value: formatValue(Number(inputs.floor)), type: 'cap' });

    // Check output_text for hints
    const txt = (step.output_text || '').toLowerCase();
    if (txt.includes('capped')) items.push({ label: 'Status', value: 'Value was capped', type: 'cap' });
    if (txt.includes('rounded')) items.push({ label: 'Status', value: 'Value was rounded', type: 'round' });
    if (txt.includes('minimum applied')) items.push({ label: 'Status', value: 'Minimum applied', type: 'cap' });

    return items;
  }, [step]);

  // Separate rounding/cap inputs from regular inputs
  const regularInputs = useMemo(() => {
    const reserved = ['rounding_rule', 'min_value', 'max_value', 'cap', 'floor'];
    const inputs = step.inputs || {};
    return Object.entries(inputs).filter(([k]) => !reserved.includes(k));
  }, [step]);

  return (
    <div className="p-4 bg-muted/20 border border-border rounded-b-lg space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Step info */}
        <div className="space-y-3">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Step Identity</div>
            <div className="grid grid-cols-2 gap-y-1 text-sm">
              <span className="text-muted-foreground">Step #</span>
              <span className="font-mono">{step.step_number}</span>
              <span className="text-muted-foreground">Code</span>
              <span className="font-mono text-xs">{step.step_code}</span>
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{step.step_label}</span>
              <span className="text-muted-foreground">Layer</span>
              <Badge className={`w-fit text-xs ${layerColors[step.engine_layer] || 'bg-muted text-muted-foreground'}`}>{step.engine_layer}</Badge>
              <span className="text-muted-foreground">Duration</span>
              <span className="flex items-center gap-1 text-xs"><Clock className="h-3 w-3" />{step.duration_ms ?? 0}ms</span>
            </div>
          </div>

          {/* Formula expression */}
          {step.formula_expression && (
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Formula Expression</div>
              <div className="bg-muted rounded-md p-3 border border-border">
                <code className="text-sm font-mono break-all">{step.formula_expression}</code>
              </div>
            </div>
          )}
        </div>

        {/* Right: Values */}
        <div className="space-y-3">
          {/* Input values */}
          {regularInputs.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Input Values</div>
              <div className="bg-muted/50 rounded-md p-2 border border-border space-y-1">
                {regularInputs.map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="font-mono text-xs text-muted-foreground">{k}</span>
                    <span className="font-mono text-xs font-medium">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Output */}
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Output</div>
            <div className="bg-muted/50 rounded-md p-3 border border-border">
              {step.output_value != null && (
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Numeric Value</span>
                  <span className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-400">
                    ${formatValue(step.output_value)}
                  </span>
                </div>
              )}
              {step.output_text && (
                <div className="flex items-start justify-between">
                  <span className="text-sm text-muted-foreground">Text</span>
                  <span className="text-sm text-right max-w-[200px]">{step.output_text}</span>
                </div>
              )}
              {step.output_value == null && !step.output_text && (
                <span className="text-sm text-muted-foreground">No output recorded</span>
              )}
            </div>
          </div>

          {/* Rounding / Cap / Min / Max */}
          {hints.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Rounding / Cap / Min / Max</div>
              <div className="bg-muted/50 rounded-md p-2 border border-border space-y-1">
                {hints.map((h, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{h.label}</span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        h.type === 'cap' ? 'border-amber-300 text-amber-700 dark:text-amber-400' :
                        h.type === 'round' ? 'border-blue-300 text-blue-700 dark:text-blue-400' :
                        ''
                      }`}
                    >
                      {h.value}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────

export default function SimFormulaTraceView({ trace }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [layerFilter, setLayerFilter] = useState<LayerFilter>('ALL');

  const layers = useMemo(() => [...new Set(trace.map(t => t.engine_layer))], [trace]);

  const filtered = useMemo(() => {
    let result = [...trace];
    if (layerFilter !== 'ALL') {
      result = result.filter(t => t.engine_layer === layerFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.step_code.toLowerCase().includes(q) ||
        t.step_label.toLowerCase().includes(q) ||
        (t.formula_expression || '').toLowerCase().includes(q) ||
        (t.output_text || '').toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => a.step_number - b.step_number);
  }, [trace, layerFilter, search]);

  const hasFilters = layerFilter !== 'ALL' || search.trim() !== '';

  if (trace.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Calculator className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No formula trace data available for this simulation run.</p>
          <p className="text-xs text-muted-foreground mt-1">Run the simulation to generate calculation formula traces.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <FormulaStats trace={trace} />

      {/* Main card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Formula Execution Trace</CardTitle>
              <CardDescription>Step-by-step formula computation details — read-only from simulation tables</CardDescription>
            </div>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearch(''); setLayerFilter('ALL'); }}
                className="text-xs gap-1"
              >
                <X className="h-3 w-3" /> Clear filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search step code, name, formula..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={layerFilter} onValueChange={v => setLayerFilter(v as LayerFilter)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Layer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Layers</SelectItem>
                {layers.map(l => (
                  <SelectItem key={l} value={l}>{l.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Step cards */}
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No steps match the current filters.</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((step, idx) => {
                const isExpanded = expandedId === step.id;
                return (
                  <div key={step.id} className="rounded-lg border border-border overflow-hidden">
                    {/* Summary row */}
                    <div
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : step.id)}
                    >
                      {/* Step number */}
                      <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded shrink-0 w-8 text-center">
                        {step.step_number}
                      </span>

                      {/* Arrow connector */}
                      {idx > 0 && (
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0 -ml-1 hidden sm:block" />
                      )}

                      {/* Layer */}
                      <Badge className={`text-xs shrink-0 ${layerColors[step.engine_layer] || 'bg-muted text-muted-foreground'}`}>
                        {step.engine_layer.replace(/_/g, ' ')}
                      </Badge>

                      {/* Step name */}
                      <span className="text-sm font-medium truncate flex-1">{step.step_label}</span>

                      {/* Expression preview */}
                      {step.formula_expression && (
                        <span className="text-xs font-mono text-muted-foreground max-w-[200px] truncate hidden md:block">
                          {step.formula_expression}
                        </span>
                      )}

                      {/* Output */}
                      {step.output_value != null && (
                        <span className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                          ${formatValue(step.output_value)}
                        </span>
                      )}

                      {/* Duration */}
                      {step.duration_ms != null && (
                        <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">{step.duration_ms}ms</span>
                      )}

                      {/* Expand icon */}
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                    </div>

                    {/* Detail panel */}
                    {isExpanded && <FormulaDetailPanel step={step} />}
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
            <span>Showing {filtered.length} of {trace.length} step{trace.length !== 1 ? 's' : ''}</span>
            <span className="flex items-center gap-1">
              <Info className="h-3 w-3" />
              Data source: bn_sim_formula_trace (read-only)
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
