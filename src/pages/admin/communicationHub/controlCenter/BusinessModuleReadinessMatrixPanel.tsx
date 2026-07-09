/**
 * Business Module Readiness Matrix (EPIC 2A + 2D, read-only).
 *
 * Source of truth (EPIC 2D): `communication_hub_event_template_map`. When a
 * mapping row exists it is used to drive the matrix. Legacy pilot catalogue is
 * kept only as a UI helper for module/event display metadata.
 *
 * Read-only join across:
 *  - communication_hub_event_template_map (mapping)
 *  - communication_hub_event_live_control
 *  - core_template + core_template_version
 *  - notification_providers (email provider availability)
 *  - communication_hub_control_settings (tracking policy)
 *  - communication_request (last dry-run)
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCcw, ShieldCheck, AlertTriangle, Sparkles } from "lucide-react";
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
  mappingActive: boolean;
  mappingSource: string | null;
  futureLiveCandidate: boolean;
}

async function loadRow(evt: PilotEvent, mapping: { active: boolean; source: string | null; templateCode: string } | null): Promise<MatrixRow> {
  const blockers: string[] = [];
  const effectiveTemplateCode = mapping?.templateCode ?? evt.templateCode;

  const [liveCtrl, tpl, prov, settings] = await Promise.all([
    (supabase as any).from("communication_hub_event_live_control")
      .select("status, risk_level")
      .eq("module_code", evt.moduleCode).eq("event_code", evt.eventCode).maybeSingle(),
    (supabase as any).from("core_template")
      .select("id, is_active, active_version_id")
      .eq("code", effectiveTemplateCode).maybeSingle(),
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

  if (!mapping) blockers.push("event_template_mapping_missing");
  else if (!mapping.active) blockers.push("event_template_mapping_disabled");

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
  const trackingPolicy = openT || clickT ? `open=${openT} click=${clickT}` : "off";

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

  const futureLiveCandidate =
    blockers.length === 0
    && (evt.risk === "low")
    && !!lastDryRunRequestNo
    && liveControlStatus === "dry_run_only";

  let recommendation = "Ready for pilot dry-run.";
  if (blockers.length) recommendation = `Resolve blockers: ${blockers.join(", ")}`;
  else if (!lastDryRunRequestNo) recommendation = "Run first dry-run via Generic Event Pilot.";
  else if (futureLiveCandidate) recommendation = "Future live candidate — keep dry-run only in this phase.";
  else recommendation = "Dry-run history present. Continue observing; do NOT go live in this phase.";

  return {
    ...evt,
    liveControlStatus, riskLevelDb,
    templateExists, activeVersionExists, templateVersionNo,
    providerAvailable, trackingPolicy,
    lastDryRunRequestNo, lastDryRunStatus, lastDryRunAt,
    blockers, recommendation,
    mappingActive: !!mapping?.active,
    mappingSource: mapping?.source ?? null,
    futureLiveCandidate,
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
      // EPIC 2D — mapping table is source of truth. Merge with catalogue for display metadata.
      const { data: mappings } = await (supabase as any)
        .from("communication_hub_event_template_map")
        .select("module_code, event_code, channel, template_code, active, mapping_source")
        .eq("channel", "email");
      const mapByKey: Record<string, { active: boolean; source: string | null; templateCode: string }> = {};
      for (const m of (mappings ?? []) as any[]) {
        mapByKey[`${m.module_code}:${m.event_code}`] = {
          active: !!m.active, source: m.mapping_source ?? null, templateCode: m.template_code,
        };
      }
      // Union: mapping rows ∪ catalogue rows
      const allKeys = new Set<string>([
        ...Object.keys(mapByKey),
        ...PILOT_EVENT_CATALOGUE.map(e => `${e.moduleCode}:${e.eventCode}`),
      ]);
      const merged: PilotEvent[] = Array.from(allKeys).map(key => {
        const fromCat = PILOT_EVENT_CATALOGUE.find(e => `${e.moduleCode}:${e.eventCode}` === key);
        if (fromCat) return fromCat;
        const [moduleCode, eventCode] = key.split(":");
        const m = mapByKey[key];
        return {
          moduleCode, eventCode, eventName: eventCode, defaultChannels: ["EMAIL"],
          defaultRecipient: "ADMIN_USER", risk: "low",
          templateCode: m.templateCode, description: "(mapping-only)", requiredTokens: [],
        };
      });
      const result = await Promise.all(
        merged.map(evt => loadRow(evt, mapByKey[`${evt.moduleCode}:${evt.eventCode}`] ?? null)),
      );
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
                  <th className="p-2 border-b">Mapping</th>
                  <th className="p-2 border-b">Tokens</th>
                  <th className="p-2 border-b">Provider</th>
                  <th className="p-2 border-b">Tracking</th>
                  <th className="p-2 border-b">Last dry-run</th>
                  <th className="p-2 border-b">Blockers</th>
                  <th className="p-2 border-b">Live candidate</th>
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
