import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { StatusBadge, DataTable } from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { useEngagementActivities } from '@/hooks/useEngagementData';
import { useIAActivityMutations } from '@/hooks/useAuditDataExtended';
import { AuditEmptyState } from '@/components/audit/workspace/AuditEmptyState';
import { formatDateForDisplay } from '@/lib/format-config';
import { useAuditFields } from '@/hooks/useAuditTrail';
import { ClipboardCheck } from 'lucide-react';

const ACTIVITY_STATUSES = ['Planned', 'In Progress', 'Completed', 'Deferred', 'Cancelled'];

interface AuditActivitiesTabProps {
  auditId: string;
  departmentAuditId?: string;
}

export function AuditActivitiesTab({ auditId, departmentAuditId }: AuditActivitiesTabProps) {
  const { data: activities = [], isLoading } = useEngagementActivities(auditId);
  const { create, update } = useIAActivityMutations();
  const { getCreateFields } = useAuditFields();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    activity_name: '', description: '', status: 'Planned',
    planned_start_date: '', planned_end_date: '', assigned_to: '',
  });

  const handleCreate = () => {
    if (!form.activity_name) return;
    create.mutate({
      activity_name: form.activity_name,
      description: form.description || null,
      status: form.status,
      planned_start_date: form.planned_start_date || null,
      planned_end_date: form.planned_end_date || null,
      assigned_to: form.assigned_to || null,
      engagement_id: auditId,
      department_audit_id: departmentAuditId || null,
      ...getCreateFields(),
    } as any, {
      onSuccess: () => {
        setShowForm(false);
        setForm({ activity_name: '', description: '', status: 'Planned', planned_start_date: '', planned_end_date: '', assigned_to: '' });
      },
    });
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'activity_name', header: 'Activity', render: (r) => <span className="font-medium text-sm">{r.activity_name || r.name || '—'}</span> },
    { key: 'assigned_to', header: 'Assigned To', render: (r) => <span className="text-sm">{r.assigned_to || r.auditor_id || '—'}</span> },
    { key: 'planned_start_date', header: 'Start', render: (r) => r.planned_start_date ? formatDateForDisplay(r.planned_start_date) : '—' },
    { key: 'planned_end_date', header: 'End', render: (r) => r.planned_end_date ? formatDateForDisplay(r.planned_end_date) : '—' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status || 'Planned'} /> },
  ];

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{activities.length} activit{activities.length === 1 ? 'y' : 'ies'}</p>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-1" />Add Activity</Button>
      </div>

      {showForm && (
        <Card className="border-primary/20">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Activity Name *</Label><Input value={form.activity_name} onChange={e => setForm(f => ({ ...f, activity_name: e.target.value }))} placeholder="e.g. Review payroll records" /></div>
              <div><Label>Assigned To</Label><Input value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} placeholder="Person responsible" /></div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Start Date</Label><Input type="date" value={form.planned_start_date} onChange={e => setForm(f => ({ ...f, planned_start_date: e.target.value }))} /></div>
              <div><Label>End Date</Label><Input type="date" value={form.planned_end_date} onChange={e => setForm(f => ({ ...f, planned_end_date: e.target.value }))} /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ACTIVITY_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={create.isPending}>Create Activity</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activities.length === 0 && !showForm ? (
        <AuditEmptyState icon={ClipboardCheck} title="No activities yet" description="Activities represent individual audit tasks and procedures" actionLabel="Add Activity" onAction={() => setShowForm(true)} />
      ) : (
        <Card><CardContent className="pt-4">
          <DataTable columns={columns} data={activities} emptyMessage="No activities recorded." />
        </CardContent></Card>
      )}
    </div>
  );
}
