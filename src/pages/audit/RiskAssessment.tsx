import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, BarChart3, AlertTriangle, TrendingUp, Shield } from 'lucide-react';
import { PageShell, StandardSearchFilterBar, DataTable, StandardModal, StatusBadge } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { useIARiskAssessments, useIAAuditUniverse } from '@/hooks/useAuditDataPhase2';
import { useIADepartments } from '@/hooks/useAuditData';
import { useAuditFields } from '@/hooks/useAuditTrail';
import { MetricCard } from '@/components/shared/MetricCard';

const RISK_LEVELS = ['Critical', 'High', 'Medium', 'Low'];

const emptyForm = {
  audit_universe_id: '', assessment_date: new Date().toISOString().slice(0, 10), assessed_by: '',
  impact_score: 0, likelihood_score: 0, control_effectiveness_score: 0,
  velocity_score: 0, regulatory_score: 0, reputational_score: 0,
  overall_risk_score: 0, risk_level: 'Medium', notes: '',
};

export default function RiskAssessment() {
  const { data = [], isLoading, isError, create, update } = useIARiskAssessments();
  const { data: universeData = [] } = useIAAuditUniverse();
  const { data: departments = [] } = useIADepartments();
  const { getCreateFields, getUpdateFields } = useAuditFields();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ risk_level: 'all', department: 'all' });
  const [modalState, setModalState] = useState<{ mode: 'create' | 'edit' | 'view' | null; record?: any }>({ mode: null });
  const [form, setForm] = useState(emptyForm);

  // Build a map from universe entity to department
  const universeMap = new Map((universeData as any[]).map((u: any) => [u.id, u]));

  const filtered = data.filter((r: any) => {
    const s = searchTerm.toLowerCase();
    const entity = universeMap.get(r.audit_universe_id);
    const entityName = entity?.entity_name || '';
    const matchSearch = !s || r.assessed_by?.toLowerCase().includes(s) || r.notes?.toLowerCase().includes(s) || entityName.toLowerCase().includes(s);
    const matchLevel = filters.risk_level === 'all' || r.risk_level === filters.risk_level;
    const matchDept = filters.department === 'all' || entity?.department_id === filters.department;
    return matchSearch && matchLevel && matchDept;
  });

  const stats = {
    total: data.length,
    critical: data.filter((d: any) => d.risk_level === 'Critical').length,
    high: data.filter((d: any) => d.risk_level === 'High').length,
    avgScore: data.length ? Math.round(data.reduce((acc: number, d: any) => acc + (Number(d.overall_risk_score) || 0), 0) / data.length) : 0,
  };

  const calcOverall = (f: typeof emptyForm) => {
    const score = (Number(f.impact_score) * 0.25 + Number(f.likelihood_score) * 0.25 + Number(f.control_effectiveness_score) * 0.15 + Number(f.velocity_score) * 0.1 + Number(f.regulatory_score) * 0.15 + Number(f.reputational_score) * 0.1);
    const level = score >= 80 ? 'Critical' : score >= 60 ? 'High' : score >= 40 ? 'Medium' : 'Low';
    return { overall_risk_score: Math.round(score * 100) / 100, risk_level: level };
  };

  const setFormField = (key: string, val: any) => {
    setForm(f => {
      const updated = { ...f, [key]: val };
      if (['impact_score', 'likelihood_score', 'control_effectiveness_score', 'velocity_score', 'regulatory_score', 'reputational_score'].includes(key)) {
        return { ...updated, ...calcOverall(updated) };
      }
      return updated;
    });
  };

  const getEntityName = (id: string) => universeMap.get(id)?.entity_name || '—';
  const getDeptForEntity = (id: string) => {
    const entity = universeMap.get(id);
    if (!entity?.department_id) return '—';
    return departments?.find((d: any) => d.id === entity.department_id)?.name || '—';
  };

  const openAdd = () => { setForm(emptyForm); setModalState({ mode: 'create' }); };
  const openEdit = (r: any) => {
    setForm({ audit_universe_id: r.audit_universe_id || '', assessment_date: r.assessment_date || '', assessed_by: r.assessed_by || '', impact_score: r.impact_score || 0, likelihood_score: r.likelihood_score || 0, control_effectiveness_score: r.control_effectiveness_score || 0, velocity_score: r.velocity_score || 0, regulatory_score: r.regulatory_score || 0, reputational_score: r.reputational_score || 0, overall_risk_score: r.overall_risk_score || 0, risk_level: r.risk_level || 'Medium', notes: r.notes || '' });
    setModalState({ mode: 'edit', record: r });
  };
  const openView = (r: any) => { openEdit(r); setModalState({ mode: 'view', record: r }); };

  const handleSave = () => {
    if (modalState.mode === 'create') {
      create.mutate({ ...form, ...getCreateFields() } as any, { onSuccess: () => setModalState({ mode: null }) });
    } else if (modalState.mode === 'edit' && modalState.record) {
      update.mutate({ id: modalState.record.id, ...form, ...getUpdateFields() } as any, { onSuccess: () => setModalState({ mode: null }) });
    }
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'audit_universe_id', header: 'Entity', render: (r) => getEntityName(r.audit_universe_id) },
    { key: 'department', header: 'Department', render: (r) => getDeptForEntity(r.audit_universe_id) },
    { key: 'assessment_date', header: 'Date' },
    { key: 'assessed_by', header: 'Assessed By' },
    { key: 'impact_score', header: 'Impact' },
    { key: 'likelihood_score', header: 'Likelihood' },
    { key: 'overall_risk_score', header: 'Overall Score' },
    { key: 'risk_level', header: 'Risk Level', render: (r) => <StatusBadge status={r.risk_level} /> },
  ];

  const filterFields: StandardFilterField[] = [
    { key: 'risk_level', label: 'Risk Level', type: 'select', options: [{ label: 'All', value: 'all' }, ...RISK_LEVELS.map(t => ({ label: t, value: t }))] },
    { key: 'department', label: 'Department', type: 'select', options: [{ label: 'All Departments', value: 'all' }, ...(departments || []).map((d: any) => ({ label: d.name, value: d.id }))] },
  ];

  const isReadOnly = modalState.mode === 'view';

  return (
    <PageShell title="Risk Assessment" subtitle="Assess, score, and prioritize auditable entities for audit planning"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/dashboard' }, { label: 'Risk Assessment' }]}
      actions={<Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />New Assessment</Button>}
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

      <StandardModal open={modalState.mode !== null} onOpenChange={() => setModalState({ mode: null })}
        title={modalState.mode === 'create' ? 'New Risk Assessment' : modalState.mode === 'edit' ? 'Edit Assessment' : 'View Assessment'}
        mode={modalState.mode || 'view'} onSave={handleSave} saveLabel="Save" isSaving={create.isPending || update.isPending}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Auditable Entity</Label>
              <Select value={form.audit_universe_id} onValueChange={v => setFormField('audit_universe_id', v)} disabled={isReadOnly}>
                <SelectTrigger><SelectValue placeholder="Select entity" /></SelectTrigger>
                <SelectContent>{(universeData as any[]).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.entity_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Assessment Date</Label><Input type="date" value={form.assessment_date} onChange={e => setFormField('assessment_date', e.target.value)} disabled={isReadOnly} /></div>
          </div>
          <div><Label>Assessed By</Label><Input value={form.assessed_by} onChange={e => setFormField('assessed_by', e.target.value)} disabled={isReadOnly} /></div>
          <p className="text-sm font-medium text-muted-foreground pt-2">Scoring Factors (0–100)</p>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>Impact (25%)</Label><Input type="number" min={0} max={100} value={form.impact_score} onChange={e => setFormField('impact_score', Number(e.target.value))} disabled={isReadOnly} /></div>
            <div><Label>Likelihood (25%)</Label><Input type="number" min={0} max={100} value={form.likelihood_score} onChange={e => setFormField('likelihood_score', Number(e.target.value))} disabled={isReadOnly} /></div>
            <div><Label>Control Eff. (15%)</Label><Input type="number" min={0} max={100} value={form.control_effectiveness_score} onChange={e => setFormField('control_effectiveness_score', Number(e.target.value))} disabled={isReadOnly} /></div>
            <div><Label>Velocity (10%)</Label><Input type="number" min={0} max={100} value={form.velocity_score} onChange={e => setFormField('velocity_score', Number(e.target.value))} disabled={isReadOnly} /></div>
            <div><Label>Regulatory (15%)</Label><Input type="number" min={0} max={100} value={form.regulatory_score} onChange={e => setFormField('regulatory_score', Number(e.target.value))} disabled={isReadOnly} /></div>
            <div><Label>Reputational (10%)</Label><Input type="number" min={0} max={100} value={form.reputational_score} onChange={e => setFormField('reputational_score', Number(e.target.value))} disabled={isReadOnly} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4 p-3 rounded-md bg-muted">
            <div><Label>Overall Score</Label><p className="text-lg font-bold">{form.overall_risk_score}</p></div>
            <div><Label>Risk Level</Label><StatusBadge status={form.risk_level} /></div>
          </div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setFormField('notes', e.target.value)} disabled={isReadOnly} /></div>
        </div>
      </StandardModal>
    </PageShell>
  );
}