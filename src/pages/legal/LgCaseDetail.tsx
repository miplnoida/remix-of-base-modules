import React, { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, AlertTriangle, ShieldCheck, Lock, Plus, UserCheck, CheckCircle2, Gavel, Pencil, LayoutGrid, Briefcase, Scale, Banknote, FileText, BookOpen } from "lucide-react";
import { useLgCase } from "@/hooks/legal/useLgCases";
import EntityLegalReferenceManager from "@/components/legal-reference/EntityLegalReferenceManager";
import { useLgDocumentLinks } from "@/hooks/legal/useLgTemplates";
import {
  useLgArrangementLinks,
  useArrangementSummary,
  useLgFeeCharges,
  useLegalFeeHeads,
  useCreateAndPostLegalFee,
  useDetectArrangementDefaults,
} from "@/hooks/legal/useLgFinancials";
import { useCompleteLgTask } from "@/hooks/legal/useLgWorkflow";
import { useLgAccess } from "@/hooks/legal/useLgAccess";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { logLgActivity, listLgActivity } from "@/services/legal/lgAuditService";
import { useToast } from "@/hooks/use-toast";
import { useUserCode } from "@/hooks/useUserCode";
import { HearingOutcomeDialog } from "@/components/legal/HearingOutcomeDialog";
import { AddPartyDialog } from "@/components/legal/lg/AddPartyDialog";
import { LinkDocumentDialog } from "@/components/legal/lg/LinkDocumentDialog";
import { AddSettlementDialog } from "@/components/legal/lg/AddSettlementDialog";
import { AddOrderDialog } from "@/components/legal/lg/AddOrderDialog";
import { LinkArrangementDialog } from "@/components/legal/lg/LinkArrangementDialog";
import { AddTaskDialog } from "@/components/legal/lg/AddTaskDialog";
import { GenerateNoticeDialog } from "@/components/legal/lg/GenerateNoticeDialog";
import { AssignOfficerDialog } from "@/components/legal/lg/AssignOfficerDialog";
import CaseFeesTab from "@/components/legal/lg/CaseFeesTab";
import LegalCaseDocumentsTab from "@/components/legal/lg/LegalCaseDocumentsTab";
import { AvailableLettersPanel } from "@/components/legal/lg/AvailableLettersPanel";
import { GeneratedLettersHistoryPanel } from "@/components/legal/lg/GeneratedLettersHistoryPanel";
import { CaseHistoryTimeline } from "@/components/legal/lg/CaseHistoryTimeline";
import CaseCourtProceedingsTab from "@/components/legal/lg/CaseCourtProceedingsTab";
import LegalCasePaymentArrangementsPanel from "@/components/legal/lg/LegalCasePaymentArrangementsPanel";
import CaseActionsPanel from "@/components/legal/lg/actions/CaseActionsPanel";
import { useLgCaseActions } from "@/hooks/legal/useLgCaseActions";

import AssignmentHistoryPanel from "@/components/legal/AssignmentHistoryPanel";
import ReassignCaseDialog from "@/components/legal/ReassignCaseDialog";
import { useMissingRequiredForCase } from "@/hooks/legal/useLgStageTemplates";
import { autoApplyForEvent } from "@/services/legal/lgFeeEngineService";


const sb = supabase as any;

function StatBadge({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border rounded p-2 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function useLgList<T = any>(table: string, caseId: string | undefined, orderBy: string, ascending = false) {
  return useQuery<T[]>({
    queryKey: [table, caseId],
    enabled: !!caseId,
    queryFn: async () => {
      const { data, error } = await sb.from(table).select("*").eq("lg_case_id", caseId).order(orderBy, { ascending });
      if (error) throw error;
      return data ?? [];
    },
  });
}

const LgCaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, isAuthReady, isAuthenticated } = useSupabaseAuth();
  const access = useLgAccess();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { userCode } = useUserCode();
  const { data: caseData, isLoading, error } = useLgCase(id);

  // ----- dialog state -----
  const [assignOpen, setAssignOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [partyOpen, setPartyOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [hearingOpen, setHearingOpen] = useState(false);
  const [hearingMode, setHearingMode] = useState<"create" | "outcome">("create");
  const [selectedHearing, setSelectedHearing] = useState<any | null>(null);
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [arrangementOpen, setArrangementOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [closureReason, setClosureReason] = useState("");
  const [group, setGroup] = useState<"overview" | "work" | "litigation" | "recovery" | "docs" | "governance">("overview");
  const [sub, setSub] = useState<string>("summary");
  React.useEffect(() => {
    const defaults: Record<string, string> = {
      overview: "summary", work: "actions", litigation: "proceedings",
      recovery: "arrangement", docs: "documents", governance: "history",
    };
    setSub(defaults[group]);
  }, [group]);

  // ----- tab data sources -----
  const parties = useLgList("lg_case_party", id, "created_at");
  const referrals = useLgList("lg_case_referral", id, "created_at");
  const documents = useLgDocumentLinks(id);
  const hearings = useLgList("lg_hearing", id, "hearing_date");
  const notices = useLgList("lg_notice", id, "created_at");
  const arrangementLinks = useLgArrangementLinks(id);
  const primaryArrangementId = arrangementLinks.data?.[0]?.payment_arrangement_id;
  const arrangementSummary = useArrangementSummary(primaryArrangementId);
  const fees = useLgFeeCharges(id);
  const orders = useLgList("lg_order", id, "issued_date");
  const settlements = useLgList("lg_settlement", id, "proposed_at");
  const tasks = useLgList("lg_case_task", id, "created_at");
  const activity = useQuery({
    queryKey: ["lg_case_activity", id],
    enabled: !!id,
    queryFn: () => listLgActivity(id as string),
  });
  const missingRequired = useMissingRequiredForCase(id, caseData?.current_stage_code ?? null);
  const childActions = useLgCaseActions(id);
  const openChildActions = (childActions.data ?? []).filter(
    (a) => a.status !== "CLOSED" && a.status !== "WITHDRAWN",
  );
  const canCloseParent = openChildActions.length === 0;

  // ----- fee posting -----
  const feeHeads = useLegalFeeHeads();
  const postFee = useCreateAndPostLegalFee();
  const [feeForm, setFeeForm] = useState({ head: "", amount: "", reason: "" });

  const detectDefaults = useDetectArrangementDefaults();
  const completeTask = useCompleteLgTask();

  // ----- stage change -----
  const stageChange = useMutation({
    mutationFn: async (newStage: string) => {
      const prev = caseData?.current_stage_code;
      const { error } = await sb.from("lg_case").update({ current_stage_code: newStage }).eq("id", id);
      if (error) throw error;
      await sb.from("lg_case_stage_history").insert({
        lg_case_id: id, from_stage_code: prev, to_stage_code: newStage, changed_by: profile?.user_code ?? null,
      });
      await logLgActivity({
        lg_case_id: id!, activity_type: "STAGE_CHANGED",
        description: `${prev ?? "—"} → ${newStage}`,
        performed_by: profile?.user_code ?? null,
      });
      // Auto-apply any fee rules tied to this stage event (idempotent)
      try { await autoApplyForEvent(id!, `STAGE_${newStage}`, profile?.user_code ?? null); } catch (e) { /* non-blocking */ }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lg_case"] });
      qc.invalidateQueries({ queryKey: ["lg_case_activity", id] });
      qc.invalidateQueries({ queryKey: ["lg_fee_charge", id] });
      toast({ title: "Stage updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const closeCase = useMutation({
    mutationFn: async (reason: string) => {
      const { error } = await sb.from("lg_case").update({
        status_code: "CLOSED", current_stage_code: "CLOSED",
        closed_date: new Date().toISOString().slice(0, 10),
        closure_reason: reason,
        closed_by: profile?.user_code ?? null,
      }).eq("id", id);
      if (error) throw error;
      await logLgActivity({ lg_case_id: id!, activity_type: "CASE_CLOSED", description: reason, performed_by: profile?.user_code ?? null });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lg_case"] });
      qc.invalidateQueries({ queryKey: ["lg_case_activity", id] });
      setCloseOpen(false);
      setClosureReason("");
      toast({ title: "Case closed" });
    },
  });

  const handlePostFee = async () => {
    if (!access.can("postFee")) return;
    const amount = Number(feeForm.amount);
    const head = feeHeads.data?.find((h) => h.id === feeForm.head);
    if (!head || !(amount > 0) || !caseData?.employer_id) {
      toast({ title: "Validation", description: "Pick a fee head, enter an amount, and ensure the case has an employer.", variant: "destructive" });
      return;
    }
    try {
      const { data: er } = await sb.from("au_er_master").select("er_no, er_name").eq("id", caseData.employer_id).maybeSingle();
      const charge = await postFee.mutateAsync({
        lg_case_id: id!,
        fee_head_ref_id: head.id,
        fee_head_code: head.code,
        amount,
        charge_reason: feeForm.reason,
        employer_id: er?.er_no ?? caseData.employer_id,
        employer_name: er?.er_name ?? null,
        employer_account_id: caseData.employer_account_id ?? null,
        created_by: profile?.user_code ?? null,
      });
      await logLgActivity({
        lg_case_id: id!, activity_type: "FEE_POSTED",
        description: `${head.code} posted (invoice #${charge.employer_account_transaction_id})`,
        performed_by: profile?.user_code ?? null,
        payload: { fee_charge_id: charge.id, amount, code: head.code },
      });
      setFeeForm({ head: "", amount: "", reason: "" });
      qc.invalidateQueries({ queryKey: ["lg_case_activity", id] });
      toast({ title: "Fee posted to employer account" });
    } catch (e: any) {
      toast({ title: "Posting failed", description: e.message, variant: "destructive" });
    }
  };

  // ----- guards -----
  if (!isAuthReady || !isAuthenticated) {
    return (
      <div className="p-8 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking access…
      </div>
    );
  }
  if (!access.hasLegalAccess) {
    return (
      <div className="min-h-screen p-8 max-w-3xl mx-auto">
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertDescription>You do not have access to the Legal module.</AlertDescription>
        </Alert>
      </div>
    );
  }
  if (isLoading) {
    return <div className="p-8 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading case…</div>;
  }
  if (error || !caseData) {
    return <div className="p-8 text-destructive">Case not found.</div>;
  }

  const stageOptions = ["REFERRAL_RECEIVED","LEGAL_REVIEW","DEMAND_NOTICE","SETTLEMENT_NEGOTIATION","COURT_FILING","HEARING","JUDGMENT","ENFORCEMENT","CLOSED"];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/legal/lg/cases")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Cases
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{caseData.lg_case_no}</h1>
              <p className="text-sm text-muted-foreground">{caseData.summary || caseData.case_type_code}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="gap-1"><ShieldCheck className="h-3 w-3" /> {access.isAdmin ? "Admin" : access.roles.join(", ") || "—"}</Badge>
            <Badge>{caseData.status_code}</Badge>
            <Badge variant="secondary">{caseData.current_stage_code}</Badge>
            <Badge variant={caseData.priority_code === "HIGH" || caseData.priority_code === "URGENT" ? "destructive" : "outline"}>{caseData.priority_code}</Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAssignOpen(true)}
              disabled={!access.can("assignOfficer")}
              title={!access.can("assignOfficer") ? "You do not have permission to assign officers" : undefined}
            >
              <UserCheck className="h-4 w-4 mr-1" /> Assign Officer
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setReassignOpen(true)}
              disabled={!access.can("assignOfficer")}
            >
              Reassign / Re-route
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8"
              onClick={() => navigate(`/legal/case-edit/${id}`)}
              disabled={!access.can("editCase")}
              title={!access.can("editCase") ? "Read-only role" : "Edit case"}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatBadge label="Court Case" value={caseData.court_case_no || "—"} />
          <StatBadge label="Claim Amount" value={caseData.claim_amount ? Number(caseData.claim_amount).toFixed(2) : "—"} />
          <StatBadge label="Outstanding" value={caseData.outstanding_amount_snapshot ? Number(caseData.outstanding_amount_snapshot).toFixed(2) : "—"} />
          <StatBadge label="Next Hearing" value={caseData.next_hearing_date || "—"} />
          <StatBadge label="Opened" value={caseData.opened_date} />
        </div>

        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="parties">Parties ({parties.data?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="referral">Compliance Referral</TabsTrigger>
            <TabsTrigger value="documents">Documents ({documents.data?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="actions">Actions ({childActions.data?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="hearings">Hearings ({hearings.data?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="proceedings">Court Proceedings</TabsTrigger>

            <TabsTrigger value="notices">Notices ({notices.data?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="arrangement">Payment Arrangement</TabsTrigger>
            <TabsTrigger value="fees">Fees ({fees.data?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="orders">Orders ({orders.data?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="settlements">Settlements ({settlements.data?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="tasks">Tasks ({tasks.data?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="letters">Letters</TabsTrigger>
            <TabsTrigger value="legalrefs">Legal Refs</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Summary */}
          <TabsContent value="summary">
            {(missingRequired.data?.length ?? 0) > 0 && (
              <Alert variant="destructive" className="mb-3">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Missing required letters for {caseData.current_stage_code}:</strong>{" "}
                  {missingRequired.data!.map((m) => m.code).join(", ")}.{" "}
                  Open the <em>Letters</em> tab to generate them.
                </AlertDescription>
              </Alert>
            )}
            <Card>
              <CardHeader><CardTitle>Case Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Type:</span> {caseData.case_type_code}</div>
                  <div><span className="text-muted-foreground">Stage:</span> {caseData.current_stage_code}</div>
                  <div><span className="text-muted-foreground">Court:</span> {caseData.court_name || "—"}{caseData.court_code ? ` (${caseData.court_code})` : ""}</div>
                  <div><span className="text-muted-foreground">Court Ref No.:</span> {caseData.court_case_no || "—"}</div>
                  <div><span className="text-muted-foreground">Division:</span> {caseData.court_division_code || "—"}</div>
                  <div><span className="text-muted-foreground">Venue:</span> {caseData.court_venue_code || "—"}</div>
                  <div><span className="text-muted-foreground">Presiding Officer:</span> {caseData.presiding_officer_code || "—"}</div>
                  <div><span className="text-muted-foreground">Officer:</span> {caseData.assigned_legal_officer_id || "—"}</div>
                  <div className="md:col-span-2"><span className="text-muted-foreground">Next Action:</span> {caseData.next_action || "—"} {caseData.next_action_due_date ? `(due ${caseData.next_action_due_date})` : ""}</div>
                </div>

                <Separator />
                <div className="space-y-2">
                  <div className="text-sm font-medium">Change stage</div>
                  <div className="flex flex-wrap gap-2">
                    {stageOptions.map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={s === caseData.current_stage_code ? "default" : "outline"}
                        disabled={!access.can("changeStage") || s === caseData.current_stage_code || stageChange.isPending}
                        onClick={() => stageChange.mutate(s)}
                      >{s}</Button>
                    ))}
                  </div>
                  {!access.can("changeStage") && <p className="text-xs text-muted-foreground">Read-only role — stage changes disabled.</p>}
                </div>
                {caseData.status_code !== "CLOSED" && (
                  <div>
                    <Button
                      variant="destructive"
                      disabled={!access.can("closeCase") || closeCase.isPending || !canCloseParent}
                      onClick={() => setCloseOpen(true)}
                      title={!canCloseParent ? `Close all ${openChildActions.length} open action(s) first` : undefined}
                    >
                      Close Case
                    </Button>
                    {!canCloseParent && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {openChildActions.length} action(s) still open — close them in the Actions tab first.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Parties */}
          <TabsContent value="parties">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Parties</CardTitle>
                  <Button size="sm" onClick={() => setPartyOpen(true)} disabled={!access.can("editCase")} title={!access.can("editCase") ? "Read-only role" : undefined}>
                    <Plus className="h-4 w-4 mr-1" /> Add Party
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {parties.data?.length ? (
                  <div className="space-y-2">
                    {parties.data.map((p: any) => (
                      <div key={p.id} className="border rounded p-3 flex justify-between">
                        <div><div className="font-medium">{p.display_name}</div><div className="text-xs text-muted-foreground">{p.party_role} · {p.party_type}</div></div>
                        <div className="text-xs text-muted-foreground">{p.representative_name || ""}</div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">No parties recorded.</p>}
              </CardContent>
            </Card>
          </TabsContent>


          {/* Referral */}
          <TabsContent value="referral">
            <Card><CardContent className="pt-6 space-y-3">
              <div className="text-sm"><span className="text-muted-foreground">Compliance Case:</span> {caseData.compliance_case_id ? <Link className="underline" to={`/compliance/cases/${caseData.compliance_case_id}`}>{caseData.compliance_case_id.slice(0, 8)}</Link> : "—"}</div>
              <div className="text-sm"><span className="text-muted-foreground">Referral Record:</span> {caseData.compliance_referral_id ?? "—"}</div>
              <Separator />
              {referrals.data?.length ? referrals.data.map((r: any) => (
                <div key={r.id} className="border rounded p-3 text-sm">
                  <div className="font-medium">{r.referral_type_code || "Referral"}</div>
                  <div className="text-xs text-muted-foreground">{r.referred_at ?? r.created_at}</div>
                  <div className="mt-1">{r.referral_reason || "—"}</div>
                </div>
              )) : <p className="text-sm text-muted-foreground">No referral metadata.</p>}
            </CardContent></Card>
          </TabsContent>

          {/* Documents */}
          <TabsContent value="documents">
            {id && (
              <LegalCaseDocumentsTab
                lgCaseId={id}
                currentStageCode={caseData.current_stage_code ?? null}
                caseTypeCode={caseData.case_type_code ?? null}
                canEdit={!!access.can("linkDocument")}
              />
            )}
          </TabsContent>



          {/* Liability / Benefit Actions */}
          <TabsContent value="actions">
            <CaseActionsPanel caseId={id!} caseData={caseData} canEdit={access.can("editCase")} />
          </TabsContent>

          {/* Hearings */}
          <TabsContent value="hearings">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Hearings</CardTitle>
                  <Button size="sm" onClick={() => { setSelectedHearing(null); setHearingMode("create"); setHearingOpen(true); }} disabled={!access.can("addHearing")} title={!access.can("addHearing") ? "Read-only role" : undefined}>
                    <Plus className="h-4 w-4 mr-1" /> Add Hearing
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {hearings.data?.length ? (
                  <div className="space-y-2">
                    {hearings.data.map((h: any) => (
                      <div key={h.id} className="border rounded p-3 text-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{h.hearing_type_code} · {h.hearing_date}{h.hearing_time ? ` ${h.hearing_time}` : ""}</div>
                            <div className="text-xs text-muted-foreground">{h.court_name} {h.court_room ? `· Rm ${h.court_room}` : ""}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{h.outcome_code || h.status || "Pending"}</Badge>
                            {h.status !== "COMPLETED" && (
                              <Button size="sm" variant="ghost" disabled={!access.can("recordHearingOutcome")} onClick={() => { setSelectedHearing(h); setHearingMode("outcome"); setHearingOpen(true); }}>
                                <Gavel className="h-4 w-4 mr-1" /> Outcome
                              </Button>
                            )}
                          </div>
                        </div>
                        {h.minutes && <div className="mt-1">{h.minutes}</div>}
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">No hearings scheduled.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Court Proceedings */}
          <TabsContent value="proceedings">
            <CaseCourtProceedingsTab
              caseId={id!}
              defaultCourtCode={caseData.court_code}
              defaultDivisionCode={caseData.court_division_code}
              defaultVenueCode={caseData.court_venue_code}
              defaultOfficerCode={caseData.presiding_officer_code}
            />
          </TabsContent>

          {/* Notices */}

          <TabsContent value="notices">
            <Card><CardHeader>
              <div className="flex justify-between items-center">
                <div><CardTitle>Notices</CardTitle><CardDescription>Generated from central templates.</CardDescription></div>
                <Button size="sm" disabled={!access.can("generateNotice")} onClick={() => setNoticeOpen(true)}>Generate</Button>
              </div>
            </CardHeader><CardContent>
              {notices.data?.length ? (
                <div className="space-y-2">
                  {notices.data.map((n: any) => (
                    <div key={n.id} className="border rounded p-3 text-sm">
                      <div className="flex justify-between"><div className="font-medium">{n.notice_no} · {n.notice_type_code}</div><Badge>{n.status}</Badge></div>
                      <div className="text-xs text-muted-foreground">{n.delivery_channel ?? "—"} · issued {n.issued_date ?? "—"}</div>
                      {n.subject && <div className="mt-1">{n.subject}</div>}
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No notices issued.</p>}
            </CardContent></Card>
          </TabsContent>

          {/* Arrangement */}
          <TabsContent value="arrangement">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center gap-2 flex-wrap">
                  <div>
                    <CardTitle>Payment Arrangements</CardTitle>
                    <CardDescription>
                      Cross-module view — Compliance / Legal / Benefits / Finance. Legal can continue, supersede, or create
                      a new arrangement (pre-court, court-ordered, or post-judgment) against the same debtor and liabilities.
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={!id || detectDefaults.isPending} onClick={() => detectDefaults.mutate(id!)}>
                      Re-check legacy defaults
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setArrangementOpen(true)} disabled={!access.can("editCase")}>
                      <Plus className="h-4 w-4 mr-1" /> Link Legacy Arrangement
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Central cross-module panel (core_payment_arrangement) */}
                <LegalCasePaymentArrangementsPanel
                  lgCaseId={id!}
                  employerId={caseData.employer_id ?? null}
                  employerName={(caseData as any).employer_name ?? null}
                  legalActionId={null}
                  canEdit={access.can("editCase")}
                />

                {/* Legacy compliance arrangement links (preserved for backward compatibility) */}
                {arrangementLinks.data?.length ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Legacy Compliance Arrangement Links</CardTitle>
                      <CardDescription>Pre-existing references to ce_payment_arrangements. Will be migrated as data is moved to the central model.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {arrangementLinks.data.map((l) => (
                        <div key={l.id} className="border rounded p-3 text-sm">
                          <div className="flex justify-between">
                            <div className="font-medium">Arrangement {l.payment_arrangement_id.slice(0, 8)} <span className="text-xs text-muted-foreground">({l.link_type} · {l.source_module})</span></div>
                            {l.default_monitoring_required && <Badge variant="outline">Default monitored</Badge>}
                          </div>
                          {l.link_reason && <div className="text-xs text-muted-foreground mt-1">{l.link_reason}</div>}
                        </div>
                      ))}
                      {arrangementSummary.data && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <StatBadge label="Total Debt" value={arrangementSummary.data.totals.total_debt.toFixed(2)} />
                          <StatBadge label="Paid" value={arrangementSummary.data.totals.total_paid.toFixed(2)} />
                          <StatBadge label="Outstanding" value={arrangementSummary.data.totals.outstanding.toFixed(2)} />
                          <StatBadge label="Installments" value={`${arrangementSummary.data.totals.installments_paid}/${arrangementSummary.data.totals.installments_total}`} />
                          {arrangementSummary.data.totals.is_defaulted && (
                            <div className="md:col-span-4">
                              <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>Legacy arrangement is in default — {arrangementSummary.data.totals.installments_overdue} overdue installment(s).</AlertDescription>
                              </Alert>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>


          {/* Fees */}
          <TabsContent value="fees">
            {id && <CaseFeesTab lgCaseId={id} caseTypeCode={caseData.case_type_code} />}
          </TabsContent>


          {/* Orders */}
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Orders / Judgments</CardTitle>
                  <Button size="sm" onClick={() => setOrderOpen(true)} disabled={!access.can("createOrder")} title={!access.can("createOrder") ? "Read-only role" : undefined}>
                    <Plus className="h-4 w-4 mr-1" /> Add Order
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {orders.data?.length ? (
                  <div className="space-y-2">
                    {orders.data.map((o: any) => (
                      <div key={o.id} className="border rounded p-3 text-sm">
                        <div className="flex justify-between"><div className="font-medium">{o.order_no} · {o.order_type_code}</div><Badge>{o.status}</Badge></div>
                        <div className="text-xs text-muted-foreground">{o.issued_by_court || "—"} · {o.issued_date || "—"}</div>
                        {o.ordered_amount && <div>Amount: {Number(o.ordered_amount).toFixed(2)}</div>}
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">No orders.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settlements */}
          <TabsContent value="settlements">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Settlements</CardTitle>
                  <Button size="sm" onClick={() => setSettlementOpen(true)} disabled={!access.can("createSettlement")} title={!access.can("createSettlement") ? "Read-only role" : undefined}>
                    <Plus className="h-4 w-4 mr-1" /> Propose Settlement
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {settlements.data?.length ? (
                  <div className="space-y-2">
                    {settlements.data.map((s: any) => (
                      <div key={s.id} className="border rounded p-3 text-sm">
                        <div className="flex justify-between"><div className="font-medium">Proposed {s.proposed_amount ?? "—"} → Agreed {s.agreed_amount ?? "—"}</div><Badge>{s.status}</Badge></div>
                        <div className="text-xs text-muted-foreground">{s.currency_code} · {s.proposed_at}</div>
                        {s.terms && <div className="mt-1">{s.terms}</div>}
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">No settlements.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks */}
          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Tasks</CardTitle>
                  <Button size="sm" onClick={() => setTaskOpen(true)} disabled={!access.can("editCase")} title={!access.can("editCase") ? "Read-only role" : undefined}>
                    <Plus className="h-4 w-4 mr-1" /> Add Task
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {tasks.data?.length ? (
                  <div className="space-y-2">
                    {tasks.data.map((t: any) => (
                      <div key={t.id} className="border rounded p-3 text-sm">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <div className="font-medium">{t.title}</div>
                            <div className="text-xs text-muted-foreground">{t.task_type_code} · {t.priority_code} · due {t.due_date ?? "—"}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={t.status === "COMPLETED" || t.status === "DONE" ? "default" : "outline"}>{t.status}</Badge>
                            {t.status !== "COMPLETED" && t.status !== "DONE" && (
                              <Button size="sm" variant="ghost" disabled={completeTask.isPending} onClick={async () => {
                                try {
                                  await completeTask.mutateAsync({ id: t.id, userCode: userCode ?? null });
                                  await logLgActivity({ lg_case_id: id!, activity_type: "TASK_COMPLETED", description: t.title, performed_by: userCode ?? null });
                                  qc.invalidateQueries({ queryKey: ["lg_case_task", id] });
                                  qc.invalidateQueries({ queryKey: ["lg_case_activity", id] });
                                  toast({ title: "Task completed" });
                                } catch (e: any) {
                                  toast({ title: "Failed", description: e.message, variant: "destructive" });
                                }
                              }}>
                                <CheckCircle2 className="h-4 w-4 mr-1" /> Complete
                              </Button>
                            )}
                          </div>
                        </div>
                        {t.description && <div className="mt-1">{t.description}</div>}
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">No tasks.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Unified History */}
          <TabsContent value="history" className="space-y-4">
            {id && <AssignmentHistoryPanel caseId={id} />}
            {id && <CaseHistoryTimeline lgCaseId={id} />}
          </TabsContent>

          {/* Activity */}
          <TabsContent value="activity">
            <Card><CardHeader><CardTitle>Audit Trail</CardTitle><CardDescription>Every critical Legal action is recorded here.</CardDescription></CardHeader><CardContent>
              {activity.data?.length ? (
                <ol className="relative border-l ml-3 space-y-3">
                  {activity.data.map((a: any) => (
                    <li key={a.id} className="ml-4">
                      <div className="absolute -left-1.5 h-3 w-3 rounded-full bg-primary" />
                      <div className="text-sm font-medium">{a.activity_type}</div>
                      <div className="text-xs text-muted-foreground">{new Date(a.performed_at).toLocaleString()} {a.performed_by ? `· ${a.performed_by}` : ""}</div>
                      {a.description && <div className="text-sm">{a.description}</div>}
                    </li>
                  ))}
                </ol>
              ) : <p className="text-sm text-muted-foreground">No activity recorded.</p>}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="letters">
            <div className="space-y-4">
              <AvailableLettersPanel
                caseId={String(id)}
                caseTypeCode={caseData.case_type_code ?? null}
                currentStage={caseData.current_stage_code ?? null}
                canGenerate={access.can("editCase")}
              />
              <GeneratedLettersHistoryPanel
                caseId={String(id)}
                currentStage={caseData.current_stage_code ?? null}
                canGenerate={access.can("editCase")}
              />
            </div>
          </TabsContent>


          <TabsContent value="legalrefs">
            <EntityLegalReferenceManager
              entityKey={{ moduleCode: 'LG', entityTable: 'lg_case', entityId: String(id) }}
              countryCode={(import.meta as any).env?.VITE_DEFAULT_COUNTRY_CODE || 'KN'}
              title="Legal References for this Case"
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      {id && (
        <>
          <AssignOfficerDialog open={assignOpen} onOpenChange={setAssignOpen} lgCaseId={id} currentOfficerId={caseData?.assigned_legal_officer_id ?? null} />
          <ReassignCaseDialog
            open={reassignOpen}
            onOpenChange={setReassignOpen}
            caseId={id}
            caseNo={caseData?.lg_case_no}
            currentTeamCode={caseData?.assigned_team_code ?? null}
            currentAssigneeId={caseData?.assigned_legal_officer_id ?? null}
          />
          <AddPartyDialog open={partyOpen} onOpenChange={setPartyOpen} lgCaseId={id} />
          <LinkDocumentDialog open={docOpen} onOpenChange={setDocOpen} lgCaseId={id} />
          <HearingOutcomeDialog open={hearingOpen} onOpenChange={setHearingOpen} mode={hearingMode} hearing={selectedHearing} lgCaseId={id} />
          <AddSettlementDialog open={settlementOpen} onOpenChange={setSettlementOpen} lgCaseId={id} />
          <AddOrderDialog open={orderOpen} onOpenChange={setOrderOpen} lgCaseId={id} />
          <AddTaskDialog open={taskOpen} onOpenChange={setTaskOpen} lgCaseId={id} />
          <GenerateNoticeDialog open={noticeOpen} onOpenChange={setNoticeOpen} lgCaseId={id} />
          <LinkArrangementDialog open={arrangementOpen} onOpenChange={setArrangementOpen} lgCaseId={id} employerId={caseData?.employer_id ?? null} />
        </>
      )}
    </div>
  );
};

export default LgCaseDetail;
