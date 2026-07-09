/**
 * EPIC 2B — Print Queue. Read-only view of communication_message rows
 * whose channel is print or letter. Empty state is expected in this
 * phase; no channels currently emit print/letter through the Hub.
 */
import { useState } from "react";
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
import { maskEmail } from "../utils/mask";
import { listPrintQueue, type DeliveryFilter } from "../utils/operationsService";

export default function PrintQueuePage() {
  const [requestNo, setRequestNo] = useState("");
  const [applied, setApplied] = useState<DeliveryFilter>({ limit: 100 });

  const q = useQuery({
    queryKey: ["comm-hub", "print-queue", applied],
    queryFn: () => listPrintQueue(applied),
  });

  const rows = (q.data ?? []).filter(r => !requestNo.trim() || r.request_no.toLowerCase().includes(requestNo.trim().toLowerCase()));

  const recommend = (status: string): string => {
    if (status === "sent" || status === "delivered") return "Printed / dispatched — no action.";
    if (status === "failed") return "Print failed — review generated document.";
    if (status === "queued") return "Awaiting print worker (not enabled in this phase).";
    return "Review manually.";
  };

  return (
    <OperationsShell title="Print Queue" subtitle="Print & letter channel messages awaiting fulfilment">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div><Label>Request no.</Label><Input value={requestNo} onChange={e => setRequestNo(e.target.value)} placeholder="CR-…" /></div>
          <div className="md:col-span-4 flex gap-2">
            <Button onClick={() => setApplied({ limit: 100 })}>Apply</Button>
            <Button variant="outline" onClick={() => q.refetch()}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
            <div className="ml-auto text-sm text-muted-foreground self-center">{rows.length} print/letter messages</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {q.isLoading ? (
            <div className="p-6 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              No print or letter messages. Print/letter dispatch is not enabled in this phase — the Hub only produces email messages today.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request</TableHead>
                  <TableHead>Module / Event</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Template v.</TableHead>
                  <TableHead>Generated doc</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Rendered</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Recommended action</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.message_id}>
                    <TableCell className="font-mono text-xs">{r.request_no}</TableCell>
                    <TableCell className="text-xs"><div>{r.module_code}</div><div className="text-muted-foreground">{r.event_code}</div></TableCell>
                    <TableCell className="text-xs">{r.recipient_name ?? maskEmail(r.recipient_email) ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline">{r.channel}</Badge></TableCell>
                    <TableCell className="font-mono text-[10px]">{r.template_version_id ? r.template_version_id.slice(0, 8) : "—"}</TableCell>
                    <TableCell className="font-mono text-[10px]">{r.generated_document_id ? r.generated_document_id.slice(0, 8) : "—"}</TableCell>
                    <TableCell><Badge variant="secondary">{r.status}</Badge></TableCell>
                    <TableCell className="text-xs">{format(new Date(r.created_at), "yyyy-MM-dd HH:mm")}</TableCell>
                    <TableCell className="text-xs">{r.rendered_at ? format(new Date(r.rendered_at), "yyyy-MM-dd HH:mm") : "—"}</TableCell>
                    <TableCell className="text-xs">{r.sent_at ? format(new Date(r.sent_at), "yyyy-MM-dd HH:mm") : "—"}</TableCell>
                    <TableCell className="text-xs">{recommend(r.status)}</TableCell>
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
