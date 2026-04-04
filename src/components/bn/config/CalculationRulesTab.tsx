import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBnCalculationRules, useUpsertBnCalculationRule, useDeleteBnCalculationRule } from '@/hooks/bn/useBnProduct';
import { useBnFormulaTemplates } from '@/hooks/bn/useBnConfig';
import { BN_CALC_TYPES } from '@/types/bn';
import type { BnCalculationRule } from '@/types/bn';

interface Props { versionId: string | undefined; }

export function CalculationRulesTab({ versionId }: Props) {
  const { toast } = useToast();
  const { data: rules = [], isLoading } = useBnCalculationRules(versionId);
  const { data: templates = [] } = useBnFormulaTemplates();
  const upsertMutation = useUpsertBnCalculationRule();
  const deleteMutation = useDeleteBnCalculationRule();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<BnCalculationRule>>({});

  if (!versionId) return <Card><CardContent className="py-8 text-center text-muted-foreground">Select or create a product version first.</CardContent></Card>;

  const openNew = () => {
    setEditing({ product_version_id: versionId, rule_code: '', rule_name: '', calc_type: 'FORMULA', formula_definition: {}, variables: [], limits: {}, rounding_rule: 'HALF_UP', sort_order: 0, is_active: true });
    setDialogOpen(true);
  };
  const openEdit = (r: BnCalculationRule) => { setEditing({ ...r }); setDialogOpen(true); };
  const update = (f: string, v: unknown) => setEditing(p => ({ ...p, [f]: v }));

  const handleSave = async () => {
    if (!editing.rule_code || !editing.rule_name) { toast({ title: 'Validation', description: 'Code and Name required.', variant: 'destructive' }); return; }
    try {
      await upsertMutation.mutateAsync(editing);
      toast({ title: 'Saved' }); setDialogOpen(false);
    } catch (err: any) { toast({ title: 'Error', description: err?.message, variant: 'destructive' }); }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>Calculation Rules</CardTitle><CardDescription>Define formulas, rates, and tiers for benefit amount computation</CardDescription></div>
          <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Add Rule</Button>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground py-4">Loading...</p> : rules.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No calculation rules configured.</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead>
                <TableHead>Template</TableHead><TableHead>Rounding</TableHead><TableHead>Active</TableHead><TableHead className="w-20">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rules.map((r: BnCalculationRule) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.rule_code}</TableCell>
                    <TableCell className="font-medium">{r.rule_name}</TableCell>
                    <TableCell><Badge variant="outline">{BN_CALC_TYPES.find(t => t.value === r.calc_type)?.label || r.calc_type}</Badge></TableCell>
                    <TableCell>{templates.find((t: any) => t.id === r.formula_template_id)?.template_name || '—'}</TableCell>
                    <TableCell>{r.rounding_rule}</TableCell>
                    <TableCell>{r.is_active ? <Badge>Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Edit className="h-4 w-4" /></Button>
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
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing.id ? 'Edit' : 'Add'} Calculation Rule</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Rule Code *</Label><Input value={editing.rule_code || ''} onChange={e => update('rule_code', e.target.value.toUpperCase())} /></div>
            <div className="space-y-2"><Label>Rule Name *</Label><Input value={editing.rule_name || ''} onChange={e => update('rule_name', e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Calculation Type</Label>
              <Select value={editing.calc_type || 'FORMULA'} onValueChange={v => update('calc_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BN_CALC_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Formula Template</Label>
              <Select value={editing.formula_template_id || '__none__'} onValueChange={v => update('formula_template_id', v === '__none__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {templates.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.template_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rounding Rule</Label>
              <Select value={editing.rounding_rule || 'HALF_UP'} onValueChange={v => update('rounding_rule', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="HALF_UP">Half Up</SelectItem><SelectItem value="FLOOR">Floor</SelectItem>
                  <SelectItem value="CEIL">Ceiling</SelectItem><SelectItem value="NONE">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Sort Order</Label><Input type="number" value={editing.sort_order ?? 0} onChange={e => update('sort_order', parseInt(e.target.value) || 0)} /></div>
            <div className="col-span-2 space-y-2">
              <Label>Formula Definition (JSON)</Label>
              <Textarea value={JSON.stringify(editing.formula_definition || {}, null, 2)} onChange={e => { try { update('formula_definition', JSON.parse(e.target.value)); } catch {} }} rows={5} className="font-mono text-sm" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Limits (JSON)</Label>
              <Textarea value={JSON.stringify(editing.limits || {}, null, 2)} onChange={e => { try { update('limits', JSON.parse(e.target.value)); } catch {} }} rows={3} className="font-mono text-sm" placeholder='{"min": 0, "max": 500}' />
            </div>
            <div className="flex items-center gap-2"><Switch checked={editing.is_active ?? true} onCheckedChange={v => update('is_active', v)} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsertMutation.isPending}>{upsertMutation.isPending ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
