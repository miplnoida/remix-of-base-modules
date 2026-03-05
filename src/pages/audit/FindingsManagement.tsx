import { useState } from "react";
import { Plus, Eye, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIAFindings, useIAFindingMutations, useIADepartments, useIAActivities } from '@/hooks/useAuditData';
import { useToast } from "@/hooks/use-toast";
import { PageShell, SearchBar, FilterBar, DataTable, StatusBadge, EntityModal, ConfirmDialog } from '@/components/common';
import type { DataTableColumn, FilterField } from '@/components/common';

const STATUSES = ['Draft', 'Under Review', 'For Mgmt Response', 'Closed'];
const RISKS = ['High', 'Medium', 'Low'];

const FindingsManagement = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({ status: 'all', risk: 'all' });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [statusItem, setStatusItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [nextStatus, setNextStatus] = useState('');

  const { data: findings = [], isLoading } = useIAFindings();
  const { data: departments = [] } = useIADepartments();
  const { data: activities = [] } = useIAActivities();
  const { create, update, remove } = useIAFindingMutations();

  const emptyForm = { title: '', condition: '', criteria: '', cause: '', effect: '', risk_rating: '', impact_area: '', status: 'Draft', department_id: '', activity_id: '', finding_id: '' };
  const [formData, setFormData] = useState(emptyForm);
  const resetForm = () => setFormData(emptyForm);

  const filteredFindings = findings.filter((f: any) => {
    const matchesSearch = (f.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filters.status === "all" || f.status === filters.status;
    const matchesRisk = filters.risk === "all" || f.risk_rating === filters.risk;
    return matchesSearch && matchesStatus && matchesRisk;
  });

  const handleCreate = () => {
    if (!formData.title || !formData.condition) {
      toast({ title: "Validation Error", description: "Title and Condition are required", variant: "destructive" });
      return;
    }
    const findingId = `FND-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    create.mutate({ ...formData, finding_id: findingId, department_id: formData.department_id || null, activity_id: formData.activity_id || null }, { onSuccess: () => { setIsCreateOpen(false); resetForm(); } });
  };

  const handleEdit = () => {
    if (!editItem || !formData.title || !formData.condition) {
      toast({ title: "Validation Error", description: "Title and Condition are required", variant: "destructive" });
      return;
    }
    update.mutate({ id: editItem.id, title: formData.title, condition: formData.condition, criteria: formData.criteria, cause: formData.cause, effect: formData.effect, risk_rating: formData.risk_rating, impact_area: formData.impact_area, department_id: formData.department_id || null, activity_id: formData.activity_id || null }, {
      onSuccess: () => { setEditItem(null); resetForm(); }
    });
  };

  const handleStatusChange = () => {
    if (!statusItem || !nextStatus) return;
    update.mutate({ id: statusItem.id, status: nextStatus, ...(nextStatus === 'For Mgmt Response' ? { submitted_for_response_date: new Date().toISOString() } : {}) }, {
      onSuccess: () => { setStatusItem(null); setNextStatus(''); }
    });
  };

  const openEdit = (f: any) => {
    setFormData({ title: f.title, condition: f.condition || '', criteria: f.criteria || '', cause: f.cause || '', effect: f.effect || '', risk_rating: f.risk_rating || '', impact_area: f.impact_area || '', status: f.status || 'Draft', department_id: f.department_id || '', activity_id: f.activity_id || '', finding_id: f.finding_id || '' });
    setEditItem(f);
  };

  const filterFields: FilterField[] = [
    { key: 'risk', label: 'Risk', type: 'select', options: [{ value: 'all', label: 'All Risks' }, ...RISKS.map(r => ({ value: r, label: r }))] },
    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'all', label: 'All Statuses' }, ...STATUSES.map(s => ({ value: s, label: s }))] },
  ];

  const statCards = [
    { label: 'Total', value: findings.length, color: '' },
    { label: 'High Risk', value: findings.filter((f: any) => f.risk_rating === 'High').length, color: 'text-destructive' },
    { label: 'Medium', value: findings.filter((f: any) => f.risk_rating === 'Medium').length, color: 'text-orange-600' },
    { label: 'Low', value: findings.filter((f: any) => f.risk_rating === 'Low').length, color: 'text-green-600' },
  ];

  const columns: DataTableColumn<any>[] = [
    { key: 'finding_id', header: 'Finding ID', render: (f) => <span className="text-xs font-mono">{f.finding_id || f.id.slice(0,8)}</span> },
    { key: 'title', header: 'Title', render: (f) => <span className="font-medium">{f.title}</span> },
    { key: 'risk_rating', header: 'Risk', render: (f) => <StatusBadge status={f.risk_rating || 'Medium'} /> },
    { key: 'impact_area', header: 'Impact', render: (f) => f.impact_area || '-' },
    { key: 'status', header: 'Status', render: (f) => <StatusBadge status={f.status} /> },
    { key: 'created_at', header: 'Created', render: (f) => f.created_at ? new Date(f.created_at).toLocaleDateString() : '-' },
  ];

  const formFields = (
    <div className="space-y-4">
      <div className="space-y-2"><Label>Title *</Label><Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Risk Rating</Label><Select value={formData.risk_rating} onValueChange={v => setFormData({...formData, risk_rating: v})}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{RISKS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Impact Area</Label><Input value={formData.impact_area} onChange={e => setFormData({...formData, impact_area: e.target.value})} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Department</Label><Select value={formData.department_id} onValueChange={v => setFormData({...formData, department_id: v})}><SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger><SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Related Activity</Label><Select value={formData.activity_id} onValueChange={v => setFormData({...formData, activity_id: v})}><SelectTrigger><SelectValue placeholder="Select activity" /></SelectTrigger><SelectContent>{activities.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <div className="space-y-2"><Label>Condition * (What was found?)</Label><Textarea value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value})} /></div>
      <div className="space-y-2"><Label>Criteria (What should be?)</Label><Textarea value={formData.criteria} onChange={e => setFormData({...formData, criteria: e.target.value})} /></div>
      <div className="space-y-2"><Label>Cause (Why did it happen?)</Label><Textarea value={formData.cause} onChange={e => setFormData({...formData, cause: e.target.value})} /></div>
      <div className="space-y-2"><Label>Effect (What is the impact?)</Label><Textarea value={formData.effect} onChange={e => setFormData({...formData, effect: e.target.value})} /></div>
    </div>
  );

  return (
    <PageShell
      title="Findings Management"
      subtitle="Document and track audit findings using CCCE methodology"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/plans' }, { label: 'Findings & Recommendations' }]}
      isLoading={isLoading}
      actions={<Button onClick={() => { resetForm(); setIsCreateOpen(true); }}><Plus className="mr-2 h-4 w-4" />New Finding</Button>}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search findings..." />
            <FilterBar filters={filterFields} values={filters} onChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))} onReset={() => setFilters({ status: 'all', risk: 'all' })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={filteredFindings}
            emptyMessage="No findings found"
            onView={(f) => setViewItem(f)}
            onEdit={(f) => openEdit(f)}
            renderActions={(f) => (
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => { setStatusItem(f); setNextStatus(f.status || 'Draft'); }}>
                  Change Status
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteId(f.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Create Modal */}
      <EntityModal open={isCreateOpen} onOpenChange={(o) => { setIsCreateOpen(o); if (!o) resetForm(); }} title="Create Finding (CCCE)" mode="create" onSave={handleCreate} saveLabel="Create Finding" isSaving={create.isPending} maxWidth="max-w-4xl">
        {formFields}
      </EntityModal>

      {/* Edit Modal */}
      <EntityModal open={!!editItem} onOpenChange={(o) => { if (!o) { setEditItem(null); resetForm(); } }} title="Edit Finding" mode="edit" onSave={handleEdit} saveLabel="Save Changes" isSaving={update.isPending} maxWidth="max-w-4xl">
        {formFields}
      </EntityModal>

      {/* Status Transition Modal */}
      <EntityModal open={!!statusItem} onOpenChange={() => { setStatusItem(null); setNextStatus(''); }} title="Change Finding Status" mode="edit" onSave={handleStatusChange} saveLabel="Update Status" isSaving={update.isPending}>
        {statusItem && (
          <div className="space-y-4">
            <div><Label className="text-muted-foreground">Finding</Label><p className="font-medium">{statusItem.title}</p></div>
            <div><Label className="text-muted-foreground">Current Status</Label><div className="mt-1"><StatusBadge status={statusItem.status} /></div></div>
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select value={nextStatus} onValueChange={setNextStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        )}
      </EntityModal>

      {/* View Modal */}
      <EntityModal open={!!viewItem} onOpenChange={() => setViewItem(null)} title="Finding Details" mode="view" maxWidth="max-w-4xl">
        {viewItem && (
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div><Label className="text-muted-foreground">Title</Label><p className="font-medium text-lg">{viewItem.title}</p></div>
              <StatusBadge status={viewItem.risk_rating || 'Medium'} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Finding ID</Label><p>{viewItem.finding_id || '-'}</p></div>
              <div><Label className="text-muted-foreground">Status</Label><div className="mt-1"><StatusBadge status={viewItem.status} /></div></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Impact Area</Label><p>{viewItem.impact_area || '-'}</p></div>
              <div><Label className="text-muted-foreground">Department</Label><p>{viewItem.department_name || departments.find((d: any) => d.id === viewItem.department_id)?.name || '-'}</p></div>
            </div>
            <div><Label className="text-muted-foreground">Condition</Label><p>{viewItem.condition || '-'}</p></div>
            <div><Label className="text-muted-foreground">Criteria</Label><p>{viewItem.criteria || '-'}</p></div>
            <div><Label className="text-muted-foreground">Cause</Label><p>{viewItem.cause || '-'}</p></div>
            <div><Label className="text-muted-foreground">Effect</Label><p>{viewItem.effect || '-'}</p></div>
          </div>
        )}
      </EntityModal>

      <ConfirmDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)} title="Delete Finding" description="Are you sure you want to delete this finding? This action cannot be undone." onConfirm={() => { if (deleteId) { remove.mutate(deleteId); setDeleteId(null); } }} variant="destructive" />
    </PageShell>
  );
};

export default FindingsManagement;
