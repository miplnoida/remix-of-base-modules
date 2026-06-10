import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FlaskConical, Play, RotateCcw, ToggleLeft, ToggleRight, Download, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import EmployerSelector from '@/components/compliance/simulator/EmployerSelector';
import ComplianceSnapshot from '@/components/compliance/simulator/ComplianceSnapshot';
import ScenarioInputs from '@/components/compliance/simulator/ScenarioInputs';
import SimulationResults from '@/components/compliance/simulator/SimulationResults';
import RecommendedAction from '@/components/compliance/simulator/RecommendedAction';
import ExplanationPanel from '@/components/compliance/simulator/ExplanationPanel';
import { useSimulatorRules, useEmployerComplianceContext } from '@/hooks/compliance/useSimulatorData';
import { useSaveSimulationRun } from '@/hooks/compliance/useSimulationRuns';
import { useHasPermission } from '@/hooks/useNavigationMenu';
import {
  createDefaultFactContext,
  runSimulation,
  runMultiPeriodSimulation,
  type SimulationFactContext,
  type SimulationOutput,
} from '@/services/complianceSimulatorEngine';
import { Switch } from '@/components/ui/switch';

export default function RuleSimulator() {
  const [selectedRegNo, setSelectedRegNo] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isManualMode, setIsManualMode] = useState(false);
  const [facts, setFacts] = useState<SimulationFactContext>(createDefaultFactContext());
  const [output, setOutput] = useState<SimulationOutput | null>(null);
  const [overriddenFields, setOverriddenFields] = useState<Set<string>>(new Set());
  const [ruleCodeFilter, setRuleCodeFilter] = useState<string>('__all__');
  const [periodOverride, setPeriodOverride] = useState<string>('');
  const [scanAllPeriods, setScanAllPeriods] = useState<boolean>(true);

  const canSave = useHasPermission('ce_rule_simulator', 'edit') || useHasPermission('ce_rule_simulator', 'manage');
  const saveRun = useSaveSimulationRun();

  const { data: rules, isLoading: rulesLoading } = useSimulatorRules();
  const { data: context, isLoading: contextLoading } = useEmployerComplianceContext(selectedRegNo, periodOverride || null);

  // When employer context loads, populate facts
  const handleEmployerSelect = useCallback((regno: string, name: string, status: string) => {
    setSelectedRegNo(regno);
    setSelectedName(name);
    setSelectedStatus(status);
    setOutput(null);
    setOverriddenFields(new Set());
  }, []);

  // Merge context into facts when context loads
  useMemo(() => {
    if (context?.facts && !isManualMode) {
      setFacts(prev => ({
        ...createDefaultFactContext(),
        ...context.facts,
        overriddenFields: [],
      }));
    }
  }, [context, isManualMode]);

  // When switching to manual mode, keep current facts as base
  const toggleMode = useCallback(() => {
    setIsManualMode(prev => !prev);
    setOutput(null);
  }, []);

  const handleFactChange = useCallback((field: keyof SimulationFactContext, value: any) => {
    setFacts(prev => ({ ...prev, [field]: value }));
    setOverriddenFields(prev => {
      const next = new Set(prev);
      next.add(field);
      return next;
    });
  }, []);

  const handleRun = useCallback(() => {
    if (!rules) {
      toast.error('Rules not loaded yet');
      return;
    }

    const factsWithOverrides = {
      ...facts,
      overriddenFields: Array.from(overriddenFields),
    };

    // Multi-period scan only when: live employer mode + no manual period override + toggle ON.
    const useMultiPeriod = !isManualMode && !periodOverride && scanAllPeriods && context?.periodFacts && context.periodFacts.length > 0;

    const result = useMultiPeriod
      ? runMultiPeriodSimulation(
          context!.periodFacts.map(pf => ({
            period: pf.period,
            facts: { ...createDefaultFactContext(), ...pf.facts, overriddenFields: [] } as SimulationFactContext,
          })),
          rules.detectionRules,
          rules.calculationRules,
          rules.escalationRules,
          rules.violationTypes,
          {
            ruleCodeFilter: ruleCodeFilter === '__all__' ? null : ruleCodeFilter,
            existingViolationsByVtId: context?.existingViolationsByVtId ?? {},
            existingViolationsByVtIdPeriod: context?.existingViolationsByVtIdPeriod ?? {},
          }
        )
      : runSimulation(
          factsWithOverrides,
          rules.detectionRules,
          rules.calculationRules,
          rules.escalationRules,
          rules.violationTypes,
          {
            ruleCodeFilter: ruleCodeFilter === '__all__' ? null : ruleCodeFilter,
            existingViolationsByVtId: context?.existingViolationsByVtId ?? {},
            existingViolationsByVtIdPeriod: context?.existingViolationsByVtIdPeriod ?? {},
          }
        );

    setOutput(result);
    const dup = result.summary.duplicatesSuppressed;
    toast.success(
      `Simulation complete: ${result.summary.matchedDetections} detection(s) matched` +
        (dup > 0 ? ` — ${dup} suppressed as duplicate` : '') +
        (useMultiPeriod ? ` (scanned ${context!.periodFacts.length} period(s))` : '')
    );
  }, [facts, rules, overriddenFields, ruleCodeFilter, context, isManualMode, periodOverride, scanAllPeriods]);

  const handleReset = useCallback(() => {
    setFacts(createDefaultFactContext());
    setOutput(null);
    setOverriddenFields(new Set());
    setRuleCodeFilter('__all__');
    setPeriodOverride('');
    if (context?.facts) {
      setFacts(prev => ({ ...prev, ...context.facts, overriddenFields: [] }));
    }
  }, [context]);

  const handleSaveRun = useCallback(() => {
    if (!output) {
      toast.error('Run a simulation first');
      return;
    }
    saveRun.mutate(
      {
        ruleCode: ruleCodeFilter === '__all__' ? null : ruleCodeFilter,
        ruleType: 'all',
        employerRegno: selectedRegNo,
        period: periodOverride || facts.filingPeriod || null,
        facts,
        output,
      },
      {
        onSuccess: () => toast.success('Simulation run saved'),
        onError: (e: any) => toast.error(`Failed to save: ${e?.message ?? 'unknown error'}`),
      }
    );
  }, [output, saveRun, ruleCodeFilter, selectedRegNo, periodOverride, facts]);

  const handleExport = useCallback(() => {
    if (!output) {
      toast.error('Run a simulation first');
      return;
    }
    const payload = {
      exportedAt: new Date().toISOString(),
      employer: { regno: selectedRegNo, name: selectedName, status: selectedStatus },
      ruleCodeFilter: ruleCodeFilter === '__all__' ? null : ruleCodeFilter,
      periodOverride: periodOverride || null,
      facts,
      output,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulation-${selectedRegNo ?? 'manual'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Simulation exported');
  }, [output, selectedRegNo, selectedName, selectedStatus, ruleCodeFilter, periodOverride, facts]);

  return (
    <div className="space-y-4">
      {/* Simulation banner */}
      <div className="rounded-lg border-2 border-dashed border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 p-3 flex items-center gap-3">
        <FlaskConical className="h-5 w-5 text-amber-600" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Simulation Mode — Dry Run Only
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400">
            No live violations, ledger entries, notices, or escalations will be created. All evaluation is read-only.
          </p>
        </div>
      </div>

      {/* Header + controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            Compliance Rule Simulator
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Test configured detection, calculation, and escalation rules safely
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={ruleCodeFilter} onValueChange={setRuleCodeFilter}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue placeholder="All rules" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All enabled rules</SelectItem>
              {rules?.detectionRules.map(r => (
                <SelectItem key={`d-${r.id}`} value={r.rule_code}>
                  {r.rule_code} — {r.name}
                </SelectItem>
              ))}
              {rules?.calculationRules.map(r => (
                <SelectItem key={`c-${r.id}`} value={r.rule_code}>
                  {r.rule_code} — {r.name}
                </SelectItem>
              ))}
              {rules?.escalationRules.map(r => (
                <SelectItem key={`e-${r.id}`} value={r.rule_code}>
                  {r.rule_code} — {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Label htmlFor="period-override" className="text-xs text-muted-foreground">
              Period
            </Label>
            <Input
              id="period-override"
              type="month"
              value={periodOverride}
              onChange={e => setPeriodOverride(e.target.value)}
              className="h-8 w-[150px] text-xs"
              disabled={scanAllPeriods && !isManualMode}
              title={scanAllPeriods && !isManualMode ? 'Disable "Scan last 12 months" to pick a single period' : ''}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Switch
              id="scan-all-periods"
              checked={scanAllPeriods}
              onCheckedChange={setScanAllPeriods}
              disabled={isManualMode}
            />
            <Label htmlFor="scan-all-periods" className="text-xs text-muted-foreground cursor-pointer">
              Scan last 12 months
            </Label>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleMode}
            className="gap-1.5 text-xs"
          >
            {isManualMode ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
            {isManualMode ? 'Manual Scenario' : 'Live Data'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 text-xs">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
          <Button size="sm" onClick={handleRun} disabled={rulesLoading} className="gap-1.5 text-xs">
            <Play className="h-3.5 w-3.5" /> Run Simulation
          </Button>
          {canSave && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveRun}
              disabled={!output || saveRun.isPending}
              className="gap-1.5 text-xs"
            >
              <Save className="h-3.5 w-3.5" /> Save Run
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!output}
            className="gap-1.5 text-xs"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </div>

      {/* Missing data / warnings / errors */}
      {output && (output.missingData.length > 0 || output.warnings.length > 0 || output.errors.length > 0) && (
        <div className="space-y-2">
          {output.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Evaluation errors</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4 text-xs space-y-0.5">
                  {output.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          {output.missingData.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Missing data — results may be incomplete</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4 text-xs space-y-0.5">
                  {output.missingData.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          {output.warnings.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warnings</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4 text-xs space-y-0.5">
                  {output.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Employer selector */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1 w-full">
              <EmployerSelector selectedRegNo={selectedRegNo} onSelect={handleEmployerSelect} />
            </div>
            {selectedRegNo && (
              <div className="flex items-center gap-2 text-xs shrink-0">
                <span className="font-mono text-muted-foreground">{selectedRegNo}</span>
                <span className="font-medium">{selectedName}</span>
                <Badge variant={selectedStatus === 'A' ? 'default' : selectedStatus === 'I' ? 'secondary' : 'destructive'} className="text-[10px]">
                  {selectedStatus === 'A' ? 'Active' : selectedStatus === 'I' ? 'Inactive' : selectedStatus === 'D' ? 'Deregistered' : selectedStatus}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main layout: left panel + right panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* Left panel */}
        <div className="space-y-4">
          <ComplianceSnapshot
            snapshot={context?.snapshot || null}
            isLoading={contextLoading}
          />
          <ScenarioInputs
            facts={facts}
            onChange={handleFactChange}
            isManualMode={isManualMode}
          />
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          <SimulationResults output={output} />
          <RecommendedAction output={output} />
        </div>
      </div>

      {/* Bottom explanation */}
      {output && (
        <ExplanationPanel facts={facts} isManualMode={isManualMode} />
      )}
    </div>
  );
}
