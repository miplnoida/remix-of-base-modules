import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, Edit, Eye, ClipboardCheck } from 'lucide-react';
import { StatusBadge, DataTable, StandardModal } from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { useEngagementActivities } from '@/hooks/useEngagementData';
import { useIAActivityMutations } from '@/hooks/useAuditDataExtended';
import { AuditEmptyState } from '@/components/audit/workspace/AuditEmptyState';
import { formatDateForDisplay } from '@/lib/format-config';
import { useAuditFields } from '@/hooks/useAuditTrail';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

const ACTIVITY_STATUSES = ['Planned', 'In Progress', 'Completed', 'Deferred', 'Cancelled'];
const ACTIVITY_TYPES = ['Document Review', 'Walkthrough', 'Testing', 'Interview', 'Observation', 'Data Analysis', 'Sampling', 'Reconciliation', 'Inspection', 'Other'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

const emptyForm = {
  name: '', title: '', description: '', status: 'Planned', activity_type: '',
  planned_date_from: '', planned_date_to: '', actual_date_from: '', actual_date_to: '',
  control_area: '', function_area: '', location: '', priority: 'Medium',
  auditor_id: '', auditor_name: '',
};

interface AuditActivitiesTabProps {
  auditId: string;
  departmentAuditId?: string;
  auditors?: any[];
}

export function AuditActivitiesTab({ auditId, departmentAuditId, auditors = [] }: AuditActivitiesTabProps) {
  const { data: activities = [], isLoading } = useEngagementActivities(auditId);
  const { create, update } = useIAActivityMutations();
  const { getCreateFields, getUpdateFields } = useAuditFields();
  const [modal, setModal] = useState<{ mode: 'create' | 'edit' | 'view' | null; record?: any }>({ mode: null });
  const [form, setForm] = useState(emptyForm);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const openCreate = () => { setForm({ ...emptyForm }); setModal({ mode: 'create' }); setAdvancedOpen(false); };
  const openEdit = (r: any) => {
    setForm({
      name: r.name || '', title: r.title || '', description: r.description || '', status: r.status || 'Planned',
      activity_type: r.activity_type || '', planned_date_from: r.planned_date_from || r.start_date || '',
      planned_date_to: r.planned_date_to || r.end_date || '', actual_date_from: r.actual_date_from || '',
      actual_date_to: r.actual_date_to || '', control_area: r.control_area || '', function_area: r.function_area || '',
      location: r.location || '', priority: r.priority || 'Medium', auditor_id: r.auditor_id || '', auditor_name: r.auditor_name || '',
    });
    setModal({ mode: 'edit', record: r });
  };
  const openView = (r: any) => { openEdit(r); setModal({ mode: 'view', record: r }); };

  const handleSave = () => {
    if (!form.name) return;
    const payload = {
      name: form.name, title: form.title || form.name, description: form.description || null,
      status: form.status, activity_type: form.activity_type || null,
      planned_date_from: form.planned_date_from || null, planned_date_to: form.planned_date_to || null,
      actual_date_from: form.actual_date_from || null, actual_date_to: form.actual_date_to || null,
      start_date: form.planned_date_from || null, end_date: form.planned_date_to || null,
      control_area: form.control_area || null, function_area: form.function_area || null,
      location: form.location || null, priority: form.priority || null,
      auditor_id: form.auditor_id || null, auditor_name: form.auditor_name || null,
      engagement_id: auditId, department_audit_id: departmentAuditId || null,
    };
    if (modal.mode === 'create') {
      create.mutate({ ...payload, ...getCreateFields() } as any, { onSuccess: () => setModal({ mode: null }) });
    } else if (modal.mode === 'edit' && modal.record) {
      update.mutate({ id: modal.record.id, ...payload, ...getUpdateFields() } as any, { onSuccess: () => setModal({ mode: null }) });
    }
  };

  const getAuditorLabel = (id: string) => auditors.find((a: any) => a.id === id)?.name || id || '—';

  const columns: DataTableColumn<any>[] = [
    { key: 'name', header: 'Activity Name', render: (r) => (
      <div><span className="font-medium text-sm">{r.name || r.title || '—'}</span>
        {r.activity_type && <span className="text-xs text-muted-foreground block">{r.activity_type}</span>}
      </div>
    )},
    { key: 'control_area', header: 'Control / Function Area', render: (r) => (
      <div className="text-xs">{r.control_area || r.function_area || '—'}</div>
    )},
    { key: 'auditor_id', header: 'Assigned To', render: (r) => <span className="text-sm">{r.auditor_name || (r.auditor_id ? getAuditorLabel(r.auditor_id) : '—')}</span> },
    { key: 'planned_date_from', header: 'Planned Period', render: (r) => (
      <span className="text-xs">
        {r.planned_date_from ? formatDateForDisplay(r.planned_date_from) : r.start_date ? formatDateForDisplay(r.start_date) : '—'}
        {(r.planned_date_to || r.end_date) ? ` — ${formatDateForDisplay(r.planned_date_to || r.end_date)}` : ''}
      </span>
    )},
    { key: 'priority', header: 'Priority', render: (r) => r.priority ? <StatusBadge status={r.priority} /> : <span className="text-muted-foreground text-xs">—</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status || 'Planned'} /> },
  ];

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{activities.length} activit{activities.length === 1 ? 'y' : 'ies'} recorded</p>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add Activity</Button>
      </div>

      {activities.length === 0 ? (
        <AuditEmptyState icon={ClipboardCheck} title="No audit activities yet"
          description="Activities represent individual audit tasks — document reviews, walkthroughs, testing, interviews, and observations performed during fieldwork."
          actionLabel="Add First Activity" onAction={openCreate} />
      ) : (
        <Card><CardContent className="pt-4">
          <DataTable columns={columns} data={activities} emptyMessage="No activities recorded."
            renderActions={(row) => (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openView(row); }}><Eye className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(row); }}><Edit className="h-3.5 w-3.5" /></Button>
              </div>
            )}
          />
        </CardContent></Card>
      )}

      {/* Create / Edit / View Modal */}
      <StandardModal open={modal.mode !== null} onOpenChange={() => setModal({ mode: null })}
        title={modal.mode === 'create' ? 'New Activity' : modal.mode === 'edit' ? 'Edit Activity' : 'Activity Detail'}
        mode={modal.mode === 'view' ? 'view' : modal.mode || 'create'} onSave={handleSave}
        saveLabel="Save Activity" isSaving={create.isPending || update.isPending} size="3xl">
        <div className="space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Core Information</p>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Activity Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} disabled={modal.mode === 'view'} placeholder="e.g. Review payroll records" /></div>
            <div><Label>Activity Type</Label>
              <Select value={form.activity_type} onValueChange={v => setForm(f => ({ ...f, activity_type: v }))} disabled={modal.mode === 'view'}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{ACTIVITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} disabled={modal.mode === 'view'} className="text-sm leading-relaxed" /></div>

          <div className="grid grid-cols-3 gap-4">
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))} disabled={modal.mode === 'view'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ACTIVITY_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))} disabled={modal.mode === 'view'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Assigned Auditor</Label>
              {auditors.length > 0 ? (
                <Select value={form.auditor_id} onValueChange={v => { const a = auditors.find((x: any) => x.id === v); setForm(f => ({ ...f, auditor_id: v, auditor_name: a?.name || '' })); }} disabled={modal.mode === 'view'}>
                  <SelectTrigger><SelectValue placeholder="Select auditor" /></SelectTrigger>
                  <SelectContent>{auditors.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Input value={form.auditor_name} onChange={e => setForm(f => ({ ...f, auditor_name: e.target.value }))} disabled={modal.mode === 'view'} placeholder="Auditor name" />
              )}
            </div>
          </div>

          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Schedule</p>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Planned Start</Label><Input type="date" value={form.planned_date_from} onChange={e => setForm(f => ({ ...f, planned_date_from: e.target.value }))} disabled={modal.mode === 'view'} /></div>
            <div><Label>Planned End</Label><Input type="date" value={form.planned_date_to} onChange={e => setForm(f => ({ ...f, planned_date_to: e.target.value }))} disabled={modal.mode === 'view'} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Actual Start</Label><Input type="date" value={form.actual_date_from} onChange={e => setForm(f => ({ ...f, actual_date_from: e.target.value }))} disabled={modal.mode === 'view'} /></div>
            <div><Label>Actual End</Label><Input type="date" value={form.actual_date_to} onChange={e => setForm(f => ({ ...f, actual_date_to: e.target.value }))} disabled={modal.mode === 'view'} /></div>
          </div>

          {/* Advanced fields in collapsible */}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2 cursor-pointer hover:text-foreground transition-colors">
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
              Additional Details
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Control Area</Label><Input value={form.control_area} onChange={e => setForm(f => ({ ...f, control_area: e.target.value }))} disabled={modal.mode === 'view'} placeholder="e.g. Payroll Controls" /></div>
                <div><Label>Function Area</Label><Input value={form.function_area} onChange={e => setForm(f => ({ ...f, function_area: e.target.value }))} disabled={modal.mode === 'view'} placeholder="e.g. Human Resources" /></div>
                <div><Label>Location</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} disabled={modal.mode === 'view'} placeholder="e.g. Head Office" /></div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </StandardModal>
    </div>
  );
}
