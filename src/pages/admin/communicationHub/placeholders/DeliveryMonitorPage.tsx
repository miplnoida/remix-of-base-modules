/**
 * EPIC 2B — Delivery Monitor. Read-only, PII-masked view of the
 * communication_message spine with per-message delivery events.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowRight, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import OperationsShell from "../utils/OperationsShell";
import { maskEmail, maskPhone } from "../utils/mask";
import { listDeliveryMonitor, type DeliveryFilter } from "../utils/operationsService";

const CHANNELS = ["email", "sms", "push", "in_app", "letter", "print", "whatsapp"];
const STATUSES = ["pending", "queued", "sending", "sent", "delivered", "failed", "bounced", "complained", "cancelled", "suppressed"];

export default function DeliveryMonitorPage() {
  const [moduleCode, setModuleCode] = useState("");
  const [eventCode, setEventCode] = useState("");
  const [channel, setChannel] = useState("all");
  const [status, setStatus] = useState("all");
  const [testMode, setTestMode] = useState<"all" | "test" | "live">("all");
  const [requestNo, setRequestNo] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [applied, setApplied] = useState<DeliveryFilter>({ limit: 100 });

  const q = useQuery({
    queryKey: ["comm-hub", "delivery-monitor", applied],
    queryFn: () => listDeliveryMonitor(applied),
  });

  const apply = () => setApplied({
    limit: 100,
    moduleCode: moduleCode.trim() || undefined,
    eventCode: eventCode.trim() || undefined,
    channel: channel !== "all" ? channel : undefined,
    status: status !== "all" ? status : undefined,
    testMode,
    requestNo: requestNo.trim() || undefined,
    createdFrom: createdFrom ? new Date(createdFrom).toISOString() : undefined,
    createdTo: createdTo ? new Date(createdTo).toISOString() : undefined,
  });

  const rows = q.data ?? [];
  const summary = useMemo(() => ({
    total: rows.length,
    test: rows.filter(r => r.test_mode).length,
    live: rows.filter(r => !r.test_mode).length,
    failed: rows.filter(r => ["failed", "bounced", "complained"].includes(r.message_status)).length,
  }), [rows]);

  return (
    <OperationsShell title="Delivery Monitor" subtitle="Per-message delivery status across all channels">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div><Label>Module code</Label><Input value={moduleCode} onChange={e => setModuleCode(e.target.value)} placeholder="COMM_HUB" /></div>
          <div><Label>Event code</Label><Input value={eventCode} onChange={e => setEventCode(e.target.value)} placeholder="ADMIN_TEST_NOTICE" /></div>
          <div><Label>Request no.</Label><Input value={requestNo} onChange={e => setRequestNo(e.target.value)} placeholder="CR-…" /></div>
          <div><Label>Channel</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem>{CHANNELS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Mode</Label>
            <Select value={testMode} onValueChange={(v) => setTestMode(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="test">Test</SelectItem><SelectItem value="live">Live</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>From</Label><Input type="datetime-local" value={createdFrom} onChange={e => setCreatedFrom(e.target.value)} /></div>
          <div><Label>To</Label><Input type="datetime-local" value={createdTo} onChange={e => setCreatedTo(e.target.value)} /></div>
          <div className="md:col-span-4 flex gap-2">
            <Button onClick={apply}>Apply</Button>
            <Button variant="outline" onClick={() => q.refetch()}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
            <div className="ml-auto text-sm text-muted-foreground self-center">
              {summary.total} rows — {summary.live} live, {summary.test} test, {summary.failed} failed/bounced/complained
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {q.isLoading ? (
            <div className="p-6 space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No messages match the current filters.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request</TableHead>
                  <TableHead>Module / Event</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Msg Status</TableHead>
                  <TableHead>Provider Msg</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead>Last Event</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.message_id}>
                    <TableCell className="font-mono text-xs">{r.request_no}</TableCell>
                    <TableCell><div className="text-xs"><div>{r.module_code}</div><div className="text-muted-foreground">{r.event_code}</div></div></TableCell>
                    <TableCell className="text-xs">
                      <div>{maskEmail(r.recipient_email)}</div>
                      {r.recipient_phone && <div className="text-muted-foreground">{maskPhone(r.recipient_phone)}</div>}
                    </TableCell>
                    <TableCell><Badge variant="outline">{r.channel}</Badge></TableCell>
                    <TableCell><Badge variant={r.test_mode ? "secondary" : "default"}>{r.test_mode ? "test" : "live"}</Badge></TableCell>
                    <TableCell><Badge variant={r.message_status === "sent" || r.message_status === "delivered" ? "default" : r.message_status === "failed" || r.message_status === "bounced" ? "destructive" : "secondary"}>{r.message_status}</Badge></TableCell>
                    <TableCell className="font-mono text-[10px]">{r.provider_message_id ? r.provider_message_id.slice(0, 24) + (r.provider_message_id.length > 24 ? "…" : "") : "—"}</TableCell>
                    <TableCell className="text-xs">{r.attempt_count ?? 0}</TableCell>
                    <TableCell className="text-xs">{r.sent_at ? format(new Date(r.sent_at), "yyyy-MM-dd HH:mm") : "—"}</TableCell>
                    <TableCell className="text-xs">{r.delivered_at ? format(new Date(r.delivered_at), "yyyy-MM-dd HH:mm") : "—"}</TableCell>
                    <TableCell className="text-xs">
                      {r.delivery_last_event_type ? (
                        <div><div>{r.delivery_last_event_type}</div><div className="text-muted-foreground">{r.delivery_last_event_at ? format(new Date(r.delivery_last_event_at), "yyyy-MM-dd HH:mm") : ""}</div></div>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/admin/communication-hub/requests/${r.request_id}`}>Open<ArrowRight className="h-3 w-3 ml-1" /></Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </OperationsShell>
  );
}
