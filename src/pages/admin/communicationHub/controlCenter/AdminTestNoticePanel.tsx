/**
 * Admin Test Notice panel (Phase 1C-B9-B-A).
 *
 * Two modes:
 *  - Dry-run (default): testMode=true, typed = SEND ADMIN TEST NOTICE.
 *  - Live: testMode=false, recipient locked to rohit@mishainfotech.com,
 *          typed = SEND ONE LIVE ADMIN TEST NOTICE TO ROHIT.
 *          Live submit is disabled unless server preflight returns ready=true.
 *
 * Path (both modes): UI → comm-hub-admin-test-notice → send_communication_v1
 *                    → comm-hub-dispatch (targetMode, secret server-side).
 *
 * Under safe defaults (Phase 1C-B9-B-A) live gates are closed, so preflight
 * returns ready=false and live submit stays disabled.
 */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ShieldCheck, Send, Info, ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const DRY_RUN_TYPED = "SEND ADMIN TEST NOTICE";
const LIVE_TYPED = "SEND ONE LIVE ADMIN TEST NOTICE TO ROHIT";
const LIVE_ALLOWED_RECIPIENT = "rohit@mishainfotech.com";
const DEFAULT_NAME = "Rohit Wadhwa";

type Mode = "dry_run" | "live";
type Preflight = { ready: boolean; reasons: string[]; gates?: any };

export function AdminTestNoticePanel() {
  const [mode, setMode] = useState<Mode>("dry_run");
  const [recipientEmail, setRecipientEmail] = useState(LIVE_ALLOWED_RECIPIENT);
  const [recipientName, setRecipientName] = useState(DEFAULT_NAME);
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [preflighting, setPreflighting] = useState(false);
  const [preflight, setPreflight] = useState<Preflight | null>(null);
  const [result, setResult] = useState<any>(null);

  const expectedTyped = mode === "live" ? LIVE_TYPED : DRY_RUN_TYPED;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail.trim());
  const liveRecipientOk = recipientEmail.trim().toLowerCase() === LIVE_ALLOWED_RECIPIENT;

  const baseValid = emailValid && reason.trim().length > 0 && typed === expectedTyped && !busy;
  const canSubmit =
    mode === "dry_run"
      ? baseValid
      : baseValid && liveRecipientOk && !!preflight?.ready;

  async function runPreflight() {
    setPreflighting(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke("comm-hub-admin-test-notice", {
        body: { action: "preflight", recipientEmail: recipientEmail.trim().toLowerCase() },
      });
      if (error) {
        toast.error(`Preflight failed: ${(error as any)?.message ?? "unknown"}`);
        setPreflight({ ready: false, reasons: ["preflight_invoke_failed"] });
        return;
      }
      setPreflight({ ready: !!data?.ready, reasons: data?.reasons ?? [], gates: data?.gates });
      if (data?.ready) toast.success("Preflight: ready=true — live gates are OPEN.");
      else toast.message("Preflight: ready=false — live send blocked.");
    } catch (e: any) {
      toast.error(e?.message ?? "Preflight request failed");
      setPreflight({ ready: false, reasons: [e?.message ?? "unknown"] });
    } finally {
      setPreflighting(false);
    }
  }

  async function submit() {
    setBusy(true); setResult(null);
    try {
      const idempotencyKey =
        `comm-hub-admin-test-notice-${mode === "live" ? "b9bb-live" : "b9ba-dry"}-${crypto.randomUUID()}`;
      const { data, error } = await (supabase as any).functions.invoke("comm-hub-admin-test-notice", {
        body: {
          action: mode,
          recipientEmail: recipientEmail.trim().toLowerCase(),
          recipientName: recipientName.trim(),
          reason: reason.trim(),
          typedConfirmation: typed,
          idempotencyKey,
        },
      });
      if (error) {
        const detail = (error as any)?.context ? await (error as any).context.text().catch(() => "") : "";
        toast.error(`Admin test notice failed: ${(error as any)?.message ?? "unknown"}`);
        setResult({ ok: false, error: detail || (error as any)?.message });
        return;
      }
      setResult(data);
      if (data?.blocked) {
        toast.warning(`Live send BLOCKED: ${data?.reasons?.[0] ?? "gate check failed"}`);
      } else if (data?.ok) {
        toast.success(
          mode === "dry_run"
            ? `Dry-run enqueued & dispatched (msg ${(data.messageId ?? "").slice(0, 8)}…)`
            : `Live send completed`,
        );
        setTyped("");
      } else {
        toast.error(`Failed: ${data?.error ?? "unknown"}`);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Request failed");
      setResult({ ok: false, error: e?.message });
    } finally {
      setBusy(false);
    }
  }

  const disp = result?.dispatch?.response ?? {};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-primary" /> Admin Test Notice — COMM_HUB / ADMIN_TEST_NOTICE
        </CardTitle>
        <CardDescription>
          Internal pilot through the official Communication Hub façade
          (<code>send_communication_v1</code> RPC → <code>comm-hub-dispatch</code> targetMode).
          Live mode is server-gated: even if the UI is bypassed, the edge function refuses to
          send unless every live gate is open.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Phase 1C-B9-B-A — live-capable, gates closed</AlertTitle>
          <AlertDescription>
            Dry-run is fully exercised. Live mode requires a passing server preflight AND
            open live gates. Preflight and blocked-live audits are safe — no request, message,
            attempt, or provider call is made.
          </AlertDescription>
        </Alert>

        <div className="space-y-1.5">
          <Label>Mode</Label>
          <RadioGroup
            value={mode}
            onValueChange={(v) => { setMode(v as Mode); setTyped(""); setResult(null); setPreflight(null); }}
            className="flex gap-4"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem id="mode-dry" value="dry_run" />
              <Label htmlFor="mode-dry" className="cursor-pointer">Dry-run (safe, testMode=true)</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem id="mode-live" value="live" />
              <Label htmlFor="mode-live" className="cursor-pointer flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5 text-destructive" /> Live (gated)
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Recipient email {mode === "live" && <span className="text-xs text-muted-foreground">(locked to {LIVE_ALLOWED_RECIPIENT})</span>}</Label>
            <Input
              value={recipientEmail}
              onChange={e => setRecipientEmail(e.target.value)}
              disabled={mode === "live"}
              placeholder={LIVE_ALLOWED_RECIPIENT}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Recipient name</Label>
            <Input value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder={DEFAULT_NAME} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Reason / comment</Label>
          <Textarea rows={2} value={reason} onChange={e => setReason(e.target.value)}
            placeholder={mode === "live" ? "Live pilot — Phase 1C-B9-B-B" : "Dry-run test"} />
        </div>

        <div className="space-y-1.5">
          <Label>Typed confirmation — must equal <code>{expectedTyped}</code></Label>
          <Input value={typed} onChange={e => setTyped(e.target.value)} placeholder={expectedTyped} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">module=COMM_HUB</Badge>
          <Badge variant="secondary">event=ADMIN_TEST_NOTICE</Badge>
          <Badge variant="outline">channel=email</Badge>
          <Badge variant={mode === "live" ? "destructive" : "outline"}>
            testMode={mode === "live" ? "false (LIVE)" : "true"}
          </Badge>
        </div>

        {mode === "live" && (
          <div className="rounded-md border p-3 space-y-2 bg-muted/40">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-destructive" /> Live preflight
              </div>
              <Button size="sm" variant="outline" onClick={runPreflight} disabled={preflighting || !liveRecipientOk}>
                {preflighting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Run preflight
              </Button>
            </div>
            {preflight ? (
              <>
                <div className="text-xs">
                  ready=<strong>{String(preflight.ready)}</strong>
                  {preflight.ready ? " — live gates are OPEN" : " — live send blocked"}
                </div>
                {preflight.reasons?.length ? (
                  <ul className="text-xs list-disc pl-5 space-y-0.5 text-muted-foreground">
                    {preflight.reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                ) : null}
              </>
            ) : (
              <div className="text-xs text-muted-foreground">Run preflight to check every live gate before enabling submit.</div>
            )}
          </div>
        )}

        <div>
          <Button
            onClick={submit}
            disabled={!canSubmit}
            variant={mode === "live" ? "destructive" : "default"}
          >
            <Send className="h-4 w-4 mr-1" />
            {mode === "live" ? "Send ONE Live Admin Test Notice" : "Send Dry-Run Admin Test Notice"}
          </Button>
        </div>

        {result && (
          <Alert variant={result.ok && !result.blocked ? "default" : "destructive"}>
            <AlertTitle>
              {result.blocked ? "Live send blocked (safe)" :
               result.ok ? (mode === "live" ? "Live send completed" : "Dry-run completed") :
               "Failed"}
            </AlertTitle>
            <AlertDescription className="space-y-1 text-xs">
              {result.blocked ? (
                <>
                  <div>Server refused live send under current gates. No request/message/attempt created.</div>
                  {result.reasons?.length ? (
                    <ul className="list-disc pl-5">
                      {result.reasons.map((r: string, i: number) => <li key={i}>{r}</li>)}
                    </ul>
                  ) : null}
                </>
              ) : result.ok ? (
                <>
                  <div>Façade path: <code>{result.facadePath}</code></div>
                  <div>Request no: <code>{result.requestNo}</code> · Request id: <code>{result.requestId}</code></div>
                  <div>Message id: <code>{result.messageId}</code></div>
                  <div>Dispatch: status={result.dispatch?.status} · targetMode={String(disp.targetMode)} · claimed={disp.claimed} · processed={disp.processed} · sentDryRun={disp.sentDryRun} · sentLive={disp.sentLive}</div>
                  <div>Message: status={result.message?.status} · test_mode={String(result.message?.test_mode)} · provider_message_id=<code>{result.message?.provider_message_id}</code></div>
                  <div>Attempts: {result.attempts?.length ?? 0} · first status={result.attempts?.[0]?.status ?? "—"}</div>
                </>
              ) : (
                <div>{result.error ?? "unknown"}</div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
