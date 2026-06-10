import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, FlaskConical, Play, Loader2, Plus, Eye } from 'lucide-react';
import { useBnSimScenario, useBnSimRuns, useExecuteSimulation } from '@/hooks/bn/useBnSimulation';
import { BnEmptyState } from '@/components/bn/shared/BnEmptyState';
import type { BnSimInputParam, BnSimRun } from '@/types/bnSimulation';
import { toast } from 'sonner';
import { useSimPermission } from '@/hooks/bn/useSimPermission';
import SimAccessDenied from '@/components/bn/simulation/SimAccessDenied';

import { formatAuditTimestamp, formatNumber } from '@/lib/culture/culture';
const RUN_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'outline',
  RUNNING: 'secondary',
  COMPLETED: 'default',
  FAILED: 'destructive',
  CANCELLED: 'outline',
};

export default function RunSimulation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canView, canRun } = useSimPermission();
  const { data: scenario, isLoading } = useBnSimScenario(id);
  const { data: runs } = useBnSimRuns(id);
  const executeSim = useExecuteSimulation();

  // Simulation inputs
  const [ssn, setSSN] = useState('');
  const [claimDate, setClaimDate] = useState(new Date().toISOString().substring(0, 10));
  const [age, setAge] = useState('');
  const [totalWeeks, setTotalWeeks] = useState('');

  if (!canView) return <SimAccessDenied />;
  if (isLoading) return <BnEmptyState type="loading" />;
  if (!scenario) return <BnEmptyState type="error" title="Scenario not found" />;

  const handleRun = async () => {
    if (!ssn) { toast.error('SSN is required for simulation'); return; }
    if (!scenario.product_id) { toast.error('Scenario has no product configured'); return; }

    const inputs: BnSimInputParam[] = [
      { key: 'ssn', value: ssn, type: 'STRING' },
      { key: 'claim_date', value: claimDate, type: 'DATE' },
    ];
    if (age) inputs.push({ key: 'age', value: age, type: 'NUMBER' });
    if (totalWeeks) inputs.push({ key: 'total_weeks', value: totalWeeks, type: 'NUMBER' });

    try {
      const result = await executeSim.mutateAsync({
        scenarioId: scenario.id,
        productId: scenario.product_id!,
        productVersionId: scenario.product_version_id || '',
        countryCode: scenario.country_code || 'KN',
        runMode: 'SIMULATION',
        inputs,
      });
      toast.success('Simulation completed');
      navigate(`/bn/simulation/${scenario.id}/run/${result.runId}`);
    } catch (err: any) {
      toast.error(err?.message || 'Simulation failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Simulation banner */}
      <div className="rounded-lg border-2 border-dashed border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 p-3 flex items-center gap-3">
        <FlaskConical className="h-5 w-5 text-amber-600" />
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Simulation Mode — Non-Production</p>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/bn/simulation')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="t-page-title">{scenario.scenario_name}</h1>
          <p className="t-page-subtitle mt-1">{scenario.description || 'No description'}</p>
        </div>
        <Badge variant={RUN_STATUS_VARIANT[scenario.status] || 'outline'}>{scenario.status}</Badge>
      </div>

      <Tabs defaultValue="run">
        <TabsList>
          <TabsTrigger value="run">Run Simulation</TabsTrigger>
          <TabsTrigger value="history">Run History ({runs?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="run">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5 text-primary" />
                Simulation Inputs
              </CardTitle>
              <CardDescription>Enter synthetic data to test the calculation engine. No live data will be affected.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>SSN *</Label>
                  <Input value={ssn} onChange={e => setSSN(e.target.value)} placeholder="e.g. 123456" />
                </div>
                <div className="space-y-2">
                  <Label>Claim Date</Label>
                  <Input type="date" value={claimDate} onChange={e => setClaimDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Age (override)</Label>
                  <Input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="Optional" />
                </div>
                <div className="space-y-2">
                  <Label>Total Weeks (override)</Label>
                  <Input type="number" value={totalWeeks} onChange={e => setTotalWeeks(e.target.value)} placeholder="Optional" />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleRun} disabled={executeSim.isPending || !canRun} className="gap-2">
                  {executeSim.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Run Simulation
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          {(!runs || runs.length === 0) ? (
            <BnEmptyState type="empty" title="No runs yet" description="Execute a simulation to see results here." />
          ) : (
            <div className="space-y-3">
              {runs.map((run: BnSimRun) => (
                <Card key={run.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/bn/simulation/${scenario.id}/run/${run.id}`)}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant={RUN_STATUS_VARIANT[run.run_status] || 'outline'}>{run.run_status}</Badge>
                        <span className="text-sm font-medium">Run #{run.run_number}</span>
                        <span className="text-xs text-muted-foreground">{run.run_mode}</span>
                        {run.duration_ms && <span className="text-xs text-muted-foreground">{run.duration_ms}ms</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {run.started_at ? formatAuditTimestamp(run.started_at) : '—'}
                        </span>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-3 w-3 mr-1" /> View
                        </Button>
                      </div>
                    </div>
                    {run.error_message && <p className="text-xs text-destructive mt-1">{run.error_message}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
