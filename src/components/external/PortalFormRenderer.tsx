import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ArrowRight, Plus, Trash2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { publicBenefitApi } from '@/portals/_shared/publicBenefitApiClient';
import {
  useExternalParticipantConfig,
  useExternalProfile,
} from '@/portals/_shared/externalHooks';
import {
  BN_PARTICIPANT_ROLE_LABELS,
  type BnParticipantRole,
} from '@/types/bnParticipant';

interface Props {
  productCode: string;
}

type ApplicantChoice =
  | 'MYSELF'
  | 'DECEASED'
  | 'CHILD_DEPENDANT'
  | 'REPRESENT'
  | 'GUARDIAN_PAYEE'
  | 'FUNERAL_RESPONSIBLE';

interface Beneficiary {
  ssn?: string; first_name?: string; last_name?: string; relationship?: string;
  is_student?: boolean; is_minor?: boolean; email?: string; phone?: string;
}

interface PersonRef { ssn?: string; first_name?: string; last_name?: string; email?: string; phone?: string; }
interface EmployerRef { employer_regno?: string; name?: string; email?: string; phone?: string; }
interface ProviderRef { provider_code?: string; name?: string; email?: string; phone?: string; }

interface FormState {
  applicantChoice: ApplicantChoice | null;
  applicant: PersonRef;
  insuredPerson?: PersonRef;
  deceasedInsuredPerson?: PersonRef;
  beneficiaries: Beneficiary[];
  payee?: PersonRef;
  guardian?: PersonRef & { relationship?: string };
  employer?: EmployerRef;
  doctorProvider?: ProviderRef;
  benefitFacts: Record<string, any>;
  documents: { code: string; label: string; uploaded: boolean }[];
  declarationAccepted: boolean;
}

function blankState(): FormState {
  return {
    applicantChoice: null,
    applicant: {},
    beneficiaries: [],
    benefitFacts: {},
    documents: [],
    declarationAccepted: false,
  };
}

const CHOICE_LABELS: Record<ApplicantChoice, string> = {
  MYSELF: 'Myself',
  DECEASED: 'A deceased insured person',
  CHILD_DEPENDANT: 'A child / dependant',
  REPRESENT: 'Someone I represent',
  GUARDIAN_PAYEE: 'As guardian / payee',
  FUNERAL_RESPONSIBLE: 'As person responsible for funeral expenses',
};

/**
 * PortalFormRenderer — public application engine driven entirely by:
 *   - bn_product_participant_config (allowed kinds, required roles, task flags)
 *   - bn_doc_requirement            (document checklist)
 * The form is split into 4 steps:
 *   1. Who are you applying for?
 *   2. Capture the participants the product requires
 *   3. Documents (checklist)
 *   4. Declaration & submit
 */
export function PortalFormRenderer({ productCode }: Props) {
  const navigate = useNavigate();
  const { data: cfgBundle, isLoading, error } = useExternalParticipantConfig(productCode);
  const { data: profileResp } = useExternalProfile();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<FormState>(blankState());
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill applicant from logged-in profile.
  useEffect(() => {
    const p = profileResp?.profile;
    if (!p) return;
    setState((s) => (s.applicant?.ssn ? s : {
      ...s,
      applicant: { ssn: p.ssn, first_name: p.first_name, last_name: p.last_name, email: p.email, phone: p.mobile_phone },
    }));
  }, [profileResp]);

  // Seed document checklist from config once available.
  useEffect(() => {
    if (!cfgBundle) return;
    setState((s) => (s.documents.length ? s : {
      ...s,
      documents: (cfgBundle.documents ?? []).map((d: any) => ({
        code: d.document_code, label: d.document_label, uploaded: false,
      })),
    }));
  }, [cfgBundle]);

  const allowedChoices: ApplicantChoice[] = useMemo(() => {
    const kinds: BnParticipantRole[] = cfgBundle?.config?.allowed_applicant_kinds ?? ['APPLICANT'];
    const out: ApplicantChoice[] = [];
    if (kinds.includes('INSURED_PERSON') || kinds.includes('APPLICANT')) out.push('MYSELF');
    if (cfgBundle?.config?.requires_deceased) out.push('DECEASED');
    if (kinds.includes('GUARDIAN') || kinds.includes('PAYEE')) {
      out.push('CHILD_DEPENDANT'); out.push('GUARDIAN_PAYEE');
    }
    if (kinds.includes('REPRESENTATIVE')) out.push('REPRESENT');
    if (kinds.includes('FUNERAL_HOME') || cfgBundle?.config?.requires_deceased) {
      if (!out.includes('FUNERAL_RESPONSIBLE') && (productCode.includes('FUN'))) out.push('FUNERAL_RESPONSIBLE');
    }
    return out.length ? out : ['MYSELF'];
  }, [cfgBundle, productCode]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Cannot start this application</AlertTitle>
        <AlertDescription>{(error as Error).message}</AlertDescription>
      </Alert>
    );
  }
  if (!cfgBundle?.config) {
    return (
      <Alert>
        <AlertTitle>Public form not configured</AlertTitle>
        <AlertDescription>
          This product does not yet have Participant &amp; Public Form Rules configured by Internal BN.
          Please contact the Social Security Board office.
        </AlertDescription>
      </Alert>
    );
  }

  const cfg = cfgBundle.config;
  const product = cfgBundle.product;

  const setPart = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setState((s) => ({ ...s, [key]: val }));

  const onChoose = (c: ApplicantChoice) => {
    setState((s) => {
      // Set insuredPerson = applicant if MYSELF.
      const next = { ...s, applicantChoice: c };
      if (c === 'MYSELF') next.insuredPerson = next.applicant;
      else next.insuredPerson = next.insuredPerson ?? {};
      return next;
    });
  };

  const canNext1 = !!state.applicantChoice;
  const canNext2 = (() => {
    if (cfg.requires_deceased && !state.deceasedInsuredPerson?.ssn) return false;
    if (cfg.requires_beneficiaries && state.beneficiaries.length === 0) return false;
    if (!cfg.requires_deceased && cfg.applicant_must_equal_insured && !state.insuredPerson?.ssn) return false;
    if (cfg.requires_employer_task && !state.employer?.employer_regno && !state.employer?.email) return false;
    if (cfg.requires_doctor_task && !state.doctorProvider?.provider_code && !state.doctorProvider?.email) return false;
    return true;
  })();
  const canNext3 = state.documents.filter(d => !d.uploaded).length === 0 || state.documents.length === 0;
  const canSubmit = state.declarationAccepted;

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await publicBenefitApi.submitApplication({
        productCode,
        claimDate: new Date().toISOString().slice(0, 10),
        applicant: state.applicant,
        insuredPerson: state.insuredPerson,
        deceasedInsuredPerson: state.deceasedInsuredPerson,
        beneficiaries: state.beneficiaries,
        payee: state.payee,
        guardian: state.guardian,
        employer: state.employer,
        doctorProvider: state.doctorProvider,
        benefitFacts: state.benefitFacts,
        documents: state.documents,
        declaration: { accepted: state.declarationAccepted, acceptedAt: new Date().toISOString() },
      });
      toast.success(`Application submitted: ${res.claimNumber}`);
      navigate(`/claimant/claims/${encodeURIComponent(res.claimNumber)}`);
    } catch (e: any) {
      const message = e?.status === 403
        ? 'Your sign-in is not set up for claimant submissions. Please use a claimant portal account, or continue as staff preview without submitting.'
        : (e?.message ?? 'Unknown error');
      toast.error('Submission failed', { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{product.benefit_name}</CardTitle>
              <CardDescription>Public application · {product.benefit_code}</CardDescription>
            </div>
            <Badge variant="outline">Step {step + 1} of 4</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {step === 0 && (
            <Step0
              allowed={allowedChoices}
              value={state.applicantChoice}
              onChange={onChoose}
            />
          )}
          {step === 1 && (
            <Step1Participants
              cfg={cfg}
              state={state}
              setPart={setPart}
            />
          )}
          {step === 2 && (
            <Step2Documents
              docs={state.documents}
              toggle={(code) => setPart('documents', state.documents.map(d => d.code === code ? { ...d, uploaded: !d.uploaded } : d))}
            />
          )}
          {step === 3 && (
            <Step3Declaration
              checked={state.declarationAccepted}
              onChange={(v) => setPart('declarationAccepted', v)}
              summary={state}
              productName={product.benefit_name}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {step < 3 ? (
          <Button
            disabled={(step === 0 && !canNext1) || (step === 1 && !canNext2) || (step === 2 && !canNext3)}
            onClick={() => setStep(step + 1)}
            className="gap-2"
          >
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button disabled={!canSubmit || submitting} onClick={submit} className="gap-2">
            <Send className="h-4 w-4" /> {submitting ? 'Submitting…' : 'Submit application'}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Step 0 ────────────────────────────────────────────────────────────────
function Step0({ allowed, value, onChange }: { allowed: ApplicantChoice[]; value: ApplicantChoice | null; onChange: (v: ApplicantChoice) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Who are you applying for?</p>
      <div className="grid gap-2 md:grid-cols-2">
        {allowed.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`rounded border p-3 text-left text-sm transition-colors ${value === c ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
          >
            {CHOICE_LABELS[c]}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 1 — Participants ─────────────────────────────────────────────────
function PersonFields({ label, value, onChange, ssnLabel = 'SSN' }: {
  label: string; value: PersonRef | undefined; onChange: (v: PersonRef) => void; ssnLabel?: string;
}) {
  const v = value ?? {};
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="grid gap-2 md:grid-cols-2">
        <div><Label className="text-xs">{ssnLabel}</Label><Input value={v.ssn ?? ''} onChange={(e) => onChange({ ...v, ssn: e.target.value })} /></div>
        <div><Label className="text-xs">Email</Label><Input value={v.email ?? ''} onChange={(e) => onChange({ ...v, email: e.target.value })} /></div>
        <div><Label className="text-xs">First name</Label><Input value={v.first_name ?? ''} onChange={(e) => onChange({ ...v, first_name: e.target.value })} /></div>
        <div><Label className="text-xs">Last name</Label><Input value={v.last_name ?? ''} onChange={(e) => onChange({ ...v, last_name: e.target.value })} /></div>
      </div>
    </div>
  );
}

function Step1Participants({ cfg, state, setPart }: { cfg: any; state: FormState; setPart: <K extends keyof FormState>(k: K, v: FormState[K]) => void }) {
  const isSelf = state.applicantChoice === 'MYSELF';
  return (
    <div className="space-y-5">
      <PersonFields label="Applicant (you)" value={state.applicant} onChange={(v) => setPart('applicant', v)} />

      {!isSelf && (cfg.requires_deceased ? null : (
        <>
          <Separator />
          <PersonFields label="Insured Person this claim is for" value={state.insuredPerson} onChange={(v) => setPart('insuredPerson', v)} />
        </>
      ))}

      {cfg.requires_deceased && (
        <>
          <Separator />
          <PersonFields label="Deceased Insured Person" value={state.deceasedInsuredPerson} onChange={(v) => setPart('deceasedInsuredPerson', v)} />
        </>
      )}

      {cfg.requires_beneficiaries && (
        <>
          <Separator />
          <BeneficiariesEditor items={state.beneficiaries} onChange={(v) => setPart('beneficiaries', v)} />
        </>
      )}

      {cfg.requires_guardian_or_payee && (
        <>
          <Separator />
          <PersonFields label="Guardian / Payee" value={state.guardian} onChange={(v) => setPart('guardian', v as any)} />
        </>
      )}

      {cfg.requires_employer_task && (
        <>
          <Separator />
          <div className="space-y-2">
            <p className="text-sm font-medium">Employer to be invited (confirmation task)</p>
            <div className="grid gap-2 md:grid-cols-2">
              <div><Label className="text-xs">Employer Reg #</Label><Input value={state.employer?.employer_regno ?? ''} onChange={(e) => setPart('employer', { ...(state.employer ?? {}), employer_regno: e.target.value })} /></div>
              <div><Label className="text-xs">Employer name</Label><Input value={state.employer?.name ?? ''} onChange={(e) => setPart('employer', { ...(state.employer ?? {}), name: e.target.value })} /></div>
              <div><Label className="text-xs">Employer email</Label><Input value={state.employer?.email ?? ''} onChange={(e) => setPart('employer', { ...(state.employer ?? {}), email: e.target.value })} /></div>
            </div>
          </div>
        </>
      )}

      {cfg.requires_doctor_task && (
        <>
          <Separator />
          <div className="space-y-2">
            <p className="text-sm font-medium">Doctor / Medical provider (certificate task)</p>
            <div className="grid gap-2 md:grid-cols-2">
              <div><Label className="text-xs">Provider code</Label><Input value={state.doctorProvider?.provider_code ?? ''} onChange={(e) => setPart('doctorProvider', { ...(state.doctorProvider ?? {}), provider_code: e.target.value })} /></div>
              <div><Label className="text-xs">Provider name</Label><Input value={state.doctorProvider?.name ?? ''} onChange={(e) => setPart('doctorProvider', { ...(state.doctorProvider ?? {}), name: e.target.value })} /></div>
              <div><Label className="text-xs">Provider email</Label><Input value={state.doctorProvider?.email ?? ''} onChange={(e) => setPart('doctorProvider', { ...(state.doctorProvider ?? {}), email: e.target.value })} /></div>
            </div>
          </div>
        </>
      )}

      {(cfg.required_roles ?? []).length > 0 && (
        <div className="rounded bg-muted/40 p-2 text-xs text-muted-foreground">
          Internal BN will verify these roles after submission: {(cfg.required_roles as string[]).map((r) => BN_PARTICIPANT_ROLE_LABELS[r as BnParticipantRole] ?? r).join(', ')}.
        </div>
      )}
    </div>
  );
}

function BeneficiariesEditor({ items, onChange }: { items: Beneficiary[]; onChange: (v: Beneficiary[]) => void }) {
  const add = () => onChange([...items, {}]);
  const upd = (i: number, patch: Partial<Beneficiary>) => onChange(items.map((b, k) => (k === i ? { ...b, ...patch } : b)));
  const del = (i: number) => onChange(items.filter((_, k) => k !== i));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Beneficiaries</p>
        <Button type="button" size="sm" variant="outline" onClick={add} className="gap-1"><Plus className="h-3.5 w-3.5" /> Add</Button>
      </div>
      {items.length === 0 && <p className="text-xs text-muted-foreground">Add at least one beneficiary.</p>}
      {items.map((b, i) => (
        <div key={i} className="space-y-2 rounded border p-3">
          <div className="grid gap-2 md:grid-cols-3">
            <div><Label className="text-xs">SSN</Label><Input value={b.ssn ?? ''} onChange={(e) => upd(i, { ssn: e.target.value })} /></div>
            <div><Label className="text-xs">First name</Label><Input value={b.first_name ?? ''} onChange={(e) => upd(i, { first_name: e.target.value })} /></div>
            <div><Label className="text-xs">Last name</Label><Input value={b.last_name ?? ''} onChange={(e) => upd(i, { last_name: e.target.value })} /></div>
            <div><Label className="text-xs">Relationship</Label><Input value={b.relationship ?? ''} onChange={(e) => upd(i, { relationship: e.target.value })} placeholder="spouse / child / parent" /></div>
            <label className="flex items-center gap-2 text-xs"><Checkbox checked={!!b.is_student} onCheckedChange={(v) => upd(i, { is_student: !!v })} /> Student child</label>
            <label className="flex items-center gap-2 text-xs"><Checkbox checked={!!b.is_minor} onCheckedChange={(v) => upd(i, { is_minor: !!v })} /> Minor</label>
          </div>
          <div className="flex justify-end">
            <Button type="button" size="sm" variant="ghost" onClick={() => del(i)} className="gap-1 text-destructive"><Trash2 className="h-3.5 w-3.5" /> Remove</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Step 2 — Documents ────────────────────────────────────────────────────
function Step2Documents({ docs, toggle }: { docs: FormState['documents']; toggle: (code: string) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Required documents</p>
      {docs.length === 0 && <p className="text-xs text-muted-foreground">No documents required for this benefit.</p>}
      {docs.map((d) => (
        <label key={d.code} className="flex items-center justify-between rounded border p-3">
          <span className="text-sm">{d.label}</span>
          <span className="flex items-center gap-2 text-xs">
            <Checkbox checked={d.uploaded} onCheckedChange={() => toggle(d.code)} /> Uploaded / will bring
          </span>
        </label>
      ))}
    </div>
  );
}

// ─── Step 3 — Declaration ──────────────────────────────────────────────────
function Step3Declaration({ checked, onChange, summary, productName }: { checked: boolean; onChange: (v: boolean) => void; summary: FormState; productName: string }) {
  return (
    <div className="space-y-4">
      <div className="rounded border p-3 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Summary</p>
        <p>Product: {productName}</p>
        <p>Applicant: {summary.applicant?.first_name ?? ''} {summary.applicant?.last_name ?? ''} ({summary.applicant?.ssn ?? '—'})</p>
        {summary.insuredPerson?.ssn && <p>Insured Person: {summary.insuredPerson.ssn}</p>}
        {summary.deceasedInsuredPerson?.ssn && <p>Deceased Insured Person: {summary.deceasedInsuredPerson.ssn}</p>}
        {summary.beneficiaries.length > 0 && <p>Beneficiaries: {summary.beneficiaries.length}</p>}
        {summary.employer?.employer_regno && <p>Employer: {summary.employer.employer_regno}</p>}
        {summary.doctorProvider?.provider_code && <p>Doctor: {summary.doctorProvider.provider_code}</p>}
      </div>
      <Textarea readOnly rows={4} value={`I declare that the information provided in this application is true and complete to the best of my knowledge. I authorise the Social Security Board to verify any information given.`} />
      <label className="flex items-start gap-2 text-sm">
        <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} className="mt-0.5" />
        <span>I have read and accept the declaration above.</span>
      </label>
    </div>
  );
}

export default PortalFormRenderer;
