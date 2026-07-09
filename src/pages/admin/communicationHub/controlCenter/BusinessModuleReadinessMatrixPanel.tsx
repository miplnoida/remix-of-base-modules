/**
 * Business Module Readiness Matrix (EPIC 2A, read-only).
 *
 * Read-only overview joining the pilot event catalogue with:
 *  - communication_hub_event_live_control
 *  - core_template + core_template_version (active version + required tokens)
 *  - notification_providers (email provider availability)
 *  - communication_hub_control_settings (tracking policy)
 *  - communication_message (last dry-run for module+event)
 *
 * NO writes, NO dispatch, NO provider calls.
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCcw, ShieldCheck, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PILOT_EVENT_CATALOGUE, type PilotEvent } from "./pilotEventCatalogue";

interface MatrixRow extends PilotEvent {
  liveControlStatus: string | null;
  riskLevelDb: string | null;
  templateExists: boolean;
  activeVersionExists: boolean;
  templateVersionNo: number | null;
  providerAvailable: boolean;
  trackingPolicy: string;
  lastDryRunRequestNo: string | null;
  lastDryRunStatus: string | null;
  lastDryRunAt: string | null;
  blockers: string[];
  recommendation: string;
}

async function loadRow(evt: PilotEvent): Promise<MatrixRow> {
  const blockers: string[] = [];

  const [liveCtrl, tpl, prov, settings] = await Promise.all([
    (supabase as any).from("communication_hub_event_live_control")
      .select("status, risk_level")
      .eq("module_code", evt.moduleCode).eq("event_code", evt.eventCode).maybeSingle(),
    (supabase as any).from("core_template")
      .select("id, is_active, active_version_id")
      .eq("code", evt.templateCode).maybeSingle(),
    (supabase as any).from("notification_providers")
      .select("id, is_active, channel")
      .eq("channel", "email").eq("is_active", true).limit(1),
    (supabase as any).from("communication_hub_control_settings")
      .select("open_tracking_default, click_tracking_default").limit(1).maybeSingle(),
  ]);

  const liveControlStatus = liveCtrl.data?.status ?? null;
  const riskLevelDb = liveCtrl.data?.risk_level ?? null;
  if (!liveCtrl.data) blockers.push("event_live_control_missing");
  else if (liveCtrl.data.status === "disabled") blockers.push("event_disabled");

  const templateExists = !!tpl.data;
  const activeVersionExists = !!tpl.data?.active_version_id && !!tpl.data?.is_active;
  if (!templateExists) blockers.push("template_missing");
  else if (!activeVersionExists) blockers.push("template_inactive_or_no_active_version");

  let templateVersionNo: number | null = null;
  if (tpl.data?.active_version_id) {
    const { data: ver } = await (supabase as any).from("core_template_version")
      .select("version_no").eq("id", tpl.data.active_version_id).maybeSingle();
    templateVersionNo = ver?.version_no ?? null;
  }

  const providerAvailable = Array.isArray(prov.data) && prov.data.length > 0;
  if (!providerAvailable) blockers.push("email_provider_unavailable");

  const openT = !!settings.data?.open_tracking_default;
  const clickT = !!settings.data?.click_tracking_default;
  const trackingPolicy = openT || clickT
    ? `open=${openT} click=${clickT}` : "off";

  // last dry-run: query most recent testMode=true message for this module+event
  const { data: lastReq } = await (supabase as any)
    .from("communication_request")
    .select("id, request_no, status, created_at, module_code, event_code")
    .eq("module_code", evt.moduleCode)
    .eq("event_code", evt.eventCode)
    .order("created_at", { ascending: false })
    .limit(1);
  const lastDryRunRequestNo = lastReq?.[0]?.request_no ?? null;
  const lastDryRunStatus = lastReq?.[0]?.status ?? null;
  const lastDryRunAt = lastReq?.[0]?.created_at ?? null;

  let recommendation = "Ready for pilot dry-run.";
  if (blockers.length) recommendation = `Resolve blockers: ${blockers.join(", ")}`;
  else if (!lastDryRunRequestNo) recommendation = "Run first dry-run via Generic Event Pilot.";
  else recommendation = "Dry-run history present. Continue observing; do NOT go live in this phase.";

  return {
    ...evt,
    liveControlStatus, riskLevelDb,
    templateExists, activeVersionExists, templateVersionNo,
    providerAvailable, trackingPolicy,
    lastDryRunRequestNo, lastDryRunStatus, lastDryRunAt,
    blockers, recommendation,
  };
}

function statusBadge(status: string | null) {
  if (!status) return <Badge variant="destructive">missing</Badge>;
  if (status === "disabled") return <Badge variant="destructive">{status}</Badge>;
  if (status === "dry_run_only") return <Badge variant="secondary">{status}</Badge>;
  if (status === "live_manual_only") return <Badge>{status}</Badge>;
  if (status === "live_cron_allowed") return <Badge variant="destructive">{status}</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

export function BusinessModuleReadinessMatrixPanel() {
  const [rows, setRows] = useState<MatrixRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    try {
      const result = await Promise.all(PILOT_EVENT_CATALOGUE.map(loadRow));
      setRows(result);
    } finally { setLoading(false); }
  }

  useEffect(() => { void reload(); }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" /> Business Module Readiness Matrix
          </CardTitle>
          <CardDescription>
            Read-only overview of module/event onboarding readiness. Data is joined from
            the pilot catalogue, event live-control, core template registry, provider
            settings, and Hub request history. No writes here.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
          <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading readiness matrix…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-2 border-b">Module / Event</th>
                  <th className="p-2 border-b">Channels</th>
                  <th className="p-2 border-b">Live status</th>
                  <th className="p-2 border-b">Risk</th>
                  <th className="p-2 border-b">Template</th>
                  <th className="p-2 border-b">Tokens</th>
                  <th className="p-2 border-b">Provider</th>
                  <th className="p-2 border-b">Tracking</th>
                  <th className="p-2 border-b">Last dry-run</th>
                  <th className="p-2 border-b">Blockers</th>
                  <th className="p-2 border-b">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={`${r.moduleCode}:${r.eventCode}`} className="align-top border-b">
                    <td className="p-2">
                      <div className="font-mono text-[11px]">{r.moduleCode}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{r.eventCode}</div>
                      <div className="text-xs mt-0.5">{r.eventName}</div>
                    </td>
                    <td className="p-2">
                      {r.defaultChannels.map(c => <Badge key={c} variant="outline" className="mr-1">{c}</Badge>)}
                    </td>
                    <td className="p-2">{statusBadge(r.liveControlStatus)}</td>
                    <td className="p-2"><Badge variant="outline">{r.riskLevelDb ?? r.risk}</Badge></td>
                    <td className="p-2">
                      <div className="font-mono text-[10px]">{r.templateCode}</div>
                      <div>
                        {r.templateExists
                          ? (r.activeVersionExists
                            ? <Badge variant="secondary">v{r.templateVersionNo ?? "?"}</Badge>
                            : <Badge variant="destructive">no active version</Badge>)
                          : <Badge variant="destructive">missing</Badge>}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="text-[10px] font-mono">{r.requiredTokens.join(", ")}</div>
                    </td>
                    <td className="p-2">
                      {r.providerAvailable
                        ? <Badge variant="secondary">email OK</Badge>
                        : <Badge variant="destructive">no provider</Badge>}
                    </td>
                    <td className="p-2"><Badge variant="outline">{r.trackingPolicy}</Badge></td>
                    <td className="p-2">
                      {r.lastDryRunRequestNo ? (
                        <>
                          <div className="font-mono text-[10px]">{r.lastDryRunRequestNo}</div>
                          <div className="text-[10px] text-muted-foreground">{r.lastDryRunStatus}</div>
                        </>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="p-2">
                      {r.blockers.length === 0
                        ? <Badge variant="secondary">none</Badge>
                        : (
                          <div className="flex items-start gap-1">
                            <AlertTriangle className="h-3 w-3 text-destructive mt-0.5" />
                            <div className="text-[10px]">{r.blockers.join(", ")}</div>
                          </div>
                        )}
                    </td>
                    <td className="p-2 text-[11px]">{r.recommendation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
