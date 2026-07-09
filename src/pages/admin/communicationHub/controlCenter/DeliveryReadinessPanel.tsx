/**
 * Communication Hub Control Center — Delivery Readiness Panel (Phase 1C-B8-E).
 *
 * Read-only visibility for:
 *  - Resend webhook endpoint URL (constructed from Supabase URL; never a secret)
 *  - Webhook activity summary (from communication_hub_delivery_event)
 *  - Sender-domain DNS checklist (manual guidance, no DNS writes)
 *
 * NEVER exposes the webhook signing secret, provider API keys, or service role.
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Info, Webhook } from "lucide-react";
import { fetchDeliveryWebhookSummary, type DeliveryWebhookSummary } from "./operationalService";

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL ?? "";
const WEBHOOK_URL = SUPABASE_URL
  ? `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/comm-hub-resend-webhook`
  : "/functions/v1/comm-hub-resend-webhook";

export function DeliveryReadinessPanel() {
  const [summary, setSummary] = useState<DeliveryWebhookSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchDeliveryWebhookSummary(1440)
      .then(setSummary)
      .catch((e) => setErr(e?.message ?? "Failed to load webhook summary"));
  }, []);

  const anyEvents = (summary?.events_total ?? 0) > 0;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Webhook className="h-4 w-4 text-primary" /> Resend Webhook — Setup Checklist
          </CardTitle>
          <CardDescription>
            Configure this endpoint in the Resend dashboard to receive delivery lifecycle events.
            No secret is displayed here; presence is inferred from received events.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="rounded-md border p-3 space-y-1">
            <div className="text-[10px] uppercase text-muted-foreground">Endpoint URL</div>
            <code className="text-xs break-all">{WEBHOOK_URL}</code>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <ChecklistRow
              label="Webhook signing secret configured (COMMUNICATION_HUB_RESEND_WEBHOOK_SECRET)"
              state={anyEvents ? "ok" : "unknown"}
              hint="Value is server-only; a successful signed event proves it is configured."
            />
            <ChecklistRow
              label="Delivery webhook active (events received in last 24h)"
              state={anyEvents ? "ok" : "unknown"}
            />
            <ChecklistRow
              label="Last webhook received at"
              state={summary?.last_event_at ? "ok" : "unknown"}
              value={summary?.last_event_at ? new Date(summary.last_event_at).toLocaleString() : "—"}
            />
            <ChecklistRow
              label="Recent delivery events (24h)"
              state={anyEvents ? "ok" : "unknown"}
              value={String(summary?.events_total ?? 0)}
            />
          </div>

          {err && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{err}</AlertDescription>
            </Alert>
          )}

          {summary && (
            <div className="grid gap-2 md:grid-cols-4 text-xs">
              {Object.entries(summary.by_type).map(([t, c]) => (
                <div key={t} className="rounded-md border p-2 flex items-center justify-between gap-2">
                  <code className="text-[11px]">{t}</code>
                  <Badge variant="outline" className="text-[10px]">{c}</Badge>
                </div>
              ))}
              {summary.events_total === 0 && (
                <div className="md:col-span-4 text-muted-foreground text-xs">
                  No webhook events received in the last 24 hours. Delivery status will remain "unknown"
                  until Resend is configured to POST here.
                </div>
              )}
            </div>
          )}

          {summary && summary.sent_no_webhook_24h > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>{summary.sent_no_webhook_24h} live email(s) sent without a webhook confirmation</AlertTitle>
              <AlertDescription>
                Provider accepted these messages but Resend has not yet reported delivery status.
                Confirm the webhook is configured and pointing at the endpoint above.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sender-Domain DNS Readiness (manual)</CardTitle>
          <CardDescription>
            Read-only guidance. This panel does NOT perform DNS changes. Update records at your DNS
            provider using the exact values shown in the Resend dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ManualCheck label="SPF: single v=spf1 record on the sending domain that includes Resend" />
          <ManualCheck label="DKIM: resend._domainkey CNAME/TXT verified in Resend dashboard" />
          <ManualCheck label="DMARC: exactly one _dmarc TXT record (no duplicates, no conflicting policies)" />
          <ManualCheck label="DMARC alignment: SPF and DKIM domain aligned with the From: domain" />
          <ManualCheck label="Sender domain shows 'Verified' in the Resend dashboard before any live send" />
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Duplicate DMARC records or SPF absent while DMARC policy is quarantine/reject typically
              causes emails to land in Spam or be silently dropped by corporate mail filters.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </>
  );
}

function ChecklistRow({
  label, state, value, hint,
}: { label: string; state: "ok" | "unknown" | "bad"; value?: string; hint?: string }) {
  const icon = state === "ok"
    ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
    : state === "bad"
      ? <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
      : <Info className="h-4 w-4 text-muted-foreground shrink-0" />;
  return (
    <div className="rounded-md border p-2 flex items-start gap-2">
      {icon}
      <div className="flex-1 min-w-0">
        <div className="text-xs">{label}</div>
        {value && <div className="text-[11px] font-mono text-muted-foreground">{value}</div>}
        {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
      </div>
      <Badge variant={state === "ok" ? "default" : "outline"} className="text-[10px]">{state}</Badge>
    </div>
  );
}

function ManualCheck({ label }: { label: string }) {
  return (
    <div className="rounded-md border p-2 flex items-start gap-2">
      <Info className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="text-xs flex-1">{label}</div>
      <Badge variant="outline" className="text-[10px]">manual</Badge>
    </div>
  );
}
