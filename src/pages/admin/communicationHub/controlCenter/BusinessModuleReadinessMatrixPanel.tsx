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
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCcw, ShieldCheck, AlertTriangle, Sparkles, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PILOT_EVENT_CATALOGUE, type PilotEvent } from "./pilotEventCatalogue";
import { CommunicationHubDataTable, type HubTableColumn } from "../components/CommunicationHubDataTable";
import { IconAction, RowActionGroup } from "../components/RowActions";

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

  let recommendation = "Ready for dry-run.";
  if (blockers.length) recommendation = `Resolve blockers: ${blockers.join(", ")}`;
  else if (!lastDryRunRequestNo) recommendation = "Run first dry-run via Event Validation Console.";
  else if (futureLiveCandidate) recommendation = "Future live candidate — keep dry-run only for now.";
  else recommendation = "Dry-run history present. Continue observing before promoting to live.";

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
  const [fModule, setFModule] = useState("all");
  const [fRisk, setFRisk] = useState("all");
  const [fLive, setFLive] = useState("all");
  const [fMapped, setFMapped] = useState("all");
  const [fTpl, setFTpl] = useState("all");
  const [fProvider, setFProvider] = useState("all");
  const [fDryRun, setFDryRun] = useState("all");
  const [fBlockers, setFBlockers] = useState("all");
  const [fCandidate, setFCandidate] = useState("all");
  const [q, setQ] = useState("");

  async function reload() {
    setLoading(true);
    try {
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

  const modules = useMemo(() => Array.from(new Set(rows.map(r => r.moduleCode))).sort(), [rows]);
  const liveStatuses = useMemo(() => Array.from(new Set(rows.map(r => r.liveControlStatus).filter(Boolean) as string[])).sort(), [rows]);

  const filtered = rows.filter(r => {
    if (fModule !== "all" && r.moduleCode !== fModule) return false;
    if (fRisk !== "all" && (r.riskLevelDb ?? r.risk) !== fRisk) return false;
    if (fLive !== "all" && (r.liveControlStatus ?? "") !== fLive) return false;
    if (fMapped === "mapped" && !r.mappingActive) return false;
    if (fMapped === "unmapped" && r.mappingActive) return false;
    if (fTpl === "active" && !r.activeVersionExists) return false;
    if (fTpl === "inactive" && r.activeVersionExists) return false;
    if (fProvider === "yes" && !r.providerAvailable) return false;
    if (fProvider === "no" && r.providerAvailable) return false;
    if (fDryRun === "yes" && !r.lastDryRunRequestNo) return false;
    if (fDryRun === "no" && r.lastDryRunRequestNo) return false;
    if (fBlockers === "yes" && r.blockers.length === 0) return false;
    if (fBlockers === "no" && r.blockers.length > 0) return false;
    if (fCandidate === "yes" && !r.futureLiveCandidate) return false;
    if (fCandidate === "no" && r.futureLiveCandidate) return false;
    if (q && !`${r.moduleCode} ${r.eventCode} ${r.eventName}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success("Event code copied"); };

  const columns: HubTableColumn<MatrixRow>[] = [
    {
      key: "moduleEvent", header: "Module / Event", sticky: "left", sortable: true, minWidth: 220,
      sortValue: (r) => `${r.moduleCode}:${r.eventCode}`,
      cell: (r) => (
        <div>
          <div className="font-mono text-[11px]">{r.moduleCode}</div>
          <div className="font-mono text-[11px] text-muted-foreground">{r.eventCode}</div>
          <div className="text-xs mt-0.5">{r.eventName}</div>
        </div>
      ),
    },
    { key: "channels", header: "Channels", cell: (r) => r.defaultChannels.map(c => <Badge key={c} variant="outline" className="mr-1">{c}</Badge>) },
    { key: "live", header: "Live status", sortable: true, sortValue: (r) => r.liveControlStatus ?? "", cell: (r) => statusBadge(r.liveControlStatus) },
    { key: "risk", header: "Risk", sortable: true, sortValue: (r) => r.riskLevelDb ?? r.risk, cell: (r) => <Badge variant="outline">{r.riskLevelDb ?? r.risk}</Badge> },
    {
      key: "template", header: "Template", sortable: true, sortValue: (r) => r.templateCode,
      cell: (r) => (
        <div>
          <div className="font-mono text-[10px]">{r.templateCode}</div>
          <div>
            {r.templateExists
              ? (r.activeVersionExists ? <Badge variant="secondary">v{r.templateVersionNo ?? "?"}</Badge> : <Badge variant="destructive">no active version</Badge>)
              : <Badge variant="destructive">missing</Badge>}
          </div>
        </div>
      ),
    },
    {
      key: "mapping", header: "Mapping", sortable: true, sortValue: (r) => (r.mappingActive ? "active" : "inactive"),
      cell: (r) => (
        <div>
          <Badge variant={r.mappingActive ? "secondary" : "destructive"}>
            {r.mappingActive ? "active" : (r.mappingSource ? "disabled" : "missing")}
          </Badge>
          {r.mappingSource && <div className="text-[10px] text-muted-foreground">{r.mappingSource}</div>}
        </div>
      ),
    },
    { key: "tokens", header: "Tokens", cell: (r) => <div className="text-[10px] font-mono max-w-[24ch]">{r.requiredTokens.join(", ") || "—"}</div> },
    { key: "provider", header: "Provider", sortable: true, sortValue: (r) => (r.providerAvailable ? 1 : 0), cell: (r) => r.providerAvailable ? <Badge variant="secondary">email OK</Badge> : <Badge variant="destructive">no provider</Badge> },
    { key: "tracking", header: "Tracking", cell: (r) => <Badge variant="outline">{r.trackingPolicy}</Badge> },
    {
      key: "lastDryRun", header: "Last dry-run", sortable: true, sortValue: (r) => r.lastDryRunAt ?? "",
      cell: (r) => r.lastDryRunRequestNo ? (
        <div><div className="font-mono text-[10px]">{r.lastDryRunRequestNo}</div><div className="text-[10px] text-muted-foreground">{r.lastDryRunStatus}</div></div>
      ) : <span className="text-muted-foreground">—</span>,
    },
    {
      key: "blockers", header: "Blockers", sortable: true, sortValue: (r) => r.blockers.length,
      cell: (r) => r.blockers.length === 0
        ? <Badge variant="secondary">none</Badge>
        : (
          <div className="flex items-start gap-1">
            <AlertTriangle className="h-3 w-3 text-destructive mt-0.5" />
            <div className="text-[10px] max-w-[24ch]">{r.blockers.join(", ")}</div>
          </div>
        ),
    },
    { key: "candidate", header: "Live candidate", sortable: true, sortValue: (r) => (r.futureLiveCandidate ? 1 : 0), cell: (r) => r.futureLiveCandidate ? <Badge className="gap-1"><Sparkles className="h-3 w-3" />candidate</Badge> : <span className="text-[10px] text-muted-foreground">—</span> },
    { key: "recommendation", header: "Recommendation", cell: (r) => <div className="text-[11px] max-w-[32ch]">{r.recommendation}</div> },
    {
      key: "actions", header: "Actions", sticky: "right", className: "w-[140px]",
      cell: (r) => (
        <RowActionGroup>
          <IconAction icon={Copy} label="Copy event code" onClick={() => copy(r.eventCode)} />
          <Link
            to={`/admin/communication-hub/design`}
            aria-label="Open mapping"
            title="Open mapping"
            className="h-7 w-7 p-0 inline-flex items-center justify-center rounded-md hover:bg-muted"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <Link
            to={`/admin/communication-hub/pilots?module=${encodeURIComponent(r.moduleCode)}&event=${encodeURIComponent(r.eventCode)}`}
            aria-label="Open pilot"
            title="Open pilot"
            className="h-7 w-7 p-0 inline-flex items-center justify-center rounded-md hover:bg-muted"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </Link>
        </RowActionGroup>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" /> Business Module Readiness Matrix
          </CardTitle>
          <CardDescription>
            Read-only overview of module/event onboarding readiness. Joined from mapping,
            event live-control, core template registry, provider settings, and Hub request history. No writes.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
          <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <CommunicationHubDataTable
          screenKey="module-readiness-matrix"
          columns={columns}
          rows={filtered}
          loading={loading}
          getRowKey={(r) => `${r.moduleCode}:${r.eventCode}`}
          defaultSort={{ key: "moduleEvent", direction: "asc" }}
          toolbar={
            <div className="grid gap-2 md:grid-cols-4 lg:grid-cols-5">
              <Input placeholder="Search module/event…" value={q} onChange={e => setQ(e.target.value)} />
              <Select value={fModule} onValueChange={setFModule}>
                <SelectTrigger><SelectValue placeholder="Module" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All modules</SelectItem>{modules.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={fRisk} onValueChange={setFRisk}>
                <SelectTrigger><SelectValue placeholder="Risk" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All risks</SelectItem>{["low","medium","high","sensitive"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={fLive} onValueChange={setFLive}>
                <SelectTrigger><SelectValue placeholder="Live status" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All live</SelectItem>{liveStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={fMapped} onValueChange={setFMapped}>
                <SelectTrigger><SelectValue placeholder="Mapping" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="mapped">Mapped</SelectItem><SelectItem value="unmapped">Unmapped</SelectItem></SelectContent>
              </Select>
              <Select value={fTpl} onValueChange={setFTpl}>
                <SelectTrigger><SelectValue placeholder="Template" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
              <Select value={fProvider} onValueChange={setFProvider}>
                <SelectTrigger><SelectValue placeholder="Provider" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="yes">Available</SelectItem><SelectItem value="no">Missing</SelectItem></SelectContent>
              </Select>
              <Select value={fDryRun} onValueChange={setFDryRun}>
                <SelectTrigger><SelectValue placeholder="Dry-run" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="yes">Exists</SelectItem><SelectItem value="no">Missing</SelectItem></SelectContent>
              </Select>
              <Select value={fBlockers} onValueChange={setFBlockers}>
                <SelectTrigger><SelectValue placeholder="Blockers" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="yes">Has blockers</SelectItem><SelectItem value="no">No blockers</SelectItem></SelectContent>
              </Select>
              <Select value={fCandidate} onValueChange={setFCandidate}>
                <SelectTrigger><SelectValue placeholder="Live candidate" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="yes">Candidate</SelectItem><SelectItem value="no">Not candidate</SelectItem></SelectContent>
              </Select>
            </div>
          }
        />
      </CardContent>
    </Card>
  );
}
