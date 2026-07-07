import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeft, ClipboardCopy, Pencil, Plus, PowerOff } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  useCreateLegacyColumnMap,
  useCreateLegacyRelationshipMap,
  useCreateLegacyValueMap,
  useDeactivateLegacyColumnMap,
  useDeactivateLegacyRelationshipMap,
  useDeactivateLegacyValueMap,
  useLegacyColumnMaps,
  useLegacyRelationshipMaps,
  useLegacyTableMap,
  useLegacyValueMaps,
  useUpdateLegacyColumnMap,
  useUpdateLegacyRelationshipMap,
  useUpdateLegacyValueMap,
  useUpdateLegacyTableMap,
} from '@/platform/legacy-mapping/useLegacyMapping';
import {
  LEGACY_MAPPING_STATUSES,
  LEGACY_PII_CLASSIFICATIONS,
  LEGACY_RELATIONSHIP_TYPES,
  LEGACY_USE_STRATEGIES,
  legacyTableMapWarnings,
  suggestCompatibility,
  type LegacyColumnMap,
  type LegacyColumnMapFormValues,
  type LegacyMappingStatus,
  type LegacyPiiClassification,
  type LegacyRelationshipMap,
  type LegacyRelationshipMapFormValues,
  type LegacyRelationshipType,
  type LegacyUseStrategy,
  type LegacyValueMap,
  type LegacyValueMapFormValues,
} from '@/platform/legacy-mapping/legacyMappingTypes';

export default function LegacyMappingDetailAdmin() {
  const { tableMapId = '' } = useParams();
  const { data: tableMap, isLoading } = useLegacyTableMap(tableMapId);
  const { data: columns = [] } = useLegacyColumnMaps(tableMapId);
  const { data: relationships = [] } = useLegacyRelationshipMaps(tableMapId);

  const piiColumnCount = useMemo(() => columns.filter((c) => c.is_pii).length, [columns]);
  const warnings = useMemo(
    () => (tableMap ? legacyTableMapWarnings(tableMap, columns.length, piiColumnCount) : []),
    [tableMap, columns.length, piiColumnCount],
  );

  if (isLoading) return <div className="p-6">Loading…</div>;
  if (!tableMap) return <div className="p-6">Mapping not found.</div>;

  return (
    <div className="container mx-auto py-6 space-y-4">
      <PageHeader
        title={`${tableMap.legacy_table_name} → ${tableMap.modern_entity_name}`}
        subtitle={`${tableMap.use_strategy} · ${tableMap.mapping_status} · ${tableMap.domain_code} · ${tableMap.module_code}`}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Administration', href: '/admin/platform' },
          { label: 'Legacy Mapping', href: '/admin/legacy-mapping' },
          { label: tableMap.legacy_table_name },
        ]}
      />

      <div>
        <Link to="/admin/legacy-mapping">
          <Button variant="ghost" size="sm"><ArrowLeft className="mr-1 h-4 w-4" /> Back to Legacy Mapping</Button>
        </Link>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="columns">Columns ({columns.length})</TabsTrigger>
          <TabsTrigger value="values">Value Mapping</TabsTrigger>
          <TabsTrigger value="relationships">Relationships ({relationships.length})</TabsTrigger>
          <TabsTrigger value="compatibility">Compatibility</TabsTrigger>
          <TabsTrigger value="quality">Data Quality</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab tableMap={tableMap} warnings={warnings} />
        </TabsContent>
        <TabsContent value="columns">
          <ColumnsTab tableMapId={tableMap.id} columns={columns} />
        </TabsContent>
        <TabsContent value="values">
          <ValueMappingTab tableMapId={tableMap.id} columns={columns} />
        </TabsContent>
        <TabsContent value="relationships">
          <RelationshipsTab tableMapId={tableMap.id} relationships={relationships} />
        </TabsContent>
        <TabsContent value="compatibility">
          <CompatibilityTab tableMap={tableMap} />
        </TabsContent>
        <TabsContent value="quality">
          <Card><CardContent className="p-6 text-sm text-muted-foreground">
            Data Quality checks will be implemented in the PowerBuilder Migration epic.
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="audit">
          <Card><CardContent className="p-6 text-sm text-muted-foreground">
            Audit history will surface here once the consolidated audit log is unified in a later epic. Changes are already recorded via the existing audit mechanism.
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Overview ---------------- */
function OverviewTab({ tableMap, warnings }: { tableMap: any; warnings: string[] }) {
  const updateMut = useUpdateLegacyTableMap();
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<LegacyMappingStatus>(tableMap.mapping_status);
  const [strategy, setStrategy] = useState<LegacyUseStrategy>(tableMap.use_strategy);

  async function saveQuick() {
    try {
      await updateMut.mutateAsync({ id: tableMap.id, payload: { mapping_status: status, use_strategy: strategy } });
      toast.success('Updated');
      setEditing(false);
    } catch (e: any) { toast.error(e?.message ?? 'Save failed'); }
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Overview</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setEditing((v) => !v)}>
            <Pencil className="mr-1 h-4 w-4" />{editing ? 'Close' : 'Quick Edit'}
          </Button>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2 text-sm">
          <Row label="Legacy schema" value={tableMap.legacy_schema_name} />
          <Row label="Legacy table" value={tableMap.legacy_table_name} mono />
          <Row label="Modern entity" value={tableMap.modern_entity_name} />
          <Row label="Modern table" value={tableMap.modern_table_name ?? '—'} mono />
          <Row label="Modern alias" value={tableMap.modern_alias ?? '—'} mono />
          <Row label="Module" value={tableMap.module_code} />
          <Row label="Domain" value={tableMap.domain_code} />
          <Row label="Category" value={tableMap.table_category} />
          <Row label="Use strategy" value={tableMap.use_strategy} />
          <Row label="Mapping status" value={tableMap.mapping_status} />
          <Row label="Canonical view" value={tableMap.canonical_view_name ?? '—'} />
          <Row label="Canonical service" value={tableMap.canonical_service_name ?? '—'} />
          <Row label="Canonical admin route" value={tableMap.canonical_admin_route ?? '—'} mono />
          <Row label="Source system" value={tableMap.source_system ?? '—'} />
          <Row label="Legacy PK" value={tableMap.legacy_primary_key ?? '—'} />
          <Row label="Modern PK" value={tableMap.modern_primary_key ?? '—'} />
          <Row label="Master" value={tableMap.is_master_table ? 'Yes' : 'No'} />
          <Row label="Transaction" value={tableMap.is_transaction_table ? 'Yes' : 'No'} />
          <Row label="Reference" value={tableMap.is_reference_table ? 'Yes' : 'No'} />
          <Row label="Security" value={tableMap.is_security_table ? 'Yes' : 'No'} />
          <Row label="Read-only" value={tableMap.is_read_only ? 'Yes' : 'No'} />
          <Row label="Contains PII" value={tableMap.contains_pii ? 'Yes' : 'No'} />
          <Row label="Contains financial" value={tableMap.contains_financial_data ? 'Yes' : 'No'} />
          <Row label="Contains health" value={tableMap.contains_health_data ? 'Yes' : 'No'} />
          {editing && (
            <div className="md:col-span-2 grid gap-2 md:grid-cols-2 rounded-md border p-3">
              <div>
                <Label className="text-xs">Use Strategy</Label>
                <Select value={strategy} onValueChange={(v) => setStrategy(v as LegacyUseStrategy)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LEGACY_USE_STRATEGIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Mapping Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as LegacyMappingStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LEGACY_MAPPING_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button size="sm" onClick={saveQuick} disabled={updateMut.isPending}>Save</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> Warnings</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          {warnings.length === 0
            ? <p className="text-muted-foreground">No warnings — this mapping looks healthy.</p>
            : <ul className="list-disc pl-5 space-y-1">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string | number | null | undefined; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 border-b py-1.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className={cn('text-sm', mono && 'font-mono')}>{String(value ?? '—')}</span>
    </div>
  );
}

/* ---------------- Columns ---------------- */
const EMPTY_COL = (tableMapId: string): LegacyColumnMapFormValues => ({
  table_map_id: tableMapId,
  legacy_column_name: '',
  modern_field_name: '',
  legacy_data_type: '',
  modern_data_type: '',
  legacy_nullable: null,
  modern_required: false,
  is_primary_key: false,
  is_foreign_key: false,
  referenced_legacy_table: '',
  referenced_legacy_column: '',
  is_pii: false,
  pii_classification: null,
  contains_financial_data: false,
  contains_health_data: false,
  transformation_rule: '',
  validation_rule: '',
  default_value: '',
  display_label: '',
  help_text: '',
  mapping_status: 'DISCOVERED',
  sort_order: 100,
  notes: '',
  is_active: true,
});

function ColumnsTab({ tableMapId, columns }: { tableMapId: string; columns: LegacyColumnMap[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LegacyColumnMap | null>(null);
  const [form, setForm] = useState<LegacyColumnMapFormValues>(EMPTY_COL(tableMapId));
  const createMut = useCreateLegacyColumnMap();
  const updateMut = useUpdateLegacyColumnMap();
  const deactivateMut = useDeactivateLegacyColumnMap();

  function openNew() { setEditing(null); setForm(EMPTY_COL(tableMapId)); setOpen(true); }
  function openEdit(c: LegacyColumnMap) {
    setEditing(c);
    setForm({ ...c, table_map_id: tableMapId } as LegacyColumnMapFormValues);
    setOpen(true);
  }
  async function save() {
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, payload: form });
        toast.success('Column updated');
      } else {
        await createMut.mutateAsync(form);
        toast.success('Column created');
      }
      setOpen(false);
    } catch (e: any) { toast.error(e?.message ?? 'Save failed'); }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Columns</CardTitle>
        <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" /> New Column</Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Legacy Column</TableHead>
              <TableHead>Modern Field</TableHead>
              <TableHead>Legacy Type</TableHead>
              <TableHead>Modern Type</TableHead>
              <TableHead>PK</TableHead>
              <TableHead>FK</TableHead>
              <TableHead>PII</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Req</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {columns.length === 0 ? (
              <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-6">No columns mapped yet.</TableCell></TableRow>
            ) : columns.map((c) => (
              <TableRow key={c.id} className={cn(!c.is_active && 'opacity-60')}>
                <TableCell className="font-mono text-xs">{c.legacy_column_name}</TableCell>
                <TableCell className="font-mono text-xs">{c.modern_field_name}</TableCell>
                <TableCell className="text-xs">{c.legacy_data_type ?? '—'}</TableCell>
                <TableCell className="text-xs">{c.modern_data_type ?? '—'}</TableCell>
                <TableCell>{c.is_primary_key ? '✓' : ''}</TableCell>
                <TableCell>{c.is_foreign_key ? '✓' : ''}</TableCell>
                <TableCell>{c.is_pii ? '✓' : ''}</TableCell>
                <TableCell className="text-xs">{c.pii_classification ?? '—'}</TableCell>
                <TableCell>{c.modern_required ? '✓' : ''}</TableCell>
                <TableCell className="text-xs">{c.mapping_status}</TableCell>
                <TableCell>{c.is_active ? 'Yes' : 'No'}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => deactivateMut.mutate({ id: c.id, tableMapId })}>
                    <PowerOff className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Column Mapping' : 'New Column Mapping'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Legacy Column Name *"><Input value={form.legacy_column_name} onChange={(e) => setForm({ ...form, legacy_column_name: e.target.value })} /></Field>
            <Field label="Modern Field Name *"><Input value={form.modern_field_name} onChange={(e) => setForm({ ...form, modern_field_name: e.target.value })} /></Field>
            <Field label="Legacy Data Type"><Input value={form.legacy_data_type ?? ''} onChange={(e) => setForm({ ...form, legacy_data_type: e.target.value })} /></Field>
            <Field label="Modern Data Type"><Input value={form.modern_data_type ?? ''} onChange={(e) => setForm({ ...form, modern_data_type: e.target.value })} /></Field>
            <Field label="Referenced Legacy Table"><Input value={form.referenced_legacy_table ?? ''} onChange={(e) => setForm({ ...form, referenced_legacy_table: e.target.value })} /></Field>
            <Field label="Referenced Legacy Column"><Input value={form.referenced_legacy_column ?? ''} onChange={(e) => setForm({ ...form, referenced_legacy_column: e.target.value })} /></Field>
            <Field label="PII Classification">
              <Select value={form.pii_classification ?? 'none'} onValueChange={(v) => setForm({ ...form, pii_classification: v === 'none' ? null : (v as LegacyPiiClassification) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {LEGACY_PII_CLASSIFICATIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Mapping Status">
              <Select value={form.mapping_status} onValueChange={(v) => setForm({ ...form, mapping_status: v as LegacyMappingStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LEGACY_MAPPING_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Sort Order"><Input type="number" value={form.sort_order ?? 100} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value || '100') })} /></Field>
            <Field label="Default Value"><Input value={form.default_value ?? ''} onChange={(e) => setForm({ ...form, default_value: e.target.value })} /></Field>
            <Field label="Display Label"><Input value={form.display_label ?? ''} onChange={(e) => setForm({ ...form, display_label: e.target.value })} /></Field>
            <Field label="Help Text"><Input value={form.help_text ?? ''} onChange={(e) => setForm({ ...form, help_text: e.target.value })} /></Field>
            {[
              ['Legacy nullable','legacy_nullable'],
              ['Modern required','modern_required'],
              ['Primary key','is_primary_key'],
              ['Foreign key','is_foreign_key'],
              ['PII','is_pii'],
              ['Financial data','contains_financial_data'],
              ['Health data','contains_health_data'],
              ['Active','is_active'],
            ].map(([label,key]) => (
              <div key={key} className="flex items-center gap-2 mt-6">
                <Switch checked={!!(form as any)[key]} onCheckedChange={(v) => setForm({ ...form, [key]: v } as any)} />
                <Label className="text-xs">{label}</Label>
              </div>
            ))}
            <div className="md:col-span-2">
              <Label className="text-xs">Transformation Rule</Label>
              <Textarea rows={2} value={form.transformation_rule ?? ''} onChange={(e) => setForm({ ...form, transformation_rule: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Validation Rule</Label>
              <Textarea rows={2} value={form.validation_rule ?? ''} onChange={(e) => setForm({ ...form, validation_rule: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Notes</Label>
              <Textarea rows={2} value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={createMut.isPending || updateMut.isPending}>{editing ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ---------------- Values ---------------- */
const EMPTY_VAL = (tableMapId: string): LegacyValueMapFormValues => ({
  table_map_id: tableMapId,
  column_map_id: null,
  legacy_code: '',
  legacy_label: '',
  legacy_description: '',
  modern_code: '',
  modern_label: '',
  modern_description: '',
  reference_group_code: '',
  mapping_status: 'MAPPED',
  is_default: false,
  is_active: true,
  effective_from: null,
  effective_to: null,
  notes: '',
});

function ValueMappingTab({ tableMapId, columns }: { tableMapId: string; columns: LegacyColumnMap[] }) {
  const [colFilter, setColFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeOnly, setActiveOnly] = useState(false);
  const [search, setSearch] = useState('');

  const { data: values = [] } = useLegacyValueMaps(tableMapId, colFilter === 'all' ? undefined : colFilter);

  const filtered = useMemo(() => values.filter((v) => {
    if (statusFilter !== 'all' && v.mapping_status !== statusFilter) return false;
    if (activeOnly && !v.is_active) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!v.legacy_code.toLowerCase().includes(s) && !v.modern_code.toLowerCase().includes(s)) return false;
    }
    return true;
  }), [values, statusFilter, activeOnly, search]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LegacyValueMap | null>(null);
  const [form, setForm] = useState<LegacyValueMapFormValues>(EMPTY_VAL(tableMapId));
  const createMut = useCreateLegacyValueMap();
  const updateMut = useUpdateLegacyValueMap();
  const deactivateMut = useDeactivateLegacyValueMap();

  function openNew() { setEditing(null); setForm(EMPTY_VAL(tableMapId)); setOpen(true); }
  function openEdit(v: LegacyValueMap) {
    setEditing(v);
    setForm({ ...v, table_map_id: tableMapId } as LegacyValueMapFormValues);
    setOpen(true);
  }
  async function save() {
    try {
      if (editing) await updateMut.mutateAsync({ id: editing.id, payload: form });
      else await createMut.mutateAsync(form);
      toast.success(editing ? 'Value updated' : 'Value created');
      setOpen(false);
    } catch (e: any) { toast.error(e?.message ?? 'Save failed'); }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle className="text-base">Value Mapping</CardTitle>
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <Label className="text-xs">Column</Label>
            <Select value={colFilter} onValueChange={setColFilter}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All columns</SelectItem>
                {columns.map((c) => <SelectItem key={c.id} value={c.id}>{c.legacy_column_name} → {c.modern_field_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {LEGACY_MAPPING_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Search</Label>
            <Input className="w-48" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Legacy or modern code" />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={activeOnly} onCheckedChange={setActiveOnly} />
            <Label className="text-xs">Active only</Label>
          </div>
          <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" /> New Value</Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Legacy Code</TableHead>
              <TableHead>Legacy Label</TableHead>
              <TableHead>Modern Code</TableHead>
              <TableHead>Modern Label</TableHead>
              <TableHead>Reference Group</TableHead>
              <TableHead>Default</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Effective From</TableHead>
              <TableHead>Effective To</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-6">No value mappings.</TableCell></TableRow>
            ) : filtered.map((v) => (
              <TableRow key={v.id} className={cn(!v.is_active && 'opacity-60')}>
                <TableCell className="font-mono text-xs">{v.legacy_code}</TableCell>
                <TableCell className="text-xs">{v.legacy_label ?? '—'}</TableCell>
                <TableCell className="font-mono text-xs">{v.modern_code}</TableCell>
                <TableCell className="text-xs">{v.modern_label}</TableCell>
                <TableCell className="text-xs">{v.reference_group_code ?? '—'}</TableCell>
                <TableCell>{v.is_default ? '✓' : ''}</TableCell>
                <TableCell className="text-xs">{v.mapping_status}</TableCell>
                <TableCell className="text-xs">{v.effective_from ?? '—'}</TableCell>
                <TableCell className="text-xs">{v.effective_to ?? '—'}</TableCell>
                <TableCell>{v.is_active ? 'Yes' : 'No'}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(v)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => deactivateMut.mutate({ id: v.id, tableMapId })}>
                    <PowerOff className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Value Mapping' : 'New Value Mapping'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Column">
              <Select value={form.column_map_id ?? 'none'} onValueChange={(v) => setForm({ ...form, column_map_id: v === 'none' ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Table-level —</SelectItem>
                  {columns.map((c) => <SelectItem key={c.id} value={c.id}>{c.legacy_column_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Mapping Status">
              <Select value={form.mapping_status} onValueChange={(v) => setForm({ ...form, mapping_status: v as LegacyMappingStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LEGACY_MAPPING_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Legacy Code *"><Input value={form.legacy_code} onChange={(e) => setForm({ ...form, legacy_code: e.target.value })} /></Field>
            <Field label="Legacy Label"><Input value={form.legacy_label ?? ''} onChange={(e) => setForm({ ...form, legacy_label: e.target.value })} /></Field>
            <Field label="Modern Code *"><Input value={form.modern_code} onChange={(e) => setForm({ ...form, modern_code: e.target.value })} /></Field>
            <Field label="Modern Label *"><Input value={form.modern_label} onChange={(e) => setForm({ ...form, modern_label: e.target.value })} /></Field>
            <Field label="Reference Group Code"><Input value={form.reference_group_code ?? ''} onChange={(e) => setForm({ ...form, reference_group_code: e.target.value })} /></Field>
            <Field label="Effective From"><Input type="date" value={form.effective_from ?? ''} onChange={(e) => setForm({ ...form, effective_from: e.target.value || null })} /></Field>
            <Field label="Effective To"><Input type="date" value={form.effective_to ?? ''} onChange={(e) => setForm({ ...form, effective_to: e.target.value || null })} /></Field>
            <div className="flex items-center gap-2 mt-6"><Switch checked={form.is_default} onCheckedChange={(v) => setForm({ ...form, is_default: v })} /><Label className="text-xs">Default</Label></div>
            <div className="flex items-center gap-2 mt-6"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label className="text-xs">Active</Label></div>
            <div className="md:col-span-2"><Label className="text-xs">Legacy Description</Label><Textarea rows={2} value={form.legacy_description ?? ''} onChange={(e) => setForm({ ...form, legacy_description: e.target.value })} /></div>
            <div className="md:col-span-2"><Label className="text-xs">Modern Description</Label><Textarea rows={2} value={form.modern_description ?? ''} onChange={(e) => setForm({ ...form, modern_description: e.target.value })} /></div>
            <div className="md:col-span-2"><Label className="text-xs">Notes</Label><Textarea rows={2} value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={createMut.isPending || updateMut.isPending}>{editing ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ---------------- Relationships ---------------- */
const EMPTY_REL = (tableMapId: string): LegacyRelationshipMapFormValues => ({
  source_table_map_id: tableMapId,
  target_table_map_id: null,
  relationship_name: '',
  source_legacy_column: '',
  target_legacy_table: '',
  target_legacy_column: '',
  modern_relationship_name: '',
  relationship_type: 'MANY_TO_ONE',
  is_enforced_in_legacy: false,
  is_required: false,
  mapping_status: 'DISCOVERED',
  notes: '',
  is_active: true,
});

function RelationshipsTab({ tableMapId, relationships }: { tableMapId: string; relationships: LegacyRelationshipMap[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LegacyRelationshipMap | null>(null);
  const [form, setForm] = useState<LegacyRelationshipMapFormValues>(EMPTY_REL(tableMapId));
  const createMut = useCreateLegacyRelationshipMap();
  const updateMut = useUpdateLegacyRelationshipMap();
  const deactivateMut = useDeactivateLegacyRelationshipMap();

  function openNew() { setEditing(null); setForm(EMPTY_REL(tableMapId)); setOpen(true); }
  function openEdit(r: LegacyRelationshipMap) {
    setEditing(r);
    setForm({ ...r, source_table_map_id: tableMapId } as LegacyRelationshipMapFormValues);
    setOpen(true);
  }
  async function save() {
    try {
      if (editing) await updateMut.mutateAsync({ id: editing.id, payload: form });
      else await createMut.mutateAsync(form);
      toast.success(editing ? 'Relationship updated' : 'Relationship created');
      setOpen(false);
    } catch (e: any) { toast.error(e?.message ?? 'Save failed'); }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Relationships</CardTitle>
        <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" /> New Relationship</Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Relationship</TableHead>
              <TableHead>Source Column</TableHead>
              <TableHead>Target Table</TableHead>
              <TableHead>Target Column</TableHead>
              <TableHead>Modern Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Required</TableHead>
              <TableHead>Enforced</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {relationships.length === 0 ? (
              <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-6">No relationships mapped yet.</TableCell></TableRow>
            ) : relationships.map((r) => (
              <TableRow key={r.id} className={cn(!r.is_active && 'opacity-60')}>
                <TableCell>{r.relationship_name}</TableCell>
                <TableCell className="font-mono text-xs">{r.source_legacy_column}</TableCell>
                <TableCell className="font-mono text-xs">{r.target_legacy_table}</TableCell>
                <TableCell className="font-mono text-xs">{r.target_legacy_column}</TableCell>
                <TableCell>{r.modern_relationship_name ?? '—'}</TableCell>
                <TableCell className="text-xs">{r.relationship_type}</TableCell>
                <TableCell>{r.is_required ? '✓' : ''}</TableCell>
                <TableCell>{r.is_enforced_in_legacy ? '✓' : ''}</TableCell>
                <TableCell className="text-xs">{r.mapping_status}</TableCell>
                <TableCell>{r.is_active ? 'Yes' : 'No'}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => deactivateMut.mutate({ id: r.id, tableMapId })}>
                    <PowerOff className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Relationship' : 'New Relationship'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Relationship Name *"><Input value={form.relationship_name} onChange={(e) => setForm({ ...form, relationship_name: e.target.value })} /></Field>
            <Field label="Modern Relationship Name"><Input value={form.modern_relationship_name ?? ''} onChange={(e) => setForm({ ...form, modern_relationship_name: e.target.value })} /></Field>
            <Field label="Source Legacy Column *"><Input value={form.source_legacy_column} onChange={(e) => setForm({ ...form, source_legacy_column: e.target.value })} /></Field>
            <Field label="Target Legacy Table *"><Input value={form.target_legacy_table} onChange={(e) => setForm({ ...form, target_legacy_table: e.target.value })} /></Field>
            <Field label="Target Legacy Column *"><Input value={form.target_legacy_column} onChange={(e) => setForm({ ...form, target_legacy_column: e.target.value })} /></Field>
            <Field label="Relationship Type *">
              <Select value={form.relationship_type} onValueChange={(v) => setForm({ ...form, relationship_type: v as LegacyRelationshipType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LEGACY_RELATIONSHIP_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Mapping Status">
              <Select value={form.mapping_status} onValueChange={(v) => setForm({ ...form, mapping_status: v as LegacyMappingStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LEGACY_MAPPING_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <div className="flex items-center gap-2 mt-6"><Switch checked={form.is_required} onCheckedChange={(v) => setForm({ ...form, is_required: v })} /><Label className="text-xs">Required</Label></div>
            <div className="flex items-center gap-2 mt-6"><Switch checked={form.is_enforced_in_legacy} onCheckedChange={(v) => setForm({ ...form, is_enforced_in_legacy: v })} /><Label className="text-xs">Enforced in legacy</Label></div>
            <div className="flex items-center gap-2 mt-6"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label className="text-xs">Active</Label></div>
            <div className="md:col-span-2"><Label className="text-xs">Notes</Label><Textarea rows={2} value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={createMut.isPending || updateMut.isPending}>{editing ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ---------------- Compatibility ---------------- */
function CompatibilityTab({ tableMap }: { tableMap: any }) {
  const s = useMemo(() => suggestCompatibility(tableMap.legacy_table_name), [tableMap.legacy_table_name]);
  const suggestions = [
    { label: 'Suggested compatibility view name', value: s.view, current: tableMap.canonical_view_name },
    { label: 'Suggested service name', value: s.service, current: tableMap.canonical_service_name },
    { label: 'Suggested TypeScript entity name', value: s.entity, current: tableMap.modern_entity_name },
    { label: 'Suggested route/admin owner', value: s.route, current: tableMap.canonical_admin_route },
  ];
  function copyAll() {
    const text = suggestions.map((x) => `${x.label}: ${x.value}`).join('\n');
    navigator.clipboard.writeText(text).then(
      () => toast.success('Compatibility suggestions copied'),
      () => toast.error('Could not copy to clipboard'),
    );
  }
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Compatibility Recommendations</CardTitle>
        <Button size="sm" variant="outline" onClick={copyAll}>
          <ClipboardCopy className="mr-1 h-4 w-4" /> Copy compatibility suggestions
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-2 md:grid-cols-2">
          {suggestions.map((row) => (
            <div key={row.label} className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">{row.label}</div>
              <div className="font-mono">{row.value}</div>
              {row.current && row.current !== row.value && (
                <div className="text-xs text-muted-foreground mt-1">Current: <span className="font-mono">{row.current}</span></div>
              )}
            </div>
          ))}
        </div>
        <div className="rounded-md border p-3 bg-muted/40">
          <div className="text-xs font-medium mb-1">Use strategy explanation</div>
          <p className="text-muted-foreground">{s.explanation}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          No compatibility view is generated in this epic; suggestions are informational and will guide the migration epic.
        </p>
      </CardContent>
    </Card>
  );
}

/* ---------------- Shared ---------------- */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div><Label className="text-xs">{label}</Label>{children}</div>);
}
