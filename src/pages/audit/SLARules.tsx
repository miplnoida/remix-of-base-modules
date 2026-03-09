import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Bell, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { PageShell, StandardSearchFilterBar, DataTable, StandardModal, StatusBadge } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { useIASLARules } from '@/hooks/useAuditDataPhase2';
import { useAuditFields } from '@/hooks/useAuditTrail';
import { MetricCard } from '@/components/shared/MetricCard';

const TRIGGER_EVENTS = [
  'Overdue Management Response',
  'Overdue Corrective Action',
  'Overdue Follow-Up',
  'Plan Approval Pending',
  'Engagement Nearing Start',
  'Finding Not Addressed',
  'Report Draft Overdue',
];

const ESCALATION_LEVELS = ['Level 1 - Reminder', 'Level 2 - Manager', 'Level 3 - Director', 'Level 4 - Executive'];
const CHANNELS = ['in-app', 'email', 'both'];

const emptyForm = {
  rule_name: '',
  trigger_event: '',
  threshold_days: 7,
  escalation_level: 'Level 1 - Reminder',
  notify_roles: '',
  notification_channel: 'in-app',
  is_enabled: true,
  description: '',
};

export default function SLARules() {
  const { data = [], isLoading, isError, create, update, archive } = useIASLARules();
  const { getCreateFields, getUpdateFields } = useAuditFields();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ trigger_event: 'all' });
  const [modalState, setModalState] = useState<{ mode: 'create' | 'edit' | 'view' | null; record?: any }>({ mode: null });
  const [form, setForm] = useState(emptyForm);

  const filtered = data.filter((r: any) => {
    const s = searchTerm.toLowerCase();
    const matchSearch = !s || r.rule_name?.toLowerCase().includes(s) || r.trigger_event?.toLowerCase().includes(s);
    const matchTrigger = filters.trigger_event === 'all' || r.trigger_event === filters.trigger_event;
    return matchSearch && matchTrigger;
  });

  const stats = {
    total: data.length,
    enabled: data.filter((d: any) => d.is_enabled).length,
    disabled: data.filter((d: any) => !d.is_enabled).length,
    highEscalation: data.filter((d: any) => d.escalation_level?.includes('Level 3') || d.escalation_level?.includes('Level 4')).length,
  };

  const openAdd = () => { setForm(emptyForm); setModalState({ mode: 'create' }); };
  const openEdit = (r: any) => {
    setForm({
      rule_name: r.rule_name || '', trigger_event: r.trigger_event || '',
      threshold_days: r.threshold_days || 7, escalation_level: r.escalation_level || 'Level 1 - Reminder',
      notify_roles: r.notify_roles || '', notification_channel: r.notification_channel || 'in-app',
      is_enabled: r.is_enabled !== false, description: r.description || '',
    });
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
    { key: 'rule_name', header: 'Rule Name' },
    { key: 'trigger_event', header: 'Trigger Event' },
    { key: 'threshold_days', header: 'Threshold (Days)' },
    { key: 'escalation_level', header: 'Escalation Level', render: (r) => <StatusBadge status={r.escalation_level} /> },
    { key: 'notification_channel', header: 'Channel', render: (r) => <StatusBadge status={r.notification_channel} /> },
    { key: 'is_enabled', header: 'Enabled', render: (r) => <StatusBadge status={r.is_enabled ? 'Active' : 'Inactive'} /> },
  ];

  const filterFields: StandardFilterField[] = [
    { key: 'trigger_event', label: 'Trigger Event', type: 'select', options: [{ label: 'All Events', value: 'all' }, ...TRIGGER_EVENTS.map(t => ({ label: t, value: t }))] },
  ];

  return (
    <PageShell title="SLA & Escalation Rules" subtitle="Configure service-level and escalation rules for audit workflows"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/dashboard' }, { label: 'SLA & Escalation Rules' }]}
      actions={<Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Rule</Button>}
      isLoading={isLoading} error={isError ? 'Failed to load SLA rules' : null}>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Rules" value={stats.total} icon={Bell} variant="info" />
        <MetricCard title="Enabled" value={stats.enabled} icon={CheckCircle} variant="success" />
        <MetricCard title="Disabled" value={stats.disabled} icon={Clock} variant="warning" />
        <MetricCard title="High Escalation" value={stats.highEscalation} icon={AlertTriangle} variant="error" />
      </div>

      <Card><CardContent className="p-4">
        <StandardSearchFilterBar searchValue={searchTerm} onSearchChange={setSearchTerm} searchPlaceholder="Search rules..."
          filterValues={filters} onFilterChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))} filters={filterFields}
          onReset={() => { setSearchTerm(''); setFilters({ trigger_event: 'all' }); }} />
      </CardContent></Card>

      <Card><CardContent>
        <DataTable columns={columns} data={filtered} onView={openView}
          renderActions={(row) => (
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(row); }}>Edit</Button>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); archive.mutate(row.id); }}>Archive</Button>
            </div>
          )} />
      </CardContent></Card>

      <StandardModal open={modalState.mode !== null} onOpenChange={() => setModalState({ mode: null })}
        title={modalState.mode === 'create' ? 'Add SLA Rule' : modalState.mode === 'edit' ? 'Edit Rule' : 'View Rule'}
        mode={modalState.mode || 'view'} onSave={handleSave} saveLabel={modalState.mode === 'create' ? 'Create' : 'Save'}
        isSaving={create.isPending || update.isPending}>
        <div className="space-y-4">
          <div><Label>Rule Name</Label><Input value={form.rule_name} onChange={e => setForm(f => ({ ...f, rule_name: e.target.value }))} disabled={isReadOnly} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Trigger Event</Label>
              <Select value={form.trigger_event} onValueChange={v => setForm(f => ({ ...f, trigger_event: v }))} disabled={isReadOnly}>
                <SelectTrigger><SelectValue placeholder="Select event" /></SelectTrigger>
                <SelectContent>{TRIGGER_EVENTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Threshold (Days)</Label><Input type="number" min={1} value={form.threshold_days} onChange={e => setForm(f => ({ ...f, threshold_days: Number(e.target.value) }))} disabled={isReadOnly} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Escalation Level</Label>
              <Select value={form.escalation_level} onValueChange={v => setForm(f => ({ ...f, escalation_level: v }))} disabled={isReadOnly}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ESCALATION_LEVELS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Notification Channel</Label>
              <Select value={form.notification_channel} onValueChange={v => setForm(f => ({ ...f, notification_channel: v }))} disabled={isReadOnly}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CHANNELS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Notify Roles (comma-separated)</Label><Input value={form.notify_roles} onChange={e => setForm(f => ({ ...f, notify_roles: e.target.value }))} placeholder="e.g. audit_manager, director" disabled={isReadOnly} /></div>
          <div className="flex items-center gap-2">
            <Switch checked={form.is_enabled} onCheckedChange={v => setForm(f => ({ ...f, is_enabled: v }))} disabled={isReadOnly} />
            <Label>Enabled</Label>
          </div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} disabled={isReadOnly} /></div>
        </div>
      </StandardModal>
    </PageShell>
  );
}
