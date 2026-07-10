/**
 * EPIC 2B + EPIC 3D-UX — Lifecycle Event Log.
 * Read-only view of communication_event_log with sanitized payload preview.
 * Presented through the shared CommunicationHubDataTable.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import OperationsShell from "../utils/OperationsShell";
import { sanitizeProviderResponse } from "../utils/mask";
import { listLifecycleEvents, type LifecycleEventRow, type LifecycleFilter } from "../utils/operationsService";
import CommunicationHubDataTable, { type HubTableColumn } from "../components/CommunicationHubDataTable";
import { AbsoluteTime, ModuleEventPair, StatusBadge, TruncatedId } from "../components/tableFormatters";
import { ACTION_ICONS, IconAction, RowActionGroup } from "../components/RowActions";

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
  const [applied, setApplied] = useState<LifecycleFilter>({ limit: 500 });
  const [payloadRow, setPayloadRow] = useState<LifecycleEventRow | null>(null);

  const q = useQuery({
    queryKey: ["comm-hub", "lifecycle-log", applied],
    queryFn: () => listLifecycleEvents(applied),
  });

  const apply = () =>
    setApplied({
      limit: 500,
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
  const summary = useMemo(
    () => ({ total: rows.length, distinctTypes: new Set(rows.map((r) => r.event_type)).size }),
    [rows],
  );

  const columns: HubTableColumn<LifecycleEventRow>[] = [
    {
      key: "occurred_at",
      header: "Occurred",
      sticky: "left",
      minWidth: 170,
      sortable: true,
      sortValue: (r) => r.occurred_at,
      cell: (r) => <AbsoluteTime value={r.occurred_at} pattern="yyyy-MM-dd HH:mm:ss" />,
    },
    { key: "request_no", header: "Request", sortable: true, sortValue: (r) => r.request_no, cell: (r) => <span className="font-mono text-xs">{r.request_no ?? "—"}</span> },
    { key: "message_id", header: "Msg", cell: (r) => <TruncatedId value={r.message_id} length={8} label="message id" /> },
    { key: "module_event", header: "Module / Event", cell: (r) => <ModuleEventPair moduleCode={r.module_code} eventCode={r.event_code} /> },
    { key: "event_type", header: "Type", sortable: true, sortValue: (r) => r.event_type, cell: (r) => <StatusBadge value={r.event_type} map={{}} /> },
    { key: "stage", header: "Stage", cell: (r) => <span className="text-xs">{r.stage ?? "—"}</span> },
    { key: "source", header: "Source", cell: (r) => <span className="text-xs">{r.source ?? "—"}</span> },
    { key: "actor_user_id", header: "Actor", cell: (r) => <TruncatedId value={r.actor_user_id} length={8} label="actor id" /> },
    {
      key: "actions",
      header: "",
      sticky: "right",
      minWidth: 130,
      cell: (r) => (
        <RowActionGroup>
          <IconAction icon={ACTION_ICONS.view} label="Open request" to={r.request_id ? `/admin/communication-hub/requests/${r.request_id}` : "#"} disabled={!r.request_id} />
          <IconAction icon={ACTION_ICONS.expand} label="View sanitized payload" onClick={() => setPayloadRow(r)} />
          <IconAction
            icon={ACTION_ICONS.copy}
            label="Copy message id"
            disabled={!r.message_id}
            onClick={() => {
              if (!r.message_id) return;
              navigator.clipboard.writeText(r.message_id).then(
                () => toast.success("Message id copied"),
                () => toast.error("Copy failed"),
              );
            }}
          />
        </RowActionGroup>
      ),
    },
  ];

  return (
    <OperationsShell title="Lifecycle Event Log" subtitle="Ordered lifecycle events for every communication">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div><Label>Request no.</Label><Input value={requestNo} onChange={(e) => setRequestNo(e.target.value)} placeholder="CR-…" /></div>
          <div><Label>Message id</Label><Input value={messageId} onChange={(e) => setMessageId(e.target.value)} placeholder="uuid" /></div>
          <div><Label>Module code</Label><Input value={moduleCode} onChange={(e) => setModuleCode(e.target.value)} /></div>
          <div><Label>Event code</Label><Input value={eventCode} onChange={(e) => setEventCode(e.target.value)} /></div>
          <div><Label>Event type</Label><Input value={eventType} onChange={(e) => setEventType(e.target.value)} placeholder="MESSAGE_QUEUED" /></div>
          <div><Label>Stage (payload.stage)</Label><Input value={stage} onChange={(e) => setStage(e.target.value)} placeholder="dispatch.attempt.start" /></div>
          <div><Label>Source</Label><Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="comm-hub-dispatch" /></div>
          <div><Label>From</Label><Input type="datetime-local" value={createdFrom} onChange={(e) => setCreatedFrom(e.target.value)} /></div>
          <div><Label>To</Label><Input type="datetime-local" value={createdTo} onChange={(e) => setCreatedTo(e.target.value)} /></div>
          <div className="md:col-span-4 flex gap-2">
            <Button onClick={apply}>Apply</Button>
            <Button variant="outline" onClick={() => q.refetch()}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
            <div className="ml-auto text-sm text-muted-foreground self-center">
              {summary.total} events — {summary.distinctTypes} distinct types
            </div>
          </div>
        </CardContent>
      </Card>

      <CommunicationHubDataTable
        screenKey="lifecycle-log"
        columns={columns}
        rows={rows}
        loading={q.isLoading}
        error={q.error as Error | null}
        onRetry={() => q.refetch()}
        getRowKey={(r) => r.id}
        defaultSort={{ key: "occurred_at", direction: "desc" }}
        emptyMessage="No lifecycle events for the current filters."
      />

      <Dialog open={payloadRow !== null} onOpenChange={(v) => !v && setPayloadRow(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Sanitized payload</DialogTitle>
            <DialogDescription>
              {payloadRow?.event_type ?? ""} — {payloadRow?.request_no ?? "—"} — provider secrets/tokens are removed.
            </DialogDescription>
          </DialogHeader>
          <pre className="text-[11px] whitespace-pre-wrap max-h-[60vh] overflow-auto bg-muted/50 p-3 rounded">
            {payloadRow ? JSON.stringify(sanitizeProviderResponse(payloadRow.payload), null, 2) : ""}
          </pre>
        </DialogContent>
      </Dialog>
    </OperationsShell>
  );
}
