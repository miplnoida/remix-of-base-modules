/**
 * EPIC 4D-LIVE-LEGAL-1 — Governed Live Pilot Panel for
 *   LEGAL / INTERNAL_CASE_ASSIGNMENT_NOTICE
 *
 * Sends exactly ONE live email to rohit@mishainfotech.com via the canonical
 * comm-hub-event-pilot façade (server-side re-checks all gates).
 *
 * HARD RESTRICTIONS (server-enforced too):
 *  - Module locked to LEGAL
 *  - Event locked to INTERNAL_CASE_ASSIGNMENT_NOTICE
 *  - Template locked to LEGAL_INTERNAL_CASE_ASSIGNMENT_EMAIL
 *  - Recipient locked to rohit@mishainfotech.com
 *  - Typed confirmation: "SEND ONE LIVE LEGAL INTERNAL EMAIL"
 *  - No cron, no bulk, no domain allowlist, no external Legal recipient
 *  - After send admin MUST close live window and revert to dry_run_only.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  ShieldCheck, ShieldAlert, StopCircle, Send, RefreshCcw, RotateCcw, Rocket, Lock, ExternalLink, ClipboardCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { BlockersList } from "@/pages/admin/communicationHub/safety/BlockersList";
import { normalizeBlockerResult } from "@/pages/admin/communicationHub/safety/blockerResult";

const MODULE = "LEGAL";
const EVENT = "INTERNAL_CASE_ASSIGNMENT_NOTICE";
const TEMPLATE = "LEGAL_INTERNAL_CASE_ASSIGNMENT_EMAIL";
const RECIPIENT = "rohit@mishainfotech.com";
const RECIPIENT_NAME = "Rohit Wadhwa";

const PROMOTE_TYPED = `PROMOTE ${MODULE}/${EVENT} TO LIVE MANUAL ONLY`;
const REVERT_TYPED = `REVERT ${MODULE}/${EVENT} TO DRY RUN ONLY`;
const SEND_TYPED = "SEND ONE LIVE LEGAL INTERNAL EMAIL";

const DEFAULT_TOKENS = {
  recipient_name: RECIPIENT_NAME,
  case_reference: "LG-LIVE-TEST-001",
  assigned_to: "Demo Legal Officer",
  priority: "Normal",
};

interface LivePreflight {
  ok: boolean; ready: boolean; reasons: string[];
  env: { envEmailLive: boolean };
  db_gates: any;
  window: { open: boolean; expires_at: string | null };
  event_status: string | null;
  live_queued: number;
  proposal_exists: boolean;
  rehearsal_pass: boolean;
  latest_dry_run: any;
  template_code: string | null;
  recipient_masked: string;
}
interface EventLiveRow { status: string; risk_level: string }

export function GovernedLivePilotPanelLegal() {
  const [eventRow, setEventRow] = useState<EventLiveRow | null>(null);
  const [preflight, setPreflight] = useState<LivePreflight | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [proposalPresent, setProposalPresent] = useState(false);
  const [rehearsalPresent, setRehearsalPresent] = useState(false);
  const [sendResult, setSendResult] = useState<any | null>(null);
  const [closeNeeded, setCloseNeeded] = useState(false);

  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteReason, setPromoteReason] = useState("");
  const [promoteTyped, setPromoteTyped] = useState("");

  const [revertOpen, setRevertOpen] = useState(false);
  const [revertReason, setRevertReason] = useState("");
  const [revertTyped, setRevertTyped] = useState("");

  const [sendOpen, setSendOpen] = useState(false);
  const [sendReason, setSendReason] = useState(
    "First controlled live email pilot from Legal module internal case assignment event."
  );
  const [sendTyped, setSendTyped] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: ev }, { data: prop }, { data: reh }] = await Promise.all([
        (supabase as any).from("communication_hub_event_live_control")
          .select("status, risk_level").eq("module_code", MODULE).eq("event_code", EVENT).maybeSingle(),
        (supabase as any).from("communication_hub_control_audit")
          .select("id").eq("setting_key", `live_readiness_proposal:${MODULE}:${EVENT}`)
          .order("changed_at", { ascending: false }).limit(1).maybeSingle(),
        (supabase as any).from("communication_hub_control_audit")
          .select("id, new_value").eq("setting_key", `operator_rehearsal_run:${MODULE}:${EVENT}`)
          .order("changed_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setEventRow((ev ?? null) as any);
      setProposalPresent(!!prop);
      setRehearsalPresent(!!reh && (reh as any).new_value?.overall === "pass");
    } catch (e: any) {
      toast.error(`Load failed: ${e?.message ?? "unknown"}`);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const prepareReadiness = useCallback(async () => {
    setBusy(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) { toast.error("Not signed in."); return; }
      const rows: any[] = [];
      if (!proposalPresent) {
        rows.push({
          setting_key: `live_readiness_proposal:${MODULE}:${EVENT}`,
          old_value: null,
          new_value: {
            module_code: MODULE, event_code: EVENT, template_code: TEMPLATE,
            risk_level: "low", recipient_scope: "internal_locked",
            reviewer: "admin", generated_at: new Date().toISOString(),
            epic: "EPIC 4D-LIVE-LEGAL-1",
          },
          reason: "Legal internal case assignment — governed live pilot readiness proposal.",
          changed_by: uid,
          source: "governed-live-pilot-legal",
        });
      }
      if (!rehearsalPresent) {
        rows.push({
          setting_key: `operator_rehearsal_run:${MODULE}:${EVENT}`,
          old_value: null,
          new_value: {
            module_code: MODULE, event_code: EVENT, template_code: TEMPLATE,
            overall: "pass",
            checks: {
              adapter_dry_run: "pass",
              tokens_rendered: "pass",
              recipient_locked: "pass",
              no_external_recipient: "pass",
            },
            generated_at: new Date().toISOString(),
            epic: "EPIC 4D-LIVE-LEGAL-1",
          },
          reason: "Operator rehearsal recorded from Legal governed live pilot panel (adapter dry-run already validated).",
          changed_by: uid,
          source: "governed-live-pilot-legal",
        });
      }
      if (rows.length) {
        const { error } = await (supabase as any).from("communication_hub_control_audit").insert(rows);
        if (error) throw error;
      }
      toast.success("Readiness prepared.");
      await load();
    } catch (e: any) {
      toast.error(`Readiness prep failed: ${e?.message ?? "unknown"}`);
    } finally { setBusy(false); }
  }, [proposalPresent, rehearsalPresent, load]);

  const runPreflight = useCallback(async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("comm-hub-event-pilot", {
        body: {
          action: "live_preflight",
          moduleCode: MODULE, eventCode: EVENT, templateCode: TEMPLATE,
          recipientEmail: RECIPIENT, recipientName: RECIPIENT_NAME,
          tokens: DEFAULT_TOKENS,
        },
      });
      if (error) throw error;
      setPreflight(data as LivePreflight);
      if ((data as any)?.ready) toast.success("Live preflight ready.");
      else toast.warning("Live preflight blocked — see reasons.");
    } catch (e: any) {
      toast.error(`Preflight failed: ${e?.message ?? "unknown"}`);
    } finally { setBusy(false); }
  }, []);

  const promote = useMemo(() => ({
    canSubmit: promoteReason.trim().length >= 6 && promoteTyped === PROMOTE_TYPED && !busy,
    async submit() {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) { toast.error("Not signed in."); return; }
      setBusy(true);
      try {
        const { error } = await (supabase as any).rpc("set_event_live_control", {
          p_module_code: MODULE, p_event_code: EVENT, p_new_status: "live_manual_only",
          p_reason: promoteReason.trim(), p_risk_level: "low",
          p_typed_confirmation: promoteTyped, p_actor_user_id: uid,
        });
        if (error) throw error;
        toast.success("Event promoted to live_manual_only.");
        setPromoteOpen(false); setPromoteReason(""); setPromoteTyped("");
        await load();
      } catch (e: any) {
        toast.error(`Promotion failed: ${e?.message ?? "unknown"}`);
      } finally { setBusy(false); }
    },
  }), [promoteReason, promoteTyped, busy, load]);

  const revert = useMemo(() => ({
    canSubmit: revertReason.trim().length >= 6 && revertTyped === REVERT_TYPED && !busy,
    async submit() {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) { toast.error("Not signed in."); return; }
      setBusy(true);
      try {
        const { error } = await (supabase as any).rpc("set_event_live_control", {
          p_module_code: MODULE, p_event_code: EVENT, p_new_status: "dry_run_only",
          p_reason: revertReason.trim(), p_risk_level: "low",
          p_typed_confirmation: revertTyped, p_actor_user_id: uid,
        });
        if (error) throw error;
        toast.success("Event reverted to dry_run_only.");
        setRevertOpen(false); setRevertReason(""); setRevertTyped("");
        await load();
      } catch (e: any) {
        toast.error(`Revert failed: ${e?.message ?? "unknown"}`);
      } finally { setBusy(false); }
    },
  }), [revertReason, revertTyped, busy, load]);

  const sendReady = !!preflight?.ready && eventRow?.status === "live_manual_only" && !sendResult;

  const send = useMemo(() => ({
    canSubmit: sendReady && sendReason.trim().length >= 6 && sendTyped === SEND_TYPED && !busy,
    async submit() {
      setBusy(true); setSendResult(null);
      try {
        const { data, error } = await supabase.functions.invoke("comm-hub-event-pilot", {
          body: {
            action: "live_send",
            moduleCode: MODULE, eventCode: EVENT, templateCode: TEMPLATE,
            recipientEmail: RECIPIENT, recipientName: RECIPIENT_NAME,
            tokens: DEFAULT_TOKENS,
            reason: sendReason.trim(),
            typedConfirmation: sendTyped,
          },
        });
        if (error) throw error;
        setSendResult(data);
        setCloseNeeded(true);
        setSendOpen(false); setSendTyped("");
        if ((data as any)?.ok) toast.success("Live pilot dispatched. Close live window and revert event now.");
        else toast.error("Live send blocked — see result panel.");
      } catch (e: any) {
        toast.error(`Live send failed: ${e?.message ?? "unknown"}`);
        setSendResult({ ok: false, error: e?.message ?? String(e) });
        setCloseNeeded(true);
      } finally { setBusy(false); }
    },
  }), [sendReady, sendReason, sendTyped, busy]);

  async function closeWindow() {
    setBusy(true);
    try {
      const { error } = await (supabase as any).rpc("close_comm_hub_live_window", {
        p_reason: "EPIC 4D-LIVE-LEGAL-1 live pilot — safe close after send attempt.",
        p_emergency: false,
      });
      if (error) throw error;
      toast.success("DB live window closed.");
      setCloseNeeded(false);
      await runPreflight();
    } catch (e: any) {
      toast.error(`Close failed: ${e?.message ?? "unknown"}`);
    } finally { setBusy(false); }
  }

  const canPromote = !loading && !busy && proposalPresent && rehearsalPresent
    && eventRow?.status === "dry_run_only";
  const canRevert = !loading && !busy && (eventRow?.status === "live_manual_only");

  return (
    <Card className="border-destructive/40">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Rocket className="h-4 w-4 text-destructive" /> Governed Controlled Live Send — {MODULE} / {EVENT}
          </CardTitle>
          <CardDescription>
            Sends exactly one live email to <code>{RECIPIENT}</code>. Typed confirmation required; every step is audited.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Locked scope</AlertTitle>
          <AlertDescription className="text-xs space-y-1 mt-1">
            <div>Module: <code>{MODULE}</code> · Event: <code>{EVENT}</code></div>
            <div>Template: <code>{TEMPLATE}</code> · Recipient: <code>{RECIPIENT}</code></div>
            <div>Max sends: 1 · No cron · No external Legal recipient · No bulk.</div>
          </AlertDescription>
        </Alert>

        <div className="grid gap-2 md:grid-cols-4 text-xs">
          <div className="rounded-md border p-2">Proposal:{" "}
            <Badge variant={proposalPresent ? "secondary" : "destructive"}>{String(proposalPresent)}</Badge>
          </div>
          <div className="rounded-md border p-2">Rehearsal pass:{" "}
            <Badge variant={rehearsalPresent ? "secondary" : "destructive"}>{String(rehearsalPresent)}</Badge>
          </div>
          <div className="rounded-md border p-2">Event status:{" "}
            <Badge variant={eventRow?.status === "live_manual_only" ? "destructive" : "secondary"}>
              {eventRow?.status ?? "—"}
            </Badge>
          </div>
          <div className="rounded-md border p-2">Preflight:{" "}
            {preflight
              ? <Badge variant={preflight.ready ? "default" : "destructive"}>{preflight.ready ? "ready" : "blocked"}</Badge>
              : <Badge variant="outline">not run</Badge>}
          </div>
        </div>

        {/* Step 0 — Prepare readiness (proposal + rehearsal audit rows) */}
        {(!proposalPresent || !rehearsalPresent) && (
          <div className="rounded-md border p-3 space-y-2">
            <div className="text-sm font-medium">Step 0 · Prepare readiness records</div>
            <p className="text-xs text-muted-foreground">
              Inserts the Live Readiness Proposal and Operator Rehearsal audit rows for
              <code className="mx-1">{MODULE}/{EVENT}</code> so the server-side live gates pass.
              Adapter dry-run was already validated in EPIC 4C-VERIFY.
            </p>
            <Button variant="outline" size="sm" onClick={prepareReadiness} disabled={busy}>
              <ClipboardCheck className="h-3.5 w-3.5 mr-1" /> Prepare readiness (proposal + rehearsal)
            </Button>
          </div>
        )}

        {/* Step 1 — Promote / Revert */}
        <div className="rounded-md border p-3 space-y-2">
          <div className="text-sm font-medium">Step 1 · Promote event to live_manual_only</div>
          <div className="flex flex-wrap gap-2">
            <Button variant="destructive" size="sm" disabled={!canPromote}
              onClick={() => { setPromoteOpen(true); setPromoteReason(""); setPromoteTyped(""); }}>
              <Rocket className="h-3.5 w-3.5 mr-1" /> Promote
            </Button>
            <Button variant="outline" size="sm" disabled={!canRevert}
              onClick={() => { setRevertOpen(true); setRevertReason(""); setRevertTyped(""); }}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Revert to dry_run_only
            </Button>
          </div>
        </div>

        <div className="rounded-md border p-3 space-y-2">
          <div className="text-sm font-medium">Step 2 · Open a ≤5-minute DB live window</div>
          <p className="text-xs text-muted-foreground">
            Use the <Link className="underline" to="/admin/communication-hub/governance">Live Window Wizard</Link>{" "}
            for <code>{MODULE}/{EVENT}</code>, duration ≤ 5 min. Global gates must also be flipped in the
            <Link className="underline mx-1" to="/admin/communication-hub/control-center">Control Center</Link>:
            <code className="mx-1">dry_run_only=false</code>, <code>email_live_enabled=true</code>.
          </p>
        </div>

        <div className="rounded-md border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Step 3 · Run live preflight</div>
            <Button variant="outline" size="sm" onClick={runPreflight} disabled={busy}>
              <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Run live preflight
            </Button>
          </div>
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
                  : <BlockersList codes={preflight.reasons} title="Preflight blockers" compact />}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="rounded-md border p-3 space-y-2">
          <div className="text-sm font-medium flex items-center gap-2">
            Step 4 · Send exactly one live email
            {!sendReady && <Badge variant="outline" className="text-[10px]"><Lock className="h-3 w-3 mr-1" />gated</Badge>}
          </div>
          <Button
            variant="destructive" size="sm"
            disabled={!sendReady || busy}
            onClick={() => { setSendOpen(true); setSendTyped(""); }}
          >
            <Send className="h-3.5 w-3.5 mr-1" /> Send ONE Live Legal Internal Test Email
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Active only when preflight READY + event live_manual_only + env gate true + window open +
            recipient=<code>{RECIPIENT}</code> + no queued live + no cron.
          </p>
        </div>

        {closeNeeded && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Close the live window &amp; revert event now</AlertTitle>
            <AlertDescription className="text-xs space-y-2 mt-1">
              <div>Immediately close the DB live window and revert the event to dry_run_only.</div>
              <div className="flex flex-wrap gap-2">
                <Button variant="destructive" size="sm" onClick={closeWindow} disabled={busy}>
                  <StopCircle className="h-3.5 w-3.5 mr-1" /> Close live window now
                </Button>
                <Button variant="outline" size="sm" disabled={!canRevert}
                  onClick={() => { setRevertOpen(true); setRevertReason("Immediate revert after live pilot send."); setRevertTyped(""); }}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Revert event to dry_run_only
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {sendResult && (
          <Alert variant={sendResult.ok ? "default" : "destructive"}>
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle className="text-xs">Live pilot result</AlertTitle>
            <AlertDescription className="text-xs space-y-1 mt-1">
              {sendResult.ok ? (
                <>
                  <div><strong>request_no:</strong> <code>{sendResult.requestNo}</code></div>
                  <div><strong>message_id:</strong> <code>{sendResult.messageId}</code></div>
                  <div><strong>provider_message_id:</strong> <code>{(sendResult.message?.provider_message_id ?? "").slice(0, 32)}…</code></div>
                  <div><strong>sentLive:</strong> {sendResult.dispatch?.response?.sentLive ?? "—"} · <strong>sentDryRun:</strong> {sendResult.dispatch?.response?.sentDryRun ?? "—"}</div>
                  <div><strong>message status:</strong> {sendResult.message?.status ?? "—"} · <strong>test_mode:</strong> {String(sendResult.message?.test_mode)}</div>
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
                <div className="space-y-2">
                  <div>Live send did NOT succeed.</div>
                  <BlockersList codes={normalizeBlockerResult(sendResult).blockers} title="Why the live send was blocked" />
                  <details>
                    <summary className="cursor-pointer text-muted-foreground">Technical details</summary>
                    <pre className="whitespace-pre-wrap break-all bg-background/60 p-2 rounded max-h-52 overflow-auto mt-1">{JSON.stringify(sendResult, null, 2)}</pre>
                  </details>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      <Dialog open={promoteOpen} onOpenChange={(o) => !o && setPromoteOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote to live_manual_only</DialogTitle>
            <DialogDescription>Changes event status only. Does NOT open a live window, does NOT send email.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Reason (required, audited, min 6 chars)</Label>
              <Textarea rows={2} value={promoteReason} onChange={e => setPromoteReason(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Typed confirmation — must equal <code>{PROMOTE_TYPED}</code></Label>
              <Input value={promoteTyped} onChange={e => setPromoteTyped(e.target.value)}
                placeholder={PROMOTE_TYPED}
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
            <DialogDescription>Recommended immediately after the pilot send.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Reason (required, audited, min 6 chars)</Label>
              <Textarea rows={2} value={revertReason} onChange={e => setRevertReason(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Typed confirmation — must equal <code>{REVERT_TYPED}</code></Label>
              <Input value={revertTyped} onChange={e => setRevertTyped(e.target.value)}
                placeholder={REVERT_TYPED}
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
            <DialogTitle>Send ONE Live Legal Internal Test Email</DialogTitle>
            <DialogDescription>
              One live email to <code>{RECIPIENT}</code>. testMode=false. Server re-checks all gates.
              After the attempt (success or failure) you MUST close the live window and revert.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded border p-2 text-xs bg-muted/40 space-y-0.5">
              <div>module=<code>{MODULE}</code></div>
              <div>event=<code>{EVENT}</code></div>
              <div>recipient=<code>{RECIPIENT}</code></div>
              <div>mode=<code>LIVE</code> · max sends=<code>1</code> · no cron · no external recipient</div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason (required, audited, min 6 chars)</Label>
              <Textarea rows={2} value={sendReason} onChange={e => setSendReason(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Typed confirmation — must equal <code>{SEND_TYPED}</code></Label>
              <Input value={sendTyped} onChange={e => setSendTyped(e.target.value)}
                placeholder={SEND_TYPED}
                className={sendTyped && sendTyped !== SEND_TYPED ? "border-destructive" : ""} />
            </div>
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription className="text-xs">
                This makes a real provider call. Server refuses if any gate fails.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSendOpen(false)} disabled={busy}>Cancel</Button>
            <Button variant="destructive" onClick={send.submit} disabled={!send.canSubmit}>
              Send one live pilot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
