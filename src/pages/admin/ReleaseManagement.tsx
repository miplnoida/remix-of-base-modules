import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2, Shield, Rocket, Flag, Package, History, Users, Plus, RefreshCw, Eye, EyeOff, Lock } from 'lucide-react';
import { toast } from 'sonner';
import {
  useModuleRolloutControls, useUpdateModuleRollout,
  useFeatureFlags, useUpdateFeatureFlag, useCreateFeatureFlag,
  useReleaseRegistry, useCreateRelease, useUpdateRelease,
  useMigrationLogs,
  useConfigPromotionPacks,
  useUserProvisioningLogs,
  type RolloutState,
  type ReleaseState,
} from '@/hooks/useReleaseManagement';

const ROLLOUT_BADGES: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  hidden: { variant: 'destructive', label: 'Hidden' },
  internal_pilot: { variant: 'secondary', label: 'Internal Pilot' },
  public: { variant: 'default', label: 'Public' },
};

const RELEASE_BADGES: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  planned: { variant: 'outline', label: 'Planned' },
  deploying: { variant: 'secondary', label: 'Deploying' },
  deployed: { variant: 'secondary', label: 'Deployed' },
  validated: { variant: 'default', label: 'Validated' },
  active: { variant: 'default', label: 'Active' },
  rolled_back: { variant: 'destructive', label: 'Rolled Back' },
};

function RolloutBadge({ state }: { state: string }) {
  const b = ROLLOUT_BADGES[state] || { variant: 'outline' as const, label: state };
  return <Badge variant={b.variant}>{b.label}</Badge>;
}

function ReleaseBadge({ state }: { state: string }) {
  const b = RELEASE_BADGES[state] || { variant: 'outline' as const, label: state };
  return <Badge variant={b.variant}>{b.label}</Badge>;
}

// ─── Module Rollout Tab ───
function ModuleRolloutTab() {
  const { data: modules = [], isLoading } = useModuleRolloutControls();
  const updateMutation = useUpdateModuleRollout();

  const handleRolloutChange = (id: string, rollout_state: RolloutState) => {
    updateMutation.mutate({ id, updates: { rollout_state } });
  };

  const handleToggle = (id: string, field: 'routes_enabled' | 'actions_enabled' | 'internal_only', value: boolean) => {
    updateMutation.mutate({ id, updates: { [field]: value } });
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Module Rollout Controls</CardTitle>
        <CardDescription>Control visibility and access for each module across environments</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Module</TableHead>
              <TableHead>Rollout State</TableHead>
              <TableHead>Routes</TableHead>
              <TableHead>Actions</TableHead>
              <TableHead>Internal Only</TableHead>
              <TableHead>Version</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div>
                    <span className="font-medium">{m.display_name}</span>
                    <span className="text-xs text-muted-foreground ml-2">({m.name})</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Select value={m.rollout_state} onValueChange={(v) => handleRolloutChange(m.id, v as RolloutState)}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hidden"><div className="flex items-center gap-2"><EyeOff className="h-3 w-3" />Hidden</div></SelectItem>
                      <SelectItem value="internal_pilot"><div className="flex items-center gap-2"><Eye className="h-3 w-3" />Internal Pilot</div></SelectItem>
                      <SelectItem value="public"><div className="flex items-center gap-2"><Rocket className="h-3 w-3" />Public</div></SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell><Switch checked={m.routes_enabled} onCheckedChange={(v) => handleToggle(m.id, 'routes_enabled', v)} /></TableCell>
                <TableCell><Switch checked={m.actions_enabled} onCheckedChange={(v) => handleToggle(m.id, 'actions_enabled', v)} /></TableCell>
                <TableCell><Switch checked={m.internal_only} onCheckedChange={(v) => handleToggle(m.id, 'internal_only', v)} /></TableCell>
                <TableCell><span className="text-sm text-muted-foreground">{m.release_version || '—'}</span></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Feature Flags Tab ───
function FeatureFlagsTab() {
  const { data: flags = [], isLoading } = useFeatureFlags();
  const updateMutation = useUpdateFeatureFlag();
  const createMutation = useCreateFeatureFlag();
  const [showCreate, setShowCreate] = useState(false);
  const [newFlag, setNewFlag] = useState({ flag_key: '', display_name: '', description: '' });

  const handleCreate = () => {
    if (!newFlag.flag_key || !newFlag.display_name) {
      toast.error('Flag key and name are required');
      return;
    }
    createMutation.mutate({
      flag_key: newFlag.flag_key,
      display_name: newFlag.display_name,
      description: newFlag.description || null,
      module_id: null,
      is_enabled: false,
      rollout_state: 'hidden' as RolloutState,
      pilot_user_ids: [],
      pilot_role_ids: [],
    }, {
      onSuccess: () => {
        setShowCreate(false);
        setNewFlag({ flag_key: '', display_name: '', description: '' });
      },
    });
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Flag className="h-5 w-5" />Feature Flags</CardTitle>
            <CardDescription>Granular feature-level activation controls</CardDescription>
          </div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />New Flag</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Feature Flag</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Flag Key</Label><Input placeholder="e.g. new_dashboard_v2" value={newFlag.flag_key} onChange={(e) => setNewFlag(p => ({ ...p, flag_key: e.target.value }))} /></div>
                <div><Label>Display Name</Label><Input placeholder="e.g. New Dashboard V2" value={newFlag.display_name} onChange={(e) => setNewFlag(p => ({ ...p, display_name: e.target.value }))} /></div>
                <div><Label>Description</Label><Textarea value={newFlag.description} onChange={(e) => setNewFlag(p => ({ ...p, description: e.target.value }))} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Flag</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead>Rollout</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flags.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No feature flags created yet</TableCell></TableRow>
            )}
            {flags.map((f) => (
              <TableRow key={f.id}>
                <TableCell>
                  <div>
                    <span className="font-medium">{f.display_name}</span>
                    <span className="text-xs text-muted-foreground block">{f.flag_key}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Switch checked={f.is_enabled} onCheckedChange={(v) => updateMutation.mutate({ id: f.id, updates: { is_enabled: v } })} />
                </TableCell>
                <TableCell>
                  <Select value={f.rollout_state} onValueChange={(v) => updateMutation.mutate({ id: f.id, updates: { rollout_state: v as RolloutState } })}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hidden">Hidden</SelectItem>
                      <SelectItem value="internal_pilot">Internal Pilot</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(f.updated_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Release Registry Tab ───
function ReleaseRegistryTab() {
  const { data: releases = [], isLoading } = useReleaseRegistry();
  const createMutation = useCreateRelease();
  const updateMutation = useUpdateRelease();
  const [showCreate, setShowCreate] = useState(false);
  const [newRelease, setNewRelease] = useState({ release_name: '', module_name: '', code_version: '', release_notes: '' });

  const handleCreate = () => {
    if (!newRelease.release_name) { toast.error('Release name required'); return; }
    createMutation.mutate({
      release_name: newRelease.release_name,
      module_name: newRelease.module_name || null,
      code_version: newRelease.code_version || null,
      release_state: 'planned' as ReleaseState,
      release_notes: newRelease.release_notes || null,
    }, { onSuccess: () => { setShowCreate(false); setNewRelease({ release_name: '', module_name: '', code_version: '', release_notes: '' }); } });
  };

  const handleStateChange = (id: string, newState: ReleaseState) => {
    const updates: Record<string, any> = { release_state: newState };
    if (newState === 'deployed') updates.applied_at = new Date().toISOString();
    if (newState === 'validated') updates.validated_at = new Date().toISOString();
    if (newState === 'active') updates.activated_at = new Date().toISOString();
    updateMutation.mutate({ id, updates });
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" />Release Registry</CardTitle>
            <CardDescription>Track releases across all modules</CardDescription>
          </div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />New Release</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Release</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Release Name</Label><Input placeholder="e.g. v2.4.0 — Compliance Engine" value={newRelease.release_name} onChange={(e) => setNewRelease(p => ({ ...p, release_name: e.target.value }))} /></div>
                <div><Label>Module</Label><Input placeholder="e.g. compliance" value={newRelease.module_name} onChange={(e) => setNewRelease(p => ({ ...p, module_name: e.target.value }))} /></div>
                <div><Label>Code Version</Label><Input placeholder="e.g. 2.4.0" value={newRelease.code_version} onChange={(e) => setNewRelease(p => ({ ...p, code_version: e.target.value }))} /></div>
                <div><Label>Notes</Label><Textarea value={newRelease.release_notes} onChange={(e) => setNewRelease(p => ({ ...p, release_notes: e.target.value }))} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Release</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {releases.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No releases tracked yet</TableCell></TableRow>
            )}
            {releases.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div>
                    <span className="font-medium">{r.release_name}</span>
                    {r.release_notes && <span className="text-xs text-muted-foreground block truncate max-w-[200px]">{r.release_notes}</span>}
                  </div>
                </TableCell>
                <TableCell>{r.module_name || '—'}</TableCell>
                <TableCell>{r.code_version || '—'}</TableCell>
                <TableCell><ReleaseBadge state={r.release_state} /></TableCell>
                <TableCell>
                  <Select value={r.release_state} onValueChange={(v) => handleStateChange(r.id, v as ReleaseState)}>
                    <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="deploying">Deploying</SelectItem>
                      <SelectItem value="deployed">Deployed</SelectItem>
                      <SelectItem value="validated">Validated</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="rolled_back">Rolled Back</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Migration Logs Tab ───
function MigrationLogsTab() {
  const { data: logs = [], isLoading } = useMigrationLogs();

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Migration & Promotion Logs</CardTitle>
        <CardDescription>Audit trail of all schema, config, and provisioning changes</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Environment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Executed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No migration logs yet</TableCell></TableRow>
            )}
            {(logs as any[]).map((l) => (
              <TableRow key={l.id}>
                <TableCell><Badge variant="outline">{l.log_type}</Badge></TableCell>
                <TableCell className="max-w-[300px] truncate">{l.description}</TableCell>
                <TableCell>{l.source_environment} → {l.target_environment}</TableCell>
                <TableCell><Badge variant={l.status === 'completed' ? 'default' : l.status === 'failed' ? 'destructive' : 'secondary'}>{l.status}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{l.executed_at ? new Date(l.executed_at).toLocaleString() : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───
export default function ReleaseManagement() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Rocket className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Release Management</h1>
          <p className="text-muted-foreground">Control deployments, feature activation, and configuration promotion</p>
        </div>
      </div>

      <Tabs defaultValue="modules" className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="modules" className="flex items-center gap-1"><Shield className="h-4 w-4" />Modules</TabsTrigger>
          <TabsTrigger value="flags" className="flex items-center gap-1"><Flag className="h-4 w-4" />Flags</TabsTrigger>
          <TabsTrigger value="releases" className="flex items-center gap-1"><Package className="h-4 w-4" />Releases</TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-1"><History className="h-4 w-4" />Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="modules"><ModuleRolloutTab /></TabsContent>
        <TabsContent value="flags"><FeatureFlagsTab /></TabsContent>
        <TabsContent value="releases"><ReleaseRegistryTab /></TabsContent>
        <TabsContent value="logs"><MigrationLogsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
