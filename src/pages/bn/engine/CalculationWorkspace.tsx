import { useUserCode } from '@/hooks/useUserCode';
/**
 * Screen 7: Calculation Workspace
 * 
 * Enterprise-grade calculation workspace for a specific claim.
 * Shows line-by-line trace, what-if simulation, snapshot comparison,
 * and audit trail.
 * 
 * Roles: Claims Officer (run calc), Supervisor (approve calc), Auditor (read-only)
 * Tables: bn_claim, bn_claim_calculation, bn_claim_calculation_line, bn_calculation_rule,
 *   bn_product_version, bn_claim_event
 */
import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, Loader2, Calculator, Play, History, GitCompare, FlaskConical,
  Download, Eye, ChevronDown, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { BnEmptyState, BnStatCard } from '@/components/bn/shared';
import { useBnDeterminationContext, useBnRuleVersion, useRunDeterminationCalc } from '@/hooks/bn/useBnDetermination';
import { formatDateForDisplay } from '@/lib/format-config';
import type { CalculationSnapshot, CalculationLine } from '@/services/bn/determinationService';

export default function CalculationWorkspace() {
  const { id: claimId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { data: ctx, isLoading, error } = useBnDeterminationContext(claimId);
  const { data: ruleData } = useBnRuleVersion(ctx?.productVersion?.id);
  const runCalc = useRunDeterminationCalc();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [compareIdx, setCompareIdx] = useState<number | null>(null);
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());
  const [whatIfOverrides, setWhatIfOverrides] = useState<Record<string, string>>({});

  const { userCode: _uc } = useUserCode(); const userCode = _uc ?? '';

  const handleRunCalc = () => {
    if (!ctx?.claim || !ctx.product) return;
    runCalc.mutate(
      {
        input: {
          claimId: ctx.claim.id,
          ssn: ctx.claim.ssn,
          productId: ctx.claim.product_id || '',
          productVersionId: ctx.claim.product_version_id || '',
          claimDate: ctx.claim.claim_date,
          countryCode: (ctx.claim as any).country_code || 'KN',
          mode: 'LIVE',
          overrideParams: Object.keys(whatIfOverrides).length > 0
            ? Object.fromEntries(Object.entries(whatIfOverrides).filter(([, v]) => v !== ''))
            : undefined,
        },
        performedBy: userCode,
      },
      {
        onSuccess: () => toast.success('Calculation completed and snapshot saved.'),
        onError: (err: any) => toast.error(`Calculation failed: ${err.message}`),
      }
    );
  };

  const toggleLine = (lineId: string) => {
    const next = new Set(expandedLines);
    if (next.has(lineId)) next.delete(lineId); else next.add(lineId);
    setExpandedLines(next);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !ctx) {
    return (
      <div className="p-6">
        <BnEmptyState type="error" description="Could not load calculation workspace." />
      </div>
    );
  }

  const snapshots = ctx.calculationSnapshots;
  const current = snapshots[selectedIdx];
  const comparison = compareIdx !== null ? snapshots[compareIdx] : null;

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="t-page-title flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Calculation Workspace
          </h1>
          <p className="text-sm text-muted-foreground">
            Claim {ctx.claim.claim_number || ctx.claim.id.slice(0, 8)} • {ctx.product?.benefit_name || 'Unknown'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRunCalc}
            disabled={runCalc.isPending}
            size="sm"
          >
            {runCalc.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
            {snapshots.length > 0 ? 'Recalculate' : 'Run Calculation'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {current && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <BnStatCard title="Weekly Rate" value={`$${(current.weekly_rate ?? 0).toFixed(2)}`} icon={Calculator} />
          <BnStatCard title="Lump Sum" value={`$${(current.lump_sum ?? 0).toFixed(2)}`} icon={Calculator} />
          <BnStatCard title="Total Payable" value={`$${(current.total_payable ?? 0).toFixed(2)}`} icon={Calculator} />
          <BnStatCard title="Duration" value={`${current.duration_weeks ?? '—'} wks`} icon={History} />
          <BnStatCard title="Snapshots" value={snapshots.length} icon={GitCompare} subtitle={current.status} />
        </div>
      )}

      {!current && (
        <Card>
          <CardContent className="py-8">
            <BnEmptyState
              type="empty"
              title="No Calculation Performed"
              description="Click 'Run Calculation' to execute the benefit calculation engine."
            />
          </CardContent>
        </Card>
      )}

      {current && (
        <Tabs defaultValue="lines">
          <TabsList>
            <TabsTrigger value="lines">Calculation Lines ({current.lines.length})</TabsTrigger>
            <TabsTrigger value="whatif">What-If Simulation</TabsTrigger>
            <TabsTrigger value="history">Snapshot History ({snapshots.length})</TabsTrigger>
            {comparison && <TabsTrigger value="compare">Comparison</TabsTrigger>}
          </TabsList>

          {/* Calculation Lines */}
          <TabsContent value="lines">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Line-by-Line Calculation Trace</CardTitle>
                <CardDescription>
                  Snapshot {formatDateForDisplay(current.calc_date)} • Type: {current.calc_type} • Status: {current.status}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Line</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Formula</TableHead>
                      <TableHead className="text-right">Result</TableHead>
                      <TableHead>Explanation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {current.lines
                      .sort((a, b) => a.line_number - b.line_number)
                      .map((line) => (
                        <React.Fragment key={line.id}>
                          <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleLine(line.id)}>
                            <TableCell>
                              {expandedLines.has(line.id) ? (
                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono">{line.line_number}</TableCell>
                            <TableCell className="text-sm font-medium">{line.line_label}</TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground">{line.line_code}</TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground max-w-40 truncate">
                              {line.formula_expression || '—'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm font-bold">
                              ${line.output_value.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-48 truncate">
                              {line.explanation || '—'}
                            </TableCell>
                          </TableRow>
                          {expandedLines.has(line.id) && (
                            <TableRow>
                              <TableCell colSpan={7} className="bg-muted/30 p-3">
                                <div className="space-y-2">
                                  <p className="text-sm font-medium">Input Values</p>
                                  <div className="grid grid-cols-3 gap-2">
                                    {Object.entries(line.input_values).map(([k, v]) => (
                                      <div key={k} className="rounded border bg-background p-2">
                                        <p className="text-[10px] text-muted-foreground font-mono">{k}</p>
                                        <p className="text-sm font-mono font-bold">{String(v)}</p>
                                      </div>
                                    ))}
                                  </div>
                                  {line.formula_expression && (
                                    <div>
                                      <p className="text-sm font-medium">Formula</p>
                                      <code className="block bg-background border rounded p-2 text-xs font-mono">
                                        {line.formula_expression}
                                      </code>
                                    </div>
                                  )}
                                  {line.explanation && (
                                    <div>
                                      <p className="text-sm font-medium">Explanation</p>
                                      <p className="text-sm text-muted-foreground">{line.explanation}</p>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* What-If Simulation */}
          <TabsContent value="whatif">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-primary" />
                  What-If Parameter Overrides
                </CardTitle>
                <CardDescription>
                  Override input parameters and re-run the calculation to see projected impact. Results create a new snapshot.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {/* Common override fields */}
                  {['averageWeeklyWage', 'totalWeeks', 'contributionRate', 'benefitRate', 'maxWeeklyBenefit', 'minWeeklyBenefit'].map(field => (
                    <div key={field}>
                      <Label className="text-xs">{field.replace(/([A-Z])/g, ' $1').trim()}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={`Override ${field}...`}
                        value={whatIfOverrides[field] || ''}
                        onChange={e => setWhatIfOverrides(prev => ({ ...prev, [field]: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="flex gap-2">
                  <Button onClick={handleRunCalc} disabled={runCalc.isPending} size="sm">
                    {runCalc.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <FlaskConical className="h-3.5 w-3.5 mr-1" />}
                    Run What-If Calculation
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setWhatIfOverrides({})}
                  >
                    Clear Overrides
                  </Button>
                </div>
                {Object.keys(whatIfOverrides).filter(k => whatIfOverrides[k]).length > 0 && (
                  <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3">
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      <strong>Active overrides:</strong>{' '}
                      {Object.entries(whatIfOverrides).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join(', ')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Snapshot History */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Calculation Snapshot History</CardTitle>
                <CardDescription>All calculation runs for this claim.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Weekly Rate</TableHead>
                      <TableHead>Lump Sum</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>By</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {snapshots.map((snap, i) => (
                      <TableRow key={snap.id} className={selectedIdx === i ? 'bg-primary/5' : ''}>
                        <TableCell className="font-mono text-xs">#{i + 1}</TableCell>
                        <TableCell className="text-sm">{formatDateForDisplay(snap.calc_date)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{snap.calc_type}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">${(snap.weekly_rate ?? 0).toFixed(2)}</TableCell>
                        <TableCell className="font-mono text-sm">${(snap.lump_sum ?? 0).toFixed(2)}</TableCell>
                        <TableCell className="font-mono text-sm font-bold">${(snap.total_payable ?? 0).toFixed(2)}</TableCell>
                        <TableCell className="text-sm">{snap.duration_weeks ?? '—'} wks</TableCell>
                        <TableCell>
                          <Badge variant={snap.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
                            {snap.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{snap.performed_by}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant={selectedIdx === i ? 'default' : 'ghost'}
                              size="sm"
                              onClick={() => setSelectedIdx(i)}
                              title="View this snapshot"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            {i !== selectedIdx && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCompareIdx(i)}
                                title="Compare with current"
                              >
                                <GitCompare className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comparison Tab */}
          {comparison && (
            <TabsContent value="compare">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <GitCompare className="h-4 w-4" />
                    Snapshot Comparison
                  </CardTitle>
                  <CardDescription>
                    Current (#{selectedIdx + 1}) vs Compare (#{(compareIdx ?? 0) + 1})
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Current Snapshot</h4>
                      <div className="space-y-1 text-sm">
                        <p>Date: {formatDateForDisplay(current.calc_date)}</p>
                        <p>Weekly: <span className="font-mono font-bold">${(current.weekly_rate ?? 0).toFixed(2)}</span></p>
                        <p>Lump Sum: <span className="font-mono font-bold">${(current.lump_sum ?? 0).toFixed(2)}</span></p>
                        <p>Total: <span className="font-mono font-bold">${(current.total_payable ?? 0).toFixed(2)}</span></p>
                        <p>Duration: {current.duration_weeks} weeks</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Comparison Snapshot</h4>
                      <div className="space-y-1 text-sm">
                        <p>Date: {formatDateForDisplay(comparison.calc_date)}</p>
                        <p>Weekly: <span className="font-mono font-bold">${(comparison.weekly_rate ?? 0).toFixed(2)}</span>
                          {current.weekly_rate !== comparison.weekly_rate && (
                            <Badge variant="outline" className="ml-2 text-[10px]">
                              {((current.weekly_rate ?? 0) - (comparison.weekly_rate ?? 0) > 0 ? '+' : '')}
                              ${((current.weekly_rate ?? 0) - (comparison.weekly_rate ?? 0)).toFixed(2)}
                            </Badge>
                          )}
                        </p>
                        <p>Lump Sum: <span className="font-mono font-bold">${(comparison.lump_sum ?? 0).toFixed(2)}</span></p>
                        <p>Total: <span className="font-mono font-bold">${(comparison.total_payable ?? 0).toFixed(2)}</span></p>
                        <p>Duration: {comparison.duration_weeks} weeks</p>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  {/* Line-by-line diff */}
                  <h4 className="font-medium text-sm mb-2">Line Differences</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Line</TableHead>
                        <TableHead className="text-right">Current</TableHead>
                        <TableHead className="text-right">Previous</TableHead>
                        <TableHead className="text-right">Diff</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {current.lines.sort((a, b) => a.line_number - b.line_number).map(line => {
                        const prevLine = comparison.lines.find(l => l.line_code === line.line_code);
                        const diff = prevLine ? line.output_value - prevLine.output_value : 0;
                        return (
                          <TableRow key={line.id} className={diff !== 0 ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''}>
                            <TableCell className="text-xs font-mono">{line.line_number}</TableCell>
                            <TableCell className="text-sm">{line.line_label}</TableCell>
                            <TableCell className="text-right font-mono text-sm font-bold">${line.output_value.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">${(prevLine?.output_value ?? 0).toFixed(2)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {diff !== 0 && (
                                <span className={diff > 0 ? 'text-green-600' : 'text-destructive'}>
                                  {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
