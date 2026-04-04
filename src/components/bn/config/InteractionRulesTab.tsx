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
import { useBnInteractionRules, useUpsertBnInteractionRule, useDeleteBnInteractionRule } from '@/hooks/bn/useBnConfig';
import { useBnProducts } from '@/hooks/bn/useBnProduct';
import { BN_INTERACTION_TYPES } from '@/types/bn';
import type { BnInteractionRule, BnProduct } from '@/types/bn';

interface Props { productId: string | undefined; }

export function InteractionRulesTab({ productId }: Props) {
  const { toast } = useToast();
  const { data: allRules = [] } = useBnInteractionRules();
  const { data: products = [] } = useBnProducts();
  const upsertMutation = useUpsertBnInteractionRule();
  const deleteMutation = useDeleteBnInteractionRule();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<BnInteractionRule>>({});

  // Filter to rules involving this product
  const rules = productId ? allRules.filter((r: BnInteractionRule) => r.primary_product_id === productId || r.related_product_id === productId) : allRules;
  const getName = (id: string) => products.find((p: BnProduct) => p.id === id)?.benefit_name || id;

  if (!productId) return <Card><CardContent className="py-8 text-center text-muted-foreground">Save the product first.</CardContent></Card>;

  const openNew = () => {
    setEditing({ primary_product_id: productId, related_product_id: '', interaction_type: 'SUSPENDS', effective_from: new Date().toISOString().split('T')[0], is_active: true });
    setDialogOpen(true);
  };
  const update = (f: string, v: unknown) => setEditing(p => ({ ...p, [f]: v }));

  const handleSave = async () => {
    if (!editing.related_product_id || !editing.interaction_type) { toast({ title: 'Validation', description: 'Related product and type are required.', variant: 'destructive' }); return; }
    try { await upsertMutation.mutateAsync(editing); toast({ title: 'Saved' }); setDialogOpen(false); }
    catch (err: any) { toast({ title: 'Error', description: err?.message, variant: 'destructive' }); }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>Interaction Rules</CardTitle><CardDescription>Define how this product interacts with other benefit products</CardDescription></div>
          <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Add Rule</Button>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No interaction rules configured.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Primary</TableHead><TableHead>Type</TableHead><TableHead>Related</TableHead><TableHead>Effective</TableHead><TableHead>Active</TableHead><TableHead className="w-20">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {rules.map((r: BnInteractionRule) => (
                  <TableRow key={r.id}>
                    <TableCell>{getName(r.primary_product_id)}</TableCell>
                    <TableCell><Badge>{BN_INTERACTION_TYPES.find(t => t.value === r.interaction_type)?.label || r.interaction_type}</Badge></TableCell>
                    <TableCell>{getName(r.related_product_id)}</TableCell>
                    <TableCell className="text-sm">{r.effective_from}{r.effective_to ? ` — ${r.effective_to}` : ''}</TableCell>
                    <TableCell>{r.is_active ? <Badge>Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing({ ...r }); setDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={async () => { await deleteMutation.mutateAsync(r.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing.id ? 'Edit' : 'Add'} Interaction Rule</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Related Product *</Label>
              <Select value={editing.related_product_id || ''} onValueChange={v => update('related_product_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>{products.filter((p: BnProduct) => p.id !== productId).map((p: BnProduct) => <SelectItem key={p.id} value={p.id}>{p.benefit_name} ({p.benefit_code})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Interaction Type</Label>
              <Select value={editing.interaction_type || 'SUSPENDS'} onValueChange={v => update('interaction_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BN_INTERACTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Effective From</Label><Input type="date" value={editing.effective_from || ''} onChange={e => update('effective_from', e.target.value)} /></div>
            <div className="space-y-2"><Label>Effective To</Label><Input type="date" value={editing.effective_to || ''} onChange={e => update('effective_to', e.target.value || null)} /></div>
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
