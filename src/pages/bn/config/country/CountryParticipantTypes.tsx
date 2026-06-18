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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { BnCountryProvider, useBnCountry } from '@/contexts/BnCountryContext';
import CountrySelector from '@/components/bn/country/CountrySelector';
import { useBnCountryParticipantTypes, useUpsertCountryParticipantType, useDeleteCountryParticipantType } from '@/hooks/bn/useBnCountryPack';
import { useReferenceValues } from '@/hooks/bn/useReferenceData';
import { BN_REF_GROUPS } from '@/services/bn/referenceDataService';
import type { BnCountryParticipantType } from '@/types/bn';
import { PageHeader } from '@/components/common/PageHeader';

const NONE = '__none';

const empty = (): Partial<BnCountryParticipantType> => ({
  type_code: '', type_name: '', participant_role: '',
  role_category: '',
  requires_identity_verification: true,
  requires_relationship_or_authority_proof: false,
  requires_ssn_link: false,
  requires_email_verification: false,
  requires_phone_verification: false,
  relationship_category: null,
  authority_category: null,
  online_access_allowed: false,
  can_register_online: false,
  can_apply_for_self: true,
  can_apply_for_others: false,
  can_be_added_by_claimant: false,
  can_receive_communication: true,
  can_receive_payment: false,
  requires_officer_review: false,
  proof_requirement_code: null,
  suggested_document_category: null,
  suggested_document_label: null,
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

interface ProofReq { proof_requirement_code: string; proof_requirement_name: string; suggested_document_label: string | null; }

/** Select bound to a reference group. Shows a warning when no active values exist. */
const RefSelect: React.FC<{
  label: string;
  groupCode: string;
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  required?: boolean;
  allowNone?: boolean;
}> = ({ label, groupCode, value, onChange, required, allowNone }) => {
  const { options, isLoading } = useReferenceValues(groupCode, []);
  const current = value || '';
  const retired = current && !options.some(o => o.value === current);
  return (
    <div>
      <Label>{label}{required && ' *'}</Label>
      <Select
        value={current ? current : (allowNone ? NONE : '')}
        onValueChange={(v) => onChange(v === NONE ? null : v)}
        disabled={isLoading}
      >
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? 'Loading…' : `Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {allowNone && <SelectItem value={NONE}>— None —</SelectItem>}
          {retired && <SelectItem value={current}>{current} (retired)</SelectItem>}
          {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
      {!isLoading && options.length === 0 && (
        <p className="text-xs text-destructive mt-1 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />Reference data missing for {groupCode}
        </p>
      )}
      {retired && (
        <p className="text-xs text-amber-600 mt-1">Current value "{current}" is retired in reference data.</p>
      )}
    </div>
  );
};

const Content: React.FC = () => {
  const { activeCountryCode } = useBnCountry();
  const { data: types = [] } = useBnCountryParticipantTypes(activeCountryCode);
  const upsert = useUpsertCountryParticipantType();
  const remove = useDeleteCountryParticipantType();
  const participantTypes = useReferenceValues(BN_REF_GROUPS.PARTICIPANT_TYPE, []);
  const roleCategories = useReferenceValues(BN_REF_GROUPS.PARTICIPANT_ROLE_CATEGORY, []);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<BnCountryParticipantType>>(empty());
  const [proofReqs, setProofReqs] = useState<ProofReq[]>([]);

  React.useEffect(() => {
    if (!activeCountryCode) { setProofReqs([]); return; }
    (async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await (supabase as any)
        .from('bn_participant_proof_requirement')
        .select('proof_requirement_code, proof_requirement_name, suggested_document_label')
        .eq('country_code', activeCountryCode)
        .eq('is_active', true)
        .order('sort_order');
      setProofReqs((data ?? []) as ProofReq[]);
    })();
  }, [activeCountryCode]);

  const set = <K extends keyof BnCountryParticipantType>(k: K, v: BnCountryParticipantType[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const missingRefs = [
    participantTypes.options.length === 0 && 'BN_PARTICIPANT_TYPE',
    roleCategories.options.length === 0 && 'BN_PARTICIPANT_ROLE_CATEGORY',
  ].filter(Boolean) as string[];

  const handleSave = async () => {
    if (!form.type_code) { toast.error('Participant type is required'); return; }
    if (!form.role_category) { toast.error('Role category is required'); return; }
    if (!form.participant_role) { toast.error('Role is required'); return; }
    // Block use of retired/inactive values for new records
    if (!form.id) {
      const ptOk = participantTypes.options.some(o => o.value === form.type_code);
      if (!ptOk) { toast.error('Selected participant type is not active in reference data'); return; }
    }
    try {
      const chosen = participantTypes.options.find((o) => o.value === form.type_code);
      const payload: Partial<BnCountryParticipantType> = {
        ...form,
        type_name: form.type_name || chosen?.label || form.type_code,
        country_code: activeCountryCode,
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

  // Helper to flag rows whose stored value is no longer in active reference data
  const isRetired = (val: string | null | undefined, opts: { value: string }[]) =>
    !!val && opts.length > 0 && !opts.some(o => o.value === val);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Country Participant Types"
        subtitle="Define who can participate and what verification they need. All dropdown values are managed centrally under Reference Data."
        breadcrumbs={[{ label: 'Benefit Management' }, { label: 'Country Config' }, { label: 'Participant Types' }]}
      />

      {missingRefs.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Reference data missing</AlertTitle>
          <AlertDescription>
            Seed values for: {missingRefs.join(', ')} in Reference Data before configuring participant types.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <CountrySelector />
        <Button size="sm" onClick={() => { setForm(empty()); setOpen(true); }} disabled={missingRefs.length > 0}>
          <Plus className="h-4 w-4 mr-1" />Add Type
        </Button>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Role</TableHead>
            <TableHead>ID Verify</TableHead><TableHead>Rel/Auth Proof</TableHead>
            <TableHead>Online</TableHead><TableHead>Active</TableHead><TableHead className="w-20">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {types.map((t: BnCountryParticipantType) => {
              const retired = isRetired(t.type_code, participantTypes.options);
              return (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-sm">
                    {t.type_code}
                    {retired && <Badge variant="outline" className="ml-2 text-amber-600 border-amber-600">retired</Badge>}
                  </TableCell>
                  <TableCell>{t.type_name}</TableCell>
                  <TableCell><Badge variant="outline">{t.participant_role}</Badge></TableCell>
                  <TableCell>{(t.requires_identity_verification ?? t.requires_id) ? '✓' : ''}</TableCell>
                  <TableCell>{(t.requires_relationship_or_authority_proof ?? t.requires_relationship_proof) ? '✓' : ''}</TableCell>
                  <TableCell>{t.online_access_allowed ? '✓' : ''}</TableCell>
                  <TableCell><Badge variant={t.is_active ? 'default' : 'secondary'}>{t.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setForm(t); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={async () => { if (confirm('Delete?')) { try { await remove.mutateAsync(t.id); toast.success('Deleted'); } catch (e: any) { toast.error(e.message); } } }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {!types.length && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No participant types configured</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? 'Edit' : 'Add'} Participant Type</DialogTitle></DialogHeader>

          <div className="space-y-4">
            <Section title="Identity">
              <RefSelect
                label="Participant Type"
                groupCode={BN_REF_GROUPS.PARTICIPANT_TYPE}
                value={form.type_code}
                onChange={(v) => set('type_code', v || '')}
                required
              />
              <div><Label>Display Name</Label><Input value={form.type_name || ''} onChange={e => set('type_name', e.target.value)} placeholder="Auto-filled from participant type" /></div>
              <RefSelect
                label="Role"
                groupCode={BN_REF_GROUPS.PARTICIPANT_TYPE}
                value={form.participant_role}
                onChange={(v) => set('participant_role', v || '')}
                required
              />
              <div><Label>Sort Order</Label><Input type="number" value={form.sort_order ?? 0} onChange={e => set('sort_order', parseInt(e.target.value) || 0)} /></div>
              <RefSelect
                label="Role Category"
                groupCode={BN_REF_GROUPS.PARTICIPANT_ROLE_CATEGORY}
                value={form.role_category}
                onChange={(v) => set('role_category', v || '')}
                required
              />
            </Section>

            <Section title="Verification Intent" description="Verification needs. Actual document mapping happens in Document Library / Product Catalog.">
              <Toggle label="Requires Identity Verification" checked={!!form.requires_identity_verification}
                onChange={v => set('requires_identity_verification', v)} />
              <Toggle label="Requires Relationship / Authority Proof" checked={!!form.requires_relationship_or_authority_proof}
                onChange={v => set('requires_relationship_or_authority_proof', v)} />
              <Toggle label="Requires SSN Link" checked={!!form.requires_ssn_link}
                onChange={v => set('requires_ssn_link', v)} />
              <RefSelect
                label="Relationship Category"
                groupCode={BN_REF_GROUPS.RELATIONSHIP_CATEGORY}
                value={form.relationship_category}
                onChange={(v) => set('relationship_category', v)}
                allowNone
              />
              <RefSelect
                label="Authority Category"
                groupCode={BN_REF_GROUPS.AUTHORITY_CATEGORY}
                value={form.authority_category}
                onChange={(v) => set('authority_category', v)}
                allowNone
              />
            </Section>

            <Section title="Online Portal & Communication">
              <Toggle label="Can Register Online" checked={!!form.can_register_online} onChange={v => set('can_register_online', v)} />
              <Toggle label="Online Access Allowed" checked={!!form.online_access_allowed} onChange={v => set('online_access_allowed', v)} />
              <Toggle label="Can Apply For Self" checked={!!form.can_apply_for_self} onChange={v => set('can_apply_for_self', v)} />
              <Toggle label="Can Apply For Others" checked={!!form.can_apply_for_others} onChange={v => set('can_apply_for_others', v)} />
              <Toggle label="Can Be Added By Claimant" checked={!!form.can_be_added_by_claimant} onChange={v => set('can_be_added_by_claimant', v)} />
              <Toggle label="Can Receive Communication" checked={!!form.can_receive_communication} onChange={v => set('can_receive_communication', v)} />
              <Toggle label="Can Receive Payment" checked={!!form.can_receive_payment} onChange={v => set('can_receive_payment', v)} />
              <Toggle label="Requires Email Verification" checked={!!form.requires_email_verification} onChange={v => set('requires_email_verification', v)} />
              <Toggle label="Requires Phone Verification" checked={!!form.requires_phone_verification} onChange={v => set('requires_phone_verification', v)} />
              <Toggle label="Requires Officer Review" checked={!!form.requires_officer_review} onChange={v => set('requires_officer_review', v)} />
            </Section>

            <Section title="Suggested Proof (optional)" description="Country-level proof requirement hint. The document binding lives in Document Library.">
              <div>
                <Label>Proof Requirement</Label>
                <Select value={form.proof_requirement_code || NONE} onValueChange={v => set('proof_requirement_code', v === NONE ? null : v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— None —</SelectItem>
                    {proofReqs.map(p => (
                      <SelectItem key={p.proof_requirement_code} value={p.proof_requirement_code}>
                        {p.proof_requirement_name}{p.suggested_document_label ? ` — ${p.suggested_document_label}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {proofReqs.length === 0 && <p className="text-xs text-muted-foreground mt-1">No proof requirements defined for this country yet.</p>}
              </div>
              <RefSelect
                label="Suggested Document Category"
                groupCode={BN_REF_GROUPS.PROOF_REQUIREMENT_CATEGORY}
                value={form.suggested_document_category}
                onChange={(v) => set('suggested_document_category', v)}
                allowNone
              />
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
