/**
 * Document Setup — Reusable document profile library
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Edit, FileCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useBnDocumentProfiles, useUpsertBnDocumentProfile } from '@/hooks/bn/useBnConfig';
import { useUserCode } from '@/hooks/useUserCode';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { PageHeader } from '@/components/common/PageHeader';
import { BnScreenRoleBanner } from '@/components/bn/shared';
import { CodeFieldWithAutoGenerate } from '@/components/bn/smart';
import { useBnConfigAudit } from '@/hooks/bn/useBnConfigAudit';
import type { BnDocumentProfile } from '@/types/bn';
import { BNDataGrid, type BNColumnDef } from '@/components/bn/grid';
import CountryFieldSelector from '@/components/bn/selectors/CountryFieldSelector';

type ProfileForm = {
  id?: string;
  profile_code: string;
  profile_name: string;
  description: string;
  country_code: string;
  is_active: boolean;
};

const emptyForm: ProfileForm = {
  profile_code: '',
  profile_name: '',
  description: '',
  country_code: '',
  is_active: true,
};

export default function DocumentSetup() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const { data: profiles = [], isLoading, refetch } = useBnDocumentProfiles();
  const upsert = useUpsertBnDocumentProfile();
  const { userCode } = useUserCode();
  const audit = useBnConfigAudit();

  const otherCodes = profiles.filter((p: BnDocumentProfile) => p.id !== form.id).map((p: BnDocumentProfile) => p.profile_code);

  const openAdd = () => { setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (p: BnDocumentProfile) => {
    setForm({
      id: p.id,
      profile_code: p.profile_code,
      profile_name: p.profile_name,
      description: p.description ?? '',
      country_code: p.country_code ?? '',
      is_active: p.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.profile_code.trim() || !form.profile_name.trim()) {
      toast.error('Please check the form for valid information!', { description: 'Code and Name are required.' });
      return;
    }
    if (otherCodes.map(c => c.toUpperCase()).includes(form.profile_code.trim().toUpperCase())) {
      toast.error('Duplicate code', { description: 'Another profile already uses this code.' });
      return;
    }
    try {
      const before = form.id ? profiles.find((p: BnDocumentProfile) => p.id === form.id) ?? null : null;
      const saved = await upsert.mutateAsync({
        ...(form.id ? { id: form.id } : {}),
        profile_code: form.profile_code.trim(),
        profile_name: form.profile_name.trim(),
        description: form.description.trim() || null,
        country_code: form.country_code.trim() || null,
        is_active: form.is_active,
        entered_by: userCode ?? null,
      } as Partial<BnDocumentProfile>);
      audit.log({
        entityType: 'bn_document_profile',
        entityId: (saved as any)?.id ?? form.id ?? 'new',
        action: form.id ? 'UPDATE' : 'CREATE',
        before, after: form,
      });
      toast.success(form.id ? 'Profile updated' : 'Profile created');
      setDialogOpen(false);
    } catch (e: any) {
      toast.error('Save failed', { description: e?.message ?? 'Unable to save profile.' });
    }
  };

  return (
    <PermissionWrapper moduleName="bn_configuration">
      <div className="space-y-6 p-6">
        <PageHeader
          title="Document Library"
          subtitle="Reusable document type and profile library"
          breadcrumbs={[
            { label: 'Benefit Management', href: '/bn/claims' },
            { label: 'Configuration' },
            { label: 'Document Library' },
          ]}
        />

        <BnScreenRoleBanner
          role="library"
          productAssemblyHint
          description="Reusable document types and profiles. Product-specific required documents are assigned in Product Catalog → select the product version → Documents tab."
        />

        <BNDataGrid
          id="bn.document-profiles"
          data={profiles as BnDocumentProfile[]}
          isLoading={isLoading}
          searchPlaceholder="Search document profiles..."
          onCreate={openAdd}
          onRefresh={() => refetch()}
          onRowClick={openEdit}
          defaultSort={[{ id: 'profile_code', desc: false }]}
          exportFilename="bn_document_profiles"
          emptyMessage="No document profiles. Create one to define required documents for benefit claims."
          columns={[
            { accessorKey: 'profile_code', header: 'Code', meta: { label: 'Code', pinLeft: true, width: 140 }, cell: ({ getValue }) => <span className="font-mono text-sm">{String(getValue() ?? '')}</span> },
            { accessorKey: 'profile_name', header: 'Profile Name', meta: { label: 'Profile Name', width: 280 }, cell: ({ getValue }) => (
              <div className="flex items-center gap-2 font-medium text-sm">
                <FileCheck className="h-4 w-4 text-muted-foreground" />
                {String(getValue() ?? '')}
              </div>
            ) },
            { accessorKey: 'country_code', header: 'Country', meta: { label: 'Country', width: 90 }, cell: ({ getValue }) => <span className="text-xs">{(getValue() as string) || '—'}</span> },
            { accessorKey: 'description', header: 'Description', meta: { label: 'Description', width: 360 }, cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{(getValue() as string) || '—'}</span> },
          ] as BNColumnDef<BnDocumentProfile>[]}
          rowActions={[
            { key: 'edit', label: 'Edit', icon: <Edit className="h-3.5 w-3.5" />, onClick: openEdit },
          ]}
        />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{form.id ? 'Edit Document Profile' : 'Add Document Profile'}</DialogTitle>
              <DialogDescription>
                Define a reusable document profile. Attach to products inside Product Catalog → Documents.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <CodeFieldWithAutoGenerate
                  label="Code"
                  required
                  prefix="DOC"
                  value={form.profile_code}
                  onChange={(v) => setForm({ ...form, profile_code: v })}
                  existingCodes={otherCodes}
                  disabled={!!form.id}
                  helpText="Unique profile code. Cannot be changed after creation."
                />
                <div className="space-y-1.5">
                  <Label htmlFor="dp_country">Country code</Label>
                  <Input id="dp_country" value={form.country_code} maxLength={3} placeholder="Leave blank for global"
                    onChange={(e) => setForm({ ...form, country_code: e.target.value.toUpperCase() })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dp_name">Profile Name *</Label>
                <Input id="dp_name" value={form.profile_name} maxLength={120}
                  onChange={(e) => setForm({ ...form, profile_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dp_desc">Description</Label>
                <Textarea id="dp_desc" value={form.description} maxLength={500} rows={3}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="dp_active" checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label htmlFor="dp_active">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={upsert.isPending}>
                {upsert.isPending ? 'Saving…' : (form.id ? 'Save changes' : 'Create profile')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionWrapper>
  );
}
