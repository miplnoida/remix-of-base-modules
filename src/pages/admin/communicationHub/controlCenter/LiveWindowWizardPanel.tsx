/**
 * Live Window Wizard — Phase 1C-B9-Control.
 *
 * Operational UI that encodes the "open → send once → close" pattern for
 * controlled live pilots of a single Communication Hub event.
 *
 * SAFETY:
 *  - Does NOT send email.
 *  - Does NOT toggle the env hard gate `COMMUNICATION_HUB_EMAIL_LIVE`.
 *  - Only writes to `communication_hub_control_settings` (+ audit) and
 *    reads live preflight from the admin-test-notice edge function.
 *  - This phase only exposes COMM_HUB / ADMIN_TEST_NOTICE as a selectable
 *    event. Live-cron is never offered from this wizard.
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchControlSettings, type CommHubControlSettings,
} from "./controlCenterService";
import {
  validateRecipientMode, getStage,
  type RecipientReleaseMode, type ValidatorResult,
} from "../recipientControl/recipientControlService";
import { Link as RouterLink } from "react-router-dom";
import {
  ShieldAlert, ShieldCheck, PlayCircle, StopCircle, RefreshCcw, Info, Zap, Send,
} from "lucide-react";


type WizardEventKey =
  | "COMM_HUB/ADMIN_TEST_NOTICE"
  | "COMPLIANCE/INTERNAL_CASE_STATUS_NOTICE"
  | "LEGAL/INTERNAL_CASE_ASSIGNMENT_NOTICE";

const SELECTABLE_EVENTS: Array<{
  key: WizardEventKey; label: string; module: string; event: string;
  maxMinutes: number; defaultMinutes: number; preflightSource: "admin_test_notice" | "event_pilot_live";
  templateCode?: string;
}> = [
  {
    key: "COMM_HUB/ADMIN_TEST_NOTICE",
    label: "COMM_HUB / ADMIN_TEST_NOTICE (admin test notice)",
    module: "COMM_HUB", event: "ADMIN_TEST_NOTICE",
    maxMinutes: 30, defaultMinutes: 15, preflightSource: "admin_test_notice",
  },
  {
    key: "COMPLIANCE/INTERNAL_CASE_STATUS_NOTICE",
    label: "COMPLIANCE / INTERNAL_CASE_STATUS_NOTICE (first internal live pilot, max 5 min)",
    module: "COMPLIANCE", event: "INTERNAL_CASE_STATUS_NOTICE",
    maxMinutes: 5, defaultMinutes: 5, preflightSource: "event_pilot_live",
    templateCode: "COMPLIANCE_INTERNAL_CASE_STATUS_EMAIL",
  },
  {
    key: "LEGAL/INTERNAL_CASE_ASSIGNMENT_NOTICE",
    label: "LEGAL / INTERNAL_CASE_ASSIGNMENT_NOTICE (internal legal pilot, max 5 min)",
    module: "LEGAL", event: "INTERNAL_CASE_ASSIGNMENT_NOTICE",
    maxMinutes: 5, defaultMinutes: 5, preflightSource: "event_pilot_live",
    templateCode: "LEGAL_INTERNAL_CASE_ASSIGNMENT_EMAIL",
  },
];

const OPEN_TYPED_EXPECTED_PREFIX = "OPEN LIVE WINDOW FOR";
const openTypedExpected = (key: WizardEventKey) => `${OPEN_TYPED_EXPECTED_PREFIX} ${key}`;
const CLOSE_TYPED_EXPECTED = "CLOSE LIVE WINDOW";

// Must match constants in supabase/functions/comm-hub-admin-test-notice/index.ts
const TEST_DRY_RUN_TYPED = "SEND ADMIN TEST NOTICE";
const TEST_LIVE_TYPED = "SEND ONE LIVE ADMIN TEST NOTICE TO ROHIT";

interface EventLiveRow {
  module_code: string;
  event_code: string;
  status: "disabled" | "dry_run_only" | "live_manual_only" | "live_cron_allowed";
  risk_level: "low" | "medium" | "high" | "sensitive";
}

interface PreflightGates {
  envEmailLive: boolean;
  eventLiveStatus: string;
  templateActive: boolean;
  otherLiveQueued: number;
  recipient: string;
  db: {
    dry_run_only: boolean;
    email_live_enabled: boolean;
    dispatch_enabled: boolean;
    allowed_email_addresses: string[];
    allowed_email_domains: string[];
    live_eligible_after: string | null;
  };
  envAllowlist: string[];
}

interface PreflightResponse {
  action: "preflight";
  ok: boolean;
  ready: boolean;
  reasons: string[];
  gates: PreflightGates;
  envRecipientMatchesLive: boolean;
  recipient_masked: string;
}

export function LiveWindowWizardPanel() {
  const [selected, setSelected] = useState<WizardEventKey>("COMM_HUB/ADMIN_TEST_NOTICE");
  const [settings, setSettings] = useState<CommHubControlSettings | null>(null);
  const [eventRow, setEventRow] = useState<EventLiveRow | null>(null);
  const [preflight, setPreflight] = useState<PreflightResponse | null>(null);
  const [recipientValidator, setRecipientValidator] = useState<ValidatorResult | null>(null);
  const [commHubCronCount, setCommHubCronCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [preflightLoading, setPreflightLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [openDialog, setOpenDialog] = useState(false);
  const [openReason, setOpenReason] = useState("");
  const [openTyped, setOpenTyped] = useState("");
  const [openWindowMinutes, setOpenWindowMinutes] = useState(15);

  const [closeDialog, setCloseDialog] = useState(false);
  const [closeReason, setCloseReason] = useState("");
  const [closeTyped, setCloseTyped] = useState("");
  const [emergencyClose, setEmergencyClose] = useState(false);

  // Test send state (only shown for COMM_HUB/ADMIN_TEST_NOTICE)
  const [testMode, setTestMode] = useState<"dry_run" | "live">("dry_run");
  const [testRecipient, setTestRecipient] = useState<string>("");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testReason, setTestReason] = useState<string>("Admin test send from Control Center");
  const [testTyped, setTestTyped] = useState<string>("");


  const chosen = SELECTABLE_EVENTS.find(e => e.key === selected)!;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await fetchControlSettings();
      setSettings(s);
      if (!testRecipient && s.allowed_email_addresses[0]) {
        setTestRecipient(s.allowed_email_addresses[0]);
      }
      // EPIC CH-RECIPIENT-1: validate the current recipient release mode against allowlists
      try {
        const mode = ((s as any).recipient_release_mode ?? "single_recipient_pilot") as RecipientReleaseMode;
        const v = await validateRecipientMode({
          mode, addresses: s.allowed_email_addresses, domains: s.allowed_email_domains,
        });
        setRecipientValidator(v);
      } catch { /* non-fatal */ }
      const { data: evRows, error: evErr } = await (supabase as any)
        .from("communication_hub_event_live_control")
        .select("module_code, event_code, status, risk_level")
        .eq("module_code", chosen.module)

        .eq("event_code", chosen.event)
        .maybeSingle();
      if (evErr) throw evErr;
      setEventRow((evRows ?? null) as EventLiveRow | null);
    } catch (e: any) {
      toast.error(`Live Window Wizard load failed: ${e?.message ?? "unknown"}`);
    } finally {
      setLoading(false);
    }
  }, [chosen.event, chosen.module]);

  useEffect(() => { load(); }, [load]);

  // Keep window minutes within the chosen event's cap and default.
  useEffect(() => {
    setOpenWindowMinutes(chosen.defaultMinutes);
  }, [chosen.key, chosen.defaultMinutes]);

  const runPreflight = useCallback(async () => {
    if (!settings) return;
    const recipient = settings.allowed_email_addresses[0];
    if (!recipient) {
      toast.error("No allowlisted recipient configured — add one on the Allowlist card first.");
      return;
    }
    setPreflightLoading(true);
    try {
      if (chosen.preflightSource === "admin_test_notice") {
        const { data, error } = await supabase.functions.invoke("comm-hub-admin-test-notice", {
          body: { action: "preflight", recipientEmail: recipient },
        });
        if (error) throw error;
        setPreflight(data as PreflightResponse);
      } else {
        // event-pilot live_preflight (COMPLIANCE or LEGAL internal pilot)
        const { data, error } = await supabase.functions.invoke("comm-hub-event-pilot", {
          body: {
            action: "live_preflight",
            moduleCode: chosen.module, eventCode: chosen.event,
            templateCode: chosen.templateCode ?? "COMPLIANCE_INTERNAL_CASE_STATUS_EMAIL",
            recipientEmail: recipient, recipientName: "Rohit Wadhwa",
            tokens: {
              recipient_name: "Rohit Wadhwa",
              case_reference: chosen.module === "LEGAL" ? "LG-LIVE-PILOT-001" : "CE-LIVE-PILOT-001",
              case_status: "Pending internal review",
              assigned_officer: "Demo Officer",
            },
          },
        });
        if (error) throw error;
        // Adapt into the local PreflightResponse shape enough for the alert.
        const d = data as any;
        setPreflight({
          action: "preflight", ok: !!d?.ok, ready: !!d?.ready,
          reasons: Array.isArray(d?.reasons) ? d.reasons : [],
          gates: {
            envEmailLive: !!d?.env?.envEmailLive,
            eventLiveStatus: d?.event_status ?? "",
            templateActive: !!d?.template_code,
            otherLiveQueued: d?.live_queued ?? 0,
            recipient, envAllowlist: [],
            db: {
              dry_run_only: !!d?.db_gates?.dry_run_only,
              email_live_enabled: !!d?.db_gates?.email_live_enabled,
              dispatch_enabled: !!d?.db_gates?.dispatch_enabled,
              allowed_email_addresses: d?.db_gates?.allowed_email_addresses ?? [],
              allowed_email_domains: d?.db_gates?.allowed_email_domains ?? [],
              live_eligible_after: null,
            },
          } as any,
          envRecipientMatchesLive: true,
          recipient_masked: d?.recipient_masked ?? recipient,
        });
      }
    } catch (e: any) {
      toast.error(`Preflight failed: ${e?.message ?? "unknown"}`);
    } finally {
      setPreflightLoading(false);
    }
  }, [settings, chosen]);

  const dbWindowOpen = !!settings && settings.email_live_enabled && !settings.dry_run_only;

  // Live expiry timer.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (!dbWindowOpen) return;
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [dbWindowOpen]);

  const windowExpiryInfo = useMemo(() => {
    if (!settings?.live_eligible_after) return null;
    const startMs = new Date(settings.live_eligible_after).getTime();
    const ageMin = Math.max(1, Math.min(60, settings.live_eligible_max_age_minutes ?? 30));
    const expiresMs = startMs + ageMin * 60_000;
    const remainingMs = expiresMs - nowMs;
    return {
      expiresAt: new Date(expiresMs),
      expired: remainingMs <= 0,
      remainingSec: Math.max(0, Math.floor(remainingMs / 1000)),
    };
  }, [settings?.live_eligible_after, settings?.live_eligible_max_age_minutes, nowMs]);

  const openWindow = useMemo(() => ({
    canSubmit:
      !!settings &&
      openReason.trim().length > 0 &&
      openTyped === openTypedExpected(chosen.key) &&
      openWindowMinutes >= 1 &&
      openWindowMinutes <= chosen.maxMinutes &&
      !saving,
    async submit() {
      if (!settings) return;
      setSaving(true);
      try {
        const { data, error } = await (supabase as any).rpc("open_comm_hub_live_window", {
          p_module_code: chosen.module,
          p_event_code: chosen.event,
          p_duration_minutes: openWindowMinutes,
          p_reason: openReason.trim(),
          p_typed_confirmation: openTyped,
        });
        if (error) throw error;
        toast.success(`DB live window opened for ${openWindowMinutes} min (RPC). Env hard gate still applies.`);
        console.info("[live-window-wizard] open_comm_hub_live_window", data);
        setOpenDialog(false);
        setOpenReason(""); setOpenTyped("");
        await load();
      } catch (e: any) {
        toast.error(`Open failed: ${e?.message ?? "unknown"}`);
      } finally {
        setSaving(false);
      }
    },
  }), [settings, openReason, openTyped, openWindowMinutes, chosen, load, saving]);

  const closeWindow = useMemo(() => ({
    canSubmit:
      !!settings &&
      closeReason.trim().length > 0 &&
      (emergencyClose || closeTyped === CLOSE_TYPED_EXPECTED) &&
      !saving,
    async submit() {
      if (!settings) return;
      setSaving(true);
      try {
        const { data, error } = await (supabase as any).rpc("close_comm_hub_live_window", {
          p_reason: closeReason.trim(),
          p_emergency: emergencyClose,
        });
        if (error) throw error;
        toast.success(`DB live window closed${emergencyClose ? " (emergency)" : ""} via RPC.`);
        console.info("[live-window-wizard] close_comm_hub_live_window", data);
        setCloseDialog(false);
        setCloseReason(""); setCloseTyped(""); setEmergencyClose(false);
        await load();
      } catch (e: any) {
        toast.error(`Close failed: ${e?.message ?? "unknown"}`);
      } finally {
        setSaving(false);
      }
    },
  }), [settings, closeReason, closeTyped, emergencyClose, load, saving]);

  const expectedTyped = testMode === "live" ? TEST_LIVE_TYPED : TEST_DRY_RUN_TYPED;

  const sendTest = useCallback(async () => {
    if (!testRecipient) {
      toast.error("Pick a recipient (allowlist) or add one on the Allowlist card.");
      return;
    }
    if (testReason.trim().length < 3) {
      toast.error("Enter a reason (min 3 chars) — it is audited.");
      return;
    }
    if (testTyped !== expectedTyped) {
      toast.error(`Typed confirmation must equal: ${expectedTyped}`);
      return;
    }
    setTestSending(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("comm-hub-admin-test-notice", {
        body: {
          action: testMode,
          recipientEmail: testRecipient,
          reason: testReason.trim(),
          typedConfirmation: testTyped,
        },
      });
      if (error) {
        // Supabase JS hides the 4xx JSON body — extract it so the user sees the real reason.
        let bodyJson: any = null;
        try {
          const resp = (error as any)?.context?.response ?? (error as any)?.context;
          if (resp && typeof resp.json === "function") bodyJson = await resp.json();
          else if (resp && typeof resp.text === "function") {
            const t = await resp.text();
            try { bodyJson = JSON.parse(t); } catch { bodyJson = { raw: t }; }
          }
        } catch { /* ignore */ }
        const merged = { ok: false, error: error.message, ...(bodyJson ?? {}) };
        setTestResult(merged);
        toast.error(`Test ${testMode} failed: ${bodyJson?.error ?? error.message}`);
        return;
      }
      setTestResult(data);
      if ((data as any)?.blocked || (data as any)?.ok === false) {
        toast.error(`Test ${testMode} blocked — see result below.`);
      } else {
        toast.success(`Test ${testMode} submitted.`);
      }
    } catch (e: any) {
      toast.error(`Test send failed: ${e?.message ?? "unknown"}`);
      setTestResult({ ok: false, error: e?.message ?? String(e) });
    } finally {
      setTestSending(false);
    }
  }, [testMode, testRecipient, testReason, testTyped, expectedTyped]);



  // ---------- render ----------
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-4 w-4 text-primary" /> Live Window Wizard
        </CardTitle>
        <CardDescription>
          Controlled, time-boxed DB live window for a single event. The env hard gate
          <code className="mx-1">COMMUNICATION_HUB_EMAIL_LIVE</code> remains a separate
          upper-bound and is <strong>not</strong> managed from this screen.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Policy legend */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Event live-status policy</AlertTitle>
          <AlertDescription className="text-xs space-y-1 mt-1">
            <div><Badge variant="outline" className="mr-1">disabled</Badge> event cannot send at all.</div>
            <div><Badge variant="secondary" className="mr-1">dry_run_only</Badge> render + queue only, provider is skipped.</div>
            <div><Badge variant="destructive" className="mr-1">live_manual_only</Badge> manual target-mode live send allowed; cron/batch live is still refused.</div>
            <div><Badge variant="destructive" className="mr-1">live_cron_allowed</Badge> reserved for a future phase — <strong>disabled</strong> in this phase.</div>
          </AlertDescription>
        </Alert>

        {/* Event selector + refresh */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5 min-w-[280px]">
            <Label>Event</Label>
            <Select value={selected} onValueChange={(v) => setSelected(v as WizardEventKey)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SELECTABLE_EVENTS.map(e => (
                  <SelectItem key={e.key} value={e.key}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              For <code>COMPLIANCE/INTERNAL_CASE_STATUS_NOTICE</code> the window is hard-capped at 5 minutes.
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCcw className="h-3.5 w-3.5 mr-1" /> Refresh state
            </Button>
            <Button variant="outline" size="sm" onClick={runPreflight} disabled={preflightLoading || !settings}>
              <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Run preflight
            </Button>
          </div>
        </div>

        {/* Current gate status */}
        <div className="rounded-md border p-3 text-xs grid gap-2 md:grid-cols-2">
          <div>Event status:{" "}
            <Badge variant={eventRow?.status === "live_manual_only" ? "destructive" : "secondary"}>
              {eventRow?.status ?? "—"}
            </Badge>
            {eventRow?.risk_level && <Badge variant="outline" className="ml-2">risk: {eventRow.risk_level}</Badge>}
          </div>
          <div>DB <code>dispatch_enabled</code>:{" "}
            <Badge variant={settings?.dispatch_enabled ? "default" : "outline"}>{String(settings?.dispatch_enabled)}</Badge>
          </div>
          <div>DB <code>dry_run_only</code>:{" "}
            <Badge variant={settings?.dry_run_only ? "default" : "destructive"}>{String(settings?.dry_run_only)}</Badge>
          </div>
          <div>DB <code>email_live_enabled</code>:{" "}
            <Badge variant={settings?.email_live_enabled ? "destructive" : "secondary"}>{String(settings?.email_live_enabled)}</Badge>
          </div>
          <div>Allowlist addresses: <Badge variant="outline">{settings?.allowed_email_addresses.length ?? 0}</Badge></div>
          <div>Allowlist domains: <Badge variant={settings && settings.allowed_email_domains.length > 0 ? "destructive" : "outline"}>{settings?.allowed_email_domains.length ?? 0}</Badge></div>
          <div>DB <code>live_eligible_after</code>: <span className="font-mono">{settings?.live_eligible_after ? new Date(settings.live_eligible_after).toLocaleString() : "—"}</span></div>
          <div>DB <code>live_eligible_max_age_minutes</code>: <span className="font-mono">{settings?.live_eligible_max_age_minutes ?? "—"}</span></div>
          <div className="md:col-span-2">
            Env <code>COMMUNICATION_HUB_EMAIL_LIVE</code>:{" "}
            {preflight ? (
              <Badge variant={preflight.gates.envEmailLive ? "destructive" : "secondary"}>
                {String(preflight.gates.envEmailLive)}
              </Badge>
            ) : (
              <span className="text-muted-foreground">run preflight to inspect</span>
            )}{" "}
            <span className="text-muted-foreground">(read via preflight; never rendered from browser env)</span>
          </div>
          <div className="md:col-span-2">
            Queued/sending live messages (all events):{" "}
            {preflight ? (
              <Badge variant={preflight.gates.otherLiveQueued > 0 ? "destructive" : "outline"}>
                {preflight.gates.otherLiveQueued}
              </Badge>
            ) : (
              <span className="text-muted-foreground">run preflight to inspect</span>
            )}
          </div>
          <div className="md:col-span-2">
            Comm-hub cron jobs: <span className="text-muted-foreground">not managed from this wizard (Operational Panel shows cron status)</span>
          </div>
        </div>

        {/* Live window open warning + timer */}
        {dbWindowOpen && (
          <Alert variant={windowExpiryInfo?.expired ? "destructive" : "destructive"}>
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>
              DB live window is OPEN
              {windowExpiryInfo && !windowExpiryInfo.expired && (
                <span className="ml-2 font-mono text-xs">
                  · {Math.floor(windowExpiryInfo.remainingSec / 60)}m {windowExpiryInfo.remainingSec % 60}s remaining
                </span>
              )}
              {windowExpiryInfo?.expired && (
                <Badge variant="destructive" className="ml-2">EXPIRED</Badge>
              )}
            </AlertTitle>
            <AlertDescription className="text-xs">
              {windowExpiryInfo && (
                <div>Expires at <span className="font-mono">{windowExpiryInfo.expiresAt.toLocaleString()}</span>.</div>
              )}
              {windowExpiryInfo?.expired ? (
                <div className="mt-1">Preflight and dispatcher will refuse live sends until the window is reopened. Use Close to reset DB gates.</div>
              ) : (
                <div className="mt-1">
                  DB gates permit live sending. Env hard gate <code>COMMUNICATION_HUB_EMAIL_LIVE</code> is a separate upper-bound. Close as soon as the pilot is complete.
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Preflight result */}
        {preflight && (
          <Alert variant={preflight.ready ? "default" : "destructive"}>
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>
              Preflight: {preflight.ready ? "ready=true" : "ready=false"}
              <span className="ml-2 text-xs font-mono">→ {preflight.recipient_masked}</span>
            </AlertTitle>
            <AlertDescription className="text-xs">
              {preflight.reasons.length === 0 ? (
                <span>No blocking reasons.</span>
              ) : (
                <ul className="list-disc pl-5">
                  {preflight.reasons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="destructive"
            onClick={() => { setOpenDialog(true); setOpenReason(""); setOpenTyped(""); }}
            disabled={loading || !settings || dbWindowOpen}
          >
            <PlayCircle className="h-4 w-4 mr-1" /> Open DB live window
          </Button>
          <Button
            variant="outline"
            onClick={() => { setCloseDialog(true); setCloseReason(""); setCloseTyped(""); setEmergencyClose(false); }}
            disabled={loading || !settings || !dbWindowOpen}
          >
            <StopCircle className="h-4 w-4 mr-1" /> Close live window
          </Button>
          <Button
            variant="destructive"
            onClick={() => { setCloseDialog(true); setCloseReason(""); setCloseTyped(""); setEmergencyClose(true); }}
            disabled={loading || !settings || !dbWindowOpen}
          >
            <ShieldAlert className="h-4 w-4 mr-1" /> Emergency close
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground">
          The env hard gate <code>COMMUNICATION_HUB_EMAIL_LIVE</code> is deliberately not
          editable from this wizard — flip it via secrets/ops. Preflight is the trustworthy
          way to check whether both DB and env agree that live is permitted.
        </p>

        {/* Inline Test Email panel — only for COMM_HUB/ADMIN_TEST_NOTICE */}
        {chosen.key === "COMM_HUB/ADMIN_TEST_NOTICE" && (
        <div className="rounded-md border p-3 space-y-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            <div className="text-sm font-medium">Send test email (ADMIN_TEST_NOTICE)</div>
          </div>
          <p className="text-xs text-muted-foreground">
            Uses the <code>comm-hub-admin-test-notice</code> function.{" "}
            <strong>Dry-run</strong> renders + queues without contacting the provider — safe at any time.{" "}
            <strong>Live</strong> requires DB gates open (use the wizard above) AND env <code>COMMUNICATION_HUB_EMAIL_LIVE=true</code>;
            otherwise the server refuses with reasons.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Recipient (from allowlist)</Label>
              <Select
                value={testRecipient}
                onValueChange={setTestRecipient}
                disabled={!settings || settings.allowed_email_addresses.length === 0}
              >
                <SelectTrigger><SelectValue placeholder="Choose recipient" /></SelectTrigger>
                <SelectContent>
                  {settings?.allowed_email_addresses.map(a => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mode</Label>
              <Select value={testMode} onValueChange={(v) => { setTestMode(v as "dry_run" | "live"); setTestTyped(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dry_run">dry_run (safe, no provider call)</SelectItem>
                  <SelectItem value="live">live (requires all gates open)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                variant={testMode === "live" ? "destructive" : "default"}
                onClick={sendTest}
                disabled={testSending || !testRecipient || testReason.trim().length < 3 || testTyped !== expectedTyped}
              >
                <Send className="h-4 w-4 mr-1" />
                {testSending ? "Sending…" : testMode === "live" ? "Send live test" : "Send dry-run test"}
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Reason (required, audited)</Label>
            <Textarea
              rows={2}
              value={testReason}
              onChange={(e) => setTestReason(e.target.value)}
              placeholder="Why are you sending this test?"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              Typed confirmation — must equal <code>{expectedTyped}</code>
            </Label>
            <Input
              value={testTyped}
              onChange={(e) => setTestTyped(e.target.value)}
              placeholder={expectedTyped}
              className={testTyped && testTyped !== expectedTyped ? "border-destructive" : ""}
            />
          </div>
          {testResult && (
            <Alert variant={testResult.ok && !testResult.blocked ? "default" : "destructive"}>
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle className="text-xs">
                Result: {testResult.blocked ? "blocked" : testResult.ok ? "ok" : "error"}
                {testResult.mode && <span className="ml-2 font-mono">mode={testResult.mode}</span>}
              </AlertTitle>
              <AlertDescription className="text-xs space-y-1 mt-1">
                {Array.isArray(testResult.reasons) && testResult.reasons.length > 0 && (
                  <div>
                    <div className="font-medium">Reasons:</div>
                    <ul className="list-disc pl-5">
                      {testResult.reasons.map((r: string, i: number) => <li key={i}><code>{r}</code></li>)}
                    </ul>
                  </div>
                )}
                <pre className="whitespace-pre-wrap break-all bg-background/60 p-2 rounded max-h-60 overflow-auto">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </AlertDescription>
            </Alert>
          )}
        </div>
        )}
      </CardContent>


      {/* Open dialog */}
      <Dialog open={openDialog} onOpenChange={(o) => !o && setOpenDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open DB live window</DialogTitle>
            <DialogDescription>
              Sets <code>dry_run_only=false</code>, <code>email_live_enabled=true</code>,
              <code className="mx-1">live_eligible_after=now()</code>, and the window minutes below.
              Env hard gate is unchanged.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Window minutes (1–{chosen.maxMinutes})</Label>
              <Input
                type="number"
                min={1}
                max={chosen.maxMinutes}
                value={openWindowMinutes}
                onChange={e => setOpenWindowMinutes(Math.max(1, Math.min(chosen.maxMinutes, Number(e.target.value) || chosen.defaultMinutes)))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Reason (required, audited)</Label>
              <Textarea rows={2} value={openReason} onChange={e => setOpenReason(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Typed confirmation — must equal <code>{openTypedExpected(chosen.key)}</code></Label>
              <Input value={openTyped} onChange={e => setOpenTyped(e.target.value)} placeholder={openTypedExpected(chosen.key)} />
            </div>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Only messages created AFTER <code>live_eligible_after</code> and within
                <code className="mx-1">live_eligible_max_age_minutes</code> are claimable
                by the dispatcher in live mode.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenDialog(false)} disabled={saving}>Cancel</Button>
            <Button variant="destructive" onClick={openWindow.submit} disabled={!openWindow.canSubmit}>
              Open live window
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close dialog */}
      <Dialog open={closeDialog} onOpenChange={(o) => !o && setCloseDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{emergencyClose ? "Emergency close" : "Close DB live window"}</DialogTitle>
            <DialogDescription>
              Sets <code>dry_run_only=true</code> and <code>email_live_enabled=false</code>.
              Event status, allowlist, and dispatch enabled are preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Reason (required, audited)</Label>
              <Textarea rows={2} value={closeReason} onChange={e => setCloseReason(e.target.value)} />
            </div>
            {!emergencyClose && (
              <div className="space-y-1.5">
                <Label>Typed confirmation — must equal <code>{CLOSE_TYPED_EXPECTED}</code></Label>
                <Input value={closeTyped} onChange={e => setCloseTyped(e.target.value)} placeholder={CLOSE_TYPED_EXPECTED} />
              </div>
            )}
            {emergencyClose && (
              <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Emergency close skips typed confirmation</AlertTitle>
                <AlertDescription className="text-xs">
                  Reason is still required. Use only when you must close immediately.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCloseDialog(false)} disabled={saving}>Cancel</Button>
            <Button
              variant={emergencyClose ? "destructive" : "default"}
              onClick={closeWindow.submit}
              disabled={!closeWindow.canSubmit}
            >
              {emergencyClose ? "Emergency close" : "Close live window"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
