import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Plus, BarChart3, AlertTriangle, TrendingUp, Shield } from 'lucide-react';
import { PageShell, StandardSearchFilterBar, DataTable, StandardModal, StatusBadge, ExportDropdown } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { useIARiskAssessments } from '@/hooks/useAuditDataPhase2';
import { useIADepartments, useIADepartmentFunctions, useIAAuditors } from '@/hooks/useAuditData';
import { useIARiskScoringModel, useIARiskCriteriaWeights, useIAFrequencyMapping } from '@/hooks/useAuditConfigData';
import { useAuditFields } from '@/hooks/useAuditTrail';
import { MetricCard } from '@/components/shared/MetricCard';
import { RISK_ASSESSMENT_SCHEMA, toExportColumns } from '@/config/moduleFieldSchemas';

const RISK_LEVELS = ['Critical', 'High', 'Medium', 'Low'];
const exportColumns = toExportColumns(RISK_ASSESSMENT_SCHEMA);

interface CriterionScore {
  criterion_id: string;
  criterion_name: string;
  weight: number;
  max_score: number;
  score: number;
}

export default function RiskAssessment() {
  const { data = [], isLoading, isError, create, update } = useIARiskAssessments();
  const { data: departments = [] } = useIADepartments();
  const { data: auditors = [] } = useIAAuditors();
  const { data: scoringModel } = useIARiskScoringModel();
  const { data: criteriaWeights = [] } = useIARiskCriteriaWeights(scoringModel?.id);
  const { data: frequencyMap = {} } = useIAFrequencyMapping();
  const { getCreateFields, getUpdateFields } = useAuditFields();

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ risk_level: 'all', department: 'all' });
  const [modalState, setModalState] = useState<{ mode: 'create' | 'edit' | 'view' | null; record?: any }>({ mode: null });

  // Form state
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedFunctionId, setSelectedFunctionId] = useState('');
  const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().slice(0, 10));
  const [assessedBy, setAssessedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [criterionScores, setCriterionScores] = useState<CriterionScore[]>([]);

  const { data: deptFunctions = [] } = useIADepartmentFunctions(selectedDeptId || undefined);

  // Build department + function lookup maps
  const deptMap = useMemo(() => new Map((departments as any[]).map((d: any) => [d.id, d])), [departments]);
  const funcMap = useMemo(() => {
    const map = new Map<string, any>();
    // We need all functions for display, not just filtered by dept
    return map;
  }, []);

  // Calculate overall score
  const { overallScore, riskLevel, suggestedFrequency } = useMemo(() => {
    if (criterionScores.length === 0) return { overallScore: 0, riskLevel: 'Low', suggestedFrequency: '' };
    const totalWeight = criterionScores.reduce((sum, c) => sum + c.weight, 0);
    const weightedScore = totalWeight > 0
      ? criterionScores.reduce((sum, c) => sum + (c.score * c.weight / 100), 0)
      : 0;
    const score = Math.round(weightedScore * 100) / 100;

    let level = 'Low';
    if (scoringModel) {
      if (score >= (scoringModel.critical_threshold || 90)) level = 'Critical';
      else if (score >= (scoringModel.high_threshold || 75)) level = 'High';
      else if (score >= (scoringModel.medium_threshold || 50)) level = 'Medium';
    }

    const months = frequencyMap[level] || 12;
    const freq = months <= 6 ? 'Semi-Annual' : months <= 12 ? 'Annual' : months <= 24 ? 'Bi-Annual' : `Every ${Math.round(months / 12)} Years`;

    return { overallScore: score, riskLevel: level, suggestedFrequency: freq };
  }, [criterionScores, scoringModel, frequencyMap]);

  // Initialize criterion scores from weights
  const initCriterionScores = (existingScores?: Record<string, number>) => {
    setCriterionScores(
      criteriaWeights.map((cw: any) => ({
        criterion_id: cw.id,
        criterion_name: cw.criterion_name,
        weight: Number(cw.weight) || 0,
        max_score: Number(cw.max_score) || 100,
        score: existingScores?.[cw.criterion_name] ?? 0,
      }))
    );
  };

  const resetForm = () => {
    setSelectedDeptId('');
    setSelectedFunctionId('');
    setAssessmentDate(new Date().toISOString().slice(0, 10));
    setAssessedBy('');
    setNotes('');
    setCriterionScores([]);
  };

  const openAdd = () => {
    resetForm();
    initCriterionScores();
    setModalState({ mode: 'create' });
  };

  const openEdit = (r: any) => {
    // Try to resolve department from function
    const fn = (deptFunctions as any[]).find((f: any) => f.id === r.function_id);
    setSelectedDeptId(fn?.department_id || '');
    setSelectedFunctionId(r.function_id || '');
    setAssessmentDate(r.assessment_date || '');
    setAssessedBy(r.assessed_by || '');
    setNotes(r.notes || '');
    // Parse existing scores from individual columns
    const existingScores: Record<string, number> = {};
    if (r.impact_score) existingScores['Financial Exposure'] = Number(r.impact_score);
    if (r.likelihood_score) existingScores['Operational Criticality'] = Number(r.likelihood_score);
    if (r.control_effectiveness_score) existingScores['Control Weakness'] = Number(r.control_effectiveness_score);
    if (r.regulatory_score) existingScores['Compliance Sensitivity'] = Number(r.regulatory_score);
    if (r.velocity_score) existingScores['Time Since Last Audit'] = Number(r.velocity_score);
    initCriterionScores(existingScores);
    setModalState({ mode: 'edit', record: r });
  };

  const openView = (r: any) => {
    openEdit(r);
    setModalState({ mode: 'view', record: r });
  };

  const setCriterionScore = (index: number, score: number) => {
    setCriterionScores(prev => prev.map((c, i) => i === index ? { ...c, score: Math.min(Math.max(score, 0), c.max_score) } : c));
  };

  const handleSave = () => {
    const payload: any = {
      function_id: selectedFunctionId || null,
      assessment_date: assessmentDate,
      assessed_by: assessedBy,
      overall_risk_score: overallScore,
      risk_level: riskLevel,
      notes,
      // Store scores in existing columns for backward compatibility
      impact_score: criterionScores.find(c => c.criterion_name === 'Financial Exposure')?.score || 0,
      likelihood_score: criterionScores.find(c => c.criterion_name === 'Operational Criticality')?.score || 0,
      control_effectiveness_score: criterionScores.find(c => c.criterion_name === 'Control Weakness')?.score || 0,
      regulatory_score: criterionScores.find(c => c.criterion_name === 'Compliance Sensitivity')?.score || 0,
      velocity_score: criterionScores.find(c => c.criterion_name === 'Time Since Last Audit')?.score || 0,
      reputational_score: 0,
    };

    if (modalState.mode === 'create') {
      create.mutate({ ...payload, ...getCreateFields() } as any, { onSuccess: () => { setModalState({ mode: null }); resetForm(); } });
    } else if (modalState.mode === 'edit' && modalState.record) {
      update.mutate({ id: modalState.record.id, ...payload, ...getUpdateFields() } as any, { onSuccess: () => { setModalState({ mode: null }); resetForm(); } });
    }
  };

  // Filter logic
  const filtered = data.filter((r: any) => {
    const s = searchTerm.toLowerCase();
    const matchSearch = !s || r.assessed_by?.toLowerCase().includes(s) || r.notes?.toLowerCase().includes(s) || r.risk_level?.toLowerCase().includes(s);
    const matchLevel = filters.risk_level === 'all' || r.risk_level === filters.risk_level;
    return matchSearch && matchLevel;
  });

  const stats = {
    total: data.length,
    critical: data.filter((d: any) => d.risk_level === 'Critical').length,
    high: data.filter((d: any) => d.risk_level === 'High').length,
    avgScore: data.length ? Math.round(data.reduce((acc: number, d: any) => acc + (Number(d.overall_risk_score) || 0), 0) / data.length) : 0,
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'function_id', header: 'Function', render: (r) => r.function_id ? 'Linked' : '—' },
    { key: 'assessment_date', header: 'Assessment Date' },
    { key: 'assessed_by', header: 'Assessed By' },
    { key: 'overall_risk_score', header: 'Overall Score' },
    { key: 'risk_level', header: 'Risk Level', render: (r) => <StatusBadge status={r.risk_level} /> },
  ];

  const filterFields: StandardFilterField[] = [
    { key: 'risk_level', label: 'Risk Level', type: 'select', options: [{ label: 'All', value: 'all' }, ...RISK_LEVELS.map(t => ({ label: t, value: t }))] },
    { key: 'department', label: 'Department', type: 'select', options: [{ label: 'All Departments', value: 'all' }, ...(departments as any[] || []).map((d: any) => ({ label: d.name, value: d.id }))] },
  ];

  const exportData = filtered.map((r: any) => ({ ...r }));
  const isReadOnly = modalState.mode === 'view';

  return (
    <PageShell title="Risk Assessment" subtitle="Assess and score department functions for audit planning"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/dashboard' }, { label: 'Risk Assessment' }]}
      actions={
        <div className="flex items-center gap-2">
          <ExportDropdown data={exportData} columns={exportColumns} fileName={RISK_ASSESSMENT_SCHEMA.exportFileName} title={RISK_ASSESSMENT_SCHEMA.exportTitle} />
          <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />New Assessment</Button>
        </div>
      }
      isLoading={isLoading} error={isError ? 'Failed to load' : null}>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Assessments" value={stats.total} icon={BarChart3} variant="info" />
        <MetricCard title="Critical" value={stats.critical} icon={AlertTriangle} variant="error" />
        <MetricCard title="High Risk" value={stats.high} icon={Shield} variant="warning" />
        <MetricCard title="Avg Score" value={stats.avgScore} icon={TrendingUp} variant="default" />
      </div>

      <Card><CardContent className="p-4">
        <StandardSearchFilterBar searchValue={searchTerm} onSearchChange={setSearchTerm} searchPlaceholder="Search assessments..." filterValues={filters} onFilterChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))} filters={filterFields} onReset={() => { setSearchTerm(''); setFilters({ risk_level: 'all', department: 'all' }); }} />
      </CardContent></Card>

      <Card><CardContent>
        <DataTable columns={columns} data={filtered} onView={openView}
          renderActions={(row) => <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(row); }}>Edit</Button>} />
      </CardContent></Card>

      <StandardModal open={modalState.mode !== null} onOpenChange={() => { setModalState({ mode: null }); resetForm(); }}
        title={modalState.mode === 'create' ? 'New Risk Assessment' : modalState.mode === 'edit' ? 'Edit Assessment' : 'View Assessment'}
        mode={modalState.mode || 'view'} onSave={handleSave} saveLabel="Save" isSaving={create.isPending || update.isPending}>
        <div className="space-y-4">
          {/* Department + Function cascading dropdowns */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Department</Label>
              <Select value={selectedDeptId} onValueChange={(v) => { setSelectedDeptId(v); setSelectedFunctionId(''); }} disabled={isReadOnly}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>{(departments as any[]).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Function</Label>
              <Select value={selectedFunctionId} onValueChange={setSelectedFunctionId} disabled={isReadOnly || !selectedDeptId}>
                <SelectTrigger><SelectValue placeholder={selectedDeptId ? 'Select function' : 'Select department first'} /></SelectTrigger>
                <SelectContent>{(deptFunctions as any[]).map((f: any) => <SelectItem key={f.id} value={f.id}>{f.function_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><Label>Assessment Date</Label><Input type="date" value={assessmentDate} onChange={e => setAssessmentDate(e.target.value)} disabled={isReadOnly} /></div>
            <div>
              <Label>Assessed By</Label>
              <Select value={assessedBy} onValueChange={setAssessedBy} disabled={isReadOnly}>
                <SelectTrigger><SelectValue placeholder="Select auditor" /></SelectTrigger>
                <SelectContent>
                  {(auditors as any[]).map((a: any) => (
                    <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dynamic criteria sliders */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground pt-2">Risk Scoring Criteria</p>
            {criterionScores.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No risk criteria configured. Please configure criteria in System Configuration.</p>
            )}
            {criterionScores.map((c, idx) => (
              <div key={c.criterion_id} className="space-y-1 p-3 rounded-md border">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{c.criterion_name} <span className="text-muted-foreground font-normal">({c.weight}%)</span></Label>
                  <span className="text-sm font-bold tabular-nums w-10 text-right">{c.score}</span>
                </div>
                <Slider
                  value={[c.score]}
                  onValueChange={([v]) => setCriterionScore(idx, v)}
                  min={0}
                  max={c.max_score}
                  step={1}
                  disabled={isReadOnly}
                />
              </div>
            ))}
          </div>

          {/* Auto-calculated results */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-md bg-muted">
            <div>
              <Label className="text-xs text-muted-foreground">Overall Risk Score</Label>
              <p className="text-2xl font-bold">{overallScore}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Risk Level</Label>
              <div className="mt-1"><StatusBadge status={riskLevel} /></div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Suggested Frequency</Label>
              <p className="text-sm font-semibold mt-1">{suggestedFrequency || '—'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Historical Adjustment</Label>
              <p className="text-sm font-semibold mt-1">
                {selectedFunctionId
                  ? ((deptFunctions as any[]).find((f: any) => f.id === selectedFunctionId)?.historical_risk_adjustment || 0)
                  : '—'}
                {selectedFunctionId && <span className="text-xs text-muted-foreground ml-1">(auto from closed findings)</span>}
              </p>
            </div>
          </div>

          <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} disabled={isReadOnly} /></div>
        </div>
      </StandardModal>
    </PageShell>
  );
}
