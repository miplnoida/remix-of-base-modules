/**
 * EPIC CH-TRACE-1 — Communication Trace Center (list).
 * Route: /admin/communication-hub/traces
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { listTraces, type TraceListFilters, type TraceUnifiedRow } from "./traceService";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { computeNextExpectedStage } from "@/platform/communication-hub/trace/traceStages";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_TONE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  initiated: "secondary",
  evaluating: "secondary",
  prepared: "secondary",
  queued: "outline",
  dispatching: "outline",
  sent: "default",
  delivered: "default",
  completed: "default",
  blocked: "destructive",
  suppressed: "destructive",
  failed: "destructive",
  cancelled: "outline",
  retry_scheduled: "outline",
  pending: "outline",
  partial: "outline",
  unknown: "outline",
};

export default function TraceCenterPage() {
  const [rows, setRows] = useState<TraceUnifiedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TraceListFilters>({ limit: 200 });
  const [simulating, setSimulating] = useState<string>("");

  const reload = async (f: TraceListFilters) => {
    setLoading(true);
    try {
      setRows(await listTraces(f));
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load traces");
    } finally {
      setLoading(false);
    }
  };

  const runSimulation = async (scenario: string) => {
    if (!scenario) return;
    setSimulating(scenario);
    try {
      const { data, error } = await (supabase as any).functions.invoke("comm-hub-trace-simulate", {
        body: { scenario },
      });
      if (error || !data?.ok) throw new Error(error?.message ?? data?.error ?? "simulation failed");
      toast.success(`Simulated ${scenario} → ${data.trace_no}`);
      await reload(filters);
    } catch (e: any) {
      toast.error(e?.message ?? "Simulation failed");
    } finally {
      setSimulating("");
    }
  };

  useEffect(() => { reload(filters); /* eslint-disable-next-line */ }, []);

  const summary = useMemo(() => {
    const total = rows.length;
    const blocked = rows.filter((r) => r.status === "blocked" || r.status === "suppressed" || r.status === "failed").length;
    const native = rows.filter((r) => r.trace_kind === "native").length;
    return { total, blocked, native, reconstructed: total - native };
  }, [rows]);

  return (
    <div className="container mx-auto py-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Communication Trace Center</h1>
          <p className="text-sm text-muted-foreground">Every communication attempt across every module — including reconstructed traces for older requests.</p>
        </div>
        <div className="flex gap-2 text-xs">
          <Badge variant="outline">Total: {summary.total}</Badge>
          <Badge variant="destructive">Blocked/failed: {summary.blocked}</Badge>
          <Badge variant="secondary">Native: {summary.native}</Badge>
          <Badge variant="outline">Reconstructed: {summary.reconstructed}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><Label>Module</Label><Input value={filters.moduleCode ?? ""} onChange={(e) => setFilters({ ...filters, moduleCode: e.target.value || undefined })} placeholder="LEGAL" /></div>
          <div><Label>Event</Label><Input value={filters.eventCode ?? ""} onChange={(e) => setFilters({ ...filters, eventCode: e.target.value || undefined })} placeholder="INTERNAL_CASE_ASSIGNMENT_NOTICE" /></div>
          <div><Label>Status</Label><Input value={filters.status ?? ""} onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })} placeholder="blocked" /></div>
          <div><Label>Recipient domain</Label><Input value={filters.recipientDomain ?? ""} onChange={(e) => setFilters({ ...filters, recipientDomain: e.target.value || undefined })} placeholder="mishainfotech.com" /></div>
          <div><Label>Request no.</Label><Input value={filters.requestNo ?? ""} onChange={(e) => setFilters({ ...filters, requestNo: e.target.value || undefined })} /></div>
          <div><Label>Message ID</Label><Input value={filters.messageId ?? ""} onChange={(e) => setFilters({ ...filters, messageId: e.target.value || undefined })} /></div>
          <div><Label>Entity type</Label><Input value={filters.entityType ?? ""} onChange={(e) => setFilters({ ...filters, entityType: e.target.value || undefined })} placeholder="legal_case" /></div>
          <div><Label>Reference no.</Label><Input value={filters.referenceNo ?? ""} onChange={(e) => setFilters({ ...filters, referenceNo: e.target.value || undefined })} /></div>
          <div><Label>Blocker code</Label><Input value={filters.blockerCode ?? ""} onChange={(e) => setFilters({ ...filters, blockerCode: e.target.value || undefined })} placeholder="recipient_not_db_allowlisted" /></div>
          <div><Label>From</Label><Input type="date" value={filters.fromDate?.slice(0, 10) ?? ""} onChange={(e) => setFilters({ ...filters, fromDate: e.target.value || undefined })} /></div>
          <div><Label>To</Label><Input type="date" value={filters.toDate?.slice(0, 10) ?? ""} onChange={(e) => setFilters({ ...filters, toDate: e.target.value || undefined })} /></div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!filters.blockedOnly} onCheckedChange={(v) => setFilters({ ...filters, blockedOnly: !!v })} /> Blocked only</label>
          </div>
          <div className="col-span-full flex gap-2">
            <Button onClick={() => reload(filters)}>Apply</Button>
            <Button variant="outline" onClick={() => { const f = { limit: 200 }; setFilters(f); reload(f); }}>Reset</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Traces</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trace</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead>Module.Event</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Stage / Blocker</TableHead>
                    <TableHead>Request</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.trace_id}>
                      <TableCell><Link to={`/admin/communication-hub/traces/${r.trace_id}`} className="underline font-mono text-xs">{r.trace_no}</Link></TableCell>
                      <TableCell><Badge variant={r.trace_kind === "native" ? "secondary" : "outline"} className="text-[10px]">{r.trace_kind}</Badge></TableCell>
                      <TableCell className="text-xs">{r.module_code ?? "—"}<span className="text-muted-foreground"> · {r.event_code ?? "—"}</span></TableCell>
                      <TableCell className="text-xs font-mono">{r.recipient_email_masked ?? r.recipient_domain ?? "—"}</TableCell>
                      <TableCell><Badge variant={STATUS_TONE[r.status] ?? "outline"}>{r.status}</Badge></TableCell>
                      <TableCell className="text-xs">
                        <div>{r.blocked_stage ?? r.current_stage ?? "—"}</div>
                        {r.blocker_codes?.length ? (
                          <div className="flex flex-wrap gap-1 mt-1">{r.blocker_codes.slice(0, 3).map((c) => <Badge key={c} variant="destructive" className="text-[10px] font-mono">{c}</Badge>)}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{r.request_no ?? "—"}</TableCell>
                      <TableCell className="text-xs">{new Date(r.updated_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground">No traces match the current filters.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
