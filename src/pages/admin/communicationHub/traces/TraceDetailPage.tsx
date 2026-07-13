/**
 * EPIC CH-TRACE-1 — Trace detail page.
 * Route: /admin/communication-hub/traces/:traceId
 */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getTrace, listTraceSteps, listDeliveryAttemptsForRequest, listEventLogForRequest, type TraceUnifiedRow, type TraceStepRow, type DeliveryAttemptLite, type EventLogLite } from "./traceService";
import { buildTraceDiagnosis } from "./traceDiagnosis";
import { explainBlocker } from "../safety/plainLanguageBlockers";
import { computeLastPassedStage, computeNextExpectedStage, deriveLastPassedFromTrace, deriveProviderCalled } from "@/platform/communication-hub/trace/traceStages";
import { AlertTriangle, CheckCircle2, Circle, XCircle } from "lucide-react";
import OperationsShell from "../utils/OperationsShell";

const STEP_ICON: Record<string, JSX.Element> = {
  passed: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  blocked: <XCircle className="h-4 w-4 text-red-600" />,
  failed: <XCircle className="h-4 w-4 text-red-600" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-600" />,
  skipped: <Circle className="h-4 w-4 text-muted-foreground" />,
  info: <Circle className="h-4 w-4 text-blue-500" />,
};

export default function TraceDetailPage() {
  const { traceId = "" } = useParams();
  const [trace, setTrace] = useState<TraceUnifiedRow | null>(null);
  const [steps, setSteps] = useState<TraceStepRow[]>([]);
  const [attempts, setAttempts] = useState<DeliveryAttemptLite[]>([]);
  const [events, setEvents] = useState<EventLogLite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const t = await getTrace(traceId);
        setTrace(t);
        if (t) {
          if (t.trace_kind === "native") setSteps(await listTraceSteps(t.trace_id));
          if (t.request_id) {
            setAttempts(await listDeliveryAttemptsForRequest(t.request_id));
            setEvents(await listEventLogForRequest(t.request_id));
          }
        }
      } finally { setLoading(false); }
    })();
  }, [traceId]);

  if (loading) {
    return (
      <OperationsShell title="Trace" subtitle="Loading trace…" section="Operations" parentBreadcrumbs={[{ label: "Trace Center", href: "/admin/communication-hub/traces" }]}>
        <div className="text-sm text-muted-foreground">Loading trace…</div>
      </OperationsShell>
    );
  }
  if (!trace) {
    return (
      <OperationsShell title="Trace not found" section="Operations" parentBreadcrumbs={[{ label: "Trace Center", href: "/admin/communication-hub/traces" }]}>
        <div className="text-sm">Trace not found. <Link to="/admin/communication-hub/traces" className="underline">Back to list</Link></div>
      </OperationsShell>
    );
  }

  const diag = buildTraceDiagnosis(trace);
  const isTerminal = trace.status === "blocked" || trace.status === "failed" || trace.status === "suppressed";
  const lastPassedFromSteps = computeLastPassedStage(steps);
  const lastPassed = lastPassedFromSteps ?? deriveLastPassedFromTrace(trace.current_stage, trace.blocked_stage, trace.status);
  const nextExpected = isTerminal ? null : computeNextExpectedStage(trace.current_stage);
  const hasReq = !!trace.request_id;
  const hasMsg = !!trace.message_id;
  const providerCalled = deriveProviderCalled({
    provider_message_id: trace.provider_message_id,
    current_stage: trace.current_stage,
    blocked_stage: trace.blocked_stage,
    steps,
    attempts,
  });
  const providerHint = trace.provider_message_id
    ? String(trace.provider_message_id)
    : (providerCalled ? "Provider send attempted or failed (see Delivery attempts)" : "Provider not yet called");

  return (
    <OperationsShell
      title={trace.trace_no}
      subtitle="Detailed gate-by-gate trace for this communication attempt."
      section="Operations"
      parentBreadcrumbs={[{ label: "Trace Center", href: "/admin/communication-hub/traces" }]}
      currentBreadcrumbLabel={trace.trace_no}
    >
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold font-mono">{trace.trace_no}</h1>
        <Badge variant={trace.trace_kind === "native" ? "secondary" : "outline"}>{trace.trace_kind}</Badge>
      </div>


      <Alert variant={diag.tone === "error" ? "destructive" : "default"}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{diag.headline}</AlertTitle>
        <AlertDescription>
          {diag.detail}
          {diag.fixHref && <> · <Link to={diag.fixHref} className="underline">Fix screen</Link></>}
        </AlertDescription>
      </Alert>

      {/* Wave 2 — Progress at-a-glance */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Where is this communication?</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Last passed stage</div>
            <div className="font-mono text-xs text-emerald-700 dark:text-emerald-400">{lastPassed ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Current stage</div>
            <div className="font-mono text-xs">{trace.current_stage ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Blocked stage</div>
            <div className="font-mono text-xs text-destructive">{trace.blocked_stage ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Next expected stage</div>
            <div className="font-mono text-xs text-muted-foreground">{nextExpected ? `→ ${nextExpected}` : "—"}</div>
          </div>
          <div className="col-span-full grid grid-cols-3 gap-2 pt-2 border-t">
            <ProgressFlag ok={hasReq} label="Request created" hint={hasReq ? trace.request_no ?? "" : "No communication_request row"} />
            <ProgressFlag ok={hasMsg} label="Message created" hint={hasMsg ? String(trace.message_id) : "No communication_message row"} />
            <ProgressFlag ok={providerCalled} label="Provider called" hint={providerHint} />
          </div>
        </CardContent>
      </Card>

      {trace.reconstructed_note && (
        <Alert>
          <AlertTitle className="text-xs">{trace.reconstructed_note}</AlertTitle>
          <AlertDescription className="text-xs">No native trace steps exist for this attempt. Diagnosis is based on the linked request, message, delivery attempts and event log.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Module</div>{trace.module_code ?? "—"}</div>
          <div><div className="text-xs text-muted-foreground">Event</div>{trace.event_code ?? "—"}</div>
          <div><div className="text-xs text-muted-foreground">Channel</div>{trace.channel ?? "—"}</div>
          <div><div className="text-xs text-muted-foreground">Status</div><Badge variant={diag.tone === "error" ? "destructive" : "secondary"}>{trace.status}</Badge></div>
          <div><div className="text-xs text-muted-foreground">Entity</div>{trace.entity_type ?? "—"} / {trace.entity_id ?? "—"}</div>
          <div><div className="text-xs text-muted-foreground">Reference</div>{trace.reference_no ?? "—"}</div>
          <div><div className="text-xs text-muted-foreground">Recipient</div><span className="font-mono text-xs">{trace.recipient_email_masked ?? trace.recipient_domain ?? "—"}</span></div>
          <div><div className="text-xs text-muted-foreground">Request</div>{trace.request_no ? <Link to={`/admin/communication-hub/dispatch-register?request=${trace.request_no}`} className="underline font-mono text-xs">{trace.request_no}</Link> : "—"}</div>
          <div><div className="text-xs text-muted-foreground">Message ID</div><span className="font-mono text-xs">{trace.message_id ?? "—"}</span></div>
          <div><div className="text-xs text-muted-foreground">Correlation</div><span className="font-mono text-xs">{trace.correlation_id ?? "—"}</span></div>
        </CardContent>
      </Card>

      {trace.blocker_codes?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Blockers</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {trace.blocker_codes.map((c) => {
              const e = explainBlocker(c);
              return (
                <Alert key={c} variant="destructive">
                  <AlertTitle className="flex items-center gap-2">{e.headline} <Badge variant="outline" className="text-[10px] font-mono">{c}</Badge></AlertTitle>
                  <AlertDescription>
                    <div>{e.message}</div>
                    <div className="text-xs mt-1">{e.fixHint}{e.fixHref && <> · <Link to={e.fixHref} className="underline">Fix screen</Link></>}</div>
                  </AlertDescription>
                </Alert>
              );
            })}
          </CardContent>
        </Card>
      )}

      {steps.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Trace timeline</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {steps.map((s) => (
                <div key={s.id} className="flex gap-3 border rounded p-2">
                  <div className="pt-0.5">{STEP_ICON[s.status] ?? STEP_ICON.info}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{s.stage_name}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">{s.stage_code}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{s.status}</Badge>
                      <span className="text-xs text-muted-foreground ml-auto">{new Date(s.created_at).toLocaleString()}</span>
                    </div>
                    {s.plain_summary && <div className="text-sm mt-1">{s.plain_summary}</div>}
                    {s.blocker_codes?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">{s.blocker_codes.map((c) => <Badge key={c} variant="destructive" className="text-[10px] font-mono">{c}</Badge>)}</div>
                    )}
                    {s.warnings?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">{s.warnings.map((w) => <Badge key={w} variant="outline" className="text-[10px] font-mono">{w}</Badge>)}</div>
                    )}
                    {Object.keys(s.payload ?? {}).length > 0 && (
                      <details className="mt-1 text-xs">
                        <summary className="cursor-pointer text-muted-foreground">Technical payload</summary>
                        <pre className="mt-1 bg-muted p-2 rounded text-[11px] overflow-auto">{JSON.stringify(s.payload, null, 2)}</pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {events.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Communication event log</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Stage</TableHead><TableHead>Status</TableHead><TableHead>Message</TableHead><TableHead>When</TableHead></TableRow></TableHeader>
              <TableBody>
                {events.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs font-mono">{e.stage}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{e.status}</Badge></TableCell>
                    <TableCell className="text-xs">{e.message ?? "—"}</TableCell>
                    <TableCell className="text-xs">{new Date(e.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {attempts.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Delivery attempts</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Provider</TableHead><TableHead>Status</TableHead><TableHead>Error</TableHead><TableHead>When</TableHead></TableRow></TableHeader>
              <TableBody>
                {attempts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs">{a.attempt_no ?? "—"}</TableCell>
                    <TableCell className="text-xs font-mono">{a.provider_message_id ?? a.provider_id ?? "—"}</TableCell>
                    <TableCell><Badge variant={a.status === "success" || a.status === "delivered" ? "secondary" : "destructive"} className="text-[10px]">{a.status}</Badge></TableCell>
                    <TableCell className="text-xs">{a.error_code ? <span className="font-mono">{a.error_code}</span> : ""} {a.error_message ?? ""}</TableCell>
                    <TableCell className="text-xs">{new Date(a.started_at).toLocaleString()}{a.finished_at ? ` → ${new Date(a.finished_at).toLocaleString()}` : ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground">Raw trace JSON</summary>
        <pre className="mt-2 bg-muted p-3 rounded overflow-auto">{JSON.stringify(trace, null, 2)}</pre>
      </details>
    </OperationsShell>
  );
}

function ProgressFlag({ ok, label, hint }: { ok: boolean; label: string; hint?: string }) {
  return (
    <div className={`flex items-start gap-2 rounded border p-2 ${ok ? "border-emerald-300/60 bg-emerald-50/40 dark:bg-emerald-950/20" : "border-muted bg-muted/30"}`}>
      {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> : <Circle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
      <div className="min-w-0">
        <div className="text-xs font-medium">{label}</div>
        {hint && <div className="text-[10px] font-mono text-muted-foreground truncate" title={hint}>{hint || "—"}</div>}
      </div>
    </div>
  );
}
