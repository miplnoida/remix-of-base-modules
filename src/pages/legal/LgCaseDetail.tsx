import React, { useMemo, useState } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { LgCaseSSBContextTab } from "@/components/legal/lg/LgCaseSSBContextTab";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, AlertTriangle, ShieldCheck, Lock, Plus, UserCheck, CheckCircle2, Gavel, Pencil, LayoutGrid, Briefcase, Scale, Banknote, FileText, BookOpen } from "lucide-react";
import { useLgCase, useSubmitLgNoticeForApproval, useApproveLgNotice, useDispatchLgNotice } from "@/hooks/legal/useLgCases";
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
import { LgCaseOrdersTab } from "@/components/legal/lg/LgCaseOrdersTab";
import { LinkArrangementDialog } from "@/components/legal/lg/LinkArrangementDialog";
import { AddTaskDialog } from "@/components/legal/lg/AddTaskDialog";
import { LgTasksGrid } from "@/components/legal/lg/LgTasksGrid";
import { GenerateNoticeDialog } from "@/components/legal/lg/GenerateNoticeDialog";
import { AssignOfficerDialog } from "@/components/legal/lg/AssignOfficerDialog";
import CaseFeesTab from "@/components/legal/lg/CaseFeesTab";
import LegalCaseDocumentsTab from "@/components/legal/lg/LegalCaseDocumentsTab";
import CaseCompletenessPanel from "@/components/legal/lg/CaseCompletenessPanel";
import { AvailableLettersPanel } from "@/components/legal/lg/AvailableLettersPanel";
import { GeneratedLettersHistoryPanel } from "@/components/legal/lg/GeneratedLettersHistoryPanel";
import { CaseHistoryTimeline } from "@/components/legal/lg/CaseHistoryTimeline";
import CaseCourtProceedingsTab from "@/components/legal/lg/CaseCourtProceedingsTab";
import LegalCasePaymentArrangementsPanel from "@/components/legal/lg/LegalCasePaymentArrangementsPanel";
import { LgCaseRecoveryTab } from "@/components/legal/lg/LgCaseRecoveryTab";
import CaseActionsPanel from "@/components/legal/lg/actions/CaseActionsPanel";
import { useLgCaseActions } from "@/hooks/legal/useLgCaseActions";
import FinancialSnapshotPanel from "@/components/legal/lg/financial/FinancialSnapshotPanel";

import AssignmentHistoryPanel from "@/components/legal/AssignmentHistoryPanel";
import ReassignCaseDialog from "@/components/legal/ReassignCaseDialog";
import { useMissingRequiredForCase } from "@/hooks/legal/useLgStageTemplates";
import { autoApplyForEvent } from "@/services/legal/lgFeeEngineService";
import { LegalMatterWorkspaceBanner } from "@/components/legal/LegalMatterWorkspaceBanner";
import { LegalMatterAiSummary } from "@/components/legal/LegalMatterAiSummary";
import { WorkflowActionButtons } from "@/components/workflow/WorkflowActionButtons";
import { LG_WORKFLOW_MODULES } from "@/hooks/legal/useLgWorkflowIntegration";
import { useLegalReadOnly } from "@/hooks/legal/useLegalReadOnly";
import { useLegalCapability } from "@/hooks/legal/useLegalCapability";
import { assertLegalCaseTransition } from "@/services/legal/legalCaseStateMachine";





const sb = supabase as any;

/**
 * Renders the central enterprise workflow action buttons for a Legal case.
 * The underlying <WorkflowActionButtons> already hides itself when no
 * workflow instance governs the entity, so this is safe to always mount.
 * Read-only Legal users get no buttons.
 */
function LgCentralWorkflowActions({ caseId }: { caseId: string }) {
  const { isReadOnly } = useLegalReadOnly();
  if (isReadOnly) return null;
  return (
    <div className="pt-2">
      <div className="text-sm font-medium mb-2">Workflow actions</div>
      <WorkflowActionButtons
        sourceModule={LG_WORKFLOW_MODULES.CASE}
        sourceRecordId={caseId}
      />
    </div>
  );
}


function StatBadge({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border rounded p-2 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function Stat2({ label, v, bold }: { label: string; v: React.ReactNode; bold?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</div>
      <div className={bold ? "font-semibold" : "font-medium"}>{v}</div>
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, isAuthReady, isAuthenticated } = useSupabaseAuth();
  const access = useLgAccess();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { userCode } = useUserCode();
  const { capability: legalCapability } = useLegalCapability();
  const { data: caseData, isLoading, error } = useLgCase(id);
  const submitNoticeApproval = useSubmitLgNoticeForApproval();
  const approveNotice = useApproveLgNotice();
  const dispatchNotice = useDispatchLgNotice();




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

  // Deep-link support: ?tab=recovery, ?tab=hearings, ?tab=orders, ?tab=ssb, etc.
  // Recovery Workbench and email links can jump straight to a sub-tab.
  const TAB_TO_GROUP: Record<string, "overview" | "work" | "litigation" | "recovery" | "docs" | "governance"> = {
    summary: "overview", parties: "overview", intake: "overview", referral: "overview",
    financial: "overview", ssb: "overview",
    actions: "work", tasks: "work", assignhist: "work", ai: "work",
    proceedings: "litigation", hearings: "litigation", orders: "litigation",
    appeals: "litigation", enforcement: "litigation",
    recovery: "recovery", recovery_summary: "recovery", arrangement: "recovery",
    fees: "recovery", settlements: "recovery", waivers: "recovery",
    documents: "docs", letters: "docs", notices: "docs", correspondence: "docs",
    legalrefs: "governance", timeline: "governance", history: "governance", activity: "governance",
  };
  React.useEffect(() => {
    const t = searchParams.get("tab");
    if (t && TAB_TO_GROUP[t]) {
      const target = t === "recovery" ? "recovery_summary" : t;
      setGroup(TAB_TO_GROUP[t]);
      setSub(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  React.useEffect(() => {
    const defaults: Record<string, string> = {
      overview: "summary", work: "actions", litigation: "proceedings",
      recovery: "arrangement", docs: "documents", governance: "history",
    };
    // Only reset when user changes group manually; skip when deep-link already set sub.
    if (!searchParams.get("tab")) setSub(defaults[group]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // Enforce the Legal Case state machine before hitting the DB.
      assertLegalCaseTransition(prev, newStage, legalCapability);
      const { error } = await sb.from("lg_case").update({ current_stage_code: newStage, status_code: newStage }).eq("id", id);
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
      // Enforce the Legal Case state machine before closing.
      assertLegalCaseTransition(caseData?.status_code, "CLOSED", legalCapability);
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
    onError: (e: any) => toast({ title: "Cannot close case", description: e.message, variant: "destructive" }),
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
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-9 space-y-6">
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

        {/* Unified Legal Matter Workspace banner (read-only resolver) */}
        <LegalMatterWorkspaceBanner matterRef={id ? { kind: "case", id } : null} />

        {(() => {
          const acts = childActions.data ?? [];
          const totalExposure = acts.reduce((s, a: any) => s + Number(a.total_amount ?? 0), 0);
          const totalPaid = acts.reduce((s, a: any) => s + Number(a.amount_paid ?? 0), 0);
          const totalOutstanding = acts.reduce((s, a: any) => s + Number(a.outstanding_amount ?? 0), 0);
          return (
            <Card>
              <CardContent className="pt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
                <Stat2 label="Source" v={caseData.source_module ? `${caseData.source_module}${caseData.compliance_case_id ? ` · ${String(caseData.compliance_case_id).slice(0,8)}` : ""}` : "—"} />
                <Stat2 label="Team / Owner" v={`${caseData.assigned_team_code ?? "—"} / ${caseData.assigned_legal_officer_id ? String(caseData.assigned_legal_officer_id).slice(0,8) : "—"}`} />
                <Stat2 label="Court Case" v={caseData.court_case_no || "—"} />
                <Stat2 label="Next Hearing" v={caseData.next_hearing_date || "—"} />
                <Stat2 label="Opened" v={caseData.opened_date || "—"} />
                <Stat2 label="Actions" v={`${acts.length} (${openChildActions.length} open)`} />
                <Stat2 label="Exposure / Paid / Outstanding" v={`${totalExposure.toFixed(2)} / ${totalPaid.toFixed(2)} / ${totalOutstanding.toFixed(2)}`} bold />
              </CardContent>
            </Card>
          );
        })()}

        {/* Grouped navigation */}
        <div className="flex gap-1 flex-wrap border-b pb-2">
          {([
            ["overview", LayoutGrid, "Overview"],
            ["work", Briefcase, "Work"],
            ["litigation", Scale, "Litigation"],
            ["recovery", Banknote, "Recovery"],
            ["docs", FileText, "Docs & Comm"],
            ["governance", BookOpen, "Governance"],
          ] as const).map(([key, Icon, label]) => (
            <Button
              key={key}
              size="sm"
              variant={group === key ? "default" : "ghost"}
              onClick={() => setGroup(key as any)}
              className="gap-1"
            >
              <Icon className="h-4 w-4" /> {label}
            </Button>
          ))}
        </div>

        <Tabs value={sub} onValueChange={setSub} className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            {group === "overview" && (<>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="parties">Parties ({parties.data?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="intake">Intake</TabsTrigger>
              <TabsTrigger value="referral">Source / Referral</TabsTrigger>
              <TabsTrigger value="financial">Financial Snapshot</TabsTrigger>
              <TabsTrigger value="ssb">SSB Context</TabsTrigger>
            </>)}
            {group === "work" && (<>
              <TabsTrigger value="actions">Actions ({childActions.data?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="tasks">Tasks ({tasks.data?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="assignhist">Assignment History</TabsTrigger>
              <TabsTrigger value="ai">AI Analysis</TabsTrigger>
            </>)}
            {group === "litigation" && (<>
              <TabsTrigger value="proceedings">Court Proceedings</TabsTrigger>
              <TabsTrigger value="hearings">Hearings ({hearings.data?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="orders">Orders / Judgments ({orders.data?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="appeals">Appeals</TabsTrigger>
              <TabsTrigger value="enforcement">Enforcement</TabsTrigger>
            </>)}
            {group === "recovery" && (<>
              <TabsTrigger value="recovery_summary">Payments / Recovery</TabsTrigger>
              <TabsTrigger value="arrangement">Payment Arrangements</TabsTrigger>
              <TabsTrigger value="fees">Fees ({fees.data?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="settlements">Settlements ({settlements.data?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="waivers">Waivers</TabsTrigger>
            </>)}
            {group === "docs" && (<>
              <TabsTrigger value="documents">Documents ({documents.data?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="letters">Letters</TabsTrigger>
              <TabsTrigger value="notices">Notices ({notices.data?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="correspondence">Correspondence</TabsTrigger>
            </>)}
            {group === "governance" && (<>
              <TabsTrigger value="legalrefs">Legal References</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="activity">Activity / Audit</TabsTrigger>
            </>)}
          </TabsList>

          {/* Intake — surfaced from /legal/cases/intake/:id */}
          <TabsContent value="intake">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Intake Record</CardTitle>
                <CardDescription>Original intake form that opened this matter.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <Button variant="outline" asChild>
                  <Link to={`/legal/cases/intake/${id}`}>Open intake form</Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Analysis — surfaced from contract review AI panel */}
          <TabsContent value="ai">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI Analysis</CardTitle>
                <CardDescription>Workspace-scoped AI summary, risks and suggested next actions.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                AI analysis for this matter will appear here. Use Documents → Run AI from any uploaded document to populate this view.
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appeals — surfaced from /legal/appeals */}
          <TabsContent value="appeals">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Appeals</CardTitle>
                <CardDescription>Appeals filed against orders or judgments on this matter.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <Button variant="outline" asChild>
                  <Link to={`/legal/appeals?caseId=${id}`}>Open appeals workspace</Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Timeline — chronological view across activity, hearings, orders, payments */}
          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Matter Timeline</CardTitle>
                <CardDescription>Chronological view of every event on this matter.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                The unified timeline is rendered from the Activity / Audit feed. Switch to the Activity tab for the full event log, or use History for stage transitions.
              </CardContent>
            </Card>
          </TabsContent>


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
            <div className="mb-3">
              <CaseCompletenessPanel lgCaseId={caseData.id} />
            </div>
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

                {/* Central workflow actions (enterprise engine).
                    Renders only when a workflow instance governs this case. */}
                <LgCentralWorkflowActions caseId={caseData.id} />

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
                    <div key={n.id} className="border rounded p-3 text-sm space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{n.notice_no} · {n.notice_type_code}</div>
                          <div className="text-xs text-muted-foreground">{n.delivery_channel ?? "—"} · issued {n.issued_date ?? "—"}</div>
                          {n.subject && <div className="mt-1">{n.subject}</div>}
                        </div>
                        <Badge>{n.status}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {n.status === "DRAFT" && (
                          <Button size="sm" variant="outline"
                            onClick={() => submitNoticeApproval.mutate({ id: n.id, caseId: id!, userCode: profile?.user_code ?? null, noticeNo: n.notice_no },
                              { onSuccess: () => toast({ title: "Sent for approval" }) })}>
                            Submit for Approval
                          </Button>
                        )}
                        {access.can("approveNotice") && ["DRAFT", "PENDING_APPROVAL"].includes(n.status) && (
                          <Button size="sm" variant="outline"
                            onClick={() => approveNotice.mutate({ id: n.id, caseId: id!, userCode: profile?.user_code ?? null, noticeNo: n.notice_no },
                              { onSuccess: () => toast({ title: "Notice approved" }) })}>
                            Approve
                          </Button>
                        )}
                        {(access.can("sendNotice") || access.can("generateNotice")) && n.status !== "SENT" && n.status !== "CANCELLED" && (
                          <Button size="sm"
                            onClick={() => dispatchNotice.mutate({ id: n.id, caseId: id!, channel: n.delivery_channel || "EMAIL", userCode: profile?.user_code ?? null, noticeNo: n.notice_no },
                              { onSuccess: () => toast({ title: "Notice dispatched" }), onError: (e: any) => toast({ title: "Dispatch failed", description: e?.message, variant: "destructive" }) })}>
                            Dispatch
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No notices issued.</p>}

            </CardContent></Card>
          </TabsContent>

          {/* Payments / Recovery consolidated view */}
          <TabsContent value="recovery_summary">
            {id && (
              <LgCaseRecoveryTab
                lgCaseId={id}
                canEdit={access.can("editCase")}
                onLinkArrangement={() => setArrangementOpen(true)}
              />
            )}
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
            {id && (
              <LgCaseOrdersTab
                lgCaseId={id}
                canCreate={access.can("createOrder")}
                canManage={access.can("createOrder")}
              />
            )}
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
                <CardTitle>Tasks &amp; SLA</CardTitle>
                <CardDescription>Create, assign, escalate and close tasks for this case.</CardDescription>
              </CardHeader>
              <CardContent>
                <LgTasksGrid caseId={id!} gridId={`tasks-case-${id}`} showCaseColumn={false} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Unified History */}
          <TabsContent value="history" className="space-y-4">
            {id && <LegalMatterAiSummary matterId={id} />}
            {id && <AssignmentHistoryPanel caseId={id} />}
            {id && <CaseHistoryTimeline lgCaseId={id} />}
          </TabsContent>

          {/* Activity */}
          <TabsContent value="activity">
            <Card><CardHeader><CardTitle>Audit Trail</CardTitle><CardDescription>Every critical Legal action is recorded here — actor, timestamp, action, target entity, before / after values, remarks.</CardDescription></CardHeader><CardContent>
              {activity.data?.length ? (
                <ol className="relative border-l ml-3 space-y-4">
                  {activity.data.map((a: any) => {
                    const oldV = a.old_value != null ? (typeof a.old_value === "string" ? a.old_value : JSON.stringify(a.old_value)) : null;
                    const newV = a.new_value != null ? (typeof a.new_value === "string" ? a.new_value : JSON.stringify(a.new_value)) : null;
                    return (
                      <li key={a.id} className="ml-4">
                        <div className="absolute -left-1.5 h-3 w-3 rounded-full bg-primary" />
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{a.activity_type}</span>
                          {a.entity_type && (
                            <span className="text-[10px] uppercase tracking-wide bg-muted px-1.5 py-0.5 rounded">
                              {a.entity_type}{a.entity_id ? ` · ${String(a.entity_id).slice(0, 8)}` : ""}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(a.performed_at).toLocaleString()}
                          {a.performed_by ? ` · ${a.performed_by}` : ""}
                        </div>
                        {a.description && <div className="text-sm mt-0.5">{a.description}</div>}
                        {(oldV || newV) && (
                          <div className="text-xs mt-1 font-mono bg-muted/40 rounded p-2 break-all">
                            {oldV && <div><span className="text-muted-foreground">from:</span> {oldV}</div>}
                            {newV && <div><span className="text-muted-foreground">to:</span> {newV}</div>}
                          </div>
                        )}
                        {a.remarks && <div className="text-xs italic text-muted-foreground mt-1">“{a.remarks}”</div>}
                      </li>
                    );
                  })}
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

          {/* Financial Snapshot */}
          <TabsContent value="financial">
            <FinancialSnapshotPanel
              caseId={id!}
              caseData={caseData}
              actions={(childActions.data ?? []) as any}
              canEdit={access.can("editCase")}
              onProposeFromDues={() => setSub("actions")}
            />
          </TabsContent>

          {/* EPIC-04 §5 — SSB Business Context */}
          <TabsContent value="ssb">
            {id && <LgCaseSSBContextTab lgCaseId={id} caseData={caseData} />}
          </TabsContent>




          {/* New: Assignment History */}
          <TabsContent value="assignhist">
            {id && <AssignmentHistoryPanel caseId={id} />}
          </TabsContent>

          {/* New: Enforcement (filtered orders + notices) */}
          <TabsContent value="enforcement">
            <Card>
              <CardHeader><CardTitle>Enforcement</CardTitle><CardDescription>Writs, warrants, judgment summons and enforcement notices.</CardDescription></CardHeader>
              <CardContent className="space-y-2">
                {(() => {
                  const enf = (orders.data ?? []).filter((o: any) =>
                    /WRIT|WARRANT|EXECUTION|ENFORCE|COMMIT/i.test(String(o.order_type_code ?? ""))
                  );
                  return enf.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No enforcement orders recorded.</p>
                  ) : enf.map((o: any) => (
                    <div key={o.id} className="border rounded p-3 text-sm">
                      <div className="flex justify-between"><div className="font-medium">{o.order_no} · {o.order_type_code}</div><Badge>{o.status}</Badge></div>
                      <div className="text-xs text-muted-foreground">{o.issued_by_court || "—"} · {o.issued_date || "—"}</div>
                    </div>
                  ));
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* New: Waivers */}
          <TabsContent value="waivers">
            <Card>
              <CardHeader><CardTitle>Waivers</CardTitle><CardDescription>Waiver decisions linked to this case or its source compliance referral.</CardDescription></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">No waivers recorded against this legal case. Waivers raised in Compliance will appear here when linked.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* New: Correspondence (notices feed) */}
          <TabsContent value="correspondence">
            <Card>
              <CardHeader><CardTitle>Correspondence</CardTitle><CardDescription>All outbound and inbound communications on this case.</CardDescription></CardHeader>
              <CardContent>
                {(notices.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No correspondence yet.</p>
                ) : (
                  <div className="space-y-2">
                    {(notices.data ?? []).map((n: any) => (
                      <div key={n.id} className="border rounded p-3 text-sm">
                        <div className="flex justify-between"><div className="font-medium">{n.notice_no} · {n.notice_type_code}</div><Badge>{n.status}</Badge></div>
                        <div className="text-xs text-muted-foreground">{n.delivery_channel ?? "—"} · {n.issued_date ?? "—"}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        </div>

        <aside className="lg:col-span-3">
          {id && <MatterSnapshotRail lgCaseId={id} />}
        </aside>
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

      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Legal Case</DialogTitle>
            <DialogDescription>
              All {childActions.data?.length ?? 0} child action(s) are resolved. Provide a closure reason for the audit trail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              value={closureReason}
              onChange={(e) => setClosureReason(e.target.value)}
              placeholder="e.g. All liabilities recovered in full, case closed."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!closureReason.trim() || closeCase.isPending}
              onClick={() => closeCase.mutate(closureReason.trim())}
            >
              {closeCase.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Confirm Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LgCaseDetail;
