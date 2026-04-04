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
import { useBnDocumentRules, useUpsertBnDocumentRule, useDeleteBnDocumentRule } from '@/hooks/bn/useBnConfig';
import type { BnDocumentRule } from '@/types/bn';

interface Props { productId: string | undefined; }

export function DocumentRulesTab({ productId }: Props) {
  const { toast } = useToast();
  const { data: rules = [], isLoading } = useBnDocumentRules(productId);
  const upsertMutation = useUpsertBnDocumentRule();
  const deleteMutation = useDeleteBnDocumentRule();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<BnDocumentRule>>({});

  if (!productId) return <Card><CardContent className="py-8 text-center text-muted-foreground">Save the product first to configure documents.</CardContent></Card>;

  const openNew = () => {
    setEditing({ product_id: productId, document_type_code: '', document_name: '', description: '', is_mandatory: true, stage: 'INTAKE', sort_order: 0, is_active: true, max_file_size_mb: 10 });
    setDialogOpen(true);
  };
  const update = (f: string, v: unknown) => setEditing(p => ({ ...p, [f]: v }));

  const handleSave = async () => {
    if (!editing.document_type_code || !editing.document_name) { toast({ title: 'Validation', description: 'Type code and name are required.', variant: 'destructive' }); return; }
    try { await upsertMutation.mutateAsync(editing); toast({ title: 'Saved' }); setDialogOpen(false); }
    catch (err: any) { toast({ title: 'Error', description: err?.message, variant: 'destructive' }); }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>Document Requirements</CardTitle><CardDescription>Documents required at each stage of claim processing</CardDescription></div>
          <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Add Document</Button>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground py-4">Loading...</p> : rules.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No document rules configured.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Stage</TableHead><TableHead>Mandatory</TableHead><TableHead>Max Size</TableHead><TableHead>Active</TableHead><TableHead className="w-20">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {rules.map((r: BnDocumentRule) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.document_type_code}</TableCell>
                    <TableCell>{r.document_name}</TableCell>
                    <TableCell><Badge variant="outline">{r.stage}</Badge></TableCell>
                    <TableCell>{r.is_mandatory ? <Badge variant="destructive">Required</Badge> : <Badge variant="secondary">Optional</Badge>}</TableCell>
                    <TableCell>{r.max_file_size_mb} MB</TableCell>
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
          <DialogHeader><DialogTitle>{editing.id ? 'Edit' : 'Add'} Document Rule</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Document Type Code *</Label><Input value={editing.document_type_code || ''} onChange={e => update('document_type_code', e.target.value.toUpperCase())} /></div>
            <div className="space-y-2"><Label>Document Name *</Label><Input value={editing.document_name || ''} onChange={e => update('document_name', e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Stage</Label>
              <Select value={editing.stage || 'INTAKE'} onValueChange={v => update('stage', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INTAKE">Intake</SelectItem><SelectItem value="EVIDENCE">Evidence Review</SelectItem>
                  <SelectItem value="REVIEW">Review</SelectItem><SelectItem value="AWARD">Award</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Max File Size (MB)</Label><Input type="number" value={editing.max_file_size_mb ?? 10} onChange={e => update('max_file_size_mb', parseFloat(e.target.value) || 10)} /></div>
            <div className="flex items-center gap-2"><Switch checked={editing.is_mandatory ?? true} onCheckedChange={v => update('is_mandatory', v)} /><Label>Mandatory</Label></div>
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
