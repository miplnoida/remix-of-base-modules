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
import { useBnCountryParticipantTypes, useUpsertCountryParticipantType, useDeleteCountryParticipantType } from '@/hooks/bn/useBnCountryPack';
import { useReferenceValues } from '@/hooks/bn/useReferenceData';
import { BN_REF_GROUPS } from '@/services/bn/referenceDataService';
import { BN_PARTICIPANT_ROLES } from '@/types/bn';
import type { BnCountryParticipantType } from '@/types/bn';
import { PageHeader } from '@/components/common/PageHeader';

const PARTICIPANT_FALLBACK = [
  { value: 'CLAIMANT', label: 'Claimant' },
  { value: 'INSURED_PERSON', label: 'Insured Person' },
  { value: 'BENEFICIARY', label: 'Beneficiary' },
  { value: 'SPOUSE', label: 'Spouse' },
  { value: 'CHILD', label: 'Child' },
  { value: 'GUARDIAN', label: 'Guardian' },
  { value: 'PAYEE', label: 'Payee' },
  { value: 'EMPLOYER', label: 'Employer' },
  { value: 'DOCTOR', label: 'Doctor' },
  { value: 'FUNERAL_PROVIDER', label: 'Funeral Provider' },
];

const empty = (): Partial<BnCountryParticipantType> => ({
  type_code: '', type_name: '', participant_role: 'CLAIMANT', requires_id: true, requires_relationship_proof: false,
  min_age: null, max_age: null, allowed_products: null, sort_order: 0, is_active: true,
});

const Content: React.FC = () => {
  const { activeCountryCode } = useBnCountry();
  const { data: types = [] } = useBnCountryParticipantTypes(activeCountryCode);
  const upsert = useUpsertCountryParticipantType();
  const remove = useDeleteCountryParticipantType();
  const { options: participantOptions } = useReferenceValues(BN_REF_GROUPS.PARTICIPANT_TYPE, PARTICIPANT_FALLBACK);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<BnCountryParticipantType>>(empty());

  const handleSave = async () => {
    if (!form.type_code) { toast.error('Participant type is required'); return; }
    try {
      const chosen = participantOptions.find((o) => o.value === form.type_code);
      const payload = { ...form, type_name: form.type_name || chosen?.label || form.type_code, country_code: activeCountryCode };
      await upsert.mutateAsync(payload);
      toast.success('Participant type saved');
      setOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Country Participant Types" subtitle="Configure claimant and beneficiary types per country" breadcrumbs={[{ label: 'Benefit Management' }, { label: 'Country Config' }, { label: 'Participant Types' }]} />
      <div className="flex items-center justify-between">
        <CountrySelector />
        <Button size="sm" onClick={() => { setForm(empty()); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add Type</Button>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Role</TableHead>
            <TableHead>Requires ID</TableHead><TableHead>Relationship Proof</TableHead><TableHead>Active</TableHead><TableHead className="w-20">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {types.map((t: BnCountryParticipantType) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-sm">{t.type_code}</TableCell>
                <TableCell>{t.type_name}</TableCell>
                <TableCell><Badge variant="outline">{t.participant_role}</Badge></TableCell>
                <TableCell>{t.requires_id ? '✓' : ''}</TableCell>
                <TableCell>{t.requires_relationship_proof ? '✓' : ''}</TableCell>
                <TableCell><Badge variant={t.is_active ? 'default' : 'secondary'}>{t.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setForm(t); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={async () => { if (confirm('Delete?')) { try { await remove.mutateAsync(t.id); toast.success('Deleted'); } catch (e: any) { toast.error(e.message); } } }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!types.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No participant types configured</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? 'Edit' : 'Add'} Participant Type</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Type Code</Label><Input value={form.type_code || ''} onChange={e => setForm(f => ({ ...f, type_code: e.target.value.toUpperCase() }))} placeholder="SPOUSE" /></div>
            <div><Label>Type Name</Label><Input value={form.type_name || ''} onChange={e => setForm(f => ({ ...f, type_name: e.target.value }))} placeholder="Spouse" /></div>
            <div><Label>Role</Label>
              <Select value={form.participant_role || 'CLAIMANT'} onValueChange={v => setForm(f => ({ ...f, participant_role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BN_PARTICIPANT_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Sort Order</Label><Input type="number" value={form.sort_order ?? 0} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.requires_id ?? true} onCheckedChange={v => setForm(f => ({ ...f, requires_id: v }))} /><Label>Requires ID</Label></div>
            <div className="flex items-center gap-2"><Switch checked={form.requires_relationship_proof ?? false} onCheckedChange={v => setForm(f => ({ ...f, requires_relationship_proof: v }))} /><Label>Requires Proof</Label></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active ?? true} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label>Active</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={upsert.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const CountryParticipantTypes: React.FC = () => <BnCountryProvider><Content /></BnCountryProvider>;
export default CountryParticipantTypes;
