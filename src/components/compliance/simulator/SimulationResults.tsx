import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Zap, Calculator, TrendingUp } from 'lucide-react';
import type { SimulationOutput } from '@/services/complianceSimulatorEngine';

interface Props {
  output: SimulationOutput | null;
}

export default function SimulationResults({ output }: Props) {
  if (!output) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Simulation Results</CardTitle></CardHeader>
        <CardContent><p className="text-xs text-muted-foreground">Click "Run Simulation" to evaluate rules against the scenario.</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          Simulation Results
          <Badge variant="outline" className="text-[10px]">
            {output.summary.matchedDetections}/{output.summary.totalDetections} matched
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="detection" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="detection" className="gap-1 text-xs flex-1">
              <Zap className="h-3 w-3" />
              Detection ({output.summary.matchedDetections})
            </TabsTrigger>
            <TabsTrigger value="calculation" className="gap-1 text-xs flex-1">
              <Calculator className="h-3 w-3" />
              Calculation ({output.summary.applicableCalculations})
            </TabsTrigger>
            <TabsTrigger value="escalation" className="gap-1 text-xs flex-1">
              <TrendingUp className="h-3 w-3" />
              Escalation ({output.summary.applicableEscalations})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="detection" className="mt-3">
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-20">Rule</TableHead>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs w-20">Match</TableHead>
                    <TableHead className="text-xs">Reason</TableHead>
                    <TableHead className="text-xs w-28">Violation Type</TableHead>
                    <TableHead className="text-xs w-24">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {output.detectionResults.map(d => (
                    <TableRow key={d.ruleCode} className={d.matched ? 'bg-red-50/50 dark:bg-red-950/20' : ''}>
                      <TableCell className="text-xs font-mono">{d.ruleCode}</TableCell>
                      <TableCell className="text-xs">{d.ruleName}</TableCell>
                      <TableCell>
                        {d.matched ? (
                          <CheckCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground/40" />
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px]">{d.reason}</TableCell>
                      <TableCell>
                        {d.linkedViolationTypeCode && (
                          <Badge variant={d.matched ? 'destructive' : 'outline'} className="text-[10px]">
                            {d.linkedViolationTypeCode}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {d.matched && (
                          <Badge variant={d.initialStatus === 'OPEN' ? 'default' : 'secondary'} className="text-[10px]">
                            {d.initialStatus}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="calculation" className="mt-3">
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-20">Rule</TableHead>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs w-20">Applies</TableHead>
                    <TableHead className="text-xs">Source</TableHead>
                    <TableHead className="text-xs">Formula</TableHead>
                    <TableHead className="text-xs w-28 text-right">Amount</TableHead>
                    <TableHead className="text-xs">Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {output.calculationResults.map(c => (
                    <TableRow key={c.ruleCode} className={c.applies && c.simulatedAmount > 0 ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}>
                      <TableCell className="text-xs font-mono">{c.ruleCode}</TableCell>
                      <TableCell className="text-xs">{c.ruleName}</TableCell>
                      <TableCell>
                        {c.applies ? (
                          <CheckCircle className="h-4 w-4 text-amber-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground/40" />
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{c.sourceConfig}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">{c.reason}</TableCell>
                      <TableCell className="text-xs text-right font-medium">
                        {c.simulatedAmount > 0 ? `EC$${c.simulatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.skippedReason || (c.fundType ? `Fund: ${c.fundType}` : '')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="escalation" className="mt-3">
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-20">Rule</TableHead>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs w-20">Applies</TableHead>
                    <TableHead className="text-xs">Transition</TableHead>
                    <TableHead className="text-xs">Reason</TableHead>
                    <TableHead className="text-xs w-20">Auto?</TableHead>
                    <TableHead className="text-xs w-20">Approval?</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {output.escalationResults.map(e => (
                    <TableRow key={e.ruleCode} className={e.applies ? 'bg-purple-50/50 dark:bg-purple-950/20' : ''}>
                      <TableCell className="text-xs font-mono">{e.ruleCode}</TableCell>
                      <TableCell className="text-xs">{e.ruleName}</TableCell>
                      <TableCell>
                        {e.applies ? (
                          <CheckCircle className="h-4 w-4 text-purple-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground/40" />
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="font-mono">{e.fromStatus}</span>
                        <span className="mx-1 text-muted-foreground">→</span>
                        <span className="font-mono">{e.toStatus}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[180px]">{e.reason}</TableCell>
                      <TableCell>
                        <Badge variant={e.autoEscalate ? 'default' : 'outline'} className="text-[10px]">
                          {e.autoEscalate ? 'Auto' : 'Manual'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {e.requiresApproval && <Badge variant="secondary" className="text-[10px]">Required</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
