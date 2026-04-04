import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle, XCircle, AlertTriangle, Info, Search, X,
  ChevronDown, ChevronUp, ShieldCheck, ShieldAlert, Clock,
} from 'lucide-react';
import type { BnSimRuleTrace } from '@/types/bnSimulation';

interface Props {
  trace: BnSimRuleTrace[];
}

type SeverityFilter = 'ALL' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
type ResultFilter = 'ALL' | 'PASSED' | 'FAILED';

// ── Helpers ──────────────────────────────────────────────

const severityIcon = (severity: string | null, passed: boolean | null) => {
  if (passed === false) return <XCircle className="h-4 w-4 text-destructive" />;
  if (passed === true) return <CheckCircle className="h-4 w-4 text-emerald-600" />;
  if (severity === 'ERROR' || severity === 'FATAL') return <XCircle className="h-4 w-4 text-destructive" />;
  if (severity === 'WARN') return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <Info className="h-4 w-4 text-muted-foreground" />;
};

const severityBadgeClass: Record<string, string> = {
  INFO: 'bg-muted text-muted-foreground',
  WARN: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  ERROR: 'bg-destructive/10 text-destructive',
  FATAL: 'bg-destructive text-destructive-foreground',
};

const resultBadge = (passed: boolean | null) => {
  if (passed === true) return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">PASSED</Badge>;
  if (passed === false) return <Badge className="bg-destructive/10 text-destructive text-xs">FAILED</Badge>;
  return <Badge variant="outline" className="text-xs">N/A</Badge>;
};

// ── Stats bar ────────────────────────────────────────────

function TraceStats({ trace }: { trace: BnSimRuleTrace[] }) {
  const total = trace.length;
  const passed = trace.filter(t => t.passed === true).length;
  const failed = trace.filter(t => t.passed === false).length;
  const warns = trace.filter(t => (t.severity || '').toUpperCase() === 'WARN').length;
  const errors = trace.filter(t => ['ERROR', 'FATAL'].includes((t.severity || '').toUpperCase())).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {[
        { label: 'Total Rules', value: total, icon: <ShieldCheck className="h-4 w-4 text-primary" /> },
        { label: 'Passed', value: passed, icon: <CheckCircle className="h-4 w-4 text-emerald-600" /> },
        { label: 'Failed', value: failed, icon: <XCircle className="h-4 w-4 text-destructive" /> },
        { label: 'Warnings', value: warns, icon: <AlertTriangle className="h-4 w-4 text-amber-500" /> },
        { label: 'Errors', value: errors, icon: <ShieldAlert className="h-4 w-4 text-destructive" /> },
      ].map(s => (
        <div key={s.label} className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-2">
          {s.icon}
          <div>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-lg font-bold leading-none">{s.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Detail panel ─────────────────────────────────────────

function RuleDetailPanel({ item }: { item: BnSimRuleTrace }) {
  return (
    <div className="p-4 bg-muted/20 border-t border-border space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Identity */}
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Rule Identity</div>
          <div className="grid grid-cols-2 gap-y-1 text-sm">
            <span className="text-muted-foreground">Step #</span>
            <span className="font-mono">{item.step_number}</span>
            <span className="text-muted-foreground">Engine Layer</span>
            <Badge variant="outline" className="w-fit text-xs">{item.engine_layer}</Badge>
            <span className="text-muted-foreground">Rule Code</span>
            <span className="font-mono text-xs">{item.rule_code || '—'}</span>
            <span className="text-muted-foreground">Rule Name</span>
            <span className="font-medium">{item.rule_label || '—'}</span>
            <span className="text-muted-foreground">Severity</span>
            <Badge className={`w-fit text-xs ${severityBadgeClass[(item.severity || 'INFO').toUpperCase()] || severityBadgeClass.INFO}`}>
              {(item.severity || 'INFO').toUpperCase()}
            </Badge>
            <span className="text-muted-foreground">Result</span>
            {resultBadge(item.passed)}
            <span className="text-muted-foreground">Duration</span>
            <span className="flex items-center gap-1 text-xs"><Clock className="h-3 w-3" />{item.duration_ms ?? 0}ms</span>
          </div>
        </div>

        {/* Right: Message & Inputs */}
        <div className="space-y-3">
          {item.message && (
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Message</div>
              <p className="text-sm bg-muted/50 rounded-md p-2 border border-border">{item.message}</p>
            </div>
          )}

          {item.inputs && Object.keys(item.inputs).length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Input Summary</div>
              <div className="bg-muted/50 rounded-md p-2 border border-border space-y-1">
                {Object.entries(item.inputs).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="font-mono text-xs text-muted-foreground">{k}</span>
                    <span className="font-mono text-xs font-medium">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Output summary inferred from passed + severity */}
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Output Summary</div>
            <div className="bg-muted/50 rounded-md p-2 border border-border text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Result</span>
                <span className={item.passed === false ? 'text-destructive font-medium' : 'text-emerald-700 font-medium'}>
                  {item.passed === true ? 'Rule Satisfied' : item.passed === false ? 'Rule Failed' : 'Not Evaluated'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Override Allowed</span>
                <span className="text-xs">
                  {item.severity === 'WARN' || item.severity === 'INFO' ? (
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">Yes</Badge>
                  ) : (
                    <Badge className="bg-destructive/10 text-destructive text-xs">No</Badge>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────

export default function SimRuleTraceView({ trace }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');
  const [resultFilter, setResultFilter] = useState<ResultFilter>('ALL');

  const filtered = useMemo(() => {
    let result = [...trace];
    if (severityFilter !== 'ALL') {
      result = result.filter(t => (t.severity || 'INFO').toUpperCase() === severityFilter);
    }
    if (resultFilter === 'PASSED') result = result.filter(t => t.passed === true);
    if (resultFilter === 'FAILED') result = result.filter(t => t.passed === false);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        (t.rule_code || '').toLowerCase().includes(q) ||
        (t.rule_label || '').toLowerCase().includes(q) ||
        (t.message || '').toLowerCase().includes(q) ||
        (t.engine_layer || '').toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => a.step_number - b.step_number);
  }, [trace, severityFilter, resultFilter, search]);

  const hasFilters = severityFilter !== 'ALL' || resultFilter !== 'ALL' || search.trim() !== '';

  if (trace.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <ShieldCheck className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No rule trace data available for this simulation run.</p>
          <p className="text-xs text-muted-foreground mt-1">Run the simulation to generate eligibility and validation traces.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <TraceStats trace={trace} />

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Rule Execution Trace</CardTitle>
              <CardDescription>Step-by-step eligibility and validation rule results — read-only from simulation tables</CardDescription>
            </div>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearch(''); setSeverityFilter('ALL'); setResultFilter('ALL'); }}
                className="text-xs gap-1"
              >
                <X className="h-3 w-3" /> Clear filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search rule code, name, message..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={severityFilter} onValueChange={v => setSeverityFilter(v as SeverityFilter)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Severities</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
                <SelectItem value="WARN">Warning</SelectItem>
                <SelectItem value="ERROR">Error</SelectItem>
                <SelectItem value="FATAL">Fatal</SelectItem>
              </SelectContent>
            </Select>
            <Select value={resultFilter} onValueChange={v => setResultFilter(v as ResultFilter)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Result" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Results</SelectItem>
                <SelectItem value="PASSED">Passed</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No rules match the current filters.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Layer</TableHead>
                    <TableHead>Rule Code</TableHead>
                    <TableHead>Rule Name</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="w-16 text-right">ms</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(item => {
                    const isExpanded = expandedId === item.id;
                    const sev = (item.severity || 'INFO').toUpperCase();
                    const rowBg =
                      item.passed === false ? 'bg-destructive/5' :
                      sev === 'WARN' ? 'bg-amber-50/50 dark:bg-amber-900/10' :
                      sev === 'ERROR' || sev === 'FATAL' ? 'bg-destructive/5' : '';

                    return (
                      <React.Fragment key={item.id}>
                        <TableRow
                          className={`cursor-pointer hover:bg-muted/50 transition-colors ${rowBg}`}
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        >
                          <TableCell className="text-xs font-mono text-muted-foreground">{item.step_number}</TableCell>
                          <TableCell>{severityIcon(item.severity, item.passed)}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{item.engine_layer}</Badge></TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">{item.rule_code || '—'}</TableCell>
                          <TableCell className="text-sm font-medium max-w-[200px] truncate">{item.rule_label || '—'}</TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${severityBadgeClass[sev] || severityBadgeClass.INFO}`}>{sev}</Badge>
                          </TableCell>
                          <TableCell>{resultBadge(item.passed)}</TableCell>
                          <TableCell className="text-xs max-w-[220px] truncate text-muted-foreground">{item.message || ''}</TableCell>
                          <TableCell className="text-xs text-muted-foreground text-right">{item.duration_ms ?? '—'}</TableCell>
                          <TableCell>
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={10} className="p-0">
                              <RuleDetailPanel item={item} />
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Footer info */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
            <span>Showing {filtered.length} of {trace.length} rule{trace.length !== 1 ? 's' : ''}</span>
            <span className="flex items-center gap-1">
              <Info className="h-3 w-3" />
              Data source: bn_sim_rule_trace (read-only)
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
