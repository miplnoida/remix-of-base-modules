import { useMemo, useState } from 'react';
import { Pencil, Plus, Power, PowerOff, Search } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useCreateTableRegistryEntry,
  useDeactivateTableRegistryEntry,
  useReactivateTableRegistryEntry,
  useTableRegistryEntries,
  useUpdateTableRegistryEntry,
} from '@/platform/table-registry/useTableRegistry';
import {
  DATA_CLASSIFICATIONS,
  TABLE_CATEGORIES,
  TABLE_LIFECYCLE_STATUSES,
  TABLE_OWNERSHIP_TYPES,
  validateTableNaming,
  type DataClassification,
  type TableCategory,
  type TableLifecycleStatus,
  type TableOwnershipType,
  type TableRegistryEntry,
  type TableRegistryFilters,
  type TableRegistryFormValues,
} from '@/platform/table-registry/tableRegistryTypes';

const OWNERSHIP_BADGE: Record<TableOwnershipType, string> = {
  PLATFORM: 'bg-info/15 text-info border border-info/40',
  MODULE: 'bg-success/15 text-success border border-success/40',
  LEGACY: 'bg-warning/15 text-warning border border-warning/40',
  MIGRATION: 'bg-primary/15 text-primary border border-primary/40',
  REPORTING: 'bg-accent/40 text-accent-foreground border border-accent',
  ARCHIVE: 'bg-muted text-muted-foreground border border-border',
};

const LIFECYCLE_BADGE: Record<TableLifecycleStatus, string> = {
  ACTIVE: 'bg-success/15 text-success border border-success/40',
  PLANNED: 'bg-info/15 text-info border border-info/40',
  DEPRECATED: 'bg-warning/15 text-warning border border-warning/40',
  RETIRED: 'bg-muted text-muted-foreground border border-border',
  ARCHIVED: 'bg-muted text-muted-foreground border border-border',
};

const CLASSIFICATION_BADGE: Record<DataClassification, string> = {
  PUBLIC: 'bg-success/15 text-success border border-success/40',
  INTERNAL: 'bg-info/15 text-info border border-info/40',
  CONFIDENTIAL: 'bg-warning/15 text-warning border border-warning/40',
  RESTRICTED: 'bg-orange-500/15 text-orange-600 border border-orange-500/40',
  SENSITIVE: 'bg-destructive/15 text-destructive border border-destructive/40',
};

const EMPTY_FORM: TableRegistryFormValues = {
  table_name: '',
  table_prefix: '',
  modern_alias: '',
  domain_code: '',
  module_code: '',
  table_category: 'CONFIGURATION',
  ownership_type: 'PLATFORM',
  is_legacy_table: false,
  legacy_schema_name: '',
  legacy_table_name: '',
  canonical_service: '',
  canonical_admin_route: '',
  data_classification: 'INTERNAL',
  contains_pii: false,
  contains_financial_data: false,
  contains_health_data: false,
  lifecycle_status: 'ACTIVE',
  description: '',
  notes: '',
  is_active: true,
};

export default function TableRegistryAdmin() {
  const [filters, setFilters] = useState<TableRegistryFilters>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TableRegistryEntry | null>(null);
  const [form, setForm] = useState<TableRegistryFormValues>(EMPTY_FORM);

  const { data: entries = [], isLoading } = useTableRegistryEntries(filters);
  const createMut = useCreateTableRegistryEntry();
  const updateMut = useUpdateTableRegistryEntry();
  const deactivateMut = useDeactivateTableRegistryEntry();
  const reactivateMut = useReactivateTableRegistryEntry();

  const summary = useMemo(() => {
    const s = {
      total: entries.length,
      platform: 0,
      module: 0,
      legacy: 0,
      migration: 0,
      reporting: 0,
      pii: 0,
      missingAlias: 0,
      deprecated: 0,
    };
    for (const e of entries) {
      if (e.ownership_type === 'PLATFORM') s.platform++;
      if (e.ownership_type === 'MODULE') s.module++;
      if (e.ownership_type === 'LEGACY') s.legacy++;
      if (e.ownership_type === 'MIGRATION') s.migration++;
      if (e.ownership_type === 'REPORTING') s.reporting++;
      if (e.contains_pii) s.pii++;
      if (!e.modern_alias) s.missingAlias++;
      if (e.lifecycle_status === 'DEPRECATED') s.deprecated++;
    }
    return s;
  }, [entries]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(e: TableRegistryEntry) {
    setEditing(e);
    setForm({
      table_name: e.table_name,
      table_prefix: e.table_prefix ?? '',
      modern_alias: e.modern_alias ?? '',
      domain_code: e.domain_code,
      module_code: e.module_code ?? '',
      table_category: e.table_category,
      ownership_type: e.ownership_type,
      is_legacy_table: e.is_legacy_table,
      legacy_schema_name: e.legacy_schema_name ?? '',
      legacy_table_name: e.legacy_table_name ?? '',
      canonical_service: e.canonical_service ?? '',
      canonical_admin_route: e.canonical_admin_route ?? '',
      data_classification: e.data_classification,
      contains_pii: e.contains_pii,
      contains_financial_data: e.contains_financial_data,
      contains_health_data: e.contains_health_data,
      lifecycle_status: e.lifecycle_status,
      description: e.description ?? '',
      notes: e.notes ?? '',
      is_active: e.is_active,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    const errors = validateTableNaming(form);
    if (errors.length) {
      toast.error(errors[0]);
      return;
    }
    const payload: TableRegistryFormValues = {
      ...form,
      table_prefix: form.table_prefix?.trim() || null,
      modern_alias: form.modern_alias?.trim() || null,
      module_code: form.module_code?.trim() || null,
      legacy_schema_name: form.legacy_schema_name?.trim() || null,
      legacy_table_name: form.legacy_table_name?.trim() || null,
      canonical_service: form.canonical_service?.trim() || null,
      canonical_admin_route: form.canonical_admin_route?.trim() || null,
      description: form.description?.trim() || null,
      notes: form.notes?.trim() || null,
    };
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, payload });
        toast.success('Table registry entry updated');
      } else {
        await createMut.mutateAsync(payload);
        toast.success('Table registry entry created');
      }
      setDialogOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Save failed');
    }
  }

  async function handleToggle(e: TableRegistryEntry) {
    try {
      if (e.is_active) {
        await deactivateMut.mutateAsync(e.id);
        toast.success('Entry deactivated');
      } else {
        await reactivateMut.mutateAsync(e.id);
        toast.success('Entry reactivated');
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Action failed');
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Table Registry"
        subtitle="Govern platform, module, migration, reporting, and legacy table naming across the Social Security enterprise platform."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Administration', href: '/admin/platform' },
          { label: 'Table Registry' },
        ]}
      />

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-9">
        <SummaryCard label="Total" value={summary.total} />
        <SummaryCard label="Platform" value={summary.platform} tone="info" />
        <SummaryCard label="Module" value={summary.module} tone="success" />
        <SummaryCard label="Legacy" value={summary.legacy} tone="warning" />
        <SummaryCard label="Migration" value={summary.migration} tone="primary" />
        <SummaryCard label="Reporting" value={summary.reporting} />
        <SummaryCard label="With PII" value={summary.pii} tone="destructive" />
        <SummaryCard label="Missing Alias" value={summary.missingAlias} tone="warning" />
        <SummaryCard label="Deprecated" value={summary.deprecated} />
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <Label className="text-xs">Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Table name or modern alias"
                value={filters.search ?? ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Prefix</Label>
            <Input value={filters.table_prefix ?? ''} placeholder="e.g. core_"
              onChange={(e) => setFilters({ ...filters, table_prefix: e.target.value || undefined })} />
          </div>
          <div>
            <Label className="text-xs">Domain</Label>
            <Input value={filters.domain_code ?? ''} placeholder="e.g. GOVERNANCE"
              onChange={(e) => setFilters({ ...filters, domain_code: e.target.value || undefined })} />
          </div>
          <div>
            <Label className="text-xs">Module</Label>
            <Input value={filters.module_code ?? ''} placeholder="e.g. BN"
              onChange={(e) => setFilters({ ...filters, module_code: e.target.value || undefined })} />
          </div>
          <div>
            <Label className="text-xs">Ownership</Label>
            <Select value={filters.ownership_type ?? 'all'}
              onValueChange={(v) => setFilters({ ...filters, ownership_type: v === 'all' ? undefined : (v as TableOwnershipType) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {TABLE_OWNERSHIP_TYPES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={filters.table_category ?? 'all'}
              onValueChange={(v) => setFilters({ ...filters, table_category: v === 'all' ? undefined : (v as TableCategory) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {TABLE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Lifecycle</Label>
            <Select value={filters.lifecycle_status ?? 'all'}
              onValueChange={(v) => setFilters({ ...filters, lifecycle_status: v === 'all' ? undefined : (v as TableLifecycleStatus) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {TABLE_LIFECYCLE_STATUSES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {[
            ['Legacy only', 'legacy_only'],
            ['Contains PII', 'contains_pii'],
            ['Contains financial', 'contains_financial_data'],
            ['Contains health', 'contains_health_data'],
            ['Active only', 'is_active'],
            ['Missing modern alias', 'missing_modern_alias'],
          ].map(([label, key]) => (
            <div key={key} className="flex items-center gap-2 mt-6">
              <Switch checked={!!(filters as any)[key]}
                onCheckedChange={(v) => setFilters({ ...filters, [key]: v ? true : undefined } as any)} />
              <Label className="text-xs">{label}</Label>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Tables</CardTitle>
          <Button onClick={openCreate} size="sm"><Plus className="mr-1 h-4 w-4" /> New Table</Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Table Name</TableHead>
                <TableHead>Modern Alias</TableHead>
                <TableHead>Prefix</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Ownership</TableHead>
                <TableHead>Legacy</TableHead>
                <TableHead>Classification</TableHead>
                <TableHead>Lifecycle</TableHead>
                <TableHead>Canonical Route</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={13} className="text-center text-muted-foreground py-6">Loading…</TableCell></TableRow>
              ) : entries.length === 0 ? (
                <TableRow><TableCell colSpan={13} className="text-center text-muted-foreground py-6">No entries match the current filters.</TableCell></TableRow>
              ) : (
                entries.map((e) => (
                  <TableRow key={e.id} className={cn(!e.is_active && 'opacity-60')}>
                    <TableCell className="font-mono text-xs">{e.table_name}</TableCell>
                    <TableCell className="text-xs">{e.modern_alias ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="font-mono text-xs">{e.table_prefix ?? '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{e.domain_code}</TableCell>
                    <TableCell className="text-xs">{e.module_code ?? '—'}</TableCell>
                    <TableCell className="text-xs">{e.table_category}</TableCell>
                    <TableCell><Badge className={OWNERSHIP_BADGE[e.ownership_type]}>{e.ownership_type}</Badge></TableCell>
                    <TableCell>{e.is_legacy_table ? 'Yes' : 'No'}</TableCell>
                    <TableCell><Badge className={CLASSIFICATION_BADGE[e.data_classification]}>{e.data_classification}</Badge></TableCell>
                    <TableCell><Badge className={LIFECYCLE_BADGE[e.lifecycle_status]}>{e.lifecycle_status}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{e.canonical_admin_route ?? '—'}</TableCell>
                    <TableCell>{e.is_active ? 'Yes' : 'No'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleToggle(e)}
                          title={e.is_active ? 'Deactivate' : 'Reactivate'}>
                          {e.is_active
                            ? <PowerOff className="h-4 w-4 text-destructive" />
                            : <Power className="h-4 w-4 text-success" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Table Registry Entry' : 'New Table Registry Entry'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Table Name *">
              <Input value={form.table_name} onChange={(e) => setForm({ ...form, table_name: e.target.value })} />
            </Field>
            <Field label="Table Prefix">
              <Input value={form.table_prefix ?? ''} placeholder="e.g. core_"
                onChange={(e) => setForm({ ...form, table_prefix: e.target.value })} />
            </Field>
            <Field label="Modern Alias">
              <Input value={form.modern_alias ?? ''}
                onChange={(e) => setForm({ ...form, modern_alias: e.target.value })} />
            </Field>
            <Field label="Domain Code *">
              <Input value={form.domain_code}
                onChange={(e) => setForm({ ...form, domain_code: e.target.value })} />
            </Field>
            <Field label="Module Code">
              <Input value={form.module_code ?? ''}
                onChange={(e) => setForm({ ...form, module_code: e.target.value })} />
            </Field>
            <Field label="Category *">
              <Select value={form.table_category} onValueChange={(v) => setForm({ ...form, table_category: v as TableCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TABLE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Ownership Type *">
              <Select value={form.ownership_type} onValueChange={(v) => setForm({ ...form, ownership_type: v as TableOwnershipType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TABLE_OWNERSHIP_TYPES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Lifecycle *">
              <Select value={form.lifecycle_status} onValueChange={(v) => setForm({ ...form, lifecycle_status: v as TableLifecycleStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TABLE_LIFECYCLE_STATUSES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Data Classification *">
              <Select value={form.data_classification} onValueChange={(v) => setForm({ ...form, data_classification: v as DataClassification })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DATA_CLASSIFICATIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <div className="flex items-center gap-2 mt-6">
              <Switch checked={form.is_legacy_table}
                onCheckedChange={(v) => setForm({ ...form, is_legacy_table: v })} />
              <Label className="text-xs">Is legacy table</Label>
            </div>
            <Field label="Legacy Schema Name">
              <Input value={form.legacy_schema_name ?? ''}
                onChange={(e) => setForm({ ...form, legacy_schema_name: e.target.value })} />
            </Field>
            <Field label={form.is_legacy_table ? 'Legacy Table Name *' : 'Legacy Table Name'}>
              <Input value={form.legacy_table_name ?? ''}
                onChange={(e) => setForm({ ...form, legacy_table_name: e.target.value })} />
            </Field>
            <Field label="Canonical Service">
              <Input value={form.canonical_service ?? ''}
                onChange={(e) => setForm({ ...form, canonical_service: e.target.value })} />
            </Field>
            <Field label="Canonical Admin Route">
              <Input value={form.canonical_admin_route ?? ''} placeholder="/admin/..."
                onChange={(e) => setForm({ ...form, canonical_admin_route: e.target.value })} />
            </Field>
            {[
              ['Contains PII', 'contains_pii'],
              ['Contains financial data', 'contains_financial_data'],
              ['Contains health data', 'contains_health_data'],
              ['Active', 'is_active'],
            ].map(([label, key]) => (
              <div key={key} className="flex items-center gap-2 mt-6">
                <Switch checked={(form as any)[key]}
                  onCheckedChange={(v) => setForm({ ...form, [key]: v } as any)} />
                <Label className="text-xs">{label}</Label>
              </div>
            ))}
            <div className="md:col-span-2">
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description ?? ''} rows={2}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes ?? ''} rows={2}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
              {editing ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', className)}>
      {children}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'success' | 'warning' | 'info' | 'destructive' | 'primary';
}) {
  const toneClass =
    tone === 'success' ? 'text-success'
    : tone === 'warning' ? 'text-warning'
    : tone === 'info' ? 'text-info'
    : tone === 'destructive' ? 'text-destructive'
    : tone === 'primary' ? 'text-primary'
    : 'text-foreground';
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={cn('text-2xl font-semibold', toneClass)}>{value}</div>
      </CardContent>
    </Card>
  );
}
