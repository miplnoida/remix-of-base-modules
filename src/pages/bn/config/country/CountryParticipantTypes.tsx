import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, AlertTriangle, Archive, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { BnCountryProvider, useBnCountry } from '@/contexts/BnCountryContext';
import CountrySelector from '@/components/bn/country/CountrySelector';
import {
  useBnCountryParticipantTypes,
  useUpsertCountryParticipantType,
  useDeleteCountryParticipantType,
  useRetireCountryParticipantType,
  useReactivateCountryParticipantType,
  useBnParticipantTypeUsage,
} from '@/hooks/bn/useBnCountryPack';
import { useReferenceValues } from '@/hooks/bn/useReferenceData';
import { BN_REF_GROUPS } from '@/services/bn/referenceDataService';
import type { BnCountryParticipantType } from '@/types/bn';
import { PageHeader } from '@/components/common/PageHeader';

const NONE = '__none';

type Lifecycle = 'DRAFT' | 'ACTIVE' | 'RETIRED';

const LIFECYCLE_BADGE: Record<Lifecycle, string> = {
  ACTIVE: 'bg-primary/10 text-primary border-primary/20',
  DRAFT: 'bg-muted text-muted-foreground border',
  RETIRED: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
};

const empty = (): Partial<BnCountryParticipantType> => ({
  type_code: '', type_name: '', participant_role: '',
  role_category: '',
  lifecycle_status: 'ACTIVE',
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

function validateRow(row: BnCountryParticipantType, usage?: { active_product_count: number }): string[] {
  const w: string[] = [];
  if (!row.role_category) w.push('Missing role category');
  if (row.requires_relationship_or_authority_proof && !row.proof_requirement_code) w.push('Proof required but no proof requirement code');
  if (row.can_receive_payment && !row.requires_identity_verification) w.push('Can receive payment but identity verification not required');
  if (row.lifecycle_status === 'RETIRED' && usage && usage.active_product_count > 0) {
    w.push(`Retired but used by ${usage.active_product_count} active product(s)`);
  }
  return w;
}

const Content: React.FC = () => {
  const { activeCountryCode } = useBnCountry();
  const { data: types = [] } = useBnCountryParticipantTypes(activeCountryCode);
  const { data: usageRows = [] } = useBnParticipantTypeUsage(activeCountryCode);
  const upsert = useUpsertCountryParticipantType();
  const remove = useDeleteCountryParticipantType();
  const retire = useRetireCountryParticipantType();
  const reactivate = useReactivateCountryParticipantType();
  const participantTypes = useReferenceValues(BN_REF_GROUPS.PARTICIPANT_TYPE, []);
  const roleCategories = useReferenceValues(BN_REF_GROUPS.PARTICIPANT_ROLE_CATEGORY, []);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<BnCountryParticipantType>>(empty());
  const [proofReqs, setProofReqs] = useState<ProofReq[]>([]);
  const [showRetired, setShowRetired] = useState(false);
  const [retireDialog, setRetireDialog] = useState<{ row: BnCountryParticipantType; reason: string } | null>(null);

  const usageMap = useMemo(() => {
    const m = new Map<string, { product_version_count: number; active_product_count: number; historical_claim_count: number }>();
    for (const u of usageRows) m.set(u.type_code, u);
    return m;
  }, [usageRows]);

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

  const visibleTypes = showRetired ? types : types.filter(t => t.lifecycle_status !== 'RETIRED');

  // Collect warnings across all rows for the panel
  const allWarnings = useMemo(() => {
    const result: Array<{ code: string; name: string; msg: string }> = [];
    for (const t of types) {
      const u = usageMap.get(t.type_code);
      validateRow(t, u).forEach(msg => result.push({ code: t.type_code, name: t.type_name, msg }));
    }
    return result;
  }, [types, usageMap]);

  const handleSave = async () => {
    if (!form.type_code) { toast.error('Participant type is required'); return; }
    if (!form.role_category) { toast.error('Role category is required'); return; }
    if (!form.participant_role) { toast.error('Role is required'); return; }
    if (!form.id) {
      const ptOk = participantTypes.options.some(o => o.value === form.type_code);
      if (!ptOk) { toast.error('Selected participant type is not active in reference data'); return; }
    }
    try {
      const chosen = participantTypes.options.find((o) => o.value === form.type_code);
      const lifecycle = (form.lifecycle_status as Lifecycle) ?? 'ACTIVE';
      const payload: Partial<BnCountryParticipantType> = {
        ...form,
        type_name: form.type_name || chosen?.label || form.type_code,
        country_code: activeCountryCode,
        lifecycle_status: lifecycle,
        is_active: lifecycle === 'ACTIVE',
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

  const handleRetire = async () => {
    if (!retireDialog) return;
    if (!retireDialog.reason.trim()) { toast.error('Reason is required'); return; }
    try {
      await retire.mutateAsync({ id: retireDialog.row.id, reason: retireDialog.reason });
      toast.success('Participant type retired');
      setRetireDialog(null);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleReactivate = async (row: BnCountryParticipantType) => {
    try {
      await reactivate.mutateAsync(row.id);
      toast.success('Participant type reactivated');
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Country Participant Types"
        subtitle="Define who can participate and what verification they need. Lifecycle controls availability for new product setup; retired types remain readable on historical claims."
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

      {allWarnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{allWarnings.length} validation warning(s)</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5 text-xs space-y-0.5 mt-1 max-h-40 overflow-y-auto">
              {allWarnings.slice(0, 20).map((w, i) => (
                <li key={i}><span className="font-mono">{w.code}</span> — {w.msg}</li>
              ))}
              {allWarnings.length > 20 && <li className="text-muted-foreground">…and {allWarnings.length - 20} more</li>}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <CountrySelector />
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={showRetired} onCheckedChange={setShowRetired} />
            Show retired
          </label>
          <Button size="sm" onClick={() => { setForm(empty()); setOpen(true); }} disabled={missingRefs.length > 0}>
            <Plus className="h-4 w-4 mr-1" />Add Type
          </Button>
        </div>
      </div>

      <Card><CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Role Category</TableHead>
            <TableHead>Online</TableHead>
            <TableHead>Proof</TableHead>
            <TableHead className="text-right">Products</TableHead>
            <TableHead className="text-right">Claims</TableHead>
            <TableHead className="w-32">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {visibleTypes.map((t: BnCountryParticipantType) => {
              const lc = (t.lifecycle_status ?? 'ACTIVE') as Lifecycle;
              const u = usageMap.get(t.type_code);
              const refMissing = participantTypes.options.length > 0 && !participantTypes.options.some(o => o.value === t.type_code);
              return (
                <TableRow key={t.id} className={lc === 'RETIRED' ? 'opacity-70' : ''}>
                  <TableCell>
                    <Badge variant="outline" className={LIFECYCLE_BADGE[lc]}>{lc}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {t.type_code}
                    {refMissing && <Badge variant="outline" className="ml-2 text-amber-600 border-amber-600">ref missing</Badge>}
                  </TableCell>
                  <TableCell>{t.type_name}</TableCell>
                  <TableCell><Badge variant="outline">{t.role_category || '—'}</Badge></TableCell>
                  <TableCell>{t.online_access_allowed ? '✓' : ''}</TableCell>
                  <TableCell className="text-xs">{t.proof_requirement_code || (t.requires_relationship_or_authority_proof ? '⚠︎ none' : '—')}</TableCell>
                  <TableCell className="text-right text-sm">
                    {u?.product_version_count ?? 0}
                    {u && u.active_product_count > 0 && <span className="text-primary"> ({u.active_product_count} active)</span>}
                  </TableCell>
                  <TableCell className="text-right text-sm">{u?.historical_claim_count ?? 0}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" title="Edit" onClick={() => { setForm(t); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {lc !== 'RETIRED' ? (
                        <Button variant="ghost" size="icon" title="Retire" onClick={() => setRetireDialog({ row: t, reason: '' })}>
                          <Archive className="h-4 w-4 text-amber-600" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" title="Reactivate" onClick={() => handleReactivate(t)}>
                          <RotateCcw className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" title="Delete" onClick={async () => {
                        if ((u?.product_version_count ?? 0) > 0 || (u?.historical_claim_count ?? 0) > 0) {
                          toast.error('Cannot delete — type is in use. Retire it instead.');
                          return;
                        }
                        if (confirm('Delete this participant type?')) {
                          try { await remove.mutateAsync(t.id); toast.success('Deleted'); } catch (e: any) { toast.error(e.message); }
                        }
                      }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {!visibleTypes.length && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">
              {types.length === 0 ? 'No participant types configured' : 'No active types. Toggle "Show retired" to view all.'}
            </TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      {/* Retire dialog */}
      <Dialog open={!!retireDialog} onOpenChange={(o) => !o && setRetireDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retire participant type</DialogTitle>
            <DialogDescription>
              Retired types remain visible on historical claims but cannot be selected for new product configuration or online applications.
            </DialogDescription>
          </DialogHeader>
          {retireDialog && (() => {
            const u = usageMap.get(retireDialog.row.type_code);
            return (
              <div className="space-y-3">
                <div className="text-sm">
                  <span className="font-mono">{retireDialog.row.type_code}</span> — {retireDialog.row.type_name}
                </div>
                {u && u.active_product_count > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Used by {u.active_product_count} active product version(s). Replace usages before next publish.
                    </AlertDescription>
                  </Alert>
                )}
                <div>
                  <Label>Reason *</Label>
                  <Textarea
                    value={retireDialog.reason}
                    onChange={(e) => setRetireDialog({ ...retireDialog, reason: e.target.value })}
                    placeholder="e.g. Duplicate of EXECUTOR_OR_ESTATE"
                  />
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRetireDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRetire} disabled={retire.isPending}>Retire</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editor dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? 'Edit' : 'Add'} Participant Type</DialogTitle></DialogHeader>

          {/* Editor-level warnings */}
          {form.id && (() => {
            const u = usageMap.get(form.type_code ?? '');
            const warnings = validateRow(form as BnCountryParticipantType, u);
            if (warnings.length === 0) return null;
            return (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warnings</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5 text-xs space-y-0.5 mt-1">
                    {warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            );
          })()}

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
              <div>
                <Label>Lifecycle Status</Label>
                <Select value={(form.lifecycle_status as string) || 'ACTIVE'} onValueChange={(v) => set('lifecycle_status', v as Lifecycle)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="RETIRED">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
