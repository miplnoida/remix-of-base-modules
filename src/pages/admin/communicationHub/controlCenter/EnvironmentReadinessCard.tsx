/**
 * EPIC PROD-ENV-1 — Environment Readiness (read-only).
 *
 * Displays presence/status of production-critical secrets, env flags, DB
 * control gates, and dispatch cron. Never shows secret values. All data
 * comes from the admin-only `comm-hub-manual-dispatch-test` preflight
 * (`action: "preflight"`), which returns booleans + counts only.
 *
 * SAFETY:
 *  - No writes. No sends. No cron scheduling.
 *  - Does not change dispatch/enqueue/live-control behavior.
 *  - This card is visibility-only; it is NOT authoritative for sending.
 */
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RefreshCcw, ShieldAlert, Lock } from "lucide-react";
import { checkLiveReadiness, type LivePreflightResult } from "./manualDispatchService";

type Status = "ready" | "warning" | "blocked" | "unknown";

interface RowSpec {
  label: string;
  status: Status;
  detail: string;
  guidance?: string;
}

const STATUS_STYLE: Record<Status, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  ready:   { variant: "secondary",   label: "Ready" },
  warning: { variant: "outline",     label: "Warning" },
  blocked: { variant: "destructive", label: "Blocked" },
  unknown: { variant: "outline",     label: "Unknown" },
};

function boolBadge(v: boolean | null | undefined): JSX.Element {
  if (v === true)  return <Badge variant="secondary">yes</Badge>;
  if (v === false) return <Badge variant="destructive">no</Badge>;
  return <Badge variant="outline">unknown</Badge>;
}

export function EnvironmentReadinessCard() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [pf, setPf] = useState<LivePreflightResult | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await checkLiveReadiness();
      if (!r.ok) setErr(r.detail || r.error || "preflight_failed");
      setPf(r);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const env = pf?.envReadiness;
  const settings = (pf?.settings ?? {}) as Record<string, unknown>;

  // Compose rows. Guidance strings are meant for the operator during the
  // pre-live-test phase (dispatch off, dry-run only, cron absent).
  const envRows: RowSpec[] = env ? [
    {
      label: "RESEND_API_KEY",
      status: env.resendApiKeyPresent ? "ready" : "blocked",
      detail: env.resendApiKeyPresent ? "Present" : "Missing",
      guidance: env.resendApiKeyPresent ? undefined : "Set RESEND_API_KEY in edge function secrets.",
    },
    {
      label: "COMMUNICATION_HUB_DISPATCH_SECRET",
      status: env.dispatchSecretPresent ? "ready" : "blocked",
      detail: env.dispatchSecretPresent ? "Present" : "Missing",
      guidance: env.dispatchSecretPresent ? undefined : "Set COMMUNICATION_HUB_DISPATCH_SECRET in edge function secrets.",
    },
    {
      label: "COMMUNICATION_HUB_RESEND_WEBHOOK_SECRET",
      status: env.resendWebhookSecretPresent ? "ready" : "warning",
      detail: env.resendWebhookSecretPresent ? "Present" : "Missing",
      guidance: env.resendWebhookSecretPresent
        ? undefined
        : "Required before enabling live email so delivery/bounce webhooks verify. Set it in edge function secrets.",
    },
    {
      label: "COMMUNICATION_HUB_EMAIL_LIVE",
      status: env.emailLiveEnvPresent
        ? (env.emailLiveEnvTrue ? "warning" : "ready")
        : "warning",
      detail: env.emailLiveEnvPresent ? (env.emailLiveEnvTrue ? "true" : "false") : "not set",
      guidance: env.emailLiveEnvTrue
        ? "Live email env flag is ON. Keep this OFF until the controlled live test is authorised."
        : "Keep COMMUNICATION_HUB_EMAIL_LIVE=false until controlled live test.",
    },
    {
      label: "COMMUNICATION_HUB_EMAIL_LIVE_ALLOWLIST",
      status: env.emailLiveAllowlistConfigured ? "ready" : "warning",
      detail: env.emailLiveAllowlistConfigured
        ? `${env.emailLiveAllowlistCount} entr${env.emailLiveAllowlistCount === 1 ? "y" : "ies"} ` +
          `(${env.emailLiveAllowlistEmailCount} email · ${env.emailLiveAllowlistDomainCount} domain)`
        : "empty",
      guidance: env.emailLiveAllowlistConfigured
        ? undefined
        : "Recipient allowlist is empty. Live sends will be blocked at env layer.",
    },
    {
      label: "Dispatch cron scheduled",
      status: env.cronScheduled ? "warning" : "ready",
      detail: env.cronScheduled ? "scheduled" : "not scheduled",
      guidance: env.cronScheduled
        ? "Cron is scheduled. Confirm this is intended for the current phase."
        : "Cron is not scheduled. This is correct before first live test.",
    },
  ] : [];

  const dbRows = pf ? [
    { key: "dispatch_enabled",       value: !!settings.dispatch_enabled },
    { key: "dry_run_only",           value: !!settings.dry_run_only },
    { key: "email_live_enabled",     value: !!settings.email_live_enabled },
    { key: "allowed_email_addresses",count: Number(settings.allowed_email_addresses_count ?? 0) },
    { key: "allowed_email_domains",  count: Number(settings.allowed_email_domains_count ?? 0) },
  ] : [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 text-primary" /> Environment Readiness
          </CardTitle>
          <CardDescription>
            Presence-only diagnostic. Values of secrets are never returned to the browser.
            Not authoritative for sending — dispatch behavior is governed by server-side gates.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => void reload()} disabled={loading}>
          <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertTitle>Read-only</AlertTitle>
          <AlertDescription>
            No live sending, cron scheduling, allowlist or gate mutation is performed from this card.
          </AlertDescription>
        </Alert>

        {err && (
          <Alert variant="destructive">
            <AlertTitle>Preflight failed</AlertTitle>
            <AlertDescription className="font-mono text-[11px]">{err}</AlertDescription>
          </Alert>
        )}

        {loading && !pf && (
          <div className="text-xs text-muted-foreground">Loading environment readiness…</div>
        )}

        {env && (
          <div className="grid gap-2 md:grid-cols-2">
            {envRows.map((r) => {
              const s = STATUS_STYLE[r.status];
              return (
                <div key={r.label} className="rounded-md border p-2.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px]">{r.label}</span>
                    <Badge variant={s.variant} className="text-[10px]">{s.label}</Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground">{r.detail}</div>
                  {r.guidance && (
                    <div className="text-[10px] text-muted-foreground italic">{r.guidance}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {pf && (
          <div className="rounded-md border p-2.5 space-y-1.5">
            <div className="text-xs font-semibold">DB control gates</div>
            <div className="grid gap-2 md:grid-cols-3">
              {dbRows.map((r: any) => (
                <div key={r.key} className="flex items-center justify-between rounded-md border px-2 py-1">
                  <span className="font-mono text-[10px]">{r.key}</span>
                  {"value" in r ? boolBadge(r.value) : <Badge variant="outline">{r.count}</Badge>}
                </div>
              ))}
            </div>
            <div className="text-[10px] text-muted-foreground">
              Change these values only via Control Center with typed confirmation for high-risk keys.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default EnvironmentReadinessCard;
