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
          <h1 className="t-page-title">Service Document Types</h1>
          <p className="t-page-subtitle">Registry of special document types used across benefit claims</p>
        </div>
      </div>

      <BnScreenRoleBanner
        role="library"
        productAssemblyHint
        description="Reusable master of service-case document types (life certificate, school certificate, EFT/bank update, medical certificate, death certificate). These are referenced by products and service workflows."
      />

      <BNDataGrid
        id="bn.service-doc-types"
        data={types as BnServiceDocType[]}
        isLoading={isLoading}
        searchPlaceholder="Search by code, name, category…"
        onCreate={openNew}
        defaultSort={[{ id: 'type_code', desc: false }]}
        exportFilename="bn_service_doc_types"
        emptyMessage="No document types configured."
        columns={[
          { accessorKey: 'type_code', header: 'Code', meta: { label: 'Code', pinLeft: true, width: 140 }, cell: ({ getValue }) => <span className="font-mono text-sm">{String(getValue() ?? '')}</span> },
          { accessorKey: 'type_name', header: 'Name', meta: { label: 'Name', width: 240 } },
          { accessorKey: 'category', header: 'Category', meta: { label: 'Category', width: 140 }, cell: ({ getValue }) => <Badge variant="outline">{String(getValue() ?? '')}</Badge> },
          { accessorKey: 'default_expiry_days', header: 'Expiry', meta: { label: 'Expiry', width: 110 }, cell: ({ getValue }) => getValue() ? `${getValue()} days` : '—' },
          { accessorKey: 'requires_witness', header: 'Witness', meta: { label: 'Witness', width: 100 }, cell: ({ getValue }) => getValue() ? <Badge variant="warning">Yes</Badge> : '—' },
          { accessorKey: 'is_active', header: 'Active', meta: { label: 'Active', width: 100 }, cell: ({ getValue }) => getValue() ? <Badge>Yes</Badge> : <Badge variant="secondary">No</Badge> },
        ] as BNColumnDef<BnServiceDocType>[]}
        rowActions={[
          { key: 'edit', label: 'Edit', icon: <Edit className="h-3.5 w-3.5" />, onClick: (t) => { setEditing({ ...t }); setDialogOpen(true); } },
          { key: 'delete', label: 'Delete', icon: <Trash2 className="h-3.5 w-3.5" />, variant: 'destructive', onClick: async (t) => { await deleteMutation.mutateAsync(t.id); } },
        ]}
      />


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
