/**
 * EPIC 2B/2C + EPIC 3D-UX — Failed & Retry Queue.
 * Read-only listing of messages requiring operator attention, with
 * icon-based operator actions (retry dry-run, cancel, clear lock) that
 * remain gated by their existing SECURITY DEFINER RPCs and typed
 * confirmation dialogs.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import OperationsShell from "../utils/OperationsShell";
import { listRetryQueue, retryRecommendedAction, type DeliveryFilter, type DeliveryMonitorRow } from "../utils/operationsService";
import OperatorActionDialog from "../utils/OperatorActionDialog";
import { eligibleActionsFor, type OperatorActionKind } from "../utils/operatorActions";
import CommunicationHubDataTable, { type HubTableColumn } from "../components/CommunicationHubDataTable";
import {
  AbsoluteTime,
  MaskedEmail,
  MaskedPhone,
  ModuleEventPair,
  StatusBadge,
  TestLiveBadge,
  TruncatedId,
  YesNoBadge,
} from "../components/tableFormatters";
import { ACTION_ICONS, IconAction, RowActionGroup } from "../components/RowActions";

const ACTION_ICON_MAP: Record<OperatorActionKind, keyof typeof ACTION_ICONS> = {
  retry_dry_run: "retry",
  cancel: "cancel",
  clear_lock: "unlock",
};
const ACTION_LABEL: Record<OperatorActionKind, string> = {
  retry_dry_run: "Retry (dry-run)",
  cancel: "Cancel message",
  clear_lock: "Clear stale lock",
};

export default function RetryQueuePage() {
  const [moduleCode, setModuleCode] = useState("");
  const [eventCode, setEventCode] = useState("");
  const [requestNo, setRequestNo] = useState("");
  const [applied, setApplied] = useState<DeliveryFilter>({ limit: 500 });
  const [dialogKind, setDialogKind] = useState<OperatorActionKind | null>(null);
  const [dialogRow, setDialogRow] = useState<DeliveryMonitorRow | null>(null);

  const q = useQuery({
    queryKey: ["comm-hub", "retry-queue", applied],
    queryFn: () => listRetryQueue(applied),
  });

  const openAction = (row: DeliveryMonitorRow, kind: OperatorActionKind) => {
    setDialogRow(row);
    setDialogKind(kind);
  };

  const apply = () =>
    setApplied({
      limit: 500,
      moduleCode: moduleCode.trim() || undefined,
      eventCode: eventCode.trim() || undefined,
      requestNo: requestNo.trim() || undefined,
    });

  const rows = q.data ?? [];
  const summary = useMemo(
    () => ({
      total: rows.length,
      failed: rows.filter((r) => r.message_status === "failed").length,
      cancelled: rows.filter((r) => r.message_status === "cancelled").length,
      bounced: rows.filter((r) => r.bounced_at).length,
      stuckLocks: rows.filter((r) => r.locked_at && Date.now() - new Date(r.locked_at).getTime() > 30 * 60 * 1000).length,
    }),
    [rows],
  );

  const columns: HubTableColumn<DeliveryMonitorRow>[] = [
    {
      key: "request_no",
      header: "Request",
      sticky: "left",
      minWidth: 170,
      sortable: true,
      sortValue: (r) => r.request_no,
      cell: (r) => <span className="font-mono text-xs">{r.request_no}</span>,
    },
    { key: "message_id", header: "Msg", cell: (r) => <TruncatedId value={r.message_id} length={8} label="message id" /> },
    { key: "module_event", header: "Module / Event", cell: (r) => <ModuleEventPair moduleCode={r.module_code} eventCode={r.event_code} /> },
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
    { key: "message_status", header: "Status", sortable: true, sortValue: (r) => r.message_status, cell: (r) => <StatusBadge value={r.message_status} /> },
    { key: "test_mode", header: "Mode", sortable: true, sortValue: (r) => (r.test_mode ? 1 : 0), cell: (r) => <TestLiveBadge testMode={r.test_mode} /> },
    { key: "attempt_count", header: "Att.", sortable: true, sortValue: (r) => r.attempt_count ?? 0, cell: (r) => <span className="text-xs">{r.attempt_count ?? 0}</span> },
    {
      key: "error",
      header: "Error",
      cell: (r) =>
        r.error_code ? (
          <div className="text-xs max-w-[220px]">
            <div className="font-mono">{r.error_code}</div>
            <div className="text-muted-foreground truncate" title={r.error_message ?? ""}>{r.error_message}</div>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { key: "next_attempt_at", header: "Next attempt", sortable: true, sortValue: (r) => r.next_attempt_at, cell: (r) => <AbsoluteTime value={r.next_attempt_at} /> },
    {
      key: "locked",
      header: "Lock",
      cell: (r) =>
        r.locked_at ? (
          <div className="text-xs">
            <AbsoluteTime value={r.locked_at} />
            {r.locked_by && <div className="text-muted-foreground truncate max-w-[120px]">{r.locked_by}</div>}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "recommended",
      header: "Recommended",
      cell: (r) => {
        const rec = retryRecommendedAction(r);
        return (
          <div className="flex items-center gap-1 text-xs">
            <YesNoBadge value={rec.retryable} yesLabel="retryable" noLabel="review" />
            <span className="text-muted-foreground truncate max-w-[220px]" title={rec.action}>{rec.action}</span>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "",
      sticky: "right",
      minWidth: 180,
      cell: (r) => {
        const eligible = eligibleActionsFor(r);
        return (
          <RowActionGroup>
            <IconAction icon={ACTION_ICONS.view} label="Open request" to={`/admin/communication-hub/requests/${r.request_id}`} />
            <IconAction icon={ACTION_ICONS.timeline} label="View lifecycle" to={`/admin/communication-hub/lifecycle-log?request_no=${encodeURIComponent(r.request_no)}`} />
            {(["retry_dry_run", "cancel", "clear_lock"] as OperatorActionKind[]).map((k) => (
              <IconAction
                key={k}
                icon={ACTION_ICONS[ACTION_ICON_MAP[k]]}
                label={ACTION_LABEL[k]}
                danger={k === "cancel"}
                disabled={!eligible.includes(k)}
                onClick={() => openAction(r, k)}
              />
            ))}
          </RowActionGroup>
        );
      },
    },
  ];

  return (
    <OperationsShell title="Failed & Retry Queue" subtitle="Messages requiring operator attention">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div><Label>Module</Label><Input value={moduleCode} onChange={(e) => setModuleCode(e.target.value)} /></div>
          <div><Label>Event</Label><Input value={eventCode} onChange={(e) => setEventCode(e.target.value)} /></div>
          <div><Label>Request no.</Label><Input value={requestNo} onChange={(e) => setRequestNo(e.target.value)} /></div>
          <div className="md:col-span-4 flex gap-2">
            <Button onClick={apply}>Apply</Button>
            <Button variant="outline" onClick={() => q.refetch()}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
            <div className="ml-auto text-sm text-muted-foreground self-center">
              {summary.total} attention items — {summary.failed} failed · {summary.cancelled} cancelled · {summary.bounced} bounced · {summary.stuckLocks} stuck locks
            </div>
          </div>
        </CardContent>
      </Card>

      <CommunicationHubDataTable<DeliveryMonitorRow>
        screenKey="retry-queue"
        columns={columns}
        rows={rows}
        loading={q.isLoading}
        error={q.error as Error | null}
        onRetry={() => q.refetch()}
        getRowKey={(r) => r.message_id}
        defaultSort={{ key: "next_attempt_at", direction: "desc" }}
        emptyMessage="No messages need attention."
      />

      <OperatorActionDialog
        open={dialogKind !== null}
        onOpenChange={(v) => {
          if (!v) {
            setDialogKind(null);
            setDialogRow(null);
          }
        }}
        kind={dialogKind}
        row={dialogRow}
        onCompleted={() => q.refetch()}
      />
    </OperationsShell>
  );
}
