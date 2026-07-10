/**
 * EPIC 2B + EPIC 3D-UX — Dispatch Register.
 * Official register of every communication issued by the Hub.
 * Presented through the shared CommunicationHubDataTable.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import OperationsShell from "../utils/OperationsShell";
import { maskEmail, maskPhone } from "../utils/mask";
import { listDispatchRegister, type DeliveryFilter, type DispatchRegisterRow } from "../utils/operationsService";
import CommunicationHubDataTable, { type HubTableColumn } from "../components/CommunicationHubDataTable";
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

const CHANNELS = ["email", "sms", "push", "in_app", "letter", "print", "whatsapp"];
const STATUSES = ["pending", "queued", "sending", "sent", "delivered", "failed", "bounced", "cancelled"];

function toCsv(rows: any[]): string {
  if (!rows.length) return "";
  const cols = [
    "request_no", "module_code", "event_code", "entity_type", "entity_id", "reference_no",
    "recipient_masked", "channel", "template_version_id", "test_mode",
    "request_status", "message_status", "requested_by", "created_at", "sent_at", "delivered_at",
  ];
  const escape = (v: any) => (v == null ? "" : `"${String(v).replace(/"/g, '""')}"`);
  return [cols.join(","), ...rows.map((r) => cols.map((c) => escape((r as any)[c])).join(","))].join("\n");
}

export default function DispatchRegisterPage() {
  const [moduleCode, setModuleCode] = useState("");
  const [eventCode, setEventCode] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [requestNo, setRequestNo] = useState("");
  const [channel, setChannel] = useState("all");
  const [status, setStatus] = useState("all");
  const [testMode, setTestMode] = useState<"all" | "test" | "live">("all");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [applied, setApplied] = useState<DeliveryFilter>({ limit: 500 });

  const q = useQuery({
    queryKey: ["comm-hub", "dispatch-register", applied, referenceNo],
    queryFn: () => listDispatchRegister(applied),
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

  const rows = useMemo(() => {
    const all = q.data ?? [];
    if (!referenceNo.trim()) return all;
    const needle = referenceNo.trim().toLowerCase();
    return all.filter((r) => (r.reference_no ?? "").toLowerCase().includes(needle));
  }, [q.data, referenceNo]);

  const downloadCsv = () => {
    const csv = toCsv(
      rows.map((r) => ({
        ...r,
        recipient_masked: maskEmail(r.recipient_email) + (r.recipient_phone ? ` | ${maskPhone(r.recipient_phone)}` : ""),
      })),
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dispatch-register-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: HubTableColumn<DispatchRegisterRow>[] = [
    { key: "request_no", header: "Request", sticky: "left", minWidth: 170, sortable: true, sortValue: (r) => r.request_no, cell: (r) => <span className="font-mono text-xs">{r.request_no}</span> },
    { key: "module_event", header: "Module / Event", cell: (r) => <ModuleEventPair moduleCode={r.module_code} eventCode={r.event_code} /> },
    { key: "entity", header: "Entity", cell: (r) => (
      <div className="text-xs space-y-0.5">
        <div>{r.entity_type ?? "—"}</div>
        {r.entity_id && <TruncatedId value={r.entity_id} length={8} label="entity id" />}
        {r.entity_type === "legal_case" && (
          <span className="inline-block text-[9px] uppercase tracking-wide rounded bg-secondary px-1 py-0.5">Legal Case Workflow</span>
        )}
      </div>
    ) },

    { key: "reference_no", header: "Ref", sortable: true, sortValue: (r) => r.reference_no, cell: (r) => <span className="text-xs">{r.reference_no ?? "—"}</span> },
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
    { key: "channel", header: "Channel", cell: (r) => (r.channel ? <StatusBadge value={r.channel} map={{}} /> : <span className="text-muted-foreground">—</span>) },
    { key: "template_version_id", header: "Template v.", cell: (r) => <TruncatedId value={r.template_version_id} length={8} label="template version id" /> },
    { key: "test_mode", header: "Mode", sortable: true, sortValue: (r) => (r.test_mode ? 1 : 0), cell: (r) => <TestLiveBadge testMode={r.test_mode} /> },
    { key: "request_status", header: "Req status", sortable: true, sortValue: (r) => r.request_status, cell: (r) => <StatusBadge value={r.request_status} map={{}} /> },
    { key: "message_status", header: "Msg status", sortable: true, sortValue: (r) => r.message_status, cell: (r) => <StatusBadge value={r.message_status} /> },
    { key: "created_at", header: "Created", sortable: true, sortValue: (r) => r.created_at, cell: (r) => <AbsoluteTime value={r.created_at} /> },
    { key: "sent_at", header: "Sent", sortable: true, sortValue: (r) => r.sent_at, cell: (r) => <AbsoluteTime value={r.sent_at} /> },
    {
      key: "actions",
      header: "",
      sticky: "right",
      minWidth: 160,
      cell: (r) => (
        <RowActionGroup>
          <IconAction icon={ACTION_ICONS.view} label="Open request" to={`/admin/communication-hub/requests/${r.request_id}`} />
          {r.entity_type === "legal_case" && r.entity_id ? (
            <IconAction
              icon={ACTION_ICONS.view}
              label="Open Legal Case"
              to={`/legal/lg/cases/${r.entity_id}`}
            />
          ) : null}
          <IconAction
            icon={ACTION_ICONS.copy}
            label="Copy request no"
            onClick={() => {
              navigator.clipboard.writeText(r.request_no).then(
                () => toast.success("Request no copied"),
                () => toast.error("Copy failed"),
              );
            }}
          />
        </RowActionGroup>
      ),
    },

  ];

  return (
    <OperationsShell title="Dispatch Register" subtitle="Official register of every communication issued by the Hub">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div><Label>Module</Label><Input value={moduleCode} onChange={(e) => setModuleCode(e.target.value)} /></div>
          <div><Label>Event</Label><Input value={eventCode} onChange={(e) => setEventCode(e.target.value)} /></div>
          <div><Label>Reference no.</Label><Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="ER-…" /></div>
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
            <Button variant="outline" onClick={downloadCsv} disabled={!rows.length}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
            <div className="ml-auto text-sm text-muted-foreground self-center">{rows.length} entries</div>
          </div>
        </CardContent>
      </Card>

      <CommunicationHubDataTable
        screenKey="dispatch-register"
        columns={columns}
        rows={rows}
        loading={q.isLoading}
        error={q.error as Error | null}
        onRetry={() => q.refetch()}
        getRowKey={(r) => r.request_id}
        defaultSort={{ key: "created_at", direction: "desc" }}
        emptyMessage="No dispatch entries."
      />
    </OperationsShell>
  );
}
