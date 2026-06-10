import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, FlaskConical, CheckCircle, XCircle, DollarSign, Calendar, Shield, Calculator } from 'lucide-react';
import { useBnSimRun, useBnSimRunOutputs, useBnSimRunInputs, useBnSimRuleTrace, useBnSimFormulaTrace, useBnSimConfigSnapshot } from '@/hooks/bn/useBnSimulation';
import { BnEmptyState } from '@/components/bn/shared/BnEmptyState';
import SimRuleTraceView from '@/components/bn/simulation/SimRuleTraceView';
import SimFormulaTraceView from '@/components/bn/simulation/SimFormulaTraceView';
import SimConfigSnapshotViewer from '@/components/bn/simulation/SimConfigSnapshotViewer';
import { useSimPermission } from '@/hooks/bn/useSimPermission';
import SimAccessDenied from '@/components/bn/simulation/SimAccessDenied';

import { formatAuditTimestamp, formatNumber } from '@/lib/culture/culture';
export default function SimulationResultSummary() {
  const { id: scenarioId, runId } = useParams<{ id: string; runId: string }>();
  const navigate = useNavigate();
  const { canViewTraces } = useSimPermission();
  const { data: run, isLoading } = useBnSimRun(runId);
  const { data: outputs } = useBnSimRunOutputs(runId);
  const { data: inputs } = useBnSimRunInputs(runId);
  const { data: ruleTrace } = useBnSimRuleTrace(runId);
  const { data: formulaTrace } = useBnSimFormulaTrace(runId);
  const { data: snapshot } = useBnSimConfigSnapshot(run?.config_snapshot_id || undefined);

  if (!canViewTraces) return <SimAccessDenied />;
  if (isLoading) return <BnEmptyState type="loading" />;
  if (!run) return <BnEmptyState type="error" title="Run not found" />;

  const getOutput = (key: string) => outputs?.find(o => o.output_key === key);
  const numVal = (key: string) => getOutput(key)?.output_numeric ?? 0;
  const strVal = (key: string) => getOutput(key)?.output_value ?? '—';

  return (
    <div className="space-y-6">
      {/* Simulation banner */}
      <div className="rounded-lg border-2 border-dashed border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 p-3 flex items-center gap-3">
        <FlaskConical className="h-5 w-5 text-amber-600" />
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Simulation Result — Non-Production Data</p>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/bn/simulation/${scenarioId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="t-page-title">Simulation Run Result</h1>
          <p className="text-xs text-muted-foreground font-mono">Run ID: {run.id.substring(0, 8)}… · {run.run_mode} · {run.duration_ms}ms</p>
        </div>
        <Badge variant={run.run_status === 'COMPLETED' ? 'default' : 'destructive'}>{run.run_status}</Badge>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              {strVal('eligibility_passed') === 'true' ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-destructive" />}
              <span className="text-xs text-muted-foreground">Eligibility</span>
            </div>
            <p className="text-lg font-bold">{strVal('eligibility_passed') === 'true' ? 'Passed' : 'Failed'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Weekly Rate</span>
            </div>
            <p className="text-lg font-bold text-emerald-700">${formatNumber(numVal('weekly_rate'), 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Monthly Rate</span>
            </div>
            <p className="text-lg font-bold text-emerald-700">${formatNumber(numVal('monthly_rate'), 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Lump Sum</span>
            </div>
            <p className="text-lg font-bold text-emerald-700">${formatNumber(numVal('lump_sum'), 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="inputs">Inputs ({inputs?.length || 0})</TabsTrigger>
          <TabsTrigger value="rules">Rule Trace ({ruleTrace?.length || 0})</TabsTrigger>
          <TabsTrigger value="formula">Formula Trace ({formulaTrace?.length || 0})</TabsTrigger>
          <TabsTrigger value="config">Config Snapshot</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Calculation Details</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Calc Type</span><Badge variant="outline">{strVal('calc_type')}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Rounding</span><span>{strVal('rounding_rule')}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Annual Amount</span><span className="font-bold">${formatNumber(numVal('annual_amount'), 0)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Errors</span><Badge variant={numVal('error_count') > 0 ? 'destructive' : 'outline'}>{numVal('error_count')}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Warnings</span><Badge variant={numVal('warning_count') > 0 ? 'secondary' : 'outline'}>{numVal('warning_count')}</Badge></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Run Metadata</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Started</span><span>{run.started_at ? formatAuditTimestamp(run.started_at) : '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Completed</span><span>{run.completed_at ? formatAuditTimestamp(run.completed_at) : '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span>{run.duration_ms}ms</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Triggered By</span><span>{run.triggered_by || 'Unknown'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Country</span><span>{run.country_code}</span></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inputs">
          <Card>
            <CardContent className="pt-4">
              {(!inputs || inputs.length === 0) ? (
                <p className="text-sm text-muted-foreground">No inputs recorded.</p>
              ) : (
                <div className="space-y-2">
                  {inputs.map(inp => (
                    <div key={inp.id} className="flex items-center justify-between border-b border-border/50 py-2">
                      <span className="text-sm font-medium">{inp.input_key}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{inp.input_type}</Badge>
                        <span className="text-sm font-mono">{inp.input_value || JSON.stringify(inp.input_json)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <SimRuleTraceView trace={ruleTrace || []} />
        </TabsContent>

        <TabsContent value="formula">
          <SimFormulaTraceView trace={formulaTrace || []} />
        </TabsContent>

        <TabsContent value="config">
          <SimConfigSnapshotViewer snapshot={snapshot} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
