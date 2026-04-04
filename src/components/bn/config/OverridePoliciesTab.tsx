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
import { Plus, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBnOverridePolicies, useUpsertBnOverridePolicy } from '@/hooks/bn/useBnConfig';
import { BN_OVERRIDE_TARGETS } from '@/types/bn';
import type { BnOverridePolicy } from '@/types/bn';

interface Props { productId: string | undefined; }

export function OverridePoliciesTab({ productId }: Props) {
  const { toast } = useToast();
  const { data: allPolicies = [] } = useBnOverridePolicies();
  const upsertMutation = useUpsertBnOverridePolicy();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<BnOverridePolicy>>({});

  const policies = productId ? allPolicies.filter((p: BnOverridePolicy) => p.product_id === productId || !p.product_id) : allPolicies;

  if (!productId) return <Card><CardContent className="py-8 text-center text-muted-foreground">Save the product first.</CardContent></Card>;

  const openNew = () => {
    setEditing({ product_id: productId, override_target: 'ELIGIBILITY', field_path: '*', allowed_role: '', requires_justification: true, requires_maker_checker: true, effective_from: new Date().toISOString().split('T')[0], is_active: true });
    setDialogOpen(true);
  };
  const update = (f: string, v: unknown) => setEditing(p => ({ ...p, [f]: v }));

  const handleSave = async () => {
    if (!editing.allowed_role) { toast({ title: 'Validation', description: 'Role is required.', variant: 'destructive' }); return; }
    try { await upsertMutation.mutateAsync(editing); toast({ title: 'Saved' }); setDialogOpen(false); }
    catch (err: any) { toast({ title: 'Error', description: err?.message, variant: 'destructive' }); }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>Override Policies</CardTitle><CardDescription>Define what can be overridden, by whom, under what conditions</CardDescription></div>
          <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Add Policy</Button>
        </CardHeader>
        <CardContent>
          {policies.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No override policies configured.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Target</TableHead><TableHead>Field</TableHead><TableHead>Role</TableHead><TableHead>Justification</TableHead><TableHead>Maker-Checker</TableHead><TableHead>Max Amount</TableHead><TableHead>Active</TableHead><TableHead className="w-20">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {policies.map((p: BnOverridePolicy) => (
                  <TableRow key={p.id}>
                    <TableCell><Badge variant="outline">{BN_OVERRIDE_TARGETS.find(t => t.value === p.override_target)?.label || p.override_target}</Badge></TableCell>
                    <TableCell className="font-mono text-sm">{p.field_path}</TableCell>
                    <TableCell>{p.allowed_role}</TableCell>
                    <TableCell>{p.requires_justification ? '✓' : '—'}</TableCell>
                    <TableCell>{p.requires_maker_checker ? '✓' : '—'}</TableCell>
                    <TableCell>{p.max_override_amount != null ? `$${p.max_override_amount}` : '—'}</TableCell>
                    <TableCell>{p.is_active ? <Badge>Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => { setEditing({ ...p }); setDialogOpen(true); }}><Edit className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing.id ? 'Edit' : 'Add'} Override Policy</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Override Target</Label>
              <Select value={editing.override_target || 'ELIGIBILITY'} onValueChange={v => update('override_target', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BN_OVERRIDE_TARGETS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Field Path</Label><Input value={editing.field_path || '*'} onChange={e => update('field_path', e.target.value)} placeholder="* for all" /></div>
            <div className="space-y-2"><Label>Allowed Role *</Label><Input value={editing.allowed_role || ''} onChange={e => update('allowed_role', e.target.value)} placeholder="e.g. bn_supervisor" /></div>
            <div className="space-y-2"><Label>Max Override Amount</Label><Input type="number" value={editing.max_override_amount ?? ''} onChange={e => update('max_override_amount', e.target.value ? parseFloat(e.target.value) : null)} /></div>
            <div className="space-y-2"><Label>Effective From</Label><Input type="date" value={editing.effective_from || ''} onChange={e => update('effective_from', e.target.value)} /></div>
            <div className="space-y-2"><Label>Effective To</Label><Input type="date" value={editing.effective_to || ''} onChange={e => update('effective_to', e.target.value || null)} /></div>
            <div className="flex items-center gap-2"><Switch checked={editing.requires_justification ?? true} onCheckedChange={v => update('requires_justification', v)} /><Label>Requires Justification</Label></div>
            <div className="flex items-center gap-2"><Switch checked={editing.requires_maker_checker ?? true} onCheckedChange={v => update('requires_maker_checker', v)} /><Label>Requires Maker-Checker</Label></div>
            <div className="flex items-center gap-2"><Switch checked={editing.is_active ?? true} onCheckedChange={v => update('is_active', v)} /><Label>Active</Label></div>
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
