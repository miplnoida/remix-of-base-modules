/**
 * Admin Test Notice panel (Phase 1C-B9-A).
 *
 * Internal COMM_HUB / ADMIN_TEST_NOTICE dry-run pilot. Runs through the
 * OFFICIAL Communication Hub façade path:
 *   UI  →  comm-hub-admin-test-notice (admin edge)
 *       →  send_communication_v1 RPC (SECURITY DEFINER)
 *       →  comm-hub-dispatch (targetMode, dispatch secret server-side)
 *
 * testMode is locked to true in this phase. No live email is possible from
 * this panel.
 */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShieldCheck, Send, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const TYPED = "SEND ADMIN TEST NOTICE";
const DEFAULT_EMAIL = "rohit@mishainfotech.com";
const DEFAULT_NAME = "Rohit Wadhwa";

type Result = {
  ok: boolean;
  error?: string;
  facadePath?: string;
  moduleCode?: string;
  eventCode?: string;
  requestId?: string | null;
  requestNo?: string | null;
  messageId?: string | null;
  dispatch?: { status?: number; response?: any };
  message?: any;
  attempts?: any[];
};

export function AdminTestNoticePanel() {
  const [recipientEmail, setRecipientEmail] = useState(DEFAULT_EMAIL);
  const [recipientName, setRecipientName] = useState(DEFAULT_NAME);
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail.trim());
  const canSubmit = emailValid && reason.trim().length > 0 && typed === TYPED && !busy;

  async function submit() {
    setBusy(true); setResult(null);
    try {
      const idempotencyKey = `comm-hub-admin-test-notice-b9a-${crypto.randomUUID()}`;
      const { data, error } = await (supabase as any).functions.invoke("comm-hub-admin-test-notice", {
        body: {
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
      setResult(data as Result);
      if (data?.ok) {
        toast.success(`Dry-run enqueued & dispatched (message ${(data.messageId ?? "").slice(0, 8)}…)`);
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
          Internal dry-run pilot through the official Communication Hub façade
          (<code>send_communication_v1</code> RPC → <code>comm-hub-dispatch</code> targetMode).
          testMode is locked to <strong>true</strong>. No live email is sent from this panel.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Phase 1C-B9-A — dry-run only</AlertTitle>
          <AlertDescription>
            Proves the façade/resolver/enqueue/target-dispatch path end-to-end without touching live gates.
            Live gates, cron, and provider settings are not modified.
          </AlertDescription>
        </Alert>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Recipient email</Label>
            <Input value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder={DEFAULT_EMAIL} />
          </div>
          <div className="space-y-1.5">
            <Label>Recipient name</Label>
            <Input value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder={DEFAULT_NAME} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Reason / comment</Label>
          <Textarea rows={2} value={reason} onChange={e => setReason(e.target.value)}
            placeholder="B9-A internal admin test notice dry-run" />
        </div>

        <div className="space-y-1.5">
          <Label>Typed confirmation — must equal <code>{TYPED}</code></Label>
          <Input value={typed} onChange={e => setTyped(e.target.value)} placeholder={TYPED} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">module=COMM_HUB</Badge>
          <Badge variant="secondary">event=ADMIN_TEST_NOTICE</Badge>
          <Badge variant="outline">channel=email</Badge>
          <Badge variant="outline">testMode=true (locked)</Badge>
        </div>

        <div>
          <Button onClick={submit} disabled={!canSubmit}>
            <Send className="h-4 w-4 mr-1" /> Send Dry-Run Admin Test Notice
          </Button>
        </div>

        {result && (
          <Alert variant={result.ok ? "default" : "destructive"}>
            <AlertTitle>{result.ok ? "Dry-run completed" : "Dry-run failed"}</AlertTitle>
            <AlertDescription className="space-y-1 text-xs">
              {result.ok ? (
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
