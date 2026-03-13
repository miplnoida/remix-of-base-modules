import { useState } from "react";
import { Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIAFindings, useIAFindingMutations, useIADepartments, useIAActivities, useIAAnnualPlans } from '@/hooks/useAuditData';
import { useIADepartmentAudits } from '@/hooks/useAuditDataExtended';
import { useAuditFields } from '@/hooks/useAuditTrail';
import { useToast } from "@/hooks/use-toast";
import { PageShell, StandardSearchFilterBar, DataTable, StatusBadge, EntityModal, ConfirmDialog, BulkUploadModal, ExportDropdown } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { FINDINGS_SCHEMA, toBulkUploadFields, toExportColumns } from '@/config/moduleFieldSchemas';

const STATUSES = ['Draft', 'Under Review', 'For Mgmt Response', 'Closed'];
const ROOT_CAUSE_CATEGORIES = ['Process Failure', 'Human Error', 'System Gap', 'Policy Gap', 'Training Gap'];
const RISKS = ['High', 'Medium', 'Low'];

const bulkUploadFields = toBulkUploadFields(FINDINGS_SCHEMA);
const exportColumns = toExportColumns(FINDINGS_SCHEMA);

const FindingsManagement = () => {
  const { toast } = useToast();
  const { getCreateFields, getUpdateFields } = useAuditFields();
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
  const { data: plans = [] } = useIAAnnualPlans();
  const { data: deptAudits = [] } = useIADepartmentAudits();
  const { create, update, remove } = useIAFindingMutations();

  const emptyForm = { title: '', condition: '', criteria: '', cause: '', effect: '', risk_rating: '', impact_area: '', status: 'Draft', department_id: '', activity_id: '', annual_plan_id: '', department_audit_id: '', finding_id: '', root_cause_category: '', preventive_action: '', corrective_action_description: '' };
  const [formData, setFormData] = useState(emptyForm);
  const resetForm = () => setFormData(emptyForm);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  const handleBulkImport = async (data: Record<string, any>[]) => {
    for (const row of data) {
      const findingId = `FND-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      const dept = departments.find((d: any) => d.name === row.department_name);
      create.mutate({
        title: row.title, condition: row.condition || '', criteria: row.criteria || '',
        cause: row.cause || '', effect: row.effect || '',
        risk_rating: row.risk_rating || 'Medium', impact_area: row.impact_area || '',
        status: row.status || 'Draft', finding_id: findingId,
        department_id: dept?.id || null, activity_id: null, annual_plan_id: null, department_audit_id: null,
        ...getCreateFields(),
      });
    }
  };

  const filteredFindings = findings.filter((f: any) => {
    const matchesSearch = (f.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filters.status === "all" || f.status === filters.status;
    const matchesRisk = filters.risk === "all" || f.risk_rating === filters.risk;
    return matchesSearch && matchesStatus && matchesRisk;
  });

  // When an activity is selected, auto-fill department and plan fields
  const handleActivityChange = (activityId: string) => {
    const activity = activities.find((a: any) => a.id === activityId);
    if (activity) {
      setFormData(prev => ({
        ...prev,
        activity_id: activityId,
        department_id: activity.department_id || prev.department_id,
        annual_plan_id: activity.annual_plan_id || prev.annual_plan_id,
        department_audit_id: activity.department_audit_id || prev.department_audit_id,
      }));
    } else {
      setFormData(prev => ({ ...prev, activity_id: activityId }));
    }
  };

  const handleCreate = () => {
    if (!formData.title || !formData.condition) {
      toast({ title: "Validation Error", description: "Finding Title and Condition are required", variant: "destructive" });
      return;
    }
    if (!formData.activity_id) {
      toast({ title: "Validation Error", description: "An Activity must be selected. Findings cannot exist without a linked activity.", variant: "destructive" });
      return;
    }
    const findingId = `FND-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    create.mutate({
      ...formData, finding_id: findingId,
      department_id: formData.department_id || null, activity_id: formData.activity_id || null,
      annual_plan_id: formData.annual_plan_id || null, department_audit_id: formData.department_audit_id || null,
      root_cause_category: formData.root_cause_category || null,
      preventive_action: formData.preventive_action || null,
      corrective_action_description: formData.corrective_action_description || null,
      ...getCreateFields(),
    }, { onSuccess: () => { setIsCreateOpen(false); resetForm(); } });
  };

  const handleEdit = () => {
    if (!editItem || !formData.title || !formData.condition) {
      toast({ title: "Validation Error", description: "Finding Title and Condition are required", variant: "destructive" });
      return;
    }
    if (!formData.activity_id) {
      toast({ title: "Validation Error", description: "An Activity must be selected.", variant: "destructive" });
      return;
    }
    update.mutate({
      id: editItem.id, title: formData.title, condition: formData.condition, criteria: formData.criteria,
      cause: formData.cause, effect: formData.effect, risk_rating: formData.risk_rating, impact_area: formData.impact_area,
      department_id: formData.department_id || null, activity_id: formData.activity_id || null,
      annual_plan_id: formData.annual_plan_id || null, department_audit_id: formData.department_audit_id || null,
      root_cause_category: formData.root_cause_category || null,
      preventive_action: formData.preventive_action || null,
      corrective_action_description: formData.corrective_action_description || null,
      ...getUpdateFields(),
    }, { onSuccess: () => { setEditItem(null); resetForm(); } });
  };

  const handleStatusChange = () => {
    if (!statusItem || !nextStatus) return;
    update.mutate({ id: statusItem.id, status: nextStatus, ...getUpdateFields(), ...(nextStatus === 'For Mgmt Response' ? { submitted_for_response_date: new Date().toISOString() } : {}) }, {
      onSuccess: () => { setStatusItem(null); setNextStatus(''); }
    });
  };

  const openEdit = (f: any) => {
    setFormData({
      title: f.title, condition: f.condition || '', criteria: f.criteria || '', cause: f.cause || '',
      effect: f.effect || '', risk_rating: f.risk_rating || '', impact_area: f.impact_area || '',
      status: f.status || 'Draft', department_id: f.department_id || '', activity_id: f.activity_id || '',
      annual_plan_id: f.annual_plan_id || '', department_audit_id: f.department_audit_id || '',
      finding_id: f.finding_id || '',
    });
    setEditItem(f);
  };

  const filterFields: StandardFilterField[] = [
    { key: 'risk', label: 'Risk Level', type: 'select', options: [{ value: 'all', label: 'All Risk Levels' }, ...RISKS.map(r => ({ value: r, label: r }))] },
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
    { key: 'title', header: 'Finding Title', render: (f) => <span className="font-medium">{f.title}</span> },
    { key: 'risk_rating', header: 'Risk Level', render: (f) => <StatusBadge status={f.risk_rating || 'Medium'} /> },
    { key: 'activity', header: 'Activity', render: (f) => { const a = activities.find((a: any) => a.id === f.activity_id); return <span className="text-xs">{a?.title || '-'}</span>; }},
    { key: 'plan', header: 'Audit Plan', render: (f) => { const p = plans.find((p: any) => p.id === f.annual_plan_id); return <span className="text-xs">{p?.title || '-'}</span>; }},
    { key: 'status', header: 'Status', render: (f) => <StatusBadge status={f.status} /> },
    { key: 'created_at', header: 'Date', render: (f) => f.created_at ? new Date(f.created_at).toLocaleDateString() : '-' },
  ];

  const exportData = filteredFindings.map((f: any) => ({
    ...f,
    plan_name: plans.find((p: any) => p.id === f.annual_plan_id)?.title || '',
    department_name: departments.find((d: any) => d.id === f.department_id)?.name || '',
  }));

  const linkingFields = (
    <>
      <div className="space-y-2"><Label>Activity * (Required)</Label>
        <Select value={formData.activity_id} onValueChange={handleActivityChange}>
          <SelectTrigger><SelectValue placeholder="Select activity" /></SelectTrigger>
          <SelectContent>{activities.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>)}</SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Selecting an activity will auto-fill the plan and department fields below.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Audit Plan</Label>
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
      <div className="space-y-2"><Label>Department</Label><Select value={formData.department_id} onValueChange={v => setFormData({...formData, department_id: v})}><SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger><SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
    </>
  );

  const formFields = (
    <div className="space-y-4">
      <div className="space-y-2"><Label>Finding Title *</Label><Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Risk Level</Label><Select value={formData.risk_rating} onValueChange={v => setFormData({...formData, risk_rating: v})}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{RISKS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Impact Area</Label><Input value={formData.impact_area} onChange={e => setFormData({...formData, impact_area: e.target.value})} /></div>
      </div>
      {linkingFields}
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
      actions={
        <div className="flex items-center gap-2">
          <ExportDropdown data={exportData} columns={exportColumns} fileName={FINDINGS_SCHEMA.exportFileName} title={FINDINGS_SCHEMA.exportTitle} />
          <Button variant="outline" size="sm" onClick={() => setIsBulkUploadOpen(true)}><Upload className="mr-2 h-4 w-4" />Bulk Upload</Button>
          <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}><Plus className="mr-2 h-4 w-4" />New Finding</Button>
        </div>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label}><CardContent className="pt-6 text-center"><p className="text-sm text-muted-foreground">{card.label}</p><p className={`text-2xl font-bold ${card.color}`}>{card.value}</p></CardContent></Card>
        ))}
      </div>

      <StandardSearchFilterBar searchValue={searchTerm} onSearchChange={setSearchTerm} searchPlaceholder="Search findings..." filters={filterFields} filterValues={filters} onFilterChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))} onReset={() => setFilters({ status: 'all', risk: 'all' })} />

      <Card><CardContent className="pt-6">
        <DataTable columns={columns} data={filteredFindings} emptyMessage="No findings found" onView={(f) => setViewItem(f)} onEdit={(f) => openEdit(f)}
          renderActions={(f) => (
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => { setStatusItem(f); setNextStatus(f.status || 'Draft'); }}>Change Status</Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteId(f.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          )}
        />
      </CardContent></Card>

      <EntityModal open={isCreateOpen} onOpenChange={(o) => { setIsCreateOpen(o); if (!o) resetForm(); }} title="Create Finding (CCCE)" mode="create" onSave={handleCreate} saveLabel="Create Finding" isSaving={create.isPending} maxWidth="max-w-4xl">{formFields}</EntityModal>
      <EntityModal open={!!editItem} onOpenChange={(o) => { if (!o) { setEditItem(null); resetForm(); } }} title="Edit Finding" mode="edit" onSave={handleEdit} saveLabel="Save Changes" isSaving={update.isPending} maxWidth="max-w-4xl">{formFields}</EntityModal>

      <EntityModal open={!!statusItem} onOpenChange={() => { setStatusItem(null); setNextStatus(''); }} title="Change Finding Status" mode="edit" onSave={handleStatusChange} saveLabel="Update Status" isSaving={update.isPending}>
        {statusItem && (
          <div className="space-y-4">
            <div><Label className="text-muted-foreground">Finding</Label><p className="font-medium">{statusItem.title}</p></div>
            <div><Label className="text-muted-foreground">Current Status</Label><div className="mt-1"><StatusBadge status={statusItem.status} /></div></div>
            <div className="space-y-2"><Label>New Status</Label><Select value={nextStatus} onValueChange={setNextStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
          </div>
        )}
      </EntityModal>

      <EntityModal open={!!viewItem} onOpenChange={() => setViewItem(null)} title="Finding Details" mode="view" maxWidth="max-w-4xl">
        {viewItem && (
          <div className="space-y-4">
            <div className="flex justify-between items-start"><div><Label className="text-muted-foreground">Finding Title</Label><p className="font-medium text-lg">{viewItem.title}</p></div><StatusBadge status={viewItem.risk_rating || 'Medium'} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Finding ID</Label><p>{viewItem.finding_id || '-'}</p></div>
              <div><Label className="text-muted-foreground">Status</Label><div className="mt-1"><StatusBadge status={viewItem.status} /></div></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Audit Plan</Label><p>{plans.find((p: any) => p.id === viewItem.annual_plan_id)?.title || '-'}</p></div>
              <div><Label className="text-muted-foreground">Department Audit</Label><p>{deptAudits.find((da: any) => da.id === viewItem.department_audit_id)?.department_name || '-'}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Department</Label><p>{departments.find((d: any) => d.id === viewItem.department_id)?.name || '-'}</p></div>
              <div><Label className="text-muted-foreground">Related Activity</Label><p>{activities.find((a: any) => a.id === viewItem.activity_id)?.title || '-'}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Impact Area</Label><p>{viewItem.impact_area || '-'}</p></div>
              <div><Label className="text-muted-foreground">Risk Level</Label><div className="mt-1"><StatusBadge status={viewItem.risk_rating || 'Medium'} /></div></div>
            </div>
            <div><Label className="text-muted-foreground">Condition</Label><p>{viewItem.condition || '-'}</p></div>
            <div><Label className="text-muted-foreground">Criteria</Label><p>{viewItem.criteria || '-'}</p></div>
            <div><Label className="text-muted-foreground">Cause</Label><p>{viewItem.cause || '-'}</p></div>
            <div><Label className="text-muted-foreground">Effect</Label><p>{viewItem.effect || '-'}</p></div>
          </div>
        )}
      </EntityModal>

      <ConfirmDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)} title="Delete Finding" description="Are you sure you want to delete this finding?" onConfirm={() => { if (deleteId) { remove.mutate(deleteId); setDeleteId(null); } }} variant="destructive" />
      <BulkUploadModal open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen} title="Bulk Upload Findings" fields={bulkUploadFields} onImport={handleBulkImport} templateName={FINDINGS_SCHEMA.templateFileName} />
    </PageShell>
  );
};

export default FindingsManagement;
