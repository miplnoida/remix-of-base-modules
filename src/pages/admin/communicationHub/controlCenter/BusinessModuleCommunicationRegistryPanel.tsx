/**
 * EPIC 4A — Business Module Communication Registry Panel.
 * EPIC 4A-UX-IA-2 Part D — upgraded to CommunicationHubDataTable.
 *
 * Read-only view of `communication_hub_module_event_registry`. Planning +
 * rollout tracking only. Does NOT send, enqueue, or promote anything.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { CommunicationHubDataTable, type HubTableColumn } from "../components/CommunicationHubDataTable";
import { IconAction, RowActionGroup } from "../components/RowActions";

interface RegistryRow {
  id: string;
  module_code: string;
  module_name: string | null;
  event_code: string;
  event_name: string | null;
  channel: string;
  recipient_type: string | null;
  risk_level: "low" | "medium" | "high";
  integration_status: string;
  template_status: string;
  mapping_status: string;
  live_status: string;
  recommended_phase: string | null;
  current_communication_method: string | null;
  current_legacy_table_or_function: string | null;
  notes: string | null;
}

const RISK_VARIANT: Record<string, "secondary" | "default" | "destructive"> = {
  low: "secondary",
  medium: "default",
  high: "destructive",
};

export function BusinessModuleCommunicationRegistryPanel() {
  const [rows, setRows] = useState<RegistryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [module, setModule] = useState<string>("all");
  const [risk, setRisk] = useState<string>("all");
  const [phase, setPhase] = useState<string>("all");
  const [mapping, setMapping] = useState<string>("all");
  const [integration, setIntegration] = useState<string>("all");
  const [tplStatus, setTplStatus] = useState<string>("all");
  const [liveStatus, setLiveStatus] = useState<string>("all");
  const [legacy, setLegacy] = useState<string>("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("communication_hub_module_event_registry")
        .select("*")
        .order("module_code")
        .order("event_code");
      if (!error) setRows((data ?? []) as RegistryRow[]);
      setLoading(false);
    })();
  }, []);

  const modules = useMemo(() => Array.from(new Set(rows.map(r => r.module_code))).sort(), [rows]);
  const phases = useMemo(() => Array.from(new Set(rows.map(r => r.recommended_phase).filter(Boolean) as string[])).sort(), [rows]);
  const integrations = useMemo(() => Array.from(new Set(rows.map(r => r.integration_status))).sort(), [rows]);
  const tplStatuses = useMemo(() => Array.from(new Set(rows.map(r => r.template_status))).sort(), [rows]);
  const liveStatuses = useMemo(() => Array.from(new Set(rows.map(r => r.live_status))).sort(), [rows]);

  const filtered = rows.filter((r) => {
    if (module !== "all" && r.module_code !== module) return false;
    if (risk !== "all" && r.risk_level !== risk) return false;
    if (phase !== "all" && r.recommended_phase !== phase) return false;
    if (mapping === "mapped" && r.mapping_status !== "mapped") return false;
    if (mapping === "unmapped" && r.mapping_status === "mapped") return false;
    if (integration !== "all" && r.integration_status !== integration) return false;
    if (tplStatus !== "all" && r.template_status !== tplStatus) return false;
    if (liveStatus !== "all" && r.live_status !== liveStatus) return false;
    if (legacy === "yes" && !r.current_legacy_table_or_function) return false;
    if (legacy === "no" && r.current_legacy_table_or_function) return false;
    if (q) {
      const s = `${r.module_code} ${r.event_code} ${r.event_name ?? ""} ${r.notes ?? ""}`.toLowerCase();
      if (!s.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const counts = useMemo(() => {
    const c = { total: rows.length, mapped: 0, high: 0, live_ready: 0 };
    rows.forEach((r) => {
      if (r.mapping_status === "mapped") c.mapped++;
      if (r.risk_level === "high") c.high++;
      if (r.integration_status === "manual_live_ready" || r.integration_status === "module_integrated") c.live_ready++;
    });
    return c;
  }, [rows]);

  const copyCode = (v: string) => {
    navigator.clipboard.writeText(v);
    toast.success("Event code copied");
  };

  const columns: HubTableColumn<RegistryRow>[] = [
    {
      key: "moduleEvent", header: "Module / Event", sticky: "left", sortable: true, minWidth: 220,
      sortValue: (r) => `${r.module_code}:${r.event_code}`,
      cell: (r) => (
        <div>
          <div className="font-mono text-[11px]">{r.module_code}</div>
          <div className="font-mono text-[11px] text-muted-foreground">{r.event_code}</div>
          {r.event_name && <div className="text-[11px] mt-0.5">{r.event_name}</div>}
        </div>
      ),
    },
    { key: "risk", header: "Risk", sortable: true, sortValue: (r) => r.risk_level, cell: (r) => <Badge variant={RISK_VARIANT[r.risk_level] ?? "outline"}>{r.risk_level}</Badge> },
    { key: "recipient", header: "Recipient", sortable: true, sortValue: (r) => r.recipient_type ?? "", cell: (r) => r.recipient_type ?? "—" },
    { key: "integration", header: "Integration", sortable: true, sortValue: (r) => r.integration_status, cell: (r) => <span className="text-[11px]">{r.integration_status}</span> },
    { key: "template", header: "Template", sortable: true, sortValue: (r) => r.template_status, cell: (r) => <span className="text-[11px]">{r.template_status}</span> },
    { key: "mapping", header: "Mapping", sortable: true, sortValue: (r) => r.mapping_status, cell: (r) => <span className="text-[11px]">{r.mapping_status}</span> },
    { key: "live", header: "Live", sortable: true, sortValue: (r) => r.live_status, cell: (r) => <span className="text-[11px]">{r.live_status}</span> },
    { key: "phase", header: "Phase", sortable: true, sortValue: (r) => r.recommended_phase ?? "", cell: (r) => r.recommended_phase ?? "—" },
    {
      key: "legacy", header: "Legacy / Notes", cell: (r) => (
        <div className="max-w-[36ch] text-[11px] text-muted-foreground">
          {r.current_legacy_table_or_function ?? r.notes ?? "—"}
        </div>
      ),
    },
    {
      key: "actions", header: "Actions", sticky: "right", className: "w-[120px]",
      cell: (r) => (
        <RowActionGroup>
          <IconAction icon={Copy} label="Copy event code" onClick={() => copyCode(r.event_code)} />
          <Link
            to="/admin/communication-hub/design"
            aria-label="Open Design & Templates"
            title="Open Design & Templates"
            className="h-7 w-7 p-0 inline-flex items-center justify-center rounded-md hover:bg-muted"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </RowActionGroup>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Business Module Communication Registry</CardTitle>
        <CardDescription>
          Every business-module event we plan to route through the Communication Hub. Planning /
          rollout tracker — read-only.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Read-only planning view</AlertTitle>
          <AlertDescription className="text-xs">
            Registry does not replace event↔template mapping. Runtime template resolution stays in{" "}
            <code>communication_hub_event_template_map</code>. No communication is sent from this panel.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <Stat label="Total events" value={counts.total} />
          <Stat label="Mapped" value={counts.mapped} />
          <Stat label="High-risk" value={counts.high} />
          <Stat label="Live-ready" value={counts.live_ready} />
        </div>

        <CommunicationHubDataTable
          screenKey="module-event-registry"
          columns={columns}
          rows={filtered}
          loading={loading}
          getRowKey={(r) => r.id}
          defaultSort={{ key: "moduleEvent", direction: "asc" }}
          toolbar={
            <div className="grid gap-2 md:grid-cols-4 lg:grid-cols-5">
              <Input placeholder="Search event / notes…" value={q} onChange={(e) => setQ(e.target.value)} />
              <Select value={module} onValueChange={setModule}>
                <SelectTrigger><SelectValue placeholder="Module" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All modules</SelectItem>
                  {modules.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={risk} onValueChange={setRisk}>
                <SelectTrigger><SelectValue placeholder="Risk" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All risks</SelectItem>
                  <SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              <Select value={mapping} onValueChange={setMapping}>
                <SelectTrigger><SelectValue placeholder="Mapping" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All mappings</SelectItem>
                  <SelectItem value="mapped">Mapped</SelectItem><SelectItem value="unmapped">Unmapped</SelectItem>
                </SelectContent>
              </Select>
              <Select value={phase} onValueChange={setPhase}>
                <SelectTrigger><SelectValue placeholder="Phase" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All phases</SelectItem>
                  {phases.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={integration} onValueChange={setIntegration}>
                <SelectTrigger><SelectValue placeholder="Integration" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All integration</SelectItem>
                  {integrations.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={tplStatus} onValueChange={setTplStatus}>
                <SelectTrigger><SelectValue placeholder="Template" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All template statuses</SelectItem>
                  {tplStatuses.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={liveStatus} onValueChange={setLiveStatus}>
                <SelectTrigger><SelectValue placeholder="Live" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All live statuses</SelectItem>
                  {liveStatuses.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={legacy} onValueChange={setLegacy}>
                <SelectTrigger><SelectValue placeholder="Legacy path" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="yes">Legacy present</SelectItem><SelectItem value="no">No legacy path</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
