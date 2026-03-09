import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Briefcase, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { PageShell, StandardSearchFilterBar, DataTable, StandardModal, StatusBadge } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { useIAEngagements } from '@/hooks/useAuditDataPhase2';
import { useIADepartments } from '@/hooks/useAuditData';
import { useAuditFields } from '@/hooks/useAuditTrail';
import { MetricCard } from '@/components/shared/MetricCard';

const STATUSES = ['Draft', 'Submitted', 'Approved', 'In Progress', 'Fieldwork Complete', 'Reporting', 'Closed'];
const RISK_RATINGS = ['High', 'Medium', 'Low'];

const emptyForm = {
  engagement_name: '', engagement_code: '', department_id: '', scope: '', objectives: '',
  methodology: '', criteria: '', engagement_risk_rating: 'Medium', estimated_hours: 0,
  budgeted_hours: 0, planned_start_date: '', planned_end_date: '', status: 'Draft',
};

export default function AuditEngagements() {
  const { data = [], isLoading, isError, create, update } = useIAEngagements();
  const { data: departments = [] } = useIADepartments();
  const { getCreateFields, getUpdateFields } = useAuditFields();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ status: 'all', risk: 'all' });
  const [modalState, setModalState] = useState<{ mode: 'create' | 'edit' | 'view' | null; record?: any }>({ mode: null });
  const [form, setForm] = useState(emptyForm);

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

  const openAdd = () => { setForm(emptyForm); setModalState({ mode: 'create' }); };
  const openEdit = (r: any) => {
    setForm({ engagement_name: r.engagement_name || '', engagement_code: r.engagement_code || '', department_id: r.department_id || '', scope: r.scope || '', objectives: r.objectives || '', methodology: r.methodology || '', criteria: r.criteria || '', engagement_risk_rating: r.engagement_risk_rating || 'Medium', estimated_hours: r.estimated_hours || 0, budgeted_hours: r.budgeted_hours || 0, planned_start_date: r.planned_start_date || '', planned_end_date: r.planned_end_date || '', status: r.status || 'Draft' });
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

  const isReadOnly = modalState.mode === 'view';

  const columns: DataTableColumn<any>[] = [
    { key: 'engagement_code', header: 'Code' },
    { key: 'engagement_name', header: 'Engagement' },
    { key: 'engagement_risk_rating', header: 'Risk', render: (r) => <StatusBadge status={r.engagement_risk_rating} /> },
    { key: 'estimated_hours', header: 'Est. Hours' },
    { key: 'planned_start_date', header: 'Start Date' },
    { key: 'planned_end_date', header: 'End Date' },
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
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Engagement Name</Label><Input value={form.engagement_name} onChange={e => setForm(f => ({ ...f, engagement_name: e.target.value }))} disabled={isReadOnly} /></div>
            <div><Label>Engagement Code</Label><Input value={form.engagement_code} onChange={e => setForm(f => ({ ...f, engagement_code: e.target.value }))} disabled={isReadOnly} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Department</Label>
              <Select value={form.department_id} onValueChange={v => setForm(f => ({ ...f, department_id: v }))} disabled={isReadOnly}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Risk Rating</Label>
              <Select value={form.engagement_risk_rating} onValueChange={v => setForm(f => ({ ...f, engagement_risk_rating: v }))} disabled={isReadOnly}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RISK_RATINGS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))} disabled={isReadOnly}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Est. Hours</Label><Input type="number" value={form.estimated_hours} onChange={e => setForm(f => ({ ...f, estimated_hours: Number(e.target.value) }))} disabled={isReadOnly} /></div>
              <div><Label>Budget Hours</Label><Input type="number" value={form.budgeted_hours} onChange={e => setForm(f => ({ ...f, budgeted_hours: Number(e.target.value) }))} disabled={isReadOnly} /></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Planned Start</Label><Input type="date" value={form.planned_start_date} onChange={e => setForm(f => ({ ...f, planned_start_date: e.target.value }))} disabled={isReadOnly} /></div>
            <div><Label>Planned End</Label><Input type="date" value={form.planned_end_date} onChange={e => setForm(f => ({ ...f, planned_end_date: e.target.value }))} disabled={isReadOnly} /></div>
          </div>
          <div><Label>Scope</Label><Textarea value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value }))} disabled={isReadOnly} /></div>
          <div><Label>Objectives</Label><Textarea value={form.objectives} onChange={e => setForm(f => ({ ...f, objectives: e.target.value }))} disabled={isReadOnly} /></div>
          <div><Label>Methodology</Label><Textarea value={form.methodology} onChange={e => setForm(f => ({ ...f, methodology: e.target.value }))} disabled={isReadOnly} /></div>
        </div>
      </StandardModal>
    </PageShell>
  );
}
