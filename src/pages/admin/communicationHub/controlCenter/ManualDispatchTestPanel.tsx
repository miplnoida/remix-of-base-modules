/**
 * Communication Hub Control Center — Manual One-Time Dispatch Test panel.
 *
 * Phase 1C-B8-C: dry-run only. Creates one comm_hub email message and
 * dispatches it via the targeted single-message path. Never invokes batch
 * dispatch. Never sends live email in this phase.
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
import { AlertTriangle, Send, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
  invokeManualDispatchTest,
  TYPED_CONFIRMATION,
  type ManualDispatchResult,
} from "./manualDispatchService";
import type { CommHubControlSettings } from "./controlCenterService";

interface Props {
  settings: CommHubControlSettings;
}

export function ManualDispatchTestPanel({ settings }: Props) {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [subject, setSubject] = useState("[TEST] Communication Hub manual dispatch");
  const [bodyText, setBodyText] = useState(
    "This is a Communication Hub manual dispatch test message. No live email was sent.",
  );
  const [testMode, setTestMode] = useState(true);
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ManualDispatchResult | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail.trim());
  const recipientInAllowlist = useMemo(
    () => settings.allowed_email_addresses
      .map(x => x.trim().toLowerCase())
      .includes(recipientEmail.trim().toLowerCase()),
    [recipientEmail, settings.allowed_email_addresses],
  );

  // Live sending is BLOCKED in this phase, regardless of any DB state.
  const liveBlockedThisPhase = true;
  const canSubmit =
    emailValid &&
    subject.trim().length > 0 &&
    bodyText.trim().length > 0 &&
    reason.trim().length > 0 &&
    typed === TYPED_CONFIRMATION &&
    !busy;

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
        testMode: true, // hard-forced dry-run in this phase
        reason: reason.trim(),
        typedConfirmation: typed,
      });
      setResult(res);
      if (res.ok) {
        toast.success("Manual dispatch test completed (dry-run).");
        setTyped("");
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
          One-Time Manual Dispatch Test
        </CardTitle>
        <CardDescription>
          Creates one Communication Hub email message and dispatches it in <b>targeted mode</b> (single message id only, never batch).
          This phase is <b>dry-run only</b> — no live email will be sent.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Phase 1C-B8-C — dry-run only</AlertTitle>
          <AlertDescription>
            Live sending is disabled in this workflow. The message will be marked <code>test_mode=true</code>,
            recorded as <code>skipped</code> with a <code>dry-run:</code> provider id, and no provider (e.g. Resend) will be called.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Recipient email <span className="text-destructive">*</span></Label>
            <Input value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)}
              placeholder="user@example.com" />
            {recipientEmail && !emailValid && (
              <p className="text-xs text-destructive">Invalid email address.</p>
            )}
            {recipientEmail && emailValid && !recipientInAllowlist && (
              <p className="text-[11px] text-muted-foreground">
                Not in DB allowlist — acceptable for this dry-run phase, but any future live send would be blocked.
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
              <Switch checked={testMode} disabled onCheckedChange={setTestMode} />
              <div className="text-xs text-muted-foreground">
                Locked to <b>true</b> in this phase. Live sending is blocked by the workflow.
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Reason / comment <span className="text-destructive">*</span></Label>
            <Input value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Why are you running this test?" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Typed confirmation <span className="text-destructive">*</span></Label>
            <Input value={typed} onChange={e => setTyped(e.target.value)}
              placeholder={TYPED_CONFIRMATION} />
            <p className="text-[11px] text-muted-foreground">
              Type <code>{TYPED_CONFIRMATION}</code> exactly to enable the button.
            </p>
          </div>
        </div>

        {liveBlockedThisPhase && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Live sending will be enabled in Phase 1C-B8-D after B8-A pilot receipt is re-confirmed.
              The targeted workflow prevents any other queued message from being claimed.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end">
          <Button onClick={onSubmit} disabled={!canSubmit}>
            {busy ? "Dispatching…" : "Dispatch one test message"}
          </Button>
        </div>

        {result && (
          <div className="space-y-3 rounded-md border p-3 bg-muted/30">
            <div className="text-sm font-medium flex items-center gap-2">
              Result
              <Badge variant={result.ok ? "default" : "destructive"}>
                {result.ok ? "ok" : "failed"}
              </Badge>
              {result.phaseGate?.forcedTestMode && (
                <Badge variant="secondary">dry-run forced</Badge>
              )}
            </div>
            {result.warning && (
              <p className="text-xs text-muted-foreground">{result.warning}</p>
            )}
            {result.request && (
              <div className="grid gap-1 text-xs md:grid-cols-2">
                <div>request_no: <code>{result.request.request_no}</code></div>
                <div>message_id: <code>{result.message?.id ?? "—"}</code></div>
                <div>status: <code>{result.message?.status ?? "—"}</code></div>
                <div>provider_message_id: <code>{result.message?.provider_message_id ?? "—"}</code></div>
                <div>attempts: <code>{result.attempts?.length ?? 0}</code></div>
                <div>events: <code>{result.events?.length ?? 0}</code></div>
              </div>
            )}
            {result.dispatch && (
              <div className="text-xs grid gap-1 md:grid-cols-3">
                <div>targetMode: <code>{String(result.dispatch.targetMode)}</code></div>
                <div>claimed: <code>{String(result.dispatch.claimed)}</code></div>
                <div>processed: <code>{String(result.dispatch.processed)}</code></div>
                <div>sentDryRun: <code>{String(result.dispatch.sentDryRun)}</code></div>
                <div>sentLive: <code>{String(result.dispatch.sentLive)}</code></div>
                <div>liveWindowReason: <code>{String(result.dispatch.liveWindowReason)}</code></div>
                {result.dispatch.targetNoClaimReason && (
                  <div className="md:col-span-3 text-destructive">
                    targetNoClaimReason: <code>{result.dispatch.targetNoClaimReason}</code>
                  </div>
                )}
              </div>
            )}
            {result.attempts && result.attempts.length > 0 && (
              <div className="text-xs">
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
              <div className="text-xs">
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
            {result.error && (
              <p className="text-xs text-destructive">
                {result.error}{result.detail ? `: ${result.detail}` : ""}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
