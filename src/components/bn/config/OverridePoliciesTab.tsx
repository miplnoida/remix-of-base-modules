import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBnOverridePolicies, useUpsertBnOverridePolicy } from '@/hooks/bn/useBnConfig';
import { useActiveRoles } from '@/hooks/bn/useRolesList';
import { BN_OVERRIDE_TARGETS } from '@/types/bn';
import type { BnOverridePolicy } from '@/types/bn';

interface Props {
  productId: string | undefined;
  versionStatus?: string;
}

const NONE = '__none__';

export function OverridePoliciesTab({ productId, versionStatus }: Props) {
  const { toast } = useToast();
  const { data: allPolicies = [] } = useBnOverridePolicies();
  const { data: roles = [] } = useActiveRoles();
  const upsertMutation = useUpsertBnOverridePolicy();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<BnOverridePolicy>>({});

  const isReadOnly = versionStatus != null && versionStatus !== 'DRAFT';
  const policies = productId
    ? allPolicies.filter((p: BnOverridePolicy) => p.product_id === productId || !p.product_id)
    : allPolicies;

  if (!productId) {
    return <Card><CardContent className="py-8 text-center text-muted-foreground">Save the product first.</CardContent></Card>;
  }

  const openNew = () => {
    setEditing({
      product_id: productId,
      override_target: 'ELIGIBILITY',
      field_path: '*',
      allowed_role_id: null,
      allowed_role_code: null,
      allowed_permission_key: null,
      override_level: null,
      requires_justification: true,
      requires_maker_checker: true,
      effective_from: new Date().toISOString().split('T')[0],
      is_active: true,
    });
    setDialogOpen(true);
  };

  const update = (f: string, v: unknown) => setEditing(p => ({ ...p, [f]: v }));

  const handleRoleChange = (roleId: string) => {
    if (roleId === NONE) {
      update('allowed_role_id', null);
      update('allowed_role_code', null);
      update('allowed_role', null);
      return;
    }
    const r = roles.find(x => x.id === roleId);
    update('allowed_role_id', roleId);
    update('allowed_role_code', r?.role_name ?? null);
    update('allowed_role', r?.role_name ?? null); // keep legacy column in sync
  };

  const handleSave = async () => {
    const hasRole = !!editing.allowed_role_id;
    const hasPerm = !!(editing.allowed_permission_key && String(editing.allowed_permission_key).trim());
    const hasLevel = editing.override_level != null;
    if (!hasRole && !hasPerm && !hasLevel) {
      toast({
        title: 'Validation',
        description: 'Select a Role, enter a Permission Key, or set an Override Level.',
        variant: 'destructive',
      });
      return;
    }
    try {
      // Clear NEEDS_REVIEW flag when policy is now properly linked
      const meta: Record<string, unknown> = { ...(editing.metadata || {}) };
      if (hasRole || hasPerm || hasLevel) delete meta.review_status;
      await upsertMutation.mutateAsync({ ...editing, metadata: meta });
      toast({ title: 'Saved' });
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message, variant: 'destructive' });
    }
  };

  const roleLabel = (p: BnOverridePolicy) => {
    if (p.allowed_role_id) {
      const r = roles.find(x => x.id === p.allowed_role_id);
      return r?.role_name ?? p.allowed_role_code ?? '—';
    }
    return p.allowed_role_code ?? p.allowed_role ?? '—';
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Override Policies</CardTitle>
            <CardDescription>
              Define what can be overridden, by whom (linked role / permission / level), under what conditions
            </CardDescription>
          </div>
          <Button onClick={openNew} className="gap-2" disabled={isReadOnly}>
            <Plus className="h-4 w-4" /> Add Policy
          </Button>
        </CardHeader>
        <CardContent>
          {isReadOnly && (
            <div className="mb-3 flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
              <AlertTriangle className="h-4 w-4" />
              This product version is <strong>{versionStatus}</strong>. Overrides are read-only. Create a DRAFT version to edit.
            </div>
          )}
          {policies.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No override policies configured.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Target</TableHead>
                  <TableHead>Field</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Permission</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Justification</TableHead>
                  <TableHead>Maker-Checker</TableHead>
                  <TableHead>Max Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((p: BnOverridePolicy) => {
                  const needsReview = (p.metadata as any)?.review_status === 'NEEDS_REVIEW';
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {BN_OVERRIDE_TARGETS.find(t => t.value === p.override_target)?.label || p.override_target}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{p.field_path}</TableCell>
                      <TableCell>{roleLabel(p)}</TableCell>
                      <TableCell className="font-mono text-xs">{p.allowed_permission_key ?? '—'}</TableCell>
                      <TableCell>{p.override_level ?? '—'}</TableCell>
                      <TableCell>{p.requires_justification ? '✓' : '—'}</TableCell>
                      <TableCell>{p.requires_maker_checker ? '✓' : '—'}</TableCell>
                      <TableCell>{p.max_override_amount != null ? `$${p.max_override_amount}` : '—'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {p.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                          {needsReview && <Badge variant="destructive" className="text-[10px]">Needs Review</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isReadOnly}
                          onClick={() => { setEditing({ ...p }); setDialogOpen(true); }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing.id ? 'Edit' : 'Add'} Override Policy</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Override Target</Label>
              <Select value={editing.override_target || 'ELIGIBILITY'} onValueChange={v => update('override_target', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BN_OVERRIDE_TARGETS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Field Path</Label>
              <Input value={editing.field_path || '*'} onChange={e => update('field_path', e.target.value)} placeholder="* for all" />
            </div>

            <div className="col-span-2 rounded-md border border-dashed p-3">
              <p className="mb-2 text-xs text-muted-foreground">
                At least one of <strong>Allowed Role</strong>, <strong>Allowed Permission</strong>, or <strong>Override Level</strong> is required.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Allowed Role</Label>
                  <Select value={editing.allowed_role_id ?? NONE} onValueChange={handleRoleChange}>
                    <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>— None —</SelectItem>
                      {roles.map(r => (
                        <SelectItem key={r.id} value={r.id}>
                          <div className="flex flex-col">
                            <span>{r.role_name}</span>
                            {r.description && <span className="text-xs text-muted-foreground">{r.description}</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Allowed Permission Key</Label>
                  <Input
                    value={editing.allowed_permission_key ?? ''}
                    onChange={e => update('allowed_permission_key', e.target.value || null)}
                    placeholder="e.g. bn.override.calculation"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Override Level</Label>
                  <Input
                    type="number"
                    value={editing.override_level ?? ''}
                    onChange={e => update('override_level', e.target.value === '' ? null : parseInt(e.target.value, 10))}
                    placeholder="e.g. 2"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Max Override Amount</Label>
              <Input
                type="number"
                value={editing.max_override_amount ?? ''}
                onChange={e => update('max_override_amount', e.target.value ? parseFloat(e.target.value) : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Effective From</Label>
              <Input type="date" value={editing.effective_from || ''} onChange={e => update('effective_from', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Effective To</Label>
              <Input type="date" value={editing.effective_to || ''} onChange={e => update('effective_to', e.target.value || null)} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editing.requires_justification ?? true} onCheckedChange={v => update('requires_justification', v)} />
              <Label>Requires Justification</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editing.requires_maker_checker ?? true} onCheckedChange={v => update('requires_maker_checker', v)} />
              <Label>Requires Maker-Checker</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editing.is_active ?? true} onCheckedChange={v => update('is_active', v)} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsertMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
