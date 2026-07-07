/**
 * Epic OM-7 — Configuration Center v2 (Guided Settings Assignment).
 *
 * Replaces the raw-JSON-first editor with a guided experience:
 *   - Tabs: Overview · Guided Assignments · Test Resolve · Conflicts & Health · Advanced / Legacy
 *   - Guided form builds scope_ref / resource_ref / rule_set from typed inputs
 *   - Advanced JSON stays behind a Show technical details toggle, gated by
 *     core.admin.org.configuration.manage
 *   - Test Resolve delegates to OM-6 resolveEffectiveSettingsBundle
 *   - Every mutation and Test Resolve is audited via OM-7 event codes
 *
 * Backwards-compatible: existing raw core_configuration_assignment rows are
 * preserved and shown in the Advanced / Legacy tab; nothing is deleted.
 * Both /admin/org/configuration-center and
 * /admin/template-management/configuration-center continue to route here.
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Play, CheckCircle2, XCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { SCOPE_PRECEDENCE, type ScopeLevel, type AssignmentRow } from '@/lib/configuration/resolver';
import { OrgActionGate, useOrgAction, assertOrgAction, ORG_PERMS } from '@/platform/organization/orgActionPermissions';
import {
  GUIDED_SETTING_KEYS,
  SCOPE_LEVEL_LABEL,
  SCOPE_REQUIRED_KEYS,
  findGuidedKey,
  getAssignments,
  createGuidedAssignment,
  updateGuidedAssignment,
  deactivateAssignment,
  reactivateAssignment,
  getConfigurationHealth,
  testResolve,
  loadResourceOptions,
  isLegacyAssignment,
  logAdvancedView,
  type GuidedAssignmentInput,
  type ConfigResourceType,
  type ResourceOption,
} from '@/platform/configuration-center';
import type { EffectiveSettingsBundle, EffectiveSettingsContext } from '@/platform/organization-settings';

const ASSIGN_QK = ['config_center_v2', 'assignments'] as const;
const HEALTH_QK = ['config_center_v2', 'health'] as const;

function ConfigurationCenterPageInner() {
  const qc = useQueryClient();
  const { allowed: canManage } = useOrgAction(ORG_PERMS.configuration.manage);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ASSIGN_QK,
    queryFn: () => getAssignments(),
  });
  const { data: health, refetch: refetchHealth } = useQuery({
    queryKey: HEALTH_QK,
    queryFn: () => getConfigurationHealth(),
  });

  const guidedRows = rows.filter((r) => !isLegacyAssignment(r));
  const legacyRows = rows.filter(isLegacyAssignment);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ASSIGN_QK });
    void refetchHealth();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold">Configuration Center</h2>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Assign templates, letterheads, signatures, channels and other communication defaults by scope.
            More specific settings override broader defaults — for example, a Department setting overrides an
            Organization default.
          </p>
        </div>
        <OrgActionGate permission={ORG_PERMS.configuration.manage}>
          <GuidedAssignmentDialog onSaved={invalidate} />
        </OrgActionGate>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="guided">Guided Assignments</TabsTrigger>
          <TabsTrigger value="test">Test Resolve</TabsTrigger>
          <TabsTrigger value="health">Conflicts & Health</TabsTrigger>
          <TabsTrigger value="advanced">Advanced / Legacy</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <StatCard label="Total assignments" value={rows.length} />
            <StatCard label="Active" value={rows.filter((r) => r.is_active).length} />
            <StatCard label="Legacy / Advanced" value={legacyRows.length} />
            <StatCard label="Conflicts" value={health?.conflicts.length ?? 0}
              tone={(health?.conflicts.length ?? 0) > 0 ? 'warn' : 'ok'} />
          </div>
          <Card className="mt-3">
            <CardHeader><CardTitle className="text-base">Scope precedence (most specific wins)</CardTitle></CardHeader>
            <CardContent>
              <ol className="text-sm space-y-1 list-decimal pl-6">
                {SCOPE_PRECEDENCE.map((t) => (
                  <li key={t}><span className="font-medium">{SCOPE_LEVEL_LABEL[t]}</span>
                    <span className="text-muted-foreground ml-2 font-mono text-xs">{t}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guided" className="pt-4">
          <GuidedAssignmentsTable rows={guidedRows} loading={isLoading} onChanged={invalidate} canManage={canManage} />
        </TabsContent>

        <TabsContent value="test" className="pt-4">
          <TestResolvePanel />
        </TabsContent>

        <TabsContent value="health" className="pt-4">
          <ConflictsPanel conflicts={health?.conflicts ?? []} onRefresh={() => void refetchHealth()} />
        </TabsContent>

        <TabsContent value="advanced" className="pt-4">
          <AdvancedLegacyPanel rows={legacyRows} canManage={canManage} onChanged={invalidate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// -------------------- helpers --------------------

function StatCard({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'ok' | 'warn' }) {
  const toneClass = tone === 'warn' ? 'text-destructive' : tone === 'ok' ? 'text-emerald-600' : '';
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className={`text-2xl font-semibold mt-1 ${toneClass}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function fmtScopeTarget(row: AssignmentRow): string {
  const ref = row.scope_ref ?? {};
  const keys = SCOPE_REQUIRED_KEYS[row.scope_level] ?? [];
  if (keys.length === 0) return SCOPE_LEVEL_LABEL[row.scope_level];
  return keys.map((k) => (ref as any)[k] ?? '—').join(' / ');
}

// -------------------- Guided table --------------------

function GuidedAssignmentsTable({
  rows, loading, onChanged, canManage,
}: { rows: AssignmentRow[]; loading: boolean; onChanged: () => void; canManage: boolean }) {
  const [editRow, setEditRow] = useState<AssignmentRow | null>(null);

  const handleToggle = async (row: AssignmentRow) => {
    try {
      assertOrgAction({ allowed: canManage, permission: ORG_PERMS.configuration.manage, actionLabel: row.is_active ? 'deactivate assignment' : 'reactivate assignment' });
      if (row.is_active) await deactivateAssignment(row.id);
      else await reactivateAssignment(row.id);
      toast.success('Assignment updated');
      onChanged();
    } catch (e: any) {
      if (e?.message) toast.error('Failed to update', { description: e.message });
    }
  };

  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading assignments…</div>;
  if (rows.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>No guided assignments yet.</AlertTitle>
        <AlertDescription>
          Click <b>New Assignment</b> to assign a default template, letterhead, signature or other setting
          to the organisation, a department, a location, or a workflow.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table sticky>
              <TableHeader>
                <TableRow>
                  <TableHead>Setting</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Applies To</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Effective</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const settingKey = (r.rule_set as any)?.setting_key ?? '—';
                  const key = findGuidedKey(settingKey);
                  const ref = r.resource_ref as any;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{key?.label ?? settingKey}</div>
                        <div className="text-xs text-muted-foreground">{r.resource_type}</div>
                      </TableCell>
                      <TableCell>{SCOPE_LEVEL_LABEL[r.scope_level]}</TableCell>
                      <TableCell className="text-xs">{fmtScopeTarget(r)}</TableCell>
                      <TableCell className="text-xs">{ref?.name ?? ref?.code ?? ref?.id ?? '—'}</TableCell>
                      <TableCell>{r.priority}</TableCell>
                      <TableCell className="text-xs">
                        {r.effective_from ?? '—'} → {r.effective_to ?? '∞'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.is_active ? 'default' : 'secondary'}>
                          {r.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <OrgActionGate permission={ORG_PERMS.configuration.manage}>
                          <Button size="sm" variant="outline" onClick={() => setEditRow(r)}>Edit</Button>
                        </OrgActionGate>
                        <OrgActionGate permission={ORG_PERMS.configuration.manage}>
                          <Button size="sm" variant="ghost" onClick={() => handleToggle(r)}>
                            {r.is_active ? 'Deactivate' : 'Reactivate'}
                          </Button>
                        </OrgActionGate>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {editRow && (
        <GuidedAssignmentDialog
          initial={editRow}
          openControlled={true}
          onOpenChange={(o) => !o && setEditRow(null)}
          onSaved={() => { setEditRow(null); onChanged(); }}
        />
      )}
    </>
  );
}

// -------------------- Guided form dialog --------------------

interface DialogProps {
  onSaved: () => void;
  initial?: AssignmentRow | null;
  openControlled?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function GuidedAssignmentDialog({ onSaved, initial, openControlled, onOpenChange }: DialogProps) {
  const [openInner, setOpenInner] = useState(false);
  const open = openControlled ?? openInner;
  const setOpen = (v: boolean) => { onOpenChange ? onOpenChange(v) : setOpenInner(v); };

  const initialSettingKey =
    (initial?.rule_set as any)?.setting_key ??
    GUIDED_SETTING_KEYS.find((k) => k.status === 'AVAILABLE')!.key;

  const [settingKey, setSettingKey] = useState<string>(initialSettingKey);
  const key = findGuidedKey(settingKey);
  const [scopeLevel, setScopeLevel] = useState<ScopeLevel>(initial?.scope_level ?? 'ORG');
  const [scopeRef, setScopeRef] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(initial?.scope_ref ?? {}).map(([k, v]) => [k, String(v ?? '')])),
  );
  const [resourceId, setResourceId] = useState<string>((initial?.resource_ref as any)?.id ?? '');
  const [priority, setPriority] = useState<number>(initial?.priority ?? 0);
  const [effectiveFrom, setEffectiveFrom] = useState<string>(initial?.effective_from ?? '');
  const [effectiveTo, setEffectiveTo] = useState<string>(initial?.effective_to ?? '');
  const [isActive, setIsActive] = useState<boolean>(initial?.is_active ?? true);
  const [description, setDescription] = useState<string>((initial?.rule_set as any)?.description ?? '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);

  const { allowed: canAdvanced } = useOrgAction(ORG_PERMS.configuration.manage);

  const requiredScopeKeys = SCOPE_REQUIRED_KEYS[scopeLevel] ?? [];

  const { data: resourceOptions = [] } = useQuery({
    queryKey: ['config_center_v2', 'resources', key?.resourceType ?? 'none'],
    queryFn: () => key ? loadResourceOptions(key.resourceType) : Promise.resolve([]),
    enabled: !!key && open,
  });
  const selectedResource: ResourceOption | undefined = resourceOptions.find((r) => r.id === resourceId);

  const submit = async () => {
    if (!key) return;
    setSaving(true);
    try {
      const input: GuidedAssignmentInput = {
        settingKey,
        resourceType: key.resourceType,
        scopeLevel,
        scopeRef: Object.fromEntries(Object.entries(scopeRef).filter(([, v]) => v.trim() !== '')),
        resourceId,
        resourceCode: selectedResource?.code ?? null,
        resourceName: selectedResource?.name ?? null,
        resourceIsActive: selectedResource?.isActive,
        priority,
        effectiveFrom: effectiveFrom || null,
        effectiveTo: effectiveTo || null,
        isActive,
        description: description || null,
      };
      if (initial?.id) await updateGuidedAssignment(initial.id, input);
      else await createGuidedAssignment(input);
      toast.success(initial ? 'Assignment updated' : 'Assignment created');
      setOpen(false);
      onSaved();
    } catch (e: any) {
      toast.error('Could not save assignment', { description: e?.message ?? 'Please check the fields.' });
    } finally { setSaving(false); }
  };

  const dialogTrigger = !openControlled ? (
    <DialogTrigger asChild>
      <Button size="sm"><Plus className="h-4 w-4" /> New Assignment</Button>
    </DialogTrigger>
  ) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {dialogTrigger}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit assignment' : 'New assignment'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Setting</Label>
            <Select value={settingKey} onValueChange={(v) => { setSettingKey(v); setResourceId(''); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {GUIDED_SETTING_KEYS.map((k) => (
                  <SelectItem key={k.key} value={k.key} disabled={k.status === 'PLANNED'}>
                    {k.label} {k.status !== 'AVAILABLE' && <span className="text-xs text-muted-foreground ml-1">({k.status.toLowerCase()}{k.plannedIn ? ` – ${k.plannedIn}` : ''})</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {key?.note && <p className="text-xs text-muted-foreground mt-1">{key.note}</p>}
          </div>

          <div>
            <Label>Resource type</Label>
            <Input value={key?.resourceType ?? ''} disabled className="font-mono text-xs" />
          </div>
          <div>
            <Label>Scope level</Label>
            <Select value={scopeLevel} onValueChange={(v) => { setScopeLevel(v as ScopeLevel); setScopeRef({}); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SCOPE_PRECEDENCE.map((t) => <SelectItem key={t} value={t}>{SCOPE_LEVEL_LABEL[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {requiredScopeKeys.length > 0 && (
            <div className="col-span-2 border rounded-md p-3 space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Applies to</div>
              {requiredScopeKeys.map((k) => (
                <div key={k}>
                  <Label className="text-xs capitalize">{k.replace(/_/g, ' ')}</Label>
                  <Input
                    value={scopeRef[k] ?? ''}
                    onChange={(e) => setScopeRef((prev) => ({ ...prev, [k]: e.target.value }))}
                    placeholder={`Enter ${k}`}
                  />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                {SCOPE_LEVEL_LABEL[scopeLevel]} scope requires the field(s) above.
              </p>
            </div>
          )}

          <div className="col-span-2">
            <Label>Selected resource</Label>
            <Select value={resourceId} onValueChange={setResourceId}>
              <SelectTrigger><SelectValue placeholder={resourceOptions.length === 0 ? 'No selector available for this resource type' : 'Select a resource'} /></SelectTrigger>
              <SelectContent>
                {resourceOptions.map((r) => (
                  <SelectItem key={r.id} value={r.id} disabled={!r.isActive}>
                    {r.name}{r.code ? ` (${r.code})` : ''}{!r.isActive ? ' — inactive' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {resourceOptions.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                A selector for this resource type is not yet available. Save is prevented until one is provided.
              </p>
            )}
          </div>

          <div>
            <Label>Priority</Label>
            <Input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={isActive ? 'active' : 'inactive'} onValueChange={(v) => setIsActive(v === 'active')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Effective from</Label>
            <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
          </div>
          <div>
            <Label>Effective to</Label>
            <Input type="date" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Description</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional — explain why this override exists." />
          </div>

          {canAdvanced && (
            <div className="col-span-2 border rounded-md">
              <button
                type="button"
                className="w-full flex items-center justify-between px-3 py-2 text-sm"
                onClick={() => setShowAdvanced((s) => !s)}
              >
                <span className="font-medium">Show technical details</span>
                {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {showAdvanced && (
                <div className="p-3 space-y-2 text-xs">
                  <div><span className="text-muted-foreground">scope_ref:</span> <code className="break-all">{JSON.stringify(scopeRef)}</code></div>
                  <div><span className="text-muted-foreground">resource_ref:</span> <code className="break-all">{JSON.stringify({ id: resourceId, code: selectedResource?.code ?? null, name: selectedResource?.name ?? null })}</code></div>
                  <div><span className="text-muted-foreground">rule_set:</span> <code className="break-all">{JSON.stringify({ setting_key: settingKey, guided: true, description })}</code></div>
                  <p className="text-muted-foreground">Raw JSON editing is disabled by default. To modify a legacy row directly, use the Advanced / Legacy tab.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !resourceId || key?.status === 'PLANNED'}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} {initial ? 'Save changes' : 'Create assignment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -------------------- Test Resolve panel (OM-6) --------------------

function TestResolvePanel() {
  const [ctx, setCtx] = useState<EffectiveSettingsContext>({});
  const [bundle, setBundle] = useState<EffectiveSettingsBundle | null>(null);
  const [running, setRunning] = useState(false);
  const { allowed: canManage } = useOrgAction(ORG_PERMS.configuration.manage);
  const [showTrace, setShowTrace] = useState(false);

  const run = async () => {
    setRunning(true);
    try {
      const b = await testResolve(ctx);
      setBundle(b);
    } catch (e: any) {
      toast.error('Test Resolve failed', { description: e?.message });
    } finally { setRunning(false); }
  };

  const fields: (keyof EffectiveSettingsContext)[] = [
    'moduleCode', 'departmentCode', 'locationId',
    'workflowCode', 'workflowStageCode', 'businessEventCode',
    'recipientType', 'languageCode', 'userId', 'organizationId',
  ];

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Test Resolve — uses the OM-6 canonical resolver</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Preview which setting values would apply at runtime for a given context. Effective values are
          computed by <code>resolveEffectiveSettingsBundle</code> — identical to what business modules use.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {fields.map((f) => (
            <div key={f}>
              <Label className="capitalize text-xs">{f.replace(/([A-Z])/g, ' $1')}</Label>
              <Input value={(ctx as any)[f] ?? ''} onChange={(e) => setCtx((c) => ({ ...c, [f]: e.target.value }))} />
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button onClick={run} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Resolve
          </Button>
        </div>

        {bundle && (
          <div className="space-y-2">
            <div className="text-sm">
              {bundle.warnings.length === 0
                ? <span className="text-emerald-600 inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Resolved cleanly.</span>
                : <span className="text-amber-600 inline-flex items-center gap-1"><Info className="h-4 w-4" /> {bundle.warnings.length} warning(s).</span>}
              {bundle.missingConfiguration.length > 0 && (
                <span className="ml-3 text-destructive inline-flex items-center gap-1">
                  <XCircle className="h-4 w-4" /> {bundle.missingConfiguration.length} missing configuration
                </span>
              )}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Setting</TableHead>
                  <TableHead>Effective value</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Inheritance</TableHead>
                  <TableHead>Health</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bundle.ordered.map((s) => (
                  <TableRow key={s.key}>
                    <TableCell className="text-xs">
                      <div className="font-medium">{s.label}</div>
                      {s.warnings.length > 0 && <div className="text-xs text-amber-600 mt-1">{s.warnings.join(' · ')}</div>}
                    </TableCell>
                    <TableCell className="text-xs">{s.effectiveLabel}</TableCell>
                    <TableCell className="text-xs">{s.sourceLabel}</TableCell>
                    <TableCell className="text-xs">{s.inheritanceMode}</TableCell>
                    <TableCell>
                      <Badge variant={s.health === 'OK' ? 'default' : s.health === 'WARN' ? 'secondary' : 'destructive'}>
                        {s.health}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {canManage && (
              <div>
                <Button variant="ghost" size="sm" onClick={() => setShowTrace((s) => !s)}>
                  {showTrace ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />} Advanced resolver trace
                </Button>
                {showTrace && (
                  <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-80">
                    {JSON.stringify(bundle.ordered.map((s) => ({ key: s.key, source: s.source, chain: s.fallbackChain })), null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// -------------------- Conflicts / Health --------------------

function ConflictsPanel({ conflicts, onRefresh }: { conflicts: any[]; onRefresh: () => void }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Conflicts & Health</CardTitle>
        <Button size="sm" variant="outline" onClick={onRefresh}>Refresh</Button>
      </CardHeader>
      <CardContent>
        {conflicts.length === 0 ? (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>No conflicts detected.</AlertTitle>
            <AlertDescription>All active assignments have valid scope targets, active resources, and no duplicates.</AlertDescription>
          </Alert>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Setting</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conflicts.map((c, i) => (
                <TableRow key={i}>
                  <TableCell><Badge variant="destructive">{c.type}</Badge></TableCell>
                  <TableCell className="text-xs">{c.settingKey ?? '—'}</TableCell>
                  <TableCell className="text-xs">{SCOPE_LEVEL_LABEL[c.scopeLevel as ScopeLevel] ?? c.scopeLevel}</TableCell>
                  <TableCell className="text-xs">{c.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// -------------------- Advanced / Legacy --------------------

function AdvancedLegacyPanel({ rows, canManage, onChanged }: { rows: AssignmentRow[]; canManage: boolean; onChanged: () => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const view = async (row: AssignmentRow) => {
    setExpandedId((id) => (id === row.id ? null : row.id));
    if (canManage) await logAdvancedView(row.id);
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Legacy / Advanced assignments</CardTitle></CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          Rows created before Configuration Center v2, or that use fields not represented by the guided form.
          These remain functional. Editing raw JSON requires <code>core.admin.org.configuration.manage</code>.
        </p>
        {rows.length === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>No legacy assignments.</AlertTitle>
          </Alert>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="border rounded-md">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2 text-sm"
                  onClick={() => view(r)}
                >
                  <div className="text-left">
                    <div className="font-medium">
                      {r.domain} · {r.resource_type} · {SCOPE_LEVEL_LABEL[r.scope_level]}
                    </div>
                    <div className="text-xs text-muted-foreground">Legacy assignment — requires review</div>
                  </div>
                  <Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? 'Active' : 'Inactive'}</Badge>
                </button>
                {expandedId === r.id && canManage && (
                  <div className="p-3 space-y-2 text-xs bg-muted/50 border-t">
                    <div><b>scope_ref:</b> <code className="break-all">{JSON.stringify(r.scope_ref)}</code></div>
                    <div><b>resource_ref:</b> <code className="break-all">{JSON.stringify(r.resource_ref)}</code></div>
                    <div><b>rule_set:</b> <code className="break-all">{JSON.stringify(r.rule_set)}</code></div>
                    <div><b>business_event:</b> <code>{r.business_event ?? '*'}</code> · <b>priority:</b> {r.priority}</div>
                  </div>
                )}
                {expandedId === r.id && !canManage && (
                  <div className="p-3 text-xs text-muted-foreground border-t">
                    Advanced technical details are only visible to users with configuration.manage permission.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ConfigurationCenterPage() {
  return (
    <PermissionWrapper moduleName="organization_management">
      <ConfigurationCenterPageInner />
    </PermissionWrapper>
  );
}
