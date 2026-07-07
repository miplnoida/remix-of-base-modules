import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ShieldCheck, Search, Plus, Edit, EyeOff, Eye, RefreshCw, GitCompare, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  usePermissionRegistryComparison,
  usePermissionRegistryEntries,
  useCreatePermissionRegistryEntry,
  useUpdatePermissionRegistryEntry,
  useDeactivatePermissionRegistryEntry,
  useReactivatePermissionRegistryEntry,
  useSyncPermissionsFromRegistry,
} from '@/platform/rbac/useRbac';
import {
  PERMISSION_LIFECYCLE_STATUSES,
  PERMISSION_RISK_LEVELS,
  PERMISSION_SCOPES,
  validatePermissionKey,
  type PermissionLifecycleStatus,
  type PermissionRegistryEntry,
  type PermissionRegistryFilters,
  type PermissionRegistryFormValues,
  type PermissionRiskLevel,
  type PermissionScope,
} from '@/platform/rbac/permissionTypes';

const emptyForm: PermissionRegistryFormValues = {
  permission_key: '',
  permission_name: '',
  description: '',
  module_code: 'CORE',
  domain_code: '',
  permission_scope: 'ACTION',
  resource_type: '',
  resource_code: '',
  action_code: '',
  is_platform_permission: false,
  is_sensitive_permission: false,
  is_admin_permission: false,
  risk_level: 'LOW',
  lifecycle_status: 'ACTIVE',
  source_file: '',
  is_active: true,
};

function riskColor(r: PermissionRiskLevel) {
  return {
    LOW: 'bg-emerald-100 text-emerald-800',
    MEDIUM: 'bg-amber-100 text-amber-800',
    HIGH: 'bg-orange-100 text-orange-800',
    CRITICAL: 'bg-red-100 text-red-800',
  }[r];
}
function lifecycleColor(s: PermissionLifecycleStatus) {
  return {
    PLANNED: 'bg-slate-100 text-slate-800',
    ACTIVE: 'bg-emerald-100 text-emerald-800',
    DEPRECATED: 'bg-amber-100 text-amber-800',
    RETIRED: 'bg-red-100 text-red-800',
  }[s];
}

export default function PermissionRegistryAdmin() {
  const [filters, setFilters] = useState<PermissionRegistryFilters>({});
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<PermissionRegistryFormValues>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const effectiveFilters = useMemo(
    () => ({ ...filters, search: search.trim() || undefined }),
    [filters, search],
  );

  const { data: entries = [], isLoading } = usePermissionRegistryEntries(effectiveFilters);
  const { data: comparison } = usePermissionRegistryComparison();
  const createMut = useCreatePermissionRegistryEntry();
  const updateMut = useUpdatePermissionRegistryEntry();
  const deactivateMut = useDeactivatePermissionRegistryEntry();
  const reactivateMut = useReactivatePermissionRegistryEntry();
  const syncMut = useSyncPermissionsFromRegistry();

  const stats = useMemo(() => {
    return {
      total: entries.length,
      active: entries.filter((e) => e.is_active).length,
      platform: entries.filter((e) => e.is_platform_permission).length,
      admin: entries.filter((e) => e.is_admin_permission).length,
      sensitive: entries.filter((e) => e.is_sensitive_permission).length,
      highRisk: entries.filter((e) => e.risk_level === 'HIGH' || e.risk_level === 'CRITICAL').length,
      deprecated: entries.filter((e) => e.lifecycle_status === 'DEPRECATED').length,
    };
  }, [entries]);

  const healthWarnings = useMemo(() => {
    const w: { severity: 'INFO' | 'WARNING' | 'ERROR'; message: string }[] = [];
    for (const e of entries) {
      if (validatePermissionKey(e.permission_key).length) {
        w.push({ severity: 'ERROR', message: `${e.permission_key}: invalid key format` });
      }
      if (!e.module_code) w.push({ severity: 'ERROR', message: `${e.permission_key}: missing module_code` });
      if (!e.action_code) w.push({ severity: 'ERROR', message: `${e.permission_key}: missing action_code` });
      if ((e.risk_level === 'HIGH' || e.risk_level === 'CRITICAL') && !e.is_sensitive_permission) {
        w.push({ severity: 'WARNING', message: `${e.permission_key}: ${e.risk_level} risk but not marked sensitive` });
      }
      if (e.permission_key.includes('.admin.') && !e.is_admin_permission) {
        w.push({ severity: 'WARNING', message: `${e.permission_key}: admin-scoped key but not marked admin` });
      }
    }
    if (comparison) {
      for (const m of comparison.missing_in_registry) {
        w.push({ severity: 'WARNING', message: `${m.permission_key}: in DB but missing from source registry` });
      }
      for (const m of comparison.missing_in_db) {
        w.push({ severity: 'INFO', message: `${m.permission_key}: in source registry but missing from DB` });
      }
    }
    return w.slice(0, 50);
  }, [entries, comparison]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }
  function openEdit(e: PermissionRegistryEntry) {
    setEditingId(e.id);
    setForm({
      permission_key: e.permission_key,
      permission_name: e.permission_name,
      description: e.description ?? '',
      module_code: e.module_code,
      domain_code: e.domain_code ?? '',
      permission_scope: e.permission_scope,
      resource_type: e.resource_type ?? '',
      resource_code: e.resource_code ?? '',
      action_code: e.action_code,
      is_platform_permission: e.is_platform_permission,
      is_sensitive_permission: e.is_sensitive_permission,
      is_admin_permission: e.is_admin_permission,
      risk_level: e.risk_level,
      lifecycle_status: e.lifecycle_status,
      source_file: e.source_file ?? '',
      is_active: e.is_active,
    });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    const errs = validatePermissionKey(form.permission_key);
    if (errs.length) {
      toast.error(errs[0]);
      return;
    }
    try {
      if (editingId) {
        await updateMut.mutateAsync({ id: editingId, payload: form });
        toast.success('Permission updated');
      } else {
        await createMut.mutateAsync(form);
        toast.success('Permission created');
      }
      setDialogOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to save');
    }
  }

  async function handleSync() {
    try {
      const res = await syncMut.mutateAsync();
      toast.success(
        `Sync ${res.status}: ${res.permissions_created} created, ${res.permissions_updated} updated`,
      );
    } catch (e: any) {
      toast.error(e?.message ?? 'Sync failed');
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            Permission Registry
          </h1>
          <p className="text-muted-foreground mt-1">
            Govern platform and module permission keys, risk levels, lifecycle status, and
            synchronization with RBAC tables.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/role-permissions">Role Permission Management</Link>
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> New Permission
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Active" value={stats.active} />
        <StatCard label="Platform" value={stats.platform} />
        <StatCard label="Admin" value={stats.admin} />
        <StatCard label="Sensitive" value={stats.sensitive} />
        <StatCard label="High/Critical" value={stats.highRisk} />
        <StatCard label="Deprecated" value={stats.deprecated} />
        <StatCard
          label="Missing in DB"
          value={comparison?.missing_in_db.length ?? 0}
          hint={`${comparison?.missing_in_registry.length ?? 0} missing in registry`}
        />
      </div>

      {/* Sync panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Registry Sync
          </CardTitle>
          <CardDescription>
            Compare the source code permission registry with the database and sync missing
            permissions. Deletions are never performed automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <SyncStat label="In source" value={(comparison?.in_both.length ?? 0) + (comparison?.missing_in_db.length ?? 0)} />
            <SyncStat label="In database" value={(comparison?.in_both.length ?? 0) + (comparison?.missing_in_registry.length ?? 0)} />
            <SyncStat label="Missing in DB" value={comparison?.missing_in_db.length ?? 0} />
            <SyncStat label="Missing in source" value={comparison?.missing_in_registry.length ?? 0} />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSync} disabled={syncMut.isPending}>
              <RefreshCw className={`h-4 w-4 mr-1 ${syncMut.isPending ? 'animate-spin' : ''}`} />
              Sync missing into database
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Health */}
      {healthWarnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Health warnings ({healthWarnings.length})</AlertTitle>
          <AlertDescription>
            <ul className="text-xs mt-2 space-y-0.5 max-h-40 overflow-auto">
              {healthWarnings.map((w, i) => (
                <li key={i}>
                  <Badge variant="outline" className="mr-2 text-[10px]">{w.severity}</Badge>
                  {w.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Filters + Table */}
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search key or name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <FilterSelect
              value={filters.permission_scope ?? ''}
              onChange={(v) => setFilters((f) => ({ ...f, permission_scope: (v || undefined) as PermissionScope | undefined }))}
              placeholder="Scope"
              options={PERMISSION_SCOPES}
            />
            <FilterSelect
              value={filters.risk_level ?? ''}
              onChange={(v) => setFilters((f) => ({ ...f, risk_level: (v || undefined) as PermissionRiskLevel | undefined }))}
              placeholder="Risk"
              options={PERMISSION_RISK_LEVELS}
            />
            <FilterSelect
              value={filters.lifecycle_status ?? ''}
              onChange={(v) => setFilters((f) => ({ ...f, lifecycle_status: (v || undefined) as PermissionLifecycleStatus | undefined }))}
              placeholder="Lifecycle"
              options={PERMISSION_LIFECYCLE_STATUSES}
            />
            <Input
              className="w-32"
              placeholder="Module"
              value={filters.module_code ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, module_code: e.target.value || undefined }))}
            />
            <Input
              className="w-32"
              placeholder="Domain"
              value={filters.domain_code ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, domain_code: e.target.value || undefined }))}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading…</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No permissions</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Flags</TableHead>
                    <TableHead>Lifecycle</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs">{e.permission_key}</TableCell>
                      <TableCell>{e.permission_name}</TableCell>
                      <TableCell>{e.module_code}</TableCell>
                      <TableCell>{e.domain_code ?? '—'}</TableCell>
                      <TableCell><Badge variant="outline">{e.permission_scope}</Badge></TableCell>
                      <TableCell className="text-xs">{e.action_code}</TableCell>
                      <TableCell><Badge className={riskColor(e.risk_level)}>{e.risk_level}</Badge></TableCell>
                      <TableCell className="text-xs space-x-1">
                        {e.is_platform_permission && <Badge variant="secondary">P</Badge>}
                        {e.is_admin_permission && <Badge variant="secondary">A</Badge>}
                        {e.is_sensitive_permission && <Badge variant="secondary">S</Badge>}
                      </TableCell>
                      <TableCell><Badge className={lifecycleColor(e.lifecycle_status)}>{e.lifecycle_status}</Badge></TableCell>
                      <TableCell>{e.is_active ? 'Yes' : 'No'}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(e)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {e.is_active ? (
                          <Button size="sm" variant="ghost" onClick={() => deactivateMut.mutate(e.id)}>
                            <EyeOff className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => reactivateMut.mutate(e.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit permission' : 'New permission'}</DialogTitle>
            <DialogDescription>
              Permission keys must use lowercase dot notation (e.g. <code>core.admin.users.view</code>).
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Permission key *" full>
              <Input
                value={form.permission_key}
                onChange={(e) => setForm({ ...form, permission_key: e.target.value })}
                placeholder="core.module.resource.action"
              />
            </Field>
            <Field label="Permission name *" full>
              <Input
                value={form.permission_name}
                onChange={(e) => setForm({ ...form, permission_name: e.target.value })}
              />
            </Field>
            <Field label="Description" full>
              <Textarea
                rows={2}
                value={form.description ?? ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
            <Field label="Module code *">
              <Input value={form.module_code} onChange={(e) => setForm({ ...form, module_code: e.target.value })} />
            </Field>
            <Field label="Domain code">
              <Input value={form.domain_code ?? ''} onChange={(e) => setForm({ ...form, domain_code: e.target.value })} />
            </Field>
            <Field label="Scope *">
              <Select
                value={form.permission_scope}
                onValueChange={(v) => setForm({ ...form, permission_scope: v as PermissionScope })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERMISSION_SCOPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Action code *">
              <Input value={form.action_code} onChange={(e) => setForm({ ...form, action_code: e.target.value })} />
            </Field>
            <Field label="Resource type">
              <Input value={form.resource_type ?? ''} onChange={(e) => setForm({ ...form, resource_type: e.target.value })} />
            </Field>
            <Field label="Resource code">
              <Input value={form.resource_code ?? ''} onChange={(e) => setForm({ ...form, resource_code: e.target.value })} />
            </Field>
            <Field label="Risk level *">
              <Select value={form.risk_level} onValueChange={(v) => setForm({ ...form, risk_level: v as PermissionRiskLevel })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERMISSION_RISK_LEVELS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Lifecycle *">
              <Select
                value={form.lifecycle_status}
                onValueChange={(v) => setForm({ ...form, lifecycle_status: v as PermissionLifecycleStatus })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERMISSION_LIFECYCLE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Source file">
              <Input value={form.source_file ?? ''} onChange={(e) => setForm({ ...form, source_file: e.target.value })} />
            </Field>
            <ToggleField label="Platform" checked={form.is_platform_permission} onChange={(v) => setForm({ ...form, is_platform_permission: v })} />
            <ToggleField label="Admin" checked={form.is_admin_permission} onChange={(v) => setForm({ ...form, is_admin_permission: v })} />
            <ToggleField label="Sensitive" checked={form.is_sensitive_permission} onChange={(v) => setForm({ ...form, is_sensitive_permission: v })} />
            <ToggleField label="Active" checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>
              {editingId ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground uppercase">{label}</div>
        <div className="text-2xl font-bold">{value}</div>
        {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
      </CardContent>
    </Card>
  );
}
function SyncStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border rounded p-3">
      <div className="text-xs text-muted-foreground uppercase">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
function FilterSelect({
  value, onChange, placeholder, options,
}: { value: string; onChange: (v: string) => void; placeholder: string; options: readonly string[] }) {
  return (
    <Select value={value || '__all'} onValueChange={(v) => onChange(v === '__all' ? '' : v)}>
      <SelectTrigger className="w-36"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__all">All {placeholder.toLowerCase()}</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? 'col-span-2 space-y-1' : 'space-y-1'}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between border rounded px-3 py-2">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
