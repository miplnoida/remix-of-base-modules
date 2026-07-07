import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Power, PowerOff, Search, ExternalLink, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useCreateLegacyTableMap,
  useDeactivateLegacyTableMap,
  useEligibleLegacyTablesFromTableRegistry,
  useLegacyTableMaps,
  useReactivateLegacyTableMap,
  useUpdateLegacyTableMap,
} from '@/platform/legacy-mapping/useLegacyMapping';
import {
  LEGACY_MAPPING_STATUSES,
  LEGACY_USE_STRATEGIES,
  type LegacyMappingFilters,
  type LegacyMappingStatus,
  type LegacyTableMap,
  type LegacyTableMapFormValues,
  type LegacyUseStrategy,
} from '@/platform/legacy-mapping/legacyMappingTypes';

const STRATEGY_BADGE: Record<LegacyUseStrategy, string> = {
  DIRECT: 'bg-success/15 text-success border border-success/40',
  VIEW: 'bg-info/15 text-info border border-info/40',
  ADAPTER: 'bg-primary/15 text-primary border border-primary/40',
  MIGRATE: 'bg-orange-500/15 text-orange-600 border border-orange-500/40',
  ARCHIVE: 'bg-muted text-muted-foreground border border-border',
  IGNORE: 'bg-destructive/15 text-destructive border border-destructive/40',
};

const STATUS_BADGE: Record<LegacyMappingStatus, string> = {
  DISCOVERED: 'bg-muted text-muted-foreground border border-border',
  MAPPED: 'bg-info/15 text-info border border-info/40',
  REVIEWED: 'bg-primary/15 text-primary border border-primary/40',
  APPROVED: 'bg-success/15 text-success border border-success/40',
  DEPRECATED: 'bg-warning/15 text-warning border border-warning/40',
  RETIRED: 'bg-muted text-muted-foreground border border-border',
};

const EMPTY_FORM: LegacyTableMapFormValues = {
  table_registry_id: null,
  legacy_schema_name: 'public',
  legacy_table_name: '',
  modern_table_name: '',
  modern_entity_name: '',
  modern_alias: '',
  module_code: 'CORE',
  domain_code: '',
  table_category: 'MASTER',
  use_strategy: 'DIRECT',
  mapping_status: 'DISCOVERED',
  canonical_view_name: '',
  canonical_service_name: '',
  canonical_admin_route: '',
  is_master_table: false,
  is_transaction_table: false,
  is_reference_table: false,
  is_security_table: false,
  is_read_only: false,
  contains_pii: false,
  contains_financial_data: false,
  contains_health_data: false,
  legacy_primary_key: '',
  modern_primary_key: '',
  source_system: 'POWERBUILDER',
  description: '',
  notes: '',
  is_active: true,
};

const CATEGORIES = ['MASTER','REFERENCE','TRANSACTION','CONFIGURATION','SECURITY','AUDIT','WORKFLOW','DOCUMENT','NOTIFICATION','MIGRATION','REPORTING','LOOKUP','JUNCTION','ARCHIVE','OTHER'];

export default function LegacyMappingAdmin() {
  const [filters, setFilters] = useState<LegacyMappingFilters>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LegacyTableMap | null>(null);
  const [form, setForm] = useState<LegacyTableMapFormValues>(EMPTY_FORM);

  const { data: entries = [], isLoading } = useLegacyTableMaps(filters);
  const { data: eligible = [] } = useEligibleLegacyTablesFromTableRegistry();
  const createMut = useCreateLegacyTableMap();
  const updateMut = useUpdateLegacyTableMap();
  const deactivateMut = useDeactivateLegacyTableMap();
  const reactivateMut = useReactivateLegacyTableMap();

  const summary = useMemo(() => {
    const s = {
      total: entries.length,
      master: 0, transaction: 0, reference: 0, security: 0,
      mapped: 0, approved: 0, pii: 0, missingService: 0, missingModern: 0,
    };
    for (const e of entries) {
      if (e.is_master_table) s.master++;
      if (e.is_transaction_table) s.transaction++;
      if (e.is_reference_table) s.reference++;
      if (e.is_security_table) s.security++;
      if (['MAPPED','REVIEWED','APPROVED'].includes(e.mapping_status)) s.mapped++;
      if (e.mapping_status === 'APPROVED') s.approved++;
      if (e.contains_pii) s.pii++;
      if (!e.canonical_service_name) s.missingService++;
      if (!e.modern_table_name) s.missingModern++;
    }
    return s;
  }, [entries]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(e: LegacyTableMap) {
    setEditing(e);
    setForm({
      table_registry_id: e.table_registry_id,
      legacy_schema_name: e.legacy_schema_name,
      legacy_table_name: e.legacy_table_name,
      modern_table_name: e.modern_table_name ?? '',
      modern_entity_name: e.modern_entity_name,
      modern_alias: e.modern_alias ?? '',
      module_code: e.module_code,
      domain_code: e.domain_code,
      table_category: e.table_category,
      use_strategy: e.use_strategy,
      mapping_status: e.mapping_status,
      canonical_view_name: e.canonical_view_name ?? '',
      canonical_service_name: e.canonical_service_name ?? '',
      canonical_admin_route: e.canonical_admin_route ?? '',
      is_master_table: e.is_master_table,
      is_transaction_table: e.is_transaction_table,
      is_reference_table: e.is_reference_table,
      is_security_table: e.is_security_table,
      is_read_only: e.is_read_only,
      contains_pii: e.contains_pii,
      contains_financial_data: e.contains_financial_data,
      contains_health_data: e.contains_health_data,
      legacy_primary_key: e.legacy_primary_key ?? '',
      modern_primary_key: e.modern_primary_key ?? '',
      source_system: e.source_system ?? 'POWERBUILDER',
      description: e.description ?? '',
      notes: e.notes ?? '',
      is_active: e.is_active,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    const payload = normalize(form);
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, payload });
        toast.success('Legacy mapping updated');
      } else {
        await createMut.mutateAsync(payload);
        toast.success('Legacy mapping created');
      }
      setDialogOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Save failed');
    }
  }

  async function handleApprove(e: LegacyTableMap) {
    // TODO: gate behind core.admin.legacy_mapping.approve once RBAC is enforced
    try {
      await updateMut.mutateAsync({ id: e.id, payload: { mapping_status: 'APPROVED' } });
      toast.success('Mapping approved');
    } catch (err: any) {
      toast.error(err?.message ?? 'Approve failed');
    }
  }

  async function handleToggle(e: LegacyTableMap) {
    try {
      if (e.is_active) await deactivateMut.mutateAsync(e.id);
      else await reactivateMut.mutateAsync(e.id);
      toast.success(e.is_active ? 'Deactivated' : 'Reactivated');
    } catch (err: any) {
      toast.error(err?.message ?? 'Action failed');
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Legacy Mapping"
        subtitle="Map old PowerBuilder and legacy database tables to modern platform names, services, and entities."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Administration', href: '/admin/platform' },
          { label: 'Legacy Mapping' },
        ]}
      />

      <div className="grid gap-3 grid-cols-2 md:grid-cols-5 lg:grid-cols-10">
        <SummaryCard label="Total" value={summary.total} />
        <SummaryCard label="Master" value={summary.master} tone="info" />
        <SummaryCard label="Transaction" value={summary.transaction} />
        <SummaryCard label="Reference" value={summary.reference} />
        <SummaryCard label="Security" value={summary.security} />
        <SummaryCard label="Mapped" value={summary.mapped} tone="success" />
        <SummaryCard label="Approved" value={summary.approved} tone="success" />
        <SummaryCard label="With PII" value={summary.pii} tone="destructive" />
        <SummaryCard label="Missing Service" value={summary.missingService} tone="warning" />
        <SummaryCard label="Missing Modern Name" value={summary.missingModern} tone="warning" />
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <Label className="text-xs">Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Legacy table, modern entity or alias"
                value={filters.search ?? ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Domain</Label>
            <Input value={filters.domain_code ?? ''} onChange={(e) => setFilters({ ...filters, domain_code: e.target.value || undefined })} placeholder="e.g. ORGANISATION" />
          </div>
          <div>
            <Label className="text-xs">Module</Label>
            <Input value={filters.module_code ?? ''} onChange={(e) => setFilters({ ...filters, module_code: e.target.value || undefined })} placeholder="e.g. CORE" />
          </div>
          <div>
            <Label className="text-xs">Category</Label>
            <Input value={filters.table_category ?? ''} onChange={(e) => setFilters({ ...filters, table_category: e.target.value || undefined })} placeholder="e.g. MASTER" />
          </div>
          <div>
            <Label className="text-xs">Strategy</Label>
            <Select value={filters.use_strategy ?? 'all'} onValueChange={(v) => setFilters({ ...filters, use_strategy: v === 'all' ? undefined : (v as LegacyUseStrategy) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {LEGACY_USE_STRATEGIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={filters.mapping_status ?? 'all'} onValueChange={(v) => setFilters({ ...filters, mapping_status: v === 'all' ? undefined : (v as LegacyMappingStatus) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {LEGACY_MAPPING_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {[
            ['Master','is_master_table'],
            ['Transaction','is_transaction_table'],
            ['Reference','is_reference_table'],
            ['Security','is_security_table'],
            ['Contains PII','contains_pii'],
            ['Read-only','is_read_only'],
            ['Active only','is_active'],
            ['Missing service','missing_canonical_service'],
            ['Missing modern name','missing_modern_table'],
          ].map(([label,key]) => (
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
          <CardTitle className="text-base">Legacy Table Mappings</CardTitle>
          <Button size="sm" onClick={openCreate}><Plus className="mr-1 h-4 w-4" /> New Mapping</Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Legacy Table</TableHead>
                <TableHead>Modern Entity</TableHead>
                <TableHead>Modern Table</TableHead>
                <TableHead>Modern Alias</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Strategy</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Master</TableHead>
                <TableHead>PII</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Admin Route</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={15} className="text-center text-muted-foreground py-6">Loading…</TableCell></TableRow>
              ) : entries.length === 0 ? (
                <TableRow><TableCell colSpan={15} className="text-center text-muted-foreground py-6">No mappings match the current filters.</TableCell></TableRow>
              ) : entries.map((e) => (
                <TableRow key={e.id} className={cn(!e.is_active && 'opacity-60')}>
                  <TableCell className="font-mono text-xs">{e.legacy_table_name}</TableCell>
                  <TableCell>{e.modern_entity_name}</TableCell>
                  <TableCell className="font-mono text-xs">{e.modern_table_name ?? '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{e.modern_alias ?? '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.domain_code}</TableCell>
                  <TableCell className="text-xs">{e.module_code}</TableCell>
                  <TableCell className="text-xs">{e.table_category}</TableCell>
                  <TableCell><Badge className={STRATEGY_BADGE[e.use_strategy]}>{e.use_strategy}</Badge></TableCell>
                  <TableCell><Badge className={STATUS_BADGE[e.mapping_status]}>{e.mapping_status}</Badge></TableCell>
                  <TableCell>{e.is_master_table ? 'Yes' : 'No'}</TableCell>
                  <TableCell>{e.contains_pii ? 'Yes' : 'No'}</TableCell>
                  <TableCell className="text-xs">{e.canonical_service_name ?? '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{e.canonical_admin_route ?? '—'}</TableCell>
                  <TableCell>{e.is_active ? 'Yes' : 'No'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link to={`/admin/legacy-mapping/${e.id}`}>
                        <Button size="icon" variant="ghost" title="Open detail"><ExternalLink className="h-4 w-4" /></Button>
                      </Link>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                      {e.mapping_status !== 'APPROVED' && (
                        <Button size="icon" variant="ghost" onClick={() => handleApprove(e)} title="Approve">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => handleToggle(e)} title={e.is_active ? 'Deactivate' : 'Reactivate'}>
                        {e.is_active ? <PowerOff className="h-4 w-4 text-destructive" /> : <Power className="h-4 w-4 text-success" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Legacy Mapping' : 'New Legacy Mapping'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Table Registry Entry">
              <Select value={form.table_registry_id ?? 'none'} onValueChange={(v) => {
                const chosen = v === 'none' ? null : v;
                const src = eligible.find((x) => x.id === chosen);
                setForm({
                  ...form,
                  table_registry_id: chosen,
                  legacy_table_name: src?.legacy_table_name ?? src?.table_name ?? form.legacy_table_name,
                  modern_alias: src?.modern_alias ?? form.modern_alias,
                  domain_code: src?.domain_code ?? form.domain_code,
                  module_code: src?.module_code ?? form.module_code,
                  table_category: src?.table_category ?? form.table_category,
                  canonical_service_name: src?.canonical_service ?? form.canonical_service_name,
                  canonical_admin_route: src?.canonical_admin_route ?? form.canonical_admin_route,
                });
              }}>
                <SelectTrigger><SelectValue placeholder="(optional) link to registry" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {eligible.map((x) => (
                    <SelectItem key={x.id} value={x.id}>{x.table_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Legacy Schema *">
              <Input value={form.legacy_schema_name} onChange={(e) => setForm({ ...form, legacy_schema_name: e.target.value })} />
            </Field>
            <Field label="Legacy Table Name *">
              <Input value={form.legacy_table_name} onChange={(e) => setForm({ ...form, legacy_table_name: e.target.value })} />
            </Field>
            <Field label="Modern Table Name">
              <Input value={form.modern_table_name ?? ''} onChange={(e) => setForm({ ...form, modern_table_name: e.target.value })} />
            </Field>
            <Field label="Modern Entity Name *">
              <Input value={form.modern_entity_name} onChange={(e) => setForm({ ...form, modern_entity_name: e.target.value })} />
            </Field>
            <Field label="Modern Alias">
              <Input value={form.modern_alias ?? ''} onChange={(e) => setForm({ ...form, modern_alias: e.target.value })} />
            </Field>
            <Field label="Module Code *">
              <Input value={form.module_code} onChange={(e) => setForm({ ...form, module_code: e.target.value })} />
            </Field>
            <Field label="Domain Code *">
              <Input value={form.domain_code} onChange={(e) => setForm({ ...form, domain_code: e.target.value })} />
            </Field>
            <Field label="Category *">
              <Select value={form.table_category} onValueChange={(v) => setForm({ ...form, table_category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Use Strategy *">
              <Select value={form.use_strategy} onValueChange={(v) => setForm({ ...form, use_strategy: v as LegacyUseStrategy })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LEGACY_USE_STRATEGIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Mapping Status *">
              <Select value={form.mapping_status} onValueChange={(v) => setForm({ ...form, mapping_status: v as LegacyMappingStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LEGACY_MAPPING_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Canonical View Name">
              <Input value={form.canonical_view_name ?? ''} onChange={(e) => setForm({ ...form, canonical_view_name: e.target.value })} />
            </Field>
            <Field label="Canonical Service Name">
              <Input value={form.canonical_service_name ?? ''} onChange={(e) => setForm({ ...form, canonical_service_name: e.target.value })} />
            </Field>
            <Field label="Canonical Admin Route">
              <Input value={form.canonical_admin_route ?? ''} onChange={(e) => setForm({ ...form, canonical_admin_route: e.target.value })} placeholder="/admin/..." />
            </Field>
            <Field label="Legacy Primary Key">
              <Input value={form.legacy_primary_key ?? ''} onChange={(e) => setForm({ ...form, legacy_primary_key: e.target.value })} />
            </Field>
            <Field label="Modern Primary Key">
              <Input value={form.modern_primary_key ?? ''} onChange={(e) => setForm({ ...form, modern_primary_key: e.target.value })} />
            </Field>
            <Field label="Source System">
              <Input value={form.source_system ?? ''} onChange={(e) => setForm({ ...form, source_system: e.target.value })} />
            </Field>
            {[
              ['Is master table','is_master_table'],
              ['Is transaction table','is_transaction_table'],
              ['Is reference table','is_reference_table'],
              ['Is security table','is_security_table'],
              ['Read-only','is_read_only'],
              ['Contains PII','contains_pii'],
              ['Contains financial','contains_financial_data'],
              ['Contains health','contains_health_data'],
              ['Active','is_active'],
            ].map(([label,key]) => (
              <div key={key} className="flex items-center gap-2 mt-6">
                <Switch checked={(form as any)[key]} onCheckedChange={(v) => setForm({ ...form, [key]: v } as any)} />
                <Label className="text-xs">{label}</Label>
              </div>
            ))}
            <div className="md:col-span-2">
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description ?? ''} rows={2} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes ?? ''} rows={2} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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

function normalize(f: LegacyTableMapFormValues): LegacyTableMapFormValues {
  const nul = (s?: string | null) => (s?.trim() ? s : null);
  return {
    ...f,
    modern_table_name: nul(f.modern_table_name),
    modern_alias: nul(f.modern_alias),
    canonical_view_name: nul(f.canonical_view_name),
    canonical_service_name: nul(f.canonical_service_name),
    canonical_admin_route: nul(f.canonical_admin_route),
    legacy_primary_key: nul(f.legacy_primary_key),
    modern_primary_key: nul(f.modern_primary_key),
    source_system: nul(f.source_system),
    description: nul(f.description),
    notes: nul(f.notes),
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div><Label className="text-xs">{label}</Label>{children}</div>);
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', className)}>{children}</span>;
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone?: 'success' | 'warning' | 'info' | 'destructive' | 'primary' }) {
  const t = tone === 'success' ? 'text-success'
    : tone === 'warning' ? 'text-warning'
    : tone === 'info' ? 'text-info'
    : tone === 'destructive' ? 'text-destructive'
    : tone === 'primary' ? 'text-primary'
    : 'text-foreground';
  return (
    <Card><CardContent className="p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('text-2xl font-semibold', t)}>{value}</div>
    </CardContent></Card>
  );
}
