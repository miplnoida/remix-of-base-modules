import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Briefcase, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { PageShell, StandardSearchFilterBar, DataTable, StandardModal, StatusBadge, ExportDropdown } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { useIAEngagements } from '@/hooks/useAuditDataPhase2';
import { useIADepartments, useIAAnnualPlans, useIAAuditors, useIADepartmentFunctions } from '@/hooks/useAuditData';
import { useAuditFields } from '@/hooks/useAuditTrail';
import { MetricCard } from '@/components/shared/MetricCard';

const STATUSES = ['Draft', 'Submitted', 'Approved', 'In Progress', 'Fieldwork Complete', 'Reporting', 'Closed'];
const RISK_RATINGS = ['Critical', 'High', 'Medium', 'Low'];

const generateEngagementCode = () => {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `ENG-${dateStr}-${rand}`;
};

const emptyForm = {
  engagement_name: '', engagement_code: '', annual_plan_id: '', department_id: '',
  function_id: '', lead_auditor_id: '', supportive_auditor_ids: [] as string[],
  scope: '', objectives: '', methodology: '', criteria: '',
  engagement_risk_rating: 'Medium', estimated_hours: 0, estimated_budget: 0,
  budgeted_hours: 0, planned_start_date: '', planned_end_date: '', status: 'Draft',
};

export default function AuditEngagements() {
  const navigate = useNavigate();
  const { data = [], isLoading, isError, create, update } = useIAEngagements();
  const { data: departments = [] } = useIADepartments();
  const { data: plans = [] } = useIAAnnualPlans();
  const { data: auditors = [] } = useIAAuditors();
  const { getCreateFields, getUpdateFields } = useAuditFields();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ status: 'all', risk: 'all' });
  const [modalState, setModalState] = useState<{ mode: 'create' | 'edit' | 'view' | null; record?: any }>({ mode: null });
  const [form, setForm] = useState(emptyForm);

  // Cascading: Department → Functions
  const { data: deptFunctions = [] } = useIADepartmentFunctions(form.department_id || undefined);

  const approvedPlans = (plans || []).filter((p: any) =>
    p.status === 'Approved' || p.status === 'Internally Approved' || p.status === 'In Progress'
  );

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
    draft: data.filter((d: any) => d.status === 'Draft').length,
  };

  const getPlanName = (id: string) => plans?.find((p: any) => p.id === id)?.title || id;
  const getDeptName = (id: string) => departments?.find((d: any) => d.id === id)?.name || id;
  const getAuditorName = (id: string) => auditors?.find((a: any) => a.id === id)?.name || id;

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
      scope: r.scope || '', objectives: r.objectives || '', methodology: r.methodology || '',
      criteria: r.criteria || '', engagement_risk_rating: r.engagement_risk_rating || 'Medium',
      estimated_hours: r.estimated_hours || 0, estimated_budget: r.estimated_budget || 0,
      budgeted_hours: r.budgeted_hours || 0,
      planned_start_date: r.planned_start_date || '', planned_end_date: r.planned_end_date || '',
      status: r.status || 'Draft',
    });
    setModalState({ mode: 'edit', record: r });
  };
  const openView = (r: any) => { openEdit(r); setModalState({ mode: 'view', record: r }); };

  const handleSave = () => {
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
      methodology: form.methodology,
      criteria: form.criteria,
      engagement_risk_rating: form.engagement_risk_rating,
      estimated_hours: form.estimated_hours,
      estimated_budget: form.estimated_budget,
      budgeted_hours: form.budgeted_hours,
      planned_start_date: form.planned_start_date || null,
      planned_end_date: form.planned_end_date || null,
      status: form.status,
    };
    if (modalState.mode === 'create') {
      create.mutate({ ...payload, ...getCreateFields() } as any, { onSuccess: () => setModalState({ mode: null }) });
    } else if (modalState.mode === 'edit' && modalState.record) {
      update.mutate({ id: modalState.record.id, ...payload, ...getUpdateFields() } as any, { onSuccess: () => setModalState({ mode: null }) });
    }
  };

  const isReadOnly = modalState.mode === 'view';

  // Supportive auditor multi-select helpers
  const toggleSupportiveAuditor = (auditorId: string) => {
    setForm(f => {
      const current = f.supportive_auditor_ids;
      if (current.includes(auditorId)) {
        return { ...f, supportive_auditor_ids: current.filter(id => id !== auditorId) };
      }
      return { ...f, supportive_auditor_ids: [...current, auditorId] };
    });
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'engagement_code', header: 'Code' },
    { key: 'engagement_name', header: 'Engagement' },
    { key: 'annual_plan_id', header: 'Annual Plan', render: (r) => r.annual_plan_id ? getPlanName(r.annual_plan_id) : <span className="text-muted-foreground text-xs">—</span> },
    { key: 'department_id', header: 'Department', render: (r) => r.department_id ? getDeptName(r.department_id) : <span className="text-muted-foreground text-xs">—</span> },
    { key: 'lead_auditor_id', header: 'Lead Auditor', render: (r) => r.lead_auditor_id ? getAuditorName(r.lead_auditor_id) : <span className="text-muted-foreground text-xs">—</span> },
    { key: 'engagement_risk_rating', header: 'Risk', render: (r) => <StatusBadge status={r.engagement_risk_rating} /> },
    { key: 'planned_start_date', header: 'Start Date' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  const filterFields: StandardFilterField[] = [
    { key: 'status', label: 'Status', type: 'select', options: [{ label: 'All', value: 'all' }, ...STATUSES.map(s => ({ label: s, value: s }))] },
    { key: 'risk', label: 'Risk Rating', type: 'select', options: [{ label: 'All', value: 'all' }, ...RISK_RATINGS.map(r => ({ label: r, value: r }))] },
  ];

  return (
    <PageShell title="Audit Engagements" subtitle="Manage engagement-level planning and execution"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/dashboard' }, { label: 'Engagements' }]}
      actions={<Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />New Engagement</Button>}
      isLoading={isLoading} error={isError ? 'Failed to load' : null}>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Engagements" value={stats.total} icon={Briefcase} variant="info" />
        <MetricCard title="In Progress" value={stats.inProgress} icon={Clock} variant="warning" />
        <MetricCard title="Completed" value={stats.completed} icon={CheckCircle} variant="success" />
        <MetricCard title="Draft" value={stats.draft} icon={AlertTriangle} variant="default" />
      </div>

      <Card><CardContent className="p-4">
        <StandardSearchFilterBar searchValue={searchTerm} onSearchChange={setSearchTerm} searchPlaceholder="Search engagements..." filterValues={filters} onFilterChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))} filters={filterFields} onReset={() => { setSearchTerm(''); setFilters({ status: 'all', risk: 'all' }); }} />
      </CardContent></Card>

      <Card><CardContent>
        <DataTable columns={columns} data={filtered} onView={openView}
          renderActions={(row) => <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(row); }}>Edit</Button>} />
      </CardContent></Card>

      <StandardModal open={modalState.mode !== null} onOpenChange={() => setModalState({ mode: null })}
        title={modalState.mode === 'create' ? 'New Engagement' : modalState.mode === 'edit' ? 'Edit Engagement' : 'View Engagement'}
        mode={modalState.mode || 'view'} onSave={handleSave} saveLabel="Save" isSaving={create.isPending || update.isPending} size="4xl">
        <div className="space-y-4">
          {/* 1. Engagement Title & 2. Auto-generated ID */}
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Engagement Title</Label><Input value={form.engagement_name} onChange={e => setForm(f => ({ ...f, engagement_name: e.target.value }))} disabled={isReadOnly} /></div>
            <div><Label>Engagement ID <span className="text-xs text-muted-foreground">(auto-generated)</span></Label><Input value={form.engagement_code} disabled className="bg-muted" /></div>
          </div>

          {/* 3. Annual Plan */}
          <div>
            <Label>Annual Plan <span className="text-muted-foreground text-xs">(approved plans only)</span></Label>
            <Select value={form.annual_plan_id} onValueChange={v => setForm(f => ({ ...f, annual_plan_id: v }))} disabled={isReadOnly}>
              <SelectTrigger><SelectValue placeholder="Select annual plan" /></SelectTrigger>
              <SelectContent>
                {approvedPlans.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title} ({p.fiscal_year})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* 4. Department & 5. Function (cascading) */}
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Department</Label>
              <Select value={form.department_id} onValueChange={v => setForm(f => ({ ...f, department_id: v, function_id: '' }))} disabled={isReadOnly}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Function</Label>
              <Select value={form.function_id} onValueChange={v => setForm(f => ({ ...f, function_id: v }))} disabled={isReadOnly || !form.department_id}>
                <SelectTrigger><SelectValue placeholder={form.department_id ? 'Select function' : 'Select department first'} /></SelectTrigger>
                <SelectContent>
                  {deptFunctions.map((fn: any) => <SelectItem key={fn.id} value={fn.id}>{fn.function_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 6. Lead Auditor & 7. Supportive Auditor */}
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Lead Auditor</Label>
              <Select value={form.lead_auditor_id} onValueChange={v => setForm(f => ({ ...f, lead_auditor_id: v }))} disabled={isReadOnly}>
                <SelectTrigger><SelectValue placeholder="Select lead auditor" /></SelectTrigger>
                <SelectContent>
                  {(auditors || []).map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Supportive Auditor(s)</Label>
              <div className="border rounded-md p-2 max-h-[120px] overflow-y-auto space-y-1 bg-background">
                {(auditors || [])
                  .filter((a: any) => a.id !== form.lead_auditor_id)
                  .map((a: any) => (
                    <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted rounded px-1 py-0.5">
                      <Checkbox
                        checked={form.supportive_auditor_ids.includes(a.id)}
                        onCheckedChange={() => !isReadOnly && toggleSupportiveAuditor(a.id)}
                        disabled={isReadOnly}
                      />
                      {a.name}
                    </label>
                  ))}
                {(auditors || []).filter((a: any) => a.id !== form.lead_auditor_id).length === 0 && (
                  <p className="text-xs text-muted-foreground">No auditors available</p>
                )}
              </div>
            </div>
          </div>

          {/* 8. Risk Rating */}
          <div><Label>Risk Rating</Label>
            <Select value={form.engagement_risk_rating} onValueChange={v => setForm(f => ({ ...f, engagement_risk_rating: v }))} disabled={isReadOnly}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{RISK_RATINGS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {/* 9. Start Date & 10. End Date */}
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Start Date</Label><Input type="date" value={form.planned_start_date} onChange={e => setForm(f => ({ ...f, planned_start_date: e.target.value }))} disabled={isReadOnly} /></div>
            <div><Label>End Date</Label><Input type="date" value={form.planned_end_date} onChange={e => setForm(f => ({ ...f, planned_end_date: e.target.value }))} disabled={isReadOnly} /></div>
          </div>

          {/* 11. Est. Hours & 12. Est. Budget */}
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Est. Hours</Label><Input type="number" value={form.estimated_hours} onChange={e => setForm(f => ({ ...f, estimated_hours: Number(e.target.value) }))} disabled={isReadOnly} /></div>
            <div><Label>Est. Budget</Label><Input type="number" value={form.estimated_budget} onChange={e => setForm(f => ({ ...f, estimated_budget: Number(e.target.value) }))} disabled={isReadOnly} /></div>
          </div>

          {/* 13. Status */}
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))} disabled={isReadOnly}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {/* 14. Scope, 15. Objective, 16. Methodology */}
          <div><Label>Scope</Label><Textarea value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value }))} disabled={isReadOnly} /></div>
          <div><Label>Objective</Label><Textarea value={form.objectives} onChange={e => setForm(f => ({ ...f, objectives: e.target.value }))} disabled={isReadOnly} /></div>
          <div><Label>Methodology</Label><Textarea value={form.methodology} onChange={e => setForm(f => ({ ...f, methodology: e.target.value }))} disabled={isReadOnly} /></div>
        </div>
      </StandardModal>
    </PageShell>
  );
}
