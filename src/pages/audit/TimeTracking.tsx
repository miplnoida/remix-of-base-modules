import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Clock, Calendar, TrendingUp } from 'lucide-react';
import { PageShell, StandardSearchFilterBar, DataTable, StandardModal, ExportDropdown } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { useIATimeLogs, useIAEngagements } from '@/hooks/useAuditDataPhase2';
import { useIAAuditors } from '@/hooks/useAuditData';
import { useAuditFields } from '@/hooks/useAuditTrail';
import { MetricCard } from '@/components/shared/MetricCard';

const WORK_TYPES = ['Fieldwork', 'Planning', 'Reporting', 'Review', 'Administration', 'Training', 'Travel'];
const emptyForm = { work_date: new Date().toISOString().slice(0, 10), hours_spent: 0, work_type: 'Fieldwork', notes: '', engagement_id: '', auditor_id: '' };

export default function TimeTracking() {
  const { data = [], isLoading, isError, create, update } = useIATimeLogs();
  const { data: engagements = [] } = useIAEngagements();
  const { data: auditors = [] } = useIAAuditors();
  const { getCreateFields, getUpdateFields } = useAuditFields();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ work_type: 'all' });
  const [modalState, setModalState] = useState<{ mode: 'create' | 'edit' | null; record?: any }>({ mode: null });
  const [form, setForm] = useState(emptyForm);

  const getEngagementName = (id: string) => engagements?.find((e: any) => e.id === id)?.engagement_name || '';
  const getAuditorName = (id: string) => auditors?.find((a: any) => a.id === id)?.name || '';

  const filtered = data.filter((r: any) => (!searchTerm || r.notes?.toLowerCase().includes(searchTerm.toLowerCase()) || getAuditorName(r.auditor_id)?.toLowerCase().includes(searchTerm.toLowerCase())) && (filters.work_type === 'all' || r.work_type === filters.work_type));
  const totalHours = data.reduce((acc: number, d: any) => acc + (Number(d.hours_spent) || 0), 0);
  const weekHours = data.filter((d: any) => { const diff = (Date.now() - new Date(d.work_date).getTime()) / 86400000; return diff <= 7; }).reduce((acc: number, d: any) => acc + (Number(d.hours_spent) || 0), 0);

  const openAdd = () => { setForm(emptyForm); setModalState({ mode: 'create' }); };
  const openEdit = (r: any) => { setForm({ work_date: r.work_date || '', hours_spent: r.hours_spent || 0, work_type: r.work_type || 'Fieldwork', notes: r.notes || '', engagement_id: r.engagement_id || '', auditor_id: r.auditor_id || '' }); setModalState({ mode: 'edit', record: r }); };
  const handleSave = () => {
    const payload = { ...form, engagement_id: form.engagement_id || null, auditor_id: form.auditor_id || null };
    if (modalState.mode === 'create') create.mutate({ ...payload, ...getCreateFields() } as any, { onSuccess: () => setModalState({ mode: null }) });
    else if (modalState.mode === 'edit' && modalState.record) update.mutate({ id: modalState.record.id, ...payload, ...getUpdateFields() } as any, { onSuccess: () => setModalState({ mode: null }) });
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'work_date', header: 'Date' },
    { key: 'auditor_id', header: 'Auditor', render: (r) => r.auditor_id ? getAuditorName(r.auditor_id) : <span className="text-muted-foreground text-xs">—</span> },
    { key: 'engagement_id', header: 'Engagement', render: (r) => r.engagement_id ? getEngagementName(r.engagement_id) : <span className="text-muted-foreground text-xs">—</span> },
    { key: 'hours_spent', header: 'Hours' },
    { key: 'work_type', header: 'Type' },
    { key: 'notes', header: 'Notes' },
  ];
  const filterFields: StandardFilterField[] = [{ key: 'work_type', label: 'Work Type', type: 'select', options: [{ label: 'All', value: 'all' }, ...WORK_TYPES.map(t => ({ label: t, value: t }))] }];

  return (
    <PageShell title="Time Tracking" subtitle="Log and track auditor time by engagement and activity"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/dashboard' }, { label: 'Time Tracking' }]}
      actions={<Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Log Time</Button>}
      isLoading={isLoading} error={isError ? 'Failed to load' : null}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="Total Hours Logged" value={totalHours.toFixed(1)} icon={Clock} variant="info" />
        <MetricCard title="This Week" value={weekHours.toFixed(1)} icon={Calendar} variant="success" />
        <MetricCard title="Entries" value={data.length} icon={TrendingUp} variant="default" />
      </div>
      <Card><CardContent className="p-4">
        <StandardSearchFilterBar searchValue={searchTerm} onSearchChange={setSearchTerm} searchPlaceholder="Search time logs..." filterValues={filters} onFilterChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))} filters={filterFields} onReset={() => { setSearchTerm(''); setFilters({ work_type: 'all' }); }} />
      </CardContent></Card>
      <Card><CardContent>
        <DataTable columns={columns} data={filtered} renderActions={(row) => <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>Edit</Button>} />
      </CardContent></Card>
      <StandardModal open={modalState.mode !== null} onOpenChange={() => setModalState({ mode: null })}
        title={modalState.mode === 'create' ? 'Log Time' : 'Edit Time Entry'}
        mode={modalState.mode || 'create'} onSave={handleSave} saveLabel="Save" isSaving={create.isPending || update.isPending}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Work Date</Label><Input type="date" value={form.work_date} onChange={e => setForm(f => ({ ...f, work_date: e.target.value }))} /></div>
            <div><Label>Hours Spent</Label><Input type="number" step="0.25" min={0} max={24} value={form.hours_spent} onChange={e => setForm(f => ({ ...f, hours_spent: Number(e.target.value) }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Auditor</Label>
              <Select value={form.auditor_id} onValueChange={v => setForm(f => ({ ...f, auditor_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select auditor" /></SelectTrigger>
                <SelectContent>{(auditors || []).map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Work Type</Label><Select value={form.work_type} onValueChange={v => setForm(f => ({ ...f, work_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{WORK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div><Label>Engagement</Label>
            <Select value={form.engagement_id} onValueChange={v => setForm(f => ({ ...f, engagement_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select engagement (optional)" /></SelectTrigger>
              <SelectContent>{engagements.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.engagement_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
        </div>
      </StandardModal>
    </PageShell>
  );
}