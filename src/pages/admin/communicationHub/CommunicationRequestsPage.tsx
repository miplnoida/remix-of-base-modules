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
import { format } from "date-fns";
import { Activity, ArrowLeft, ArrowRight, Info, Search } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  communicationHubHistoryService,
  type CommunicationRequestHistoryRow,
  type ListRequestsOptions,
} from "@/platform/communication-hub/historyService";

const STATUSES = ["pending", "processing", "completed", "failed", "partially_failed", "cancelled"] as const;
const CHANNELS = ["email", "sms", "push", "in_app", "letter", "print", "whatsapp"] as const;

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "completed") return "default";
  if (status === "failed" || status === "partially_failed") return "destructive";
  if (status === "cancelled") return "outline";
  return "secondary";
}

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
            {requestsQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : requestsQuery.error ? (
              <Alert variant="destructive">
                <AlertTitle>Failed to load requests</AlertTitle>
                <AlertDescription>
                  {(requestsQuery.error as Error).message}
                </AlertDescription>
              </Alert>
            ) : (requestsQuery.data ?? []).length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                No communication requests match the current filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request no.</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Channels</TableHead>
                      <TableHead className="text-right">Msgs</TableHead>
                      <TableHead className="text-right">Sent</TableHead>
                      <TableHead className="text-right">Failed</TableHead>
                      <TableHead className="text-right">Queued</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(requestsQuery.data ?? []).map((r: CommunicationRequestHistoryRow) => {
                      const c = countsQuery.data?.[r.id];
                      const isLive = c && c.total > 0 && c.live === c.total;
                      const isTest = c && c.total > 0 && c.live === 0;
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-xs">{r.request_no}</TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {r.module_code}
                            {r.department_code ? <span className="text-muted-foreground"> / {r.department_code}</span> : null}
                          </TableCell>
                          <TableCell className="text-xs">{r.event_code}</TableCell>
                          <TableCell className="text-xs">{(r.channels ?? []).join(", ")}</TableCell>
                          <TableCell className="text-right text-xs">{c?.total ?? "—"}</TableCell>
                          <TableCell className="text-right text-xs">{c?.sent ?? "—"}</TableCell>
                          <TableCell className="text-right text-xs">{c?.failed ?? "—"}</TableCell>
                          <TableCell className="text-right text-xs">{c?.queued ?? "—"}</TableCell>
                          <TableCell className="text-xs">
                            {isLive ? <Badge variant="default">live</Badge>
                              : isTest ? <Badge variant="outline">test</Badge>
                              : c && c.total > 0 ? <Badge variant="secondary">mixed</Badge>
                              : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {format(new Date(r.created_at), "yyyy-MM-dd HH:mm")}
                          </TableCell>
                          <TableCell>
                            <Button asChild variant="ghost" size="sm">
                              <Link to={`/admin/communication-hub/requests/${r.id}`}>
                                Open <ArrowRight className="h-3 w-3 ml-1" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PermissionWrapper>
  );
}
