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
import SimulatorDataCoverage from '@/components/compliance/simulator/SimulatorDataCoverage';
import { useSimulatorRules, useEmployerComplianceContext } from '@/hooks/compliance/useSimulatorData';
// Save Run removed by request — functionality not used

import {
  createDefaultFactContext,
  runSimulation,
  runMultiPeriodSimulation,
  type SimulationFactContext,
  type SimulationOutput,
} from '@/services/complianceSimulatorEngine';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';

const SIMULATOR_PREVIEW_VERSION = 'Test Preview UI v2 — period scan + coverage enabled';

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
  const [matchesOnly, setMatchesOnly] = useState<boolean>(true);




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

  const handleRun = useCallback(async () => {
    if (!rules) {
      toast.error('Rules not loaded yet');
      return;
    }
    // Guard: in live-employer mode, require the user to pick an employer from
    // the auto-suggestion list. Typing a name without selecting leaves
    // selectedRegNo null, which previously ran the simulator with default
    // (empty) facts and always produced a bogus "Unregistered Employer" match.
    if (!isManualMode && !selectedRegNo) {
      toast.error('Select an employer from the suggestions before running the simulation.');
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
            matchesOnly,
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
            matchesOnly,
          }
        );

    setOutput(result);
    try {
      await recordSimulatorRun('rule');
    } catch (error: any) {
      toast.warning('Simulation completed, but setup status was not updated', {
        description: error?.message || String(error),
      });
    }
    const dup = result.summary.duplicatesSuppressed;
    toast.success(
      `Simulation complete: ${result.summary.matchedDetections} detection(s) matched` +
        (dup > 0 ? ` — ${dup} suppressed as duplicate` : '') +
        (useMultiPeriod ? ` (scanned ${context!.periodFacts.length} period(s))` : '')
    );
  }, [facts, rules, overriddenFields, ruleCodeFilter, context, isManualMode, selectedRegNo, periodOverride, scanAllPeriods, matchesOnly]);

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




  const handleExport = useCallback(async () => {
    if (!output) {
      toast.error('Run a simulation first');
      return;
    }
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF();
      const money = (n: number | null | undefined) =>
        n == null ? '-' : Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      doc.setFontSize(16);
      doc.setTextColor(0, 155, 76);
      doc.text('Compliance Rule Simulator — Results', 14, 18);

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const meta: [string, string][] = [
        ['Employer', selectedRegNo ? `${selectedName || '-'} (${selectedRegNo})` : 'Manual scenario'],
        ['Status', selectedStatus || '-'],
        ['Rule filter', ruleCodeFilter === '__all__' ? 'All enabled rules' : ruleCodeFilter],
        ['Period', periodOverride || 'Current month (auto)'],
        ['Mode', isManualMode ? 'Manual facts' : 'Live data'],
        ['Exported', new Date().toLocaleString()],
      ];
      let y = 26;
      meta.forEach(([k, v]) => { doc.text(`${k}: ${v}`, 14, y); y += 5; });

      const s = output.summary;
      autoTable(doc, {
        startY: y + 2,
        head: [['Matched', 'Total Detections', 'Applicable Calcs', 'Applicable Escalations', 'Financial Impact', 'Would Create', 'Initial Status', 'Duplicates Suppressed']],
        body: [[
          String(s.matchedDetections), String(s.totalDetections), String(s.applicableCalculations),
          String(s.applicableEscalations), money(s.financialImpact), s.wouldCreateViolation ? 'Yes' : 'No',
          s.initialStatus ?? '-', String(s.duplicatesSuppressed),
        ]],
        theme: 'grid', styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [0, 155, 76], textColor: 255, fontStyle: 'bold' },
      });

      autoTable(doc, {
        head: [['Rule', 'Name', 'Period', 'Outcome', 'Priority', 'Dup', 'Linked Calc', 'Reason']],
        body: output.detectionResults.map(d => [
          d.ruleCode, d.ruleName, d.period ?? '-', d.outcome,
          d.priority ?? '-',
          d.duplicateSuppressed ? `Yes (${d.duplicateCount})` : 'No',
          money(d.linkedCalculationTotal ?? null), d.reason,
        ]),
        theme: 'grid', styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
        headStyles: { fillColor: [0, 155, 76], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 7: { cellWidth: 55 } },
        didDrawPage: () => { doc.setFontSize(11); doc.text('Detection Results', 14, 10); },
        margin: { top: 14 },
      });

      if (output.calculationResults.length) {
        autoTable(doc, {
          head: [['Rule', 'Name', 'Applies', 'Base', 'Simulated', 'Fund', 'Formula', 'Reason']],
          body: output.calculationResults.map(c => [
            c.ruleCode, c.ruleName, c.applies ? 'Yes' : 'No', money(c.baseAmount),
            money(c.simulatedAmount), c.fundType ?? '-', c.formulaSummary, c.skippedReason || c.reason,
          ]),
          theme: 'grid', styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
          headStyles: { fillColor: [0, 155, 76], textColor: 255, fontStyle: 'bold' },
          didDrawPage: () => { doc.setFontSize(11); doc.text('Calculation Results', 14, 10); },
          margin: { top: 14 },
        });
      }

      if (output.escalationResults.length) {
        autoTable(doc, {
          head: [['Rule', 'Name', 'Applies', 'From', 'To', 'Auto', 'Approval', 'Reason']],
          body: output.escalationResults.map(e => [
            e.ruleCode, e.ruleName, e.applies ? 'Yes' : 'No', e.fromStatus, e.toStatus,
            e.autoEscalate ? 'Yes' : 'No', e.requiresApproval ? 'Yes' : 'No', e.reason,
          ]),
          theme: 'grid', styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
          headStyles: { fillColor: [0, 155, 76], textColor: 255, fontStyle: 'bold' },
          didDrawPage: () => { doc.setFontSize(11); doc.text('Escalation Results', 14, 10); },
          margin: { top: 14 },
        });
      }

      const notes: [string, string[]][] = [
        ['Recommendations', output.recommendations],
        ['Warnings', output.warnings],
        ['Missing data', output.missingData],
        ['Errors', output.errors],
      ];
      notes.forEach(([title, items]) => {
        if (!items?.length) return;
        autoTable(doc, {
          head: [[title]],
          body: items.map(i => [i]),
          theme: 'grid', styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
          headStyles: { fillColor: [0, 155, 76], textColor: 255, fontStyle: 'bold' },
        });
      });

      const pages = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8); doc.setTextColor(128);
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.text(
          `Generated ${new Date().toLocaleString()} — Page ${i} of ${pages}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: 'center' },
        );
      }

      doc.save(`simulation-${selectedRegNo ?? 'manual'}-${Date.now()}.pdf`);
      toast.success('Simulation exported (PDF)');
    } catch (e: any) {
      toast.error('Export failed', { description: e?.message || String(e) });
    }
  }, [output, selectedRegNo, selectedName, selectedStatus, ruleCodeFilter, periodOverride, isManualMode]);

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
      <div className="space-y-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              Compliance Rule Simulator
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Test configured detection, calculation, and escalation rules safely
            </p>
          </div>
          <Badge variant="outline" className="w-fit text-[11px] font-medium">
            {SIMULATOR_PREVIEW_VERSION}
          </Badge>
        </div>

        <div className="rounded-lg border bg-card p-3 space-y-3">
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
            <Select
              value={periodOverride || '__current__'}
              onValueChange={v => setPeriodOverride(v === '__current__' ? '' : v)}
              disabled={scanAllPeriods && !isManualMode}
            >
              <SelectTrigger className="h-8 w-[170px] text-xs" title={scanAllPeriods && !isManualMode ? 'Disable "Scan last 12 months" to pick a single period' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__current__">Current month (default)</SelectItem>
                {Array.from({ length: 12 }).map((_, i) => {
                  const d = new Date();
                  d.setDate(1);
                  d.setMonth(d.getMonth() - i);
                  const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                  const label = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
                  return <SelectItem key={val} value={val}>{label}</SelectItem>;
                })}
              </SelectContent>
            </Select>
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
        </div>

        <div className="flex flex-wrap items-center gap-3">
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
          <div className="flex items-center gap-1.5">
            <Switch
              id="matches-only"
              checked={matchesOnly}
              onCheckedChange={setMatchesOnly}
            />
            <Label htmlFor="matches-only" className="text-xs text-muted-foreground cursor-pointer" title="Only return rules that matched — non-matched rules are dropped at the engine layer before results render.">
              Matches only
            </Label>
          </div>
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 text-xs">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
          <Button size="sm" onClick={handleRun} disabled={rulesLoading} className="gap-1.5 text-xs">
            <Play className="h-3.5 w-3.5" /> Run Simulation
          </Button>
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
          <SimulatorDataCoverage
            coverage={context?.coverage ?? null}
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
