import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const PROOF_CODES = [
  { value: '', label: '— None —' },
  { value: 'IDENTITY_PROOF', label: 'Identity Proof' },
  { value: 'RELATIONSHIP_PROOF', label: 'Relationship Proof' },
  { value: 'AUTHORITY_PROOF', label: 'Authority Proof' },
  { value: 'PROVIDER_ACCREDITATION', label: 'Provider Accreditation' },
];

const RELATIONSHIP_CATEGORIES = ['', 'SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'DEPENDANT', 'OTHER'];
const AUTHORITY_CATEGORIES = ['', 'GUARDIAN', 'POWER_OF_ATTORNEY', 'EXECUTOR', 'COURT_ORDER', 'EMPLOYER_REP', 'OTHER'];

const empty = (): Partial<BnCountryParticipantType> => ({
  type_code: '', type_name: '', participant_role: 'CLAIMANT',
  requires_identity_verification: true,
  requires_relationship_or_authority_proof: false,
  relationship_category: null,
  authority_category: null,
  online_access_allowed: false,
  can_apply_for_self: true,
  can_apply_for_others: false,
  can_receive_communication: true,
  can_receive_payment: false,
  requires_officer_review: false,
  proof_requirement_code: null,
  suggested_document_category: null,
  suggested_document_label: null,
  // legacy mirrors
  requires_id: true,
  requires_relationship_proof: false,
  min_age: null, max_age: null, allowed_products: null, sort_order: 0, is_active: true,
});

const Toggle: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }> = ({ label, checked, onChange, hint }) => (
  <div className="flex items-start justify-between gap-3 rounded-md border p-3">
    <div>
      <Label className="text-sm font-medium">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

const Section: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({ title, description, children }) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-base">{title}</CardTitle>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </CardHeader>
    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</CardContent>
  </Card>
);

const Content: React.FC = () => {
  const { activeCountryCode } = useBnCountry();
  const { data: types = [] } = useBnCountryParticipantTypes(activeCountryCode);
  const upsert = useUpsertCountryParticipantType();
  const remove = useDeleteCountryParticipantType();
  const { options: participantOptions } = useReferenceValues(BN_REF_GROUPS.PARTICIPANT_TYPE, PARTICIPANT_FALLBACK);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<BnCountryParticipantType>>(empty());

  const set = <K extends keyof BnCountryParticipantType>(k: K, v: BnCountryParticipantType[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.type_code) { toast.error('Participant type is required'); return; }
    try {
      const chosen = participantOptions.find((o) => o.value === form.type_code);
      const payload: Partial<BnCountryParticipantType> = {
        ...form,
        type_name: form.type_name || chosen?.label || form.type_code,
        country_code: activeCountryCode,
        // Keep legacy columns in sync for backward compatibility with existing readers
        requires_id: !!form.requires_identity_verification,
        requires_relationship_proof: !!form.requires_relationship_or_authority_proof,
        relationship_category: form.relationship_category || null,
        authority_category: form.authority_category || null,
        proof_requirement_code: form.proof_requirement_code || null,
        suggested_document_category: form.suggested_document_category || null,
        suggested_document_label: form.suggested_document_label || null,
      };
      await upsert.mutateAsync(payload);
      toast.success('Participant type saved');
      setOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Country Participant Types"
        subtitle="Define who can participate and what verification they need. Actual evidence documents are configured later in Document Library and Product Catalog."
        breadcrumbs={[{ label: 'Benefit Management' }, { label: 'Country Config' }, { label: 'Participant Types' }]}
      />
      <div className="flex items-center justify-between">
        <CountrySelector />
        <Button size="sm" onClick={() => { setForm(empty()); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add Type</Button>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Role</TableHead>
            <TableHead>ID Verify</TableHead><TableHead>Rel/Auth Proof</TableHead>
            <TableHead>Online</TableHead><TableHead>Active</TableHead><TableHead className="w-20">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {types.map((t: BnCountryParticipantType) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-sm">{t.type_code}</TableCell>
                <TableCell>{t.type_name}</TableCell>
                <TableCell><Badge variant="outline">{t.participant_role}</Badge></TableCell>
                <TableCell>{t.requires_identity_verification ?? t.requires_id ? '✓' : ''}</TableCell>
                <TableCell>{t.requires_relationship_or_authority_proof ?? t.requires_relationship_proof ? '✓' : ''}</TableCell>
                <TableCell>{t.online_access_allowed ? '✓' : ''}</TableCell>
                <TableCell><Badge variant={t.is_active ? 'default' : 'secondary'}>{t.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setForm(t); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={async () => { if (confirm('Delete?')) { try { await remove.mutateAsync(t.id); toast.success('Deleted'); } catch (e: any) { toast.error(e.message); } } }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!types.length && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No participant types configured</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? 'Edit' : 'Add'} Participant Type</DialogTitle></DialogHeader>

          <div className="space-y-4">
            <Section title="Identity">
              <div>
                <Label>Participant Type *</Label>
                <Select value={form.type_code || ''} onValueChange={(v) => set('type_code', v)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {participantOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Display Name</Label><Input value={form.type_name || ''} onChange={e => set('type_name', e.target.value)} placeholder="Auto-filled from participant type" /></div>
              <div><Label>Role</Label>
                <Select value={form.participant_role || 'CLAIMANT'} onValueChange={v => set('participant_role', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{BN_PARTICIPANT_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Sort Order</Label><Input type="number" value={form.sort_order ?? 0} onChange={e => set('sort_order', parseInt(e.target.value) || 0)} /></div>
            </Section>

            <Section title="Verification Intent" description="What kind of verification this participant type needs. Actual document mapping happens later in Document Library / Product Catalog.">
              <Toggle label="Requires Identity Verification" checked={!!form.requires_identity_verification}
                onChange={v => set('requires_identity_verification', v)}
                hint="Country ID rules will be used to validate identity." />
              <Toggle label="Requires Relationship / Authority Proof" checked={!!form.requires_relationship_or_authority_proof}
                onChange={v => set('requires_relationship_or_authority_proof', v)}
                hint="E.g. spouse, child, guardian, executor." />
              <div>
                <Label>Relationship Category</Label>
                <Select value={form.relationship_category || '__none'} onValueChange={v => set('relationship_category', v === '__none' ? null : v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{RELATIONSHIP_CATEGORIES.map(r => <SelectItem key={r || 'none'} value={r || '__none'}>{r || '— None —'}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Authority Category</Label>
                <Select value={form.authority_category || '__none'} onValueChange={v => set('authority_category', v === '__none' ? null : v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{AUTHORITY_CATEGORIES.map(r => <SelectItem key={r || 'none'} value={r || '__none'}>{r || '— None —'}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </Section>

            <Section title="Online Portal & Communication">
              <Toggle label="Online Access Allowed" checked={!!form.online_access_allowed} onChange={v => set('online_access_allowed', v)} />
              <Toggle label="Can Apply For Self" checked={!!form.can_apply_for_self} onChange={v => set('can_apply_for_self', v)} />
              <Toggle label="Can Apply For Others" checked={!!form.can_apply_for_others} onChange={v => set('can_apply_for_others', v)} />
              <Toggle label="Can Receive Communication" checked={!!form.can_receive_communication} onChange={v => set('can_receive_communication', v)} />
              <Toggle label="Can Receive Payment" checked={!!form.can_receive_payment} onChange={v => set('can_receive_payment', v)} />
              <Toggle label="Requires Officer Review" checked={!!form.requires_officer_review} onChange={v => set('requires_officer_review', v)} />
            </Section>

            <Section title="Suggested Proof (optional)" description="Hints only — actual document binding happens later in Document Library. Leave blank if not known yet.">
              <div>
                <Label>Proof Requirement Code</Label>
                <Select value={form.proof_requirement_code || ''} onValueChange={v => set('proof_requirement_code', v || null)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{PROOF_CODES.map(p => <SelectItem key={p.value || 'none'} value={p.value || '__none'}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Suggested Document Category</Label><Input value={form.suggested_document_category || ''} onChange={e => set('suggested_document_category', e.target.value || null)} placeholder="e.g. Civil Status" /></div>
              <div className="md:col-span-2"><Label>Suggested Document Label</Label><Input value={form.suggested_document_label || ''} onChange={e => set('suggested_document_label', e.target.value || null)} placeholder="e.g. Marriage Certificate" /></div>
            </Section>

            <Section title="Status">
              <Toggle label="Active" checked={form.is_active ?? true} onChange={v => set('is_active', v)} />
            </Section>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsert.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const CountryParticipantTypes: React.FC = () => <BnCountryProvider><Content /></BnCountryProvider>;
export default CountryParticipantTypes;
