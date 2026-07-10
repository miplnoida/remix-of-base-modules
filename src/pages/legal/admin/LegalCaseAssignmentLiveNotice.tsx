/**
 * EPIC L2 — Legal Module Live Case Assignment Notice (internal domain pilot).
 *
 * Admin-only screen inside the actual Legal module that sends ONE governed
 * live email for LEGAL / INTERNAL_CASE_ASSIGNMENT_NOTICE to any
 * @mishainfotech.com recipient. Server-side gates (comm-hub-event-pilot)
 * re-check every restriction; this UI is only a controlled launcher.
 *
 * HARD RESTRICTIONS (client + server enforced):
 *  - Module locked to LEGAL, event locked to INTERNAL_CASE_ASSIGNMENT_NOTICE.
 *  - Template locked to LEGAL_INTERNAL_CASE_ASSIGNMENT_EMAIL.
 *  - Recipient must match /^[^\s@]+@mishainfotech\.com$/.
 *  - Exactly one recipient, no CC/BCC, no bulk, no cron.
 *  - Typed confirmation: SEND LIVE LEGAL INTERNAL NOTICE.
 *  - After send, admin MUST close the live window and revert event.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  ShieldAlert, ShieldCheck, Send, RefreshCcw, Lock, Rocket, RotateCcw, StopCircle,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const MODULE = "LEGAL";
const EVENT = "INTERNAL_CASE_ASSIGNMENT_NOTICE";
const TEMPLATE = "LEGAL_INTERNAL_CASE_ASSIGNMENT_EMAIL";
const INTERNAL_DOMAIN = "mishainfotech.com";
const SEND_TYPED = "SEND LIVE LEGAL INTERNAL NOTICE";
const PROMOTE_TYPED = `PROMOTE ${MODULE}/${EVENT} TO LIVE MANUAL ONLY`;
const REVERT_TYPED = `REVERT ${MODULE}/${EVENT} TO DRY RUN ONLY`;

const INTERNAL_EMAIL_RE = /^[a-z0-9._%+-]+@mishainfotech\.com$/i;

function isInternalMishaEmail(v: string): boolean {
  return INTERNAL_EMAIL_RE.test(v.trim());
}

interface PreflightResp {
  ok: boolean; ready: boolean; reasons: string[];
  env: { envEmailLive: boolean };
  db_gates: any;
  window: { open: boolean; expires_at: string | null };
  event_status: string | null;
  live_queued: number;
}

export default function LegalCaseAssignmentLiveNotice() {
  const { user, isAdmin } = useAuth() as any;
  const [searchParams] = useSearchParams();

  const qpCaseRef = searchParams.get("caseReference") ?? "";
  const qpAssignedTo = searchParams.get("assignedTo") ?? "";
  const qpPriority = searchParams.get("priority") ?? "";
  const qpRecipientEmail = (searchParams.get("recipientEmail") ?? "").toLowerCase();
  const qpRecipientName = searchParams.get("recipientName") ?? "";
  const qpCaseId = searchParams.get("caseId") ?? "";
  const qpSource = searchParams.get("source") ?? "";
  const prefilled = Boolean(qpCaseRef || qpAssignedTo || qpRecipientEmail || qpSource);

  const [recipientEmail, setRecipientEmail] = useState(qpRecipientEmail);
  const [recipientName, setRecipientName] = useState(qpRecipientName || "Rohit Wadhwa");
  const [caseReference, setCaseReference] = useState(qpCaseRef);
  const [assignedTo, setAssignedTo] = useState(qpAssignedTo);
  const [priority, setPriority] = useState(qpPriority || "Normal");
  const [reason, setReason] = useState(
    prefilled ? `Prefilled from Legal case workflow (source=${qpSource || "legal_case_detail"})` : "",
  );


  const [preflight, setPreflight] = useState<PreflightResp | null>(null);
  const [eventStatus, setEventStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sendResult, setSendResult] = useState<any | null>(null);

  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteReason, setPromoteReason] = useState("");
  const [promoteTyped, setPromoteTyped] = useState("");

  const [revertOpen, setRevertOpen] = useState(false);
  const [revertReason, setRevertReason] = useState("");
  const [revertTyped, setRevertTyped] = useState("");

  const [sendOpen, setSendOpen] = useState(false);
  const [sendTyped, setSendTyped] = useState("");

  const validEmail = isInternalMishaEmail(recipientEmail);
  const formValid = validEmail && recipientName.trim().length > 1
    && caseReference.trim().length > 1 && assignedTo.trim().length > 1
    && reason.trim().length >= 6;

  const loadEventStatus = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("communication_hub_event_live_control")
      .select("status").eq("module_code", MODULE).eq("event_code", EVENT).maybeSingle();
    setEventStatus((data as any)?.status ?? null);
  }, []);
  useEffect(() => { void loadEventStatus(); }, [loadEventStatus]);

  const runPreflight = useCallback(async () => {
    if (!validEmail) { toast.error("Recipient must be an @mishainfotech.com address."); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("comm-hub-event-pilot", {
        body: {
          action: "live_preflight",
          moduleCode: MODULE, eventCode: EVENT, templateCode: TEMPLATE,
          recipientEmail: recipientEmail.trim().toLowerCase(),
          recipientName: recipientName.trim(),
          tokens: {
            recipient_name: recipientName.trim(),
            case_reference: caseReference.trim(),
            assigned_to: assignedTo.trim(),
            priority: priority.trim() || "Normal",
          },
        },
      });
      if (error) throw error;
      setPreflight(data as PreflightResp);
      if ((data as any)?.ready) toast.success("Live preflight ready.");
      else toast.warning("Live preflight blocked — see reasons.");
    } catch (e: any) {
      toast.error(`Preflight failed: ${e?.message ?? "unknown"}`);
    } finally { setBusy(false); }
  }, [validEmail, recipientEmail, recipientName, caseReference, assignedTo, priority]);

  const promote = useMemo(() => ({
    canSubmit: promoteReason.trim().length >= 6 && promoteTyped === PROMOTE_TYPED && !busy,
    async submit() {
      if (!user?.id) { toast.error("Not signed in."); return; }
      setBusy(true);
      try {
        const { error } = await (supabase as any).rpc("set_event_live_control", {
          p_module_code: MODULE, p_event_code: EVENT, p_new_status: "live_manual_only",
          p_reason: promoteReason.trim(), p_risk_level: "low",
          p_typed_confirmation: promoteTyped, p_actor_user_id: user.id,
        });
        if (error) throw error;
        toast.success("Event promoted to live_manual_only.");
        setPromoteOpen(false); setPromoteReason(""); setPromoteTyped("");
        await loadEventStatus();
      } catch (e: any) {
        toast.error(`Promote failed: ${e?.message ?? "unknown"}`);
      } finally { setBusy(false); }
    },
  }), [promoteReason, promoteTyped, busy, user, loadEventStatus]);

  const revert = useMemo(() => ({
    canSubmit: revertReason.trim().length >= 6 && revertTyped === REVERT_TYPED && !busy,
    async submit() {
      if (!user?.id) { toast.error("Not signed in."); return; }
      setBusy(true);
      try {
        const { error } = await (supabase as any).rpc("set_event_live_control", {
          p_module_code: MODULE, p_event_code: EVENT, p_new_status: "dry_run_only",
          p_reason: revertReason.trim(), p_risk_level: "low",
          p_typed_confirmation: revertTyped, p_actor_user_id: user.id,
        });
        if (error) throw error;
        toast.success("Event reverted to dry_run_only.");
        setRevertOpen(false); setRevertReason(""); setRevertTyped("");
        await loadEventStatus();
      } catch (e: any) {
        toast.error(`Revert failed: ${e?.message ?? "unknown"}`);
      } finally { setBusy(false); }
    },
  }), [revertReason, revertTyped, busy, user, loadEventStatus]);

  const sendReady = !!preflight?.ready && eventStatus === "live_manual_only" && !sendResult;

  const send = useMemo(() => ({
    canSubmit: sendReady && sendTyped === SEND_TYPED && !busy,
    async submit() {
      setBusy(true); setSendResult(null);
      try {
        const { data, error } = await supabase.functions.invoke("comm-hub-event-pilot", {
          body: {
            action: "live_send",
            moduleCode: MODULE, eventCode: EVENT, templateCode: TEMPLATE,
            recipientEmail: recipientEmail.trim().toLowerCase(),
            recipientName: recipientName.trim(),
            tokens: {
              recipient_name: recipientName.trim(),
              case_reference: caseReference.trim(),
              assigned_to: assignedTo.trim(),
              priority: priority.trim() || "Normal",
            },
            reason: reason.trim(),
            typedConfirmation: sendTyped,
            entityType: qpCaseId ? "legal_case" : null,
            entityId: qpCaseId || null,
            referenceNo: caseReference.trim() || null,
            adapterSource: qpSource || (prefilled ? "legal_case_detail" : "legal_admin_live_notice"),
            context: {
              source: qpSource || (prefilled ? "legal_case_detail" : "legal_admin_live_notice"),
              initiated_from: "legal_module",
              case_id: qpCaseId || null,
              case_reference: caseReference.trim() || null,
              assigned_to: assignedTo.trim() || null,
              priority: priority.trim() || null,
            },
          },
        });
        if (error) throw error;
        setSendResult(data);
        setSendOpen(false); setSendTyped("");
        if ((data as any)?.ok) toast.success("Live Legal internal notice dispatched. Close window and revert now.");
        else toast.error("Live send blocked — see result panel.");
      } catch (e: any) {
        toast.error(`Live send failed: ${e?.message ?? "unknown"}`);
        setSendResult({ ok: false, error: e?.message ?? String(e) });
      } finally { setBusy(false); }
    },
  }), [sendReady, sendTyped, busy, recipientEmail, recipientName, caseReference, assignedTo, priority, reason, qpCaseId, qpSource, prefilled]);


  async function closeWindow() {
    setBusy(true);
    try {
      const { error } = await (supabase as any).rpc("close_comm_hub_live_window", {
        p_reason: "EPIC L2 — safe close after Legal live internal notice send.",
        p_emergency: false,
      });
      if (error) throw error;
      toast.success("Live window closed.");
      await runPreflight();
    } catch (e: any) {
      toast.error(`Close failed: ${e?.message ?? "unknown"}`);
    } finally { setBusy(false); }
  }

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Admin only</AlertTitle>
          <AlertDescription>
            This screen sends real internal emails and is restricted to platform administrators.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Send Live Internal Legal Notice</h1>
        <p className="text-sm text-muted-foreground">
          Governed, one-shot live email for <code>{MODULE}/{EVENT}</code>. Internal Misha domain pilot only.
        </p>
      </div>

      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Internal Misha domain pilot only</AlertTitle>
        <AlertDescription className="text-xs">
          External Legal recipients (employers, claimants, appellants, government, public domains) are
          blocked in this phase. Only <code>@{INTERNAL_DOMAIN}</code> addresses are accepted.
          No CC/BCC, no bulk, no cron. Exactly one recipient per send.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recipient &amp; case</CardTitle>
          <CardDescription>All fields are audited. Recipient is domain-validated client-side and re-validated server-side.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Recipient email <span className="text-destructive">*</span></Label>
              <Input
                value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
                placeholder={`someone@${INTERNAL_DOMAIN}`}
                className={recipientEmail && !validEmail ? "border-destructive" : ""}
              />
              {recipientEmail && !validEmail && (
                <p className="text-xs text-destructive">Must end with @{INTERNAL_DOMAIN}.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Recipient name <span className="text-destructive">*</span></Label>
              <Input value={recipientName} onChange={e => setRecipientName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Case reference <span className="text-destructive">*</span></Label>
              <Input value={caseReference} onChange={e => setCaseReference(e.target.value)} placeholder="LG-2026-0001" />
            </div>
            <div className="space-y-1.5">
              <Label>Assigned to <span className="text-destructive">*</span></Label>
              <Input value={assignedTo} onChange={e => setAssignedTo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Input value={priority} onChange={e => setPriority(e.target.value)} placeholder="Normal / High" />
            </div>
            <div className="space-y-1.5">
              <Label>Reason (audited, min 6 chars) <span className="text-destructive">*</span></Label>
              <Textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} />
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Locked: module=<code>{MODULE}</code>, event=<code>{EVENT}</code>, template=<code>{TEMPLATE}</code>,
            channel=<code>email</code>, recipients=1, no CC/BCC.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Live gate</CardTitle>
            <CardDescription>Promote event, open live window in Control Center, then run preflight.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant={eventStatus === "live_manual_only" ? "destructive" : "secondary"}>
              event: {eventStatus ?? "—"}
            </Badge>
            <Button size="sm" variant="outline" onClick={() => { void loadEventStatus(); void runPreflight(); }} disabled={busy || !formValid}>
              <RefreshCcw className="h-3.5 w-3.5 mr-1" /> Refresh preflight
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="destructive" size="sm"
              disabled={busy || eventStatus === "live_manual_only"}
              onClick={() => { setPromoteOpen(true); setPromoteReason(""); setPromoteTyped(""); }}>
              <Rocket className="h-3.5 w-3.5 mr-1" /> Promote event to live_manual_only
            </Button>
            <Button variant="outline" size="sm"
              disabled={busy || eventStatus !== "live_manual_only"}
              onClick={() => { setRevertOpen(true); setRevertReason(""); setRevertTyped(""); }}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Revert event to dry_run_only
            </Button>
            <Button variant="outline" size="sm" onClick={closeWindow} disabled={busy}>
              <StopCircle className="h-3.5 w-3.5 mr-1" /> Close live window
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Open the ≤5-minute live window and flip DB gates in the{" "}
            <Link to="/admin/communication-hub/control-center" className="underline">Control Center</Link>{" "}
            and{" "}
            <Link to="/admin/communication-hub/governance" className="underline">Governance</Link>{" "}
            pages. Allowlist must be either <code>allowed_email_addresses=[the-single-recipient]</code> or{" "}
            <code>allowed_email_domains=[{INTERNAL_DOMAIN}]</code> — nothing else.
          </p>

          {preflight && (
            <Alert variant={preflight.ready ? "default" : "destructive"}>
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle className="text-xs">
                {preflight.ready ? "READY" : "BLOCKED"}
                <span className="ml-2 font-mono">env COMMUNICATION_HUB_EMAIL_LIVE={String(preflight.env.envEmailLive)}</span>
              </AlertTitle>
              <AlertDescription className="text-xs">
                {preflight.reasons.length === 0
                  ? <span>No blocking reasons.</span>
                  : <ul className="list-disc pl-5">{preflight.reasons.map((r, i) => <li key={i}><code>{r}</code></li>)}</ul>}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Send exactly one live email
            {!sendReady && <Badge variant="outline" className="text-[10px]"><Lock className="h-3 w-3 mr-1" />gated</Badge>}
          </CardTitle>
          <CardDescription>Active only when form valid + preflight READY + event live_manual_only.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="destructive" size="sm"
            disabled={!sendReady || !formValid || busy}
            onClick={() => { setSendOpen(true); setSendTyped(""); }}>
            <Send className="h-3.5 w-3.5 mr-1" /> Send Live Internal Legal Notice
          </Button>

          {sendResult && (
            <Alert variant={sendResult.ok ? "default" : "destructive"}>
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle className="text-xs">Live send result</AlertTitle>
              <AlertDescription className="text-xs space-y-1 mt-1">
                {sendResult.ok ? (
                  <>
                    <div><strong>request_no:</strong> <code>{sendResult.requestNo}</code></div>
                    <div><strong>message_id:</strong> <code>{sendResult.messageId}</code></div>
                    <div><strong>provider_message_id:</strong> <code>{(sendResult.message?.provider_message_id ?? "").slice(0, 32)}…</code></div>
                    <div><strong>sentLive:</strong> {sendResult.dispatch?.response?.sentLive ?? "—"} · <strong>sentDryRun:</strong> {sendResult.dispatch?.response?.sentDryRun ?? "—"}</div>
                    <div><strong>status:</strong> {sendResult.message?.status ?? "—"} · <strong>test_mode:</strong> {String(sendResult.message?.test_mode)}</div>
                    <div className="flex flex-wrap gap-3 pt-2">
                      <Link className="underline inline-flex items-center gap-1" to="/admin/communication-hub/delivery-monitor">
                        Delivery Monitor <ExternalLink className="h-3 w-3" />
                      </Link>
                      <Link className="underline inline-flex items-center gap-1" to="/admin/communication-hub/dispatch-register">
                        Dispatch Register <ExternalLink className="h-3 w-3" />
                      </Link>
                      <Link className="underline inline-flex items-center gap-1" to="/admin/communication-hub/lifecycle-log">
                        Lifecycle Event Log <ExternalLink className="h-3 w-3" />
                      </Link>
                      <Link className="underline inline-flex items-center gap-1" to="/admin/communication-hub/retry-queue">
                        Retry Queue <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </>
                ) : (
                  <pre className="whitespace-pre-wrap break-all bg-background/60 p-2 rounded max-h-52 overflow-auto">{JSON.stringify(sendResult, null, 2)}</pre>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Dialog open={promoteOpen} onOpenChange={(o) => !o && setPromoteOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote to live_manual_only</DialogTitle>
            <DialogDescription>Enables one-shot manual live send. Does not open the window or send email.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Reason (audited, min 6 chars)</Label>
              <Textarea rows={2} value={promoteReason} onChange={e => setPromoteReason(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Typed confirmation — must equal <code>{PROMOTE_TYPED}</code></Label>
              <Input value={promoteTyped} onChange={e => setPromoteTyped(e.target.value)} placeholder={PROMOTE_TYPED}
                className={promoteTyped && promoteTyped !== PROMOTE_TYPED ? "border-destructive" : ""} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPromoteOpen(false)} disabled={busy}>Cancel</Button>
            <Button variant="destructive" onClick={promote.submit} disabled={!promote.canSubmit}>Promote</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={revertOpen} onOpenChange={(o) => !o && setRevertOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revert to dry_run_only</DialogTitle>
            <DialogDescription>Do this immediately after each live send.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Reason (audited, min 6 chars)</Label>
              <Textarea rows={2} value={revertReason} onChange={e => setRevertReason(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Typed confirmation — must equal <code>{REVERT_TYPED}</code></Label>
              <Input value={revertTyped} onChange={e => setRevertTyped(e.target.value)} placeholder={REVERT_TYPED}
                className={revertTyped && revertTyped !== REVERT_TYPED ? "border-destructive" : ""} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRevertOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={revert.submit} disabled={!revert.canSubmit}>Revert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sendOpen} onOpenChange={(o) => !o && setSendOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Live Internal Legal Notice</DialogTitle>
            <DialogDescription>
              One live email to <code>{recipientEmail}</code>. testMode=false. Server re-checks every gate.
              After the attempt, close the live window and revert the event.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded border p-2 text-xs bg-muted/40 space-y-0.5">
              <div>module=<code>{MODULE}</code> · event=<code>{EVENT}</code></div>
              <div>recipient=<code>{recipientEmail}</code> · name=<code>{recipientName}</code></div>
              <div>case=<code>{caseReference}</code> · assigned_to=<code>{assignedTo}</code> · priority=<code>{priority}</code></div>
              <div>mode=<code>LIVE</code> · max sends=<code>1</code> · no CC/BCC · no cron</div>
            </div>
            <div className="space-y-1.5">
              <Label>Typed confirmation — must equal <code>{SEND_TYPED}</code></Label>
              <Input value={sendTyped} onChange={e => setSendTyped(e.target.value)} placeholder={SEND_TYPED}
                className={sendTyped && sendTyped !== SEND_TYPED ? "border-destructive" : ""} />
            </div>
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription className="text-xs">
                This makes a real provider call to a live @{INTERNAL_DOMAIN} recipient. Server refuses if any gate fails.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSendOpen(false)} disabled={busy}>Cancel</Button>
            <Button variant="destructive" onClick={send.submit} disabled={!send.canSubmit}>Send one live notice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
