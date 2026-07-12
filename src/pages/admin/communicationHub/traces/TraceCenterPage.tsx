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
import { computeNextExpectedStage, deriveLastPassedFromTrace, deriveProviderCalled } from "@/platform/communication-hub/trace/traceStages";
import { explainBlocker } from "../safety/plainLanguageBlockers";
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
      toast.success(`Simulated ${scenario} → ${data.trace_no} (recipient: ${data.recipient_used ?? "n/a"})`);
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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Communication Trace Center</h1>
          <p className="text-sm text-muted-foreground">Every communication attempt across every module — including reconstructed traces for older requests.</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="outline">Total: {summary.total}</Badge>
          <Badge variant="destructive">Blocked/failed: {summary.blocked}</Badge>
          <Badge variant="secondary">Native: {summary.native}</Badge>
          <Badge variant="outline">Reconstructed: {summary.reconstructed}</Badge>
          <Select value={simulating} onValueChange={runSimulation}>
            <SelectTrigger className="h-8 w-56"><SelectValue placeholder="Simulate scenario…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="blocked_before_request">Blocked before request creation</SelectItem>
              <SelectItem value="automation_prepare_only">Automation prepare_only</SelectItem>
              <SelectItem value="send_policy_denied">Send policy denied</SelectItem>
              <SelectItem value="review_policy_denied">Review policy denied</SelectItem>
              <SelectItem value="request_created_and_queued">Request created & queued</SelectItem>
              <SelectItem value="dispatch_outside_live_window">Dispatcher outside live window</SelectItem>
              <SelectItem value="dispatch_recipient_not_db_allowlisted">Dispatcher recipient not DB allowlisted</SelectItem>
              <SelectItem value="provider_config_missing">Provider config missing</SelectItem>
              <SelectItem value="provider_send_failed">Provider send failed</SelectItem>
            </SelectContent>
          </Select>
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
                    <TableHead>Module · Event</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last passed</TableHead>
                    <TableHead>Current</TableHead>
                    <TableHead>Blocked / Next expected</TableHead>
                    <TableHead>What went wrong</TableHead>
                    <TableHead className="text-center" title="Request created · Message created · Provider called">R · M · P</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const isTerminal = r.status === "blocked" || r.status === "failed" || r.status === "suppressed";
                    const nextExpected = isTerminal ? null : computeNextExpectedStage(r.current_stage);
                    const lastPassed = deriveLastPassedFromTrace(r.current_stage, r.blocked_stage, r.status);
                    const hasReq = !!r.request_id;
                    const hasMsg = !!r.message_id;
                    const providerCalled = deriveProviderCalled({ provider_message_id: r.provider_message_id, current_stage: r.current_stage, blocked_stage: r.blocked_stage });
                    const firstBlocker = r.blocker_codes?.[0];
                    const plain = firstBlocker ? explainBlocker(firstBlocker) : null;
                    return (
                      <TableRow key={r.trace_id}>
                        <TableCell>
                          <Link to={`/admin/communication-hub/traces/${r.trace_id}`} className="underline font-mono text-xs">{r.trace_no}</Link>
                          <div className="text-[10px] text-muted-foreground">{r.trace_kind}</div>
                        </TableCell>
                        <TableCell className="text-xs">{r.module_code ?? "—"}<span className="text-muted-foreground"> · {r.event_code ?? "—"}</span></TableCell>
                        <TableCell className="text-xs font-mono">{r.recipient_email_masked ?? r.recipient_domain ?? "—"}</TableCell>
                        <TableCell><Badge variant={STATUS_TONE[r.status] ?? "outline"}>{r.status}</Badge></TableCell>
                        <TableCell className="text-xs font-mono text-emerald-700 dark:text-emerald-400">{lastPassed ?? "—"}</TableCell>
                        <TableCell className="text-xs font-mono">{r.current_stage ?? "—"}</TableCell>
                        <TableCell className="text-xs font-mono">
                          {r.blocked_stage
                            ? <span className="text-destructive">⛔ {r.blocked_stage}</span>
                            : (nextExpected ? <span className="text-muted-foreground">→ {nextExpected}</span> : "—")}
                        </TableCell>
                        <TableCell className="text-xs max-w-[260px]">
                          {plain ? (
                            <div>
                              <div className="text-foreground">{plain.headline}</div>
                              <div className="text-[10px] font-mono text-muted-foreground truncate" title={firstBlocker}>{firstBlocker}</div>
                            </div>
                          ) : (isTerminal ? <span className="text-muted-foreground">No blocker recorded</span> : "—")}
                        </TableCell>
                        <TableCell className="text-center text-[11px] font-mono">
                          <span className={hasReq ? "text-emerald-600" : "text-muted-foreground/60"} title={hasReq ? "Request created" : "No communication_request row"}>{hasReq ? "R" : "·"}</span>
                          {" · "}
                          <span className={hasMsg ? "text-emerald-600" : "text-muted-foreground/60"} title={hasMsg ? "Message created" : "No communication_message row"}>{hasMsg ? "M" : "·"}</span>
                          {" · "}
                          <span className={providerCalled ? "text-emerald-600" : "text-muted-foreground/60"} title={providerCalled ? "Provider send was attempted, accepted, or failed" : "Provider not yet called"}>{providerCalled ? "P" : "·"}</span>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{new Date(r.updated_at).toLocaleString()}</TableCell>
                      </TableRow>
                    );
                  })}
                  {rows.length === 0 && (
                    <TableRow><TableCell colSpan={10} className="text-center text-sm text-muted-foreground">No traces match the current filters.</TableCell></TableRow>
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

