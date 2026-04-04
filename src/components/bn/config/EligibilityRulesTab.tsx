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
import { Plus, Trash2, Edit, GripVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBnEligibilityRules, useUpsertBnEligibilityRule, useDeleteBnEligibilityRule } from '@/hooks/bn/useBnProduct';
import { useBnRuleGroups } from '@/hooks/bn/useBnConfig';
import { BN_RULE_TYPES, BN_FAIL_ACTIONS } from '@/types/bn';
import type { BnEligibilityRule } from '@/types/bn';

interface Props { versionId: string | undefined; }

const emptyRule: Partial<BnEligibilityRule> = {
  rule_code: '', rule_name: '', rule_type: 'CONTRIBUTION', rule_group: 'GENERAL',
  rule_definition: { operator: '>=', field: '', value: 0 },
  data_source: 'ip_wages', fail_message: '', fail_action: 'REJECT', sort_order: 0, is_active: true,
};

export function EligibilityRulesTab({ versionId }: Props) {
  const { toast } = useToast();
  const { data: rules = [], isLoading } = useBnEligibilityRules(versionId);
  const { data: ruleGroups = [] } = useBnRuleGroups();
  const upsertMutation = useUpsertBnEligibilityRule();
  const deleteMutation = useDeleteBnEligibilityRule();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<BnEligibilityRule>>(emptyRule);

  if (!versionId) return <Card><CardContent className="py-8 text-center text-muted-foreground">Select or create a product version first.</CardContent></Card>;

  const openNew = () => { setEditing({ ...emptyRule, product_version_id: versionId }); setDialogOpen(true); };
  const openEdit = (rule: BnEligibilityRule) => { setEditing({ ...rule }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!editing.rule_code || !editing.rule_name) {
      toast({ title: 'Validation', description: 'Code and Name are required.', variant: 'destructive' }); return;
    }
    try {
      await upsertMutation.mutateAsync(editing);
      toast({ title: 'Saved', description: 'Eligibility rule saved.' });
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try { await deleteMutation.mutateAsync(id); toast({ title: 'Deleted' }); } catch (err: any) { toast({ title: 'Error', description: err?.message, variant: 'destructive' }); }
  };

  const updateEditing = (field: string, value: unknown) => setEditing(prev => ({ ...prev, [field]: value }));
  const updateDefinition = (field: string, value: unknown) =>
    setEditing(prev => ({ ...prev, rule_definition: { ...(prev.rule_definition as Record<string, unknown>), [field]: value } }));

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>Eligibility Rules</CardTitle><CardDescription>Define checks that must pass before a claim is eligible</CardDescription></div>
          <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Add Rule</Button>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground py-4">Loading...</p> : rules.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No eligibility rules configured. Click "Add Rule" to get started.</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead className="w-8">#</TableHead><TableHead>Code</TableHead><TableHead>Name</TableHead>
                <TableHead>Type</TableHead><TableHead>Group</TableHead><TableHead>Fail Action</TableHead>
                <TableHead>Active</TableHead><TableHead className="w-20">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rules.map((rule: BnEligibilityRule, idx: number) => (
                  <TableRow key={rule.id}>
                    <TableCell><GripVertical className="h-4 w-4 text-muted-foreground" /></TableCell>
                    <TableCell className="font-mono text-sm">{rule.rule_code}</TableCell>
                    <TableCell className="font-medium">{rule.rule_name}</TableCell>
                    <TableCell><Badge variant="outline">{BN_RULE_TYPES.find(t => t.value === rule.rule_type)?.label || rule.rule_type}</Badge></TableCell>
                    <TableCell>{ruleGroups.find((g: any) => g.id === rule.rule_group_id)?.group_name || rule.rule_group}</TableCell>
                    <TableCell><Badge variant={rule.fail_action === 'REJECT' ? 'destructive' : 'secondary'}>{rule.fail_action}</Badge></TableCell>
                    <TableCell>{rule.is_active ? <Badge variant="default">Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(rule)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(rule.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
          <DialogHeader><DialogTitle>{editing.id ? 'Edit' : 'Add'} Eligibility Rule</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Rule Code *</Label><Input value={editing.rule_code || ''} onChange={e => updateEditing('rule_code', e.target.value.toUpperCase())} maxLength={30} /></div>
            <div className="space-y-2"><Label>Rule Name *</Label><Input value={editing.rule_name || ''} onChange={e => updateEditing('rule_name', e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Rule Type</Label>
              <Select value={editing.rule_type || 'CONTRIBUTION'} onValueChange={v => updateEditing('rule_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BN_RULE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rule Group</Label>
              <Select value={editing.rule_group_id || '__none__'} onValueChange={v => updateEditing('rule_group_id', v === '__none__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {ruleGroups.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.group_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data Source</Label>
              <Select value={editing.data_source || ''} onValueChange={v => updateEditing('data_source', v)}>
                <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ip_wages">ip_wages (Contributions)</SelectItem>
                  <SelectItem value="ip_master">ip_master (Person)</SelectItem>
                  <SelectItem value="er_master">er_master (Employer)</SelectItem>
                  <SelectItem value="claim_detail">Claim Detail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fail Action</Label>
              <Select value={editing.fail_action || 'REJECT'} onValueChange={v => updateEditing('fail_action', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BN_FAIL_ACTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2 rounded-lg border p-4">
              <Label className="text-sm font-semibold">Rule Definition</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1"><Label className="text-xs">Field</Label><Input value={(editing.rule_definition as any)?.field || ''} onChange={e => updateDefinition('field', e.target.value)} placeholder="e.g. total_weeks" /></div>
                <div className="space-y-1"><Label className="text-xs">Operator</Label>
                  <Select value={(editing.rule_definition as any)?.operator || '>='} onValueChange={v => updateDefinition('operator', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value=">=">≥ (at least)</SelectItem><SelectItem value=">">{'>'} (greater than)</SelectItem>
                      <SelectItem value="<=">≤ (at most)</SelectItem><SelectItem value="<">{'<'} (less than)</SelectItem>
                      <SelectItem value="==">= (equals)</SelectItem><SelectItem value="!=">≠ (not equal)</SelectItem>
                      <SelectItem value="IN">IN (one of)</SelectItem><SelectItem value="BETWEEN">BETWEEN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label className="text-xs">Value</Label><Input value={(editing.rule_definition as any)?.value ?? ''} onChange={e => updateDefinition('value', e.target.value)} placeholder="e.g. 26" /></div>
              </div>
            </div>
            <div className="col-span-2 space-y-2"><Label>Fail Message</Label><Textarea value={editing.fail_message || ''} onChange={e => updateEditing('fail_message', e.target.value)} rows={2} placeholder="Message shown when rule fails" /></div>
            <div className="space-y-2"><Label>Sort Order</Label><Input type="number" value={editing.sort_order ?? 0} onChange={e => updateEditing('sort_order', parseInt(e.target.value) || 0)} /></div>
            <div className="flex items-center gap-2 pt-6"><Switch checked={editing.is_active ?? true} onCheckedChange={v => updateEditing('is_active', v)} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsertMutation.isPending}>{upsertMutation.isPending ? 'Saving...' : 'Save Rule'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
