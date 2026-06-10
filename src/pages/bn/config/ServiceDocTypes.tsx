import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Edit, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBnServiceDocTypes, useUpsertServiceDocType, useDeleteServiceDocType } from '@/hooks/bn/useBnEvidence';
import type { BnServiceDocType } from '@/types/bn';
import { useUserCode } from '@/hooks/useUserCode';
import { BnScreenRoleBanner } from '@/components/bn/shared';
import { CodeFieldWithAutoGenerate } from '@/components/bn/smart';
import { useBnConfigAudit } from '@/hooks/bn/useBnConfigAudit';
import { BNDataGrid, type BNColumnDef } from '@/components/bn/grid';

const CATEGORIES = ['IDENTITY', 'FINANCIAL', 'MEDICAL', 'RELATIONSHIP', 'EMPLOYMENT', 'PERIODIC'];

export default function ServiceDocTypes() {
  const { toast } = useToast();
  const { userCode } = useUserCode();
  const audit = useBnConfigAudit();
  const { data: types = [], isLoading } = useBnServiceDocTypes();
  const upsertMutation = useUpsertServiceDocType();
  const deleteMutation = useDeleteServiceDocType();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<BnServiceDocType>>({});

  const otherCodes = (types as BnServiceDocType[])
    .filter(t => t.id !== editing.id)
    .map(t => t.type_code);

  const openNew = () => {
    setEditing({ type_code: '', type_name: '', category: 'IDENTITY', default_expiry_days: undefined, requires_witness: false, description: '', is_active: true });
    setDialogOpen(true);
  };

  const update = (f: string, v: unknown) => setEditing(p => ({ ...p, [f]: v }));

  const handleSave = async () => {
    if (!editing.type_code || !editing.type_name) {
      toast({ title: 'Validation', description: 'Type code and name are required.', variant: 'destructive' });
      return;
    }
    if (!editing.id && otherCodes.map(c => c.toUpperCase()).includes(editing.type_code.trim().toUpperCase())) {
      toast({ title: 'Duplicate code', description: 'Another document type already uses this code.', variant: 'destructive' });
      return;
    }
    try {
      const before = editing.id ? (types as BnServiceDocType[]).find(t => t.id === editing.id) ?? null : null;
      const record = { ...editing, entered_by: editing.id ? undefined : userCode, modified_by: userCode };
      const saved = await upsertMutation.mutateAsync(record);
      audit.log({
        entityType: 'bn_service_doc_type',
        entityId: (saved as any)?.id ?? editing.id ?? 'new',
        action: editing.id ? 'UPDATE' : 'CREATE',
        before, after: editing,
      });
      toast({ title: 'Saved' });
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <FileText className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Service Document Types</h1>
          <p className="text-sm text-muted-foreground">Registry of special document types used across benefit claims</p>
        </div>
      </div>

      <BnScreenRoleBanner
        role="library"
        productAssemblyHint
        description="Reusable master of service-case document types (life certificate, school certificate, EFT/bank update, medical certificate, death certificate). These are referenced by products and service workflows."
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>Document Types</CardTitle><CardDescription>Configure types for life certificates, medical certificates, bank forms, etc.</CardDescription></div>
          <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Add Type</Button>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground py-4">Loading...</p> : types.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No document types configured.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Witness</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map((t: BnServiceDocType) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-sm">{t.type_code}</TableCell>
                    <TableCell>{t.type_name}</TableCell>
                    <TableCell><Badge variant="outline">{t.category}</Badge></TableCell>
                    <TableCell>{t.default_expiry_days ? `${t.default_expiry_days} days` : '—'}</TableCell>
                    <TableCell>{t.requires_witness ? <Badge variant="warning">Yes</Badge> : '—'}</TableCell>
                    <TableCell>{t.is_active ? <Badge>Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing({ ...t }); setDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={async () => { await deleteMutation.mutateAsync(t.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
          <DialogHeader><DialogTitle>{editing.id ? 'Edit' : 'Add'} Service Document Type</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <CodeFieldWithAutoGenerate
                label="Type Code"
                required
                prefix="SDT"
                value={editing.type_code || ''}
                onChange={(v) => update('type_code', v)}
                existingCodes={otherCodes}
                disabled={!!editing.id}
                helpText="Unique service-doc type code."
              />
            </div>
            <div className="space-y-2"><Label>Type Name *</Label><Input value={editing.type_name || ''} onChange={e => update('type_name', e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={editing.category || 'IDENTITY'} onValueChange={v => update('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Default Expiry (Days)</Label><Input type="number" value={editing.default_expiry_days ?? ''} onChange={e => update('default_expiry_days', e.target.value ? parseInt(e.target.value) : null)} /></div>
            <div className="col-span-2 space-y-2"><Label>Description</Label><Textarea value={editing.description || ''} onChange={e => update('description', e.target.value)} rows={2} /></div>
            <div className="flex items-center gap-2"><Switch checked={editing.requires_witness ?? false} onCheckedChange={v => update('requires_witness', v)} /><Label>Requires Witness</Label></div>
            <div className="flex items-center gap-2"><Switch checked={editing.is_active ?? true} onCheckedChange={v => update('is_active', v)} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsertMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
