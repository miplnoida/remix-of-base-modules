import { useMemo, useState } from 'react';
import { Plus, Pencil, Power, PowerOff, Search } from 'lucide-react';
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
  useAdminDomains,
  useAdminRoutes,
  useCreateAdminRoute,
  useDeactivateAdminRoute,
  useReactivateAdminRoute,
  useUpdateAdminRoute,
} from '@/platform/admin-route/useAdminRoutes';
import {
  ADMIN_ROUTE_STATUSES,
  validateAdminRouteFormValues,
  type AdminRouteFilters,
  type AdminRouteFormValues,
  type AdminRouteRegistryEntry,
  type AdminRouteStatus,
} from '@/platform/admin-route/adminRouteTypes';

const STATUS_BADGE: Record<AdminRouteStatus, string> = {
  CANONICAL: 'bg-success/15 text-success border border-success/40',
  LEGACY: 'bg-warning/15 text-warning border border-warning/40',
  REDIRECT: 'bg-info/15 text-info border border-info/40',
  RETIRED: 'bg-muted text-muted-foreground border border-border',
  PLANNED: 'bg-primary/10 text-primary border border-primary/30',
};

const EMPTY_FORM: AdminRouteFormValues = {
  route_path: '',
  page_name: '',
  admin_domain: '',
  canonical_status: 'CANONICAL',
  replacement_route: '',
  owner_module_code: 'CORE',
  owner_team: '',
  description: '',
  page_component: '',
  source_file_path: '',
  requires_permission: '',
  show_in_platform_admin: true,
  display_order: 100,
  notes: '',
  is_active: true,
};

export default function RouteRegistryAdmin() {
  const [filters, setFilters] = useState<AdminRouteFilters>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminRouteRegistryEntry | null>(null);
  const [form, setForm] = useState<AdminRouteFormValues>(EMPTY_FORM);

  const { data: domains = [] } = useAdminDomains();
  const { data: routes = [], isLoading } = useAdminRoutes(filters);

  const createMut = useCreateAdminRoute();
  const updateMut = useUpdateAdminRoute();
  const deactivateMut = useDeactivateAdminRoute();
  const reactivateMut = useReactivateAdminRoute();

  const summary = useMemo(() => {
    const s = {
      total: routes.length,
      CANONICAL: 0,
      LEGACY: 0,
      REDIRECT: 0,
      RETIRED: 0,
      PLANNED: 0,
      missingPermission: 0,
      missingOwner: 0,
    };
    for (const r of routes) {
      s[r.canonical_status] = (s[r.canonical_status] ?? 0) + 1;
      if (!r.requires_permission) s.missingPermission += 1;
      if (!r.owner_team) s.missingOwner += 1;
    }
    return s;
  }, [routes]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, admin_domain: domains[0]?.domain_code ?? '' });
    setDialogOpen(true);
  }

  function openEdit(route: AdminRouteRegistryEntry) {
    setEditing(route);
    setForm({
      route_path: route.route_path,
      page_name: route.page_name,
      admin_domain: route.admin_domain,
      canonical_status: route.canonical_status,
      replacement_route: route.replacement_route ?? '',
      owner_module_code: route.owner_module_code,
      owner_team: route.owner_team ?? '',
      description: route.description ?? '',
      page_component: route.page_component ?? '',
      source_file_path: route.source_file_path ?? '',
      requires_permission: route.requires_permission ?? '',
      show_in_platform_admin: route.show_in_platform_admin,
      display_order: route.display_order ?? 100,
      notes: route.notes ?? '',
      is_active: route.is_active,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    const errors = validateAdminRouteFormValues(form);
    if (errors.length) {
      toast.error(errors[0]);
      return;
    }
    const payload: AdminRouteFormValues = {
      ...form,
      replacement_route: form.replacement_route?.trim() || null,
      owner_team: form.owner_team?.trim() || null,
      description: form.description?.trim() || null,
      page_component: form.page_component?.trim() || null,
      source_file_path: form.source_file_path?.trim() || null,
      requires_permission: form.requires_permission?.trim() || null,
      notes: form.notes?.trim() || null,
    };
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, payload });
        toast.success('Route updated');
      } else {
        await createMut.mutateAsync(payload);
        toast.success('Route created');
      }
      setDialogOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Save failed');
    }
  }

  async function handleToggleActive(route: AdminRouteRegistryEntry) {
    try {
      if (route.is_active) {
        await deactivateMut.mutateAsync(route.id);
        toast.success('Route deactivated');
      } else {
        await reactivateMut.mutateAsync(route.id);
        toast.success('Route reactivated');
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'Action failed');
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Administration Route Registry"
        subtitle="Govern canonical, legacy, redirect, retired, and planned Administration routes."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Administration', href: '/admin/platform' },
          { label: 'Route Registry' },
        ]}
      />

      {/* Summary cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
        <SummaryCard label="Total Routes" value={summary.total} />
        <SummaryCard label="Canonical" value={summary.CANONICAL} tone="success" />
        <SummaryCard label="Legacy" value={summary.LEGACY} tone="warning" />
        <SummaryCard label="Redirect" value={summary.REDIRECT} tone="info" />
        <SummaryCard label="Retired" value={summary.RETIRED} />
        <SummaryCard label="Planned" value={summary.PLANNED} tone="primary" />
        <SummaryCard label="Missing Permissions" value={summary.missingPermission} tone="destructive" />
        <SummaryCard label="Missing Owners" value={summary.missingOwner} tone="destructive" />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <Label className="text-xs">Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Route path or page name"
                value={filters.search ?? ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Domain</Label>
            <Select
              value={filters.admin_domain ?? 'all'}
              onValueChange={(v) =>
                setFilters({ ...filters, admin_domain: v === 'all' ? undefined : v })
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Domains</SelectItem>
                {domains.map((d) => (
                  <SelectItem key={d.domain_code} value={d.domain_code}>
                    {d.domain_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select
              value={filters.canonical_status ?? 'all'}
              onValueChange={(v) =>
                setFilters({
                  ...filters,
                  canonical_status: v === 'all' ? undefined : (v as AdminRouteStatus),
                })
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {ADMIN_ROUTE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Owner Module</Label>
            <Input
              value={filters.owner_module_code ?? ''}
              onChange={(e) =>
                setFilters({ ...filters, owner_module_code: e.target.value || undefined })
              }
              placeholder="e.g. CORE"
            />
          </div>
          <div className="flex items-center gap-2 mt-6">
            <Switch
              checked={filters.is_active === true}
              onCheckedChange={(v) => setFilters({ ...filters, is_active: v ? true : undefined })}
            />
            <Label className="text-xs">Active only</Label>
          </div>
          <div className="flex items-center gap-2 mt-6">
            <Switch
              checked={filters.show_in_platform_admin === true}
              onCheckedChange={(v) =>
                setFilters({ ...filters, show_in_platform_admin: v ? true : undefined })
              }
            />
            <Label className="text-xs">Shown in Platform Admin</Label>
          </div>
          <div className="flex items-center gap-2 mt-6">
            <Switch
              checked={!!filters.missing_permission}
              onCheckedChange={(v) =>
                setFilters({ ...filters, missing_permission: v || undefined })
              }
            />
            <Label className="text-xs">Missing permission</Label>
          </div>
          <div className="flex items-center gap-2 mt-6">
            <Switch
              checked={!!filters.missing_replacement}
              onCheckedChange={(v) =>
                setFilters({ ...filters, missing_replacement: v || undefined })
              }
            />
            <Label className="text-xs">Missing replacement</Label>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Routes</CardTitle>
          <Button onClick={openCreate} size="sm">
            <Plus className="mr-1 h-4 w-4" /> New Route
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route Path</TableHead>
                <TableHead>Page Name</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Replacement</TableHead>
                <TableHead>Owner Module</TableHead>
                <TableHead>Permission</TableHead>
                <TableHead>In Platform Admin</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-6">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : routes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-6">
                    No routes match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                routes.map((r) => (
                  <TableRow key={r.id} className={cn(!r.is_active && 'opacity-60')}>
                    <TableCell className="font-mono text-xs">{r.route_path}</TableCell>
                    <TableCell>{r.page_name}</TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{r.admin_domain}</span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                          STATUS_BADGE[r.canonical_status],
                        )}
                      >
                        {r.canonical_status}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.replacement_route ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>{r.owner_module_code}</TableCell>
                    <TableCell className="text-xs">
                      {r.requires_permission ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>{r.show_in_platform_admin ? 'Yes' : 'No'}</TableCell>
                    <TableCell>{r.is_active ? 'Yes' : 'No'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleToggleActive(r)}
                          title={r.is_active ? 'Deactivate' : 'Reactivate'}
                        >
                          {r.is_active ? (
                            <PowerOff className="h-4 w-4 text-destructive" />
                          ) : (
                            <Power className="h-4 w-4 text-success" />
                          )}
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

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Route' : 'New Route'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Route Path *">
              <Input
                value={form.route_path}
                onChange={(e) => setForm({ ...form, route_path: e.target.value })}
                placeholder="/admin/..."
              />
            </Field>
            <Field label="Page Name *">
              <Input
                value={form.page_name}
                onChange={(e) => setForm({ ...form, page_name: e.target.value })}
              />
            </Field>
            <Field label="Admin Domain *">
              <Select
                value={form.admin_domain}
                onValueChange={(v) => setForm({ ...form, admin_domain: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select domain" /></SelectTrigger>
                <SelectContent>
                  {domains.map((d) => (
                    <SelectItem key={d.domain_code} value={d.domain_code}>
                      {d.domain_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Canonical Status *">
              <Select
                value={form.canonical_status}
                onValueChange={(v) =>
                  setForm({ ...form, canonical_status: v as AdminRouteStatus })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ADMIN_ROUTE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              label={
                form.canonical_status === 'REDIRECT'
                  ? 'Replacement Route *'
                  : 'Replacement Route'
              }
            >
              <Input
                value={form.replacement_route ?? ''}
                onChange={(e) => setForm({ ...form, replacement_route: e.target.value })}
                placeholder="/admin/..."
              />
            </Field>
            <Field label="Owner Module Code *">
              <Input
                value={form.owner_module_code}
                onChange={(e) => setForm({ ...form, owner_module_code: e.target.value })}
              />
            </Field>
            <Field label="Owner Team">
              <Input
                value={form.owner_team ?? ''}
                onChange={(e) => setForm({ ...form, owner_team: e.target.value })}
              />
            </Field>
            <Field label="Required Permission">
              <Input
                value={form.requires_permission ?? ''}
                onChange={(e) => setForm({ ...form, requires_permission: e.target.value })}
                placeholder="e.g. core.admin.route_registry.view"
              />
            </Field>
            <Field label="Page Component">
              <Input
                value={form.page_component ?? ''}
                onChange={(e) => setForm({ ...form, page_component: e.target.value })}
              />
            </Field>
            <Field label="Source File Path">
              <Input
                value={form.source_file_path ?? ''}
                onChange={(e) => setForm({ ...form, source_file_path: e.target.value })}
              />
            </Field>
            <Field label="Display Order">
              <Input
                type="number"
                value={form.display_order ?? 100}
                onChange={(e) =>
                  setForm({ ...form, display_order: Number(e.target.value) || 0 })
                }
              />
            </Field>
            <div className="flex items-center gap-6 md:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.show_in_platform_admin}
                  onCheckedChange={(v) => setForm({ ...form, show_in_platform_admin: v })}
                />
                Show in Platform Admin
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
                Active
              </label>
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Description</Label>
              <Textarea
                rows={2}
                value={form.description ?? ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Notes</Label>
              <Textarea
                rows={2}
                value={form.notes ?? ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
              {editing ? 'Save Changes' : 'Create Route'}
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

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'success' | 'warning' | 'info' | 'primary' | 'destructive';
}) {
  const toneClass =
    tone === 'success'
      ? 'text-success'
      : tone === 'warning'
      ? 'text-warning'
      : tone === 'info'
      ? 'text-info'
      : tone === 'primary'
      ? 'text-primary'
      : tone === 'destructive'
      ? 'text-destructive'
      : 'text-foreground';
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={cn('text-2xl font-semibold', toneClass)}>{value}</div>
      </CardContent>
    </Card>
  );
}
