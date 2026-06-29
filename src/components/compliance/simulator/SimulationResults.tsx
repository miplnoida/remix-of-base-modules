import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CheckCircle, XCircle, Zap, Calculator, TrendingUp, ChevronRight, ChevronDown, Info, ArrowRight, DollarSign, AlertTriangle } from 'lucide-react';
import type { SimulationOutput, DetectionResult, CalculationResult, EscalationResult } from '@/services/complianceSimulatorEngine';

interface Props {
  output: SimulationOutput | null;
}

function DetectionDetailRow({ d, showPeriod }: { d: DetectionResult; showPeriod: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableRow
        className={`cursor-pointer ${d.matched ? 'bg-destructive/5' : d.outcome === 'SKIPPED' ? 'bg-muted/40' : 'hover:bg-muted/30'}`}
        onClick={() => setOpen(!open)}
      >
        <TableCell className="text-xs">
          {open ? <ChevronDown className="h-3 w-3 inline mr-1" /> : <ChevronRight className="h-3 w-3 inline mr-1" />}
          <span className="font-mono">{d.ruleCode}</span>
        </TableCell>
        {showPeriod && (
          <TableCell className="text-xs font-mono text-muted-foreground">{d.period || '—'}</TableCell>
        )}
        <TableCell className="text-xs font-medium">{d.ruleName}</TableCell>
        <TableCell>
          {d.matched
            ? <CheckCircle className="h-4 w-4 text-destructive" />
            : d.outcome === 'SKIPPED'
              ? <span title={`Skipped — ${d.skippedSource ?? 'data unavailable'}`}><AlertTriangle className="h-4 w-4 text-amber-500" /></span>
              : <XCircle className="h-4 w-4 text-muted-foreground/40" />}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{d.reason}</TableCell>
        <TableCell className="text-xs text-right font-mono">
          {d.matched && d.linkedCalculationTotal && d.linkedCalculationTotal > 0
            ? <span className="text-destructive font-semibold">EC${d.linkedCalculationTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            : <span className="text-muted-foreground/40">—</span>}
        </TableCell>
        <TableCell>
          {d.linkedViolationTypeCode && (
            <Badge variant={d.matched ? 'destructive' : 'outline'} className="text-[10px]">{d.linkedViolationTypeCode}</Badge>
          )}
        </TableCell>
        <TableCell>
          {d.matched
            ? <Badge variant={d.initialStatus === 'OPEN' ? 'default' : 'secondary'} className="text-[10px]">{d.initialStatus}</Badge>
            : d.outcome === 'SKIPPED'
              ? <Badge variant="outline" className="text-[10px]">Skipped</Badge>
              : null}
        </TableCell>
      </TableRow>
      {open && (
        <TableRow className="bg-muted/20">
          <TableCell colSpan={showPeriod ? 8 : 7} className="p-0">
            <div className="px-6 py-3 space-y-2 border-l-2 border-primary/30 ml-4">
              <p className="text-xs font-semibold text-primary">How this was evaluated:</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <DetailItem label="Trigger Event" value={d.ruleCode} />
                <DetailItem label="Priority" value={d.priority || 'Medium'} />
                <DetailItem label="Auto-Create Violation" value={d.autoCreate ? 'Yes — will create OPEN violation' : 'No — creates UNDER_REVIEW for officer'} />
                <DetailItem label="Linked Violation Type" value={d.linkedViolationTypeName || 'None'} />
              </div>
              {Object.keys(d.parameterValues).length > 0 && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground mt-2">Parameters Used:</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                    {Object.entries(d.parameterValues).map(([k, v]) => (
                      <DetailItem key={k} label={k.replace(/_/g, ' ')} value={formatParamValue(v)} />
                    ))}
                  </div>
                </>
              )}
              {d.evidence && d.evidence.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground mt-2">Evidence:</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                    {d.evidence.map((ev, i) => (
                      <DetailItem key={`ev-${i}`} label={ev.label} value={ev.value} />
                    ))}
                  </div>
                </>
              )}
              <div className="mt-2 rounded bg-muted/40 p-2">
                <p className="text-xs">
                  <span className="font-semibold">{d.matched ? '🔴 MATCHED' : '✅ NOT MATCHED'}:</span>{' '}
                  {d.reason}
                </p>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function CalculationDetailRow({ c }: { c: CalculationResult }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableRow
        className={`cursor-pointer ${c.applies && c.simulatedAmount > 0 ? 'bg-amber-50/50 dark:bg-amber-950/10' : 'hover:bg-muted/30'}`}
        onClick={() => setOpen(!open)}
      >
        <TableCell className="text-xs">
          {open ? <ChevronDown className="h-3 w-3 inline mr-1" /> : <ChevronRight className="h-3 w-3 inline mr-1" />}
          <span className="font-mono">{c.ruleCode}</span>
        </TableCell>
        <TableCell className="text-xs font-medium">{c.ruleName}</TableCell>
        <TableCell>
          {c.applies ? <CheckCircle className="h-4 w-4 text-amber-500" /> : <XCircle className="h-4 w-4 text-muted-foreground/40" />}
        </TableCell>
        <TableCell className="text-xs font-mono text-muted-foreground">{c.sourceConfig}</TableCell>
        <TableCell className="text-xs text-right font-bold">
          {c.simulatedAmount > 0 ? `EC$${c.simulatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
        </TableCell>
        <TableCell>
          {c.fundType && <Badge variant="outline" className="text-[10px]">{c.fundType}</Badge>}
        </TableCell>
      </TableRow>
      {open && (
        <TableRow className="bg-muted/20">
          <TableCell colSpan={6} className="p-0">
            <div className="px-6 py-3 space-y-2 border-l-2 border-amber-400/50 ml-4">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Calculation Breakdown:</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <DetailItem label="Applies To" value={c.ruleCode} />
                <DetailItem label="Source Config" value={c.sourceConfig || 'N/A'} />
                <DetailItem label="Base Amount" value={`EC$${c.baseAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
                <DetailItem label="Simulated Result" value={`EC$${c.simulatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
              </div>
              <div className="mt-2 rounded bg-muted/40 p-2 space-y-1">
                <p className="text-xs font-semibold">Formula:</p>
                <p className="text-xs font-mono text-muted-foreground">{c.formulaSummary}</p>
              </div>
              <div className="mt-1 rounded bg-muted/40 p-2">
                <p className="text-xs">
                  <span className="font-semibold">Step-by-step:</span> {c.reason}
                </p>
              </div>
              {c.skippedReason && (
                <div className="mt-1 rounded bg-destructive/10 p-2 flex items-start gap-2">
                  <AlertTriangle className="h-3 w-3 text-destructive mt-0.5 shrink-0" />
                  <p className="text-xs text-destructive">{c.skippedReason}</p>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function EscalationDetailRow({ e }: { e: EscalationResult }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableRow
        className={`cursor-pointer ${e.applies ? 'bg-purple-50/50 dark:bg-purple-950/10' : 'hover:bg-muted/30'}`}
        onClick={() => setOpen(!open)}
      >
        <TableCell className="text-xs">
          {open ? <ChevronDown className="h-3 w-3 inline mr-1" /> : <ChevronRight className="h-3 w-3 inline mr-1" />}
          <span className="font-mono">{e.ruleCode}</span>
        </TableCell>
        <TableCell className="text-xs font-medium">{e.ruleName}</TableCell>
        <TableCell>
          {e.applies ? <CheckCircle className="h-4 w-4 text-purple-500" /> : <XCircle className="h-4 w-4 text-muted-foreground/40" />}
        </TableCell>
        <TableCell className="text-xs">
          <span className="font-mono">{e.fromStatus}</span>
          <ArrowRight className="h-3 w-3 inline mx-1 text-muted-foreground" />
          <span className="font-mono">{e.toStatus}</span>
        </TableCell>
        <TableCell>
          <Badge variant={e.autoEscalate ? 'default' : 'outline'} className="text-[10px]">{e.autoEscalate ? 'Auto' : 'Manual'}</Badge>
        </TableCell>
        <TableCell>
          {e.requiresApproval && <Badge variant="secondary" className="text-[10px]">Approval</Badge>}
        </TableCell>
      </TableRow>
      {open && (
        <TableRow className="bg-muted/20">
          <TableCell colSpan={6} className="p-0">
            <div className="px-6 py-3 space-y-2 border-l-2 border-purple-400/50 ml-4">
              <p className="text-xs font-semibold text-purple-700 dark:text-purple-300">Escalation Logic:</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <DetailItem label="From Status" value={e.fromStatus} />
                <DetailItem label="To Status" value={e.toStatus} />
                <DetailItem label="Auto-Escalate" value={e.autoEscalate ? 'Yes — system will escalate automatically' : 'No — requires manual action'} />
                <DetailItem label="Requires Approval" value={e.requiresApproval ? 'Yes — supervisor must approve' : 'No'} />
              </div>
              <div className="mt-2 rounded bg-muted/40 p-2">
                <p className="text-xs font-semibold">Condition:</p>
                <p className="text-xs font-mono text-muted-foreground">{e.thresholdLogic}</p>
              </div>
              <div className="mt-1 rounded bg-muted/40 p-2">
                <p className="text-xs">
                  <span className="font-semibold">{e.applies ? '⚡ TRIGGERED' : '⏸️ NOT TRIGGERED'}:</span> {e.reason}
                </p>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs py-0.5">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground ml-2">{value}</span>
    </div>
  );
}

function formatParamValue(v: any): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}

export default function SimulationResults({ output }: Props) {
  if (!output) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Simulation Results</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Click "Run Simulation" to evaluate rules against the scenario.</p>
        </CardContent>
      </Card>
    );
  }

  const { summary } = output;
  const totalFinancial = summary.financialImpact;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          Simulation Results
          <Badge variant="outline" className="text-[10px]">
            {summary.matchedDetections}/{summary.totalDetections} detected
          </Badge>
          {totalFinancial > 0 && (
            <Badge variant="destructive" className="text-[10px] gap-1">
              <DollarSign className="h-3 w-3" />
              EC${totalFinancial.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Pipeline Flow Summary */}
        <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30 overflow-x-auto">
          <PipelineStage
            icon={<Zap className="h-4 w-4" />}
            label="Detection"
            count={summary.matchedDetections}
            total={summary.totalDetections}
            color="text-destructive"
            active={summary.matchedDetections > 0}
          />
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <PipelineStage
            icon={<Calculator className="h-4 w-4" />}
            label="Calculation"
            count={summary.applicableCalculations}
            total={output.calculationResults.length}
            color="text-amber-600"
            active={summary.applicableCalculations > 0}
            subtitle={totalFinancial > 0 ? `EC$${totalFinancial.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : undefined}
          />
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <PipelineStage
            icon={<TrendingUp className="h-4 w-4" />}
            label="Escalation"
            count={summary.applicableEscalations}
            total={output.escalationResults.length}
            color="text-purple-600"
            active={summary.applicableEscalations > 0}
          />
        </div>

        {/* Recommendations */}
        {output.recommendations.length > 0 && (
          <div className="rounded-lg border p-3 space-y-1">
            <p className="text-xs font-semibold flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-primary" /> Outcome Summary
            </p>
            {output.recommendations.map((r, i) => (
              <p key={i} className="text-xs text-muted-foreground">{r}</p>
            ))}
          </div>
        )}

        {/* Per-period evidence summary — only when multiple periods were scanned. */}
        {(() => {
          const matched = output.detectionResults.filter(d => d.matched && d.period);
          if (matched.length === 0) return null;
          const periodMap = new Map<string, { codes: Set<string>; total: number }>();
          for (const d of matched) {
            const p = d.period as string;
            const entry = periodMap.get(p) || { codes: new Set<string>(), total: 0 };
            if (d.linkedViolationTypeCode) entry.codes.add(d.linkedViolationTypeCode);
            if (d.linkedCalculationTotal && d.linkedCalculationTotal > 0) entry.total += d.linkedCalculationTotal;
            periodMap.set(p, entry);
          }
          if (periodMap.size < 2) return null;
          const periods = Array.from(periodMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));
          const overall = periods.reduce((s, [, v]) => s + v.total, 0);
          return (
            <div className="rounded-lg border bg-destructive/5 p-3 space-y-2">
              <p className="text-xs font-semibold flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                Issues by period — {periods.length} month(s) flagged
                {overall > 0 && (
                  <span className="ml-auto text-foreground">
                    Total estimated exposure: <span className="font-mono">EC${overall.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {periods.map(([p, v]) => {
                  const d = new Date(`${p}-01T00:00:00`);
                  const label = isNaN(d.getTime()) ? p : d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
                  return (
                    <Badge key={p} variant="outline" className="text-[11px] font-normal gap-1">
                      <span className="font-mono">{label}</span>
                      <span className="text-muted-foreground">·</span>
                      <span>{Array.from(v.codes).join(', ') || '—'}</span>
                      {v.total > 0 && (
                        <>
                          <span className="text-muted-foreground">·</span>
                          <span className="font-mono text-destructive">EC${v.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </>
                      )}
                    </Badge>
                  );
                })}
              </div>
            </div>
          );
        })()}


        {/* Detailed tabs */}
        <Tabs defaultValue="detection" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="detection" className="gap-1 text-xs flex-1">
              <Zap className="h-3 w-3" /> Detection ({summary.matchedDetections})
            </TabsTrigger>
            <TabsTrigger value="calculation" className="gap-1 text-xs flex-1">
              <Calculator className="h-3 w-3" /> Calculation ({summary.applicableCalculations})
            </TabsTrigger>
            <TabsTrigger value="escalation" className="gap-1 text-xs flex-1">
              <TrendingUp className="h-3 w-3" /> Escalation ({summary.applicableEscalations})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="detection" className="mt-3">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Info className="h-3 w-3" /> Click any row to expand and see how the detection was evaluated, including parameters and thresholds.
            </p>
            {(() => {
              const showPeriod = output.detectionResults.some(d => !!d.period);
              return (
                <div className="overflow-auto max-h-[500px] rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs w-24">Rule</TableHead>
                        {showPeriod && <TableHead className="text-xs w-24">Period</TableHead>}
                        <TableHead className="text-xs">Name</TableHead>
                        <TableHead className="text-xs w-16">Match</TableHead>
                        <TableHead className="text-xs">Reason</TableHead>
                        <TableHead className="text-xs w-28 text-right">Amount</TableHead>
                        <TableHead className="text-xs w-28">Violation</TableHead>
                        <TableHead className="text-xs w-24">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {output.detectionResults.map((d, i) => (
                        <DetectionDetailRow key={`${d.ruleCode}-${d.period ?? i}`} d={d} showPeriod={showPeriod} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })()}
          </TabsContent>

          <TabsContent value="calculation" className="mt-3">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Info className="h-3 w-3" /> Click any row to see the formula, base amounts, and step-by-step calculation.
            </p>
            <div className="overflow-auto max-h-[500px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-24">Rule</TableHead>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs w-16">Applies</TableHead>
                    <TableHead className="text-xs">Source</TableHead>
                    <TableHead className="text-xs w-32 text-right">Amount</TableHead>
                    <TableHead className="text-xs w-16">Fund</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {output.calculationResults.map(c => <CalculationDetailRow key={c.ruleCode} c={c} />)}
                </TableBody>
              </Table>
            </div>
            {totalFinancial > 0 && (
              <div className="mt-2 flex justify-end">
                <div className="rounded-lg border-2 border-dashed border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-2">
                  <p className="text-xs text-muted-foreground">Total Financial Impact</p>
                  <p className="text-lg font-bold text-foreground">EC${totalFinancial.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="escalation" className="mt-3">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Info className="h-3 w-3" /> Click any row to see the escalation condition, status transition, and approval requirements.
            </p>
            <div className="overflow-auto max-h-[500px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-24">Rule</TableHead>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs w-16">Applies</TableHead>
                    <TableHead className="text-xs">Transition</TableHead>
                    <TableHead className="text-xs w-20">Mode</TableHead>
                    <TableHead className="text-xs w-20">Approval</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {output.escalationResults.map(e => <EscalationDetailRow key={e.ruleCode} e={e} />)}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function PipelineStage({ icon, label, count, total, color, active, subtitle }: {
  icon: React.ReactNode; label: string; count: number; total: number; color: string; active: boolean; subtitle?: string;
}) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-md border min-w-[120px] ${active ? 'border-primary/30 bg-background' : 'border-transparent bg-muted/30'}`}>
      <div className={active ? color : 'text-muted-foreground'}>{icon}</div>
      <div>
        <p className={`text-xs font-semibold ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</p>
        <p className="text-[10px] text-muted-foreground">{count}/{total} triggered</p>
        {subtitle && <p className={`text-[10px] font-medium ${color}`}>{subtitle}</p>}
      </div>
    </div>
  );
}
