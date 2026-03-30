import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, Eye, Edit, RefreshCw, X } from 'lucide-react';
import { StatusBadge, DataTable } from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { useEngagementFollowUps } from '@/hooks/useEngagementData';
import { useIAFollowUpMutations } from '@/hooks/useAuditData';
import { AuditEmptyState } from '@/components/audit/workspace/AuditEmptyState';
import { formatDateForDisplay } from '@/lib/format-config';
import { useUserCode } from '@/hooks/useUserCode';

const FOLLOW_UP_STATUSES = ['Open', 'In Progress', 'Resolved', 'Overdue', 'Closed'];
const FOLLOW_UP_TYPES = ['Action Verification', 'Implementation Check', 'Evidence Collection', 'Re-Test', 'Management Meeting', 'Other'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

const emptyForm = {
  action_required: '', description: '', follow_up_type: '', priority: 'Medium',
  responsible_party: '', responsible_name: '', due_date: '', status: 'Open',
  scheduled_follow_up_date: '', resolution: '', resolved_date: '', finding_id: '',
};

interface AuditFollowUpsTabProps {
  auditId: string;
  auditFindings?: any[];
  departmentId?: string;
}

export function AuditFollowUpsTab({ auditId, auditFindings = [], departmentId }: AuditFollowUpsTabProps) {
  const { data: followUps = [], isLoading } = useEngagementFollowUps(auditId);
  const { create, update } = useIAFollowUpMutations();
  const { userCode } = useUserCode();
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view' | null>(null);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const closeForm = () => { setFormMode(null); setEditRecord(null); };

  const openCreate = () => { setForm({ ...emptyForm }); setFormMode('create'); setEditRecord(null); };
  const openEdit = (r: any) => {
    setForm({
      action_required: r.action_required || '', description: r.description || '',
      follow_up_type: r.follow_up_type || '', priority: r.priority || 'Medium',
      responsible_party: r.responsible_party || '', responsible_name: r.responsible_name || '',
      due_date: r.due_date || '', status: r.status || 'Open',
      scheduled_follow_up_date: r.scheduled_follow_up_date || '',
      resolution: r.resolution || '', resolved_date: r.resolved_date || '', finding_id: r.finding_id || '',
    });
    setFormMode('edit'); setEditRecord(r);
  };
  const openView = (r: any) => { openEdit(r); setFormMode('view'); };

  const handleSave = () => {
    if (!form.action_required || !form.due_date) return;
    const payload = {
      action_required: form.action_required, description: form.description || null,
      follow_up_type: form.follow_up_type || null, priority: form.priority || null,
      responsible_party: form.responsible_party || null, responsible_name: form.responsible_name || null,
      due_date: form.due_date, status: form.status, scheduled_follow_up_date: form.scheduled_follow_up_date || null,
      resolution: form.resolution || null, resolved_date: form.resolved_date || null,
      finding_id: form.finding_id || null, engagement_id: auditId, department_id: departmentId || null,
    };
    if (formMode === 'create') {
      create.mutate({ ...payload, created_by: userCode || null } as any, { onSuccess: closeForm });
    } else if (formMode === 'edit' && editRecord) {
      update.mutate({ id: editRecord.id, ...payload, updated_by: userCode || null } as any, { onSuccess: closeForm });
    }
  };

  const isOverdue = (r: any) => r.due_date && !['Resolved', 'Closed'].includes(r.status || '') && new Date(r.due_date) < new Date();

  const columns: DataTableColumn<any>[] = [
    { key: 'action_required', header: 'Action Required', render: (r) => <span className="text-sm max-w-[200px] truncate block font-medium">{r.action_required || '—'}</span> },
    { key: 'follow_up_type', header: 'Type', render: (r) => <span className="text-xs">{r.follow_up_type || '—'}</span> },
    { key: 'finding_id', header: 'Finding', render: (r) => {
      if (!r.finding_id) return <span className="text-muted-foreground text-xs">—</span>;
      const finding = auditFindings.find((f: any) => f.id === r.finding_id);
      return <span className="text-xs">{finding?.title || r.finding_id.slice(0, 8)}</span>;
    }},
    { key: 'responsible_name', header: 'Responsible', render: (r) => <span className="text-xs">{r.responsible_name || r.responsible_party || '—'}</span> },
    { key: 'due_date', header: 'Due Date', render: (r) => (
      <span className={`text-xs ${isOverdue(r) ? 'text-destructive font-medium' : ''}`}>
        {r.due_date ? formatDateForDisplay(r.due_date) : '—'}
      </span>
    )},
    { key: 'priority', header: 'Priority', render: (r) => r.priority ? <StatusBadge status={r.priority} /> : <span className="text-muted-foreground text-xs">—</span> },
    { key: 'status', header: 'Status', render: (r) => (
      <div className="flex gap-1">
        <StatusBadge status={r.status || 'Open'} />
        {isOverdue(r) && <StatusBadge status="Overdue" />}
      </div>
    )},
  ];

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{followUps.length} follow-up(s)</p>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add Follow-up</Button>
      </div>

      {/* Inline Form */}
      {formMode && (
        <Card className="border-primary/20">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">
                {formMode === 'create' ? 'New Follow-up' : formMode === 'edit' ? 'Edit Follow-up' : 'Follow-up Detail'}
              </p>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={closeForm}><X className="h-4 w-4" /></Button>
            </div>
            <div><Label>Action Required *</Label><Textarea value={form.action_required} onChange={e => setForm(f => ({ ...f, action_required: e.target.value }))} rows={3} disabled={formMode === 'view'} className="text-sm leading-relaxed" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} disabled={formMode === 'view'} className="text-sm leading-relaxed" /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Follow-up Type</Label>
                <Select value={form.follow_up_type || '__none__'} onValueChange={v => setForm(f => ({ ...f, follow_up_type: v === '__none__' ? '' : v }))} disabled={formMode === 'view'}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select type</SelectItem>
                    {FOLLOW_UP_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))} disabled={formMode === 'view'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))} disabled={formMode === 'view'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FOLLOW_UP_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Linked Finding</Label>
                <Select value={form.finding_id || '__none__'} onValueChange={v => setForm(f => ({ ...f, finding_id: v === '__none__' ? '' : v }))} disabled={formMode === 'view'}>
                  <SelectTrigger><SelectValue placeholder="Select finding (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {auditFindings.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Due Date *</Label><Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} disabled={formMode === 'view'} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Responsible Person</Label><Input value={form.responsible_name} onChange={e => setForm(f => ({ ...f, responsible_name: e.target.value }))} disabled={formMode === 'view'} /></div>
              <div><Label>Scheduled Follow-up Date</Label><Input type="date" value={form.scheduled_follow_up_date} onChange={e => setForm(f => ({ ...f, scheduled_follow_up_date: e.target.value }))} disabled={formMode === 'view'} /></div>
            </div>
            {(form.status === 'Resolved' || form.status === 'Closed') && (
              <>
                <div><Label>Resolution Notes</Label><Textarea value={form.resolution} onChange={e => setForm(f => ({ ...f, resolution: e.target.value }))} rows={3} disabled={formMode === 'view'} className="text-sm leading-relaxed" /></div>
                <div><Label>Resolved Date</Label><Input type="date" value={form.resolved_date} onChange={e => setForm(f => ({ ...f, resolved_date: e.target.value }))} disabled={formMode === 'view'} /></div>
              </>
            )}
            {formMode !== 'view' && (
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={create.isPending || update.isPending}>Save</Button>
                <Button variant="outline" onClick={closeForm}>Cancel</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {followUps.length === 0 && !formMode ? (
        <AuditEmptyState icon={RefreshCw} title="No follow-ups scheduled"
          description="Follow-ups track verification of corrective action implementation and confirm that audit recommendations have been addressed."
          actionLabel="Schedule Follow-up" onAction={openCreate} />
      ) : followUps.length > 0 && (
        <Card><CardContent className="pt-4">
          <DataTable columns={columns} data={followUps} emptyMessage="No follow-ups."
            rowClassName={(row) => isOverdue(row) ? 'bg-destructive/5' : ''}
            renderActions={(row) => (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openView(row); }}><Eye className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(row); }}><Edit className="h-3.5 w-3.5" /></Button>
              </div>
            )}
          />
        </CardContent></Card>
      )}
    </div>
  );
}
