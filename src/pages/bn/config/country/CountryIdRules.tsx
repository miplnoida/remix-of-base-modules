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
import { useBnCountryIdRules, useUpsertCountryIdRule, useDeleteCountryIdRule } from '@/hooks/bn/useBnCountryPack';
import { useReferenceValues } from '@/hooks/bn/useReferenceData';
import { BN_REF_GROUPS } from '@/services/bn/referenceDataService';
import type { BnCountryIdRule } from '@/types/bn';
import { PageHeader } from '@/components/common/PageHeader';

const ID_TYPE_FALLBACK = [
  { value: 'SSN', label: 'Social Security Number' },
  { value: 'NATIONAL_ID', label: 'National ID' },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'BIRTH_CERTIFICATE', label: 'Birth Certificate' },
  { value: 'WORK_PERMIT', label: 'Work Permit' },
  { value: 'DRIVING_LICENCE', label: 'Driving Licence' },
  { value: 'OTHER', label: 'Other' },
];
const VERIFY_FALLBACK = [
  { value: 'DOCUMENT_SCAN', label: 'Document Scan' },
  { value: 'MANUAL', label: 'Manual Verification' },
  { value: 'EXTERNAL_API', label: 'External API' },
  { value: 'BIOMETRIC', label: 'Biometric' },
  { value: 'NONE', label: 'None' },
];

const emptyRule = (): Partial<BnCountryIdRule> => ({
  id_type: '', id_label: '', format_pattern: '', format_mask: '', digit_length: 6,
  has_check_digit: false, check_digit_algorithm: null, example_value: '', is_primary: false, is_active: true,
});

const CountryIdRulesContent: React.FC = () => {
  const { activeCountryCode } = useBnCountry();
  const { data: rules = [] } = useBnCountryIdRules(activeCountryCode);
  const upsert = useUpsertCountryIdRule();
  const remove = useDeleteCountryIdRule();
  const { options: idTypeOptions } = useReferenceValues(BN_REF_GROUPS.ID_TYPE, ID_TYPE_FALLBACK);
  const { options: verifyOptions } = useReferenceValues(BN_REF_GROUPS.ID_VERIFICATION_METHOD, VERIFY_FALLBACK);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<BnCountryIdRule>>(emptyRule());

  const handleSave = async () => {
    if (!form.id_type) { toast.error('ID type is required'); return; }
    try {
      // Default the label to the selected ID type label when empty
      const chosen = idTypeOptions.find((o) => o.value === form.id_type);
      const payload = { ...form, id_label: form.id_label || chosen?.label || form.id_type, country_code: activeCountryCode };
      await upsert.mutateAsync(payload);
      toast.success('ID rule saved');
      setOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleEdit = (r: BnCountryIdRule) => { setForm(r); setOpen(true); };
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this ID rule?')) return;
    try { await remove.mutateAsync(id); toast.success('Deleted'); } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Country ID / SSN Rules" subtitle="Configure identification validation rules per country" breadcrumbs={[{ label: 'Benefit Management' }, { label: 'Country Config' }, { label: 'ID Rules' }]} />
      <div className="flex items-center justify-between">
        <CountrySelector />
        <Button size="sm" onClick={() => { setForm(emptyRule()); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add Rule</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Type</TableHead><TableHead>Label</TableHead><TableHead>Pattern</TableHead><TableHead>Mask</TableHead>
              <TableHead>Length</TableHead><TableHead>Primary</TableHead><TableHead>Active</TableHead><TableHead className="w-20">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rules.map((r: BnCountryIdRule) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{r.id_type}</TableCell>
                  <TableCell>{r.id_label}</TableCell>
                  <TableCell className="font-mono text-xs">{r.format_pattern}</TableCell>
                  <TableCell className="font-mono text-sm">{r.format_mask}</TableCell>
                  <TableCell>{r.digit_length}</TableCell>
                  <TableCell>{r.is_primary && <Badge variant="default">Primary</Badge>}</TableCell>
                  <TableCell><Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(r)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!rules.length && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No ID rules configured</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? 'Edit' : 'Add'} ID Rule</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Type Code</Label><Input value={form.id_type || ''} onChange={e => setForm(f => ({ ...f, id_type: e.target.value.toUpperCase() }))} placeholder="SSN" /></div>
            <div><Label>Label</Label><Input value={form.id_label || ''} onChange={e => setForm(f => ({ ...f, id_label: e.target.value }))} placeholder="Social Security Number" /></div>
            <div><Label>Regex Pattern</Label><Input value={form.format_pattern || ''} onChange={e => setForm(f => ({ ...f, format_pattern: e.target.value }))} placeholder="^\d{6}$" className="font-mono text-sm" /></div>
            <div><Label>Input Mask</Label><Input value={form.format_mask || ''} onChange={e => setForm(f => ({ ...f, format_mask: e.target.value }))} placeholder="XXXXXX" className="font-mono" /></div>
            <div><Label>Digit Length</Label><Input type="number" value={form.digit_length ?? 6} onChange={e => setForm(f => ({ ...f, digit_length: parseInt(e.target.value) || 6 }))} /></div>
            <div><Label>Example</Label><Input value={form.example_value || ''} onChange={e => setForm(f => ({ ...f, example_value: e.target.value }))} placeholder="123456" /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_primary ?? false} onCheckedChange={v => setForm(f => ({ ...f, is_primary: v }))} /><Label>Primary</Label></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active ?? true} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label>Active</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={upsert.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const CountryIdRules: React.FC = () => <BnCountryProvider><CountryIdRulesContent /></BnCountryProvider>;
export default CountryIdRules;
