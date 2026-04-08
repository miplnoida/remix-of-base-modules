import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Globe, Building2, Eye, Edit, Trash2, Shield, X } from 'lucide-react';
import { PageShell, StandardSearchFilterBar, DataTable, StandardModal, StatusBadge, ExportDropdown } from '@/components/common';
import { buildMetadata, type ExportMetadata, type GroupByOption } from '@/lib/auditReportExports';
import type { DataTableColumn, StandardFilterField } from '@/components/common';
import { MetricCard } from '@/components/shared/MetricCard';
import { useAuditUniverse, useAuditUniverseMutations, ENTITY_TYPES, AUDIT_FREQUENCIES, MATERIALITY_LEVELS, ENTITY_STATUSES } from '@/hooks/useAuditUniverse';
import { useRiskRegister } from '@/hooks/useRiskRegister';
import { useTablePagination } from '@/hooks/useTablePagination';
import { AUDIT_UNIVERSE_SCHEMA, toExportColumns } from '@/config/moduleFieldSchemas';
import { formatDateForDisplay } from '@/lib/format-config';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { AuditEmptyState } from '@/components/audit/workspace/AuditEmptyState';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  const { data: allRisks = [] } = useRiskRegister();
  const { create, update, remove } = useAuditUniverseMutations();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null);
  const [detailEntity, setDetailEntity] = useState<any>(null);

  // Unique owners for filter
  const ownerOptions = useMemo(() => {
    const owners = new Set<string>();
    entities.forEach((e: any) => { if (e.process_owner) owners.add(e.process_owner); });
    return Array.from(owners).sort();
  }, [entities]);

  const filtered = useMemo(() => {
    return entities.filter((e: any) => {
      if (typeFilter !== 'all' && e.entity_type !== typeFilter) return false;
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (ownerFilter !== 'all' && e.process_owner !== ownerFilter) return false;
      if (categoryFilter !== 'all' && e.risk_category !== categoryFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (e.entity_name?.toLowerCase().includes(s) || e.entity_code?.toLowerCase().includes(s) || e.process_owner?.toLowerCase().includes(s));
      }
      return true;
    });
  }, [entities, search, typeFilter, statusFilter, ownerFilter, categoryFilter]);

  const { paginatedData, pagination, goToPage } = useTablePagination(filtered, 15);

  const activeCount = entities.filter((e: any) => e.is_active).length;
  const typeBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    entities.forEach((e: any) => { map[e.entity_type] = (map[e.entity_type] || 0) + 1; });
    return map;
  }, [entities]);

  // Linked risks count per entity
  const riskCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    allRisks.forEach((r: any) => { if (r.audit_universe_id) map[r.audit_universe_id] = (map[r.audit_universe_id] || 0) + 1; });
    return map;
  }, [allRisks]);

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

  const handleConfirmDeactivate = () => {
    if (confirmDeactivate) {
      remove.mutate(confirmDeactivate, { onSuccess: () => setConfirmDeactivate(null) });
    }
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'entity_name', header: 'Entity Name', render: (row: any) => (
      <button className="text-left text-primary hover:underline font-medium" onClick={() => setDetailEntity(row)}>{row.entity_name}</button>
    )},
    { key: 'entity_type', header: 'Type', render: (row: any) => <Badge variant="outline">{row.entity_type}</Badge> },
    { key: 'entity_code', header: 'Code' },
    { key: 'process_owner', header: 'Process Owner' },
    { key: 'risk_category', header: 'Risk Category' },
    { key: 'materiality', header: 'Materiality', render: (row: any) => <StatusBadge status={row.materiality} /> },
    { key: 'audit_frequency', header: 'Frequency' },
    { key: 'linked_risks', header: 'Risks', render: (row: any) => (
      <Badge variant="secondary">{riskCountMap[row.id] || 0}</Badge>
    )},
    { key: 'status', header: 'Status', render: (row: any) => <StatusBadge status={row.status} /> },
    {
      key: 'actions', header: 'Actions', render: (row: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(row)}><Edit className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setConfirmDeactivate(row.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ),
    },
  ];

  const filterFields: StandardFilterField[] = [
    { key: 'entity_type', label: 'Entity Type', type: 'select', options: [{ label: 'All Types', value: 'all' }, ...ENTITY_TYPES.map(t => ({ label: t, value: t }))] },
    { key: 'status', label: 'Status', type: 'select', options: [{ label: 'All', value: 'all' }, ...ENTITY_STATUSES.map(s => ({ label: s, value: s }))] },
    { key: 'owner', label: 'Owner', type: 'select', options: [{ label: 'All Owners', value: 'all' }, ...ownerOptions.map(o => ({ label: o, value: o }))] },
    { key: 'category', label: 'Risk Category', type: 'select', options: [{ label: 'All', value: 'all' }, ...RISK_CATEGORIES.map(c => ({ label: c, value: c }))] },
  ];

  const auGroupByOptions: GroupByOption[] = [
    { label: 'Entity Type', key: 'entity_type' },
    { label: 'Owner', key: 'process_owner' },
    { label: 'Status', key: 'status' },
    { label: 'Risk Category', key: 'risk_category' },
    { label: 'Materiality', key: 'materiality' },
  ];

  const auMetadata = useMemo(() => buildMetadata(
    'Auditable Entities Register',
    filtered.length,
    [
      { label: 'Entity Type', value: typeFilter },
      { label: 'Status', value: statusFilter },
      { label: 'Owner', value: ownerFilter },
      { label: 'Risk Category', value: categoryFilter },
    ],
  ), [filtered.length, typeFilter, statusFilter, ownerFilter, categoryFilter]);

  return (
    <PageShell title="Auditable Entities" subtitle="Manage all auditable entities across the organization">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Total Entities" value={entities.length} icon={Globe} />
        <MetricCard title="Active" value={activeCount} icon={Building2} />
        <MetricCard title="Entity Types" value={Object.keys(typeBreakdown).length} icon={Eye} />
        <MetricCard title="High Materiality" value={entities.filter((e: any) => e.materiality === 'High').length} icon={Shield} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Auditable Entities Register</CardTitle>
          <div className="flex gap-2">
            <ExportDropdown data={filtered} columns={exportColumns} fileName="auditable-entities" title="Auditable Entities Register" metadata={auMetadata} groupByOptions={auGroupByOptions} />
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Entity</Button>
          </div>
        </CardHeader>
        <CardContent>
          <StandardSearchFilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search entities..."
            filters={filterFields}
            filterValues={{ entity_type: typeFilter, status: statusFilter, owner: ownerFilter, category: categoryFilter }}
            onFilterChange={(k, v) => {
              if (k === 'entity_type') setTypeFilter(v);
              if (k === 'status') setStatusFilter(v);
              if (k === 'owner') setOwnerFilter(v);
              if (k === 'category') setCategoryFilter(v);
            }}
          />
          {!isLoading && entities.length === 0 ? (
            <AuditEmptyState
              icon={Globe}
              title="No auditable entities yet"
              description="Add your first auditable entity — departments, processes, systems, and more."
              actionLabel="Add Entity"
              onAction={openCreate}
            />
          ) : (
            <DataTable columns={columns} data={paginatedData} isLoading={isLoading} emptyMessage="No entities match your filters." />
          )}
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

      {/* CREATE/EDIT MODAL */}
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
            <Select value={form.risk_category || '__none__'} onValueChange={v => setForm(f => ({ ...f, risk_category: v === '__none__' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— None —</SelectItem>
                {RISK_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
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

      {/* DEACTIVATION CONFIRMATION */}
      <ConfirmDialog
        open={!!confirmDeactivate}
        onOpenChange={(open) => { if (!open) setConfirmDeactivate(null); }}
        title="Deactivate Entity"
        description="This entity will be deactivated and hidden from active views. Linked risks will remain but may need reassignment. Continue?"
        confirmLabel="Deactivate"
        variant="destructive"
        onConfirm={handleConfirmDeactivate}
        isLoading={remove.isPending}
      />

      {/* ENTITY DETAIL PANEL */}
      {detailEntity && (
        <EntityDetailPanel entity={detailEntity} risks={allRisks} onClose={() => setDetailEntity(null)} />
      )}
    </PageShell>
  );
}

// ============= Entity Detail Panel =============
function EntityDetailPanel({ entity, risks, onClose }: { entity: any; risks: any[]; onClose: () => void }) {
  const linkedRisks = useMemo(() => risks.filter((r: any) => r.audit_universe_id === entity.id), [risks, entity.id]);
  const openRisks = linkedRisks.filter((r: any) => r.status === 'Open' || r.status === 'Mitigating');
  const criticalRisks = linkedRisks.filter((r: any) => r.inherent_risk_level === 'Critical' || r.residual_risk_level === 'Critical');

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> {entity.entity_name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div><span className="text-muted-foreground">Type:</span> {entity.entity_type}</div>
          <div><span className="text-muted-foreground">Code:</span> {entity.entity_code || '—'}</div>
          <div><span className="text-muted-foreground">Owner:</span> {entity.process_owner || '—'}</div>
          <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={entity.status} /></div>
          <div><span className="text-muted-foreground">Materiality:</span> <StatusBadge status={entity.materiality} /></div>
          <div><span className="text-muted-foreground">Frequency:</span> {entity.audit_frequency || '—'}</div>
          <div><span className="text-muted-foreground">Risk Category:</span> {entity.risk_category || '—'}</div>
          <div><span className="text-muted-foreground">Created:</span> {entity.created_at ? formatDateForDisplay(entity.created_at) : '—'}</div>
        </div>

        {entity.regulatory_impact && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-1">Regulatory Impact</p>
            <p className="text-sm">{entity.regulatory_impact}</p>
          </div>
        )}

        <div className="border-t pt-4">
          <h4 className="text-sm font-semibold mb-3">Linked Risks ({linkedRisks.length})</h4>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="p-2 rounded-md bg-muted text-center">
              <p className="text-lg font-bold">{linkedRisks.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="p-2 rounded-md bg-muted text-center">
              <p className="text-lg font-bold">{openRisks.length}</p>
              <p className="text-xs text-muted-foreground">Open</p>
            </div>
            <div className="p-2 rounded-md bg-muted text-center">
              <p className="text-lg font-bold text-destructive">{criticalRisks.length}</p>
              <p className="text-xs text-muted-foreground">Critical</p>
            </div>
          </div>
          {linkedRisks.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {linkedRisks.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between p-2 rounded-md border text-sm">
                  <span className="font-medium">{r.risk_title}</span>
                  <div className="flex gap-2">
                    <Badge variant="outline">{r.risk_category}</Badge>
                    <StatusBadge status={r.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No risks linked to this entity.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
