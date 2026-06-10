import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, ClipboardList } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMedicalProcedures, useUpsertProcedure, useDeleteProcedure } from '@/hooks/bn/useBnMedical';
import type { BnMedicalProcedure } from '@/types/bnMedical';
import { useUserCode } from '@/hooks/useUserCode';

const CATEGORIES = ['Surgery', 'Diagnostic', 'Treatment', 'Hospitalisation', 'Rehabilitation', 'Pharmacy', 'Other'];

export default function MedicalProceduresCatalog() {
  const { toast } = useToast();
  const { userCode } = useUserCode();
  const { data = [], isLoading } = useMedicalProcedures();
  const upsert = useUpsertProcedure();
  const del = useDeleteProcedure();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<BnMedicalProcedure>>({});

  const openNew = () => {
    setEditing({
      procedure_code: '', procedure_name: '', category: 'Surgery', specialty: '',
      country_code: 'SKN', requires_pre_authorization: false, requires_medical_board: false,
      effective_from: new Date().toISOString().slice(0, 10), is_active: true,
    });
    setOpen(true);
  };

  const upd = (f: keyof BnMedicalProcedure, v: unknown) => setEditing((p) => ({ ...p, [f]: v }));

  const save = async () => {
    if (!editing.procedure_code || !editing.procedure_name) {
      toast({ title: 'Validation', description: 'Code and name are required.', variant: 'destructive' });
      return;
    }
    try {
      await upsert.mutateAsync({ ...editing, modified_by: userCode, ...(editing.id ? {} : { created_by: userCode }) } as any);
      toast({ title: 'Saved' });
      setOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-8 w-8 text-primary" />
        <div>
          <h1 className="t-page-title">Medical Procedures Catalog</h1>
          <p className="t-page-subtitle mt-1">Effective-dated catalog of procedures, surgeries and medical processes.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>Procedures</CardTitle><CardDescription>Each procedure can require pre-authorization and / or medical board review.</CardDescription></div>
          <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Add Procedure</Button>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground py-4">Loading…</p> : data.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No procedures configured.</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Category</TableHead>
                <TableHead>Country</TableHead><TableHead>Pre-Auth</TableHead><TableHead>Board</TableHead>
                <TableHead>Effective</TableHead><TableHead>Active</TableHead><TableHead className="w-20">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">{p.procedure_code}</TableCell>
                    <TableCell>{p.procedure_name}</TableCell>
                    <TableCell><Badge variant="outline">{p.category || '—'}</Badge></TableCell>
                    <TableCell>{p.country_code}</TableCell>
                    <TableCell>{p.requires_pre_authorization ? <Badge>Yes</Badge> : '—'}</TableCell>
                    <TableCell>{p.requires_medical_board ? <Badge>Yes</Badge> : '—'}</TableCell>
                    <TableCell className="text-xs">{p.effective_from}{p.effective_to ? ` → ${p.effective_to}` : ''}</TableCell>
                    <TableCell>{p.is_active ? <Badge>Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing({ ...p }); setOpen(true); }}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={async () => { await del.mutateAsync(p.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing.id ? 'Edit' : 'Add'} Procedure</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Procedure Code *</Label><Input value={editing.procedure_code || ''} onChange={(e) => upd('procedure_code', e.target.value.toUpperCase())} /></div>
            <div className="space-y-2"><Label>Procedure Name *</Label><Input value={editing.procedure_name || ''} onChange={(e) => upd('procedure_name', e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={editing.category || 'Surgery'} onValueChange={(v) => upd('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Specialty</Label><Input value={editing.specialty || ''} onChange={(e) => upd('specialty', e.target.value)} /></div>
            <div className="space-y-2"><Label>Country Code</Label><Input value={editing.country_code || 'SKN'} onChange={(e) => upd('country_code', e.target.value.toUpperCase())} /></div>
            <div className="space-y-2"><Label>Effective From</Label><Input type="date" value={editing.effective_from || ''} onChange={(e) => upd('effective_from', e.target.value)} /></div>
            <div className="space-y-2"><Label>Effective To</Label><Input type="date" value={editing.effective_to || ''} onChange={(e) => upd('effective_to', e.target.value || null)} /></div>
            <div className="col-span-2 space-y-2"><Label>Description</Label><Textarea rows={2} value={editing.description || ''} onChange={(e) => upd('description', e.target.value)} /></div>
            <div className="flex items-center gap-2"><Switch checked={editing.requires_pre_authorization ?? false} onCheckedChange={(v) => upd('requires_pre_authorization', v)} /><Label>Requires Pre-Authorization</Label></div>
            <div className="flex items-center gap-2"><Switch checked={editing.requires_medical_board ?? false} onCheckedChange={(v) => upd('requires_medical_board', v)} /><Label>Requires Medical Board</Label></div>
            <div className="flex items-center gap-2"><Switch checked={editing.is_active ?? true} onCheckedChange={(v) => upd('is_active', v)} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={upsert.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
