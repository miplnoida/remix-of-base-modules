import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { PermissionButton } from '@/components/ui/permission-button';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Workflow, Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUserCode } from '@/hooks/useUserCode';
import {
  listMappings, upsertMapping, deleteMapping,
  COMPLIANCE_EVENT_KEYS, type WorkflowMapping, type FallbackBehavior,
} from '@/services/complianceWorkflowMappingService';

const MODULE = 'manage_compliance';
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const FALLBACKS: FallbackBehavior[] = ['DIRECT_APPLY', 'REQUIRE_NOTE', 'BLOCK'];

const WorkflowMappingPage = () => {
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  const [editing, setEditing] = useState<Partial<WorkflowMapping> | null>(null);

  const { data: mappings = [], isLoading } = useQuery({
    queryKey: ['ce_workflow_mappings'],
    queryFn: listMappings,
  });

  const { data: workflows = [] } = useQuery({
    queryKey: ['workflow_definitions_active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_definitions')
        .select('id, name, process_type, is_active')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: funds = [] } = useQuery({
    queryKey: ['fund_types'],
    queryFn: async () => {
      const { data } = await supabase.from('ce_violation_types').select('applicable_funds');
      const set = new Set<string>();
      (data || []).forEach((r: any) => (r.applicable_funds || []).forEach((f: string) => set.add(f)));
      return Array.from(set).sort();
    },
  });

  const { data: violationTypes = [] } = useQuery({
    queryKey: ['ce_violation_types_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_violation_types')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const saveMut = useMutation({
    mutationFn: (m: Partial<WorkflowMapping>) =>
      upsertMapping({ ...m, event_key: m.event_key! }, userCode || 'UNKNOWN'),
    onSuccess: () => {
      toast.success('Mapping saved');
      qc.invalidateQueries({ queryKey: ['ce_workflow_mappings'] });
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message || 'Save failed'),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteMapping(id),
    onSuccess: () => {
      toast.success('Mapping removed');
      qc.invalidateQueries({ queryKey: ['ce_workflow_mappings'] });
    },
    onError: (e: any) => toast.error(e.message || 'Delete failed'),
  });

  const toggleEnabled = (m: WorkflowMapping) =>
    saveMut.mutate({ ...m, enabled: !m.enabled });

  return (
    <PermissionWrapper moduleName={MODULE}>
      <div className="container mx-auto p-6 space-y-6">
        <PageHeader title="Workflow Mapping" subtitle="Bind Compliance events to the central workflow engine" />

        <Card>
          <CardContent className="pt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Compliance never duplicates the workflow engine — it routes events here, then the central engine drives approvals.
              When a mapping is disabled, the configured fallback behavior is applied.
            </p>
            <PermissionButton moduleName={MODULE} actionName="add" size="sm"
              onClick={() => setEditing({ event_key: COMPLIANCE_EVENT_KEYS[0], enabled: false, fallback_behavior: 'DIRECT_APPLY', priority: 100 })}>
              <Plus className="h-4 w-4 mr-1" />New Mapping
            </PermissionButton>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Enabled</TableHead>
                    <TableHead>Workflow</TableHead>
                    <TableHead>Fund</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Min Amount</TableHead>
                    <TableHead>Fallback</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-xs">{m.event_key}</TableCell>
                      <TableCell>
                        <Switch checked={m.enabled} onCheckedChange={() => toggleEnabled(m)} />
                      </TableCell>
                      <TableCell>{m.workflow_name || <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                      <TableCell className="text-xs">{m.applicable_fund || '—'}</TableCell>
                      <TableCell className="text-xs">{m.applicable_severity || '—'}</TableCell>
                      <TableCell className="text-xs">{m.applicable_min_amount ?? '—'}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{m.fallback_behavior}</Badge></TableCell>
                      <TableCell className="text-xs">{m.priority}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <PermissionButton moduleName={MODULE} actionName="edit" size="icon" variant="ghost"
                          onClick={() => setEditing(m)}>
                          <Pencil className="h-3 w-3" />
                        </PermissionButton>
                        <PermissionButton moduleName={MODULE} actionName="delete" size="icon" variant="ghost"
                          onClick={() => { if (confirm('Delete this mapping?')) delMut.mutate(m.id); }}>
                          <Trash2 className="h-3 w-3" />
                        </PermissionButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing?.id ? 'Edit' : 'New'} Workflow Mapping</DialogTitle>
              <DialogDescription>Configure which workflow runs for this Compliance event.</DialogDescription>
            </DialogHeader>
            {editing && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground">Event key</label>
                  <Select value={editing.event_key}
                    onValueChange={(v) => setEditing({ ...editing, event_key: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COMPLIANCE_EVENT_KEYS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <Switch checked={!!editing.enabled} onCheckedChange={(c) => setEditing({ ...editing, enabled: c })} />
                  <span className="text-sm">Enabled</span>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground">Workflow definition</label>
                  <Select value={editing.workflow_definition_id || ''}
                    onValueChange={(v) => setEditing({ ...editing, workflow_definition_id: v || null })}>
                    <SelectTrigger><SelectValue placeholder="Select workflow…" /></SelectTrigger>
                    <SelectContent>
                      {workflows.map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Applicable fund</label>
                  <Select value={editing.applicable_fund || '__any__'}
                    onValueChange={(v) => setEditing({ ...editing, applicable_fund: v === '__any__' ? null : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__any__">Any</SelectItem>
                      {funds.map((f: string) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Applicable severity</label>
                  <Select value={editing.applicable_severity || '__any__'}
                    onValueChange={(v) => setEditing({ ...editing, applicable_severity: v === '__any__' ? null : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__any__">Any</SelectItem>
                      {SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Min amount threshold</label>
                  <Input type="number" value={editing.applicable_min_amount ?? ''}
                    onChange={(e) => setEditing({ ...editing, applicable_min_amount: e.target.value === '' ? null : Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Applicable violation type</label>
                  <Select value={editing.applicable_violation_type_id || '__any__'}
                    onValueChange={(v) => setEditing({ ...editing, applicable_violation_type_id: v === '__any__' ? null : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__any__">Any</SelectItem>
                      {violationTypes.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Fallback when disabled</label>
                  <Select value={editing.fallback_behavior || 'DIRECT_APPLY'}
                    onValueChange={(v) => setEditing({ ...editing, fallback_behavior: v as FallbackBehavior })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FALLBACKS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Priority (lower = higher precedence)</label>
                  <Input type="number" value={editing.priority ?? 100}
                    onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) })} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground">Notes</label>
                  <Textarea rows={2} value={editing.notes || ''}
                    onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <PermissionButton moduleName={MODULE} actionName={editing?.id ? 'edit' : 'add'}
                disabled={!editing?.event_key || saveMut.isPending}
                onClick={() => editing && saveMut.mutate(editing)}>
                Save Mapping
              </PermissionButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionWrapper>
  );
};

export default WorkflowMappingPage;
