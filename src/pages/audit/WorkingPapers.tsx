import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIAWorkingPapers, useIAWorkingPaperMutations, useIAActivities, useIAAnnualPlans } from '@/hooks/useAuditData';
import { useIADepartmentAudits } from '@/hooks/useAuditDataExtended';
import { useAuditFields } from '@/hooks/useAuditTrail';
import { useToast } from "@/hooks/use-toast";
import { PageShell, StandardSearchFilterBar, DataTable, StatusBadge, EntityModal, ExportDropdown } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { EngagementFilterBanner } from '@/components/audit/EngagementFilterBanner';

const STATUSES = ['Draft', 'Under Review', 'Approved'];

const WorkingPapers = () => {
  const { toast } = useToast();
  const { getCreateFields, getUpdateFields } = useAuditFields();
  const [searchParams] = useSearchParams();
  const engagementIdFilter = searchParams.get('engagement_id');
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({ status: 'all' });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [statusItem, setStatusItem] = useState<any>(null);
  const [nextStatus, setNextStatus] = useState('');

  const { data: workingPapers = [], isLoading } = useIAWorkingPapers();
  const { data: activities = [] } = useIAActivities();
  const { data: plans = [] } = useIAAnnualPlans();
  const { data: deptAudits = [] } = useIADepartmentAudits();
  const { create, update } = useIAWorkingPaperMutations();

  const emptyForm = { title: '', description: '', objective: '', audit_area: '', procedure: '', test_performed: '', results: '', observations: '', conclusion: '', activity_id: '', annual_plan_id: '', department_audit_id: '', working_paper_id: '' };
  const [formData, setFormData] = useState(emptyForm);
  const resetForm = () => setFormData(emptyForm);

  const filteredWPs = workingPapers.filter((wp: any) => {
    const matchesSearch = (wp.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filters.status === "all" || wp.status === filters.status;
    const matchesEngagement = !engagementIdFilter || wp.engagement_id === engagementIdFilter;
    return matchesSearch && matchesStatus && matchesEngagement;
  });

  const handleCreate = () => {
    if (!formData.title || !formData.objective) {
      toast({ title: "Validation Error", description: "Title and objective are required", variant: "destructive" });
      return;
    }
    const wpId = `WP-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    create.mutate({
      ...formData, working_paper_id: wpId,
      activity_id: formData.activity_id || null, annual_plan_id: formData.annual_plan_id || null,
      department_audit_id: formData.department_audit_id || null,
      engagement_id: engagementIdFilter || null,
      ...getCreateFields(),
    }, { onSuccess: () => { setIsCreateOpen(false); resetForm(); } });
  };

  const handleEdit = () => {
    if (!editItem || !formData.title || !formData.objective) {
      toast({ title: "Validation Error", description: "Title and objective are required", variant: "destructive" });
      return;
    }
    update.mutate({
      id: editItem.id, title: formData.title, description: formData.description, objective: formData.objective,
      audit_area: formData.audit_area, procedure: formData.procedure, test_performed: formData.test_performed,
      results: formData.results, observations: formData.observations, conclusion: formData.conclusion,
      activity_id: formData.activity_id || null, annual_plan_id: formData.annual_plan_id || null,
      department_audit_id: formData.department_audit_id || null,
      ...getUpdateFields(),
    }, { onSuccess: () => { setEditItem(null); resetForm(); } });
  };

  const handleStatusChange = () => {
    if (!statusItem || !nextStatus) return;
    update.mutate({
      id: statusItem.id, status: nextStatus, ...getUpdateFields(),
      ...(nextStatus === 'Approved' ? { approved_date: new Date().toISOString() } : {}),
      ...(nextStatus === 'Under Review' ? { reviewed_date: new Date().toISOString() } : {}),
    }, { onSuccess: () => { setStatusItem(null); setNextStatus(''); } });
  };

  const openEdit = (wp: any) => {
    setFormData({
      title: wp.title || '', description: wp.description || '', objective: wp.objective || '',
      audit_area: wp.audit_area || '', procedure: wp.procedure || '', test_performed: wp.test_performed || '',
      results: wp.results || '', observations: wp.observations || '', conclusion: wp.conclusion || '',
      activity_id: wp.activity_id || '', annual_plan_id: wp.annual_plan_id || '',
      department_audit_id: wp.department_audit_id || '', working_paper_id: wp.working_paper_id || '',
    });
    setEditItem(wp);
  };

  const filterFields: StandardFilterField[] = [
    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'all', label: 'All Statuses' }, ...STATUSES.map(s => ({ value: s, label: s }))] },
  ];

  const statCards = [
    { label: 'Total', value: workingPapers.length },
    { label: 'Draft', value: workingPapers.filter((wp: any) => wp.status === "Draft").length },
    { label: 'Under Review', value: workingPapers.filter((wp: any) => wp.status === "Under Review").length },
    { label: 'Approved', value: workingPapers.filter((wp: any) => wp.status === "Approved").length },
  ];

  const columns: DataTableColumn<any>[] = [
    { key: 'working_paper_id', header: 'WP ID', render: (wp) => <span className="text-xs font-mono">{wp.working_paper_id || wp.id.slice(0,8)}</span> },
    { key: 'title', header: 'Title', render: (wp) => <span className="font-medium">{wp.title}</span> },
    { key: 'audit_area', header: 'Audit Area', render: (wp) => wp.audit_area || '-' },
    { key: 'plan', header: 'Plan', render: (wp) => { const p = plans.find((p: any) => p.id === wp.annual_plan_id); return <span className="text-xs">{p?.title || '-'}</span>; }},
    { key: 'status', header: 'Status', render: (wp) => <StatusBadge status={wp.status} /> },
    { key: 'created_at', header: 'Created', render: (wp) => wp.created_at ? new Date(wp.created_at).toLocaleDateString() : '-' },
  ];

  const formFields = (
    <div className="space-y-4">
      <div className="space-y-2"><Label>Title *</Label><Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Audit Area</Label><Input value={formData.audit_area} onChange={e => setFormData({...formData, audit_area: e.target.value})} /></div>
        <div className="space-y-2"><Label>Related Activity</Label>
          <Select value={formData.activity_id} onValueChange={v => setFormData({...formData, activity_id: v})}>
            <SelectTrigger><SelectValue placeholder="Select activity" /></SelectTrigger>
            <SelectContent>{(engagementIdFilter ? activities.filter((a: any) => a.engagement_id === engagementIdFilter) : activities).map((a: any) => <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Annual Plan</Label>
          <Select value={formData.annual_plan_id} onValueChange={v => setFormData({...formData, annual_plan_id: v})}>
            <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
            <SelectContent>{plans.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Dept. Audit</Label>
          <Select value={formData.department_audit_id} onValueChange={v => setFormData({...formData, department_audit_id: v})}>
            <SelectTrigger><SelectValue placeholder="Select dept audit" /></SelectTrigger>
            <SelectContent>{deptAudits.map((da: any) => <SelectItem key={da.id} value={da.id}>{da.department_name || da.id.slice(0,8)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2"><Label>Objective *</Label><Textarea value={formData.objective} onChange={e => setFormData({...formData, objective: e.target.value})} /></div>
      <div className="space-y-2"><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
      <div className="space-y-2"><Label>Procedure</Label><Textarea value={formData.procedure} onChange={e => setFormData({...formData, procedure: e.target.value})} /></div>
      <div className="space-y-2"><Label>Tests Performed</Label><Textarea value={formData.test_performed} onChange={e => setFormData({...formData, test_performed: e.target.value})} /></div>
      <div className="space-y-2"><Label>Results</Label><Textarea value={formData.results} onChange={e => setFormData({...formData, results: e.target.value})} /></div>
      <div className="space-y-2"><Label>Observations</Label><Textarea value={formData.observations} onChange={e => setFormData({...formData, observations: e.target.value})} /></div>
      <div className="space-y-2"><Label>Conclusion</Label><Textarea value={formData.conclusion} onChange={e => setFormData({...formData, conclusion: e.target.value})} /></div>
    </div>
  );

  return (
    <PageShell
      title="Working Papers"
      subtitle="Manage audit working papers with full traceability"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/plans' }, { label: 'Working Papers' }]}
      isLoading={isLoading}
      actions={<Button onClick={() => { resetForm(); setIsCreateOpen(true); }}><Plus className="mr-2 h-4 w-4" />New Working Paper</Button>}
    >
      <EngagementFilterBanner />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <StandardSearchFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search working papers..."
        filters={filterFields}
        filterValues={filters}
        onFilterChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))}
        onReset={() => setFilters({ status: 'all' })}
      />

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={filteredWPs}
            emptyMessage="No working papers found"
            onView={(wp) => setViewItem(wp)}
            onEdit={(wp) => openEdit(wp)}
            renderActions={(wp) => (
              <Button size="sm" variant="outline" onClick={() => { setStatusItem(wp); setNextStatus(wp.status || 'Draft'); }}>
                Change Status
              </Button>
            )}
          />
        </CardContent>
      </Card>

      <EntityModal open={isCreateOpen} onOpenChange={(o) => { setIsCreateOpen(o); if (!o) resetForm(); }} title="Create New Working Paper" mode="create" onSave={handleCreate} saveLabel="Create Working Paper" isSaving={create.isPending} maxWidth="max-w-4xl">
        {formFields}
      </EntityModal>

      <EntityModal open={!!editItem} onOpenChange={(o) => { if (!o) { setEditItem(null); resetForm(); } }} title="Edit Working Paper" mode="edit" onSave={handleEdit} saveLabel="Save Changes" isSaving={update.isPending} maxWidth="max-w-4xl">
        {formFields}
      </EntityModal>

      <EntityModal open={!!statusItem} onOpenChange={() => { setStatusItem(null); setNextStatus(''); }} title="Change Working Paper Status" mode="edit" onSave={handleStatusChange} saveLabel="Update Status" isSaving={update.isPending}>
        {statusItem && (
          <div className="space-y-4">
            <div><Label className="text-muted-foreground">Working Paper</Label><p className="font-medium">{statusItem.title}</p></div>
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

      <EntityModal open={!!viewItem} onOpenChange={() => setViewItem(null)} title="Working Paper Details" mode="view" maxWidth="max-w-4xl">
        {viewItem && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Title</Label><p className="font-medium">{viewItem.title}</p></div>
              <div><Label className="text-muted-foreground">WP ID</Label><p>{viewItem.working_paper_id || '-'}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Annual Plan</Label><p>{plans.find((p: any) => p.id === viewItem.annual_plan_id)?.title || '-'}</p></div>
              <div><Label className="text-muted-foreground">Department Audit</Label><p>{deptAudits.find((da: any) => da.id === viewItem.department_audit_id)?.department_name || '-'}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Audit Area</Label><p>{viewItem.audit_area || '-'}</p></div>
              <div><Label className="text-muted-foreground">Status</Label><div className="mt-1"><StatusBadge status={viewItem.status} /></div></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Activity</Label><p>{activities.find((a: any) => a.id === viewItem.activity_id)?.title || '-'}</p></div>
              <div><Label className="text-muted-foreground">Created By</Label><p>{viewItem.created_by || '-'}</p></div>
            </div>
            <div><Label className="text-muted-foreground">Objective</Label><p>{viewItem.objective || '-'}</p></div>
            <div><Label className="text-muted-foreground">Description</Label><p>{viewItem.description || '-'}</p></div>
            <div><Label className="text-muted-foreground">Procedure</Label><p>{viewItem.procedure || '-'}</p></div>
            <div><Label className="text-muted-foreground">Tests Performed</Label><p>{viewItem.test_performed || '-'}</p></div>
            <div><Label className="text-muted-foreground">Results</Label><p>{viewItem.results || '-'}</p></div>
            <div><Label className="text-muted-foreground">Observations</Label><p>{viewItem.observations || '-'}</p></div>
            <div><Label className="text-muted-foreground">Conclusion</Label><p>{viewItem.conclusion || '-'}</p></div>
          </div>
        )}
      </EntityModal>
    </PageShell>
  );
};

export default WorkingPapers;
