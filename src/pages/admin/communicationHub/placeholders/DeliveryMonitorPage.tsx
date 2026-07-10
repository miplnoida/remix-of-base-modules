/**
 * EPIC 2B + EPIC 3D-UX — Delivery Monitor.
 * Read-only, PII-masked view of the communication_message spine.
 * Presented through the shared CommunicationHubDataTable so pagination,
 * sorting, sticky columns, icon actions and formatting stay uniform
 * across every Communication Hub screen.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import OperationsShell from "../utils/OperationsShell";
import { listDeliveryMonitor, type DeliveryFilter, type DeliveryMonitorRow } from "../utils/operationsService";
import CommunicationHubDataTable, {
  type HubTableColumn,
} from "../components/CommunicationHubDataTable";
import {
  AbsoluteTime,
  MaskedEmail,
  MaskedPhone,
  ModuleEventPair,
  StatusBadge,
  TestLiveBadge,
  TruncatedId,
} from "../components/tableFormatters";
import { ACTION_ICONS, IconAction, RowActionGroup } from "../components/RowActions";
import { toast } from "sonner";

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
  const [applied, setApplied] = useState<DeliveryFilter>({ limit: 500 });

  const q = useQuery({
    queryKey: ["comm-hub", "delivery-monitor", applied],
    queryFn: () => listDeliveryMonitor(applied),
  });

  const apply = () =>
    setApplied({
      limit: 500,
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
  const summary = useMemo(
    () => ({
      total: rows.length,
      test: rows.filter((r) => r.test_mode).length,
      live: rows.filter((r) => !r.test_mode).length,
      failed: rows.filter((r) => ["failed", "bounced", "complained"].includes(r.message_status)).length,
    }),
    [rows],
  );

  const columns: HubTableColumn<DeliveryMonitorRow>[] = [
    {
      key: "request_no",
      header: "Request",
      sticky: "left",
      sortable: true,
      sortValue: (r) => r.request_no,
      minWidth: 170,
      cell: (r) => <span className="font-mono text-xs">{r.request_no}</span>,
    },
    {
      key: "module_event",
      header: "Module / Event",
      cell: (r) => <ModuleEventPair moduleCode={r.module_code} eventCode={r.event_code} />,
    },
    {
      key: "recipient",
      header: "Recipient",
      cell: (r) => (
        <div className="space-y-0.5">
          <MaskedEmail value={r.recipient_email} />
          {r.recipient_phone && <MaskedPhone value={r.recipient_phone} />}
        </div>
      ),
    },
    { key: "channel", header: "Channel", cell: (r) => <StatusBadge value={r.channel} map={{}} /> },
    { key: "test_mode", header: "Mode", sortable: true, sortValue: (r) => (r.test_mode ? 1 : 0), cell: (r) => <TestLiveBadge testMode={r.test_mode} /> },
    {
      key: "message_status",
      header: "Msg status",
      sortable: true,
      sortValue: (r) => r.message_status,
      cell: (r) => <StatusBadge value={r.message_status} />,
    },
    {
      key: "provider_message_id",
      header: "Provider msg",
      cell: (r) => <TruncatedId value={r.provider_message_id} length={12} label="provider msg id" />,
    },
    { key: "attempt_count", header: "Att.", sortable: true, sortValue: (r) => r.attempt_count ?? 0, cell: (r) => <span className="text-xs">{r.attempt_count ?? 0}</span> },
    { key: "sent_at", header: "Sent", sortable: true, sortValue: (r) => r.sent_at, cell: (r) => <AbsoluteTime value={r.sent_at} /> },
    { key: "delivered_at", header: "Delivered", sortable: true, sortValue: (r) => r.delivered_at, cell: (r) => <AbsoluteTime value={r.delivered_at} /> },
    {
      key: "last_event",
      header: "Last event",
      cell: (r) =>
        r.delivery_last_event_type ? (
          <div className="text-xs leading-tight">
            <div>{r.delivery_last_event_type}</div>
            <AbsoluteTime value={r.delivery_last_event_at} />
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      sticky: "right",
      minWidth: 130,
      cell: (r) => (
        <RowActionGroup>
          <IconAction icon={ACTION_ICONS.view} label="Open request" to={`/admin/communication-hub/requests/${r.request_id}`} />
          <IconAction icon={ACTION_ICONS.timeline} label="View timeline" to={`/admin/communication-hub/lifecycle-log?request_no=${encodeURIComponent(r.request_no)}`} />
          <IconAction
            icon={ACTION_ICONS.copy}
            label="Copy provider message id"
            disabled={!r.provider_message_id}
            onClick={() => {
              if (!r.provider_message_id) return;
              navigator.clipboard.writeText(r.provider_message_id).then(
                () => toast.success("Provider message id copied"),
                () => toast.error("Copy failed"),
              );
            }}
          />
        </RowActionGroup>
      ),
    },
  ];

  return (
    <OperationsShell title="Delivery Monitor" subtitle="Per-message delivery status across all channels">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div><Label>Module code</Label><Input value={moduleCode} onChange={(e) => setModuleCode(e.target.value)} placeholder="COMM_HUB" /></div>
          <div><Label>Event code</Label><Input value={eventCode} onChange={(e) => setEventCode(e.target.value)} placeholder="ADMIN_TEST_NOTICE" /></div>
          <div><Label>Request no.</Label><Input value={requestNo} onChange={(e) => setRequestNo(e.target.value)} placeholder="CR-…" /></div>
          <div>
            <Label>Channel</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem>{CHANNELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Mode</Label>
            <Select value={testMode} onValueChange={(v) => setTestMode(v as "all" | "test" | "live")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="test">Test</SelectItem><SelectItem value="live">Live</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>From</Label><Input type="datetime-local" value={createdFrom} onChange={(e) => setCreatedFrom(e.target.value)} /></div>
          <div><Label>To</Label><Input type="datetime-local" value={createdTo} onChange={(e) => setCreatedTo(e.target.value)} /></div>
          <div className="md:col-span-4 flex gap-2">
            <Button onClick={apply}>Apply</Button>
            <Button variant="outline" onClick={() => q.refetch()}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
            <div className="ml-auto text-sm text-muted-foreground self-center">
              {summary.total} rows — {summary.live} live, {summary.test} test, {summary.failed} failed/bounced/complained
            </div>
          </div>
        </CardContent>
      </Card>

      <CommunicationHubDataTable<DeliveryMonitorRow>
        screenKey="delivery-monitor"
        columns={columns}
        rows={rows}
        loading={q.isLoading}
        error={q.error as Error | null}
        onRetry={() => q.refetch()}
        getRowKey={(r) => r.message_id}
        defaultSort={{ key: "sent_at", direction: "desc" }}
        emptyMessage="No messages match the current filters."
      />
    </OperationsShell>
  );
}
