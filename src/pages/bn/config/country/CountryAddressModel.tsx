import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { BnCountryProvider, useBnCountry } from '@/contexts/BnCountryContext';
import CountrySelector from '@/components/bn/country/CountrySelector';
import { useBnCountryAddressModel, useUpsertCountryAddressField, useDeleteCountryAddressField } from '@/hooks/bn/useBnCountryPack';
import { useReferenceValues } from '@/hooks/bn/useReferenceData';
import { BN_REF_GROUPS } from '@/services/bn/referenceDataService';
import type { BnCountryAddressField } from '@/types/bn';
import { PageHeader } from '@/components/common/PageHeader';

const FIELD_TYPE_FALLBACK = [
  { value: 'TEXT', label: 'Text' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'DROPDOWN', label: 'Dropdown' },
  { value: 'PARISH', label: 'Parish' },
  { value: 'ISLAND', label: 'Island' },
  { value: 'VILLAGE', label: 'Village/Town' },
  { value: 'POSTAL_CODE', label: 'Postal Code' },
  { value: 'COUNTRY', label: 'Country' },
];

const empty = (): Partial<BnCountryAddressField> => ({
  field_code: '', field_label: '', field_type: 'TEXT', is_required: false, options_source: null, validation_pattern: null, sort_order: 0, is_active: true,
});

const Content: React.FC = () => {
  const { activeCountryCode } = useBnCountry();
  const { data: fields = [] } = useBnCountryAddressModel(activeCountryCode);
  const upsert = useUpsertCountryAddressField();
  const remove = useDeleteCountryAddressField();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<BnCountryAddressField>>(empty());

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({ ...form, country_code: activeCountryCode });
      toast.success('Address field saved');
      setOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Country Address Model" subtitle="Define address fields per country" breadcrumbs={[{ label: 'Benefit Management' }, { label: 'Country Config' }, { label: 'Address Model' }]} />
      <div className="flex items-center justify-between">
        <CountrySelector />
        <Button size="sm" onClick={() => { setForm(empty()); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add Field</Button>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Order</TableHead><TableHead>Code</TableHead><TableHead>Label</TableHead>
            <TableHead>Type</TableHead><TableHead>Required</TableHead><TableHead>Active</TableHead><TableHead className="w-20">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {fields.map((f: BnCountryAddressField) => (
              <TableRow key={f.id}>
                <TableCell>{f.sort_order}</TableCell>
                <TableCell className="font-mono text-sm">{f.field_code}</TableCell>
                <TableCell>{f.field_label}</TableCell>
                <TableCell><Badge variant="outline">{f.field_type}</Badge></TableCell>
                <TableCell>{f.is_required ? '✓' : ''}</TableCell>
                <TableCell><Badge variant={f.is_active ? 'default' : 'secondary'}>{f.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setForm(f); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={async () => { if (confirm('Delete?')) { try { await remove.mutateAsync(f.id); toast.success('Deleted'); } catch (e: any) { toast.error(e.message); } } }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!fields.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No address fields configured</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? 'Edit' : 'Add'} Address Field</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Field Code</Label><Input value={form.field_code || ''} onChange={e => setForm(f => ({ ...f, field_code: e.target.value.toUpperCase() }))} placeholder="LINE_1" /></div>
            <div><Label>Label</Label><Input value={form.field_label || ''} onChange={e => setForm(f => ({ ...f, field_label: e.target.value }))} placeholder="Street Address" /></div>
            <div><Label>Type</Label>
              <Select value={form.field_type || 'TEXT'} onValueChange={v => setForm(f => ({ ...f, field_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="TEXT">Text</SelectItem><SelectItem value="SELECT">Select</SelectItem><SelectItem value="POSTAL">Postal Code</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Sort Order</Label><Input type="number" value={form.sort_order ?? 0} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} /></div>
            <div><Label>Options Source</Label><Input value={form.options_source || ''} onChange={e => setForm(f => ({ ...f, options_source: e.target.value || null }))} placeholder="tb_parish" /></div>
            <div><Label>Validation Pattern</Label><Input value={form.validation_pattern || ''} onChange={e => setForm(f => ({ ...f, validation_pattern: e.target.value || null }))} className="font-mono text-sm" /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_required ?? false} onCheckedChange={v => setForm(f => ({ ...f, is_required: v }))} /><Label>Required</Label></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active ?? true} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label>Active</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={upsert.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const CountryAddressModel: React.FC = () => <BnCountryProvider><Content /></BnCountryProvider>;
export default CountryAddressModel;
