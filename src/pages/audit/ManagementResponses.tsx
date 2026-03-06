import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, CheckCircle, Clock, AlertCircle, Plus } from 'lucide-react';
import { useIAManagementResponses, useIAManagementResponseMutations, useIAFindings } from '@/hooks/useAuditData';
import { PageShell, StandardSearchFilterBar, DataTable, StatusBadge, ConfirmDialog, EntityModal } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';

export default function ManagementResponses() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ status: 'all' });
  const { data: responses = [], isLoading } = useIAManagementResponses();
  const { data: findings = [] } = useIAFindings();
  const { create, update } = useIAManagementResponseMutations();
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: string } | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);
  const [formData, setFormData] = useState({ finding_id: '', response_text: '', action_plan: '', responsible_person: '', target_date: '' });
  const resetForm = () => setFormData({ finding_id: '', response_text: '', action_plan: '', responsible_person: '', target_date: '' });

  // Only show findings that are "For Mgmt Response" status for creating responses
  const eligibleFindings = findings.filter((f: any) => f.status === 'For Mgmt Response' || f.status === 'Under Review');

  const handleAccept = (id: string) => setConfirmAction({ id, action: 'accept' });
  const handleRevise = (id: string) => setConfirmAction({ id, action: 'revise' });

  const executeAction = () => {
    if (!confirmAction) return;
    const status = confirmAction.action === 'accept' ? 'Accepted' : 'Draft';
    update.mutate({ id: confirmAction.id, status });
    setConfirmAction(null);
  };

  const handleCreate = () => {
    if (!formData.finding_id || !formData.response_text) return;
    create.mutate({ ...formData, status: 'Submitted', submitted_date: new Date().toISOString(), target_date: formData.target_date || null }, {
      onSuccess: () => { setIsCreateOpen(false); resetForm(); }
    });
  };

  const filteredResponses = responses.filter((r: any) => {
    const matchesStatus = filters.status === 'all' || r.status === filters.status;
    const finding = findings.find((f: any) => f.id === r.finding_id);
    const matchesSearch = !searchTerm || (finding?.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || (r.responsible_person || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filterFields: StandardFilterField[] = [
    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'all', label: 'All Statuses' }, { value: 'Submitted', label: 'Submitted' }, { value: 'Accepted', label: 'Accepted' }, { value: 'Draft', label: 'Draft' }] },
  ];

  const statCards = [
    { label: 'Awaiting Response', value: findings.filter((f: any) => f.status === 'For Mgmt Response').length, icon: Clock, color: 'text-orange-600' },
    { label: 'Submitted', value: responses.filter((r: any) => r.status === 'Submitted').length, icon: MessageSquare, color: 'text-blue-600' },
    { label: 'Accepted', value: responses.filter((r: any) => r.status === 'Accepted').length, icon: CheckCircle, color: 'text-green-600' },
    { label: 'Total', value: responses.length, icon: AlertCircle, color: 'text-muted-foreground' },
  ];

  const columns: DataTableColumn<any>[] = [
    { key: 'finding', header: 'Finding', render: (r) => {
      const finding = findings.find((f: any) => f.id === r.finding_id);
      return <span className="font-medium">{finding?.title || '-'}</span>;
    }},
    { key: 'response_text', header: 'Response', className: 'max-w-md', render: (r) => <p className="text-sm truncate">{r.response_text}</p> },
    { key: 'responsible_person', header: 'Responsible' },
    { key: 'target_date', header: 'Target Date', render: (r) => r.target_date ? new Date(r.target_date).toLocaleDateString() : '-' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <PageShell
      title="Management Responses"
      subtitle="Department heads respond to audit findings"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/plans' }, { label: 'Management Responses' }]}
      isLoading={isLoading}
      actions={<Button onClick={() => { resetForm(); setIsCreateOpen(true); }}><Plus className="w-4 h-4 mr-2" />Submit Response</Button>}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <card.icon className={`h-4 w-4 ${card.color}`} />
                <div className="ml-2">
                  <p className="text-sm font-medium">{card.label}</p>
                  <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <StandardSearchFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by finding or responsible person..."
        filters={filterFields as StandardFilterField[]}
        filterValues={filters}
        onFilterChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))}
        onReset={() => setFilters({ status: 'all' })}
      />

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={filteredResponses}
            emptyMessage="No management responses found"
            onView={(r) => setViewItem(r)}
            renderActions={(response) => response.status === 'Submitted' ? (
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-8" onClick={() => handleAccept(response.id)}>Accept</Button>
                <Button variant="outline" size="sm" className="h-8" onClick={() => handleRevise(response.id)}>Revise</Button>
              </div>
            ) : null}
          />
        </CardContent>
      </Card>

      {/* Create Response Modal */}
      <EntityModal open={isCreateOpen} onOpenChange={(o) => { setIsCreateOpen(o); if (!o) resetForm(); }} title="Submit Management Response" mode="create" onSave={handleCreate} saveLabel="Submit Response" isSaving={create.isPending}>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Finding *</Label>
            <Select value={formData.finding_id} onValueChange={v => setFormData({...formData, finding_id: v})}>
              <SelectTrigger><SelectValue placeholder="Select finding" /></SelectTrigger>
              <SelectContent>
                {eligibleFindings.length > 0 ? eligibleFindings.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>) : findings.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Response *</Label><Textarea value={formData.response_text} onChange={e => setFormData({...formData, response_text: e.target.value})} placeholder="Enter management response..." rows={4} /></div>
          <div className="space-y-2"><Label>Action Plan</Label><Textarea value={formData.action_plan} onChange={e => setFormData({...formData, action_plan: e.target.value})} placeholder="Describe planned corrective actions..." rows={3} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Responsible Person</Label><Input value={formData.responsible_person} onChange={e => setFormData({...formData, responsible_person: e.target.value})} /></div>
            <div className="space-y-2"><Label>Target Date</Label><Input type="date" value={formData.target_date} onChange={e => setFormData({...formData, target_date: e.target.value})} /></div>
          </div>
        </div>
      </EntityModal>

      {/* View Modal */}
      <EntityModal open={!!viewItem} onOpenChange={() => setViewItem(null)} title="Response Details" mode="view">
        {viewItem && (
          <div className="space-y-4">
            <div><Label className="text-muted-foreground">Finding</Label><p className="font-medium">{findings.find((f: any) => f.id === viewItem.finding_id)?.title || '-'}</p></div>
            <div><Label className="text-muted-foreground">Response</Label><p>{viewItem.response_text || '-'}</p></div>
            <div><Label className="text-muted-foreground">Action Plan</Label><p>{viewItem.action_plan || '-'}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Responsible</Label><p>{viewItem.responsible_person || '-'}</p></div>
              <div><Label className="text-muted-foreground">Target Date</Label><p>{viewItem.target_date ? new Date(viewItem.target_date).toLocaleDateString() : '-'}</p></div>
            </div>
            <div><Label className="text-muted-foreground">Status</Label><div className="mt-1"><StatusBadge status={viewItem.status} /></div></div>
          </div>
        )}
      </EntityModal>

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={() => setConfirmAction(null)}
        title={confirmAction?.action === 'accept' ? 'Accept Response' : 'Request Revision'}
        description={confirmAction?.action === 'accept' ? 'Are you sure you want to accept this management response?' : 'This will send the response back for revision. Continue?'}
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        onConfirm={executeAction}
        isLoading={update.isPending}
      />
    </PageShell>
  );
}
