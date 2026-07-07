/**
 * Epic 4 — Reference Data Consolidation UI section.
 *
 * Mounted inside /admin/reference-framework. Provides Sources, Consumers,
 * Dependencies, Change Policies, Legacy Value Mapping and Health tabs that
 * govern the four new core_reference_* tables introduced by Epic 4.
 */
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Boxes, Cable, Network, ShieldCheck, ListTree, HeartPulse, Plus, Info,
} from 'lucide-react';
import {
  useReferenceSources, useReferenceConsumers, useReferenceDependencies,
  useReferencePolicies, useLegacyValueMappings, useReferenceHealth,
  useReferenceOverview, useTableRegistryOptions, useLegacyTableMapOptions,
  useAdminRouteOptions, useCreateSource, useUpdateSource, useSetSourceActive,
  useCreateConsumer, useUpdateConsumer, useSetConsumerActive,
  useCreateDependency, useUpdateDependency, useSetDependencyActive,
  useUpsertPolicy, useSetPolicyActive,
} from '@/platform/reference-governance/useReferenceGovernance';
import {
  SOURCE_TYPES, SYNC_STRATEGIES, LIFECYCLE_STATUSES,
  USAGE_TYPES, IMPACT_LEVELS, DEPENDENCY_TYPES,
  type ReferenceSourceMap, type ReferenceSourceMapForm,
  type ReferenceConsumerMap, type ReferenceConsumerMapForm,
  type ReferenceDependencyMap, type ReferenceDependencyMapForm,
  type ReferenceChangePolicy, type ReferenceChangePolicyForm,
} from '@/platform/reference-governance/referenceGovernanceTypes';

/* ------------------------------------------------------------ */
/* Overview                                                     */
/* ------------------------------------------------------------ */
const Metric: React.FC<{ label: string; value: React.ReactNode; tone?: 'default' | 'warn' | 'ok' }> = ({
  label, value, tone = 'default',
}) => (
  <Card>
    <CardContent className="p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={
        'text-2xl font-semibold ' +
        (tone === 'warn' ? 'text-destructive' : tone === 'ok' ? 'text-emerald-600' : 'text-foreground')
      }>{value}</div>
    </CardContent>
  </Card>
);

const OverviewTab: React.FC = () => {
  const { data: o } = useReferenceOverview();
  if (!o) return <div className="text-sm text-muted-foreground">Loading…</div>;
  return (
    <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
      <Metric label="Total groups" value={o.totalGroups} tone="ok" />
      <Metric label="Legacy-backed" value={o.legacyBackedGroups} />
      <Metric label="Core-backed" value={o.coreBackedGroups} />
      <Metric label="Module-backed" value={o.moduleBackedGroups} />
      <Metric label="With consumers" value={o.groupsWithConsumers} />
      <Metric label="With dependencies" value={o.groupsWithDependencies} />
      <Metric label="With policy" value={o.groupsWithPolicy} />
      <Metric label="Missing source" value={o.groupsMissingSource}
        tone={o.groupsMissingSource ? 'warn' : 'ok'} />
      <Metric label="Missing owner" value={o.groupsMissingOwner}
        tone={o.groupsMissingOwner ? 'warn' : 'ok'} />
      <Metric label="High/Critical impact" value={o.highImpactGroups}
        tone={o.highImpactGroups ? 'warn' : 'default'} />
    </div>
  );
};

/* ------------------------------------------------------------ */
/* Sources                                                      */
/* ------------------------------------------------------------ */
const emptySourceForm: ReferenceSourceMapForm = {
  reference_group_code: '',
  source_type: 'CORE_REFERENCE',
  owner_module_code: 'CORE',
  is_primary_source: true,
  sync_strategy: 'DIRECT',
  lifecycle_status: 'ACTIVE',
  supports_effective_dates: false,
  supports_hierarchy: false,
  supports_localization: false,
  supports_external_codes: false,
  is_active: true,
};

const SourceDialog: React.FC<{
  open: boolean; onOpenChange: (v: boolean) => void;
  initial?: ReferenceSourceMap | null;
}> = ({ open, onOpenChange, initial }) => {
  const [form, setForm] = React.useState<ReferenceSourceMapForm>(emptySourceForm);
  const { data: registry = [] } = useTableRegistryOptions();
  const { data: legacyMaps = [] } = useLegacyTableMapOptions();
  const { data: routes = [] } = useAdminRouteOptions();
  const createM = useCreateSource();
  const updateM = useUpdateSource();

  React.useEffect(() => {
    if (open) setForm(initial ? { ...(initial as any) } : emptySourceForm);
  }, [open, initial]);

  const set = <K extends keyof ReferenceSourceMapForm>(k: K, v: ReferenceSourceMapForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const routeExists = form.admin_route
    ? routes.some((r) => r.route_path === form.admin_route)
    : true;

  const save = async () => {
    if (!form.reference_group_code) { toast.error('Reference group code is required'); return; }
    try {
      if (initial) await updateM.mutateAsync({ id: initial.id, payload: form });
      else await createM.mutateAsync(form);
      toast.success('Saved');
      onOpenChange(false);
    } catch (e: any) { toast.error(e?.message ?? 'Save failed'); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? 'Edit' : 'New'} Reference Source</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>Reference group code *</Label>
            <Input value={form.reference_group_code ?? ''} onChange={(e) => set('reference_group_code', e.target.value.toUpperCase())} /></div>
          <div><Label>Reference category code</Label>
            <Input value={form.reference_category_code ?? ''} onChange={(e) => set('reference_category_code', e.target.value)} /></div>
          <div><Label>Source type *</Label>
            <Select value={form.source_type} onValueChange={(v) => set('source_type', v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SOURCE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Sync strategy</Label>
            <Select value={form.sync_strategy} onValueChange={(v) => set('sync_strategy', v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SYNC_STRATEGIES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Source table name</Label>
            <Input value={form.source_table_name ?? ''} onChange={(e) => set('source_table_name', e.target.value || null)} /></div>
          <div><Label>Source view name</Label>
            <Input value={form.source_view_name ?? ''} onChange={(e) => set('source_view_name', e.target.value || null)} /></div>
          <div><Label>Source service name</Label>
            <Input value={form.source_service_name ?? ''} onChange={(e) => set('source_service_name', e.target.value || null)} /></div>
          <div><Label>Modern entity name</Label>
            <Input value={form.modern_entity_name ?? ''} onChange={(e) => set('modern_entity_name', e.target.value || null)} /></div>

          <div><Label>Table registry entry</Label>
            <Select value={form.table_registry_id ?? '__none__'}
              onValueChange={(v) => set('table_registry_id', v === '__none__' ? null : v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="__none__">— none —</SelectItem>
                {registry.map((r) => <SelectItem key={r.id} value={r.id}>{r.table_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Legacy table map</Label>
            <Select value={form.legacy_table_map_id ?? '__none__'}
              onValueChange={(v) => set('legacy_table_map_id', v === '__none__' ? null : v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="__none__">— none —</SelectItem>
                {legacyMaps.map((l) => <SelectItem key={l.id} value={l.id}>{l.legacy_table_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Legacy table name</Label>
            <Input value={form.legacy_table_name ?? ''} onChange={(e) => set('legacy_table_name', e.target.value || null)} /></div>
          <div><Label>Admin route</Label>
            <Input value={form.admin_route ?? ''} onChange={(e) => set('admin_route', e.target.value || null)} placeholder="/admin/…" />
            {form.admin_route && !routeExists && (
              <div className="text-xs text-amber-600 mt-1">
                Not registered in core_admin_route_registry.
              </div>
            )}
          </div>
          <div><Label>Owner module code</Label>
            <Input value={form.owner_module_code ?? ''} onChange={(e) => set('owner_module_code', e.target.value.toUpperCase())} /></div>
          <div><Label>Owner domain code</Label>
            <Input value={form.owner_domain_code ?? ''} onChange={(e) => set('owner_domain_code', e.target.value || null)} /></div>
          <div><Label>Lifecycle status</Label>
            <Select value={form.lifecycle_status} onValueChange={(v) => set('lifecycle_status', v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LIFECYCLE_STATUSES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Data steward role</Label>
            <Input value={form.data_steward_role ?? ''} onChange={(e) => set('data_steward_role', e.target.value || null)} /></div>

          <div className="col-span-2 grid grid-cols-2 md:grid-cols-4 gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={!!form.is_primary_source} onCheckedChange={(v) => set('is_primary_source', v)} />
              Primary source
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={!!form.supports_effective_dates} onCheckedChange={(v) => set('supports_effective_dates', v)} />
              Effective dates
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={!!form.supports_hierarchy} onCheckedChange={(v) => set('supports_hierarchy', v)} />
              Hierarchy
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={!!form.supports_localization} onCheckedChange={(v) => set('supports_localization', v)} />
              Localization
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={!!form.supports_external_codes} onCheckedChange={(v) => set('supports_external_codes', v)} />
              External codes
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={!!form.is_active} onCheckedChange={(v) => set('is_active', v)} />
              Active
            </label>
          </div>

          <div className="col-span-2"><Label>Description</Label>
            <Textarea rows={2} value={form.description ?? ''} onChange={(e) => set('description', e.target.value || null)} /></div>
          <div className="col-span-2"><Label>Notes</Label>
            <Textarea rows={2} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value || null)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={createM.isPending || updateM.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const SourcesTab: React.FC = () => {
  const { data = [], isLoading } = useReferenceSources();
  const setActive = useSetSourceActive();
  const [q, setQ] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ReferenceSourceMap | null>(null);

  const filtered = data.filter((s) => {
    if (!q) return true;
    const t = q.toLowerCase();
    return [s.reference_group_code, s.source_table_name, s.legacy_table_name, s.modern_entity_name, s.owner_module_code]
      .filter(Boolean).some((v) => String(v).toLowerCase().includes(t));
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Reference Sources</CardTitle>
            <CardDescription>Where each reference group's data comes from.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-64" />
            <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />New source</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Reference group</TableHead>
              <TableHead>Source type</TableHead>
              <TableHead>Source table</TableHead>
              <TableHead>Legacy table</TableHead>
              <TableHead>Admin route</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Sync</TableHead>
              <TableHead>Primary</TableHead>
              <TableHead>Lifecycle</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.reference_group_code}</TableCell>
                  <TableCell><Badge variant="outline">{s.source_type}</Badge></TableCell>
                  <TableCell className="text-xs">{s.source_table_name ?? '—'}</TableCell>
                  <TableCell className="text-xs">{s.legacy_table_name ?? '—'}</TableCell>
                  <TableCell className="text-xs">{s.admin_route ?? '—'}</TableCell>
                  <TableCell className="text-xs">{s.owner_module_code}{s.owner_domain_code ? ` / ${s.owner_domain_code}` : ''}</TableCell>
                  <TableCell className="text-xs">{s.sync_strategy}</TableCell>
                  <TableCell>{s.is_primary_source ? <Badge>Yes</Badge> : <Badge variant="outline">No</Badge>}</TableCell>
                  <TableCell><Badge variant="outline">{s.lifecycle_status}</Badge></TableCell>
                  <TableCell>{s.is_active ? <Badge variant="default">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                  <TableCell className="text-right space-x-2 whitespace-nowrap">
                    <Button size="sm" variant="outline" onClick={() => { setEditing(s); setOpen(true); }}>Edit</Button>
                    <Button size="sm" variant="ghost"
                      onClick={() => setActive.mutate({ id: s.id, active: !s.is_active })}>
                      {s.is_active ? 'Deactivate' : 'Reactivate'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={11} className="text-center text-sm text-muted-foreground">No sources.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <SourceDialog open={open} onOpenChange={setOpen} initial={editing} />
    </Card>
  );
};

/* ------------------------------------------------------------ */
/* Consumers                                                    */
/* ------------------------------------------------------------ */
const emptyConsumerForm: ReferenceConsumerMapForm = {
  reference_group_code: '',
  consumer_module_code: '',
  usage_type: 'LOOKUP',
  is_required: false,
  can_cache: true,
  impact_level: 'MEDIUM',
  is_active: true,
};

const ConsumerDialog: React.FC<{
  open: boolean; onOpenChange: (v: boolean) => void; initial?: ReferenceConsumerMap | null;
}> = ({ open, onOpenChange, initial }) => {
  const [form, setForm] = React.useState<ReferenceConsumerMapForm>(emptyConsumerForm);
  const createM = useCreateConsumer(); const updateM = useUpdateConsumer();
  React.useEffect(() => { if (open) setForm(initial ? { ...(initial as any) } : emptyConsumerForm); }, [open, initial]);
  const set = <K extends keyof ReferenceConsumerMapForm>(k: K, v: ReferenceConsumerMapForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const save = async () => {
    if (!form.reference_group_code || !form.consumer_module_code) { toast.error('Group and consumer module are required'); return; }
    try {
      if (initial) await updateM.mutateAsync({ id: initial.id, payload: form });
      else await createM.mutateAsync(form);
      toast.success('Saved'); onOpenChange(false);
    } catch (e: any) { toast.error(e?.message ?? 'Save failed'); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{initial ? 'Edit' : 'New'} Consumer Mapping</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>Reference group code *</Label>
            <Input value={form.reference_group_code ?? ''} onChange={(e) => set('reference_group_code', e.target.value.toUpperCase())} /></div>
          <div><Label>Consumer module code *</Label>
            <Input value={form.consumer_module_code ?? ''} onChange={(e) => set('consumer_module_code', e.target.value.toUpperCase())} /></div>
          <div><Label>Consumer domain code</Label>
            <Input value={form.consumer_domain_code ?? ''} onChange={(e) => set('consumer_domain_code', e.target.value || null)} /></div>
          <div><Label>Consumer feature</Label>
            <Input value={form.consumer_feature ?? ''} onChange={(e) => set('consumer_feature', e.target.value || null)} /></div>
          <div><Label>Consumer route</Label>
            <Input value={form.consumer_route ?? ''} onChange={(e) => set('consumer_route', e.target.value || null)} /></div>
          <div><Label>Consumer service</Label>
            <Input value={form.consumer_service ?? ''} onChange={(e) => set('consumer_service', e.target.value || null)} /></div>
          <div><Label>Usage type</Label>
            <Select value={form.usage_type} onValueChange={(v) => set('usage_type', v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{USAGE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Impact level</Label>
            <Select value={form.impact_level} onValueChange={(v) => set('impact_level', v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{IMPACT_LEVELS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2 grid grid-cols-3 gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={!!form.is_required} onCheckedChange={(v) => set('is_required', v)} />
              Required
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={!!form.can_cache} onCheckedChange={(v) => set('can_cache', v)} />
              Cacheable
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={!!form.is_active} onCheckedChange={(v) => set('is_active', v)} />
              Active
            </label>
          </div>
          <div className="col-span-2"><Label>Notes</Label>
            <Textarea rows={2} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value || null)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={createM.isPending || updateM.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ConsumersTab: React.FC = () => {
  const { data = [] } = useReferenceConsumers();
  const setActive = useSetConsumerActive();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ReferenceConsumerMap | null>(null);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div><CardTitle>Reference Consumers</CardTitle>
            <CardDescription>Which modules consume each reference group.</CardDescription></div>
          <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />New consumer</Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Reference group</TableHead>
            <TableHead>Consumer module</TableHead>
            <TableHead>Domain</TableHead>
            <TableHead>Feature</TableHead>
            <TableHead>Route</TableHead>
            <TableHead>Usage</TableHead>
            <TableHead>Required</TableHead>
            <TableHead>Cache</TableHead>
            <TableHead>Impact</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {data.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">{c.reference_group_code}</TableCell>
                <TableCell className="text-xs">{c.consumer_module_code}</TableCell>
                <TableCell className="text-xs">{c.consumer_domain_code ?? '—'}</TableCell>
                <TableCell className="text-xs">{c.consumer_feature ?? '—'}</TableCell>
                <TableCell className="text-xs">{c.consumer_route ?? '—'}</TableCell>
                <TableCell><Badge variant="outline">{c.usage_type}</Badge></TableCell>
                <TableCell>{c.is_required ? 'Yes' : 'No'}</TableCell>
                <TableCell>{c.can_cache ? 'Yes' : 'No'}</TableCell>
                <TableCell>
                  <Badge variant={c.impact_level === 'CRITICAL' || c.impact_level === 'HIGH' ? 'destructive' : 'outline'}>
                    {c.impact_level}
                  </Badge>
                </TableCell>
                <TableCell>{c.is_active ? 'Yes' : 'No'}</TableCell>
                <TableCell className="text-right space-x-2 whitespace-nowrap">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(c); setOpen(true); }}>Edit</Button>
                  <Button size="sm" variant="ghost"
                    onClick={() => setActive.mutate({ id: c.id, active: !c.is_active })}>
                    {c.is_active ? 'Deactivate' : 'Reactivate'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow><TableCell colSpan={11} className="text-center text-sm text-muted-foreground">No consumers.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
      <ConsumerDialog open={open} onOpenChange={setOpen} initial={editing} />
    </Card>
  );
};

/* ------------------------------------------------------------ */
/* Dependencies                                                 */
/* ------------------------------------------------------------ */
const emptyDepForm: ReferenceDependencyMapForm = {
  source_reference_group_code: '',
  depends_on_reference_group_code: '',
  dependency_type: 'PARENT_CHILD',
  is_required: false,
  impact_level: 'MEDIUM',
  is_active: true,
};

const DependencyDialog: React.FC<{
  open: boolean; onOpenChange: (v: boolean) => void; initial?: ReferenceDependencyMap | null;
}> = ({ open, onOpenChange, initial }) => {
  const [form, setForm] = React.useState<ReferenceDependencyMapForm>(emptyDepForm);
  const createM = useCreateDependency(); const updateM = useUpdateDependency();
  React.useEffect(() => { if (open) setForm(initial ? { ...(initial as any) } : emptyDepForm); }, [open, initial]);
  const set = <K extends keyof ReferenceDependencyMapForm>(k: K, v: ReferenceDependencyMapForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const save = async () => {
    if (!form.source_reference_group_code || !form.depends_on_reference_group_code) {
      toast.error('Both group codes are required'); return;
    }
    try {
      if (initial) await updateM.mutateAsync({ id: initial.id, payload: form });
      else await createM.mutateAsync(form);
      toast.success('Saved'); onOpenChange(false);
    } catch (e: any) { toast.error(e?.message ?? 'Save failed'); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{initial ? 'Edit' : 'New'} Dependency</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>Source reference group *</Label>
            <Input value={form.source_reference_group_code ?? ''} onChange={(e) => set('source_reference_group_code', e.target.value.toUpperCase())} /></div>
          <div><Label>Depends on reference group *</Label>
            <Input value={form.depends_on_reference_group_code ?? ''} onChange={(e) => set('depends_on_reference_group_code', e.target.value.toUpperCase())} /></div>
          <div><Label>Dependency type</Label>
            <Select value={form.dependency_type} onValueChange={(v) => set('dependency_type', v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DEPENDENCY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Impact level</Label>
            <Select value={form.impact_level} onValueChange={(v) => set('impact_level', v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{IMPACT_LEVELS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Dependency rule</Label>
            <Textarea rows={2} value={form.dependency_rule ?? ''} onChange={(e) => set('dependency_rule', e.target.value || null)} /></div>
          <div className="col-span-2 flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={!!form.is_required} onCheckedChange={(v) => set('is_required', v)} />Required
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={!!form.is_active} onCheckedChange={(v) => set('is_active', v)} />Active
            </label>
          </div>
          <div className="col-span-2"><Label>Notes</Label>
            <Textarea rows={2} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value || null)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={createM.isPending || updateM.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DependenciesTab: React.FC = () => {
  const { data = [] } = useReferenceDependencies();
  const setActive = useSetDependencyActive();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ReferenceDependencyMap | null>(null);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div><CardTitle>Reference Dependencies</CardTitle>
            <CardDescription>Dependencies between reference groups.</CardDescription></div>
          <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />New dependency</Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Reference group</TableHead>
            <TableHead>Depends on</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Required</TableHead>
            <TableHead>Impact</TableHead>
            <TableHead>Rule</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {data.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-mono text-xs">{d.source_reference_group_code}</TableCell>
                <TableCell className="font-mono text-xs">{d.depends_on_reference_group_code}</TableCell>
                <TableCell><Badge variant="outline">{d.dependency_type}</Badge></TableCell>
                <TableCell>{d.is_required ? 'Yes' : 'No'}</TableCell>
                <TableCell>
                  <Badge variant={d.impact_level === 'CRITICAL' || d.impact_level === 'HIGH' ? 'destructive' : 'outline'}>
                    {d.impact_level}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">{d.dependency_rule ?? '—'}</TableCell>
                <TableCell>{d.is_active ? 'Yes' : 'No'}</TableCell>
                <TableCell className="text-right space-x-2 whitespace-nowrap">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(d); setOpen(true); }}>Edit</Button>
                  <Button size="sm" variant="ghost"
                    onClick={() => setActive.mutate({ id: d.id, active: !d.is_active })}>
                    {d.is_active ? 'Deactivate' : 'Reactivate'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground">No dependencies.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
      <DependencyDialog open={open} onOpenChange={setOpen} initial={editing} />
    </Card>
  );
};

/* ------------------------------------------------------------ */
/* Policies                                                     */
/* ------------------------------------------------------------ */
const emptyPolicyForm: ReferenceChangePolicyForm = {
  reference_group_code: '',
  allow_create: true, allow_update: true, allow_delete: false, allow_retire: true,
  requires_approval: false, block_delete_if_consumed: true, block_retire_if_active_records: true,
  effective_date_required: false, reason_required: true, is_active: true,
};

const PolicyDialog: React.FC<{
  open: boolean; onOpenChange: (v: boolean) => void; initial?: ReferenceChangePolicy | null;
}> = ({ open, onOpenChange, initial }) => {
  const [form, setForm] = React.useState<ReferenceChangePolicyForm>(emptyPolicyForm);
  const upsertM = useUpsertPolicy();
  React.useEffect(() => { if (open) setForm(initial ? { ...(initial as any) } : emptyPolicyForm); }, [open, initial]);
  const set = <K extends keyof ReferenceChangePolicyForm>(k: K, v: ReferenceChangePolicyForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const save = async () => {
    if (!form.reference_group_code) { toast.error('Reference group code is required'); return; }
    try { await upsertM.mutateAsync(form); toast.success('Saved'); onOpenChange(false); }
    catch (e: any) { toast.error(e?.message ?? 'Save failed'); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{initial ? 'Edit' : 'New'} Change Policy</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>Reference group code *</Label>
            <Input value={form.reference_group_code ?? ''} onChange={(e) => set('reference_group_code', e.target.value.toUpperCase())} disabled={!!initial} /></div>
          <div><Label>Approval permission</Label>
            <Input value={form.approval_permission ?? ''} onChange={(e) => set('approval_permission', e.target.value || null)} /></div>
          <div className="col-span-2 grid grid-cols-2 md:grid-cols-3 gap-3">
            <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.allow_create} onCheckedChange={(v) => set('allow_create', v)} />Allow create</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.allow_update} onCheckedChange={(v) => set('allow_update', v)} />Allow update</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.allow_delete} onCheckedChange={(v) => set('allow_delete', v)} />Allow delete</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.allow_retire} onCheckedChange={(v) => set('allow_retire', v)} />Allow retire</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.requires_approval} onCheckedChange={(v) => set('requires_approval', v)} />Requires approval</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.block_delete_if_consumed} onCheckedChange={(v) => set('block_delete_if_consumed', v)} />Block delete if consumed</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.block_retire_if_active_records} onCheckedChange={(v) => set('block_retire_if_active_records', v)} />Block retire if active records</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.effective_date_required} onCheckedChange={(v) => set('effective_date_required', v)} />Effective date required</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.reason_required} onCheckedChange={(v) => set('reason_required', v)} />Reason required</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.is_active} onCheckedChange={(v) => set('is_active', v)} />Active</label>
          </div>
          <div className="col-span-2"><Label>Policy notes</Label>
            <Textarea rows={2} value={form.policy_notes ?? ''} onChange={(e) => set('policy_notes', e.target.value || null)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={upsertM.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const PoliciesTab: React.FC = () => {
  const { data = [] } = useReferencePolicies();
  const setActive = useSetPolicyActive();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ReferenceChangePolicy | null>(null);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div><CardTitle>Change Policies</CardTitle>
            <CardDescription>Whether reference data can be created, updated, deleted, or retired.</CardDescription></div>
          <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />New policy</Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Reference group</TableHead>
            <TableHead>Create</TableHead><TableHead>Update</TableHead>
            <TableHead>Delete</TableHead><TableHead>Retire</TableHead>
            <TableHead>Approval</TableHead>
            <TableHead>Block del·consumed</TableHead>
            <TableHead>Block ret·active</TableHead>
            <TableHead>Eff·date</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {data.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.reference_group_code}</TableCell>
                <TableCell>{p.allow_create ? 'Y' : 'N'}</TableCell>
                <TableCell>{p.allow_update ? 'Y' : 'N'}</TableCell>
                <TableCell>{p.allow_delete ? <Badge variant="destructive">Y</Badge> : 'N'}</TableCell>
                <TableCell>{p.allow_retire ? 'Y' : 'N'}</TableCell>
                <TableCell>{p.requires_approval ? 'Y' : 'N'}</TableCell>
                <TableCell>{p.block_delete_if_consumed ? 'Y' : 'N'}</TableCell>
                <TableCell>{p.block_retire_if_active_records ? 'Y' : 'N'}</TableCell>
                <TableCell>{p.effective_date_required ? 'Y' : 'N'}</TableCell>
                <TableCell>{p.reason_required ? 'Y' : 'N'}</TableCell>
                <TableCell>{p.is_active ? 'Y' : 'N'}</TableCell>
                <TableCell className="text-right space-x-2 whitespace-nowrap">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(p); setOpen(true); }}>Edit</Button>
                  <Button size="sm" variant="ghost"
                    onClick={() => setActive.mutate({ id: p.id, active: !p.is_active })}>
                    {p.is_active ? 'Deactivate' : 'Reactivate'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow><TableCell colSpan={12} className="text-center text-sm text-muted-foreground">No policies.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
      <PolicyDialog open={open} onOpenChange={setOpen} initial={editing} />
    </Card>
  );
};

/* ------------------------------------------------------------ */
/* Legacy value mapping (read-only)                             */
/* ------------------------------------------------------------ */
const LegacyValueMappingTab: React.FC = () => {
  const { data = [] } = useLegacyValueMappings();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Legacy Value Mapping</CardTitle>
        <CardDescription>
          Grouped view of <code>core_legacy_value_map</code>. Full editing lives in{' '}
          <a className="underline" href="/admin/legacy-mapping">Legacy Mapping</a>.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Reference group</TableHead>
            <TableHead>Legacy table</TableHead>
            <TableHead>Legacy column</TableHead>
            <TableHead>Legacy code</TableHead>
            <TableHead>Legacy label</TableHead>
            <TableHead>Modern code</TableHead>
            <TableHead>Modern label</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Active</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {data.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-mono text-xs">{v.reference_group_code ?? '—'}</TableCell>
                <TableCell className="text-xs">{v.legacy_table_name ?? '—'}</TableCell>
                <TableCell className="text-xs">{v.legacy_column_name ?? '—'}</TableCell>
                <TableCell className="font-mono text-xs">{v.legacy_code ?? '—'}</TableCell>
                <TableCell className="text-xs">{v.legacy_label ?? '—'}</TableCell>
                <TableCell className="font-mono text-xs">{v.modern_code ?? '—'}</TableCell>
                <TableCell className="text-xs">{v.modern_label ?? '—'}</TableCell>
                <TableCell><Badge variant="outline">{v.mapping_status ?? '—'}</Badge></TableCell>
                <TableCell>{v.is_active ? 'Y' : 'N'}</TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground">
                No legacy value mappings yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

/* ------------------------------------------------------------ */
/* Health                                                       */
/* ------------------------------------------------------------ */
const severityBadge = (s: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL') => {
  const map: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    INFO: 'outline', WARNING: 'secondary', ERROR: 'destructive', CRITICAL: 'destructive',
  };
  return <Badge variant={map[s]}>{s}</Badge>;
};

const HealthTab: React.FC = () => {
  const { data = [] } = useReferenceHealth();
  const counts = { INFO: 0, WARNING: 0, ERROR: 0, CRITICAL: 0 } as Record<string, number>;
  data.forEach((i) => { counts[i.severity]++; });
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Info" value={counts.INFO} />
        <Metric label="Warnings" value={counts.WARNING} tone={counts.WARNING ? 'warn' : 'ok'} />
        <Metric label="Errors" value={counts.ERROR} tone={counts.ERROR ? 'warn' : 'ok'} />
        <Metric label="Critical" value={counts.CRITICAL} tone={counts.CRITICAL ? 'warn' : 'ok'} />
      </div>
      <Card>
        <CardHeader><CardTitle>Governance Warnings</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Severity</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Reference group</TableHead>
              <TableHead>Message</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.map((i, idx) => (
                <TableRow key={idx}>
                  <TableCell>{severityBadge(i.severity)}</TableCell>
                  <TableCell className="font-mono text-xs">{i.code}</TableCell>
                  <TableCell className="font-mono text-xs">{i.reference_group_code ?? '—'}</TableCell>
                  <TableCell className="text-xs">{i.message}</TableCell>
                </TableRow>
              ))}
              {data.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  No governance issues found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

/* ------------------------------------------------------------ */
/* Wrapper                                                      */
/* ------------------------------------------------------------ */
export const ReferenceGovernanceSection: React.FC = () => (
  <Card className="mt-6">
    <CardHeader>
      <CardTitle>Reference Data Consolidation (Epic 4)</CardTitle>
      <CardDescription>
        Sources, consumers, dependencies, change policies and health for the governed
        reference-data layer. Backed by <code>core_reference_source_map</code>,{' '}
        <code>core_reference_consumer_map</code>, <code>core_reference_dependency_map</code>,{' '}
        <code>core_reference_change_policy</code> plus <code>core_legacy_value_map</code>,{' '}
        <code>core_table_registry</code>, <code>core_legacy_table_map</code> and{' '}
        <code>core_admin_route_registry</code>.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <Alert className="mb-4">
        <Info className="h-4 w-4" />
        <AlertTitle>Governance surface</AlertTitle>
        <AlertDescription>
          Day-to-day CRUD stays on <code>/admin/master-data/*</code>. This section governs the
          catalogue: source, ownership, consumers, dependencies, and safe-to-change policies.
        </AlertDescription>
      </Alert>
      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview"><HeartPulse className="h-3.5 w-3.5 mr-1" />Overview</TabsTrigger>
          <TabsTrigger value="sources"><Boxes className="h-3.5 w-3.5 mr-1" />Sources</TabsTrigger>
          <TabsTrigger value="consumers"><Cable className="h-3.5 w-3.5 mr-1" />Consumers</TabsTrigger>
          <TabsTrigger value="deps"><Network className="h-3.5 w-3.5 mr-1" />Dependencies</TabsTrigger>
          <TabsTrigger value="policies"><ShieldCheck className="h-3.5 w-3.5 mr-1" />Change Policies</TabsTrigger>
          <TabsTrigger value="values"><ListTree className="h-3.5 w-3.5 mr-1" />Legacy Values</TabsTrigger>
          <TabsTrigger value="health"><HeartPulse className="h-3.5 w-3.5 mr-1" />Health</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4"><OverviewTab /></TabsContent>
        <TabsContent value="sources" className="mt-4"><SourcesTab /></TabsContent>
        <TabsContent value="consumers" className="mt-4"><ConsumersTab /></TabsContent>
        <TabsContent value="deps" className="mt-4"><DependenciesTab /></TabsContent>
        <TabsContent value="policies" className="mt-4"><PoliciesTab /></TabsContent>
        <TabsContent value="values" className="mt-4"><LegacyValueMappingTab /></TabsContent>
        <TabsContent value="health" className="mt-4"><HealthTab /></TabsContent>
      </Tabs>
    </CardContent>
  </Card>
);

export default ReferenceGovernanceSection;
