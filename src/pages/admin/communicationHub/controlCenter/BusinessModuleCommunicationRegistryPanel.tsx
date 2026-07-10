/**
 * EPIC 4A — Business Module Communication Registry Panel.
 *
 * Read-only view of `communication_hub_module_event_registry`. Planning +
 * rollout tracking only. Does NOT send, enqueue, or promote anything.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

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

  const modules = useMemo(
    () => Array.from(new Set(rows.map((r) => r.module_code))).sort(),
    [rows]
  );
  const phases = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.recommended_phase).filter(Boolean) as string[])).sort(),
    [rows]
  );

  const filtered = rows.filter((r) => {
    if (module !== "all" && r.module_code !== module) return false;
    if (risk !== "all" && r.risk_level !== risk) return false;
    if (phase !== "all" && r.recommended_phase !== phase) return false;
    if (mapping === "mapped" && r.mapping_status !== "mapped") return false;
    if (mapping === "unmapped" && r.mapping_status === "mapped") return false;
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
      if (r.integration_status === "manual_live_ready" || r.integration_status === "module_integrated")
        c.live_ready++;
    });
    return c;
  }, [rows]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Business Module Communication Registry</CardTitle>
        <CardDescription>
          Every business-module event we plan to route through the Communication Hub. Planning /
          rollout tracker — read-only in this epic.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Read-only planning view</AlertTitle>
          <AlertDescription className="text-xs">
            Registry does not replace event↔template mapping. Runtime template resolution stays in{" "}
            <code>communication_hub_event_template_map</code>. No communication is sent from this
            panel.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <Stat label="Total events" value={counts.total} />
          <Stat label="Mapped" value={counts.mapped} />
          <Stat label="High-risk" value={counts.high} />
          <Stat label="Live-ready" value={counts.live_ready} />
        </div>

        <div className="grid gap-2 md:grid-cols-5">
          <Input
            placeholder="Search event / notes…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
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
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
          <Select value={mapping} onValueChange={setMapping}>
            <SelectTrigger><SelectValue placeholder="Mapping" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All mappings</SelectItem>
              <SelectItem value="mapped">Mapped</SelectItem>
              <SelectItem value="unmapped">Unmapped</SelectItem>
            </SelectContent>
          </Select>
          <Select value={phase} onValueChange={setPhase}>
            <SelectTrigger><SelectValue placeholder="Phase" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All phases</SelectItem>
              {phases.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-3">Module</th>
                  <th className="py-2 pr-3">Event</th>
                  <th className="py-2 pr-3">Risk</th>
                  <th className="py-2 pr-3">Recipient</th>
                  <th className="py-2 pr-3">Integration</th>
                  <th className="py-2 pr-3">Template</th>
                  <th className="py-2 pr-3">Mapping</th>
                  <th className="py-2 pr-3">Live</th>
                  <th className="py-2 pr-3">Phase</th>
                  <th className="py-2 pr-3">Legacy / Notes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b align-top">
                    <td className="py-2 pr-3 font-mono">{r.module_code}</td>
                    <td className="py-2 pr-3 font-mono">{r.event_code}</td>
                    <td className="py-2 pr-3">
                      <Badge variant={RISK_VARIANT[r.risk_level] ?? "outline"}>{r.risk_level}</Badge>
                    </td>
                    <td className="py-2 pr-3">{r.recipient_type ?? "—"}</td>
                    <td className="py-2 pr-3">{r.integration_status}</td>
                    <td className="py-2 pr-3">{r.template_status}</td>
                    <td className="py-2 pr-3">{r.mapping_status}</td>
                    <td className="py-2 pr-3">{r.live_status}</td>
                    <td className="py-2 pr-3">{r.recommended_phase ?? "—"}</td>
                    <td className="py-2 pr-3 max-w-[36ch] text-muted-foreground">
                      {r.current_legacy_table_or_function ?? r.notes ?? "—"}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-6 text-center text-muted-foreground">
                      No rows match current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
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
