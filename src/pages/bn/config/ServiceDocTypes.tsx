import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Edit, FileText, Link2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBnServiceDocTypes, useUpsertServiceDocType, useDeleteServiceDocType } from '@/hooks/bn/useBnEvidence';
import { useReferenceValues } from '@/hooks/bn/useReferenceData';
import { fetchDocumentLibraryOptions } from '@/services/bn/evidenceService';
import type { BnServiceDocType } from '@/types/bn';
import { useUserCode } from '@/hooks/useUserCode';
import { BnScreenRoleBanner } from '@/components/bn/shared';
import { CodeFieldWithAutoGenerate } from '@/components/bn/smart';
import { useBnConfigAudit } from '@/hooks/bn/useBnConfigAudit';
import { BNDataGrid, type BNColumnDef } from '@/components/bn/grid';

// Fallback used only if the Reference Data group hasn't been seeded yet
const CATEGORY_FALLBACK = [
  { value: 'IDENTITY',    label: 'Identity' },
  { value: 'FINANCIAL',   label: 'Financial' },
  { value: 'MEDICAL',     label: 'Medical' },
  { value: 'RELATIONSHIP',label: 'Relationship' },
  { value: 'EMPLOYMENT',  label: 'Employment' },
  { value: 'PERIODIC',    label: 'Periodic' },
  { value: 'LEGAL',       label: 'Legal' },
  { value: 'PAYMENT',     label: 'Payment' },
  { value: 'FUNERAL',     label: 'Funeral' },
  { value: 'EDUCATION',   label: 'Education' },
];

const VERIFICATION_LEVELS = [
  { value: 'BASIC',         label: 'Basic — visual check' },
  { value: 'STANDARD',      label: 'Standard — officer verifies' },
  { value: 'ENHANCED',      label: 'Enhanced — supervisor approval' },
  { value: 'NOTARIZED',     label: 'Notarized / certified copy required' },
];

export default function ServiceDocTypes() {
  const { toast } = useToast();
  const { userCode } = useUserCode();
  const audit = useBnConfigAudit();
  const { data: types = [], isLoading } = useBnServiceDocTypes();
  const upsertMutation = useUpsertServiceDocType();
  const deleteMutation = useDeleteServiceDocType();
  const { options: categoryOptions } = useReferenceValues('BN_SERVICE_DOCUMENT_CATEGORY', CATEGORY_FALLBACK);
  const { data: libraryOptions = [] } = useQuery({
    queryKey: ['bn', 'doc-library-options'],
    queryFn: fetchDocumentLibraryOptions,
    staleTime: 5 * 60_000,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<BnServiceDocType>>({});

  const otherCodes = (types as BnServiceDocType[])
    .filter(t => t.id !== editing.id)
    .map(t => t.type_code);

  const openNew = () => {
    setEditing({
      type_code: '',
      type_name: '',
      category: categoryOptions[0]?.value ?? 'IDENTITY',
      default_expiry_days: undefined,
      requires_witness: false,
      requires_verification: false,
      verification_level: null,
      periodic_renewal: false,
      document_library_id: null,
      description: '',
      is_active: true,
    });
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
    // Block linking an inactive Document Library entry on a NEW record (server also validates)
    if (!editing.id && editing.document_library_id) {
      const lib = libraryOptions.find(l => l.id === editing.document_library_id);
      if (lib && !lib.is_active) {
        toast({
          title: 'Inactive Document Library',
          description: 'Cannot link an inactive Document Library entry to a new Service Document Type.',
          variant: 'destructive',
        });
        return;
      }
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
          <p className="t-page-subtitle">
            Benefits-specific document usage master. Optionally linked to enterprise Document Library entries.
          </p>
        </div>
      </div>

      <BnScreenRoleBanner
        role="library"
        productAssemblyHint
        description="Benefits-specific document usage master. Each type can optionally link to a Document Library entry (file rules, retention, classification). Product Catalog decides which types are required per benefit."
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
          { accessorKey: 'type_code', header: 'Code', meta: { label: 'Code', pinLeft: true, width: 150 }, cell: ({ getValue }) => <span className="font-mono text-sm">{String(getValue() ?? '')}</span> },
          { accessorKey: 'type_name', header: 'Name', meta: { label: 'Name', width: 220 } },
          {
            accessorKey: 'category',
            header: 'Category',
            meta: { label: 'Category', width: 130 },
            cell: ({ getValue }) => {
              const code = String(getValue() ?? '');
              const opt = categoryOptions.find(o => o.value === code);
              return <Badge variant="outline">{opt?.label ?? code}</Badge>;
            },
          },
          {
            id: 'document_library',
            header: 'Document Library',
            accessorFn: (r: BnServiceDocType) => r.document_library_name ?? '',
            meta: { label: 'Document Library', width: 200 },
            cell: ({ row }) => {
              const r = row.original as BnServiceDocType;
              return r.document_library_id
                ? <span className="inline-flex items-center gap-1 text-xs"><Link2 className="h-3 w-3 text-primary" />{r.document_library_name ?? r.document_library_id}</span>
                : <span className="text-xs text-muted-foreground">—</span>;
            },
          },
          { accessorKey: 'default_expiry_days', header: 'Expiry', meta: { label: 'Expiry', width: 110 }, cell: ({ getValue }) => getValue() ? `${getValue()} days` : '—' },
          { accessorKey: 'requires_witness', header: 'Witness', meta: { label: 'Witness', width: 90 }, cell: ({ getValue }) => getValue() ? <Badge variant="warning">Yes</Badge> : '—' },
          { accessorKey: 'requires_verification', header: 'Verify', meta: { label: 'Verify', width: 90 }, cell: ({ getValue }) => getValue() ? <Badge variant="warning">Yes</Badge> : '—' },
          { accessorKey: 'verification_level', header: 'Level', meta: { label: 'Verification Level', width: 130 }, cell: ({ getValue }) => getValue() ? <Badge variant="outline">{String(getValue())}</Badge> : '—' },
          { accessorKey: 'periodic_renewal', header: 'Periodic', meta: { label: 'Periodic Renewal', width: 100 }, cell: ({ getValue }) => getValue() ? <Badge>Yes</Badge> : '—' },
          { accessorKey: 'used_by_products_count', header: 'Products', meta: { label: 'Used By Products', width: 110 }, cell: ({ getValue }) => <span className="font-mono text-xs">{Number(getValue() ?? 0)}</span> },
          { accessorKey: 'used_by_workflows_count', header: 'Workflows', meta: { label: 'Used By Workflows', width: 110 }, cell: ({ getValue }) => <span className="font-mono text-xs">{Number(getValue() ?? 0)}</span> },
          { accessorKey: 'is_active', header: 'Status', meta: { label: 'Status', width: 100 }, cell: ({ getValue }) => getValue() ? <Badge>Active</Badge> : <Badge variant="secondary">Retired</Badge> },
        ] as BNColumnDef<BnServiceDocType>[]}
        rowActions={[
          { key: 'edit', label: 'Edit', icon: <Edit className="h-3.5 w-3.5" />, onClick: (t) => { setEditing({ ...t }); setDialogOpen(true); } },
          {
            key: 'delete',
            label: 'Delete',
            icon: <Trash2 className="h-3.5 w-3.5" />,
            variant: 'destructive',
            onClick: async (t) => {
              if ((t.used_by_products_count ?? 0) > 0) {
                toast({ title: 'Cannot delete', description: 'This type is referenced by Product Catalog requirements. Retire it instead.', variant: 'destructive' });
                return;
              }
              await deleteMutation.mutateAsync(t.id);
            },
          },
        ]}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
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
            <div className="space-y-2">
              <Label>Type Name *</Label>
              <Input value={editing.type_name || ''} onChange={e => update('type_name', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={editing.category || categoryOptions[0]?.value || 'IDENTITY'} onValueChange={v => update('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">From Reference Data: BN_SERVICE_DOCUMENT_CATEGORY</p>
            </div>

            <div className="space-y-2">
              <Label>Linked Document Library</Label>
              <Select
                value={editing.document_library_id ?? '__none__'}
                onValueChange={v => update('document_library_id', v === '__none__' ? null : v)}
              >
                <SelectTrigger><SelectValue placeholder="Not linked" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Not linked —</SelectItem>
                  {libraryOptions.map(l => (
                    <SelectItem key={l.id} value={l.id} disabled={!l.is_active && l.id !== editing.document_library_id}>
                      {l.document_name}{!l.is_active ? ' (inactive)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Optional. File rules, retention &amp; classification are inherited from Document Library if linked.</p>
            </div>

            <div className="space-y-2">
              <Label>Default Expiry (Days)</Label>
              <Input type="number" value={editing.default_expiry_days ?? ''} onChange={e => update('default_expiry_days', e.target.value ? parseInt(e.target.value) : null)} />
            </div>

            <div className="space-y-2">
              <Label>Verification Level</Label>
              <Select
                value={editing.verification_level ?? '__none__'}
                onValueChange={v => update('verification_level', v === '__none__' ? null : v)}
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {VERIFICATION_LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Description</Label>
              <Textarea value={editing.description || ''} onChange={e => update('description', e.target.value)} rows={2} />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={editing.requires_witness ?? false} onCheckedChange={v => update('requires_witness', v)} />
              <Label>Requires Witness</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editing.requires_verification ?? false} onCheckedChange={v => update('requires_verification', v)} />
              <Label>Requires Verification</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editing.periodic_renewal ?? false} onCheckedChange={v => update('periodic_renewal', v)} />
              <Label>Periodic Renewal</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editing.is_active ?? true} onCheckedChange={v => update('is_active', v)} />
              <Label>Active</Label>
            </div>
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
