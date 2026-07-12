/**
 * Communication Hub Control Center — Manual One-Time Dispatch panel.
 *
 * Phase 1C-B8-D-A: dry-run still works. Live mode is live-capable but
 * blocked under current safe gates (backend enforced). Also exposes a
 * "Check Live Readiness" preflight action which creates nothing.
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Send, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  invokeManualDispatchTest,
  checkLiveReadiness,
  TYPED_CONFIRMATION,
  TYPED_CONFIRMATION_LIVE,
  type ManualDispatchResult,
  type LivePreflightResult,
} from "./manualDispatchService";
import type { CommHubControlSettings } from "./controlCenterService";
import { BlockersList } from "@/pages/admin/communicationHub/safety/BlockersList";
import { normalizeBlockerResult, summarizeBlockersForToast } from "@/pages/admin/communicationHub/safety/blockerResult";

interface Props {
  settings: CommHubControlSettings;
}

type Mode = "dry-run" | "live";

export function ManualDispatchTestPanel({ settings }: Props) {
  const [mode, setMode] = useState<Mode>("dry-run");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [subject, setSubject] = useState("[TEST] Communication Hub manual dispatch");
  const [bodyText, setBodyText] = useState(
    "This is a Communication Hub manual dispatch test message.",
  );
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ManualDispatchResult | null>(null);
  const [preflight, setPreflight] = useState<LivePreflightResult | null>(null);
  const [preflightBusy, setPreflightBusy] = useState(false);

  const isLive = mode === "live";
  const requiredTyped = isLive ? TYPED_CONFIRMATION_LIVE : TYPED_CONFIRMATION;

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail.trim());
  const recipientDomain = useMemo(() => {
    const e = recipientEmail.trim().toLowerCase();
    const at = e.indexOf("@");
    return at > 0 ? e.slice(at + 1) : "";
  }, [recipientEmail]);
  const recipientAllowlisted = useMemo(() => {
    const e = recipientEmail.trim().toLowerCase();
    if (!e) return false;
    const addrs = (settings.allowed_email_addresses ?? []).map(x => x.trim().toLowerCase());
    const doms = (settings.allowed_email_domains ?? []).map(x => x.trim().toLowerCase());
    return addrs.includes(e) || (recipientDomain.length > 0 && doms.includes(recipientDomain));
  }, [recipientEmail, recipientDomain, settings.allowed_email_addresses, settings.allowed_email_domains]);
  const allowlistConfigured =
    (settings.allowed_email_addresses?.length ?? 0) > 0 ||
    (settings.allowed_email_domains?.length ?? 0) > 0;

  // Client-side pre-check (backend still enforces every gate).
  const localLiveBlockers = useMemo(() => {
    const r: string[] = [];
    if (settings.dry_run_only) r.push("DB dry_run_only=true");
    if (!settings.email_live_enabled) r.push("DB email_live_enabled=false");
    if (!settings.live_eligible_after) r.push("DB live_eligible_after not set");
    if (!allowlistConfigured) {
      r.push("DB allowlist empty — configure allowed_email_addresses or allowed_email_domains in Control Center");
    } else if (emailValid && !recipientAllowlisted) {
      r.push("recipient not permitted by Control Center allowlist");
    }
    return r;
  }, [settings, allowlistConfigured, recipientAllowlisted, emailValid]);

  const preflightReady = preflight?.ready === true;

  const commonValid =
    emailValid &&
    subject.trim().length > 0 &&
    bodyText.trim().length > 0 &&
    reason.trim().length > 0 &&
    typed === requiredTyped &&
    !busy;

  const canSubmit = isLive
    ? commonValid && recipientAllowlisted && preflightReady
    : commonValid;

  async function onCheckReadiness() {
    setPreflightBusy(true);
    setPreflight(null);
    try {
      const r = await checkLiveReadiness(recipientEmail.trim() || undefined);
      setPreflight(r);
      if (r.ready) toast.success("Live gates are OPEN.");
      else toast.message("Live gates are BLOCKED.", { description: summarizeBlockersForToast(r) });
    } catch (e: any) {
      toast.error(e?.message ?? "Preflight failed");
    } finally {
      setPreflightBusy(false);
    }
  }

  async function onSubmit() {
    if (!canSubmit) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await invokeManualDispatchTest({
        recipientEmail: recipientEmail.trim(),
        recipientName: recipientName.trim(),
        subject: subject.trim(),
        bodyText: bodyText.trim(),
        testMode: !isLive,
        executeLive: isLive,
        reason: reason.trim(),
        typedConfirmation: typed,
      });
      setResult(res);
      if (res.ok && !res.blocked) {
        toast.success(isLive ? "Live dispatch accepted." : "Manual dispatch test completed (dry-run).");
        setTyped("");
      } else if (res.blocked) {
        toast.message("Live send blocked by backend gates.", {
          description: summarizeBlockersForToast(res),
        });
      } else {
        toast.error(res.error ?? "Manual dispatch failed");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Manual dispatch failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Send className="h-4 w-4 text-primary" />
          One-Time Manual Dispatch
        </CardTitle>
        <CardDescription>
          Sends a single message. Live mode remains blocked by the backend until every gate is open.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Mode selector */}
        <div className="flex items-center gap-3 rounded-md border p-3 bg-muted/40">
          <div className="text-sm font-medium">Mode</div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant={mode === "dry-run" ? "default" : "outline"}
              onClick={() => { setMode("dry-run"); setTyped(""); setResult(null); }}>
              Dry-run (safe)
            </Button>
            <Button size="sm" variant={mode === "live" ? "default" : "outline"}
              onClick={() => { setMode("live"); setTyped(""); setResult(null); }}>
              Live (gated)
            </Button>
          </div>
          <div className="ml-auto text-xs text-muted-foreground">
            Live recipients are governed by the Control Center allowlist.
          </div>
        </div>

        {!isLive && (
          <Alert>
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Dry-run mode</AlertTitle>
            <AlertDescription>
              Message will be marked <code>test_mode=true</code>, recorded as <code>skipped</code> with a
              {" "}<code>dry-run:</code> provider id, and no provider (e.g. Resend) will be called.
            </AlertDescription>
          </Alert>
        )}

        {isLive && (
          <Alert variant={preflightReady ? "default" : "destructive"}>
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Live mode — {preflightReady ? "gates OPEN" : "BLOCKED"}</AlertTitle>
            <AlertDescription className="space-y-2">
              <div>
                Backend enforces every gate. Use <b>Check Live Readiness</b> before attempting a live submit.
              </div>
              {localLiveBlockers.length > 0 && (
                <ul className="list-disc pl-5 text-xs">
                  {localLiveBlockers.map(r => <li key={r}>{r}</li>)}
                </ul>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Recipient email <span className="text-destructive">*</span></Label>
            <Input value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)}
              placeholder="user@example.com" />
            {recipientEmail && !emailValid && (
              <p className="text-xs text-destructive">Invalid email address.</p>
            )}
            {isLive && recipientEmail && emailValid && !recipientAllowlisted && (
              <p className="text-xs text-destructive">
                Recipient is not permitted by the Control Center allowlist.
              </p>
            )}
            {!isLive && recipientEmail && emailValid && !recipientAllowlisted && (
              <p className="text-[11px] text-muted-foreground">
                Not in allowlist — acceptable for dry-run; live would be blocked.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Recipient name</Label>
            <Input value={recipientName} onChange={e => setRecipientName(e.target.value)}
              placeholder="Optional" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Subject <span className="text-destructive">*</span></Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Body <span className="text-destructive">*</span></Label>
            <Textarea rows={4} value={bodyText} onChange={e => setBodyText(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Test mode</Label>
            <div className="flex items-center gap-3 rounded-md border p-3 bg-muted/40">
              <Switch checked={!isLive} disabled />
              <div className="text-xs text-muted-foreground">
                {isLive
                  ? <>Live requested — <b>test_mode=false</b>. Backend gates must be OPEN.</>
                  : <>Locked to <b>true</b> in dry-run mode.</>}
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Reason / comment <span className="text-destructive">*</span></Label>
            <Input value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Why are you running this?" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Typed confirmation <span className="text-destructive">*</span></Label>
            <Input value={typed} onChange={e => setTyped(e.target.value)}
              placeholder={requiredTyped} />
            <p className="text-[11px] text-muted-foreground">
              Type <code>{requiredTyped}</code> exactly to enable the button.
            </p>
          </div>
        </div>

        {isLive && (
          <div className="space-y-3 rounded-md border p-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <div className="text-sm font-medium">Live readiness preflight</div>
              <Button size="sm" variant="outline" className="ml-auto"
                onClick={onCheckReadiness} disabled={preflightBusy}>
                {preflightBusy ? "Checking…" : "Check Live Readiness"}
              </Button>
            </div>
            {preflight && (
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant={preflight.ready ? "default" : "destructive"}>
                    {preflight.ready ? "ready" : "blocked"}
                  </Badge>
                  {typeof preflight.envEmailLive === "boolean" && (
                    <Badge variant="secondary">envEmailLive={String(preflight.envEmailLive)}</Badge>
                  )}
                  {typeof preflight.envAllowlistOk === "boolean" && (
                    <Badge variant="secondary">envAllowlist={String(preflight.envAllowlistOk)}</Badge>
                  )}
                  {preflight.cronPresent !== undefined && (
                    <Badge variant="secondary">cronPresent={String(preflight.cronPresent)}</Badge>
                  )}
                </div>
                {(preflight.reasons ?? []).length > 0 && (
                  <BlockersList codes={preflight.reasons} title="Preflight blockers" compact />
                )}
                {preflight.gates && (
                  <details>
                    <summary className="cursor-pointer text-muted-foreground">gates</summary>
                    <pre className="mt-1 text-[10px] whitespace-pre-wrap">{JSON.stringify(preflight.gates, null, 2)}</pre>
                  </details>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={onSubmit} disabled={!canSubmit}
            variant={isLive ? "destructive" : "default"}>
            {busy ? "Working…" : isLive ? "Send live email" : "Dispatch one test message"}
          </Button>
        </div>

        {isLive && !preflightReady && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Live submit is disabled until preflight reports <code>ready=true</code>. Backend will still block
              any attempt whose gates are not open — this is defence in depth, not the only gate.
            </AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-3 rounded-md border p-3 bg-muted/30">
            <div className="text-sm font-medium flex items-center gap-2">
              Result
              <Badge variant={result.ok && !result.blocked ? "default" : "destructive"}>
                {result.blocked ? "blocked" : result.ok ? "ok" : "failed"}
              </Badge>
              {result.mode && <Badge variant="secondary">{result.mode}</Badge>}
            </div>
            {result.warning && (
              <p className="text-xs text-muted-foreground">{result.warning}</p>
            )}
            {result.reason && (
              <p className="text-xs">reason: <code>{result.reason}</code></p>
            )}
            {result.reasons && result.reasons.length > 0 && (
              <BlockersList codes={result.reasons} title="Blockers" compact />
            )}
            {result.error && (
              <p className="text-xs text-destructive">
                {result.error}{result.detail ? `: ${result.detail}` : ""}
              </p>
            )}
            <details className="text-xs">
              <summary className="cursor-pointer font-medium">Technical details</summary>
              <div className="mt-2 space-y-2">
                {result.request && (
                  <div className="grid gap-1 md:grid-cols-2">
                    <div>request_no: <code>{result.request.request_no}</code></div>
                    <div>message_id: <code>{result.message?.id ?? "—"}</code></div>
                    <div>status: <code>{result.message?.status ?? "—"}</code></div>
                    <div>provider_message_id: <code>{result.message?.provider_message_id ?? "—"}</code></div>
                    <div>attempts: <code>{result.attempts?.length ?? 0}</code></div>
                    <div>events: <code>{result.events?.length ?? 0}</code></div>
                  </div>
                )}
                {result.dispatch && (
                  <div className="grid gap-1 md:grid-cols-3">
                    <div>targetMode: <code>{String(result.dispatch.targetMode)}</code></div>
                    <div>claimed: <code>{String(result.dispatch.claimed)}</code></div>
                    <div>processed: <code>{String(result.dispatch.processed)}</code></div>
                    <div>sentDryRun: <code>{String(result.dispatch.sentDryRun)}</code></div>
                    <div>sentLive: <code>{String(result.dispatch.sentLive)}</code></div>
                    <div>liveWindowReason: <code>{String(result.dispatch.liveWindowReason)}</code></div>
                  </div>
                )}
                {result.attempts && result.attempts.length > 0 && (
                  <div>
                    <div className="font-medium mb-1">Attempts</div>
                    <ul className="space-y-1">
                      {result.attempts.map((a: any) => (
                        <li key={a.id} className="font-mono">
                          #{a.attempt_no} {a.status} pmid=<code>{a.provider_message_id ?? "—"}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.events && result.events.length > 0 && (
                  <div>
                    <div className="font-medium mb-1">Event log</div>
                    <ul className="space-y-1 max-h-40 overflow-y-auto">
                      {result.events.map((e: any) => (
                        <li key={e.id} className="font-mono">
                          {new Date(e.created_at).toLocaleTimeString()} {e.event_type} — {(e.payload?.stage ?? e.source)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
