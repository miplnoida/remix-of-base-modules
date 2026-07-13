/**
 * EPIC 2B — Print Queue. Read-only view of communication_message rows
 * whose channel is print or letter. Empty state is expected in this
 * phase; no channels currently emit print/letter through the Hub.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import OperationsShell from "../utils/OperationsShell";
import { maskEmail } from "../utils/mask";
import { listPrintQueue, type DeliveryFilter } from "../utils/operationsService";
import { CommunicationHubDataTable, type HubTableColumn } from "../components/CommunicationHubDataTable";
import { AbsoluteTime, ModuleEventPair, TruncatedId } from "../components/tableFormatters";

type PrintRow = Awaited<ReturnType<typeof listPrintQueue>>[number];

const recommend = (status: string): string => {
  if (status === "sent" || status === "delivered") return "Printed / dispatched — no action.";
  if (status === "failed") return "Print failed — review generated document.";
  if (status === "queued") return "Awaiting print worker (not enabled in this phase).";
  return "Review manually.";
};

const columns: HubTableColumn<PrintRow>[] = [
  {
    key: "created_at",
    header: "Created",
    sortable: true,
    sortValue: (r) => (r.created_at ? new Date(r.created_at) : null),
    cell: (r) => <AbsoluteTime value={r.created_at} />,
  },
  {
    key: "request_no",
    header: "Request",
    sortable: true,
    sortValue: (r) => r.request_no ?? "",
    sticky: "left",
    cell: (r) => <span className="font-mono text-xs">{r.request_no}</span>,
  },
  {
    key: "module_event",
    header: "Module / Event",
    sortable: true,
    sortValue: (r) => `${r.module_code ?? ""}|${r.event_code ?? ""}`,
    cell: (r) => <ModuleEventPair moduleCode={r.module_code} eventCode={r.event_code} />,
  },
  {
    key: "recipient",
    header: "Recipient",
    cell: (r) => (
      <span className="text-xs">{r.recipient_name ?? maskEmail(r.recipient_email ?? "") ?? "—"}</span>
    ),
  },
  {
    key: "channel",
    header: "Channel",
    sortable: true,
    sortValue: (r) => r.channel ?? "",
    cell: (r) => <Badge variant="outline">{r.channel}</Badge>,
  },
  {
    key: "template_version_id",
    header: "Template v.",
    cell: (r) => <TruncatedId value={r.template_version_id} length={8} label="template version" />,
  },
  {
    key: "generated_document_id",
    header: "Generated doc",
    cell: (r) => <TruncatedId value={r.generated_document_id} length={8} label="generated document" />,
  },
  {
    key: "status",
    header: "Status",
    sortable: true,
    sortValue: (r) => r.status ?? "",
    cell: (r) => <Badge variant="secondary">{r.status}</Badge>,
  },
  {
    key: "rendered_at",
    header: "Rendered",
    sortable: true,
    sortValue: (r) => (r.rendered_at ? new Date(r.rendered_at) : null),
    cell: (r) => <AbsoluteTime value={r.rendered_at} />,
  },
  {
    key: "sent_at",
    header: "Sent",
    sortable: true,
    sortValue: (r) => (r.sent_at ? new Date(r.sent_at) : null),
    cell: (r) => <AbsoluteTime value={r.sent_at} />,
  },
  {
    key: "recommendation",
    header: "Recommended action",
    cell: (r) => <span className="text-xs">{recommend(r.status)}</span>,
  },
  {
    key: "actions",
    header: "",
    sticky: "right",
    cell: (r) => (
      <Button asChild variant="ghost" size="sm">
        <Link to={`/admin/communication-hub/requests/${r.request_id}`}>
          Open<ArrowRight className="h-3 w-3 ml-1" />
        </Link>
      </Button>
    ),
  },
];

export default function PrintQueuePage() {
  const [requestNo, setRequestNo] = useState("");
  const [applied, setApplied] = useState<DeliveryFilter>({ limit: 100 });

  const q = useQuery({
    queryKey: ["comm-hub", "print-queue", applied],
    queryFn: () => listPrintQueue(applied),
  });

  const rows = (q.data ?? []).filter(
    (r) => !requestNo.trim() || r.request_no.toLowerCase().includes(requestNo.trim().toLowerCase()),
  );

  return (
    <OperationsShell title="Print Queue" subtitle="Print & letter channel messages awaiting fulfilment" section="Operations">
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

      <CommunicationHubDataTable
        screenKey="comm-hub.print-queue"
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.message_id}
        loading={q.isLoading}
        error={q.error ? (q.error as Error) : null}
        onRetry={() => void q.refetch()}
        defaultSort={{ key: "created_at", direction: "desc" }}
        emptyMessage="No print or letter messages. Print/letter dispatch is not enabled in this phase — the Hub only produces email messages today."
      />
    </OperationsShell>
  );
}
