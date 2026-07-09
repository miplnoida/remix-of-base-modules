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
  fetchControlSettings, updateControlSettings, type CommHubControlSettings,
} from "./controlCenterService";
import {
  ShieldAlert, ShieldCheck, PlayCircle, StopCircle, RefreshCcw, Info, Zap,
} from "lucide-react";

type WizardEventKey = "COMM_HUB/ADMIN_TEST_NOTICE";

const SELECTABLE_EVENTS: Array<{ key: WizardEventKey; label: string; module: string; event: string }> = [
  {
    key: "COMM_HUB/ADMIN_TEST_NOTICE",
    label: "COMM_HUB / ADMIN_TEST_NOTICE (admin test notice)",
    module: "COMM_HUB",
    event: "ADMIN_TEST_NOTICE",
  },
];

const OPEN_TYPED_EXPECTED_PREFIX = "OPEN LIVE WINDOW FOR";
const openTypedExpected = (key: WizardEventKey) => `${OPEN_TYPED_EXPECTED_PREFIX} ${key}`;
const CLOSE_TYPED_EXPECTED = "CLOSE LIVE WINDOW";

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

  const chosen = SELECTABLE_EVENTS.find(e => e.key === selected)!;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await fetchControlSettings();
      setSettings(s);
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

  const runPreflight = useCallback(async () => {
    if (!settings) return;
    const recipient = settings.allowed_email_addresses[0];
    if (!recipient) {
      toast.error("No allowlisted recipient configured — add one on the Allowlist card first.");
      return;
    }
    setPreflightLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("comm-hub-admin-test-notice", {
        body: { action: "preflight", recipientEmail: recipient },
      });
      if (error) throw error;
      setPreflight(data as PreflightResponse);
    } catch (e: any) {
      toast.error(`Preflight failed: ${e?.message ?? "unknown"}`);
    } finally {
      setPreflightLoading(false);
    }
  }, [settings]);

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
    const ageMin = Math.max(1, Math.min(30, settings.live_eligible_max_age_minutes ?? 30));
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
      openWindowMinutes <= 30 &&
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
              Only <code>COMM_HUB/ADMIN_TEST_NOTICE</code> is selectable in this phase.
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
              <Label>Window minutes (1–30)</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={openWindowMinutes}
                onChange={e => setOpenWindowMinutes(Math.max(1, Math.min(30, Number(e.target.value) || 15)))}
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
