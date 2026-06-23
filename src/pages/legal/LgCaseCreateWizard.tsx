import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, ArrowRight, Check, ChevronLeft, Loader2, Plus, Scale, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useUserCode } from "@/hooks/useUserCode";
import { useLgReference } from "@/hooks/legal/useLgCases";
import { useCreateLegalCase } from "@/hooks/legal/useLgCaseCreate";
import { useLgSourceAllowance, useCaseCreationCheck } from "@/hooks/legal/useLgCaseSourceConfig";
import {
  buildDefaultComplainant,
  validateLegalCase,
  type CreateLegalCaseInput,
  type LegalCaseSourceMode,
  type PartyDraft,
} from "@/services/legal/lgCaseCreateService";
import { EmployerPickerLite } from "@/components/legal/lg/EmployerPickerLite";
import { InsuredPersonPickerLite } from "@/components/legal/lg/InsuredPersonPickerLite";
import { LegalReferencePickerLite } from "@/components/legal/lg/LegalReferencePickerLite";
import RoutePreviewBanner from "@/components/legal/lg/RoutePreviewBanner";
import CourtSelector from "@/components/legal/lg/CourtSelector";


const SOURCE_MODES: { code: LegalCaseSourceMode; label: string; description: string }[] = [
  { code: "COMPLIANCE_REFERRAL", label: "From Compliance Referral", description: "Continue a case forwarded by Compliance." },
  { code: "MANUAL_EMPLOYER", label: "Manual Employer Case", description: "Start directly in Legal against an employer." },
  { code: "MANUAL_MEMBER", label: "Manual Insured / Member Case", description: "Start directly in Legal against an insured person." },
  { code: "LEGACY", label: "Legacy Case Entry", description: "Record an existing legacy case from outside the system." },
  { code: "COURT_FILED", label: "Court Case Already Filed", description: "Capture a case that has already been filed in court." },
  { code: "INTERNAL", label: "Internal / Legal Advisory", description: "Internal opinion, policy interpretation, contract review." },
];

const STEP_LABELS = ["Source", "Details", "Parties", "References", "Review"];

const DEFAULT_COUNTRY = "KN";

export default function LgCaseCreateWizard() {
  const navigate = useNavigate();
  const { userCode } = useUserCode();
  const [params] = useSearchParams();
  const create = useCreateLegalCase();

  const { data: caseTypes = [] } = useLgReference("LG_CASE_TYPE");
  const { data: caseCategories = [] } = useLgReference("LG_CASE_CATEGORY");
  const { data: priorities = [] } = useLgReference("LG_PRIORITY");
  const { data: stages = [] } = useLgReference("LG_CASE_STAGE");
  const { data: partyRoles = [] } = useLgReference("LG_PARTY_ROLE");
  const { data: partyTypes = [] } = useLgReference("LG_PARTY_TYPE");
  const { data: taskTypes = [] } = useLgReference("LG_TASK_TYPE");

  const [step, setStep] = useState(0);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [selectedEmployer, setSelectedEmployer] = useState<{ regno: string; name: string } | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<{ id: string; ssn: string; name: string } | null>(null);

  const initialComplainant = useMemo(() => buildDefaultComplainant(DEFAULT_COUNTRY), []);

  const [form, setForm] = useState<CreateLegalCaseInput>({
    source_mode: (params.get("source") as LegalCaseSourceMode) || "MANUAL_EMPLOYER",
    country_code: DEFAULT_COUNTRY,
    case_type_code: "",
    case_category_code: "EMPLOYER",
    priority_code: "MEDIUM",
    current_stage_code: "LEGAL_REVIEW",
    status_code: "OPEN",
    opened_date: new Date().toISOString().slice(0, 10),
    summary: "",
    assigned_legal_officer_id: null,
    court_name: null,
    court_case_no: null,
    court_code: null,
    court_division_code: null,
    court_venue_code: null,
    presiding_officer_code: null,

    claim_amount: null,
    outstanding_amount_snapshot: null,
    compliance_case_id: params.get("complianceCaseId"),
    compliance_referral_id: params.get("referralId"),
    payment_arrangement_id: null,
    employer_id: params.get("employerId"),
    person_id: params.get("personId"),
    legacy_case_no: null,
    legacy_employer_name: null,
    legacy_person_name: null,
    legacy_court_case_no: null,
    legacy_opened_date: null,
    legacy_notes: null,
    parties: [initialComplainant],
    legal_reference_ids: [],
    document_ids: [],
    default_task: null,
    created_by: null,
  });

  const set = <K extends keyof CreateLegalCaseInput>(k: K, v: CreateLegalCaseInput[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const issues = useMemo(() => validateLegalCase(form), [form]);
  const issueByField = useMemo(() => {
    const m = new Map<string, string>();
    issues.forEach((i) => m.set(i.field, i.message));
    return m;
  }, [issues]);

  // ---- Source-driven restrictions (lg_case_source_config) ----
  const { data: srcAllowance } = useLgSourceAllowance(form.source_mode);
  const allowedTypeCodes = useMemo(
    () => new Set((srcAllowance?.caseTypes ?? []).map((c) => c.case_type_code)),
    [srcAllowance],
  );
  const allowedInitialStageCodes = useMemo(
    () => new Set(
      (srcAllowance?.stages ?? [])
        .filter((s) => s.allowed_as_initial_stage)
        .map((s) => s.stage_code),
    ),
    [srcAllowance],
  );
  const filteredCaseTypes = useMemo(
    () => (allowedTypeCodes.size > 0 ? caseTypes.filter((t) => allowedTypeCodes.has(t.code)) : caseTypes),
    [caseTypes, allowedTypeCodes],
  );
  const filteredStages = useMemo(
    () => (allowedInitialStageCodes.size > 0 ? stages.filter((s) => allowedInitialStageCodes.has(s.code)) : stages),
    [stages, allowedInitialStageCodes],
  );
  const { data: creationCheck } = useCaseCreationCheck({
    source_code: form.source_mode,
    case_type_code: form.case_type_code || null,
    stage_code: form.current_stage_code || null,
    manual: form.source_mode !== "COMPLIANCE_REFERRAL",
  });

  // When source changes and current selections are no longer allowed, reset them
  // and apply the source's suggested defaults.
  const sourceForReset = form.source_mode;
  const allowanceKey = srcAllowance?.source?.source_code;
  useMemo(() => {
    if (!srcAllowance?.source) return;
    if (allowanceKey !== sourceForReset) return;
    setForm((p) => {
      const next = { ...p };
      if (allowedTypeCodes.size > 0 && p.case_type_code && !allowedTypeCodes.has(p.case_type_code)) {
        next.case_type_code = "";
      }
      if (allowedInitialStageCodes.size > 0 && !allowedInitialStageCodes.has(p.current_stage_code)) {
        next.current_stage_code = srcAllowance.source?.default_stage_code
          ?? Array.from(allowedInitialStageCodes)[0]
          ?? p.current_stage_code;
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowanceKey]);


  const stepHasError = (idx: number): boolean => {
    if (!submitAttempted) return false;
    if (idx === 0) return issueByField.has("source_mode");
    if (idx === 1) {
      return ["country_code", "case_type_code", "priority_code", "current_stage_code", "opened_date", "legacy_case_no"]
        .some((k) => issueByField.has(k));
    }
    if (idx === 2) return ["parties", "employer", "person"].some((k) => issueByField.has(k));
    return false;
  };

  const goNext = () => setStep((s) => Math.min(STEP_LABELS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const handleAddParty = () => {
    const isMember = form.source_mode === "MANUAL_MEMBER";
    setForm((p) => ({
      ...p,
      parties: [...p.parties, {
        party_role: "RESPONDENT",
        party_type: isMember ? "INSURED_PERSON" : "EMPLOYER",
        display_name: "",
      }],
    }));
  };

  // Switch source mode + reset the "wrong" entity selection so we never carry
  // an employer pick into a member case (or vice-versa) and align category.
  const setSourceMode = (code: LegalCaseSourceMode) => {
    setForm((p) => {
      const isMember = code === "MANUAL_MEMBER";
      const isInternal = code === "INTERNAL";
      // Drop respondent parties tied to the previous mode's entity type.
      const cleanedParties = p.parties.filter((pt) => {
        if (pt.party_role === "COMPLAINANT") return true;
        if (isMember && pt.party_type === "EMPLOYER") return false;
        if (!isMember && ["INSURED_PERSON", "PERSON"].includes(pt.party_type)) return false;
        return true;
      });
      return {
        ...p,
        source_mode: code,
        case_category_code: isMember ? "INSURED_MEMBER" : isInternal ? "INTERNAL_LEGAL" : "EMPLOYER",
        employer_id: isMember ? null : p.employer_id,
        person_id: isMember ? p.person_id : null,
        legacy_employer_name: isMember ? null : p.legacy_employer_name,
        legacy_person_name: isMember ? p.legacy_person_name : null,
        parties: cleanedParties,
      };
    });
    if (code === "MANUAL_MEMBER") setSelectedEmployer(null);
    else setSelectedPerson(null);
  };

  const updateParty = (idx: number, patch: Partial<PartyDraft>) => {
    setForm((p) => ({
      ...p,
      parties: p.parties.map((pt, i) => (i === idx ? { ...pt, ...patch } : pt)),
    }));
  };
  const removeParty = (idx: number) => {
    setForm((p) => ({ ...p, parties: p.parties.filter((_, i) => i !== idx) }));
  };

  // Replace (or add) the EMPLOYER respondent party row from the picker selection.
  const applyEmployerToParties = (emp: { regno: string; name: string } | null) => {
    setForm((p) => {
      const others = p.parties.filter(
        (pt) => !(pt.party_type === "EMPLOYER" && pt.party_role !== "COMPLAINANT"),
      );
      const next = emp
        ? [
            ...others,
            {
              party_role: "RESPONDENT",
              party_type: "EMPLOYER",
              display_name: emp.name,
              external_ref_id: emp.regno,
              notes: "Linked from employer master",
            } as PartyDraft,
          ]
        : others;
      return {
        ...p,
        parties: next,
        legacy_employer_name: emp ? emp.name : p.legacy_employer_name,
      };
    });
  };

  // Replace (or add) the INSURED_PERSON respondent party row from the picker selection.
  const applyPersonToParties = (per: { id: string; ssn: string; name: string } | null) => {
    setForm((p) => {
      const others = p.parties.filter(
        (pt) => !(["INSURED_PERSON", "PERSON"].includes(pt.party_type) && pt.party_role !== "COMPLAINANT"),
      );
      const next = per
        ? [
            ...others,
            {
              party_role: "RESPONDENT",
              party_type: "INSURED_PERSON",
              display_name: per.name,
              external_ref_id: per.ssn,
              notes: "Linked from insured-person master",
            } as PartyDraft,
          ]
        : others;
      return {
        ...p,
        parties: next,
        person_id: per ? per.id : null,
        legacy_person_name: per ? per.name : p.legacy_person_name,
      };
    });
  };



  const onSubmit = async () => {
    setSubmitAttempted(true);
    if (issues.length) {
      toast.error("Please check the form for valid information!", { description: issues[0].message });
      const firstField = issues[0].field;
      if (["source_mode"].includes(firstField)) setStep(0);
      else if (["country_code", "case_type_code", "priority_code", "current_stage_code", "opened_date", "legacy_case_no"].includes(firstField)) setStep(1);
      else if (["parties", "employer", "person"].includes(firstField)) setStep(2);
      return;
    }
    if (creationCheck && !creationCheck.allowed) {
      toast.error("Blocked by routing policy", { description: creationCheck.reason });
      setStep(1);
      return;
    }
    try {
      const res = await create.mutateAsync({ ...form, created_by: userCode ?? null });
      toast.success(`Case ${res.case.lg_case_no} created (${res.party_count} parties)`);
      navigate(`/legal/lg/cases/${res.case.id}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create legal case");
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate("/legal/lg/cases")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Cases
          </Button>
          <div className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">New Legal Case</h1>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 flex-wrap">
          {STEP_LABELS.map((label, idx) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(idx)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                step === idx ? "border-primary bg-primary/10 font-medium" :
                stepHasError(idx) ? "border-destructive text-destructive" :
                "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              <span className={`h-5 w-5 inline-flex items-center justify-center rounded-full text-xs ${
                step === idx ? "bg-primary text-primary-foreground" :
                stepHasError(idx) ? "bg-destructive text-destructive-foreground" :
                "bg-muted"
              }`}>{idx + 1}</span>
              {label}
            </button>
          ))}
        </div>

        {/* Step content */}
        <Card>
          {step === 0 && (
            <>
              <CardHeader>
                <CardTitle>Step 1 — Case Source</CardTitle>
                <CardDescription>How did this case originate?</CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-3">
                {SOURCE_MODES.map((m) => (
                  <button
                    key={m.code}
                    type="button"
                    onClick={() => setSourceMode(m.code)}
                    className={`text-left rounded-lg border p-4 transition-colors ${
                      form.source_mode === m.code
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    <div className="font-medium flex items-center gap-2">
                      {form.source_mode === m.code && <Check className="h-4 w-4 text-primary" />}
                      {m.label}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{m.description}</div>
                  </button>
                ))}
              </CardContent>
            </>
          )}

          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle>Step 2 — Case Details</CardTitle>
                <CardDescription>Classification, dates, court and amounts.</CardDescription>
              </CardHeader>
              {creationCheck && !creationCheck.allowed && (
                <div className="mx-6 mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  <div className="font-medium">This combination is blocked by routing policy</div>
                  <div className="text-xs opacity-90 mt-1">{creationCheck.reason}</div>
                </div>
              )}
              {creationCheck && creationCheck.allowed && srcAllowance?.source && (
                <div className="mx-6 mb-4 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                  Source <b className="text-foreground">{srcAllowance.source.source_name}</b> · allowed case types{" "}
                  <b className="text-foreground">{allowedTypeCodes.size}</b> · allowed initial stages{" "}
                  <b className="text-foreground">{allowedInitialStageCodes.size}</b>
                </div>
              )}
              <CardContent className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Country *</Label>
                  <Input value={form.country_code ?? ""} onChange={(e) => set("country_code", e.target.value.toUpperCase())} maxLength={3} />
                </div>
                <div>
                  <Label>Case Category</Label>
                  <Select value={form.case_category_code ?? ""} onValueChange={(v) => set("case_category_code", v)}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {caseCategories.map((c) => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Case Type *</Label>
                  <Select value={form.case_type_code} onValueChange={(v) => set("case_type_code", v)}>
                    <SelectTrigger className={submitAttempted && issueByField.has("case_type_code") ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      {filteredCaseTypes.map((t) => <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {submitAttempted && issueByField.get("case_type_code") && (
                    <p className="text-xs text-destructive mt-1">{issueByField.get("case_type_code")}</p>
                  )}
                </div>
                <div>
                  <Label>Priority *</Label>
                  <Select value={form.priority_code} onValueChange={(v) => set("priority_code", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(priorities.length ? priorities : [
                        { code: "LOW", label: "Low" }, { code: "MEDIUM", label: "Medium" },
                        { code: "HIGH", label: "High" }, { code: "URGENT", label: "Urgent" },
                      ]).map((p) => <SelectItem key={p.code} value={p.code}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Starting Stage *</Label>
                  <Select value={form.current_stage_code} onValueChange={(v) => set("current_stage_code", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {filteredStages.map((s) => <SelectItem key={s.code} value={s.code}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Opened Date *</Label>
                  <Input type="date" value={form.opened_date} onChange={(e) => set("opened_date", e.target.value)} />
                </div>
                <div className="md:col-span-2 border rounded-md p-3 bg-muted/20">
                  <div className="text-sm font-medium mb-2">Court Linkage</div>
                  <CourtSelector
                    countryCode={form.country_code}
                    value={{
                      court_code: form.court_code,
                      court_division_code: form.court_division_code,
                      court_venue_code: form.court_venue_code,
                      presiding_officer_code: form.presiding_officer_code,
                      court_case_no: form.court_case_no,
                    }}
                    onChange={(patch) => setForm((p) => ({ ...p, ...patch }))}
                  />
                </div>

                <div>
                  <Label>Claim Amount</Label>
                  <Input type="number" step="0.01" min="0" value={form.claim_amount ?? ""}
                    onChange={(e) => set("claim_amount", e.target.value ? Number(e.target.value) : null)} />
                </div>
                <div>
                  <Label>Outstanding Snapshot</Label>
                  <Input type="number" step="0.01" min="0" value={form.outstanding_amount_snapshot ?? ""}
                    onChange={(e) => set("outstanding_amount_snapshot", e.target.value ? Number(e.target.value) : null)} />
                </div>
                <div className="md:col-span-2">
                  <Label>Summary</Label>
                  <Textarea rows={3} value={form.summary ?? ""} onChange={(e) => set("summary", e.target.value)}
                    placeholder="Brief description of the case." />
                </div>

                {/* Legacy fields */}
                {form.source_mode === "LEGACY" && (
                  <div className="md:col-span-2 border rounded-md p-3 bg-muted/30 space-y-3">
                    <div className="text-sm font-medium">Legacy Case Information</div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <Label>Legacy Case No.</Label>
                        <Input value={form.legacy_case_no ?? ""} onChange={(e) => set("legacy_case_no", e.target.value || null)} />
                      </div>
                      <div>
                        <Label>Legacy Court Case No.</Label>
                        <Input value={form.legacy_court_case_no ?? ""} onChange={(e) => set("legacy_court_case_no", e.target.value || null)} />
                      </div>
                      <div>
                        <Label>Legacy Employer Name</Label>
                        <Input value={form.legacy_employer_name ?? ""} onChange={(e) => set("legacy_employer_name", e.target.value || null)} />
                      </div>
                      <div>
                        <Label>Legacy Person Name</Label>
                        <Input value={form.legacy_person_name ?? ""} onChange={(e) => set("legacy_person_name", e.target.value || null)} />
                      </div>
                      <div>
                        <Label>Legacy Opened Date</Label>
                        <Input type="date" value={form.legacy_opened_date ?? ""}
                          onChange={(e) => set("legacy_opened_date", e.target.value || null)} />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Legacy Notes</Label>
                        <Textarea rows={2} value={form.legacy_notes ?? ""} onChange={(e) => set("legacy_notes", e.target.value || null)} />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle>Step 3 — Parties</CardTitle>
                <CardDescription>
                  The Social Security Board is added automatically as Complainant. Add at least one respondent / opposing party.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-md border bg-primary/5 px-3 py-2 text-xs">
                  Source: <span className="font-medium">{SOURCE_MODES.find(s => s.code === form.source_mode)?.label}</span>
                  {" · "}Main respondent entity:{" "}
                  <span className="font-medium">
                    {form.source_mode === "MANUAL_MEMBER" ? "Insured Person (ip_master)" :
                     form.source_mode === "INTERNAL" || form.source_mode === "LEGACY" ? "Free-form" :
                     "Employer (er_master)"}
                  </span>
                </div>
                {submitAttempted && issueByField.has("parties") && (
                  <p className="text-sm text-destructive">{issueByField.get("parties")}</p>
                )}
                {submitAttempted && issueByField.has("employer") && (
                  <p className="text-sm text-destructive">{issueByField.get("employer")}</p>
                )}
                {submitAttempted && issueByField.has("person") && (
                  <p className="text-sm text-destructive">{issueByField.get("person")}</p>
                )}

                {/* Main party pickers — driven by source mode */}
                {(form.source_mode === "MANUAL_EMPLOYER" || form.source_mode === "COMPLIANCE_REFERRAL" || form.source_mode === "COURT_FILED") && (
                  <div className="rounded-md border p-3 bg-muted/20 space-y-2">
                    <div className="text-sm font-medium">Main Employer (Respondent)</div>
                    <EmployerPickerLite
                      value={selectedEmployer?.regno ?? null}
                      valueLabel={selectedEmployer?.name ?? null}
                      onSelect={(emp) => {
                        setSelectedEmployer(emp);
                        applyEmployerToParties(emp);
                      }}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Selecting an employer auto-adds a RESPONDENT party with the registration number.
                    </p>
                  </div>
                )}

                {form.source_mode === "MANUAL_MEMBER" && (
                  <div className="rounded-md border p-3 bg-muted/20 space-y-2">
                    <div className="text-sm font-medium">Main Insured Person (Respondent)</div>
                    <InsuredPersonPickerLite
                      value={selectedPerson?.id ?? null}
                      valueLabel={selectedPerson ? `${selectedPerson.name} · ${selectedPerson.ssn}` : null}
                      onSelect={(per) => {
                        setSelectedPerson(per);
                        applyPersonToParties(per);
                      }}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Selecting an insured person auto-adds a RESPONDENT party with their SSN.
                    </p>
                  </div>
                )}

                {form.source_mode === "LEGACY" && (
                  <div className="rounded-md border p-3 bg-muted/20 space-y-1">
                    <div className="text-sm font-medium">Legacy Party</div>
                    <p className="text-xs text-muted-foreground">
                      Capture the legacy party name in Step 2. You can still add structured parties below for later matching.
                    </p>
                  </div>
                )}

                {form.parties.map((p, idx) => (
                  <div key={idx} className="border rounded-md p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={p.party_role === "COMPLAINANT" ? "default" : "secondary"}>{p.party_role}</Badge>
                        <span className="text-xs text-muted-foreground">{p.party_type}</span>
                      </div>
                      {p.party_role !== "COMPLAINANT" && (
                        <Button size="sm" variant="ghost" onClick={() => removeParty(idx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid md:grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">Role</Label>
                        <Select value={p.party_role} onValueChange={(v) => updateParty(idx, { party_role: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent className="max-h-80">
                            {partyRoles.map((r) => <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Type</Label>
                        <Select value={p.party_type} onValueChange={(v) => updateParty(idx, { party_type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent className="max-h-80">
                            {partyTypes.map((t) => <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Display Name *</Label>
                        <Input value={p.display_name} onChange={(e) => updateParty(idx, { display_name: e.target.value })} />
                      </div>
                      <div className="md:col-span-3">
                        <Label className="text-xs">Notes</Label>
                        <Input value={p.notes ?? ""} onChange={(e) => updateParty(idx, { notes: e.target.value || null })} />
                      </div>
                    </div>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={handleAddParty} className="gap-1">
                  <Plus className="h-4 w-4" /> Add Party
                </Button>
              </CardContent>
            </>
          )}

          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle>Step 4 — References & Documents</CardTitle>
                <CardDescription>
                  Optional. Detailed linking of legal references and existing DMS documents is available on the case detail screen after creation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Default Task to Create</Label>
                  <div className="grid md:grid-cols-3 gap-2">
                    <Select
                      value={form.default_task?.task_type_code ?? "__NONE__"}
                      onValueChange={(v) => set("default_task", v && v !== "__NONE__"
                        ? { task_type_code: v, title: taskTypes.find((t) => t.code === v)?.label ?? v }
                        : null)}
                    >
                      <SelectTrigger><SelectValue placeholder="No default task" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__NONE__">(none)</SelectItem>
                        {taskTypes.map((t) => <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Task title"
                      value={form.default_task?.title ?? ""}
                      disabled={!form.default_task}
                      onChange={(e) => set("default_task", form.default_task ? { ...form.default_task, title: e.target.value } : null)}
                    />
                    <Input
                      type="date"
                      value={form.default_task?.due_date ?? ""}
                      disabled={!form.default_task}
                      onChange={(e) => set("default_task", form.default_task ? { ...form.default_task, due_date: e.target.value || null } : null)}
                    />
                  </div>
                </div>
                <div>
                  <Label>SKN Legal References to attach</Label>
                  <LegalReferencePickerLite
                    countryCode={form.country_code || "KN"}
                    value={form.legal_reference_ids ?? []}
                    onChange={(ids) => set("legal_reference_ids", ids)}
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Stage templates will be suggested on the case detail screen based on the starting stage you selected.
                  Additional DMS documents can be uploaded or linked from the case detail screen.
                </p>
              </CardContent>
            </>
          )}

          {step === 4 && (
            <>
              <CardHeader>
                <CardTitle>Step 5 — Review & Create</CardTitle>
                <CardDescription>Check the summary, then create the case.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <RoutePreviewBanner
                  source={form.source_mode}
                  caseType={form.case_type_code}
                  stage={form.current_stage_code}
                  priority={form.priority_code}
                />
                <ReviewRow label="Source mode" value={form.source_mode} />
                <ReviewRow label="Country" value={form.country_code ?? "—"} />
                <ReviewRow label="Case type" value={form.case_type_code} />
                <ReviewRow label="Category" value={form.case_category_code ?? "—"} />
                <ReviewRow label="Priority" value={form.priority_code} />
                <ReviewRow label="Starting stage" value={form.current_stage_code} />
                <ReviewRow label="Opened" value={form.opened_date} />
                <ReviewRow label="Court" value={[form.court_name, form.court_case_no].filter(Boolean).join(" / ") || "—"} />
                <ReviewRow label="Claim amount" value={form.claim_amount?.toString() ?? "—"} />
                <ReviewRow label="Parties" value={`${form.parties.length} (${form.parties.map((p) => p.party_role).join(", ")})`} />
                <ReviewRow label="Main employer" value={selectedEmployer ? `${selectedEmployer.name} (${selectedEmployer.regno})` : "—"} />
                <ReviewRow label="Main insured person" value={selectedPerson ? `${selectedPerson.name} (SSN ${selectedPerson.ssn})` : "—"} />
                <ReviewRow label="Legal references" value={`${form.legal_reference_ids?.length ?? 0} attached`} />
                {form.source_mode === "LEGACY" && (
                  <ReviewRow label="Legacy refs" value={[form.legacy_case_no, form.legacy_court_case_no].filter(Boolean).join(" / ") || "—"} />
                )}
                {issues.length > 0 && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-1">
                    <div className="font-medium text-destructive">Validation issues</div>
                    <ul className="list-disc ml-5 text-destructive text-xs">
                      {issues.map((i) => <li key={i.field}>{i.message}</li>)}
                    </ul>
                  </div>
                )}
              </CardContent>
            </>
          )}

          {/* Footer */}
          <div className="flex justify-between items-center border-t p-4">
            <Button variant="outline" disabled={step === 0} onClick={goBack}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => navigate("/legal/lg/cases")} disabled={create.isPending}>Cancel</Button>
              {step < STEP_LABELS.length - 1 ? (
                <Button onClick={goNext}>Next <ArrowRight className="h-4 w-4 ml-1" /></Button>
              ) : (
                <Button onClick={onSubmit} disabled={create.isPending}>
                  {create.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Create Case
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
