import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Briefcase, Clock, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { PageShell, StandardSearchFilterBar, DataTable, StandardModal, StatusBadge, ExportDropdown } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { useIAEngagements } from '@/hooks/useAuditDataPhase2';
import { useIADepartments, useIAAnnualPlans, useIAActiveAuditors, useIADepartmentFunctions } from '@/hooks/useAuditData';
import { useAuditFields } from '@/hooks/useAuditTrail';
import { MetricCard } from '@/components/shared/MetricCard';
import { formatDateForDisplay } from '@/lib/format-config';
import { useCanStartEngagement, useEngagementCompleteness, useTeamAvailabilityCheck } from '@/hooks/useAuditWorkflowGates';
import { EngagementGatePanel } from '@/components/audit/EngagementGatePanel';
import { ConflictAlertPanel } from '@/components/audit/ConflictAlertPanel';
import { useToast } from '@/hooks/use-toast';

const STATUSES = ['Planned', 'In Progress', 'Findings Raised', 'Management Response', 'Closed'];
const RISK_RATINGS = ['Critical', 'High', 'Medium', 'Low'];

const generateEngagementCode = () => {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `AUD-${dateStr}-${rand}`;
};

const emptyForm = {
  engagement_name: '', engagement_code: '', annual_plan_id: '', department_id: '',
  function_id: '', lead_auditor_id: '', supportive_auditor_ids: [] as string[],
  scope: '', objectives: '',
  engagement_risk_rating: 'Medium',
  planned_start_date: '', planned_end_date: '', status: 'Planned',
  engagement_type: 'Planned Audit',
};

export default function AuditEngagements() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data = [], isLoading, isError, create, update } = useIAEngagements();
  const { data: departments = [] } = useIADepartments();
  const { data: plans = [] } = useIAAnnualPlans();
  const { data: auditors = [] } = useIAActiveAuditors();
  const { data: allFunctions = [] } = useIADepartmentFunctions('all');
  const { getCreateFields, getUpdateFields } = useAuditFields();
  const checkAvailability = useTeamAvailabilityCheck();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ status: 'all', risk: 'all' });
  const [modalState, setModalState] = useState<{ mode: 'create' | 'edit' | null; record?: any }>({ mode: null });
  const [form, setForm] = useState(emptyForm);
  const [selectedEngId, setSelectedEngId] = useState<string | null>(null);
  const [conflictResult, setConflictResult] = useState<any>(null);

  // Gate queries for selected engagement
  const { data: startGate, isLoading: startGateLoading } = useCanStartEngagement(selectedEngId || undefined);
  const { data: completenessGate, isLoading: completenessLoading } = useEngagementCompleteness(selectedEngId || undefined);

  // Cascading: Department → Functions
  const { data: deptFunctions = [] } = useIADepartmentFunctions(form.department_id || undefined);

  // Lookup maps
  const functionMap = useMemo(() => Object.fromEntries((allFunctions || []).map((fn: any) => [fn.id, fn])), [allFunctions]);
  const departmentMap = useMemo(() => Object.fromEntries((departments || []).map((d: any) => [d.id, d])), [departments]);

  const filtered = data.filter((r: any) => {
    const s = searchTerm.toLowerCase();
    const ms = !s || r.engagement_name?.toLowerCase().includes(s) || r.engagement_code?.toLowerCase().includes(s);
    const mSt = filters.status === 'all' || r.status === filters.status;
    const mR = filters.risk === 'all' || r.engagement_risk_rating === filters.risk;
    return ms && mSt && mR;
  });

  const stats = {
    total: data.length,
    inProgress: data.filter((d: any) => d.status === 'In Progress').length,
    completed: data.filter((d: any) => d.status === 'Closed').length,
    planned: data.filter((d: any) => d.status === 'Planned').length,
  };

  const getDeptName = (id: string) => departmentMap[id]?.name || '—';
  const getFunctionName = (id: string) => functionMap[id]?.function_name || '—';
  const getAuditorName = (id: string) => auditors?.find((a: any) => a.id === id)?.name || '—';

  const openAdd = () => {
    setForm({ ...emptyForm, engagement_code: generateEngagementCode() });
    setModalState({ mode: 'create' });
  };
  const openEdit = (r: any) => {
    setForm({
      engagement_name: r.engagement_name || '', engagement_code: r.engagement_code || '',
      annual_plan_id: r.annual_plan_id || '', department_id: r.department_id || '',
      function_id: r.function_id || '', lead_auditor_id: r.lead_auditor_id || '',
      supportive_auditor_ids: Array.isArray(r.supportive_auditor_ids) ? r.supportive_auditor_ids : [],
      scope: r.scope || '', objectives: r.objectives || '',
      engagement_risk_rating: r.engagement_risk_rating || 'Medium',
      planned_start_date: r.planned_start_date || '', planned_end_date: r.planned_end_date || '',
      status: r.status || 'Planned',
      engagement_type: r.engagement_type || 'Planned Audit',
    });
    setModalState({ mode: 'edit', record: r });
  };

  const handleSave = async () => {
    if (!form.engagement_name) return;
    const payload = {
      engagement_name: form.engagement_name,
      engagement_code: form.engagement_code,
      annual_plan_id: form.annual_plan_id || null,
      department_id: form.department_id || null,
      function_id: form.function_id || null,
      lead_auditor_id: form.lead_auditor_id || null,
      supportive_auditor_ids: form.supportive_auditor_ids,
      scope: form.scope,
      objectives: form.objectives,
      engagement_risk_rating: form.engagement_risk_rating,
      planned_start_date: form.planned_start_date || null,
      planned_end_date: form.planned_end_date || null,
      status: form.status,
      engagement_type: form.engagement_type,
    };

    // Run availability check if we have dates and auditors
    if (form.planned_start_date && form.planned_end_date && form.lead_auditor_id) {
      try {
        const teamIds = [form.lead_auditor_id, ...form.supportive_auditor_ids];
        const conflicts = await checkAvailability.mutateAsync({
          auditorIds: teamIds,
          dateFrom: form.planned_start_date,
          dateTo: form.planned_end_date,
        });
        setConflictResult(conflicts);
        if (conflicts.has_blocking) {
          toast({
            title: 'Blocking Conflicts',
            description: 'Resolve blocking conflicts before saving.',
            variant: 'destructive',
          });
          return;
        }
      } catch {
        // Non-critical - proceed with save
      }
    }

    if (modalState.mode === 'create') {
      create.mutate({ ...payload, ...getCreateFields() } as any, { onSuccess: () => { setModalState({ mode: null }); setConflictResult(null); } });
    } else if (modalState.mode === 'edit' && modalState.record) {
      update.mutate({ id: modalState.record.id, ...payload, ...getUpdateFields() } as any, { onSuccess: () => { setModalState({ mode: null }); setConflictResult(null); } });
    }
  };

  const toggleSupportiveAuditor = (auditorId: string) => {
    setForm(f => {
      const current = f.supportive_auditor_ids;
      return { ...f, supportive_auditor_ids: current.includes(auditorId) ? current.filter(id => id !== auditorId) : [...current, auditorId] };
    });
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'engagement_code', header: 'Code' },
    { key: 'engagement_name', header: 'Audit Title' },
    { key: 'department_id', header: 'Department', render: (r) => r.department_id ? getDeptName(r.department_id) : <span className="text-muted-foreground text-xs">—</span> },
    { key: 'function_id', header: 'Function', render: (r) => r.function_id ? getFunctionName(r.function_id) : <span className="text-muted-foreground text-xs">—</span> },
    { key: 'lead_auditor_id', header: 'Lead Auditor', render: (r) => r.lead_auditor_id ? getAuditorName(r.lead_auditor_id) : <span className="text-muted-foreground text-xs">—</span> },
    { key: 'engagement_risk_rating', header: 'Risk', render: (r) => <StatusBadge status={r.engagement_risk_rating} /> },
    { key: 'planned_start_date', header: 'Start', render: (r) => r.planned_start_date ? formatDateForDisplay(r.planned_start_date) : '—' },
    { key: 'planned_end_date', header: 'End', render: (r) => r.planned_end_date ? formatDateForDisplay(r.planned_end_date) : '—' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  const filterFields: StandardFilterField[] = [
    { key: 'status', label: 'Status', type: 'select', options: [{ label: 'All', value: 'all' }, ...STATUSES.map(s => ({ label: s, value: s }))] },
    { key: 'risk', label: 'Risk Rating', type: 'select', options: [{ label: 'All', value: 'all' }, ...RISK_RATINGS.map(r => ({ label: r, value: r }))] },
  ];

  return (
    <PageShell title="Audits" subtitle="Manage department function audits"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/dashboard' }, { label: 'Audits' }]}
      actions={<Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />New Audit</Button>}
      isLoading={isLoading} error={isError ? 'Failed to load' : null}>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Audits" value={stats.total} icon={Briefcase} variant="info" />
        <MetricCard title="In Progress" value={stats.inProgress} icon={Clock} variant="warning" />
        <MetricCard title="Completed" value={stats.completed} icon={CheckCircle} variant="success" />
        <MetricCard title="Planned" value={stats.planned} icon={AlertTriangle} variant="default" />
      </div>

      <Card><CardContent className="p-4">
        <StandardSearchFilterBar searchValue={searchTerm} onSearchChange={setSearchTerm} searchPlaceholder="Search audits..." filterValues={filters} onFilterChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))} filters={filterFields} onReset={() => { setSearchTerm(''); setFilters({ status: 'all', risk: 'all' }); }} />
      </CardContent></Card>

      {/* Conflict Alert */}
      {conflictResult && conflictResult.total_conflicts > 0 && (
        <ConflictAlertPanel conflicts={conflictResult.conflicts} onDismiss={() => setConflictResult(null)} />
      )}

      {/* Gate Panel for selected engagement */}
      {selectedEngId && (
        <EngagementGatePanel
          canStart={startGate}
          completeness={completenessGate}
          isLoading={startGateLoading || completenessLoading}
          onRefresh={() => setSelectedEngId(prev => prev)} 
        />
      )}

      <Card><CardContent>
        <DataTable columns={columns} data={filtered}
          renderActions={(row) => (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/audit/audits/${row.id}`); }}>View</Button>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(row); }}>Edit</Button>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedEngId(row.id); }} title="Check Gates">
                <ShieldCheck className="h-4 w-4" />
              </Button>
            </div>
          )} />
      </CardContent></Card>

      <StandardModal open={modalState.mode !== null} onOpenChange={() => setModalState({ mode: null })}
        title={modalState.mode === 'create' ? 'New Audit' : 'Edit Audit'}
        mode={modalState.mode || 'create'} onSave={handleSave} saveLabel="Save" isSaving={create.isPending || update.isPending} size="4xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Audit Title *</Label><Input value={form.engagement_name} onChange={e => setForm(f => ({ ...f, engagement_name: e.target.value }))} /></div>
            <div><Label>Audit ID <span className="text-xs text-muted-foreground">(auto)</span></Label><Input value={form.engagement_code} disabled className="bg-muted" /></div>
          </div>

          {/* Department → Function (cascading) */}
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Department *</Label>
              <Select value={form.department_id} onValueChange={v => setForm(f => ({ ...f, department_id: v, function_id: '' }))}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Function *</Label>
              <Select value={form.function_id} onValueChange={v => setForm(f => ({ ...f, function_id: v }))} disabled={!form.department_id}>
                <SelectTrigger><SelectValue placeholder={form.department_id ? 'Select function' : 'Select department first'} /></SelectTrigger>
                <SelectContent>
                  {deptFunctions.map((fn: any) => <SelectItem key={fn.id} value={fn.id}>{fn.function_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lead Auditor & Supportive */}
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Lead Auditor</Label>
              <Select value={form.lead_auditor_id} onValueChange={v => setForm(f => ({ ...f, lead_auditor_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select lead auditor" /></SelectTrigger>
                <SelectContent>{(auditors || []).map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Supportive Auditor(s)</Label>
              <div className="border rounded-md p-2 max-h-[120px] overflow-y-auto space-y-1 bg-background">
                {(auditors || []).filter((a: any) => a.id !== form.lead_auditor_id).map((a: any) => (
                  <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted rounded px-1 py-0.5">
                    <Checkbox checked={form.supportive_auditor_ids.includes(a.id)} onCheckedChange={() => toggleSupportiveAuditor(a.id)} />
                    {a.name}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Risk & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Risk Rating</Label>
              <Select value={form.engagement_risk_rating} onValueChange={v => setForm(f => ({ ...f, engagement_risk_rating: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RISK_RATINGS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Start Date</Label><Input type="date" value={form.planned_start_date} onChange={e => setForm(f => ({ ...f, planned_start_date: e.target.value }))} /></div>
            <div><Label>End Date</Label><Input type="date" value={form.planned_end_date} onChange={e => setForm(f => ({ ...f, planned_end_date: e.target.value }))} /></div>
          </div>

          {/* Annual Plan (optional) */}
          <div>
            <Label>Annual Plan <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Select value={form.annual_plan_id} onValueChange={v => setForm(f => ({ ...f, annual_plan_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Link to annual plan" /></SelectTrigger>
              <SelectContent>
                {(plans || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title} ({p.fiscal_year})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Scope & Objectives */}
          <div><Label>Scope</Label><Textarea value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value }))} /></div>
          <div><Label>Objectives</Label><Textarea value={form.objectives} onChange={e => setForm(f => ({ ...f, objectives: e.target.value }))} /></div>
        </div>
      </StandardModal>
    </PageShell>
  );
}
