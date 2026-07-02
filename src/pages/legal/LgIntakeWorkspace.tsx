import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle, MessageSquare, ShieldCheck, UserPlus, Send, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PageShell } from "@/components/common/PageShell";
import {
  useIntake,
  useIntakeAudit,
  useIntakeChecklist,
  useIntakeInfoRequests,
  useIntakeMutations,
} from "@/hooks/legal/useLgIntake";
import { useIntakeDuplicates, useIntakeBusinessContext, useIntakeSourceContext } from "@/hooks/legal/useLgIntakeDecision";
import { validateCaseCreationGate } from "@/services/legal/lgIntakeQualificationService";
import { computeReadiness, computeRecommendation, computeAlerts } from "@/services/legal/lgIntakeDecisionService";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import { useLgAccess } from "@/hooks/legal/useLgAccess";
import { formatDateForDisplay } from "@/lib/format-config";
import { IntakeDecisionSummaryPanel } from "@/components/legal/intake/IntakeDecisionSummaryPanel";
import { QualificationReadinessMeter } from "@/components/legal/intake/QualificationReadinessMeter";
import { RecommendationCard } from "@/components/legal/intake/RecommendationCard";
import { DuplicateMatterAnalysisCard } from "@/components/legal/intake/DuplicateMatterAnalysisCard";
import { BusinessContextCard } from "@/components/legal/intake/BusinessContextCard";
import { FinancialExposureCard } from "@/components/legal/intake/FinancialExposureCard";
import { ReferralSourceContextCard } from "@/components/legal/intake/ReferralSourceContextCard";
import { OperationalAlertsBadges } from "@/components/legal/intake/OperationalAlertsBadges";
import { IntakeProposedLiabilitiesCard } from "@/components/legal/intake/IntakeProposedLiabilitiesCard";
import { materializeForCase as materializeIntakeLiabilities, summarize as summarizeProposals, type ProposedLiability } from "@/services/legal/lgIntakeLiabilityService";

export default function LgIntakeWorkspace() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { profile, user } = useSupabaseAuth();
  const actor = (profile as any)?.user_code ?? user?.email ?? "SYSTEM";
  const access = useLgAccess();
  const isSupervisor = access.can("approveNotice") || access.isAdmin;

  const { data: intake, isLoading, refetch } = useIntake(id);
  const { data: checklist = [] } = useIntakeChecklist(id);
  const { data: infoRequests = [] } = useIntakeInfoRequests(id);
  const { data: audit = [] } = useIntakeAudit(id);
  const m = useIntakeMutations(id);

  const [gateReasons, setGateReasons] = useState<string[]>([]);
  const [checkGateBusy, setCheckGateBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoForm, setInfoForm] = useState({ recipient: "", recipient_type: "DEPARTMENT", department: "", information_requested: "", reason: "", due_date: "", reminder_date: "" });
  const [supOpen, setSupOpen] = useState(false);
  const [supDecision, setSupDecision] = useState<"APPROVED" | "REJECTED" | "RETURNED">("APPROVED");
  const [supRemarks, setSupRemarks] = useState("");
  const [proposedLiabilities, setProposedLiabilities] = useState<ProposedLiability[]>([]);
  const proposalSummary = useMemo(() => summarizeProposals(proposedLiabilities), [proposedLiabilities]);

  const mandatoryTotal = useMemo(() => checklist.filter((c) => c.template.mandatory).length, [checklist]);
  const mandatoryComplete = useMemo(
    () => checklist.filter((c) => c.template.mandatory && (c.response?.status === "COMPLETE" || c.response?.status === "NA")).length,
    [checklist]
  );
  const openInfo = useMemo(() => infoRequests.filter((r) => r.status === "OPEN" || r.status === "OVERDUE").length, [infoRequests]);

  const { data: duplicates, isLoading: dupLoading } = useIntakeDuplicates(intake);
  const { data: businessCtx, isLoading: bcLoading } = useIntakeBusinessContext(intake);
  const { data: sourceCtx, isLoading: scLoading } = useIntakeSourceContext(intake);

  const readiness = useMemo(() => intake ? computeReadiness({
    intake, mandatoryTotal, mandatoryComplete,
    documentsCount: 0, openInfoCount: openInfo,
    duplicateOpenCases: duplicates?.totalOpen ?? 0,
  }) : null, [intake, mandatoryTotal, mandatoryComplete, openInfo, duplicates]);

  const recommendation = useMemo(() => intake && readiness ? computeRecommendation({
    intake, mandatoryTotal, mandatoryComplete,
    documentsCount: 0, openInfoCount: openInfo,
    duplicateOpenCases: duplicates?.totalOpen ?? 0,
  }) : null, [intake, readiness, mandatoryTotal, mandatoryComplete, openInfo, duplicates]);

  const alerts = useMemo(() => intake && duplicates ?
    computeAlerts(intake, duplicates, openInfo, mandatoryTotal, mandatoryComplete)
    : [], [intake, duplicates, openInfo, mandatoryTotal, mandatoryComplete]);

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading intake…</div>;
  if (!intake) return <div className="p-8">Intake not found. <Button variant="link" onClick={() => navigate("/legal/lg/intake")}>Back</Button></div>;

  const readonly =
    intake.qualification_status === "CONVERTED_TO_CASE" ||
    intake.qualification_status === "REJECTED";

  const openReject = () => setRejectOpen(true);
  const openReturn = () => setReturnOpen(true);

  async function doAccept() {
    try { await m.officerDecision.mutateAsync({ decision: "ACCEPT", actor }); toast.success("Intake accepted"); }
    catch (e: any) { toast.error(e.message); }
  }
  async function doReject() {
    if (!rejectReason.trim()) return toast.error("Reason required");
    try { await m.officerDecision.mutateAsync({ decision: "REJECT", reason: rejectReason, actor }); setRejectOpen(false); setRejectReason(""); toast.success("Intake rejected"); }
    catch (e: any) { toast.error(e.message); }
  }
  async function doReturn() {
    if (!returnReason.trim()) return toast.error("Reason required");
    try { await m.officerDecision.mutateAsync({ decision: "RETURN", reason: returnReason, actor }); setReturnOpen(false); setReturnReason(""); toast.success("Intake returned"); }
    catch (e: any) { toast.error(e.message); }
  }
  async function doEscalate() {
    try { await m.officerDecision.mutateAsync({ decision: "ESCALATE", actor }); toast.success("Escalated to supervisor"); }
    catch (e: any) { toast.error(e.message); }
  }
  async function doSubmitSupervisor() {
    try { await m.submitForSupervisor.mutateAsync({ actor }); toast.success("Submitted for supervisor review"); }
    catch (e: any) { toast.error(e.message); }
  }
  async function doCreateCase() {
    setCheckGateBusy(true);
    try {
      const g = await validateCaseCreationGate(id);
      if (!g.ok) { setGateReasons(g.failures); toast.error("Case creation blocked"); return; }
      const caseId = await m.createCase.mutateAsync({ actor });
      toast.success("Legal case created");
      navigate(`/legal/lg/cases/${caseId}`);
    } catch (e: any) { toast.error(e.message); }
    finally { setCheckGateBusy(false); }
  }
  async function doSupervisorDecision() {
    try {
      await m.supervisorDecision.mutateAsync({ decision: supDecision, remarks: supRemarks, actor });
      setSupOpen(false); setSupRemarks("");
      toast.success(`Supervisor decision recorded: ${supDecision}`);
    } catch (e: any) { toast.error(e.message); }
  }
  async function doSubmitInfoRequest() {
    if (!infoForm.recipient.trim() || !infoForm.information_requested.trim())
      return toast.error("Recipient and information are required");
    try {
      await m.createInfoRequest.mutateAsync({
        intake_id: id,
        recipient: infoForm.recipient,
        recipient_type: infoForm.recipient_type,
        department: infoForm.department || null,
        information_requested: infoForm.information_requested,
        reason: infoForm.reason || null,
        due_date: infoForm.due_date || null,
        reminder_date: infoForm.reminder_date || null,
        actor,
      });
      setInfoOpen(false);
      setInfoForm({ recipient: "", recipient_type: "DEPARTMENT", department: "", information_requested: "", reason: "", due_date: "", reminder_date: "" });
      toast.success("Information request created");
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <PageShell title={`Intake ${intake.intake_no}`} subtitle="Qualification workspace">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => navigate("/legal/lg/intake")}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
          <Badge>{intake.qualification_status}</Badge>
          {intake.qualification_result && <Badge variant="outline">{intake.qualification_result}</Badge>}
          <Badge variant="outline">Priority: {intake.priority_code}</Badge>
          <Badge variant="outline">Source: {intake.source_module}</Badge>
          {intake.supervisor_required && <Badge variant="secondary"><ShieldCheck className="h-3 w-3 mr-1" />Supervisor {intake.supervisor_status ?? "REQUIRED"}</Badge>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!readonly && (
            <>
              <Button size="sm" variant="outline" onClick={() => setInfoOpen(true)}><MessageSquare className="h-4 w-4 mr-1" />Request Info</Button>
              <Button size="sm" variant="outline" onClick={openReturn}>Return</Button>
              <Button size="sm" variant="outline" onClick={openReject}><XCircle className="h-4 w-4 mr-1" />Reject</Button>
              {intake.supervisor_required && intake.supervisor_status !== "APPROVED"
                ? <Button size="sm" onClick={doSubmitSupervisor}>Submit for Supervisor</Button>
                : <Button size="sm" onClick={doAccept}><CheckCircle2 className="h-4 w-4 mr-1" />Accept</Button>}
              <Button size="sm" variant="outline" onClick={doEscalate}>Escalate</Button>
            </>
          )}
          {intake.qualification_status === "SUPERVISOR_REVIEW" && isSupervisor && (
            <Button size="sm" onClick={() => setSupOpen(true)}><ShieldCheck className="h-4 w-4 mr-1" />Supervisor Decision</Button>
          )}
          <Button size="sm" variant="default" onClick={doCreateCase} disabled={intake.qualification_status !== "APPROVED" || checkGateBusy}>
            <FileText className="h-4 w-4 mr-1" />Create Legal Case
          </Button>
        </div>
      </div>

      {gateReasons.length > 0 && (
        <Card className="mb-4 border-destructive">
          <CardHeader><CardTitle className="text-destructive">Case creation blocked</CardTitle></CardHeader>
          <CardContent>
            <ul className="list-disc pl-6 text-sm">{gateReasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
          </CardContent>
        </Card>
      )}

      {/* EPIC-03A.1 Decision Summary Panel + alerts (sticky) */}
      {recommendation && readiness && (
        <IntakeDecisionSummaryPanel
          intake={intake}
          recommendation={recommendation}
          readiness={readiness}
          mandatoryTotal={mandatoryTotal}
          mandatoryComplete={mandatoryComplete}
          openInfoCount={openInfo}
          previousLegalCount={(duplicates?.openCases.length ?? 0) + (duplicates?.closedCases.length ?? 0)}
          activeRecoveryCount={duplicates?.recoveries.length ?? 0}
        />
      )}
      {alerts.length > 0 && <div className="mb-3"><OperationalAlertsBadges alerts={alerts} /></div>}

      <Tabs defaultValue="decision">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="decision">Decision Support</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="referral">Referral Details</TabsTrigger>
          <TabsTrigger value="checklist">Qualification Checklist ({mandatoryComplete}/{mandatoryTotal})</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="financial">Financial Assessment</TabsTrigger>
          <TabsTrigger value="legal">Legal Assessment</TabsTrigger>
          <TabsTrigger value="comms">Communications ({openInfo} open)</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        {/* ---------- DECISION SUPPORT ---------- */}
        <TabsContent value="decision" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {readiness && <QualificationReadinessMeter readiness={readiness} />}
            {recommendation && <RecommendationCard rec={recommendation} />}
            <FinancialExposureCard intake={intake} />
            <BusinessContextCard ctx={businessCtx} loading={bcLoading} />
            <DuplicateMatterAnalysisCard data={duplicates} loading={dupLoading} />
            <ReferralSourceContextCard ctx={sourceCtx} loading={scLoading} />
          </div>
        </TabsContent>


        {/* ---------- OVERVIEW ---------- */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <KV k="Intake No" v={intake.intake_no} />
              <KV k="Source Module" v={intake.source_module} />
              <KV k="Source Reference" v={intake.source_reference_no} />
              <KV k="Matter Type" v={intake.matter_type_code} />
              <KV k="Party Type" v={intake.primary_entity_type} />
              <KV k="Party" v={intake.legacy_primary_entity_name ?? intake.primary_entity_id} />
              <KV k="Received" v={formatDateForDisplay(intake.submitted_at)} />
              <KV k="Priority" v={intake.priority_code} />
              <KV k="Urgency" v={intake.urgency} />
              <KV k="Assigned Intake Officer" v={intake.intake_officer_id} />
              <KV k="Supervisor Required" v={intake.supervisor_required ? "Yes" : "No"} />
              <KV k="Supervisor Status" v={intake.supervisor_status} />
              <KV k="Financial Exposure" v={intake.financial_exposure ?? intake.exposure_amount} />
              <KV k="Outstanding" v={intake.financial_outstanding} />
              <KV k="Arrangement Exists" v={intake.arrangement_exists ? "Yes" : "No"} />
              <KV k="Settlement Exists" v={intake.settlement_exists ? "Yes" : "No"} />
            </CardContent>
          </Card>

          {!intake.intake_officer_id && (
            <Card>
              <CardHeader><CardTitle>Assign to me</CardTitle></CardHeader>
              <CardContent>
                <Button size="sm" onClick={() => m.assignOfficer.mutate({ officerId: actor, actor })}>
                  <UserPlus className="h-4 w-4 mr-1" />Take Ownership
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ---------- REFERRAL ---------- */}
        <TabsContent value="referral">
          <Card>
            <CardHeader><CardTitle>Referral Payload</CardTitle></CardHeader>
            <CardContent>
              <pre className="text-xs whitespace-pre-wrap max-h-[420px] overflow-auto bg-muted p-3 rounded">
                {JSON.stringify((intake as any).payload ?? {}, null, 2)}
              </pre>
              <div className="text-sm text-muted-foreground mt-2">Summary: {intake.summary ?? "—"}</div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- CHECKLIST ---------- */}
        <TabsContent value="checklist">
          <Card>
            <CardHeader><CardTitle>Qualification Checklist</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {checklist.length === 0 && <div className="text-muted-foreground text-sm">No checklist template configured.</div>}
              {checklist.map(({ template: t, response: r }) => (
                <div key={t.id} className="flex items-start gap-3 border-b py-2">
                  <Checkbox
                    disabled={readonly}
                    checked={r?.status === "COMPLETE" || r?.status === "NA"}
                    onCheckedChange={(v) => m.checklistUpsert.mutate({
                      templateItemId: t.id,
                      patch: { status: v ? "COMPLETE" : "PENDING" },
                      actor,
                    })}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {t.label} {t.mandatory && <Badge variant="destructive" className="ml-1">Mandatory</Badge>}
                      <span className="ml-2 text-xs text-muted-foreground">{t.category}</span>
                    </div>
                    {r?.completed_at && (
                      <div className="text-xs text-muted-foreground">Completed {formatDateForDisplay(r.completed_at)} by {r.completed_by ?? "—"}</div>
                    )}
                    <Input
                      className="mt-1 text-xs"
                      placeholder="Remarks"
                      disabled={readonly}
                      defaultValue={r?.remarks ?? ""}
                      onBlur={(e) => {
                        if (e.target.value !== (r?.remarks ?? ""))
                          m.checklistUpsert.mutate({ templateItemId: t.id, patch: { remarks: e.target.value, status: r?.status ?? "PENDING" }, actor });
                      }}
                    />
                  </div>
                  <Select
                    value={r?.status ?? "PENDING"}
                    disabled={readonly}
                    onValueChange={(v) => m.checklistUpsert.mutate({ templateItemId: t.id, patch: { status: v as any }, actor })}
                  >
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="COMPLETE">Complete</SelectItem>
                      <SelectItem value="NA">N/A</SelectItem>
                      <SelectItem value="FAILED">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- DOCUMENTS ---------- */}
        <TabsContent value="documents">
          <Card>
            <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Referral document links flow through from the source module. Attach further Intake documents from the Referral Details tab once the referral packet is loaded.
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- FINANCIAL ---------- */}
        <TabsContent value="financial">
          <Card>
            <CardHeader><CardTitle>Financial Assessment</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                ["financial_principal", "Principal"],
                ["financial_interest", "Interest"],
                ["financial_penalty", "Penalty"],
                ["financial_court_cost", "Court Cost"],
                ["financial_legal_cost", "Legal Cost"],
                ["financial_previous_recovery", "Previous Recoveries"],
                ["financial_estimated_recovery", "Estimated Recovery"],
                ["financial_estimated_pct", "Estimated Recovery %"],
                ["financial_outstanding", "Outstanding"],
                ["financial_exposure", "Total Exposure"],
              ].map(([field, label]) => (
                <div key={field}>
                  <Label>{label}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    disabled={readonly}
                    defaultValue={(intake as any)[field] ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value === "" ? null : Number(e.target.value);
                      if (v !== (intake as any)[field])
                        m.updateIntake.mutate({ patch: { [field]: v as any } as any, actor });
                    }}
                  />
                </div>
              ))}
              <div className="flex items-center gap-4 col-span-full">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    disabled={readonly}
                    checked={intake.arrangement_exists}
                    onCheckedChange={(v) => m.updateIntake.mutate({ patch: { arrangement_exists: !!v }, actor })}
                  />
                  Payment Arrangement Exists
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    disabled={readonly}
                    checked={intake.settlement_exists}
                    onCheckedChange={(v) => m.updateIntake.mutate({ patch: { settlement_exists: !!v }, actor })}
                  />
                  Settlement Exists
                </label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- LEGAL ---------- */}
        <TabsContent value="legal">
          <Card>
            <CardHeader><CardTitle>Legal Assessment</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Legal Issue" value={intake.legal_issue ?? ""} onSave={(v) => m.updateIntake.mutate({ patch: { legal_issue: v }, actor })} disabled={readonly} textarea />
              <Field label="Legal Basis" value={intake.legal_basis ?? ""} onSave={(v) => m.updateIntake.mutate({ patch: { legal_basis: v }, actor })} disabled={readonly} textarea />
              <Field label="Recovery Type" value={intake.recovery_type ?? ""} onSave={(v) => m.updateIntake.mutate({ patch: { recovery_type: v }, actor })} disabled={readonly} />
              <Field label="Recommended Path" value={intake.recommended_path ?? ""} onSave={(v) => m.updateIntake.mutate({ patch: { recommended_path: v }, actor })} disabled={readonly} />
              <Field label="Risk Level" value={intake.risk_level ?? ""} onSave={(v) => m.updateIntake.mutate({ patch: { risk_level: v }, actor })} disabled={readonly} />
              <Field label="Complexity" value={intake.complexity ?? ""} onSave={(v) => m.updateIntake.mutate({ patch: { complexity: v }, actor })} disabled={readonly} />
              <Field label="Urgency" value={intake.urgency ?? ""} onSave={(v) => m.updateIntake.mutate({ patch: { urgency: v }, actor })} disabled={readonly} />
              <Field label="Recommended Team" value={intake.recommended_team_code ?? ""} onSave={(v) => m.updateIntake.mutate({ patch: { recommended_team_code: v }, actor })} disabled={readonly} />
              <Field label="Recommended Officer" value={intake.recommended_officer_id ?? ""} onSave={(v) => m.updateIntake.mutate({ patch: { recommended_officer_id: v }, actor })} disabled={readonly} />
              <div className="col-span-full flex items-center gap-2">
                <Checkbox
                  disabled={readonly}
                  checked={intake.supervisor_required}
                  onCheckedChange={(v) => m.updateIntake.mutate({ patch: { supervisor_required: !!v }, actor })}
                />
                <Label>Supervisor Approval Required</Label>
              </div>
              <Field label="Internal Remarks" value={intake.internal_remarks ?? ""} onSave={(v) => m.updateIntake.mutate({ patch: { internal_remarks: v }, actor })} disabled={readonly} textarea className="col-span-full" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- COMMS ---------- */}
        <TabsContent value="comms">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Information Requests</span>
                <Button size="sm" onClick={() => setInfoOpen(true)} disabled={readonly}><Send className="h-4 w-4 mr-1" />New Request</Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {infoRequests.length === 0 && <div className="text-sm text-muted-foreground">No requests yet.</div>}
              {infoRequests.map((r) => (
                <div key={r.id} className="border rounded p-3">
                  <div className="flex justify-between text-sm">
                    <div className="font-medium">{r.recipient} <Badge variant="outline" className="ml-2">{r.status}</Badge></div>
                    <div className="text-xs text-muted-foreground">{formatDateForDisplay(r.requested_at)}</div>
                  </div>
                  <div className="text-sm mt-1">{r.information_requested}</div>
                  {r.reason && <div className="text-xs text-muted-foreground">Reason: {r.reason}</div>}
                  {r.due_date && <div className="text-xs">Due: {formatDateForDisplay(r.due_date)}</div>}
                  {r.status === "OPEN" && !readonly && (
                    <RespondBlock onSubmit={(text) => m.respondInfoRequest.mutate({ requestId: r.id, responseText: text, actor })} />
                  )}
                  {r.response_text && (
                    <div className="text-sm mt-2 p-2 bg-muted rounded">
                      <div className="text-xs text-muted-foreground">Responded {formatDateForDisplay(r.response_received_at!)}</div>
                      {r.response_text}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- TIMELINE ---------- */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
            <CardContent>
              {audit.length === 0 && <div className="text-sm text-muted-foreground">No events yet.</div>}
              <ol className="border-l pl-4 space-y-3">
                {audit.map((a) => (
                  <li key={a.id} className="text-sm">
                    <div className="font-medium">{a.action}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateForDisplay(a.performed_at)} · {a.actor ?? "system"}
                    </div>
                    {a.remarks && <div className="text-xs mt-1">{a.remarks}</div>}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- AUDIT ---------- */}
        <TabsContent value="audit">
          <Card>
            <CardHeader><CardTitle>Audit Trail</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <table className="w-full text-xs">
                  <thead className="text-left border-b">
                    <tr><th className="py-1">When</th><th>Actor</th><th>Action</th><th>Remarks</th></tr>
                  </thead>
                  <tbody>
                    {audit.map((a) => (
                      <tr key={a.id} className="border-b">
                        <td className="py-1">{formatDateForDisplay(a.performed_at)}</td>
                        <td>{a.actor ?? "system"}</td>
                        <td>{a.action}</td>
                        <td>{a.remarks ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ------- DIALOGS ------- */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Intake</DialogTitle><DialogDescription>This will close the intake and prevent case creation.</DialogDescription></DialogHeader>
          <Textarea placeholder="Rejection reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={doReject}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Return Intake</DialogTitle><DialogDescription>Return to submitter for corrections.</DialogDescription></DialogHeader>
          <Textarea placeholder="Return reason" value={returnReason} onChange={(e) => setReturnReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnOpen(false)}>Cancel</Button>
            <Button onClick={doReturn}>Return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Request Information</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Input placeholder="Recipient" value={infoForm.recipient} onChange={(e) => setInfoForm({ ...infoForm, recipient: e.target.value })} />
            <Input placeholder="Department" value={infoForm.department} onChange={(e) => setInfoForm({ ...infoForm, department: e.target.value })} />
            <Select value={infoForm.recipient_type} onValueChange={(v) => setInfoForm({ ...infoForm, recipient_type: v })}>
              <SelectTrigger><SelectValue placeholder="Recipient type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DEPARTMENT">Internal Department</SelectItem>
                <SelectItem value="OFFICER">Individual Officer</SelectItem>
                <SelectItem value="EXTERNAL">External Party</SelectItem>
              </SelectContent>
            </Select>
            <Textarea placeholder="Information requested" value={infoForm.information_requested} onChange={(e) => setInfoForm({ ...infoForm, information_requested: e.target.value })} />
            <Textarea placeholder="Reason" value={infoForm.reason} onChange={(e) => setInfoForm({ ...infoForm, reason: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Due Date</Label><Input type="date" value={infoForm.due_date} onChange={(e) => setInfoForm({ ...infoForm, due_date: e.target.value })} /></div>
              <div><Label>Reminder</Label><Input type="date" value={infoForm.reminder_date} onChange={(e) => setInfoForm({ ...infoForm, reminder_date: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInfoOpen(false)}>Cancel</Button>
            <Button onClick={doSubmitInfoRequest}>Send Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={supOpen} onOpenChange={setSupOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Supervisor Decision</DialogTitle></DialogHeader>
          <Select value={supDecision} onValueChange={(v) => setSupDecision(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="APPROVED">Approve</SelectItem>
              <SelectItem value="REJECTED">Reject</SelectItem>
              <SelectItem value="RETURNED">Return</SelectItem>
            </SelectContent>
          </Select>
          <Textarea placeholder="Remarks" value={supRemarks} onChange={(e) => setSupRemarks(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupOpen(false)}>Cancel</Button>
            <Button onClick={doSupervisorDecision}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function KV({ k, v }: { k: string; v: any }) {
  return <div><div className="text-xs text-muted-foreground">{k}</div><div className="text-sm">{v ?? "—"}</div></div>;
}

function Field({ label, value, onSave, disabled, textarea, className }: {
  label: string; value: string; onSave: (v: string) => void; disabled?: boolean; textarea?: boolean; className?: string;
}) {
  const [v, setV] = useState(value);
  const Comp: any = textarea ? Textarea : Input;
  return (
    <div className={className}>
      <Label>{label}</Label>
      <Comp value={v} disabled={disabled} onChange={(e: any) => setV(e.target.value)} onBlur={() => { if (v !== value) onSave(v); }} />
    </div>
  );
}

function RespondBlock({ onSubmit }: { onSubmit: (v: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="mt-2 flex gap-2">
      <Input placeholder="Enter response" value={v} onChange={(e) => setV(e.target.value)} />
      <Button size="sm" onClick={() => { if (v.trim()) { onSubmit(v); setV(""); } }}>Save Response</Button>
    </div>
  );
}
