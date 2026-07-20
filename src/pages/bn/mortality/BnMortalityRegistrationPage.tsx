/**
 * BN Mortality — Registration Wizard  (/bn/mortality/new)
 *
 * 7 steps: reporting source, deceased, death, reporter, person match,
 * affected-award preview, review. State persists across step navigation
 * during the session. Save Draft and Submit are DISABLED while the module
 * is in the internal-pilot read-only state; no fake success is faked.
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import {
  BnModuleRouteGate,
  type BnModuleAccessContext,
} from '@/components/bn/access/BnModuleRouteGate';
import { BnMortalityAuthState } from './components/BnMortalityAuthState';
import { BnMortalityBreadcrumbs } from './components/BnMortalityBreadcrumbs';

import {
  useMortalityPersonMatches,
  useMortalityRegistrationImpactPreview,
} from '@/hooks/bn/mortality/useMortalityQueries';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  Lock,
  UserSearch,
} from 'lucide-react';

const SOURCES = [
  'REGISTRAR_FEED',
  'IP_MODULE',
  'FAMILY_NOTIFICATION',
  'HOSPITAL_NOTICE',
  'STAFF_ENTRY',
  'OTHER',
] as const;

interface WizardState {
  source: string;
  deceasedFullName: string;
  deceasedNationalId: string;
  deceasedDob: string;
  deceasedGender: string;
  deathDate: string;
  deathTime: string;
  deathPlace: string;
  deathCause: string;
  registrarReference: string;
  reporterName: string;
  reporterRelationship: string;
  reporterContact: string;
  matchSelectedIpId: string | null;
  matchQuery: { nationalId: string; fullName: string };
  noMatchDecision: boolean;
  noMatchReason: string;
}

const initial: WizardState = {
  source: 'STAFF_ENTRY',
  deceasedFullName: '',
  deceasedNationalId: '',
  deceasedDob: '',
  deceasedGender: '',
  deathDate: '',
  deathTime: '',
  deathPlace: '',
  deathCause: '',
  registrarReference: '',
  reporterName: '',
  reporterRelationship: '',
  reporterContact: '',
  matchSelectedIpId: null,
  matchQuery: { nationalId: '', fullName: '' },
  noMatchDecision: false,
  noMatchReason: '',
};


const stepSchemas = [
  z.object({ source: z.enum(SOURCES) }),
  z.object({
    deceasedFullName: z.string().trim().min(1, 'Required').max(200),
    deceasedNationalId: z.string().trim().max(20).optional().or(z.literal('')),
    deceasedDob: z.string().max(10).optional().or(z.literal('')),
    deceasedGender: z.string().max(1).optional().or(z.literal('')),
  }),
  z.object({
    deathDate: z.string().min(1, 'Death date required').max(10),
    deathTime: z.string().max(8).optional().or(z.literal('')),
    deathPlace: z.string().max(200).optional().or(z.literal('')),
    deathCause: z.string().max(500).optional().or(z.literal('')),
    registrarReference: z.string().max(100).optional().or(z.literal('')),
  }),
  z.object({
    reporterName: z.string().trim().max(200).optional().or(z.literal('')),
    reporterRelationship: z.string().trim().max(80).optional().or(z.literal('')),
    reporterContact: z.string().trim().max(200).optional().or(z.literal('')),
  }),
  z.object({}), // person match — validated separately
  z.object({}), // affected awards — read-only preview
  z.object({}), // review
];

const STEPS: { title: string; description: string }[] = [
  { title: 'Reporting source', description: 'How was this death reported?' },
  { title: 'Deceased details', description: 'Identity information for the deceased person.' },
  { title: 'Death details', description: 'When, where, cause of death.' },
  { title: 'Reporter details', description: 'Who is reporting the event?' },
  { title: 'Person matching', description: 'Match the deceased to a canonical person record.' },
  { title: 'Affected awards', description: 'Preview of the awards this event may affect.' },
  { title: 'Review', description: 'Confirm and submit.' },
];

function StepShell({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Step {step + 1}: {title}
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {step + 1} of {STEPS.length}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function WizardContent({ ctx }: { ctx: BnModuleAccessContext }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof WizardState>(k: K, v: WizardState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  const matchSearchEnabled = step === 4 && !!(state.matchQuery.nationalId || state.matchQuery.fullName);
  const matches = useMortalityPersonMatches(
    { nationalId: state.matchQuery.nationalId, fullName: state.matchQuery.fullName },
    matchSearchEnabled,
  );

  // Live impact preview — enabled once a decision (match or explicit "no match") is made
  // and a death date is provided. This is a server-side read (no writes).
  const impactPreviewEnabled = !!state.deathDate && (state.matchSelectedIpId != null || state.noMatchDecision);
  const impactPreview = useMortalityRegistrationImpactPreview(
    impactPreviewEnabled
      ? {
          matchedIpId: state.matchSelectedIpId,
          deathDate: state.deathDate,
          source: state.source,
          externalReference: state.registrarReference || undefined,
        }
      : null,
    impactPreviewEnabled,
  );

  const validateStep = (): boolean => {
    const schema = stepSchemas[step];
    const res = schema.safeParse(state);
    if (!res.success) {
      const flat: Record<string, string> = {};
      for (const iss of res.error.issues) {
        flat[iss.path.join('.')] = iss.message;
      }
      setErrors(flat);
      return false;
    }
    // Step 4 (person match) — require an explicit decision before continuing.
    if (step === 4 && !state.matchSelectedIpId && !state.noMatchDecision) {
      setErrors({ matchSelectedIpId: 'Select a matched person or record "no match found" to continue.' });
      return false;
    }
    setErrors({});
    return true;
  };

  const next = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const back = () => setStep((s) => Math.max(0, s - 1));


  const mutationsDisabledReason = !ctx.actionsEnabled
    ? 'Mortality mutations are disabled during internal-pilot review.'
    : !ctx.hasWrite
      ? 'You do not have the bn_mortality:write permission.'
      : null;

  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <BnMortalityBreadcrumbs leaf={{ kind: 'registration' }} />
      <div className="flex items-start justify-between gap-4">

        <div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon">
              <Link to="/bn/mortality">
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-semibold">Register a mortality event</h1>
            {!ctx.actionsEnabled && (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" /> Read-only pilot
              </Badge>
            )}
          </div>
          <p className="ml-11 mt-1 text-sm text-muted-foreground">
            Complete every step. Server-side validation runs on submit; nothing is saved until Submit is enabled.
          </p>
        </div>
      </div>

      {mutationsDisabledReason && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertTitle>Save and Submit are disabled</AlertTitle>
          <AlertDescription>{mutationsDisabledReason}</AlertDescription>
        </Alert>
      )}

      {/* Step indicator */}
      <div className="flex flex-wrap items-center gap-1">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.title}>
            <button
              type="button"
              onClick={() => setStep(i)}
              className={`rounded-full px-3 py-1 text-xs transition ${
                i === step
                  ? 'bg-primary text-primary-foreground'
                  : i < step
                    ? 'bg-muted text-foreground'
                    : 'bg-muted/40 text-muted-foreground'
              }`}
            >
              {i + 1}. {s.title}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Steps */}
      {step === 0 && (
        <StepShell step={0} {...STEPS[0]}>
          <div className="space-y-2">
            <Label>Reporting source</Label>
            <Select value={state.source} onValueChange={(v) => set('source', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </StepShell>
      )}

      {step === 1 && (
        <StepShell step={1} {...STEPS[1]}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Full name *</Label>
              <Input
                value={state.deceasedFullName}
                onChange={(e) => set('deceasedFullName', e.target.value)}
                maxLength={200}
              />
              {errors.deceasedFullName && <p className="text-xs text-destructive">{errors.deceasedFullName}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>National ID / SSN</Label>
              <Input
                value={state.deceasedNationalId}
                onChange={(e) => set('deceasedNationalId', e.target.value)}
                maxLength={20}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date of birth</Label>
              <Input
                type="date"
                value={state.deceasedDob}
                onChange={(e) => set('deceasedDob', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={state.deceasedGender} onValueChange={(v) => set('deceasedGender', v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">M</SelectItem>
                  <SelectItem value="F">F</SelectItem>
                  <SelectItem value="X">X</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </StepShell>
      )}

      {step === 2 && (
        <StepShell step={2} {...STEPS[2]}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Death date *</Label>
              <Input type="date" value={state.deathDate} onChange={(e) => set('deathDate', e.target.value)} />
              {errors.deathDate && <p className="text-xs text-destructive">{errors.deathDate}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Death time</Label>
              <Input type="time" value={state.deathTime} onChange={(e) => set('deathTime', e.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Place of death</Label>
              <Input value={state.deathPlace} onChange={(e) => set('deathPlace', e.target.value)} maxLength={200} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Cause of death</Label>
              <Textarea value={state.deathCause} onChange={(e) => set('deathCause', e.target.value)} maxLength={500} rows={3} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Registrar reference</Label>
              <Input value={state.registrarReference} onChange={(e) => set('registrarReference', e.target.value)} maxLength={100} />
            </div>
          </div>
        </StepShell>
      )}

      {step === 3 && (
        <StepShell step={3} {...STEPS[3]}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Reporter name</Label>
              <Input value={state.reporterName} onChange={(e) => set('reporterName', e.target.value)} maxLength={200} />
            </div>
            <div className="space-y-1.5">
              <Label>Relationship</Label>
              <Input value={state.reporterRelationship} onChange={(e) => set('reporterRelationship', e.target.value)} maxLength={80} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Contact</Label>
              <Input value={state.reporterContact} onChange={(e) => set('reporterContact', e.target.value)} maxLength={200} />
            </div>
          </div>
        </StepShell>
      )}

      {step === 4 && (
        <StepShell step={4} {...STEPS[4]}>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5 md:col-span-1">
              <Label>National ID</Label>
              <Input
                value={state.matchQuery.nationalId}
                onChange={(e) => set('matchQuery', { ...state.matchQuery, nationalId: e.target.value })}
                maxLength={20}
              />
            </div>
            <div className="space-y-1.5 md:col-span-1">
              <Label>Full name</Label>
              <Input
                value={state.matchQuery.fullName}
                onChange={(e) => set('matchQuery', { ...state.matchQuery, fullName: e.target.value })}
                maxLength={200}
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => matches.refetch()} disabled={!matchSearchEnabled}>
                <UserSearch className="mr-1.5 h-3.5 w-3.5" /> Search
              </Button>
            </div>
          </div>
          <div className="rounded-md border">
            {matches.isLoading ? (
              <div className="p-4 text-center text-xs text-muted-foreground">Searching…</div>
            ) : matches.isError ? (
              <div className="p-4"><Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{matches.error?.message}</AlertDescription></Alert></div>
            ) : !matches.data?.data || matches.data.data.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                {matchSearchEnabled ? 'No matching persons found.' : 'Enter a national ID or name and Search.'}
              </div>
            ) : (
              <ul className="divide-y">
                {matches.data.data.map((m) => (
                  <li key={m.ipId} className="flex items-center justify-between p-3">
                    <div>
                      <div className="text-sm font-medium">{m.fullName}</div>
                      <div className="text-xs text-muted-foreground">
                        ID {m.nationalIdMasked ?? '—'} · DOB {m.dateOfBirth ?? '—'}
                      </div>
                    </div>
                    <Button
                      variant={state.matchSelectedIpId === m.ipId ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => set('matchSelectedIpId', m.ipId)}
                    >
                      {state.matchSelectedIpId === m.ipId ? 'Selected' : 'Select'}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-md border p-3 space-y-2">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={state.noMatchDecision}
                onChange={(e) => {
                  set('noMatchDecision', e.target.checked);
                  if (e.target.checked) set('matchSelectedIpId', null);
                }}
              />
              <span>
                <span className="font-medium">Record explicit &quot;no match found&quot;</span>
                <span className="block text-xs text-muted-foreground">Continue without selecting a canonical person. Impact preview will be limited.</span>
              </span>
            </label>
            {state.noMatchDecision && (
              <Textarea
                value={state.noMatchReason}
                onChange={(e) => set('noMatchReason', e.target.value)}
                placeholder="Reason (e.g. person not registered in Benefits)"
                maxLength={500}
                className="text-xs"
              />
            )}
          </div>
          {errors.matchSelectedIpId && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.matchSelectedIpId}</AlertDescription>
            </Alert>
          )}
        </StepShell>
      )}

      {step === 5 && (
        <StepShell step={5} {...STEPS[5]}>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Impact preview (read-only)</AlertTitle>
            <AlertDescription>
              Live server-side preview of awards likely to be affected. This is advisory only — the authoritative scan runs on <code>BN_MORTALITY_PREPARE_IMPACT</code> after submission.
            </AlertDescription>
          </Alert>
          {!impactPreviewEnabled ? (
            <div className="rounded-md border p-4 text-sm text-muted-foreground">
              Select a matched person (Step 5) or record &quot;no match found&quot;, and provide a death date, to run the preview.
            </div>
          ) : impactPreview.isLoading ? (
            <div className="rounded-md border p-4 text-sm text-muted-foreground">Loading preview…</div>
          ) : impactPreview.isError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{impactPreview.error?.message}</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {(impactPreview.data?.data?.warnings ?? []).map((w, i) => (
                <Alert key={`warn:${w.code}:${i}`} variant={w.severity === 'CRIT' ? 'destructive' : 'default'}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{w.code}</AlertTitle>
                  <AlertDescription>{w.message}</AlertDescription>
                </Alert>
              ))}
              {(impactPreview.data?.data?.duplicates?.length ?? 0) > 0 && (
                <div className="rounded-md border p-3 text-sm">
                  <div className="mb-1 font-medium">Possible duplicate events</div>
                  <ul className="text-xs space-y-1">
                    {impactPreview.data!.data!.duplicates.map((d) => (
                      <li key={d.id}>
                        <span className="font-mono">{d.eventReference}</span> — {d.status} · {d.deathDate ?? '—'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="rounded-md border p-3">
                <div className="mb-2 text-sm font-medium">
                  Awards discovered ({impactPreview.data?.data?.awards.length ?? 0})
                </div>
                {(impactPreview.data?.data?.awards?.length ?? 0) === 0 ? (
                  <div className="text-xs text-muted-foreground">No active awards found for this person.</div>
                ) : (
                  <ul className="divide-y text-sm">
                    {impactPreview.data!.data!.awards.map((a) => (
                      <li key={a.id} className="py-2 flex items-center justify-between">
                        <div>
                          <div className="font-mono text-xs">{a.awardReference ?? a.awardId}</div>
                          <div className="text-xs text-muted-foreground">
                            Status {a.currentAwardStatus ?? '—'} · Frequency {a.frequency ?? '—'} · End {a.endDate ?? '—'}
                          </div>
                        </div>
                        <Badge variant={a.likelyAction === 'TERMINATE' ? 'destructive' : a.likelyAction === 'HOLD' ? 'default' : 'secondary'}>
                          {a.likelyAction}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
          <div className="rounded-md border p-3 text-xs text-muted-foreground">
            <div><span className="text-muted-foreground">Matched IP:</span> {state.matchSelectedIpId ?? (state.noMatchDecision ? 'Explicit no-match' : '—')}</div>
            <div><span className="text-muted-foreground">Death date:</span> {state.deathDate || '—'}</div>
          </div>
        </StepShell>
      )}


      {step === 6 && (
        <StepShell step={6} {...STEPS[6]}>
          <div className="space-y-3 text-sm">
            <div><span className="text-muted-foreground">Source:</span> {state.source}</div>
            <div><span className="text-muted-foreground">Deceased:</span> {state.deceasedFullName || '—'} · {state.deceasedNationalId || '—'}</div>
            <div><span className="text-muted-foreground">Death:</span> {state.deathDate || '—'} at {state.deathPlace || '—'}</div>
            <div><span className="text-muted-foreground">Reporter:</span> {state.reporterName || '—'} ({state.reporterRelationship || '—'})</div>
            <div><span className="text-muted-foreground">Matched person:</span> {state.matchSelectedIpId ?? 'None selected'}</div>
          </div>
        </StepShell>
      )}

      {/* Nav */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={back} disabled={step === 0}>
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled
            title={mutationsDisabledReason ?? 'Save Draft is disabled during internal pilot.'}
          >
            Save Draft
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>Next <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button>
          ) : (
            <Button
              disabled
              title={mutationsDisabledReason ?? 'Submit is disabled during internal pilot.'}
            >
              Submit
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BnMortalityRegistrationPage() {
  return (
    <BnModuleRouteGate moduleCode="bn_mortality" requiredAction="view">
      {(ctx) => (
        <BnMortalityAuthState
          frame={
            <div className="p-6 pb-0 max-w-4xl mx-auto">
              <BnMortalityBreadcrumbs leaf={{ kind: 'registration' }} />
            </div>
          }
        >
          <WizardContent ctx={ctx} />
        </BnMortalityAuthState>
      )}
    </BnModuleRouteGate>
  );
}

