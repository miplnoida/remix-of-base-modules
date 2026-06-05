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
import { useBnTimelineRules, useUpsertBnTimelineRule } from '@/hooks/bn/useBnProduct';
import { BN_TIMELINE_TYPES } from '@/types/bn';
import type { BnTimelineRule } from '@/types/bn';

import { ReadOnlyVersionBanner } from './ReadOnlyVersionBanner';

interface Props { versionId: string | undefined; isReadOnly?: boolean; versionStatus?: string | null; }

export function TimelineRulesTab({ versionId, isReadOnly, versionStatus }: Props) {
  const { toast } = useToast();
  const { data: rules = [], isLoading } = useBnTimelineRules(versionId);
  const upsertMutation = useUpsertBnTimelineRule();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<BnTimelineRule>>({});

  if (!versionId) return <Card><CardContent className="py-8 text-center text-muted-foreground">Select or create a product version first.</CardContent></Card>;

  const openNew = () => {
    setEditing({ product_version_id: versionId, rule_code: '', rule_name: '', timeline_type: 'WAITING_PERIOD', days_value: null, weeks_value: null, months_value: null, sort_order: 0, is_active: true });
    setDialogOpen(true);
  };
  const update = (f: string, v: unknown) => setEditing(p => ({ ...p, [f]: v }));

  const handleSave = async () => {
    if (!editing.rule_code || !editing.rule_name) { toast({ title: 'Validation', description: 'Code and Name required.', variant: 'destructive' }); return; }
    try { await upsertMutation.mutateAsync(editing); toast({ title: 'Saved' }); setDialogOpen(false); }
    catch (err: any) { toast({ title: 'Error', description: err?.message, variant: 'destructive' }); }
  };

  const formatDuration = (r: BnTimelineRule) => {
    const parts = [];
    if (r.months_value) parts.push(`${r.months_value} month(s)`);
    if (r.weeks_value) parts.push(`${r.weeks_value} week(s)`);
    if (r.days_value) parts.push(`${r.days_value} day(s)`);
    return parts.join(', ') || '—';
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>Timeline Rules</CardTitle><CardDescription>Waiting periods, max durations, filing deadlines, and review intervals</CardDescription></div>
          <Button onClick={openNew} className="gap-2" disabled={isReadOnly}><Plus className="h-4 w-4" /> Add Rule</Button>
        </CardHeader>
        <CardContent>
          <ReadOnlyVersionBanner show={!!isReadOnly} status={versionStatus} />
          {isLoading ? <p className="text-muted-foreground py-4">Loading...</p> : rules.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No timeline rules configured.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Duration</TableHead><TableHead>Active</TableHead><TableHead className="w-20">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {rules.map((r: BnTimelineRule) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.rule_code}</TableCell>
                    <TableCell>{r.rule_name}</TableCell>
                    <TableCell><Badge variant="outline">{BN_TIMELINE_TYPES.find(t => t.value === r.timeline_type)?.label || r.timeline_type}</Badge></TableCell>
                    <TableCell>{formatDuration(r)}</TableCell>
                    <TableCell>{r.is_active ? <Badge>Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => { setEditing({ ...r }); setDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
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
          <DialogHeader><DialogTitle>{editing.id ? 'Edit' : 'Add'} Timeline Rule</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Rule Code *</Label><Input value={editing.rule_code || ''} onChange={e => update('rule_code', e.target.value.toUpperCase())} /></div>
            <div className="space-y-2"><Label>Rule Name *</Label><Input value={editing.rule_name || ''} onChange={e => update('rule_name', e.target.value)} /></div>
            <div className="col-span-2 space-y-2">
              <Label>Timeline Type</Label>
              <Select value={editing.timeline_type || 'WAITING_PERIOD'} onValueChange={v => update('timeline_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BN_TIMELINE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Days</Label><Input type="number" value={editing.days_value ?? ''} onChange={e => update('days_value', e.target.value ? parseInt(e.target.value) : null)} /></div>
            <div className="space-y-2"><Label>Weeks</Label><Input type="number" value={editing.weeks_value ?? ''} onChange={e => update('weeks_value', e.target.value ? parseInt(e.target.value) : null)} /></div>
            <div className="space-y-2"><Label>Months</Label><Input type="number" value={editing.months_value ?? ''} onChange={e => update('months_value', e.target.value ? parseInt(e.target.value) : null)} /></div>
            <div className="space-y-2"><Label>Sort Order</Label><Input type="number" value={editing.sort_order ?? 0} onChange={e => update('sort_order', parseInt(e.target.value) || 0)} /></div>
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
