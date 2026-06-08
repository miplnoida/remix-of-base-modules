import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Plus, Edit, Copy, Trash2, Power, Search } from 'lucide-react';
import { toast } from 'sonner';
import {
  useRuleCatalogue, useRuleCatalogueUsage, useUpsertRuleCatalogue,
  useCloneRuleCatalogue, useDeleteRuleCatalogue, useToggleRuleCatalogueActive,
} from '@/hooks/bn/useRuleCatalogue';
import {
  RULE_GROUP_TYPES, RULE_PARAMETERS, RULE_OPERATORS, FAIL_ACTIONS,
  validateRuleCatalogue,
  type RuleCatalogueItem, type RuleCatalogueInput, type FailAction,
} from '@/services/bn/ruleCatalogueService';
import { getCurrentUserCode } from '@/services/bn/audit/getCurrentUserCode';

const emptyInput: RuleCatalogueInput = {
  rule_code: '', rule_name: '', description: '', group_type: 'CONTRIBUTION',
  parameter: 'TOTAL_CONTRIBUTIONS', operator: 'GREATER_OR_EQUAL',
  value_from: '', value_to: '', values: null,
  default_fail_action: 'REJECT', failure_message_text: '',
  is_active: true, allow_product_override: true, tags: [],
  effective_from: null, effective_to: null,
};

function fmtValue(r: RuleCatalogueItem): string {
  if (r.operator === 'BETWEEN') return `${r.value_from ?? ''} – ${r.value_to ?? ''}`;
  if (r.operator === 'IN' || r.operator === 'NOT_IN') return Array.isArray(r.values) ? r.values.join(', ') : '';
  if (r.operator === 'BOOLEAN' || r.operator === 'EXISTS') return String(r.value_from ?? 'true');
  return r.value_from ?? '(per product)';
}

export default function RuleCatalogue() {
  const { data: rules = [], isLoading } = useRuleCatalogue();
  const { data: usage = {} } = useRuleCatalogueUsage();
  const upsert = useUpsertRuleCatalogue();
  const clone = useCloneRuleCatalogue();
  const remove = useDeleteRuleCatalogue();
  const toggle = useToggleRuleCatalogueActive();

  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RuleCatalogueInput>(emptyInput);
  const [valuesText, setValuesText] = useState('');

  const filtered = useMemo(() => {
    return rules.filter(r => {
      if (groupFilter !== 'ALL' && r.group_type !== groupFilter) return false;
      if (statusFilter === 'ACTIVE' && !r.is_active) return false;
      if (statusFilter === 'INACTIVE' && r.is_active) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!r.rule_code.toLowerCase().includes(s) &&
            !r.rule_name.toLowerCase().includes(s) &&
            !(r.description ?? '').toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [rules, search, groupFilter, statusFilter]);

  const summary = useMemo(() => {
    const used = new Set(Object.keys(usage));
    return {
      total: rules.length,
      active: rules.filter(r => r.is_active).length,
      inactive: rules.filter(r => !r.is_active).length,
      used: rules.filter(r => used.has(r.rule_code)).length,
    };
  }, [rules, usage]);

  const openNew = () => {
    setEditing({ ...emptyInput });
    setValuesText('');
    setDialogOpen(true);
  };

  const openEdit = (r: RuleCatalogueItem) => {
    setEditing({
      id: r.id, rule_code: r.rule_code, rule_name: r.rule_name, description: r.description,
      group_type: r.group_type, parameter: r.parameter, operator: r.operator,
      value_from: r.value_from, value_to: r.value_to, values: r.values,
      default_fail_action: r.default_fail_action, failure_message_text: r.failure_message_text,
      is_active: r.is_active, allow_product_override: r.allow_product_override,
      tags: r.tags ?? [], effective_from: r.effective_from, effective_to: r.effective_to,
    });
    setValuesText(Array.isArray(r.values) ? r.values.join(', ') : '');
    setDialogOpen(true);
  };

  const onSave = async () => {
    const payload = { ...editing };
    if (payload.operator === 'IN' || payload.operator === 'NOT_IN') {
      payload.values = valuesText.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      payload.values = null;
    }
    const err = validateRuleCatalogue(payload);
    if (err) { toast.error(err); return; }
    const userCode = await getCurrentUserCode();
    if (!userCode) { toast.error('Cannot save', { description: 'Authenticated user_code required' }); return; }
    await upsert.mutateAsync({ input: payload, userCode });
    setDialogOpen(false);
  };

  const onClone = async (r: RuleCatalogueItem) => {
    const newCode = window.prompt('New rule code', `${r.rule_code}_COPY`);
    if (!newCode) return;
    const userCode = await getCurrentUserCode();
    if (!userCode) { toast.error('Authenticated user_code required'); return; }
    await clone.mutateAsync({ source: r, newCode: newCode.toUpperCase(), userCode });
  };

  const onDelete = async (r: RuleCatalogueItem) => {
    if (!window.confirm(`Delete rule ${r.rule_code}? This cannot be undone.`)) return;
    await remove.mutateAsync({ id: r.id, code: r.rule_code });
  };

  const onToggle = async (r: RuleCatalogueItem) => {
    const userCode = await getCurrentUserCode();
    if (!userCode) { toast.error('Authenticated user_code required'); return; }
    await toggle.mutateAsync({ id: r.id, isActive: !r.is_active, userCode });
  };

  const isBetween = editing.operator === 'BETWEEN';
  const isList = editing.operator === 'IN' || editing.operator === 'NOT_IN';
  const isBool = editing.operator === 'BOOLEAN' || editing.operator === 'EXISTS';

  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="Rule Catalogue"
        subtitle="Reusable eligibility checks used across benefit products"
        breadcrumbs={[
          { label: 'Benefit Management', href: '/bn/dashboard' },
          { label: 'Configuration' },
          { label: 'Rule Catalogue' },
        ]}
        actions={<Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Add Rule</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Total Rules</div><div className="text-2xl font-bold">{summary.total}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Active</div><div className="text-2xl font-bold text-emerald-600">{summary.active}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Inactive</div><div className="text-2xl font-bold text-amber-600">{summary.inactive}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Used in Products</div><div className="text-2xl font-bold">{summary.used}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <CardTitle className="flex-1">Catalogue</CardTitle>
            <div className="relative w-full md:w-72">
              <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search code, name, description" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Groups</SelectItem>
                {RULE_GROUP_TYPES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No rules match the filters.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Parameter</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Default Value</TableHead>
                  <TableHead>Fail Action</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Used By</TableHead>
                  <TableHead>Ver</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.rule_code}</TableCell>
                    <TableCell className="font-medium">{r.rule_name}</TableCell>
                    <TableCell><Badge variant="outline">{r.group_type}</Badge></TableCell>
                    <TableCell className="text-xs">{r.parameter}</TableCell>
                    <TableCell className="text-xs">{r.operator}</TableCell>
                    <TableCell className="text-xs">{fmtValue(r)}</TableCell>
                    <TableCell>
                      <Badge variant={r.default_fail_action === 'REJECT' ? 'destructive' : r.default_fail_action === 'BLOCK' ? 'secondary' : 'default'}>
                        {r.default_fail_action}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.is_active ? <Badge>Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                    <TableCell className="text-xs">{usage[r.rule_code] ?? 0}</TableCell>
                    <TableCell className="text-xs">v{r.version}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(r)} title="Edit"><Edit className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => onClone(r)} title="Clone"><Copy className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => onToggle(r)} title={r.is_active ? 'Deactivate' : 'Activate'}><Power className={`h-4 w-4 ${r.is_active ? 'text-amber-600' : 'text-emerald-600'}`} /></Button>
                        <Button size="icon" variant="ghost" onClick={() => onDelete(r)} title="Delete" disabled={(usage[r.rule_code] ?? 0) > 0}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing.id ? 'Edit' : 'Add'} Catalogue Rule</DialogTitle>
            <DialogDescription>Reusable rule referenced by product versions</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rule Code *</Label>
              <Input value={editing.rule_code}
                onChange={e => setEditing({ ...editing, rule_code: e.target.value.toUpperCase() })}
                disabled={!!editing.id} placeholder="MIN_TOTAL_CONTRIBUTIONS" />
            </div>
            <div className="space-y-2">
              <Label>Rule Name *</Label>
              <Input value={editing.rule_name} onChange={e => setEditing({ ...editing, rule_name: e.target.value })} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Description</Label>
              <Textarea rows={2} value={editing.description ?? ''} onChange={e => setEditing({ ...editing, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Group *</Label>
              <Select value={editing.group_type} onValueChange={v => setEditing({ ...editing, group_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RULE_GROUP_TYPES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Parameter *</Label>
              <Select value={editing.parameter} onValueChange={v => setEditing({ ...editing, parameter: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RULE_PARAMETERS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Operator *</Label>
              <Select value={editing.operator} onValueChange={v => setEditing({ ...editing, operator: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RULE_OPERATORS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Default Fail Action *</Label>
              <Select value={editing.default_fail_action} onValueChange={v => setEditing({ ...editing, default_fail_action: v as FailAction })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FAIL_ACTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {!isList && !isBool && (
              <>
                <div className="space-y-2">
                  <Label>Value{isBetween ? ' From' : ''}{!isBetween && ' (default, optional)'}</Label>
                  <Input value={editing.value_from ?? ''} onChange={e => setEditing({ ...editing, value_from: e.target.value })} placeholder="configurable per product" />
                </div>
                {isBetween && (
                  <div className="space-y-2">
                    <Label>Value To *</Label>
                    <Input value={editing.value_to ?? ''} onChange={e => setEditing({ ...editing, value_to: e.target.value })} />
                  </div>
                )}
              </>
            )}
            {isBool && (
              <div className="space-y-2">
                <Label>Expected *</Label>
                <Select value={String(editing.value_from ?? 'true')} onValueChange={v => setEditing({ ...editing, value_from: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">true</SelectItem>
                    <SelectItem value="false">false</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {isList && (
              <div className="space-y-2 col-span-2">
                <Label>Values * (comma separated)</Label>
                <Input value={valuesText} onChange={e => setValuesText(e.target.value)} placeholder="ACTIVE, SUSPENDED, …" />
              </div>
            )}

            <div className="space-y-2 col-span-2">
              <Label>Failure Message</Label>
              <Textarea rows={2} value={editing.failure_message_text ?? ''} onChange={e => setEditing({ ...editing, failure_message_text: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Tags (comma separated)</Label>
              <Input value={(editing.tags ?? []).join(', ')} onChange={e => setEditing({ ...editing, tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
            </div>
            <div className="flex items-end gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} />
                <Label>Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editing.allow_product_override} onCheckedChange={v => setEditing({ ...editing, allow_product_override: v })} />
                <Label>Allow product override</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Effective From</Label>
              <Input type="date" value={editing.effective_from ?? ''} onChange={e => setEditing({ ...editing, effective_from: e.target.value || null })} />
            </div>
            <div className="space-y-2">
              <Label>Effective To</Label>
              <Input type="date" value={editing.effective_to ?? ''} onChange={e => setEditing({ ...editing, effective_to: e.target.value || null })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={onSave} disabled={upsert.isPending}>{upsert.isPending ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
