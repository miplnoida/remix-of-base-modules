import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, GitBranch, Shield, AlertTriangle, TrendingDown, X } from 'lucide-react';
import { PageShell, StandardSearchFilterBar, DataTable, StandardModal, StatusBadge } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { useIARCMProcesses } from '@/hooks/useAuditDataPhase2';
import { useIADepartments, useIADepartmentFunctions } from '@/hooks/useAuditData';
import { useAuditFields } from '@/hooks/useAuditTrail';
import { MetricCard } from '@/components/shared/MetricCard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  useIALikelihoodLevels, useIAImpactLevels,
  useIAControlEffectivenessLevels, useIARiskClassificationThresholds,
} from '@/hooks/useAuditConfigData';
import { EngagementFilterBanner, useEngagementFilter } from '@/components/audit/EngagementFilterBanner';

function classifyRisk(score: number, thresholds: any[]): { label: string; color: string } {
  const sorted = [...thresholds].sort((a, b) => Number(b.min_score) - Number(a.min_score));
  for (const t of sorted) {
    if (score >= Number(t.min_score) && score <= Number(t.max_score)) {
      return { label: t.label, color: t.color };
    }
  }
  return { label: 'Unknown', color: '#gray' };
}

// ============= Risk Matrix Heatmap Component =============
function RiskMatrixGrid({ thresholds }: { thresholds: any[] }) {
  const [selectedCell, setSelectedCell] = useState<{ likelihood: number; impact: number } | null>(null);

  // Fetch all risk assessments
  const { data: assessments = [] } = useQuery({
    queryKey: ['ia_risk_assessments_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_risk_assessments' as any)
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch department functions for names
  const { data: allDepts = [] } = useIADepartments();
  const { data: allFunctions = [] } = useQuery({
    queryKey: ['ia_department_functions_all_for_matrix'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_department_functions' as any)
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data as any[];
    },
  });

  const functionNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    allFunctions.forEach((f: any) => { map[f.id] = f.function_name; });
    return map;
  }, [allFunctions]);

  // Build the 5×5 grid data
  const gridData = useMemo(() => {
    const grid: Record<string, any[]> = {};
    for (let l = 1; l <= 5; l++) {
      for (let i = 1; i <= 5; i++) {
        grid[`${l}-${i}`] = [];
      }
    }
    assessments.forEach((a: any) => {
      const l = Math.min(5, Math.max(1, Math.round(Number(a.likelihood_score) || 0)));
      const i = Math.min(5, Math.max(1, Math.round(Number(a.impact_score) || 0)));
      if (l > 0 && i > 0) {
        grid[`${l}-${i}`].push(a);
      }
    });
    return grid;
  }, [assessments]);

  const getCellColor = (likelihood: number, impact: number) => {
    const score = likelihood * impact;
    const cls = classifyRisk(score, thresholds);
    if (cls.label === 'Critical') return 'bg-red-600 text-white';
    if (cls.label === 'High') return 'bg-red-400 text-white';
    if (cls.label === 'Medium') return 'bg-amber-400 text-foreground';
    if (cls.label === 'Low') return 'bg-green-500 text-white';
    return 'bg-muted text-muted-foreground';
  };

  const selectedItems = selectedCell ? gridData[`${selectedCell.likelihood}-${selectedCell.impact}`] || [] : [];

  const likelihoodLabels = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
  const impactLabels = ['Insignificant', 'Minor', 'Moderate', 'Major', 'Catastrophic'];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Risk Assessment Matrix — Functions by Likelihood & Impact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Header row */}
              <div className="grid grid-cols-6 gap-1 mb-1">
                <div className="text-xs font-medium text-muted-foreground flex items-end justify-center pb-1">
                  Likelihood ↓ / Impact →
                </div>
                {impactLabels.map((label, idx) => (
                  <div key={idx} className="text-center text-xs font-semibold p-1">
                    {label}<br /><span className="text-muted-foreground">({idx + 1})</span>
                  </div>
                ))}
              </div>

              {/* Grid rows — from 5 (top) to 1 (bottom) */}
              {[5, 4, 3, 2, 1].map((likelihood) => (
                <div key={likelihood} className="grid grid-cols-6 gap-1 mb-1">
                  <div className="text-xs font-semibold flex items-center justify-center p-1">
                    {likelihoodLabels[likelihood - 1]}<br />
                    <span className="text-muted-foreground">({likelihood})</span>
                  </div>
                  {[1, 2, 3, 4, 5].map((impact) => {
                    const items = gridData[`${likelihood}-${impact}`] || [];
                    const isSelected = selectedCell?.likelihood === likelihood && selectedCell?.impact === impact;
                    return (
                      <button
                        key={impact}
                        onClick={() => setSelectedCell(items.length > 0 ? { likelihood, impact } : null)}
                        className={`
                          rounded-md p-2 min-h-[60px] flex flex-col items-center justify-center cursor-pointer
                          transition-all border-2
                          ${getCellColor(likelihood, impact)}
                          ${isSelected ? 'border-foreground ring-2 ring-ring' : 'border-transparent'}
                          ${items.length > 0 ? 'hover:opacity-80' : 'opacity-60'}
                        `}
                      >
                        <span className="text-lg font-bold">{items.length}</span>
                        <span className="text-[10px]">{likelihood * impact}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-4 mt-4">
            {[
              { label: 'Low', cls: 'bg-green-500' },
              { label: 'Medium', cls: 'bg-amber-400' },
              { label: 'High', cls: 'bg-red-400' },
              { label: 'Critical', cls: 'bg-red-600' },
            ].map(({ label, cls }) => (
              <div key={label} className="flex items-center gap-1 text-xs">
                <div className={`w-3 h-3 rounded-full ${cls}`} />
                {label}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected cell detail */}
      {selectedCell && selectedItems.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                Functions at Likelihood {selectedCell.likelihood} × Impact {selectedCell.impact} (Score: {selectedCell.likelihood * selectedCell.impact})
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedCell(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedItems.map((item: any) => {
                const riskCls = classifyRisk(
                  Number(item.likelihood_score) * Number(item.impact_score),
                  thresholds
                );
                return (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded-md border bg-card">
                    <div>
                      <p className="text-sm font-medium">{functionNameMap[item.function_id] || item.function_id}</p>
                      <p className="text-xs text-muted-foreground">
                        L: {item.likelihood_score} × I: {item.impact_score} = {Number(item.likelihood_score) * Number(item.impact_score)}
                        {item.weighted_score ? ` | Weighted: ${Number(item.weighted_score).toFixed(1)}` : ''}
                      </p>
                    </div>
                    <Badge style={{ backgroundColor: riskCls.color, color: '#fff' }} className="text-xs">
                      {riskCls.label}
                    </Badge>
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

// ============= Main Component =============
export default function RiskControlMatrix() {
  const { data: processes = [], isLoading, isError, create: createProcess } = useIARCMProcesses();
  const { data: departments = [] } = useIADepartments();
  const { getCreateFields } = useAuditFields();
  const { engagementId, engagement } = useEngagementFilter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ department: 'all' });
  const [expandedProcess, setExpandedProcess] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{ mode: 'create' | null; modalType?: string; parentId?: string }>({ mode: null });
  const [form, setForm] = useState<Record<string, any>>({});

  // Config data
  const { data: likelihoodLevels = [] } = useIALikelihoodLevels();
  const { data: impactLevels = [] } = useIAImpactLevels();
  const { data: effectivenessLevels = [] } = useIAControlEffectivenessLevels();
  const { data: classificationThresholds = [] } = useIARiskClassificationThresholds();

  // Department → Function cascade for process form
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const { data: deptFunctions = [] } = useIADepartmentFunctions(selectedDeptId || undefined);

  // Fetch engagement details for auto-scoping
  const { data: engagementData } = useQuery({
    queryKey: ['engagement_rcm_detail', engagementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_audit_engagements' as any)
        .select('id, department_id, function_id')
        .eq('id', engagementId!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!engagementId,
  });

  const { data: risks = [] } = useQuery({
    queryKey: ['ia_rcm_risks', expandedProcess],
    queryFn: async () => {
      if (!expandedProcess) return [];
      const { data, error } = await supabase.from('ia_rcm_risks' as any).select('*').eq('process_id', expandedProcess).eq('is_active', true);
      if (error) throw error; return data;
    },
    enabled: !!expandedProcess,
  });

  const riskIds = risks.map((r: any) => r.id);
  const { data: controls = [] } = useQuery({
    queryKey: ['ia_rcm_controls', riskIds],
    queryFn: async () => {
      if (!riskIds.length) return [];
      const { data, error } = await supabase.from('ia_rcm_controls' as any).select('*').in('risk_id', riskIds).eq('is_active', true);
      if (error) throw error; return data;
    },
    enabled: riskIds.length > 0,
  });

  const createRisk = useMutation({
    mutationFn: async (record: any) => { const { data, error } = await supabase.from('ia_rcm_risks' as any).insert(record).select().single(); if (error) throw error; return data; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ia_rcm_risks'] }); toast({ title: 'Risk Added' }); },
  });
  const createControl = useMutation({
    mutationFn: async (record: any) => { const { data, error } = await supabase.from('ia_rcm_controls' as any).insert(record).select().single(); if (error) throw error; return data; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ia_rcm_controls'] }); toast({ title: 'Control Added' }); },
  });

  const likelihoodScore = useMemo(() => {
    const found = likelihoodLevels.find((l: any) => l.label === form.likelihood_label);
    return found ? Number(found.score) : 0;
  }, [form.likelihood_label, likelihoodLevels]);

  const impactScore = useMemo(() => {
    const found = impactLevels.find((l: any) => l.label === form.impact_label);
    return found ? Number(found.score) : 0;
  }, [form.impact_label, impactLevels]);

  const inherentRisk = likelihoodScore * impactScore;

  const effectivenessReduction = useMemo(() => {
    const found = effectivenessLevels.find((l: any) => l.label === form.effectiveness_label);
    return found ? Number(found.reduction_percentage) : 0;
  }, [form.effectiveness_label, effectivenessLevels]);

  const riskResiduals = useMemo(() => {
    const map: Record<string, { inherent: number; residual: number; level: string; color: string }> = {};
    risks.forEach((risk: any) => {
      const iScore = Number((risk as any).inherent_risk_score) || (Number((risk as any).likelihood) * Number((risk as any).impact));
      const riskControls = controls.filter((c: any) => c.risk_id === (risk as any).id);
      const maxReduction = riskControls.length > 0 ? Math.max(...riskControls.map((c: any) => Number(c.effectiveness_reduction) || 0)) : 0;
      const residual = Math.round(iScore * (1 - maxReduction / 100) * 100) / 100;
      const cls = classifyRisk(residual, classificationThresholds);
      map[(risk as any).id] = { inherent: iScore, residual, level: cls.label, color: cls.color };
    });
    return map;
  }, [risks, controls, classificationThresholds]);

  const totalRisks = risks.length;
  const highCriticalCount = Object.values(riskResiduals).filter(r => r.level === 'High' || r.level === 'Critical').length;
  const avgResidual = totalRisks > 0 ? (Object.values(riskResiduals).reduce((s, r) => s + r.residual, 0) / totalRisks).toFixed(1) : '0';

  const filtered = processes.filter((r: any) => {
    const matchesSearch = !searchTerm || r.process_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = filters.department === 'all' || r.department_id === filters.department;
    // When engagement context is active, filter by engagement's department/function
    const matchesEngagement = !engagementData || (
      (!engagementData.department_id || r.department_id === engagementData.department_id) &&
      (!engagementData.function_id || r.function_id === engagementData.function_id)
    );
    return matchesSearch && matchesDept && matchesEngagement;
  });

  const handleSave = () => {
    if (modalState.modalType === 'process') {
      createProcess.mutate({
        process_name: form.process_name,
        sub_process_name: form.sub_process_name,
        owner: form.owner,
        department_id: form.department_id || null,
        function_id: form.function_id || null,
        ...getCreateFields(),
      } as any, { onSuccess: () => { setModalState({ mode: null }); setSelectedDeptId(''); } });
    } else if (modalState.modalType === 'risk') {
      const lScore = likelihoodLevels.find((l: any) => l.label === form.likelihood_label)?.score || 0;
      const iScore = impactLevels.find((l: any) => l.label === form.impact_label)?.score || 0;
      const inherent = Number(lScore) * Number(iScore);
      const riskCls = classifyRisk(inherent, classificationThresholds);
      createRisk.mutate({
        process_id: modalState.parentId,
        description: form.description,
        category: form.category,
        risk_owner: form.risk_owner || null,
        likelihood: Number(lScore),
        impact: Number(iScore),
        risk_score: inherent,
        inherent_risk_score: inherent,
        residual_risk_score: inherent,
        risk_level: riskCls.label,
        ...getCreateFields(),
      }, { onSuccess: () => setModalState({ mode: null }) });
    } else if (modalState.modalType === 'control') {
      const effLevel = effectivenessLevels.find((l: any) => l.label === form.effectiveness_label);
      const reduction = effLevel ? Number(effLevel.reduction_percentage) : 0;
      createControl.mutate({
        risk_id: modalState.parentId,
        control_name: form.control_name,
        control_type: form.control_type || 'Preventive',
        frequency: form.frequency || 'Daily',
        owner: form.owner,
        effectiveness: form.effectiveness_label || 'Strong',
        effectiveness_reduction: reduction,
        description: form.description,
        evidence_required: form.evidence_required || null,
        last_tested_date: form.last_tested_date || null,
        ...getCreateFields(),
      }, {
        onSuccess: async () => {
          const riskId = modalState.parentId;
          if (riskId) {
            const { data: riskData } = await supabase.from('ia_rcm_risks' as any).select('*').eq('id', riskId).single();
            const { data: allControls } = await supabase.from('ia_rcm_controls' as any).select('effectiveness_reduction').eq('risk_id', riskId).eq('is_active', true);
            if (riskData && allControls) {
              const maxRed = Math.max(...allControls.map((c: any) => Number(c.effectiveness_reduction) || 0), reduction);
              const inh = Number((riskData as any).inherent_risk_score) || (Number((riskData as any).likelihood) * Number((riskData as any).impact));
              const res = Math.round(inh * (1 - maxRed / 100) * 100) / 100;
              const cls = classifyRisk(res, classificationThresholds);
              await supabase.from('ia_rcm_risks' as any).update({ residual_risk_score: res, risk_level: cls.label } as any).eq('id', riskId);
              queryClient.invalidateQueries({ queryKey: ['ia_rcm_risks'] });
            }
          }
          setModalState({ mode: null });
        },
      });
    }
  };

  const processColumns: DataTableColumn<any>[] = [
    { key: 'process_name', header: 'Process' },
    { key: 'sub_process_name', header: 'Sub-Process' },
    { key: 'owner', header: 'Owner' },
  ];
  const filterFields: StandardFilterField[] = [
    { key: 'department', label: 'Department', type: 'select', options: [{ label: 'All', value: 'all' }, ...departments.map((d: any) => ({ label: d.name, value: d.id }))] },
  ];

  return (
    <PageShell title="Risk Matrix" subtitle="Visual risk assessment matrix and process → risk → control mapping"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/dashboard' }, { label: 'Risk Matrix' }]}
      actions={<Button onClick={() => { setForm({}); setSelectedDeptId(''); setModalState({ mode: 'create', modalType: 'process' }); }}><Plus className="h-4 w-4 mr-2" />Add Process</Button>}
      isLoading={isLoading} error={isError ? 'Failed to load' : null}>

      <EngagementFilterBanner />

      <Tabs defaultValue="matrix" className="space-y-4">
        <TabsList>
          <TabsTrigger value="matrix">Risk Matrix</TabsTrigger>
          <TabsTrigger value="rcm">Detailed RCM</TabsTrigger>
        </TabsList>

        {/* ===== Risk Matrix Tab ===== */}
        <TabsContent value="matrix">
          <RiskMatrixGrid thresholds={classificationThresholds} />
        </TabsContent>

        {/* ===== Detailed RCM Tab ===== */}
        <TabsContent value="rcm" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard title="Processes" value={processes.length} icon={GitBranch} variant="info" />
            <MetricCard title="Risks Mapped" value={totalRisks} icon={AlertTriangle} variant="warning" />
            <MetricCard title="High/Critical Risks" value={highCriticalCount} icon={Shield} variant="error" />
            <MetricCard title="Avg Residual Score" value={avgResidual} icon={TrendingDown} variant="success" />
          </div>
          <Card><CardContent className="p-4">
            <StandardSearchFilterBar searchValue={searchTerm} onSearchChange={setSearchTerm} searchPlaceholder="Search processes..." filterValues={filters} onFilterChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))} filters={filterFields} onReset={() => { setSearchTerm(''); setFilters({ department: 'all' }); }} />
          </CardContent></Card>
          <Card><CardContent>
            <DataTable columns={processColumns} data={filtered} onView={(r) => setExpandedProcess(expandedProcess === r.id ? null : r.id)} />
          </CardContent></Card>
          {expandedProcess && (
            <Card><CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Risks & Controls</h3>
                <Button size="sm" variant="outline" onClick={() => { setForm({}); setModalState({ mode: 'create', modalType: 'risk', parentId: expandedProcess }); }}><Plus className="h-3 w-3 mr-1" />Add Risk</Button>
              </div>
              {risks.map((risk: any) => {
                const res = riskResiduals[risk.id];
                return (
                  <div key={risk.id} className="border rounded-md p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">{risk.description}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>Category: {risk.category}</span>
                          {risk.risk_owner && <span>Owner: {risk.risk_owner}</span>}
                          <span>L: {risk.likelihood} × I: {risk.impact} = <strong>{res?.inherent || risk.risk_score}</strong></span>
                          <span>Residual: <strong>{res?.residual?.toFixed(1) || '-'}</strong></span>
                          {res && (
                            <Badge style={{ backgroundColor: res.color, color: '#fff' }} className="text-xs">
                              {res.level}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => { setForm({}); setModalState({ mode: 'create', modalType: 'control', parentId: risk.id }); }}><Plus className="h-3 w-3 mr-1" />Control</Button>
                    </div>
                    {controls.filter((c: any) => c.risk_id === risk.id).map((ctrl: any) => (
                      <div key={ctrl.id} className="ml-4 p-2 bg-muted rounded text-sm flex items-center gap-2">
                        <span className="font-medium">{ctrl.control_name}</span>
                        <span className="text-muted-foreground">({ctrl.control_type} | {ctrl.frequency})</span>
                        <StatusBadge status={ctrl.effectiveness} />
                        {ctrl.effectiveness_reduction > 0 && (
                          <Badge variant="outline" className="text-xs">-{ctrl.effectiveness_reduction}%</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
              {risks.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No risks mapped for this process yet.</p>}
            </CardContent></Card>
          )}
        </TabsContent>
      </Tabs>

      <StandardModal open={modalState.mode !== null} onOpenChange={() => setModalState({ mode: null })}
        title={modalState.modalType === 'process' ? 'Add Process' : modalState.modalType === 'risk' ? 'Add Risk' : 'Add Control'}
        mode="create" onSave={handleSave} saveLabel="Save">
        <div className="space-y-4">
          {modalState.modalType === 'process' && <>
            <div>
              <Label>Department</Label>
              <Select value={selectedDeptId} onValueChange={(v) => { setSelectedDeptId(v); setForm(f => ({ ...f, department_id: v, function_id: '' })); }}>
                <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                <SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {selectedDeptId && (
              <div>
                <Label>Function</Label>
                <Select value={form.function_id || ''} onValueChange={(v) => setForm(f => ({ ...f, function_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select Function" /></SelectTrigger>
                  <SelectContent>{deptFunctions.map((fn: any) => <SelectItem key={fn.id} value={fn.id}>{fn.function_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div><Label>Process Name</Label><Input value={form.process_name || ''} onChange={e => setForm(f => ({ ...f, process_name: e.target.value }))} /></div>
            <div><Label>Sub-Process</Label><Input value={form.sub_process_name || ''} onChange={e => setForm(f => ({ ...f, sub_process_name: e.target.value }))} /></div>
            <div><Label>Owner</Label><Input value={form.owner || ''} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} /></div>
          </>}
          {modalState.modalType === 'risk' && <>
            <div><Label>Risk Description</Label><Textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Risk Category</Label><Input value={form.category || ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g., Operational, Financial, Compliance" /></div>
              <div><Label>Risk Owner</Label><Input value={form.risk_owner || ''} onChange={e => setForm(f => ({ ...f, risk_owner: e.target.value }))} placeholder="Person responsible for this risk" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Likelihood</Label>
                <Select value={form.likelihood_label || ''} onValueChange={v => setForm(f => ({ ...f, likelihood_label: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select Likelihood" /></SelectTrigger>
                  <SelectContent>{likelihoodLevels.map((l: any) => <SelectItem key={l.id} value={l.label}>{l.label} ({l.score})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Impact</Label>
                <Select value={form.impact_label || ''} onValueChange={v => setForm(f => ({ ...f, impact_label: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select Impact" /></SelectTrigger>
                  <SelectContent>{impactLevels.map((l: any) => <SelectItem key={l.id} value={l.label}>{l.label} ({l.score})</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {inherentRisk > 0 && (
              <div className="p-3 bg-muted rounded-md text-sm space-y-1">
                <p>Inherent Risk Score: <strong>{inherentRisk}</strong> (Likelihood {likelihoodScore} × Impact {impactScore})</p>
                <p>Classification: <strong>{classifyRisk(inherentRisk, classificationThresholds).label}</strong></p>
              </div>
            )}
          </>}
          {modalState.modalType === 'control' && <>
            <div><Label>Control Name</Label><Input value={form.control_name || ''} onChange={e => setForm(f => ({ ...f, control_name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={form.control_type || 'Preventive'} onValueChange={v => setForm(f => ({ ...f, control_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Preventive', 'Detective', 'Corrective'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Control Effectiveness</Label>
                <Select value={form.effectiveness_label || ''} onValueChange={v => setForm(f => ({ ...f, effectiveness_label: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select Effectiveness" /></SelectTrigger>
                  <SelectContent>{effectivenessLevels.map((l: any) => <SelectItem key={l.id} value={l.label}>{l.label} (-{l.reduction_percentage}%)</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Frequency</Label>
                <Select value={form.frequency || 'Daily'} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annual'].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Owner</Label><Input value={form.owner || ''} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} /></div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div><Label>Evidence Required</Label><Textarea value={form.evidence_required || ''} onChange={e => setForm(f => ({ ...f, evidence_required: e.target.value }))} placeholder="Describe what evidence is needed to verify this control..." /></div>
            <div>
              <Label>Last Tested Date</Label>
              <Input type="date" value={form.last_tested_date || ''} onChange={e => setForm(f => ({ ...f, last_tested_date: e.target.value }))} />
            </div>
            {effectivenessReduction > 0 && (
              <div className="p-3 bg-muted rounded-md text-sm">
                <p>This control will reduce inherent risk by <strong>{effectivenessReduction}%</strong></p>
              </div>
            )}
          </>}
        </div>
      </StandardModal>
    </PageShell>
  );
}
