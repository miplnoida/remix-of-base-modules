import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, BarChart3, AlertTriangle, TrendingUp, Shield, Building2, Eye, Edit } from 'lucide-react';
import { PageShell, StandardSearchFilterBar, DataTable, StandardModal, StatusBadge, ExportDropdown } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { useIARiskAssessments } from '@/hooks/useAuditDataPhase2';
import { useIADepartments, useIADepartmentFunctions, useIAActiveAuditors } from '@/hooks/useAuditData';
import { useAuditFields } from '@/hooks/useAuditTrail';
import { MetricCard } from '@/components/shared/MetricCard';
import { RISK_ASSESSMENT_SCHEMA, toExportColumns } from '@/config/moduleFieldSchemas';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { formatDateForDisplay } from '@/lib/format-config';

const RISK_CATEGORIES = ['Operational', 'Financial', 'Compliance', 'IT', 'Strategic', 'Reputational'];
const RISK_LEVELS = ['Critical', 'High', 'Medium', 'Low'];
const exportColumns = toExportColumns(RISK_ASSESSMENT_SCHEMA);

function calculateRiskLevel(score: number): string {
  if (score >= 16) return 'Critical';
  if (score >= 11) return 'High';
  if (score >= 6) return 'Medium';
  return 'Low';
}

function getRiskLevelColor(level: string): string {
  switch (level) {
    case 'Critical': return 'bg-red-600 text-white';
    case 'High': return 'bg-red-400 text-white';
    case 'Medium': return 'bg-amber-400 text-foreground';
    case 'Low': return 'bg-green-500 text-white';
    default: return 'bg-muted text-muted-foreground';
  }
}

// ============= Risk Heat Map 5×5 Grid =============
function RiskHeatMapGrid({ assessments, allFunctions, deptMap }: {
  assessments: any[];
  allFunctions: any[];
  deptMap: Map<string, any>;
}) {
  const [selectedCell, setSelectedCell] = useState<{ l: number; i: number } | null>(null);

  const funcMap = useMemo(() => {
    const map: Record<string, any> = {};
    allFunctions.forEach((f: any) => { map[f.id] = f; });
    return map;
  }, [allFunctions]);

  const gridData = useMemo(() => {
    const grid: Record<string, any[]> = {};
    for (let l = 1; l <= 5; l++) for (let i = 1; i <= 5; i++) grid[`${l}-${i}`] = [];
    assessments.forEach((a: any) => {
      const l = Math.min(5, Math.max(1, Math.round(Number(a.likelihood_score) || 0)));
      const i = Math.min(5, Math.max(1, Math.round(Number(a.impact_score) || 0)));
      if (l > 0 && i > 0) grid[`${l}-${i}`].push(a);
    });
    return grid;
  }, [assessments]);

  const getCellColor = (l: number, i: number) => getRiskLevelColor(calculateRiskLevel(l * i));

  const selectedItems = selectedCell ? gridData[`${selectedCell.l}-${selectedCell.i}`] || [] : [];
  const likelihoodLabels = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
  const impactLabels = ['Insignificant', 'Minor', 'Moderate', 'Major', 'Catastrophic'];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Risk Heat Map — Likelihood vs Impact</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="grid grid-cols-6 gap-1 mb-1">
                <div className="text-xs font-medium text-muted-foreground flex items-end justify-center pb-1">Likelihood ↓ / Impact →</div>
                {impactLabels.map((label, idx) => (
                  <div key={idx} className="text-center text-xs font-semibold p-1">{label}<br /><span className="text-muted-foreground">({idx + 1})</span></div>
                ))}
              </div>
              {[5, 4, 3, 2, 1].map((likelihood) => (
                <div key={likelihood} className="grid grid-cols-6 gap-1 mb-1">
                  <div className="text-xs font-semibold flex items-center justify-center p-1">{likelihoodLabels[likelihood - 1]}<br /><span className="text-muted-foreground">({likelihood})</span></div>
                  {[1, 2, 3, 4, 5].map((impact) => {
                    const items = gridData[`${likelihood}-${impact}`] || [];
                    const isSelected = selectedCell?.l === likelihood && selectedCell?.i === impact;
                    return (
                      <button key={impact} onClick={() => setSelectedCell(items.length > 0 ? { l: likelihood, i: impact } : null)}
                        className={`rounded-md p-2 min-h-[60px] flex flex-col items-center justify-center cursor-pointer transition-all border-2 ${getCellColor(likelihood, impact)} ${isSelected ? 'border-foreground ring-2 ring-ring' : 'border-transparent'} ${items.length > 0 ? 'hover:opacity-80' : 'opacity-60'}`}>
                        <span className="text-lg font-bold">{items.length}</span>
                        <span className="text-[10px]">{likelihood * impact}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-4">
            {[{ label: 'Low (1-5)', cls: 'bg-green-500' }, { label: 'Medium (6-10)', cls: 'bg-amber-400' }, { label: 'High (11-15)', cls: 'bg-red-400' }, { label: 'Critical (16-25)', cls: 'bg-red-600' }].map(({ label, cls }) => (
              <div key={label} className="flex items-center gap-1 text-xs"><div className={`w-3 h-3 rounded-full ${cls}`} />{label}</div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedCell && selectedItems.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Functions at Likelihood {selectedCell.l} × Impact {selectedCell.i} (Score: {selectedCell.l * selectedCell.i})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedItems.map((item: any) => {
                const fn = funcMap[item.function_id];
                const dept = fn ? deptMap.get(fn.department_id) : null;
                return (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded-md border bg-card">
                    <div>
                      <p className="text-sm font-medium">{fn?.function_name || 'Unknown Function'}</p>
                      <p className="text-xs text-muted-foreground">{dept?.name || '—'} | {item.risk_category || '—'} | Owner: {item.risk_owner || '—'}</p>
                    </div>
                    <Badge className={`text-xs ${getRiskLevelColor(item.risk_level)}`}>{item.risk_level}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============= Department Risk Summary =============
function DepartmentRiskSummary({ assessments, deptMap, allFunctions }: {
  assessments: any[];
  deptMap: Map<string, any>;
  allFunctions: any[];
}) {
  const funcMap = useMemo(() => {
    const map: Record<string, any> = {};
    allFunctions.forEach((f: any) => { map[f.id] = f; });
    return map;
  }, [allFunctions]);

  const deptSummary = useMemo(() => {
    const summary: Record<string, { name: string; total: number; avgScore: number; critical: number; high: number; medium: number; low: number }> = {};
    assessments.forEach((a: any) => {
      const fn = funcMap[a.function_id];
      const deptId = fn?.department_id;
      if (!deptId) return;
      const dept = deptMap.get(deptId);
      if (!summary[deptId]) summary[deptId] = { name: dept?.name || 'Unknown', total: 0, avgScore: 0, critical: 0, high: 0, medium: 0, low: 0 };
      const s = summary[deptId];
      s.total++;
      s.avgScore += Number(a.overall_risk_score) || (Number(a.likelihood_score) * Number(a.impact_score));
      if (a.risk_level === 'Critical') s.critical++;
      else if (a.risk_level === 'High') s.high++;
      else if (a.risk_level === 'Medium') s.medium++;
      else s.low++;
    });
    Object.values(summary).forEach(s => { if (s.total > 0) s.avgScore = Math.round(s.avgScore / s.total * 10) / 10; });
    return Object.values(summary).sort((a, b) => b.avgScore - a.avgScore);
  }, [assessments, funcMap, deptMap]);

  if (deptSummary.length === 0) return null;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" />Department Risk Summary</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-3">
          {deptSummary.map((d) => (
            <div key={d.name} className="flex items-center justify-between p-3 rounded-md border">
              <div>
                <p className="font-medium text-sm">{d.name}</p>
                <p className="text-xs text-muted-foreground">{d.total} assessments | Avg Score: {d.avgScore}</p>
              </div>
              <div className="flex gap-2">
                {d.critical > 0 && <Badge className="bg-red-600 text-white text-xs">{d.critical} Critical</Badge>}
                {d.high > 0 && <Badge className="bg-red-400 text-white text-xs">{d.high} High</Badge>}
                {d.medium > 0 && <Badge className="bg-amber-400 text-foreground text-xs">{d.medium} Medium</Badge>}
                {d.low > 0 && <Badge className="bg-green-500 text-white text-xs">{d.low} Low</Badge>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============= Main Component =============
export default function RiskAssessment() {
  const { data = [], isLoading, isError, create, update } = useIARiskAssessments();
  const { data: departments = [] } = useIADepartments();
  const { data: auditors = [] } = useIAActiveAuditors();
  const { getCreateFields, getUpdateFields } = useAuditFields();

  // Fetch all functions for display
  const { data: allFunctions = [] } = useQuery({
    queryKey: ['ia_department_functions_all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ia_department_functions' as any).select('*').eq('is_active', true);
      if (error) throw error;
      return data as any[];
    },
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ risk_level: 'all', department: 'all' });
  const [modalState, setModalState] = useState<{ mode: 'create' | 'edit' | 'view' | null; record?: any }>({ mode: null });

  // Form state
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedFunctionId, setSelectedFunctionId] = useState('');
  const [riskCategory, setRiskCategory] = useState('');
  const [riskDescription, setRiskDescription] = useState('');
  const [likelihoodScore, setLikelihoodScore] = useState(1);
  const [impactScore, setImpactScore] = useState(1);
  const [riskOwner, setRiskOwner] = useState('');
  const [assessmentYear, setAssessmentYear] = useState(new Date().getFullYear().toString());
  const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().slice(0, 10));
  const [assessedBy, setAssessedBy] = useState('');
  const [notes, setNotes] = useState('');

  const { data: deptFunctions = [] } = useIADepartmentFunctions(selectedDeptId || undefined);

  const deptMap = useMemo(() => new Map((departments as any[]).map((d: any) => [d.id, d])), [departments]);
  const funcMap = useMemo(() => {
    const map: Record<string, any> = {};
    allFunctions.forEach((f: any) => { map[f.id] = f; });
    return map;
  }, [allFunctions]);

  // Auto-calculated
  const riskScore = likelihoodScore * impactScore;
  const riskLevel = calculateRiskLevel(riskScore);

  const resetForm = () => {
    setSelectedDeptId('');
    setSelectedFunctionId('');
    setRiskCategory('');
    setRiskDescription('');
    setLikelihoodScore(1);
    setImpactScore(1);
    setRiskOwner('');
    setAssessmentYear(new Date().getFullYear().toString());
    setAssessmentDate(new Date().toISOString().slice(0, 10));
    setAssessedBy('');
    setNotes('');
  };

  const openAdd = () => {
    resetForm();
    setModalState({ mode: 'create' });
  };

  const openEdit = (r: any) => {
    const fn = funcMap[r.function_id];
    setSelectedDeptId(fn?.department_id || '');
    setSelectedFunctionId(r.function_id || '');
    setRiskCategory(r.risk_category || '');
    setRiskDescription(r.risk_description || '');
    setLikelihoodScore(Number(r.likelihood_score) || 1);
    setImpactScore(Number(r.impact_score) || 1);
    setRiskOwner(r.risk_owner || '');
    setAssessmentYear(r.assessment_year || '');
    setAssessmentDate(r.assessment_date || '');
    setAssessedBy(r.assessed_by || '');
    setNotes(r.notes || '');
    setModalState({ mode: 'edit', record: r });
  };

  const openView = (r: any) => {
    openEdit(r);
    setModalState({ mode: 'view', record: r });
  };

  const handleSave = () => {
    const payload: any = {
      function_id: selectedFunctionId || null,
      risk_category: riskCategory,
      risk_description: riskDescription,
      likelihood_score: likelihoodScore,
      impact_score: impactScore,
      overall_risk_score: riskScore,
      risk_level: riskLevel,
      risk_owner: riskOwner,
      assessment_year: assessmentYear,
      assessment_date: assessmentDate,
      assessed_by: assessedBy,
      notes,
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
    const fn = funcMap[r.function_id];
    const dept = fn ? deptMap.get(fn.department_id) : null;
    const matchSearch = !s ||
      fn?.function_name?.toLowerCase().includes(s) ||
      dept?.name?.toLowerCase().includes(s) ||
      r.risk_category?.toLowerCase().includes(s) ||
      r.risk_description?.toLowerCase().includes(s) ||
      r.risk_owner?.toLowerCase().includes(s);
    const matchLevel = filters.risk_level === 'all' || r.risk_level === filters.risk_level;
    const matchDept = filters.department === 'all' || fn?.department_id === filters.department;
    return matchSearch && matchLevel && matchDept;
  });

  const stats = {
    total: data.length,
    critical: data.filter((d: any) => d.risk_level === 'Critical').length,
    high: data.filter((d: any) => d.risk_level === 'High').length,
    avgScore: data.length ? Math.round(data.reduce((acc: number, d: any) => acc + (Number(d.overall_risk_score) || (Number(d.likelihood_score) * Number(d.impact_score)) || 0), 0) / data.length * 10) / 10 : 0,
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'department', header: 'Department', render: (r) => { const fn = funcMap[r.function_id]; return fn ? deptMap.get(fn.department_id)?.name || '—' : '—'; } },
    { key: 'function', header: 'Function', render: (r) => funcMap[r.function_id]?.function_name || '—' },
    { key: 'risk_category', header: 'Risk Category', render: (r) => r.risk_category || '—' },
    { key: 'likelihood_score', header: 'Likelihood', render: (r) => r.likelihood_score || '—' },
    { key: 'impact_score', header: 'Impact', render: (r) => r.impact_score || '—' },
    { key: 'overall_risk_score', header: 'Risk Score', render: (r) => {
      const score = Number(r.overall_risk_score) || (Number(r.likelihood_score) * Number(r.impact_score));
      return <span className="font-bold">{score}</span>;
    }},
    { key: 'risk_level', header: 'Risk Level', render: (r) => <StatusBadge status={r.risk_level} /> },
    { key: 'risk_owner', header: 'Risk Owner', render: (r) => r.risk_owner || '—' },
    { key: 'assessment_year', header: 'Year', render: (r) => r.assessment_year || '—' },
  ];

  const filterFields: StandardFilterField[] = [
    { key: 'risk_level', label: 'Risk Level', type: 'select', options: [{ label: 'All', value: 'all' }, ...RISK_LEVELS.map(t => ({ label: t, value: t }))] },
    { key: 'department', label: 'Department', type: 'select', options: [{ label: 'All Departments', value: 'all' }, ...(departments as any[]).map((d: any) => ({ label: d.name, value: d.id }))] },
  ];

  const exportData = filtered.map((r: any) => {
    const fn = funcMap[r.function_id];
    const dept = fn ? deptMap.get(fn.department_id) : null;
    return { ...r, department_name: dept?.name || '', function_name: fn?.function_name || '' };
  });

  const isReadOnly = modalState.mode === 'view';

  return (
    <PageShell title="Risk Assessment" subtitle="Evaluate risk levels of department functions for audit planning"
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
        <MetricCard title="Critical Risks" value={stats.critical} icon={AlertTriangle} variant="error" />
        <MetricCard title="High Risks" value={stats.high} icon={Shield} variant="warning" />
        <MetricCard title="Avg Risk Score" value={stats.avgScore} icon={TrendingUp} variant="default" />
      </div>

      <Tabs defaultValue="register" className="space-y-4">
        <TabsList>
          <TabsTrigger value="register">Risk Register</TabsTrigger>
          <TabsTrigger value="heatmap">Risk Heat Map</TabsTrigger>
          <TabsTrigger value="summary">Department Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="space-y-4">
          <Card><CardContent className="p-4">
            <StandardSearchFilterBar searchValue={searchTerm} onSearchChange={setSearchTerm} searchPlaceholder="Search by department, function, category, owner..."
              filterValues={filters} onFilterChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))} filters={filterFields}
              onReset={() => { setSearchTerm(''); setFilters({ risk_level: 'all', department: 'all' }); }} />
          </CardContent></Card>

          <Card><CardContent>
            <DataTable columns={columns} data={filtered} onView={openView}
              renderActions={(row) => (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openView(row); }}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(row); }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              )} />
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="heatmap">
          <RiskHeatMapGrid assessments={data} allFunctions={allFunctions} deptMap={deptMap} />
        </TabsContent>

        <TabsContent value="summary">
          <DepartmentRiskSummary assessments={data} deptMap={deptMap} allFunctions={allFunctions} />
        </TabsContent>
      </Tabs>

      {/* Create / Edit / View Modal */}
      <StandardModal open={modalState.mode !== null} onOpenChange={() => { setModalState({ mode: null }); resetForm(); }}
        title={modalState.mode === 'create' ? 'New Risk Assessment' : modalState.mode === 'edit' ? 'Edit Risk Assessment' : 'View Risk Assessment'}
        mode={modalState.mode || 'view'} onSave={handleSave} saveLabel="Save" isSaving={create.isPending || update.isPending}>
        <div className="space-y-4">
          {/* Department + Function */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Department <span className="text-destructive">*</span></Label>
              <Select value={selectedDeptId} onValueChange={(v) => { setSelectedDeptId(v); setSelectedFunctionId(''); }} disabled={isReadOnly}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>{(departments as any[]).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Function <span className="text-destructive">*</span></Label>
              <Select value={selectedFunctionId} onValueChange={setSelectedFunctionId} disabled={isReadOnly || !selectedDeptId}>
                <SelectTrigger><SelectValue placeholder={selectedDeptId ? 'Select function' : 'Select department first'} /></SelectTrigger>
                <SelectContent>{(deptFunctions as any[]).map((f: any) => <SelectItem key={f.id} value={f.id}>{f.function_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* Risk Category + Description */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Risk Category <span className="text-destructive">*</span></Label>
              <Select value={riskCategory} onValueChange={setRiskCategory} disabled={isReadOnly}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{RISK_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Risk Owner <span className="text-destructive">*</span></Label>
              <Select value={riskOwner} onValueChange={setRiskOwner} disabled={isReadOnly}>
                <SelectTrigger><SelectValue placeholder="Select risk owner" /></SelectTrigger>
                <SelectContent>
                  {(auditors as any[]).map((a: any) => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Risk Description</Label>
            <Textarea value={riskDescription} onChange={e => setRiskDescription(e.target.value)} disabled={isReadOnly} placeholder="Describe the risk..." />
          </div>

          {/* Likelihood + Impact Scores */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Likelihood Score (1–5) <span className="text-destructive">*</span></Label>
              <Select value={String(likelihoodScore)} onValueChange={v => setLikelihoodScore(Number(v))} disabled={isReadOnly}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(n => (
                    <SelectItem key={n} value={String(n)}>{n} - {['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'][n - 1]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Impact Score (1–5) <span className="text-destructive">*</span></Label>
              <Select value={String(impactScore)} onValueChange={v => setImpactScore(Number(v))} disabled={isReadOnly}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(n => (
                    <SelectItem key={n} value={String(n)}>{n} - {['Insignificant', 'Minor', 'Moderate', 'Major', 'Catastrophic'][n - 1]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Auto-calculated Risk Score & Level */}
          <div className="grid grid-cols-3 gap-4 p-4 rounded-md bg-muted">
            <div>
              <Label className="text-xs text-muted-foreground">Risk Score</Label>
              <p className="text-2xl font-bold">{riskScore}</p>
              <p className="text-xs text-muted-foreground">Likelihood ({likelihoodScore}) × Impact ({impactScore})</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Risk Level</Label>
              <div className="mt-1"><StatusBadge status={riskLevel} /></div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Scale</Label>
              <div className="text-xs space-y-0.5 mt-1">
                <p>1–5: Low</p>
                <p>6–10: Medium</p>
                <p>11–15: High</p>
                <p>16–25: Critical</p>
              </div>
            </div>
          </div>

          {/* Assessment Year, Date, Assessed By */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Assessment Year</Label>
              <Select value={assessmentYear} onValueChange={setAssessmentYear} disabled={isReadOnly}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0, -1, -2, -3].map(offset => {
                    const y = String(new Date().getFullYear() + offset);
                    return <SelectItem key={y} value={y}>{y}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assessment Date</Label>
              <Input type="date" value={assessmentDate} onChange={e => setAssessmentDate(e.target.value)} disabled={isReadOnly} />
            </div>
            <div>
              <Label>Assessed By</Label>
              <Select value={assessedBy} onValueChange={setAssessedBy} disabled={isReadOnly}>
                <SelectTrigger><SelectValue placeholder="Select auditor" /></SelectTrigger>
                <SelectContent>
                  {(auditors as any[]).map((a: any) => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} disabled={isReadOnly} />
          </div>
        </div>
      </StandardModal>
    </PageShell>
  );
}
