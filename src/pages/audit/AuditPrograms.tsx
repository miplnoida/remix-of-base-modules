import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, BookOpen, FileCheck, Copy } from 'lucide-react';
import { PageShell, StandardSearchFilterBar, DataTable, StandardModal, StatusBadge } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { useIAAuditPrograms } from '@/hooks/useAuditDataPhase2';
import { useAuditFields } from '@/hooks/useAuditTrail';
import { MetricCard } from '@/components/shared/MetricCard';

const STATUSES = ['Draft', 'Active', 'Archived'];

const emptyForm = {
  program_name: '', program_code: '', audit_area: '', objective: '', scope: '',
  methodology: '', status: 'Draft', version: 1,
};

export default function AuditPrograms() {
  const { data = [], isLoading, isError, create, update } = useIAAuditPrograms();
  const { getCreateFields, getUpdateFields } = useAuditFields();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ status: 'all' });
  const [modalState, setModalState] = useState<{ mode: 'add' | 'edit' | 'view' | null; record?: any }>({ mode: null });
  const [form, setForm] = useState(emptyForm);

  const filtered = data.filter((r: any) => {
    const s = searchTerm.toLowerCase();
    const ms = !s || r.program_name?.toLowerCase().includes(s) || r.program_code?.toLowerCase().includes(s);
    const mSt = filters.status === 'all' || r.status === filters.status;
    return ms && mSt;
  });

  const stats = {
    total: data.length,
    active: data.filter((d: any) => d.status === 'Active').length,
    draft: data.filter((d: any) => d.status === 'Draft').length,
  };

  const openAdd = () => { setForm(emptyForm); setModalState({ mode: 'add' }); };
  const openEdit = (r: any) => {
    setForm({ program_name: r.program_name || '', program_code: r.program_code || '', audit_area: r.audit_area || '', objective: r.objective || '', scope: r.scope || '', methodology: r.methodology || '', status: r.status || 'Draft', version: r.version || 1 });
    setModalState({ mode: 'edit', record: r });
  };
  const openView = (r: any) => { openEdit(r); setModalState({ mode: 'view', record: r }); };

  const handleDuplicate = (r: any) => {
    create.mutate({ program_name: `${r.program_name} (Copy)`, program_code: '', audit_area: r.audit_area, objective: r.objective, scope: r.scope, methodology: r.methodology, status: 'Draft', version: (r.version || 1) + 1, ...getCreateFields() } as any);
  };

  const handleSave = () => {
    if (modalState.mode === 'add') {
      create.mutate({ ...form, ...getCreateFields() } as any, { onSuccess: () => setModalState({ mode: null }) });
    } else if (modalState.mode === 'edit' && modalState.record) {
      update.mutate({ id: modalState.record.id, ...form, ...getUpdateFields() } as any, { onSuccess: () => setModalState({ mode: null }) });
    }
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'program_code', header: 'Code' },
    { key: 'program_name', header: 'Program Name' },
    { key: 'audit_area', header: 'Audit Area' },
    { key: 'version', header: 'Version' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  const filterFields: StandardFilterField[] = [
    { key: 'status', label: 'Status', options: [{ label: 'All', value: 'all' }, ...STATUSES.map(s => ({ label: s, value: s }))] },
  ];

  const isReadOnly = modalState.mode === 'view';

  return (
    <PageShell title="Audit Programs" subtitle="Maintain reusable audit programs and procedure templates"
      breadcrumbs={[{ label: 'Internal Audit', href: '/audit/dashboard' }, { label: 'Audit Programs' }]}
      actions={<Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />New Program</Button>}
      isLoading={isLoading} error={isError ? 'Failed to load' : null}>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="Total Programs" value={stats.total} icon={BookOpen} variant="info" />
        <MetricCard title="Active" value={stats.active} icon={FileCheck} variant="success" />
        <MetricCard title="Draft" value={stats.draft} icon={Copy} variant="default" />
      </div>

      <Card><CardContent className="p-4">
        <StandardSearchFilterBar searchTerm={searchTerm} onSearchChange={setSearchTerm} searchPlaceholder="Search programs..." filters={filters} onFilterChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))} filterFields={filterFields} onReset={() => { setSearchTerm(''); setFilters({ status: 'all' }); }} />
      </CardContent></Card>

      <Card><CardContent>
        <DataTable columns={columns} data={filtered} onRowClick={openView}
          actions={(row) => (
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(row); }}>Edit</Button>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDuplicate(row); }}><Copy className="h-3 w-3 mr-1" />Duplicate</Button>
            </div>
          )} />
      </CardContent></Card>

      <StandardModal open={modalState.mode !== null} onOpenChange={() => setModalState({ mode: null })}
        title={modalState.mode === 'add' ? 'New Audit Program' : modalState.mode === 'edit' ? 'Edit Program' : 'View Program'}
        onSubmit={!isReadOnly ? handleSave : undefined} submitLabel="Save" isSubmitting={create.isPending || update.isPending}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Program Name</Label><Input value={form.program_name} onChange={e => setForm(f => ({ ...f, program_name: e.target.value }))} disabled={isReadOnly} /></div>
            <div><Label>Program Code</Label><Input value={form.program_code} onChange={e => setForm(f => ({ ...f, program_code: e.target.value }))} disabled={isReadOnly} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Audit Area</Label><Input value={form.audit_area} onChange={e => setForm(f => ({ ...f, audit_area: e.target.value }))} disabled={isReadOnly} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))} disabled={isReadOnly}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Objective</Label><Textarea value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))} disabled={isReadOnly} /></div>
          <div><Label>Scope</Label><Textarea value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value }))} disabled={isReadOnly} /></div>
          <div><Label>Methodology</Label><Textarea value={form.methodology} onChange={e => setForm(f => ({ ...f, methodology: e.target.value }))} disabled={isReadOnly} /></div>
        </div>
      </StandardModal>
    </PageShell>
  );
}
