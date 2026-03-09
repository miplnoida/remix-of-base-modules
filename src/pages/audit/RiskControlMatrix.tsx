import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, GitBranch, Shield, AlertTriangle } from 'lucide-react';
import { PageShell, StandardSearchFilterBar, DataTable, StandardModal, StatusBadge } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { useIARCMProcesses } from '@/hooks/useAuditDataPhase2';
import { useIADepartments } from '@/hooks/useAuditData';
import { useAuditFields } from '@/hooks/useAuditTrail';
import { MetricCard } from '@/components/shared/MetricCard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const CONTROL_TYPES = ['Preventive', 'Detective', 'Corrective'];
const EFFECTIVENESS = ['Effective', 'Partially Effective', 'Ineffective'];

export default function RiskControlMatrix() {
  const { data: processes = [], isLoading, isError, create: createProcess, update: updateProcess } = useIARCMProcesses();
  const { data: departments = [] } = useIADepartments();
  const { getCreateFields } = useAuditFields();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ department: 'all' });
  const [expandedProcess, setExpandedProcess] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{ mode: 'add-process' | 'add-risk' | 'add-control' | null; parentId?: string }>({ mode: null });
  const [form, setForm] = useState<Record<string, any>>({});

  // Fetch risks for expanded process
  const { data: risks = [] } = useQuery({
    queryKey: ['ia_rcm_risks', expandedProcess],
    queryFn: async () => {
      if (!expandedProcess) return [];
      const { data, error } = await supabase.from('ia_rcm_risks' as any).select('*').eq('process_id', expandedProcess).eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!expandedProcess,
  });

  // Fetch controls for all risks in expanded process
  const riskIds = risks.map((r: any) => r.id);
  const { data: controls = [] } = useQuery({
    queryKey: ['ia_rcm_controls', riskIds],
    queryFn: async () => {
      if (!riskIds.length) return [];
      const { data, error } = await supabase.from('ia_rcm_controls' as any).select('*').in('risk_id', riskIds).eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: riskIds.length > 0,
  });

  const createRisk = useMutation({
    mutationFn: async (record: any) => {
      const { data, error } = await supabase.from('ia_rcm_risks' as any).insert(record).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ia_rcm_risks'] }); toast({ title: 'Risk Added' }); },
  });

  const createControl = useMutation({
    mutationFn: async (record: any) => {
      const { data, error } = await supabase.from('ia_rcm_controls' as any).insert(record).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ia_rcm_controls'] }); toast({ title: 'Control Added' }); },
  });

  const filtered = processes.filter((r: any) => {
    const s = searchTerm.toLowerCase();
    const ms = !s || r.process_name?.toLowerCase().includes(s);
    return ms;
  });

  const handleSave = () => {
    if (modalState.mode === 'add-process') {
      createProcess.mutate({ process_name: form.process_name, sub_process_name: form.sub_process_name, owner: form.owner, department_id: form.department_id || null, ...getCreateFields() } as any, { onSuccess: () => setModalState({ mode: null }) });
    } else if (modalState.mode === 'add-risk') {
      createRisk.mutate({ process_id: modalState.parentId, description: form.description, category: form.category, likelihood: Number(form.likelihood) || 0, impact: Number(form.impact) || 0, risk_score: (Number(form.likelihood) || 0) * (Number(form.impact) || 0), ...getCreateFields() }, { onSuccess: () => setModalState({ mode: null }) });
    } else if (modalState.mode === 'add-control') {
      createControl.mutate({ risk_id: modalState.parentId, control_name: form.control_name, control_type: form.control_type || 'Preventive', frequency: form.frequency || 'Daily', owner: form.owner, effectiveness: form.effectiveness || 'Effective', description: form.description, ...getCreateFields() }, { onSuccess: () => setModalState({ mode: null }) });
    }
  };

  const processColumns: DataTableColumn<any>[] = [
    { key: 'process_name', header: 'Process' },
    { key: 'sub_process_name', header: 'Sub-Process' },
    { key: 'owner', header: 'Owner' },
  ];

  const filterFields: StandardFilterField[] = [
    { key: 'department', label: 'Department', options: [{ label: 'All', value: 'all' }, ...departments.map((d: any) => ({ label: d.name, value: d.id }))] },
  ];

  return (
    <PageShell title="Risk Control Matrix" subtitle="Map processes → risks → controls → tests"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/dashboard' }, { label: 'RCM' }]}
      actions={<Button onClick={() => { setForm({}); setModalState({ mode: 'add-process' }); }}><Plus className="h-4 w-4 mr-2" />Add Process</Button>}
      isLoading={isLoading} error={isError ? 'Failed to load' : null}>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="Processes" value={processes.length} icon={GitBranch} variant="info" />
        <MetricCard title="Risks Mapped" value={risks.length} icon={AlertTriangle} variant="warning" />
        <MetricCard title="Controls" value={controls.length} icon={Shield} variant="success" />
      </div>

      <Card><CardContent className="p-4">
        <StandardSearchFilterBar searchTerm={searchTerm} onSearchChange={setSearchTerm} searchPlaceholder="Search processes..." filters={filters} onFilterChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))} filterFields={filterFields} onReset={() => { setSearchTerm(''); setFilters({ department: 'all' }); }} />
      </CardContent></Card>

      <Card><CardContent>
        <DataTable columns={processColumns} data={filtered}
          onRowClick={(r) => setExpandedProcess(expandedProcess === r.id ? null : r.id)} />
      </CardContent></Card>

      {expandedProcess && (
        <Card><CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Risks & Controls</h3>
            <Button size="sm" variant="outline" onClick={() => { setForm({}); setModalState({ mode: 'add-risk', parentId: expandedProcess }); }}><Plus className="h-3 w-3 mr-1" />Add Risk</Button>
          </div>
          {risks.map((risk: any) => (
            <div key={risk.id} className="border rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{risk.description}</p>
                  <p className="text-xs text-muted-foreground">Category: {risk.category} | L: {risk.likelihood} × I: {risk.impact} = {risk.risk_score}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => { setForm({}); setModalState({ mode: 'add-control', parentId: risk.id }); }}><Plus className="h-3 w-3 mr-1" />Control</Button>
              </div>
              {controls.filter((c: any) => c.risk_id === risk.id).map((ctrl: any) => (
                <div key={ctrl.id} className="ml-4 p-2 bg-muted rounded text-sm">
                  <span className="font-medium">{ctrl.control_name}</span>
                  <span className="ml-2 text-muted-foreground">({ctrl.control_type} | {ctrl.frequency})</span>
                  <StatusBadge status={ctrl.effectiveness} />
                </div>
              ))}
            </div>
          ))}
        </CardContent></Card>
      )}

      <StandardModal open={modalState.mode !== null} onOpenChange={() => setModalState({ mode: null })}
        title={modalState.mode === 'add-process' ? 'Add Process' : modalState.mode === 'add-risk' ? 'Add Risk' : 'Add Control'}
        onSubmit={handleSave} submitLabel="Save">
        <div className="space-y-4">
          {modalState.mode === 'add-process' && <>
            <div><Label>Process Name</Label><Input value={form.process_name || ''} onChange={e => setForm(f => ({ ...f, process_name: e.target.value }))} /></div>
            <div><Label>Sub-Process</Label><Input value={form.sub_process_name || ''} onChange={e => setForm(f => ({ ...f, sub_process_name: e.target.value }))} /></div>
            <div><Label>Owner</Label><Input value={form.owner || ''} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} /></div>
          </>}
          {modalState.mode === 'add-risk' && <>
            <div><Label>Risk Description</Label><Textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div><Label>Category</Label><Input value={form.category || ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Likelihood (1-5)</Label><Input type="number" min={1} max={5} value={form.likelihood || ''} onChange={e => setForm(f => ({ ...f, likelihood: e.target.value }))} /></div>
              <div><Label>Impact (1-5)</Label><Input type="number" min={1} max={5} value={form.impact || ''} onChange={e => setForm(f => ({ ...f, impact: e.target.value }))} /></div>
            </div>
          </>}
          {modalState.mode === 'add-control' && <>
            <div><Label>Control Name</Label><Input value={form.control_name || ''} onChange={e => setForm(f => ({ ...f, control_name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Type</Label>
                <Select value={form.control_type || 'Preventive'} onValueChange={v => setForm(f => ({ ...f, control_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CONTROL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Effectiveness</Label>
                <Select value={form.effectiveness || 'Effective'} onValueChange={v => setForm(f => ({ ...f, effectiveness: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EFFECTIVENESS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          </>}
        </div>
      </StandardModal>
    </PageShell>
  );
}
