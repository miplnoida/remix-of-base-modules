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
import { Plus, Edit, Trash2, Receipt } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useExpenseTypes, useUpsertExpenseType, useDeleteExpenseType } from '@/hooks/bn/useBnMedical';
import type { BnMedicalExpenseType } from '@/types/bnMedical';
import { useUserCode } from '@/hooks/useUserCode';

const CATEGORIES = ['Consultation', 'Diagnostic', 'Pharmacy', 'Hospitalisation', 'Travel', 'Accommodation', 'Other'];

export default function ExpenseTypeConfiguration() {
  const { toast } = useToast();
  const { userCode } = useUserCode();
  const { data = [] } = useExpenseTypes();
  const upsert = useUpsertExpenseType();
  const del = useDeleteExpenseType();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<BnMedicalExpenseType>>({});

  const openNew = () => {
    setEditing({ expense_code: '', expense_name: '', category: 'Consultation', country_code: 'SKN', reimbursable: true, requires_receipt: true, requires_invoice: false, is_active: true });
    setOpen(true);
  };
  const upd = (f: keyof BnMedicalExpenseType, v: unknown) => setEditing((p) => ({ ...p, [f]: v }));
  const save = async () => {
    if (!editing.expense_code || !editing.expense_name) {
      toast({ title: 'Validation', description: 'Code and name are required.', variant: 'destructive' }); return;
    }
    try { await upsert.mutateAsync({ ...editing, modified_by: userCode, ...(editing.id ? {} : { created_by: userCode }) } as any); toast({ title: 'Saved' }); setOpen(false); }
    catch (e: any) { toast({ title: 'Error', description: e?.message, variant: 'destructive' }); }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Receipt className="h-8 w-8 text-primary" />
        <div>
          <h1 className="t-page-title">Expense Type Configuration</h1>
          <p className="text-sm text-muted-foreground">Reimbursable expense categories with default caps.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>Expense Types</CardTitle><CardDescription>Used by claim entry and the reimbursement calculator.</CardDescription></div>
          <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Add Type</Button>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? <p className="text-muted-foreground py-6 text-center">No expense types configured.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Country</TableHead><TableHead>Reimb.</TableHead><TableHead>Receipt</TableHead><TableHead>Invoice</TableHead><TableHead>Default Cap</TableHead><TableHead>Active</TableHead><TableHead className="w-20">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-sm">{e.expense_code}</TableCell>
                    <TableCell>{e.expense_name}</TableCell>
                    <TableCell><Badge variant="outline">{e.category || '—'}</Badge></TableCell>
                    <TableCell>{e.country_code}</TableCell>
                    <TableCell>{e.reimbursable ? '✓' : '—'}</TableCell>
                    <TableCell>{e.requires_receipt ? '✓' : '—'}</TableCell>
                    <TableCell>{e.requires_invoice ? '✓' : '—'}</TableCell>
                    <TableCell>{e.default_cap != null ? e.default_cap : '—'}</TableCell>
                    <TableCell>{e.is_active ? <Badge>Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing({ ...e }); setOpen(true); }}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={async () => { await del.mutateAsync(e.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
          <DialogHeader><DialogTitle>{editing.id ? 'Edit' : 'Add'} Expense Type</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Code *</Label><Input value={editing.expense_code || ''} onChange={(e) => upd('expense_code', e.target.value.toUpperCase())} /></div>
            <div className="space-y-2"><Label>Name *</Label><Input value={editing.expense_name || ''} onChange={(e) => upd('expense_name', e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={editing.category || ''} onValueChange={(v) => upd('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Country</Label><Input value={editing.country_code || ''} onChange={(e) => upd('country_code', e.target.value.toUpperCase())} /></div>
            <div className="space-y-2"><Label>Default Cap</Label><Input type="number" step="0.01" value={editing.default_cap ?? ''} onChange={(e) => upd('default_cap', e.target.value === '' ? null : Number(e.target.value))} /></div>
            <div />
            <div className="col-span-2 space-y-2"><Label>Description</Label><Textarea rows={2} value={editing.description || ''} onChange={(e) => upd('description', e.target.value)} /></div>
            <div className="flex items-center gap-2"><Switch checked={editing.reimbursable ?? true} onCheckedChange={(v) => upd('reimbursable', v)} /><Label>Reimbursable</Label></div>
            <div className="flex items-center gap-2"><Switch checked={editing.requires_receipt ?? true} onCheckedChange={(v) => upd('requires_receipt', v)} /><Label>Requires Receipt</Label></div>
            <div className="flex items-center gap-2"><Switch checked={editing.requires_invoice ?? false} onCheckedChange={(v) => upd('requires_invoice', v)} /><Label>Requires Invoice</Label></div>
            <div className="flex items-center gap-2"><Switch checked={editing.is_active ?? true} onCheckedChange={(v) => upd('is_active', v)} /><Label>Active</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} disabled={upsert.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
