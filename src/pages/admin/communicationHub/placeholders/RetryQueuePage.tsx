/**
 * EPIC 2B — Failed & Retry Queue. Read-only. Highlights messages that
 * need operator attention. No retry/cancel/suppress buttons yet.
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
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import OperationsShell from "../utils/OperationsShell";
import { maskEmail, maskPhone } from "../utils/mask";
import { listRetryQueue, retryRecommendedAction, type DeliveryFilter, type DeliveryMonitorRow } from "../utils/operationsService";
import OperatorActionDialog from "../utils/OperatorActionDialog";
import { eligibleActionsFor, ACTION_SPECS, type OperatorActionKind } from "../utils/operatorActions";

export default function RetryQueuePage() {
  const [moduleCode, setModuleCode] = useState("");
  const [eventCode, setEventCode] = useState("");
  const [requestNo, setRequestNo] = useState("");
  const [applied, setApplied] = useState<DeliveryFilter>({ limit: 200 });
  const [dialogKind, setDialogKind] = useState<OperatorActionKind | null>(null);
  const [dialogRow, setDialogRow] = useState<DeliveryMonitorRow | null>(null);

  const q = useQuery({
    queryKey: ["comm-hub", "retry-queue", applied],
    queryFn: () => listRetryQueue(applied),
  });

  const openAction = (row: DeliveryMonitorRow, kind: OperatorActionKind) => {
    setDialogRow(row); setDialogKind(kind);
  };

  const apply = () => setApplied({
    limit: 200,
    moduleCode: moduleCode.trim() || undefined,
    eventCode: eventCode.trim() || undefined,
    requestNo: requestNo.trim() || undefined,
  });

  const rows = q.data ?? [];
  const summary = useMemo(() => ({
    total: rows.length,
    failed: rows.filter(r => r.message_status === "failed").length,
    cancelled: rows.filter(r => r.message_status === "cancelled").length,
    bounced: rows.filter(r => r.bounced_at).length,
    stuckLocks: rows.filter(r => r.locked_at && Date.now() - new Date(r.locked_at).getTime() > 30 * 60 * 1000).length,
  }), [rows]);

  return (
    <OperationsShell title="Failed & Retry Queue" subtitle="Messages requiring operator attention (read-only)">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div><Label>Module</Label><Input value={moduleCode} onChange={e => setModuleCode(e.target.value)} /></div>
          <div><Label>Event</Label><Input value={eventCode} onChange={e => setEventCode(e.target.value)} /></div>
          <div><Label>Request no.</Label><Input value={requestNo} onChange={e => setRequestNo(e.target.value)} /></div>
          <div className="md:col-span-4 flex gap-2">
            <Button onClick={apply}>Apply</Button>
            <Button variant="outline" onClick={() => q.refetch()}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
            <div className="ml-auto text-sm text-muted-foreground self-center">
              {summary.total} attention items — {summary.failed} failed · {summary.cancelled} cancelled · {summary.bounced} bounced · {summary.stuckLocks} stuck locks
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {q.isLoading ? (
            <div className="p-6 space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No messages need attention.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request</TableHead>
                  <TableHead>Msg</TableHead>
                  <TableHead>Module / Event</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Next attempt</TableHead>
                  <TableHead>Lock</TableHead>
                  <TableHead>Recommended action</TableHead>
                  <TableHead>Operator actions</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => {
                  const rec = retryRecommendedAction(r);
                  return (
                    <TableRow key={r.message_id}>
                      <TableCell className="font-mono text-xs">{r.request_no}</TableCell>
                      <TableCell className="font-mono text-[10px]">{r.message_id.slice(0, 8)}</TableCell>
                      <TableCell className="text-xs"><div>{r.module_code}</div><div className="text-muted-foreground">{r.event_code}</div></TableCell>
                      <TableCell className="text-xs">
                        <div>{maskEmail(r.recipient_email)}</div>
                        {r.recipient_phone && <div className="text-muted-foreground">{maskPhone(r.recipient_phone)}</div>}
                      </TableCell>
                      <TableCell><Badge variant="outline">{r.channel}</Badge></TableCell>
                      <TableCell><Badge variant={r.message_status === "failed" || r.message_status === "bounced" ? "destructive" : "secondary"}>{r.message_status}</Badge></TableCell>
                      <TableCell><Badge variant={r.test_mode ? "secondary" : "default"}>{r.test_mode ? "test" : "live"}</Badge></TableCell>
                      <TableCell className="text-xs">{r.attempt_count ?? 0}</TableCell>
                      <TableCell className="text-xs max-w-[220px] truncate" title={r.error_message ?? ""}>
                        {r.error_code ? <><div className="font-mono">{r.error_code}</div><div className="text-muted-foreground truncate">{r.error_message}</div></> : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{r.next_attempt_at ? format(new Date(r.next_attempt_at), "yyyy-MM-dd HH:mm") : "—"}</TableCell>
                      <TableCell className="text-xs">{r.locked_at ? <><div>{format(new Date(r.locked_at), "yyyy-MM-dd HH:mm")}</div><div className="text-muted-foreground truncate max-w-[120px]">{r.locked_by ?? ""}</div></> : "—"}</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1">
                          <Badge variant={rec.retryable ? "default" : "outline"} className="text-[10px]">{rec.retryable ? "retryable" : "review"}</Badge>
                          <span>{rec.action}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/admin/communication-hub/requests/${r.request_id}`}>Open<ArrowRight className="h-3 w-3 ml-1" /></Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </OperationsShell>
  );
}
