/**
 * Communication Hub — read-only requests console (Phase 1C-B5).
 *
 * Lists communication_request rows produced by the sendCommunication façade
 * with aggregated message counts and safe filters. No send / resend / cancel
 * actions are exposed here — this screen is deliberately read-only until the
 * live dispatcher, cron and permission model are hardened further.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowLeft, ArrowRight, Info, Search } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/common/PageHeader";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CommunicationHubDataTable, {
  type HubTableColumn,
} from "./components/CommunicationHubDataTable";
import {
  AbsoluteTime,
  ModuleEventPair,
  StatusBadge,
  TestLiveBadge,
} from "./components/tableFormatters";
import {
  communicationHubHistoryService,
  type CommunicationRequestHistoryRow,
  type ListRequestsOptions,
} from "@/platform/communication-hub/historyService";

const STATUSES = ["pending", "processing", "completed", "failed", "partially_failed", "cancelled"] as const;
const CHANNELS = ["email", "sms", "push", "in_app", "letter", "print", "whatsapp"] as const;

type RequestTableRow = CommunicationRequestHistoryRow & {
  _countTotal: number;
  _countSent: number;
  _countFailed: number;
  _countQueued: number;
  _isLive: boolean | null; // true=live, false=test, null=unknown/mixed
};


export default function CommunicationRequestsPage() {
  const [status, setStatus] = useState<string>("all");
  const [moduleCode, setModuleCode] = useState<string>("");
  const [eventCode, setEventCode] = useState<string>("");
  const [channel, setChannel] = useState<string>("all");
  const [requestNo, setRequestNo] = useState<string>("");
  const [createdFrom, setCreatedFrom] = useState<string>("");
  const [createdTo, setCreatedTo] = useState<string>("");
  const [appliedFilters, setAppliedFilters] = useState<ListRequestsOptions>({ limit: 100 });

  useEffect(() => {
    // First load
    setAppliedFilters({ limit: 100 });
  }, []);

  const requestsQuery = useQuery({
    queryKey: ["comm-hub", "requests", appliedFilters],
    queryFn: () => communicationHubHistoryService.listRecentRequests(appliedFilters),
  });

  const requestIds = useMemo(
    () => (requestsQuery.data ?? []).map((r) => r.id),
    [requestsQuery.data],
  );

  const countsQuery = useQuery({
    queryKey: ["comm-hub", "message-counts", requestIds],
    queryFn: () => communicationHubHistoryService.getMessageCountsForRequests(requestIds),
    enabled: requestIds.length > 0,
  });

  const apply = () => {
    setAppliedFilters({
      limit: 100,
      status: status !== "all" ? status : undefined,
      moduleCode: moduleCode.trim() || undefined,
      eventCode: eventCode.trim() || undefined,
      channel: channel !== "all" ? channel : undefined,
      requestNo: requestNo.trim() || undefined,
      createdFrom: createdFrom ? new Date(createdFrom).toISOString() : undefined,
      createdTo: createdTo ? new Date(createdTo).toISOString() : undefined,
    });
  };

  const reset = () => {
    setStatus("all");
    setModuleCode("");
    setEventCode("");
    setChannel("all");
    setRequestNo("");
    setCreatedFrom("");
    setCreatedTo("");
    setAppliedFilters({ limit: 100 });
  };

  const tableRows = useMemo<RequestTableRow[]>(() => {
    const rows = requestsQuery.data ?? [];
    const counts = countsQuery.data ?? {};
    return rows.map((r) => {
      const c = counts[r.id];
      const total = c?.total ?? 0;
      const live = c?.live ?? 0;
      let isLive: boolean | null = null;
      if (c && total > 0) {
        if (live === total) isLive = true;
        else if (live === 0) isLive = false;
        else isLive = null;
      }
      return {
        ...r,
        _countTotal: total,
        _countSent: c?.sent ?? 0,
        _countFailed: c?.failed ?? 0,
        _countQueued: c?.queued ?? 0,
        _isLive: isLive,
      };
    });
  }, [requestsQuery.data, countsQuery.data]);

  const columns = useMemo<HubTableColumn<RequestTableRow>[]>(() => [
    {
      key: "request_no",
      header: "Request no.",
      sticky: "left",
      sortable: true,
      sortValue: (r) => r.request_no,
      cell: (r) => (
        <Link
          to={`/admin/communication-hub/requests/${r.id}`}
          className="font-mono text-xs text-primary hover:underline inline-flex items-center gap-1"
        >
          {r.request_no}
          <ArrowRight className="h-3 w-3" />
        </Link>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (r) => r.status,
      cell: (r) => <StatusBadge value={r.status} />,
    },
    {
      key: "module_event",
      header: "Module / Event",
      sortable: true,
      sortValue: (r) => `${r.module_code}/${r.event_code}`,
      cell: (r) => <ModuleEventPair moduleCode={r.module_code} eventCode={r.event_code} />,
    },
    {
      key: "channels",
      header: "Channels",
      cell: (r) => (
        <span className="text-xs">{(r.channels ?? []).join(", ") || "—"}</span>
      ),
    },
    {
      key: "mode",
      header: "Mode",
      cell: (r) => <TestLiveBadge testMode={r._isLive == null ? null : !r._isLive} />,
    },
    {
      key: "messages",
      header: "Messages",
      cell: (r) => <span className="text-xs">{r._countTotal}</span>,
    },
    {
      key: "sent",
      header: "Sent",
      cell: (r) => <span className="text-xs">{r._countSent}</span>,
    },
    {
      key: "failed",
      header: "Failed",
      cell: (r) => <span className="text-xs">{r._countFailed}</span>,
    },
    {
      key: "queued",
      header: "Queued",
      cell: (r) => <span className="text-xs">{r._countQueued}</span>,
    },
    {
      key: "created_at",
      header: "Created",
      sortable: true,
      sortValue: (r) => new Date(r.created_at),
      cell: (r) => <AbsoluteTime value={r.created_at} />,
    },
  ], []);


  return (
    <PermissionWrapper moduleName="system_administration">
      <div className="container mx-auto p-6 space-y-6">
        <PageHeader
          title="Communication Requests"
          subtitle="Enterprise Communication Hub — read-only console"
          breadcrumbs={[
            { label: "Admin", href: "/admin" },
            { label: "Communication Hub", href: "/admin/communication-hub" },
            { label: "Requests" },
          ]}
          actions={
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/communication-hub">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to Hub
              </Link>
            </Button>
          }
        />

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Read-only console</AlertTitle>
          <AlertDescription>
            Communication Hub Console is read-only. Sending, resending, cancellation and cron
            scheduling are not enabled from this screen. Recipient contact details are masked in
            the list view.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Channel</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {CHANNELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Module code</Label>
              <Input value={moduleCode} onChange={(e) => setModuleCode(e.target.value)} placeholder="e.g. platform_test" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Event code</Label>
              <Input value={eventCode} onChange={(e) => setEventCode(e.target.value)} placeholder="e.g. comm_hub.live_test_001" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">Request no.</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" value={requestNo} onChange={(e) => setRequestNo(e.target.value)} placeholder="Search request number" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Created from</Label>
              <Input type="date" value={createdFrom} onChange={(e) => setCreatedFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Created to</Label>
              <Input type="date" value={createdTo} onChange={(e) => setCreatedTo(e.target.value)} />
            </div>
            <div className="md:col-span-4 flex gap-2">
              <Button onClick={apply} size="sm"><Activity className="h-4 w-4 mr-1" /> Apply filters</Button>
              <Button variant="outline" onClick={reset} size="sm">Reset</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Requests {requestsQuery.data ? `(${requestsQuery.data.length})` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CommunicationHubDataTable
              screenKey="communication-requests"
              columns={columns}
              rows={tableRows}
              getRowKey={(r) => r.id}
              loading={requestsQuery.isLoading}
              error={requestsQuery.error as Error | null}
              onRetry={() => requestsQuery.refetch()}
              defaultSort={{ key: "created_at", direction: "desc" }}
              emptyMessage="No communication requests match the current filters."
            />
          </CardContent>

        </Card>
      </div>
    </PermissionWrapper>
  );
}
