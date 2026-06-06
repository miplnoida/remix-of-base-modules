/**
 * Document Setup — Reusable document profile library
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Plus, Edit, FileCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useBnDocumentProfiles, useUpsertBnDocumentProfile } from '@/hooks/bn/useBnConfig';
import { useUserCode } from '@/hooks/useUserCode';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { PageHeader } from '@/components/common/PageHeader';
import { BnEmptyState, BnFilterBar, BnScreenRoleBanner } from '@/components/bn/shared';
import { CodeFieldWithAutoGenerate } from '@/components/bn/smart';
import { useBnConfigAudit } from '@/hooks/bn/useBnConfigAudit';
import type { BnDocumentProfile } from '@/types/bn';

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
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const { data: profiles = [], isLoading } = useBnDocumentProfiles();
  const upsert = useUpsertBnDocumentProfile();
  const { userCode } = useUserCode();

  const filtered = profiles.filter((p: BnDocumentProfile) =>
    !search || p.profile_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.profile_code?.toLowerCase().includes(search.toLowerCase())
  );

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
      toast.error('Please check the form for valid information!', {
        description: 'Code and Name are required.',
      });
      return;
    }
    try {
      await upsert.mutateAsync({
        ...(form.id ? { id: form.id } : {}),
        profile_code: form.profile_code.trim(),
        profile_name: form.profile_name.trim(),
        description: form.description.trim() || null,
        country_code: form.country_code.trim() || null,
        is_active: form.is_active,
        entered_by: userCode ?? null,
      } as Partial<BnDocumentProfile>);
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

        <Card>
          <CardHeader className="pb-3">
            <BnFilterBar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search document profiles..."
              filters={[]}
              actions={
                <Button size="sm" className="gap-1.5" onClick={openAdd}>
                  <Plus className="h-3.5 w-3.5" /> Add Profile
                </Button>
              }
            />
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <BnEmptyState type="loading" />
            ) : filtered.length === 0 ? (
              <BnEmptyState type={search ? 'no-results' : 'empty'} title="No document profiles" description="Create a profile to define required documents for benefit claims." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Profile Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[60px]">Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p: BnDocumentProfile) => (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(p)}>
                      <TableCell className="font-mono text-sm">{p.profile_code}</TableCell>
                      <TableCell className="font-medium text-sm">
                        <div className="flex items-center gap-2">
                          <FileCheck className="h-4 w-4 text-muted-foreground" />
                          {p.profile_name}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[400px] truncate">{p.description || '—'}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

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
                <div className="space-y-1.5">
                  <Label htmlFor="dp_code">Code *</Label>
                  <Input id="dp_code" value={form.profile_code} maxLength={50}
                    onChange={(e) => setForm({ ...form, profile_code: e.target.value.toUpperCase() })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dp_country">Country code</Label>
                  <Input id="dp_country" value={form.country_code} maxLength={3} placeholder="e.g. KN"
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
