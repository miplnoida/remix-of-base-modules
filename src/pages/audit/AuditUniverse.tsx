import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Globe, AlertTriangle, Shield, CheckCircle, Upload } from 'lucide-react';
import { PageShell, StandardSearchFilterBar, DataTable, StandardModal, StatusBadge, BulkUploadModal, ExportDropdown } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { useIAAuditUniverse } from '@/hooks/useAuditDataPhase2';
import { useIADepartments, useIAAuditors } from '@/hooks/useAuditData';
import { useAuditFields } from '@/hooks/useAuditTrail';
import { MetricCard } from '@/components/shared/MetricCard';
import { AUDIT_UNIVERSE_SCHEMA, toBulkUploadFields, toExportColumns } from '@/config/moduleFieldSchemas';

const ENTITY_TYPES = ['Function', 'Process', 'System', 'Location', 'Project'];
const RISK_CATEGORIES = ['High', 'Medium', 'Low', 'Critical'];
const FREQUENCIES = ['Annual', 'Bi-Annual', 'Quarterly', 'Ad-hoc'];

const bulkUploadFields = toBulkUploadFields(AUDIT_UNIVERSE_SCHEMA);
const exportColumns = toExportColumns(AUDIT_UNIVERSE_SCHEMA);

const emptyForm = {
  entity_name: '', entity_code: '', entity_type: 'Function', process_owner: '',
  department_id: '',
  risk_category: 'Medium', inherent_risk_score: 0, residual_risk_score: 0,
  materiality: '', regulatory_impact: '', audit_frequency: 'Annual', status: 'Active',
};

export default function AuditUniverse() {
  const { data = [], isLoading, isError, create, update, archive } = useIAAuditUniverse();
  const { data: departments = [] } = useIADepartments();
  const { data: auditors = [] } = useIAAuditors();
  const { getCreateFields, getUpdateFields } = useAuditFields();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ entity_type: 'all', risk_category: 'all', status: 'all' });
  const [modalState, setModalState] = useState<{ mode: 'view' | 'edit' | 'create' | null; record?: any }>({ mode: null });
  const [form, setForm] = useState(emptyForm);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  const handleBulkImport = async (data: Record<string, any>[]) => {
    for (const row of data) {
      const dept = departments.find((d: any) => d.name === row.department_name);
      create.mutate({
        entity_name: row.entity_name, entity_code: row.entity_code,
        entity_type: row.entity_type || 'Function', process_owner: row.process_owner || '',
        department_id: dept?.id || null,
        risk_category: row.risk_category || 'Medium', audit_frequency: row.audit_frequency || 'Annual',
        status: row.status || 'Active',
        inherent_risk_score: Number(row.inherent_risk_score) || 0,
        residual_risk_score: Number(row.residual_risk_score) || 0,
        materiality: row.materiality || '',
        ...getCreateFields(),
      } as any);
    }
  };

  const filtered = data.filter((r: any) => {
    const s = searchTerm.toLowerCase();
    const matchSearch = !s || r.entity_name?.toLowerCase().includes(s) || r.entity_code?.toLowerCase().includes(s);
    const matchType = filters.entity_type === 'all' || r.entity_type === filters.entity_type;
    const matchRisk = filters.risk_category === 'all' || r.risk_category === filters.risk_category;
    const matchStatus = filters.status === 'all' || r.status === filters.status;
    return matchSearch && matchType && matchRisk && matchStatus;
  });

  const stats = {
    total: data.length,
    highRisk: data.filter((d: any) => d.risk_category === 'High' || d.risk_category === 'Critical').length,
    dueSoon: data.filter((d: any) => d.next_audit_due && new Date(d.next_audit_due) <= new Date(Date.now() + 90 * 86400000)).length,
    active: data.filter((d: any) => d.status === 'Active').length,
  };

  const openAdd = () => { setForm(emptyForm); setModalState({ mode: 'create' }); };
  const openEdit = (r: any) => {
    setForm({ entity_name: r.entity_name || '', entity_code: r.entity_code || '', entity_type: r.entity_type || 'Function', process_owner: r.process_owner || '', department_id: r.department_id || '', risk_category: r.risk_category || 'Medium', inherent_risk_score: r.inherent_risk_score || 0, residual_risk_score: r.residual_risk_score || 0, materiality: r.materiality || '', regulatory_impact: r.regulatory_impact || '', audit_frequency: r.audit_frequency || 'Annual', status: r.status || 'Active' });
    setModalState({ mode: 'edit', record: r });
  };
  const openView = (r: any) => { openEdit(r); setModalState({ mode: 'view', record: r }); };

  const handleSave = () => {
    if (modalState.mode === 'create') {
      create.mutate({ ...form, department_id: form.department_id || null, ...getCreateFields() } as any, { onSuccess: () => setModalState({ mode: null }) });
    } else if (modalState.mode === 'edit' && modalState.record) {
      update.mutate({ id: modalState.record.id, ...form, department_id: form.department_id || null, ...getUpdateFields() } as any, { onSuccess: () => setModalState({ mode: null }) });
    }
  };

  const getDeptName = (deptId: string) => departments.find((d: any) => d.id === deptId)?.name || '-';

  const columns: DataTableColumn<any>[] = [
    { key: 'entity_code', header: 'Entity Code' },
    { key: 'entity_name', header: 'Entity Name' },
    { key: 'entity_type', header: 'Entity Type', render: (r) => <StatusBadge status={r.entity_type} /> },
    { key: 'department', header: 'Department', render: (r) => getDeptName(r.department_id) },
    { key: 'risk_category', header: 'Risk Category', render: (r) => <StatusBadge status={r.risk_category} /> },
    { key: 'process_owner', header: 'Process Owner' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  const filterFields: StandardFilterField[] = [
    { key: 'entity_type', label: 'Entity Type', type: 'select', options: [{ label: 'All Types', value: 'all' }, ...ENTITY_TYPES.map(t => ({ label: t, value: t }))] },
    { key: 'risk_category', label: 'Risk Category', type: 'select', options: [{ label: 'All', value: 'all' }, ...RISK_CATEGORIES.map(t => ({ label: t, value: t }))] },
    { key: 'status', label: 'Status', type: 'select', options: [{ label: 'All', value: 'all' }, { label: 'Active', value: 'Active' }, { label: 'Inactive', value: 'Inactive' }] },
  ];

  return (
    <PageShell title="Audit Universe" subtitle="Master list of all auditable functions and processes across the organization"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/dashboard' }, { label: 'Audit Universe' }]}
      actions={
        <div className="flex items-center gap-2">
          <ExportDropdown data={filtered} columns={exportColumns} fileName={AUDIT_UNIVERSE_SCHEMA.exportFileName} title={AUDIT_UNIVERSE_SCHEMA.exportTitle} />
          <Button variant="outline" size="sm" onClick={() => setIsBulkUploadOpen(true)}><Upload className="h-4 w-4 mr-2" />Bulk Upload</Button>
          <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Entity</Button>
        </div>
      }
      isLoading={isLoading} error={isError ? 'Failed to load audit universe' : null}>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Entities" value={stats.total} icon={Globe} variant="info" />
        <MetricCard title="High / Critical Risk" value={stats.highRisk} icon={AlertTriangle} variant="error" />
        <MetricCard title="Audit Due (90 days)" value={stats.dueSoon} icon={Shield} variant="warning" />
        <MetricCard title="Active Entities" value={stats.active} icon={CheckCircle} variant="success" />
      </div>

      <Card><CardContent className="p-4">
        <StandardSearchFilterBar searchValue={searchTerm} onSearchChange={setSearchTerm} searchPlaceholder="Search entities..." filterValues={filters} onFilterChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))} filters={filterFields} onReset={() => { setSearchTerm(''); setFilters({ entity_type: 'all', risk_category: 'all', status: 'all' }); }} />
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
        title={modalState.mode === 'create' ? 'Add Auditable Entity' : modalState.mode === 'edit' ? 'Edit Entity' : 'View Entity'}
        mode={modalState.mode || 'view'} onSave={handleSave} saveLabel={modalState.mode === 'create' ? 'Create' : 'Save Changes'} isSaving={create.isPending || update.isPending}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Entity Name *</Label><Input value={form.entity_name} onChange={e => setForm(f => ({ ...f, entity_name: e.target.value }))} disabled={modalState.mode === 'view'} /></div>
            <div><Label>Entity Code *</Label><Input value={form.entity_code} onChange={e => setForm(f => ({ ...f, entity_code: e.target.value }))} disabled={modalState.mode === 'view'} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Entity Type</Label>
              <Select value={form.entity_type} onValueChange={v => setForm(f => ({ ...f, entity_type: v }))} disabled={modalState.mode === 'view'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ENTITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Department</Label>
              <Select value={form.department_id} onValueChange={v => setForm(f => ({ ...f, department_id: v }))} disabled={modalState.mode === 'view'}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Process Owner</Label>
              <Select value={form.process_owner} onValueChange={v => setForm(f => ({ ...f, process_owner: v }))} disabled={modalState.mode === 'view'}>
                <SelectTrigger><SelectValue placeholder="Select process owner" /></SelectTrigger>
                <SelectContent>{auditors.map((a: any) => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Risk Category</Label>
              <Select value={form.risk_category} onValueChange={v => setForm(f => ({ ...f, risk_category: v }))} disabled={modalState.mode === 'view'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RISK_CATEGORIES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Audit Frequency</Label>
              <Select value={form.audit_frequency} onValueChange={v => setForm(f => ({ ...f, audit_frequency: v }))} disabled={modalState.mode === 'view'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FREQUENCIES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))} disabled={modalState.mode === 'view'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Inherent Risk Score</Label><Input type="number" value={form.inherent_risk_score} onChange={e => setForm(f => ({ ...f, inherent_risk_score: Number(e.target.value) }))} disabled={modalState.mode === 'view'} /></div>
            <div><Label>Residual Risk Score</Label><Input type="number" value={form.residual_risk_score} onChange={e => setForm(f => ({ ...f, residual_risk_score: Number(e.target.value) }))} disabled={modalState.mode === 'view'} /></div>
          </div>
          <div><Label>Materiality</Label><Input value={form.materiality} onChange={e => setForm(f => ({ ...f, materiality: e.target.value }))} disabled={modalState.mode === 'view'} /></div>
          <div><Label>Regulatory Impact</Label><Textarea value={form.regulatory_impact} onChange={e => setForm(f => ({ ...f, regulatory_impact: e.target.value }))} disabled={modalState.mode === 'view'} /></div>
        </div>
      </StandardModal>

      <BulkUploadModal open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen} title="Bulk Upload Audit Universe" fields={bulkUploadFields} onImport={handleBulkImport} templateName={AUDIT_UNIVERSE_SCHEMA.templateFileName} />
    </PageShell>
  );
}
