/**
 * Communication Hub — read-only request detail (Phase 1C-B5).
 *
 * Shows the request summary, recipients (masked), messages, delivery
 * attempts (provider response sanitised), and the lifecycle event log for
 * one communication_request row. Read-only — no send/resend/cancel/retry
 * actions are exposed.
 */
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Info } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { communicationHubHistoryService } from "@/platform/communication-hub/historyService";
import { sanitizeProviderResponse } from "./utils/mask";
import { EventGateSummary } from "./safety/EventGateSummary";
import { BlockersList } from "./safety/BlockersList";
import { normalizeBlockerResult } from "./safety/blockerResult";
import CommunicationHubDataTable, { type HubTableColumn } from "./components/CommunicationHubDataTable";
import {
  AbsoluteTime,
  MaskedEmail,
  MaskedPhone,
  StatusBadge,
  TestLiveBadge,
  TruncatedId,
} from "./components/tableFormatters";

const recipientColumns: HubTableColumn<any>[] = [
  { key: "role", header: "Role", sortable: true, sortValue: (r) => r.role, cell: (r) => <span className="text-xs">{r.role ?? "—"}</span> },
  { key: "recipient_type", header: "Type", sortable: true, sortValue: (r) => r.recipient_type, cell: (r) => <span className="text-xs">{r.recipient_type ?? "—"}</span> },
  { key: "name", header: "Name", sortable: true, sortValue: (r) => r.name, cell: (r) => <span className="text-xs">{r.name ?? "—"}</span> },
  { key: "email", header: "Email", cell: (r) => <MaskedEmail value={r.email} /> },
  { key: "phone", header: "Phone", cell: (r) => <MaskedPhone value={r.phone} /> },
  { key: "channel_hint", header: "Channel hint", cell: (r) => <span className="text-xs">{r.channel_hint ?? "—"}</span> },
  { key: "id", header: "ID", cell: (r) => <TruncatedId value={r.id} length={8} label="recipient id" /> },
];

const messageColumns: HubTableColumn<any>[] = [
  { key: "id", header: "Message ID", minWidth: 120, cell: (m) => <TruncatedId value={m.id} length={8} label="message id" /> },
  { key: "channel", header: "Channel", sortable: true, sortValue: (m) => m.channel, cell: (m) => <span className="text-xs">{m.channel ?? "—"}</span> },
  { key: "status", header: "Status", sortable: true, sortValue: (m) => m.status, cell: (m) => <StatusBadge value={m.status} /> },
  {
    key: "subject",
    header: "Subject",
    minWidth: 220,
    cell: (m) => (
      <span className="text-xs max-w-[260px] truncate block" title={m.subject ?? ""}>
        {m.subject ?? "—"}
      </span>
    ),
  },
  { key: "test_mode", header: "Mode", sortable: true, sortValue: (m) => (m.test_mode ? 1 : 0), cell: (m) => <TestLiveBadge testMode={m.test_mode} /> },
  { key: "attempt_count", header: "Attempts", sortable: true, sortValue: (m) => m.attempt_count ?? 0, cell: (m) => <span className="text-xs tabular-nums">{m.attempt_count ?? 0}</span> },
  { key: "provider_message_id", header: "Provider ID", minWidth: 120, cell: (m) => <TruncatedId value={m.provider_message_id} length={12} label="provider message id" /> },
  { key: "sent_at", header: "Sent", sortable: true, sortValue: (m) => m.sent_at, cell: (m) => <AbsoluteTime value={m.sent_at} /> },
  { key: "delivered_at", header: "Delivered", sortable: true, sortValue: (m) => m.delivered_at, cell: (m) => <AbsoluteTime value={m.delivered_at} /> },
  {
    key: "error_code",
    header: "Error",
    cell: (m) =>
      m.error_code ? (
        <span className="text-xs text-destructive font-mono">{m.error_code}</span>
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
      ),
  },
];

function fmt(ts: string | null | undefined) {
  if (!ts) return "—";
  try { return format(new Date(ts), "yyyy-MM-dd HH:mm:ss"); } catch { return ts; }
}

function KeyValue({ items }: { items: Array<[string, React.ReactNode]> }) {
  return (
    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
      {items.map(([k, v]) => (
        <div key={k} className="flex flex-col">
          <dt className="text-xs uppercase text-muted-foreground">{k}</dt>
          <dd className="font-mono text-xs break-all">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function CommunicationRequestDetailPage() {
  const { requestId } = useParams<{ requestId: string }>();

  const requestQ = useQuery({
    queryKey: ["comm-hub", "request", requestId],
    queryFn: () => communicationHubHistoryService.getRequest(requestId!),
    enabled: !!requestId,
  });
  const recipientsQ = useQuery({
    queryKey: ["comm-hub", "recipients", requestId],
    queryFn: () => communicationHubHistoryService.listRecipientsForRequest(requestId!),
    enabled: !!requestId,
  });
  const messagesQ = useQuery({
    queryKey: ["comm-hub", "messages", requestId],
    queryFn: () => communicationHubHistoryService.listMessagesForRequest(requestId!),
    enabled: !!requestId,
  });
  const attemptsQ = useQuery({
    queryKey: ["comm-hub", "attempts", requestId],
    queryFn: () => communicationHubHistoryService.listAttemptsForRequest(requestId!),
    enabled: !!requestId,
  });
  const eventsQ = useQuery({
    queryKey: ["comm-hub", "events", requestId],
    queryFn: () => communicationHubHistoryService.listEventsForRequest(requestId!),
    enabled: !!requestId,
  });

  const request: any = requestQ.data;

  return (
    <PermissionWrapper moduleName="system_administration">
      <div className="container mx-auto p-6 space-y-6">
        <PageHeader
          title={request?.request_no ?? "Communication Request"}
          subtitle="Enterprise Communication Hub — read-only detail"
          breadcrumbs={[
            { label: "Admin", href: "/admin" },
            { label: "Communication Hub", href: "/admin/communication-hub" },
            { label: "Requests", href: "/admin/communication-hub/requests" },
            { label: request?.request_no ?? "Detail" },
          ]}
          actions={
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/communication-hub/requests">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to list
              </Link>
            </Button>
          }
        />

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Read-only</AlertTitle>
          <AlertDescription>
            No send, resend, retry or cancel from this screen. Provider secrets are never shown.
          </AlertDescription>
        </Alert>

        {requestQ.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : !request ? (
          <Alert variant="destructive">
            <AlertTitle>Request not found</AlertTitle>
            <AlertDescription>
              This request may have been removed, or your account does not have access.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Card>
              <CardHeader><CardTitle className="text-base">Request summary</CardTitle></CardHeader>
              <CardContent>
                <KeyValue
                  items={[
                    ["Request no.", request.request_no],
                    ["Status", <Badge key="s">{request.status}</Badge>],
                    ["Module", request.module_code],
                    ["Department", request.department_code ?? "—"],
                    ["Event", request.event_code],
                    ["Priority", request.priority ?? "—"],
                    ["Channels", (request.channels ?? []).join(", ")],
                    ["Idempotency key", request.idempotency_key ?? "—"],
                    ["Correlation id", (request.context as any)?.correlation_id ?? "—"],
                    ["Origin", (request.context as any)?.origin ?? "—"],
                    ["Created", fmt(request.created_at)],
                    ["Updated", fmt(request.updated_at)],
                    ["Requested by", request.requested_by ?? "—"],
                    ["Entity", request.entity_type ? `${request.entity_type} / ${request.entity_id ?? ""}` : "—"],
                  ]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Why was this request allowed / prepared / blocked?</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <EventGateSummary
                  moduleCode={request.module_code}
                  eventCode={request.event_code}
                  channel={(request.channels ?? ["email"])[0] ?? "email"}
                  showHeader={false}
                />
                {(() => {
                  const ctx = (request.context as any) ?? {};
                  const guard = ctx.policy_guard ?? ctx.send_policy_guard ?? null;
                  const review = ctx.review_policy_result ?? null;
                  const norm = normalizeBlockerResult({
                    policy_guard: guard,
                    review_policy_result: review,
                  });
                  const dedupe = (request as any)?.dedupe_key ?? ctx.dedupe_key ?? null;
                  const businessEventId = (request as any)?.business_event_id ?? ctx.business_event_id ?? null;
                  const structuredPresent = !!(guard || review);
                  return (
                    <>
                      {(dedupe || businessEventId) && (
                        <div className="text-xs text-muted-foreground space-y-1">
                          {dedupe && <div>Dedupe key: <code>{dedupe}</code></div>}
                          {businessEventId && <div>Business event id: <code>{businessEventId}</code></div>}
                        </div>
                      )}
                      {structuredPresent ? (
                        <>
                          {guard && (
                            <div className="text-xs">
                              <span className="text-muted-foreground">Send policy:</span>{" "}
                              <Badge variant={guard.authorized ? "default" : "destructive"}>
                                {guard.authorized ? "authorised" : "denied"}
                              </Badge>
                              {guard.mode && <span className="ml-2 font-mono">mode={guard.mode}</span>}
                            </div>
                          )}
                          {review && (
                            <div className="text-xs">
                              <span className="text-muted-foreground">Review policy:</span>{" "}
                              <Badge variant={review.allowed ? "default" : "destructive"}>
                                {review.allowed ? "allowed" : "held"}
                              </Badge>
                              {review.send_mode && <span className="ml-2 font-mono">send_mode={review.send_mode}</span>}
                            </div>
                          )}
                          <BlockersList codes={norm.blockers} emptyMessage="No blockers were recorded on this request." />
                        </>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          No structured policy guard was stored for this older request.
                        </div>
                      )}
                    </>
                  );
                })()}
              </CardContent>
            </Card>

            {request.module_code === "LEGAL" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Legal Case Context</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <KeyValue
                    items={[
                      ["Case reference", (request.payload as any)?.case_reference ?? request.reference_no ?? "—"],
                      ["Assigned to", (request.payload as any)?.assigned_to ?? "—"],
                      ["Priority", (request.payload as any)?.priority ?? "—"],
                      ["Source", (request.context as any)?.source ?? (request.context as any)?.adapterSource ?? "—"],
                      ["Initiated from", (request.context as any)?.initiated_from ?? "—"],
                      ["Entity", request.entity_type ? `${request.entity_type} / ${request.entity_id ?? "—"}` : "—"],
                    ]}
                  />
                  {(request.entity_type === "legal_case" && request.entity_id) ? (
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/legal/lg/cases/${request.entity_id}`}>
                        Open Legal Case
                      </Link>
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No case_id captured on this request; open the Legal case list to search by reference.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}


            <Card>
              <CardHeader><CardTitle className="text-base">Recipients</CardTitle></CardHeader>
              <CardContent>
                {(recipientsQ.data ?? []).length === 0 ? (
                  <div className="text-sm text-muted-foreground">No recipients recorded.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Role</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email (masked)</TableHead>
                        <TableHead>Phone (masked)</TableHead>
                        <TableHead>Channel hint</TableHead>
                        <TableHead>Recipient id</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(recipientsQ.data ?? []).map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs">{r.role ?? "—"}</TableCell>
                          <TableCell className="text-xs">{r.recipient_type ?? "—"}</TableCell>
                          <TableCell className="text-xs">{r.name ?? "—"}</TableCell>
                          <TableCell className="text-xs">{maskEmail(r.email)}</TableCell>
                          <TableCell className="text-xs">{maskPhone(r.phone)}</TableCell>
                          <TableCell className="text-xs">{r.channel_hint ?? "—"}</TableCell>
                          <TableCell className="font-mono text-[10px]">{r.id}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Messages</CardTitle></CardHeader>
              <CardContent>
                {(messagesQ.data ?? []).length === 0 ? (
                  <div className="text-sm text-muted-foreground">No messages yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Message id</TableHead>
                          <TableHead>Channel</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>From</TableHead>
                          <TableHead>Mode</TableHead>
                          <TableHead>Origin</TableHead>
                          <TableHead className="text-right">Attempts</TableHead>
                          <TableHead>Next attempt</TableHead>
                          <TableHead>Sent</TableHead>
                          <TableHead>Provider msg id</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(messagesQ.data ?? []).map((m: any) => (
                          <TableRow key={m.id}>
                            <TableCell className="font-mono text-[10px]">{m.id}</TableCell>
                            <TableCell className="text-xs">{m.channel}</TableCell>
                            <TableCell><Badge variant={m.status === "sent" || m.status === "delivered" ? "default" : m.status === "failed" ? "destructive" : "secondary"}>{m.status}</Badge></TableCell>
                            <TableCell className="text-xs max-w-[240px] truncate" title={m.subject ?? ""}>{m.subject ?? "—"}</TableCell>
                            <TableCell className="text-[10px]">
                              {m.from_email ? (
                                <div>
                                  <div className="font-mono">{m.from_email}</div>
                                  {m.from_display_name && <div className="text-muted-foreground">{m.from_display_name}</div>}
                                </div>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-xs">{m.test_mode ? "test" : "live"}</TableCell>
                            <TableCell className="text-xs">{m.origin ?? "—"}</TableCell>
                            <TableCell className="text-right text-xs">{m.attempt_count ?? 0}</TableCell>
                            <TableCell className="text-xs">{fmt(m.next_attempt_at)}</TableCell>
                            <TableCell className="text-xs">{fmt(m.sent_at)}</TableCell>
                            <TableCell className="font-mono text-[10px]">{m.provider_message_id ?? "—"}</TableCell>
                            <TableCell className="text-xs text-destructive">
                              {m.error_code ? <div>{m.error_code}</div> : null}
                              {m.error_message ? <div className="text-muted-foreground">{m.error_message}</div> : null}
                              {!m.error_code && !m.error_message ? "—" : null}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="text-[11px] text-muted-foreground pt-2">
                      Sender shown is the immutable snapshot used at send time.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Delivery attempts</CardTitle></CardHeader>
              <CardContent>
                {(attemptsQ.data ?? []).length === 0 ? (
                  <div className="text-sm text-muted-foreground">No delivery attempts yet.</div>
                ) : (
                  <div className="space-y-4">
                    {(attemptsQ.data ?? []).map((a: any) => (
                      <div key={a.id} className="rounded-md border p-3 text-xs space-y-2">
                        <div className="flex flex-wrap gap-2 items-center">
                          <Badge variant={a.status === "success" ? "default" : a.status === "failed" ? "destructive" : "secondary"}>
                            #{a.attempt_no} · {a.status}
                          </Badge>
                          <span className="font-mono text-[10px]">msg {a.message_id}</span>
                          <span className="text-muted-foreground">provider {a.provider_id ?? "—"}</span>
                          {a.provider_message_id && (
                            <span className="font-mono text-[10px]">pmid {a.provider_message_id}</span>
                          )}
                        </div>
                        <div className="grid gap-1 md:grid-cols-3 text-muted-foreground">
                          <div>Started: {fmt(a.started_at)}</div>
                          <div>Finished: {fmt(a.finished_at)}</div>
                          <div>Retry reason: {a.retry_reason ?? "—"}</div>
                        </div>
                        {(a.error_code || a.error_message) && (
                          <div className="text-destructive">
                            {a.error_code}{a.error_message ? ` — ${a.error_message}` : ""}
                          </div>
                        )}
                        <Separator />
                        <details>
                          <summary className="cursor-pointer text-xs text-muted-foreground">
                            Provider response (sanitised)
                          </summary>
                          <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted p-2 text-[10px]">
                            {JSON.stringify(sanitizeProviderResponse(a.provider_response), null, 2)}
                          </pre>
                        </details>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Event log</CardTitle></CardHeader>
              <CardContent>
                {(eventsQ.data ?? []).length === 0 ? (
                  <div className="text-sm text-muted-foreground">No lifecycle events yet.</div>
                ) : (
                  <ol className="space-y-2">
                    {(eventsQ.data ?? []).map((ev: any) => {
                      const stage = (ev.payload as any)?.stage;
                      return (
                        <li key={ev.id} className="rounded-md border p-2 text-xs">
                          <div className="flex flex-wrap gap-2 items-center">
                            <span className="font-mono text-[10px]">{fmt(ev.occurred_at)}</span>
                            <Badge variant="outline">{ev.event_type}</Badge>
                            {stage && <Badge variant="secondary">{stage}</Badge>}
                            {ev.source && <span className="text-muted-foreground">src: {ev.source}</span>}
                            {ev.message_id && <span className="font-mono text-[10px]">msg {ev.message_id}</span>}
                          </div>
                          {ev.payload && (
                            <details className="mt-1">
                              <summary className="cursor-pointer text-muted-foreground">Payload (sanitised)</summary>
                              <pre className="mt-1 max-h-48 overflow-auto rounded bg-muted p-2 text-[10px]">
                                {JSON.stringify(sanitizeProviderResponse(ev.payload), null, 2)}
                              </pre>
                            </details>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PermissionWrapper>
  );
}
