/**
 * EPIC 2B — Lifecycle Event Log. Read-only view of communication_event_log
 * with sanitized payload preview.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowRight, ChevronDown, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import OperationsShell from "../utils/OperationsShell";
import { sanitizeProviderResponse } from "../utils/mask";
import { listLifecycleEvents, type LifecycleFilter } from "../utils/operationsService";

export default function LifecycleLogPage() {
  const [requestNo, setRequestNo] = useState("");
  const [messageId, setMessageId] = useState("");
  const [moduleCode, setModuleCode] = useState("");
  const [eventCode, setEventCode] = useState("");
  const [eventType, setEventType] = useState("");
  const [stage, setStage] = useState("");
  const [source, setSource] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [applied, setApplied] = useState<LifecycleFilter>({ limit: 200 });
  const [openId, setOpenId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["comm-hub", "lifecycle-log", applied],
    queryFn: () => listLifecycleEvents(applied),
  });

  const apply = () => setApplied({
    limit: 200,
    requestNo: requestNo.trim() || undefined,
    messageId: messageId.trim() || undefined,
    moduleCode: moduleCode.trim() || undefined,
    eventCode: eventCode.trim() || undefined,
    eventType: eventType.trim() || undefined,
    stage: stage.trim() || undefined,
    source: source.trim() || undefined,
    createdFrom: createdFrom ? new Date(createdFrom).toISOString() : undefined,
    createdTo: createdTo ? new Date(createdTo).toISOString() : undefined,
  });

  const rows = q.data ?? [];
  const summary = useMemo(() => ({ total: rows.length, distinctTypes: new Set(rows.map(r => r.event_type)).size }), [rows]);

  return (
    <OperationsShell title="Lifecycle Event Log" subtitle="Ordered lifecycle events for every communication">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div><Label>Request no.</Label><Input value={requestNo} onChange={e => setRequestNo(e.target.value)} placeholder="CR-…" /></div>
          <div><Label>Message id</Label><Input value={messageId} onChange={e => setMessageId(e.target.value)} placeholder="uuid" /></div>
          <div><Label>Module code</Label><Input value={moduleCode} onChange={e => setModuleCode(e.target.value)} /></div>
          <div><Label>Event code</Label><Input value={eventCode} onChange={e => setEventCode(e.target.value)} /></div>
          <div><Label>Event type</Label><Input value={eventType} onChange={e => setEventType(e.target.value)} placeholder="MESSAGE_QUEUED" /></div>
          <div><Label>Stage (payload.stage)</Label><Input value={stage} onChange={e => setStage(e.target.value)} placeholder="dispatch.attempt.start" /></div>
          <div><Label>Source</Label><Input value={source} onChange={e => setSource(e.target.value)} placeholder="comm-hub-dispatch" /></div>
          <div><Label>From</Label><Input type="datetime-local" value={createdFrom} onChange={e => setCreatedFrom(e.target.value)} /></div>
          <div><Label>To</Label><Input type="datetime-local" value={createdTo} onChange={e => setCreatedTo(e.target.value)} /></div>
          <div className="md:col-span-4 flex gap-2">
            <Button onClick={apply}>Apply</Button>
            <Button variant="outline" onClick={() => q.refetch()}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
            <div className="ml-auto text-sm text-muted-foreground self-center">{summary.total} events — {summary.distinctTypes} distinct types</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {q.isLoading ? (
            <div className="p-6 space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No lifecycle events for the current filters.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Occurred</TableHead>
                  <TableHead>Request</TableHead>
                  <TableHead>Msg</TableHead>
                  <TableHead>Module / Event</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <>
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{format(new Date(r.occurred_at), "yyyy-MM-dd HH:mm:ss")}</TableCell>
                      <TableCell className="font-mono text-xs">{r.request_no ?? "—"}</TableCell>
                      <TableCell className="font-mono text-[10px]">{r.message_id ? r.message_id.slice(0, 8) : "—"}</TableCell>
                      <TableCell className="text-xs">{r.module_code ? <div><div>{r.module_code}</div><div className="text-muted-foreground">{r.event_code}</div></div> : "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{r.event_type}</Badge></TableCell>
                      <TableCell className="text-xs">{r.stage ?? "—"}</TableCell>
                      <TableCell className="text-xs">{r.source ?? "—"}</TableCell>
                      <TableCell className="font-mono text-[10px]">{r.actor_user_id ? r.actor_user_id.slice(0, 8) : "—"}</TableCell>
                      <TableCell className="flex items-center gap-1">
                        <Collapsible open={openId === r.id} onOpenChange={(o) => setOpenId(o ? r.id : null)}>
                          <CollapsibleTrigger asChild><Button variant="ghost" size="sm"><ChevronDown className="h-3 w-3" /></Button></CollapsibleTrigger>
                        </Collapsible>
                        {r.request_id && (
                          <Button asChild variant="ghost" size="sm">
                            <Link to={`/admin/communication-hub/requests/${r.request_id}`}><ArrowRight className="h-3 w-3" /></Link>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                    {openId === r.id && (
                      <TableRow>
                        <TableCell colSpan={9} className="bg-muted/40">
                          <pre className="text-[10px] whitespace-pre-wrap max-h-64 overflow-auto">
                            {JSON.stringify(sanitizeProviderResponse(r.payload), null, 2)}
                          </pre>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </OperationsShell>
  );
}
