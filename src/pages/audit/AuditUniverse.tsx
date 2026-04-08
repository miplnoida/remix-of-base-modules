import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Globe, Building2, Eye, Edit, Trash2 } from 'lucide-react';
import { PageShell, StandardSearchFilterBar, DataTable, StandardModal, StatusBadge, ExportDropdown } from '@/components/common';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { MetricCard } from '@/components/shared/MetricCard';
import { useAuditUniverse, useAuditUniverseMutations, ENTITY_TYPES, AUDIT_FREQUENCIES, MATERIALITY_LEVELS, ENTITY_STATUSES } from '@/hooks/useAuditUniverse';
import { useTablePagination } from '@/hooks/useTablePagination';
import { AUDIT_UNIVERSE_SCHEMA, toExportColumns } from '@/config/moduleFieldSchemas';
import { formatDateForDisplay } from '@/lib/format-config';
import { Badge } from '@/components/ui/badge';

const exportColumns = toExportColumns(AUDIT_UNIVERSE_SCHEMA);

const RISK_CATEGORIES = ['Operational', 'Financial', 'Compliance', 'IT', 'Strategic', 'Reputational'];

const emptyForm = {
  entity_name: '',
  entity_type: 'Department',
  entity_code: '',
  process_owner: '',
  risk_category: '',
  audit_frequency: 'Annual',
  materiality: 'Medium',
  regulatory_impact: '',
  status: 'Active',
};

export default function AuditUniverse() {
  const { data: entities = [], isLoading } = useAuditUniverse();
  const { create, update, remove } = useAuditUniverseMutations();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const filtered = useMemo(() => {
    return entities.filter((e: any) => {
      if (typeFilter !== 'all' && e.entity_type !== typeFilter) return false;
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (e.entity_name?.toLowerCase().includes(s) || e.entity_code?.toLowerCase().includes(s) || e.process_owner?.toLowerCase().includes(s));
      }
      return true;
    });
  }, [entities, search, typeFilter, statusFilter]);

  const { paginatedData, pagination, goToPage, changePageSize } = useTablePagination(filtered, 15);

  const activeCount = entities.filter((e: any) => e.is_active).length;
  const typeBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    entities.forEach((e: any) => { map[e.entity_type] = (map[e.entity_type] || 0) + 1; });
    return map;
  }, [entities]);

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };
  const openEdit = (row: any) => {
    setForm({
      entity_name: row.entity_name || '',
      entity_type: row.entity_type || 'Department',
      entity_code: row.entity_code || '',
      process_owner: row.process_owner || '',
      risk_category: row.risk_category || '',
      audit_frequency: row.audit_frequency || 'Annual',
      materiality: row.materiality || 'Medium',
      regulatory_impact: row.regulatory_impact || '',
      status: row.status || 'Active',
    });
    setEditingId(row.id);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.entity_name.trim()) return;
    if (editingId) {
      update.mutate({ id: editingId, ...form }, { onSuccess: () => setModalOpen(false) });
    } else {
      create.mutate(form as any, { onSuccess: () => setModalOpen(false) });
    }
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'entity_name', header: 'Entity Name' },
    { key: 'entity_type', header: 'Type', render: (v: string) => <Badge variant="outline">{v}</Badge> },
    { key: 'entity_code', header: 'Code' },
    { key: 'process_owner', header: 'Process Owner' },
    { key: 'risk_category', header: 'Risk Category' },
    { key: 'materiality', header: 'Materiality', render: (v: string) => <StatusBadge status={v} /> },
    { key: 'audit_frequency', header: 'Frequency' },
    { key: 'status', header: 'Status', render: (v: string) => <StatusBadge status={v} /> },
    {
      key: 'actions', header: 'Actions', render: (_: any, row: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(row)}><Edit className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => remove.mutate(row.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ),
    },
  ];

  const filterFields: StandardFilterField[] = [
    { key: 'entity_type', label: 'Entity Type', type: 'select', options: [{ label: 'All Types', value: 'all' }, ...ENTITY_TYPES.map(t => ({ label: t, value: t }))] },
    { key: 'status', label: 'Status', type: 'select', options: [{ label: 'All', value: 'all' }, ...ENTITY_STATUSES.map(s => ({ label: s, value: s }))] },
  ];

  return (
    <PageShell title="Audit Universe" subtitle="Manage all auditable entities across the organization">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Total Entities" value={entities.length} icon={Globe} />
        <MetricCard title="Active" value={activeCount} icon={Building2} />
        <MetricCard title="Entity Types" value={Object.keys(typeBreakdown).length} icon={Eye} />
        <MetricCard title="High Materiality" value={entities.filter((e: any) => e.materiality === 'High').length} icon={Building2} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Audit Universe Register</CardTitle>
          <div className="flex gap-2">
            <ExportDropdown data={filtered} columns={exportColumns} fileName="audit-universe" title="Audit Universe Register" />
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Entity</Button>
          </div>
        </CardHeader>
        <CardContent>
          <StandardSearchFilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search entities..."
            filters={filterFields}
            filterValues={{ entity_type: typeFilter, status: statusFilter }}
            onFilterChange={(k, v) => { if (k === 'entity_type') setTypeFilter(v); if (k === 'status') setStatusFilter(v); }}
          />
          <DataTable columns={columns} data={paginatedData} isLoading={isLoading} emptyMessage="No audit universe entities found." />
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.pageSize + 1}–{Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} of {pagination.totalItems}
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => goToPage(pagination.page - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => goToPage(pagination.page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <StandardModal open={modalOpen} onOpenChange={setModalOpen} title={editingId ? 'Edit Entity' : 'Add Entity'} size="lg"
        footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={create.isPending || update.isPending}>{editingId ? 'Update' : 'Create'}</Button></>}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Entity Name *</Label>
            <Input value={form.entity_name} onChange={e => setForm(f => ({ ...f, entity_name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Entity Type</Label>
            <Select value={form.entity_type} onValueChange={v => setForm(f => ({ ...f, entity_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ENTITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Entity Code</Label>
            <Input value={form.entity_code} onChange={e => setForm(f => ({ ...f, entity_code: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Process Owner</Label>
            <Input value={form.process_owner} onChange={e => setForm(f => ({ ...f, process_owner: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Risk Category</Label>
            <Select value={form.risk_category} onValueChange={v => setForm(f => ({ ...f, risk_category: v }))}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{RISK_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Audit Frequency</Label>
            <Select value={form.audit_frequency} onValueChange={v => setForm(f => ({ ...f, audit_frequency: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{AUDIT_FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Materiality</Label>
            <Select value={form.materiality} onValueChange={v => setForm(f => ({ ...f, materiality: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MATERIALITY_LEVELS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ENTITY_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Regulatory Impact</Label>
            <Textarea value={form.regulatory_impact} onChange={e => setForm(f => ({ ...f, regulatory_impact: e.target.value }))} rows={2} />
          </div>
        </div>
      </StandardModal>
    </PageShell>
  );
}
