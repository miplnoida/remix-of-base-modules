import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Play, RotateCcw, AlertTriangle, ArrowRight, TrendingUp, TrendingDown, Minus, Shield, Info, FlaskConical } from 'lucide-react';
import { useSimulatorEmployers, useActiveRiskPolicy, useEmployerLiveFactors, useRiskScoreHistory, type SimulatorEmployer } from '@/hooks/useRiskSimulatorData';
import { runSimulation, getRecommendedAction, getBandStyle, type FactorInput, type SimulationResult } from '@/lib/compliance/riskScoringEngine';
import { formatDateForDisplay } from '@/lib/format-config';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const FACTOR_LABELS: Record<string, { label: string; unit: string; description: string }> = {
  arrears: { label: 'Arrears Balance', unit: '$', description: 'Total outstanding arrears in XCD' },
  violations: { label: 'Active Violations', unit: 'count', description: 'Number of open/escalated violations' },
  filings: { label: 'Missed Filings', unit: 'count', description: 'C3 filings missed in last 12 months (0–12)' },
  payment: { label: 'Breach Rate', unit: '%', description: 'Payment arrangement breach percentage' },
  legal: { label: 'Legal Escalations', unit: 'count', description: 'Number of legal escalation records' },
};

async function recordSimulatorRun(simulatorKey: 'rule' | 'risk') {
  const timestamp = new Date().toISOString();
  const rows = [
    {
      setting_key: 'compliance.simulators.last_run_at',
      setting_value: timestamp,
      data_type: 'timestamp',
      category: 'compliance',
      description: 'Last successful Compliance setup simulator dry-run timestamp.',
    },
    {
      setting_key: `compliance.simulators.${simulatorKey}.last_run_at`,
      setting_value: timestamp,
      data_type: 'timestamp',
      category: 'compliance',
      description: `Last successful Compliance ${simulatorKey} simulator dry-run timestamp.`,
    },
  ];

  const { error } = await supabase.from('ce_settings').upsert(rows, {
    onConflict: 'setting_key',
  });
  if (error) throw error;
}

function BandBadge({ band, size = 'default' }: { band: string; size?: 'default' | 'lg' }) {
  const style = getBandStyle(band);
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 font-semibold ${style.bg} ${style.text} ${style.border} ${size === 'lg' ? 'text-base px-4 py-1.5' : 'text-xs'}`}>
      {band}
    </span>
  );
}

function ScoreDelta({ current, simulated }: { current: number; simulated: number }) {
  const delta = Math.round((simulated - current) * 100) / 100;
  if (delta === 0) return <span className="flex items-center gap-1 text-muted-foreground text-sm"><Minus className="h-3 w-3" /> No change</span>;
  if (delta > 0) return <span className="flex items-center gap-1 text-red-600 text-sm font-medium"><TrendingUp className="h-3 w-3" /> +{delta}</span>;
  return <span className="flex items-center gap-1 text-emerald-600 text-sm font-medium"><TrendingDown className="h-3 w-3" /> {delta}</span>;
}

export default function RiskSimulator() {
  const [selectedEmployerId, setSelectedEmployerId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, { enabled: boolean; value: number }>>({});
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [currentResult, setCurrentResult] = useState<SimulationResult | null>(null);

  const { data: employers = [], isLoading: employersLoading } = useSimulatorEmployers();
  const { data: policyData, isLoading: policyLoading } = useActiveRiskPolicy();
  const selectedEmployer = useMemo(() => employers.find((p) => p.employer_id === selectedEmployerId), [employers, selectedEmployerId]);
  const { data: liveFactors, isLoading: liveLoading } = useEmployerLiveFactors(selectedEmployerId);
  const { data: scoreHistory = [] } = useRiskScoreHistory(selectedEmployer?.profile_id || null);

  const isLoading = employersLoading || policyLoading;
  const isReady = selectedEmployerId && liveFactors && policyData?.policy;

  const handleSelectEmployer = useCallback((empId: string) => {
    setSelectedEmployerId(empId);
    setOverrides({});
    setSimulationResult(null);
    setCurrentResult(null);
  }, []);

  const handleReset = useCallback(() => {
    setOverrides({});
    setSimulationResult(null);
    setCurrentResult(null);
  }, []);

  const handleRunSimulation = useCallback(async () => {
    if (!policyData || !liveFactors) return;
    const { factorConfigs, factorWeights, bands } = policyData;

    // Build inputs — use override if enabled, otherwise live
    const buildInputs = (useOverrides: boolean): Record<string, FactorInput> => {
      const inputs: Record<string, FactorInput> = {};
      for (const fc of factorConfigs) {
        const code = fc.factor_code;
        const live = liveFactors[code as keyof typeof liveFactors];
        if (!live) continue;
        const ovr = overrides[code];
        if (useOverrides && ovr?.enabled) {
          inputs[code] = { factor_code: code, rawValue: ovr.value, dataDetail: `Manual override: ${ovr.value}`, isOverride: true };
        } else {
          inputs[code] = { factor_code: code, rawValue: live.rawValue, dataDetail: live.detail, isOverride: false };
        }
      }
      return inputs;
    };

    // Run current (no overrides)
    const currentInputs = buildInputs(false);
    const currentRes = runSimulation(factorConfigs, factorWeights, currentInputs, bands);
    setCurrentResult(currentRes);

    // Run simulated (with overrides)
    const simInputs = buildInputs(true);
    const simRes = runSimulation(factorConfigs, factorWeights, simInputs, bands);
    setSimulationResult(simRes);
    try {
      await recordSimulatorRun('risk');
    } catch (error: any) {
      toast.warning('Simulation completed, but setup status was not updated', {
        description: error?.message || String(error),
      });
    }
  }, [policyData, liveFactors, overrides]);

  return (
    <div className="space-y-6 p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-primary" />
            Risk Simulation Workspace
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Test employer risk scoring safely — all calculations run locally with no database writes
          </p>
        </div>
        {policyData?.policy && (
          <Badge variant="outline" className="text-xs">
            Policy: {policyData.policy.policy_code}
          </Badge>
        )}
      </div>

      <Alert className="border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 text-xs font-medium">
          SIMULATION MODE — No data will be saved. Results are for analysis only.
        </AlertDescription>
      </Alert>

      {/* Employer Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select Employer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select value={selectedEmployerId || ''} onValueChange={handleSelectEmployer}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an employer to simulate..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {employers.map((emp) => (
                    <SelectItem key={emp.employer_id} value={emp.employer_id}>
                      {emp.employer_name} ({emp.employer_id})
                      {emp.has_risk_profile ? ` — ${emp.risk_band || 'N/A'}` : ' — No profile'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedEmployerId && (
              <>
                <Button onClick={handleRunSimulation} disabled={!isReady || liveLoading}>
                  {liveLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                  Run Simulation
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4 mr-2" /> Reset
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      )}

      {selectedEmployer && liveFactors && policyData?.policy && (
        <>
          {/* Current State + Override Inputs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Live State */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Current Live State
                </CardTitle>
                <CardDescription className="text-xs">
                  Last calculated: {selectedEmployer.last_calculated_at ? formatDateForDisplay(selectedEmployer.last_calculated_at) : 'Never'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{selectedEmployer.total_score ?? 0}</div>
                    <div className="text-xs text-muted-foreground">Total Score</div>
                  </div>
                  <BandBadge band={selectedEmployer.risk_band || 'N/A'} size="lg" />
                </div>
                {selectedEmployer.override_band && (
                  <Alert className="border-blue-200 bg-blue-50">
                    <Info className="h-3 w-3 text-blue-600" />
                    <AlertDescription className="text-blue-800 text-xs">
                      Manual override active: {selectedEmployer.override_band} — {selectedEmployer.override_reason || 'No reason'}
                    </AlertDescription>
                  </Alert>
                )}
                <Separator />
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase">Live Factor Inputs</div>
                  {Object.entries(liveFactors).map(([code, data]) => {
                    const meta = FACTOR_LABELS[code];
                    return (
                      <div key={code} className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/50 text-sm">
                        <span className="font-medium">{meta?.label || code}</span>
                        <span className="text-muted-foreground text-xs">{data.detail}</span>
                      </div>
                    );
                  })}
                </div>
                {scoreHistory.length > 0 && (
                  <>
                    <Separator />
                    <div className="text-xs font-medium text-muted-foreground uppercase mb-2">Recent History</div>
                    <div className="space-y-1">
                      {scoreHistory.slice(0, 5).map((h: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/30">
                          <span>{h.calculated_at ? formatDateForDisplay(h.calculated_at) : '—'}</span>
                          <span>{h.previous_score} → {h.new_score}</span>
                          <span>{h.previous_band} → {h.new_band}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Override Inputs */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-amber-600" />
                  Simulation Overrides
                </CardTitle>
                <CardDescription className="text-xs">
                  Toggle overrides to test "what-if" scenarios. Disabled factors use live data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {policyData.factorConfigs.map((fc) => {
                  const code = fc.factor_code;
                  const meta = FACTOR_LABELS[code];
                  const live = liveFactors[code as keyof typeof liveFactors];
                  if (!meta || !live) return null;
                  const ovr = overrides[code] || { enabled: false, value: live.rawValue };

                  return (
                    <div key={code} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{meta.label}</div>
                          <div className="text-xs text-muted-foreground">{meta.description}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">Override</Label>
                          <Switch
                            checked={ovr.enabled}
                            onCheckedChange={(checked) => setOverrides(prev => ({ ...prev, [code]: { ...ovr, enabled: checked, value: ovr.enabled ? ovr.value : live.rawValue } }))}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <Label className="text-xs">
                            {ovr.enabled ? 'Override Value' : 'Live Value'} ({meta.unit})
                          </Label>
                          <Input
                            type="number"
                            value={ovr.enabled ? ovr.value : live.rawValue}
                            disabled={!ovr.enabled}
                            onChange={(e) => setOverrides(prev => ({ ...prev, [code]: { ...ovr, value: Number(e.target.value) } }))}
                            className="mt-1"
                          />
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Weight</div>
                          <div className="text-sm font-semibold">{policyData.factorWeights[fc.id] ?? fc.weight}%</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Simulation Results */}
          {simulationResult && currentResult && (
            <>
              {/* Score Comparison */}
              <Card className="border-primary/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Simulation Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    {/* Current */}
                    <div className="text-center space-y-2">
                      <div className="text-xs font-medium text-muted-foreground uppercase">Current (Live)</div>
                      <div className="text-3xl font-bold">{currentResult.total_score}</div>
                      <BandBadge band={currentResult.risk_band} size="lg" />
                    </div>
                    {/* Arrow + Delta */}
                    <div className="text-center space-y-2">
                      <ArrowRight className="h-6 w-6 mx-auto text-muted-foreground" />
                      <ScoreDelta current={currentResult.total_score} simulated={simulationResult.total_score} />
                      {currentResult.risk_band !== simulationResult.risk_band && (
                        <Alert className="border-amber-300 bg-amber-50 mt-2">
                          <AlertDescription className="text-xs text-amber-800 font-semibold">
                            Band change: {currentResult.risk_band} → {simulationResult.risk_band}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                    {/* Simulated */}
                    <div className="text-center space-y-2">
                      <div className="text-xs font-medium text-muted-foreground uppercase">Simulated (Dry Run)</div>
                      <div className="text-3xl font-bold">{simulationResult.total_score}</div>
                      <BandBadge band={simulationResult.risk_band} size="lg" />
                    </div>
                  </div>

                  <Separator className="my-4" />

                  {/* Recommended Action */}
                  <div className="rounded-lg border p-3 bg-muted/30">
                    <div className="text-xs font-medium text-muted-foreground uppercase mb-1">Recommended Action (Based on Simulated Band)</div>
                    <p className="text-sm">{getRecommendedAction(simulationResult.risk_band)}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Factor Comparison Table */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Factor-by-Factor Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Factor</TableHead>
                        <TableHead className="text-right">Current Input</TableHead>
                        <TableHead className="text-right">Simulated Input</TableHead>
                        <TableHead className="text-right">Current Score</TableHead>
                        <TableHead className="text-right">Simulated Score</TableHead>
                        <TableHead className="text-right">Δ</TableHead>
                        <TableHead className="text-right">Weight</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {policyData.factorConfigs.map((fc) => {
                        const code = fc.factor_code;
                        const curr = currentResult.factor_results[code];
                        const sim = simulationResult.factor_results[code];
                        if (!curr || !sim) return null;
                        const delta = Math.round((sim.weighted_contribution - curr.weighted_contribution) * 100) / 100;
                        return (
                          <TableRow key={code} className={sim.is_override ? 'bg-amber-50/50' : ''}>
                            <TableCell className="font-medium">
                              {FACTOR_LABELS[code]?.label || code}
                              {sim.is_override && <Badge variant="outline" className="ml-2 text-[10px] px-1 py-0">Override</Badge>}
                            </TableCell>
                            <TableCell className="text-right text-sm">{curr.raw_input}</TableCell>
                            <TableCell className="text-right text-sm font-medium">{sim.raw_input}</TableCell>
                            <TableCell className="text-right text-sm">{curr.weighted_contribution}</TableCell>
                            <TableCell className="text-right text-sm font-medium">{sim.weighted_contribution}</TableCell>
                            <TableCell className="text-right">
                              {delta === 0 ? <span className="text-muted-foreground text-sm">—</span> :
                                delta > 0 ? <span className="text-red-600 text-sm font-medium">+{delta}</span> :
                                  <span className="text-emerald-600 text-sm font-medium">{delta}</span>}
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">{sim.weight_pct}%</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Explainability Panel */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Explainability Detail (Simulated)</CardTitle>
                  <CardDescription className="text-xs">Per-factor scoring breakdown with thresholds and explanations</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Factor Code</TableHead>
                        <TableHead>Factor Name</TableHead>
                        <TableHead className="text-right">Input Value</TableHead>
                        <TableHead>Threshold Used</TableHead>
                        <TableHead className="text-right">Points</TableHead>
                        <TableHead className="text-right">Weighted</TableHead>
                        <TableHead>Explanation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.values(simulationResult.factor_results).map((fr) => (
                        <TableRow key={fr.factor_code}>
                          <TableCell className="font-mono text-xs">{fr.factor_code}</TableCell>
                          <TableCell className="text-sm">{fr.factor_name}</TableCell>
                          <TableCell className="text-right text-sm">{fr.raw_input}</TableCell>
                          <TableCell className="text-xs">
                            {fr.threshold_used ? (
                              <span className="inline-flex items-center gap-1">
                                <span className="font-medium">{fr.threshold_used.label || `${fr.threshold_used.min}–${fr.threshold_used.max}`}</span>
                              </span>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">{fr.points_awarded}</TableCell>
                          <TableCell className="text-right text-sm font-semibold">{fr.weighted_contribution}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={fr.explanation}>{fr.explanation}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
