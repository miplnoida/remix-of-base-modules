import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit } from 'lucide-react';
import { useBnWorkbaskets, useCreateBnWorkbasket, useUpdateBnWorkbasket } from '@/hooks/bn/useBnWorkbasket';
import { useUserCode } from '@/hooks/useUserCode';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { toast } from 'sonner';
import type { BnWorkbasket } from '@/types/bn';
import { BnScreenRoleBanner } from '@/components/bn/shared';
import { SmartSelect, CodeFieldWithAutoGenerate } from '@/components/bn/smart';
import { BN_PRODUCT_CATEGORIES } from '@/services/bn/registries';
import { useWorkflowRoles } from '@/hooks/bn/useWorkflowRoles';
import { useBnConfigAudit } from '@/hooks/bn/useBnConfigAudit';

export default function WorkbasketConfig() {
  const { userCode } = useUserCode();
  const { data: workbaskets = [] } = useBnWorkbaskets();
  const { roles: workflowRoles } = useWorkflowRoles();
  const createMut = useCreateBnWorkbasket();
  const updateMut = useUpdateBnWorkbasket();
  const { log } = useBnConfigAudit();

  const [editItem, setEditItem] = useState<BnWorkbasket | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState({
    basket_code: '',
    basket_name: '',
    description: '',
    assigned_role: '',
    product_category: '',
    country_code: '',
    max_capacity: '',
    is_active: true,
  });

  const openNew = () => {
    setIsNew(true);
    setForm({ basket_code: '', basket_name: '', description: '', assigned_role: '', product_category: '', country_code: '', max_capacity: '', is_active: true });
    setEditItem({} as any);
  };

  const openEdit = (item: BnWorkbasket) => {
    setIsNew(false);
    setForm({
      basket_code: item.basket_code,
      basket_name: item.basket_name,
      description: item.description || '',
      assigned_role: item.assigned_role,
      product_category: item.product_category || '',
      country_code: item.country_code || '',
      max_capacity: item.max_capacity?.toString() || '',
      is_active: item.is_active,
    });
    setEditItem(item);
  };

  const handleSave = async () => {
    if (!form.basket_code.trim() || !form.basket_name.trim()) {
      toast.error('Code and Name are required');
      return;
    }
    if (!form.assigned_role) {
      toast.error('Assigned Role is required');
      return;
    }
    const payload: any = {
      basket_code: form.basket_code,
      basket_name: form.basket_name,
      description: form.description || null,
      assigned_role: form.assigned_role,
      product_category: form.product_category || null,
      country_code: form.country_code || null,
      max_capacity: form.max_capacity ? parseInt(form.max_capacity) : null,
      is_active: form.is_active,
    };

    try {
      if (isNew) {
        payload.entered_by = userCode;
        const res: any = await createMut.mutateAsync(payload);
        log({ entityType: 'bn_workbasket', entityId: res?.id ?? form.basket_code, action: 'CREATE', after: payload });
        toast.success('Workbasket created');
      } else {
        payload.modified_by = userCode;
        await updateMut.mutateAsync({ id: editItem!.id, updates: payload });
        log({ entityType: 'bn_workbasket', entityId: editItem!.id, action: 'UPDATE', before: editItem as any, after: payload });
        toast.success('Workbasket updated');
      }
      setEditItem(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <PermissionWrapper moduleName="benefits_management">
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Workbaskets</h1>
          <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Add Workbasket</Button>
        </div>

        <BnScreenRoleBanner
          role="library"
          productAssemblyHint
          description="Reusable operational queues (intake, evidence review, medical board, supervisor approval, finance). Workflow routing references these baskets."
        />



        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workbaskets.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-sm">{b.basket_code}</TableCell>
                    <TableCell>{b.basket_name}</TableCell>
                    <TableCell><Badge variant="secondary">{b.assigned_role}</Badge></TableCell>
                    <TableCell>{b.product_category || '—'}</TableCell>
                    <TableCell>{b.max_capacity || '—'}</TableCell>
                    <TableCell><Badge variant={b.is_active ? 'default' : 'outline'}>{b.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(b)}><Edit className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {workbaskets.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No workbaskets configured</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={!!editItem} onOpenChange={open => !open && setEditItem(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{isNew ? 'Add Workbasket' : 'Edit Workbasket'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {isNew ? (
                <CodeFieldWithAutoGenerate
                  label="Code"
                  value={form.basket_code}
                  onChange={(v) => setForm(p => ({ ...p, basket_code: v }))}
                  existingCodes={workbaskets.map(w => w.basket_code)}
                  prefix="WB"
                  required
                />
              ) : (
                <div className="space-y-1"><label className="text-sm font-medium">Code</label><Input value={form.basket_code} disabled /></div>
              )}
              <div className="space-y-1"><label className="text-sm font-medium">Name</label><Input value={form.basket_name} onChange={e => setForm(p => ({ ...p, basket_name: e.target.value }))} /></div>
              <div className="space-y-1"><label className="text-sm font-medium">Description</label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Assigned Role</label>
                <SmartSelect
                  value={form.assigned_role}
                  onValueChange={(v) => setForm(p => ({ ...p, assigned_role: v }))}
                  options={workflowRoles.map(r => ({ value: r, label: r.replace(/_/g, ' ') }))}
                  placeholder="Select role"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Product Category</label>
                  <SmartSelect
                    value={form.product_category}
                    onValueChange={(v) => setForm(p => ({ ...p, product_category: v }))}
                    options={[{ value: '', label: '— Any —' }, ...BN_PRODUCT_CATEGORIES]}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-1"><label className="text-sm font-medium">Max Capacity</label><Input type="number" value={form.max_capacity} onChange={e => setForm(p => ({ ...p, max_capacity: e.target.value }))} placeholder="Optional" /></div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} /><label className="text-sm">Active</label></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
              <Button onClick={handleSave}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionWrapper>
  );
}
