/**
 * Reference Data Management — admin screen for BN dropdown / enum master data.
 * Path: /bn/config/reference-data
 *
 * Lets admins:
 *  - Browse all reference groups
 *  - Add / edit / activate-deactivate values
 *  - Reorder values via sort_order
 *  - Mark system-protected values (cannot be deleted)
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Save, Loader2, Lock, ArrowUp, ArrowDown, Trash2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import {
  listReferenceGroups, listReferenceValuesByGroupId, upsertReferenceGroup, upsertReferenceValue,
  setReferenceValueActive, deleteReferenceValue,
  type BnReferenceGroup, type BnReferenceValue,
} from '@/services/bn/referenceDataService';

interface ReferenceDataAdminProps {
  /** Restrict groups to specific module code(s). Undefined = all. */
  moduleCode?: string | string[];
  /** Default module_code for newly-created groups. */
  defaultNewModule?: string;
  title?: string;
  description?: string;
}

export default function ReferenceDataAdmin({ moduleCode, defaultNewModule = 'BN', title, description }: ReferenceDataAdminProps = {}) {
  const { profile } = useSupabaseAuth();
  const userCode = profile?.user_code ?? profile?.email ?? 'system';

  const [groups, setGroups] = useState<BnReferenceGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [values, setValues] = useState<BnReferenceValue[]>([]);
  const [loading, setLoading] = useState(false);

  const [editValue, setEditValue] = useState<Partial<BnReferenceValue> | null>(null);
  const [editGroup, setEditGroup] = useState<Partial<BnReferenceGroup> | null>(null);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('ALL');

  useEffect(() => { void loadGroups(); }, [moduleCode]);
  useEffect(() => { if (selectedGroupId) void loadValues(selectedGroupId); }, [selectedGroupId]);

  async function loadGroups() {
    try {
      setLoading(true);
      const g = await listReferenceGroups({ moduleCode });
      setGroups(g);
      if (!selectedGroupId && g.length) setSelectedGroupId(g[0].id);
    } catch (e: any) {
      toast.error('Could not load reference groups', { description: e.message });
    } finally { setLoading(false); }
  }

  async function loadValues(gid: string) {
    try {
      setLoading(true);
      setValues(await listReferenceValuesByGroupId(gid, { includeInactive: true }));
    } catch (e: any) {
      toast.error('Could not load values', { description: e.message });
    } finally { setLoading(false); }
  }

  const selectedGroup = useMemo(() => groups.find((g) => g.id === selectedGroupId) ?? null, [groups, selectedGroupId]);
  const availableModules = useMemo(() => Array.from(new Set(groups.map((g) => g.module_code))).sort(), [groups]);
  const filteredGroups = useMemo(() => {
    const s = search.trim().toLowerCase();
    return groups.filter((g) => {
      if (moduleFilter !== 'ALL' && g.module_code !== moduleFilter) return false;
      if (!s) return true;
      return g.group_code.toLowerCase().includes(s) || g.group_name.toLowerCase().includes(s);
    });
  }, [groups, search, moduleFilter]);

  async function handleSaveValue() {
    if (!editValue || !selectedGroupId) return;
    if (!editValue.value_code?.trim()) { toast.error('Code is required'); return; }
    if (!editValue.value_label?.trim()) { toast.error('Label is required'); return; }
    try {
      await upsertReferenceValue({ ...editValue, group_id: selectedGroupId } as any, userCode);
      toast.success('Saved');
      setEditValue(null);
      await loadValues(selectedGroupId);
    } catch (e: any) { toast.error('Save failed', { description: e.message }); }
  }

  async function handleSaveGroup() {
    if (!editGroup) return;
    if (!editGroup.group_code?.trim() || !editGroup.group_name?.trim()) {
      toast.error('Group code and name are required'); return;
    }
    try {
      const id = await upsertReferenceGroup(editGroup as any, userCode);
      toast.success('Group saved');
      setEditGroup(null);
      await loadGroups();
      setSelectedGroupId(id);
    } catch (e: any) { toast.error('Save failed', { description: e.message }); }
  }

  async function move(v: BnReferenceValue, dir: -1 | 1) {
    const sorted = [...values].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((x) => x.id === v.id);
    const swap = sorted[idx + dir];
    if (!swap) return;
    try {
      await Promise.all([
        upsertReferenceValue({ ...v, sort_order: swap.sort_order } as any, userCode),
        upsertReferenceValue({ ...swap, sort_order: v.sort_order } as any, userCode),
      ]);
      await loadValues(selectedGroupId!);
    } catch (e: any) { toast.error('Reorder failed', { description: e.message }); }
  }

  async function toggleActive(v: BnReferenceValue) {
    try {
      await setReferenceValueActive(v.id, !v.is_active, userCode);
      await loadValues(selectedGroupId!);
    } catch (e: any) { toast.error('Update failed', { description: e.message }); }
  }

  async function remove(v: BnReferenceValue) {
    if (v.is_system) { toast.error('System-protected. Deactivate instead.'); return; }
    if (!confirm(`Delete "${v.value_label}"? This cannot be undone.`)) return;
    try {
      await deleteReferenceValue(v.id);
      await loadValues(selectedGroupId!);
    } catch (e: any) { toast.error('Delete failed', { description: e.message }); }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> Reference Data
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage Benefits dropdown values (rate table types, formula statuses, reimbursement methods, etc.).
            System-protected values cannot be deleted — deactivate them to retire from new use.
          </p>
        </div>
        <Button onClick={() => setEditGroup({ module_code: 'BN', is_active: true })}>
          <Plus className="h-4 w-4 mr-1" /> New Group
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Groups ({filteredGroups.length})</CardTitle>
            <Input placeholder="Search groups…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 mt-2" />
          </CardHeader>
          <CardContent className="p-0 max-h-[70vh] overflow-auto">
            <ul className="divide-y">
              {filteredGroups.map((g) => (
                <li key={g.id}>
                  <button
                    onClick={() => setSelectedGroupId(g.id)}
                    className={`w-full text-left px-3 py-2 hover:bg-accent ${selectedGroupId === g.id ? 'bg-accent' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{g.group_name}</span>
                      {g.is_system && <Lock className="h-3 w-3 text-muted-foreground" />}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">{g.group_code}</div>
                  </button>
                </li>
              ))}
              {!filteredGroups.length && (
                <li className="p-4 text-sm text-muted-foreground">No groups</li>
              )}
            </ul>
          </CardContent>
        </Card>

        <Card className="col-span-8">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">{selectedGroup?.group_name ?? 'Select a group'}</CardTitle>
              {selectedGroup && (
                <p className="text-xs text-muted-foreground font-mono">{selectedGroup.group_code}</p>
              )}
            </div>
            {selectedGroup && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditGroup(selectedGroup)}>Edit Group</Button>
                <Button size="sm" onClick={() => setEditValue({ sort_order: values.length, is_active: true })}>
                  <Plus className="h-4 w-4 mr-1" /> Add Value
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {loading && <div className="p-6 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>}
            {!loading && selectedGroup && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Order</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {values.sort((a, b) => a.sort_order - b.sort_order).map((v) => (
                    <TableRow key={v.id} className={!v.is_active ? 'opacity-60' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="text-xs w-6 text-center">{v.sort_order}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => move(v, -1)}>
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => move(v, 1)}>
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{v.value_code}</TableCell>
                      <TableCell>
                        <div>{v.value_label}</div>
                        {v.description && <div className="text-xs text-muted-foreground">{v.description}</div>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Switch checked={v.is_active} onCheckedChange={() => toggleActive(v)} />
                          {v.is_system && <Badge variant="outline" className="text-[10px]"><Lock className="h-2.5 w-2.5 mr-0.5" />System</Badge>}
                          {v.is_default && <Badge variant="secondary" className="text-[10px]">Default</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setEditValue(v)}>Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => remove(v)} disabled={v.is_system}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!values.length && (
                    <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">No values yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Value editor */}
      <Dialog open={!!editValue} onOpenChange={(o) => !o && setEditValue(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editValue?.id ? 'Edit Value' : 'New Value'}</DialogTitle></DialogHeader>
          {editValue && (
            <div className="space-y-3">
              <div>
                <Label>Code *</Label>
                <Input value={editValue.value_code ?? ''} disabled={!!editValue.is_system}
                  onChange={(e) => setEditValue({ ...editValue, value_code: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <Label>Label *</Label>
                <Input value={editValue.value_label ?? ''}
                  onChange={(e) => setEditValue({ ...editValue, value_label: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={editValue.description ?? ''} rows={2}
                  onChange={(e) => setEditValue({ ...editValue, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Sort Order</Label>
                  <Input type="number" value={editValue.sort_order ?? 0}
                    onChange={(e) => setEditValue({ ...editValue, sort_order: Number(e.target.value) })} />
                </div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={editValue.is_active ?? true}
                      onCheckedChange={(c) => setEditValue({ ...editValue, is_active: c })} />
                    Active
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={editValue.is_default ?? false}
                      onCheckedChange={(c) => setEditValue({ ...editValue, is_default: c })} />
                    Default
                  </label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditValue(null)}>Cancel</Button>
            <Button onClick={handleSaveValue}><Save className="h-4 w-4 mr-1" />Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group editor */}
      <Dialog open={!!editGroup} onOpenChange={(o) => !o && setEditGroup(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editGroup?.id ? 'Edit Group' : 'New Group'}</DialogTitle></DialogHeader>
          {editGroup && (
            <div className="space-y-3">
              <div>
                <Label>Group Code *</Label>
                <Input value={editGroup.group_code ?? ''} disabled={!!editGroup.is_system}
                  onChange={(e) => setEditGroup({ ...editGroup, group_code: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <Label>Group Name *</Label>
                <Input value={editGroup.group_name ?? ''}
                  onChange={(e) => setEditGroup({ ...editGroup, group_name: e.target.value })} />
              </div>
              <div>
                <Label>Module</Label>
                <Input value={editGroup.module_code ?? 'BN'}
                  onChange={(e) => setEditGroup({ ...editGroup, module_code: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={editGroup.description ?? ''} rows={2}
                  onChange={(e) => setEditGroup({ ...editGroup, description: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditGroup(null)}>Cancel</Button>
            <Button onClick={handleSaveGroup}><Save className="h-4 w-4 mr-1" />Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
