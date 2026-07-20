/**
 * BN-AP-01 Slice 2B §I — Real seven-step Staff-Assisted Appeal Intake wizard.
 *
 * Reads all data through BenefitsQueryClient. No direct browser table access.
 * Save Draft and "Register Received Appeal" remain disabled until
 * BN_APPEAL_REGISTER_RECEIVED_APPEAL is implemented in a later slice.
 * Truthful disabled reasons are displayed to the user.
 */
import React, { useMemo, useReducer, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BnModuleRouteGate } from '@/components/bn/access/BnModuleRouteGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { ShieldAlert, ChevronLeft, ChevronRight, Loader2, AlertTriangle, Check } from 'lucide-react';
import {
  INITIAL_WIZARD_STATE,
  isStepReady,
  wizardReducer,
  type WizardStepId,
} from './wizard/appealWizardReducer';
import {
  useAppealDuplicateCheck,
  useAppealFilingDeadline,
  useAppealRegistrationConfig,
  useAppealRepresentativeOptions,
  useAppealSourceContext,
  useAppealSourceSearch,
} from '@/hooks/bn/appeals/useAppealWizardQueries';

const STEPS: { id: WizardStepId; label: string }[] = [
  { id: 1, label: 'Source Decision' },
  { id: 2, label: 'Appellant & Representation' },
  { id: 3, label: 'Case Classification' },
  { id: 4, label: 'Filing & Late Filing' },
  { id: 5, label: 'Grounds & Issues' },
  { id: 6, label: 'Evidence' },
  { id: 7, label: 'Review' },
];

const SOURCE_MODULES: { value: string; label: string; entityType: string }[] = [
  { value: 'bn_claim', label: 'Claim', entityType: 'CLAIM' },
  { value: 'bn_award', label: 'Award', entityType: 'AWARD' },
  { value: 'bn_overpayment', label: 'Overpayment', entityType: 'OVERPAYMENT' },
  { value: 'bn_medical', label: 'Medical', entityType: 'MEDICAL' },
  { value: 'bn_means_test', label: 'Means-Test', entityType: 'MEANS_TEST' },
];

export default function BnAppealNewPreviewPage() {
  return (
    <BnModuleRouteGate moduleCode="bn_appeals" requiredAction="view">
      {() => <WizardShell />}
    </BnModuleRouteGate>
  );
}

function WizardShell() {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(wizardReducer, INITIAL_WIZARD_STATE);

  const goBack = () => {
    if (state.dirty && !window.confirm('You have unsaved changes. Leave the wizard?')) return;
    navigate('/bn/appeals');
  };

  return (
    <div className="space-y-4 p-6" data-testid="bn-appeal-wizard">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            Benefit Management → Benefit Operations → Appeals &amp; Disputes → Register Received Appeal
          </p>
          <h1 className="mt-1 text-xl font-semibold" data-testid="wizard-title">
            Register Received Appeal
          </h1>
          <p className="text-xs text-muted-foreground">
            Staff-assisted intake for an appeal already filed by the appellant (walk-in, post,
            email, phone, referral or legal representative).
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={goBack}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Worklist
        </Button>
      </div>

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Read-only pilot — Save Draft &amp; Register Received Appeal are disabled</AlertTitle>
        <AlertDescription>
          The command <code>BN_APPEAL_REGISTER_RECEIVED_APPEAL</code> is not yet implemented.
          All data below is fetched through the secure server boundary; nothing is written
          back until Slice 2B.2.
        </AlertDescription>
      </Alert>

      <Stepper current={state.currentStep} state={state} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Step {state.currentStep}. {STEPS.find((s) => s.id === state.currentStep)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.currentStep === 1 && <Step1SourceDecision state={state} dispatch={dispatch} />}
          {state.currentStep === 2 && <Step2Representation state={state} dispatch={dispatch} />}
          {state.currentStep === 3 && <Step3Classification state={state} dispatch={dispatch} />}
          {state.currentStep === 4 && <Step4Filing state={state} dispatch={dispatch} />}
          {state.currentStep === 5 && <Step5Grounds state={state} dispatch={dispatch} />}
          {state.currentStep === 6 && <Step6Evidence state={state} dispatch={dispatch} />}
          {state.currentStep === 7 && <Step7Review state={state} />}
        </CardContent>
      </Card>

      <NavFooter state={state} dispatch={dispatch} />
    </div>
  );
}

function Stepper({ current, state }: { current: WizardStepId; state: any }) {
  return (
    <ol className="grid grid-cols-1 gap-2 md:grid-cols-7" data-testid="wizard-stepper">
      {STEPS.map((s) => {
        const isActive = s.id === current;
        const isDone = s.id < current && isStepReady(state, s.id);
        return (
          <li
            key={s.id}
            className={`flex items-center gap-2 rounded-md border p-2 text-xs ${
              isActive ? 'border-primary bg-primary/5 font-medium' : 'border-muted'
            }`}
            data-step={s.id}
            aria-current={isActive ? 'step' : undefined}
          >
            <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
              isDone ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              {isDone ? <Check className="h-3 w-3" /> : s.id}
            </span>
            <span className="truncate">{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function NavFooter({ state, dispatch }: { state: any; dispatch: React.Dispatch<any> }) {
  const canAdvance = isStepReady(state, (state.currentStep + 1) as WizardStepId);
  const atEnd = state.currentStep === 7;
  return (
    <div className="flex items-center justify-between gap-2">
      <Button
        variant="outline"
        onClick={() => dispatch({ type: 'SET_STEP', step: Math.max(1, state.currentStep - 1) as WizardStepId })}
        disabled={state.currentStep === 1}
      >
        <ChevronLeft className="mr-1 h-4 w-4" /> Back
      </Button>
      <div className="flex gap-2">
        {atEnd ? (
          <>
            <Button variant="outline" disabled title="BN_APPEAL_REGISTER_RECEIVED_APPEAL not yet implemented — actions_enabled=false">
              Save Draft (disabled)
            </Button>
            <Button disabled title="BN_APPEAL_REGISTER_RECEIVED_APPEAL not yet implemented — internal pilot">
              Register Received Appeal (disabled)
            </Button>
          </>
        ) : (
          <Button
            onClick={() => dispatch({ type: 'SET_STEP', step: (state.currentStep + 1) as WizardStepId })}
            disabled={!canAdvance}
          >
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Step 1 — Source Decision ───────────────────────────────────────────────
function Step1SourceDecision({ state, dispatch }: any) {
  const [module, setModule] = useState<string>(state.sourceModule ?? 'bn_claim');
  const [search, setSearch] = useState('');
  const q = useAppealSourceSearch({ sourceModule: module, search });
  const data = q.data as any;
  const notReady = data && data.readiness === false;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <Label>Source module</Label>
          <Select value={module} onValueChange={setModule}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SOURCE_MODULES.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label>Search reference / claim number</Label>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. CLM-2025-0001" />
        </div>
      </div>

      {q.isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Searching…</div>
      )}
      {q.isError && (
        <Alert variant="destructive">
          <AlertTitle>Search failed</AlertTitle>
          <AlertDescription>{(q.error as any)?.message ?? 'Unknown error'} (correlation ID: {(q.error as any)?.correlationId ?? '—'})</AlertDescription>
        </Alert>
      )}
      {notReady && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Integration not ready</AlertTitle>
          <AlertDescription>{data.message ?? `Source adapter for ${module} is not yet certified.`}</AlertDescription>
        </Alert>
      )}
      {data && data.readiness && (
        <div className="rounded border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Claimant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data.results ?? []).length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No appealable decisions match your search.</TableCell></TableRow>
              )}
              {(data.results ?? []).map((r: any) => (
                <TableRow key={r.sourceEntityId}>
                  <TableCell className="font-medium">{r.displayReference ?? '—'}</TableCell>
                  <TableCell>{r.decisionType ?? '—'}</TableCell>
                  <TableCell>{r.decisionDate?.slice(0, 10) ?? '—'}</TableCell>
                  <TableCell>{r.claimantDisplayName ?? '—'}</TableCell>
                  <TableCell>
                    {r.existingActiveAppeal ? (
                      <Badge variant="destructive">Active appeal {r.existingActiveAppeal.appealNumber}</Badge>
                    ) : r.appealable ? (
                      <Badge variant="secondary">Appealable</Badge>
                    ) : (
                      <Badge variant="outline">Not appealable</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={state.sourceEntityId === r.sourceEntityId ? 'default' : 'outline'}
                      disabled={!r.appealable}
                      onClick={() => dispatch({
                        type: 'SELECT_SOURCE',
                        payload: {
                          sourceModule: r.sourceModule,
                          sourceEntityType: r.sourceEntityType,
                          sourceEntityId: r.sourceEntityId,
                          sourceDecisionId: r.sourceDecisionId,
                          displayReference: r.displayReference,
                          decisionDate: r.decisionDate,
                          notifiedAt: null,
                          claimantPersonId: r.claimantPersonId,
                          claimantDisplayName: r.claimantDisplayName,
                          benefitTypeCode: r.benefitTypeCode,
                        },
                      })}
                    >
                      {state.sourceEntityId === r.sourceEntityId ? 'Selected' : 'Select'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ── Step 2 — Appellant & Representation ────────────────────────────────────
function Step2Representation({ state, dispatch }: any) {
  const reps = useAppealRepresentativeOptions(state.claimantPersonId);
  const dup = useAppealDuplicateCheck({ sourceModule: state.sourceModule!, sourceEntityId: state.sourceEntityId });
  const dupData = dup.data as any;
  return (
    <div className="space-y-4">
      <div className="rounded border p-3 text-sm">
        <div><span className="text-muted-foreground">Appellant:</span> <strong>{state.claimantDisplayName ?? '—'}</strong></div>
        <div><span className="text-muted-foreground">Source reference:</span> {state.sourceDisplayReference ?? '—'}</div>
        <div><span className="text-muted-foreground">Masked identifier:</span> ••••</div>
      </div>
      <div>
        <Label>Representation</Label>
        <Select
          value={state.representationMode ?? ''}
          onValueChange={(v) => dispatch({ type: 'SET_REPRESENTATION', mode: v, linkId: null })}
        >
          <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="SELF">Self</SelectItem>
            <SelectItem value="REPRESENTATIVE">Authorised representative</SelectItem>
            <SelectItem value="GUARDIAN">Guardian</SelectItem>
            <SelectItem value="PAYEE">Payee (where policy permits)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {state.representationMode && state.representationMode !== 'SELF' && (
        <div>
          <Label>Verified authority (external_user_person_link)</Label>
          {reps.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {reps.data && (reps.data as any).options?.length === 0 && (
            <Alert variant="destructive"><AlertDescription>No verified authority link on record. Arbitrary unverified representation is not permitted.</AlertDescription></Alert>
          )}
          {reps.data && ((reps.data as any).options ?? []).map((opt: any) => (
            <label key={opt.id} className="flex items-center gap-2 rounded border p-2 text-sm">
              <input
                type="radio"
                name="rep"
                checked={state.representativeLinkId === opt.id}
                onChange={() => dispatch({ type: 'SET_REPRESENTATION', mode: state.representationMode, linkId: opt.id })}
              />
              <span>{opt.relationshipType} — valid {opt.validFrom?.slice(0, 10) ?? '—'} → {opt.validTo?.slice(0, 10) ?? 'ongoing'}</span>
            </label>
          ))}
        </div>
      )}
      {dupData?.hasDuplicate && (
        <Alert variant="destructive">
          <AlertTitle>Duplicate detected</AlertTitle>
          <AlertDescription>
            An active appeal already exists for this source decision:{' '}
            {dupData.existingAppeals.map((a: any) => a.appealNumber).join(', ')}. Progression to registration is blocked.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ── Step 3 — Classification ────────────────────────────────────────────────
function Step3Classification({ state, dispatch }: any) {
  const cfg = useAppealRegistrationConfig(state.sourceModule);
  const cfgData = cfg.data as any;
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div>
        <Label>Appeal type</Label>
        <Select value={state.appealTypeCode ?? ''} onValueChange={(v) => {
          const t = cfgData?.appealTypes?.find((x: any) => x.appealTypeCode === v);
          dispatch({ type: 'SET_CLASSIFICATION', patch: {
            appealTypeCode: v,
            caseKind: t?.caseKind ?? null,
            reviewLevelCode: t?.reviewLevelCode ?? null,
            requiresHearing: t?.requiresHearing ?? null,
            countryCode: t?.countryCode ?? state.countryCode,
          } });
        }}>
          <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
          <SelectContent>
            {(cfgData?.appealTypes ?? []).map((t: any) => (
              <SelectItem key={t.appealTypeCode} value={t.appealTypeCode}>{t.displayName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Case kind</Label>
        <Input value={state.caseKind ?? ''} readOnly />
      </div>
      <div>
        <Label>Review level</Label>
        <Input value={state.reviewLevelCode ?? ''} readOnly />
      </div>
      <div>
        <Label>Priority</Label>
        <Select value={state.priorityCode ?? 'NORMAL'} onValueChange={(v) => dispatch({ type: 'SET_CLASSIFICATION', patch: { priorityCode: v } })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(cfgData?.priorities ?? ['LOW','NORMAL','HIGH','URGENT']).map((p: string) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Confidentiality</Label>
        <Select value={state.confidentialityCode ?? 'STANDARD'} onValueChange={(v) => dispatch({ type: 'SET_CLASSIFICATION', patch: { confidentialityCode: v } })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(cfgData?.confidentiality ?? ['STANDARD','RESTRICTED','HIGHLY_RESTRICTED']).map((p: string) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Hearing required</Label>
        <Input value={state.requiresHearing === null ? '' : state.requiresHearing ? 'Yes' : 'No'} readOnly />
      </div>
    </div>
  );
}

// ── Step 4 — Filing ────────────────────────────────────────────────────────
function Step4Filing({ state, dispatch }: any) {
  const dl = useAppealFilingDeadline({
    appealTypeCode: state.appealTypeCode,
    decisionDate: state.sourceDecisionDate,
    notifiedAt: state.sourceNotifiedAt,
    submissionDate: state.submissionDate,
  });
  const dlData = dl.data as any;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <Label>Decision date</Label>
          <Input value={state.sourceDecisionDate?.slice(0, 10) ?? '—'} readOnly />
        </div>
        <div>
          <Label>Proposed submission date</Label>
          <Input type="date" value={state.submissionDate ?? ''} onChange={(e) => dispatch({ type: 'SET_FILING', patch: { submissionDate: e.target.value } })} />
        </div>
        <div>
          <Label>Statutory filing days</Label>
          <Input value={dlData?.statutoryFilingDays ?? '—'} readOnly />
        </div>
        <div>
          <Label>Calculated deadline</Label>
          <Input value={dlData?.filingDeadlineDate ?? '—'} readOnly />
        </div>
        <div>
          <Label>Days remaining</Label>
          <Input value={dlData?.daysRemaining ?? '—'} readOnly />
        </div>
        <div>
          <Label>Late filing?</Label>
          <Input value={dlData?.lateFiling ? 'Yes' : 'No'} readOnly />
        </div>
      </div>
      {dlData?.lateFiling && (
        <div>
          <Label>Late-filing explanation (required)</Label>
          <Textarea
            value={state.lateFilingExplanation ?? ''}
            onChange={(e) => dispatch({ type: 'SET_FILING', patch: { lateFilingExplanation: e.target.value } })}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Late-filing acceptance is a subsequent staff command; captured here for the record only.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Step 5 — Grounds & Issues ──────────────────────────────────────────────
function Step5Grounds({ state, dispatch }: any) {
  const cfg = useAppealRegistrationConfig(state.sourceModule);
  const cfgData = cfg.data as any;
  const toggleGround = (code: string) => {
    const next = state.groundCodes.includes(code)
      ? state.groundCodes.filter((g: string) => g !== code)
      : [...state.groundCodes, code];
    const primary = next.includes(state.primaryGroundCode) ? state.primaryGroundCode : next[0] ?? null;
    dispatch({ type: 'SET_GROUNDS', groundCodes: next, primaryGroundCode: primary });
  };
  return (
    <div className="space-y-4">
      <div>
        <Label>Grounds</Label>
        <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
          {(cfgData?.grounds ?? []).map((g: any) => (
            <label key={g.groundCode} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={state.groundCodes.includes(g.groundCode)} onChange={() => toggleGround(g.groundCode)} />
              <span>{g.groundName}</span>
            </label>
          ))}
        </div>
      </div>
      {state.groundCodes.length > 0 && (
        <div>
          <Label>Primary ground</Label>
          <Select value={state.primaryGroundCode ?? ''} onValueChange={(v) => dispatch({ type: 'SET_GROUNDS', groundCodes: state.groundCodes, primaryGroundCode: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {state.groundCodes.map((c: string) => {
                const g = cfgData?.grounds?.find((x: any) => x.groundCode === c);
                return (<SelectItem key={c} value={c}>{g?.groundName ?? c}</SelectItem>);
              })}
            </SelectContent>
          </Select>
        </div>
      )}
      <div>
        <Label>Issues / remedies</Label>
        <p className="text-xs text-muted-foreground mb-2">Add each disputed issue with the requested remedy.</p>
        {state.issues.map((iss: any, idx: number) => (
          <div key={iss.key} className="grid grid-cols-1 gap-2 md:grid-cols-4 rounded border p-2 mb-2">
            <Input placeholder="Issue code" value={iss.issueCode} onChange={(e) => {
              const next = [...state.issues]; next[idx] = { ...iss, issueCode: e.target.value };
              dispatch({ type: 'SET_ISSUES', issues: next });
            }} />
            <Input placeholder="Description" value={iss.description} onChange={(e) => {
              const next = [...state.issues]; next[idx] = { ...iss, description: e.target.value };
              dispatch({ type: 'SET_ISSUES', issues: next });
            }} />
            <Input placeholder="Disputed amount" type="number" value={iss.disputedAmount ?? ''} onChange={(e) => {
              const next = [...state.issues]; next[idx] = { ...iss, disputedAmount: e.target.value === '' ? null : Number(e.target.value) };
              dispatch({ type: 'SET_ISSUES', issues: next });
            }} />
            <Select value={iss.requestedRemedyCode ?? ''} onValueChange={(v) => {
              const next = [...state.issues]; next[idx] = { ...iss, requestedRemedyCode: v };
              dispatch({ type: 'SET_ISSUES', issues: next });
            }}>
              <SelectTrigger><SelectValue placeholder="Remedy" /></SelectTrigger>
              <SelectContent>
                {(cfgData?.remedies ?? []).map((r: any) => (
                  <SelectItem key={r.remedyCode} value={r.remedyCode}>{r.remedyName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => {
          dispatch({ type: 'SET_ISSUES', issues: [...state.issues, { key: `iss_${Date.now()}`, issueCode: '', description: '', disputedAmount: null, requestedRemedyCode: null }] });
        }}>Add issue</Button>
      </div>
    </div>
  );
}

// ── Step 6 — Evidence ──────────────────────────────────────────────────────
function Step6Evidence({ state }: any) {
  const ctx = useAppealSourceContext({ sourceModule: state.sourceModule!, sourceEntityId: state.sourceEntityId });
  return (
    <div className="space-y-3">
      <Alert>
        <AlertTitle>Evidence linking</AlertTitle>
        <AlertDescription>
          Source-record events and calculations are shown for context. Direct evidence
          upload requires a certified draft-evidence boundary; disabled in this pilot.
        </AlertDescription>
      </Alert>
      {ctx.isLoading && <div className="text-sm text-muted-foreground">Loading source context…</div>}
      {ctx.data && (
        <div className="rounded border p-3 text-xs">
          <div className="font-semibold mb-1">Recent source events</div>
          <ul className="list-disc pl-4">
            {((ctx.data as any).events ?? []).slice(0, 8).map((e: any) => (
              <li key={e.id}>{e.occurredAt?.slice(0, 10)} — {e.eventType}</li>
            ))}
            {((ctx.data as any).events ?? []).length === 0 && <li className="text-muted-foreground">No events recorded.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Step 7 — Review ────────────────────────────────────────────────────────
function Step7Review({ state }: any) {
  const dl = useAppealFilingDeadline({
    appealTypeCode: state.appealTypeCode,
    decisionDate: state.sourceDecisionDate,
    notifiedAt: state.sourceNotifiedAt,
    submissionDate: state.submissionDate,
  });
  const dup = useAppealDuplicateCheck({ sourceModule: state.sourceModule!, sourceEntityId: state.sourceEntityId });
  const dupData = dup.data as any;
  const dlData = dl.data as any;
  const summary = useMemo(() => ([
    ['Source decision', state.sourceDisplayReference],
    ['Source module', state.sourceModule],
    ['Appellant', state.claimantDisplayName],
    ['Representation', state.representationMode ?? '—'],
    ['Appeal type', state.appealTypeCode],
    ['Case kind', state.caseKind],
    ['Review level', state.reviewLevelCode],
    ['Priority', state.priorityCode],
    ['Confidentiality', state.confidentialityCode],
    ['Filing deadline', dlData?.filingDeadlineDate ?? '—'],
    ['Days remaining', String(dlData?.daysRemaining ?? '—')],
    ['Late filing?', dlData?.lateFiling ? 'Yes' : 'No'],
    ['Grounds', state.groundCodes.join(', ') || '—'],
    ['Primary ground', state.primaryGroundCode ?? '—'],
    ['Issues count', String(state.issues.length)],
    ['Requires hearing', state.requiresHearing == null ? '—' : (state.requiresHearing ? 'Yes' : 'No')],
    ['Duplicate check', dupData?.hasDuplicate ? `BLOCKED: ${dupData.existingAppeals.map((a: any) => a.appealNumber).join(', ')}` : 'OK'],
  ]), [state, dlData, dupData]);
  return (
    <div className="space-y-3">
      <div className="rounded border">
        <Table>
          <TableBody>
            {summary.map(([k, v]) => (
              <TableRow key={k as string}>
                <TableCell className="w-1/3 font-medium">{k}</TableCell>
                <TableCell>{v as any}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Registration disabled</AlertTitle>
        <AlertDescription>
          <ul className="list-disc pl-4">
            <li>Staff actions_enabled is false for the internal pilot.</li>
            <li>Command <code>BN_APPEAL_REGISTER_RECEIVED_APPEAL</code> is not yet implemented (Slice 2B.2).</li>
            <li>Rollout state remains internal_pilot.</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
