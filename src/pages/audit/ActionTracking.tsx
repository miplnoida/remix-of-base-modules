import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Upload } from 'lucide-react';
import { useIAActionTracking, useIAActionTrackingMutations, useIAFindings } from '@/hooks/useAuditData';
import { useAuditFields } from '@/hooks/useAuditTrail';
import { PageShell, StandardSearchFilterBar, DataTable, StatusBadge, EntityModal, BulkUploadModal, ExportDropdown } from '@/components/common';
import type { DataTableColumn, StandardFilterField, BulkUploadField } from '@/components/common';

const ACTION_STATUSES = ['Not Started', 'In Progress', 'Implemented', 'Verified', 'Closed'];

export default function ActionTracking() {
  const { getCreateFields, getUpdateFields } = useAuditFields();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ status: 'all' });
  const { data: actions = [], isLoading } = useIAActionTracking();
  const { data: findings = [] } = useIAFindings();
  const { create, update } = useIAActionTrackingMutations();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);
  const [formData, setFormData] = useState({ finding_id: '', action_description: '', responsible_person: '', target_date: '', notes: '', status: 'Not Started' });
  const resetForm = () => setFormData({ finding_id: '', action_description: '', responsible_person: '', target_date: '', notes: '', status: 'Not Started' });
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  const bulkUploadFields: BulkUploadField[] = [
    { key: 'finding_title', label: 'Finding Title', required: true },
    { key: 'action_description', label: 'Action Description', required: true },
    { key: 'responsible_person', label: 'Owner' },
    { key: 'target_date', label: 'Due Date', type: 'date' },
    { key: 'status', label: 'Status', allowedValues: ACTION_STATUSES },
  ];

  const handleBulkImport = async (data: Record<string, any>[]) => {
    for (const row of data) {
      const finding = findings.find((f: any) => f.title === row.finding_title);
      if (!finding) continue;
      create.mutate({
        finding_id: finding.id, action_description: row.action_description,
        responsible_person: row.responsible_person || '', target_date: row.target_date || null,
        notes: '', status: row.status || 'Not Started', ...getCreateFields(),
      });
    }
  };

  const filteredActions = actions.filter((a: any) => {
    const matchesStatus = filters.status === 'all' || a.status === filters.status;
    const matchesSearch = !searchTerm || (a.action_description || '').toLowerCase().includes(searchTerm.toLowerCase()) || (a.responsible_person || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleCreate = () => {
    if (!formData.finding_id || !formData.action_description) return;
    create.mutate({ ...formData, target_date: formData.target_date || null, ...getCreateFields() }, {
      onSuccess: () => { setIsCreateOpen(false); resetForm(); }
    });
  };

  const handleUpdateStatus = (id: string, newStatus: string) => {
    update.mutate({ id, status: newStatus, ...getUpdateFields(), ...(newStatus === 'Verified' ? { verified_date: new Date().toISOString() } : {}) });
  };

  const filterFields: StandardFilterField[] = [
    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'all', label: 'All Statuses' }, ...ACTION_STATUSES.map(s => ({ value: s, label: s }))] },
  ];

  const statCards = [
    { label: 'Not Started', value: actions.filter((a: any) => a.status === 'Not Started').length, color: 'text-muted-foreground' },
    { label: 'In Progress', value: actions.filter((a: any) => a.status === 'In Progress').length, color: 'text-blue-600' },
    { label: 'Implemented', value: actions.filter((a: any) => a.status === 'Implemented').length, color: 'text-orange-600' },
    { label: 'Verified', value: actions.filter((a: any) => a.status === 'Verified').length, color: 'text-green-600' },
    { label: 'Closed', value: actions.filter((a: any) => a.status === 'Closed').length, color: 'text-purple-600' },
  ];

  const columns: DataTableColumn<any>[] = [
    { key: 'finding', header: 'Finding', render: (a) => {
      const finding = findings.find((f: any) => f.id === a.finding_id);
      return <span className="font-medium">{finding?.title || '-'}</span>;
    }},
    { key: 'action_description', header: 'Action', className: 'max-w-md', render: (a) => <span className="text-sm truncate block max-w-md">{a.action_description || a.notes || '-'}</span> },
    { key: 'responsible_person', header: 'Responsible', render: (a) => a.responsible_person || '-' },
    { key: 'target_date', header: 'Target Date', render: (a) => a.target_date ? new Date(a.target_date).toLocaleDateString() : '-' },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status || a.action_status || 'Not Started'} /> },
  ];

  return (
    <PageShell
      title="Action Tracking"
      subtitle="Track corrective actions from findings"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/plans' }, { label: 'Action Tracking' }]}
      isLoading={isLoading}
      actions={<Button onClick={() => { resetForm(); setIsCreateOpen(true); }}><Plus className="w-4 h-4 mr-2" />New Action</Button>}
    >
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <StandardSearchFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search actions..."
        filters={filterFields}
        filterValues={filters}
        onFilterChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))}
        onReset={() => setFilters({ status: 'all' })}
      />

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={filteredActions}
            emptyMessage="No corrective actions found"
            onView={(a) => setViewItem(a)}
            renderActions={(action) => (
              <Select defaultValue={action.status || action.action_status || 'Not Started'} onValueChange={v => handleUpdateStatus(action.id, v)}>
                <SelectTrigger className="w-[130px] h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{ACTION_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            )}
          />
        </CardContent>
      </Card>

      <EntityModal open={isCreateOpen} onOpenChange={(o) => { setIsCreateOpen(o); if (!o) resetForm(); }} title="Create Corrective Action" mode="create" onSave={handleCreate} saveLabel="Create Action" isSaving={create.isPending}>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Related Finding *</Label>
            <Select value={formData.finding_id} onValueChange={v => setFormData({...formData, finding_id: v})}>
              <SelectTrigger><SelectValue placeholder="Select finding" /></SelectTrigger>
              <SelectContent>{findings.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Action Description *</Label><Textarea value={formData.action_description} onChange={e => setFormData({...formData, action_description: e.target.value})} placeholder="Describe the corrective action..." /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Responsible Person</Label><Input value={formData.responsible_person} onChange={e => setFormData({...formData, responsible_person: e.target.value})} /></div>
            <div className="space-y-2"><Label>Target Date</Label><Input type="date" value={formData.target_date} onChange={e => setFormData({...formData, target_date: e.target.value})} /></div>
          </div>
          <div className="space-y-2"><Label>Notes</Label><Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Additional notes..." /></div>
        </div>
      </EntityModal>

      <EntityModal open={!!viewItem} onOpenChange={() => setViewItem(null)} title="Action Details" mode="view">
        {viewItem && (
          <div className="space-y-4">
            <div><Label className="text-muted-foreground">Finding</Label><p className="font-medium">{findings.find((f: any) => f.id === viewItem.finding_id)?.title || '-'}</p></div>
            <div><Label className="text-muted-foreground">Action Description</Label><p>{viewItem.action_description || viewItem.notes || '-'}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Responsible</Label><p>{viewItem.responsible_person || '-'}</p></div>
              <div><Label className="text-muted-foreground">Target Date</Label><p>{viewItem.target_date ? new Date(viewItem.target_date).toLocaleDateString() : '-'}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Status</Label><div className="mt-1"><StatusBadge status={viewItem.status || viewItem.action_status || 'Not Started'} /></div></div>
              <div><Label className="text-muted-foreground">Created By</Label><p>{viewItem.created_by || '-'}</p></div>
            </div>
            <div><Label className="text-muted-foreground">Notes</Label><p>{viewItem.notes || '-'}</p></div>
          </div>
        )}
      </EntityModal>
    </PageShell>
  );
}
