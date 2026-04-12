import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FlaskConical, Play, RotateCcw, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import EmployerSelector from '@/components/compliance/simulator/EmployerSelector';
import ComplianceSnapshot from '@/components/compliance/simulator/ComplianceSnapshot';
import ScenarioInputs from '@/components/compliance/simulator/ScenarioInputs';
import SimulationResults from '@/components/compliance/simulator/SimulationResults';
import RecommendedAction from '@/components/compliance/simulator/RecommendedAction';
import ExplanationPanel from '@/components/compliance/simulator/ExplanationPanel';
import { useSimulatorRules, useEmployerComplianceContext } from '@/hooks/compliance/useSimulatorData';
import {
  createDefaultFactContext,
  runSimulation,
  type SimulationFactContext,
  type SimulationOutput,
} from '@/services/complianceSimulatorEngine';

export default function RuleSimulator() {
  const [selectedRegNo, setSelectedRegNo] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isManualMode, setIsManualMode] = useState(false);
  const [facts, setFacts] = useState<SimulationFactContext>(createDefaultFactContext());
  const [output, setOutput] = useState<SimulationOutput | null>(null);
  const [overriddenFields, setOverriddenFields] = useState<Set<string>>(new Set());

  const { data: rules, isLoading: rulesLoading } = useSimulatorRules();
  const { data: context, isLoading: contextLoading } = useEmployerComplianceContext(selectedRegNo);

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

    const result = runSimulation(
      factsWithOverrides,
      rules.detectionRules,
      rules.calculationRules,
      rules.escalationRules,
      rules.violationTypes
    );

    setOutput(result);
    toast.success(`Simulation complete: ${result.summary.matchedDetections} detection(s) matched`);
  }, [facts, rules, overriddenFields]);

  const handleReset = useCallback(() => {
    setFacts(createDefaultFactContext());
    setOutput(null);
    setOverriddenFields(new Set());
    if (context?.facts) {
      setFacts(prev => ({ ...prev, ...context.facts, overriddenFields: [] }));
    }
  }, [context]);

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
        <div className="flex items-center gap-2">
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
        </div>
      </div>

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
