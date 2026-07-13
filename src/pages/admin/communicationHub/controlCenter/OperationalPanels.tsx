/**
 * Communication Hub Control Center — Operational Panels (Phase 1C-B7-D).
 *
 * Read-only visibility only:
 *  - Effective safety state banner
 *  - Cron status
 *  - Safety counts (stale locks, accidental live sends, etc.)
 *  - Recent messages / attempts
 *  - Legacy isolation counts
 *
 * NO write actions. NO cron scheduling. NO dispatcher invocation.
 * NO enqueue. Env hard gates are not readable from the browser and are
 * shown as "unknown / verified by dispatcher".
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldAlert, ShieldCheck, RefreshCcw, Info } from "lucide-react";
import { toast } from "sonner";
import {
  fetchCronStatus, fetchSafetyCounts, fetchRecentMessages, fetchRecentAttempts,
  fetchLiveWindowStatus,
  truncPmid,
  type CronStatus, type SafetyCounts, type RecentMessageRow, type RecentAttemptRow,
  type LiveWindowStatus,
} from "./operationalService";
import type { CommHubControlSettings } from "./controlCenterService";
import { CommunicationHubDataTable, type HubTableColumn } from "../components/CommunicationHubDataTable";
import { AbsoluteTime, TruncatedId } from "../components/tableFormatters";

type OutsideWindowRow = LiveWindowStatus["outside_window_preview"][number];

const outsideWindowColumns: HubTableColumn<OutsideWindowRow>[] = [
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
    cell: (r) => <span className="font-mono text-xs">{r.request_no ?? "—"}</span>,
  },
  {
    key: "id",
    header: "Msg",
    cell: (r) => <TruncatedId value={r.id} length={8} />,
  },
  {
    key: "status",
    header: "Status",
    sortable: true,
    sortValue: (r) => r.status ?? "",
    cell: (r) => <Badge variant="secondary">{r.status}</Badge>,
  },
  {
    key: "test_mode",
    header: "Test/Live",
    cell: (r) => <span className="text-xs">{r.test_mode ? "T" : "L"}</span>,
  },
  {
    key: "recipient_masked",
    header: "Recipient",
    cell: (r) => <span className="font-mono text-xs">{r.recipient_masked ?? "—"}</span>,
  },
  {
    key: "subject",
    header: "Subject",
    cell: (r) => (
      <span className="block max-w-[30ch] truncate text-xs" title={r.subject ?? undefined}>
        {r.subject ?? "—"}
      </span>
    ),
  },
  {
    key: "reason",
    header: "Reason",
    cell: (r) => <span className="text-xs text-muted-foreground">{r.reason ?? "—"}</span>,
  },
];

const recentMessageColumns: HubTableColumn<RecentMessageRow>[] = [
  {
    key: "created_at",
    header: "Created",
    sortable: true,
    sortValue: (m) => (m.created_at ? new Date(m.created_at) : null),
    sticky: "left",
    cell: (m) => <AbsoluteTime value={m.created_at} pattern="yyyy-MM-dd HH:mm:ss" />,
  },
  {
    key: "request_no",
    header: "Request",
    sortable: true,
    sortValue: (m) => m.request_no ?? m.request_id ?? "",
    cell: (m) => (
      <span className="font-mono text-xs">{m.request_no ?? m.request_id.slice(0, 8)}</span>
    ),
  },
  {
    key: "id",
    header: "Msg",
    cell: (m) => <TruncatedId value={m.id} length={12} />,
  },
  {
    key: "channel",
    header: "Ch",
    sortable: true,
    sortValue: (m) => m.channel ?? "",
    cell: (m) => <span className="text-xs">{m.channel}</span>,
  },
  {
    key: "test_mode",
    header: "Test",
    cell: (m) => <span className="text-xs">{m.test_mode ? "T" : "L"}</span>,
  },
  {
    key: "status",
    header: "Status",
    sortable: true,
    sortValue: (m) => m.status ?? "",
    cell: (m) => (
      <Badge
        variant={
          m.status === "failed"
            ? "destructive"
            : m.status === "sent" || m.status === "delivered"
            ? "default"
            : "secondary"
        }
      >
        {m.status}
      </Badge>
    ),
  },
  {
    key: "attempt_count",
    header: "Att",
    sortable: true,
    sortValue: (m) => m.attempt_count ?? 0,
    cell: (m) => <span className="text-xs">{m.attempt_count}</span>,
  },
  {
    key: "sent_at",
    header: "Sent",
    sortable: true,
    sortValue: (m) => (m.sent_at ? new Date(m.sent_at) : null),
    cell: (m) => <AbsoluteTime value={m.sent_at} pattern="HH:mm:ss" />,
  },
  {
    key: "provider_message_id",
    header: "Provider MID",
    cell: (m) => <span className="font-mono text-xs">{truncPmid(m.provider_message_id)}</span>,
  },
  {
    key: "delivery_status",
    header: "Delivery",
    cell: (m) => {
      const dstat =
        m.delivery_status ?? (m.status === "sent" && m.test_mode === false ? "unknown" : "—");
      const dvariant =
        m.delivery_status === "delivered"
          ? "default"
          : m.delivery_status === "bounced" || m.delivery_status === "complained"
          ? "destructive"
          : m.delivery_status === "delayed"
          ? "secondary"
          : "outline";
      return <Badge variant={dvariant as any}>{dstat}</Badge>;
    },
  },
  {
    key: "delivery_last_event_at",
    header: "Last Event",
    sortable: true,
    sortValue: (m) => (m.delivery_last_event_at ? new Date(m.delivery_last_event_at) : null),
    cell: (m) => (
      <span className="whitespace-nowrap text-[11px]">
        {m.delivery_last_event_type ?? "—"}
        {m.delivery_last_event_at && (
          <span className="text-muted-foreground">
            {" · "}
            <AbsoluteTime value={m.delivery_last_event_at} pattern="HH:mm:ss" />
          </span>
        )}
      </span>
    ),
  },
  {
    key: "error_code",
    header: "Err",
    cell: (m) => (
      <span
        className="block max-w-[24ch] truncate text-xs"
        title={m.error_code ?? undefined}
      >
        {m.error_code ?? "—"}
      </span>
    ),
  },
];

const recentAttemptColumns: HubTableColumn<RecentAttemptRow>[] = [
  {
    key: "started_at",
    header: "Started",
    sortable: true,
    sortValue: (a) => a.started_at ?? "",
    cell: (a) => <AbsoluteTime value={a.started_at} pattern="yyyy-MM-dd HH:mm:ss" />,
  },
  {
    key: "message_id",
    header: "Msg",
    cell: (a) => <TruncatedId value={a.message_id} length={12} />,
  },
  {
    key: "attempt_no",
    header: "#",
    sortable: true,
    sortValue: (a) => a.attempt_no ?? 0,
    cell: (a) => <span className="text-xs">{a.attempt_no ?? "—"}</span>,
  },
  {
    key: "status",
    header: "Status",
    sortable: true,
    sortValue: (a) => a.status ?? "",
    cell: (a) => (
      <Badge
        variant={
          a.status === "success"
            ? "default"
            : a.status === "skipped"
              ? "secondary"
              : "destructive"
        }
        className="text-[10px]"
      >
        {a.status}
      </Badge>
    ),
  },
  {
    key: "provider_message_id",
    header: "Provider MID",
    cell: (a) => (
      <span className="font-mono text-xs">{truncPmid(a.provider_message_id)}</span>
    ),
  },
  {
    key: "error_code",
    header: "Err",
    cell: (a) => (
      <span
        className="block max-w-[24ch] truncate text-xs"
        title={a.error_code ?? undefined}
      >
        {a.error_code ?? "—"}
      </span>
    ),
  },
  {
    key: "provider_response",
    header: "Response",
    cell: (a) => {
      const preview = a.provider_response
        ? JSON.stringify(a.provider_response).slice(0, 120)
        : "—";
      return (
        <span
          className="block max-w-[40ch] truncate font-mono text-xs"
          title={a.provider_response ? JSON.stringify(a.provider_response) : undefined}
        >
          {preview}
        </span>
      );
    },
  },
];






interface Props {
  settings: CommHubControlSettings;
}

const STATUS_OPTIONS = ["all","queued","sending","sent","delivered","failed","bounced","cancelled","suppressed"];
const CHANNEL_OPTIONS = ["all","email","sms","push","in_app","letter","print","whatsapp"];
const WINDOW_OPTIONS: Array<{ v: number; label: string }> = [
  { v: 60, label: "Last 1h" },
  { v: 1440, label: "Last 24h" },
  { v: 10080, label: "Last 7d" },
];

export function OperationalPanels({ settings }: Props) {
  const [cron, setCron] = useState<CronStatus | null>(null);
  const [safety, setSafety] = useState<SafetyCounts | null>(null);
  const [messages, setMessages] = useState<RecentMessageRow[]>([]);
  const [attempts, setAttempts] = useState<RecentAttemptRow[]>([]);
  const [liveWindow, setLiveWindow] = useState<LiveWindowStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [windowMin, setWindowMin] = useState<number>(1440);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [testModeFilter, setTestModeFilter] = useState<"all" | "true" | "false">("all");

  async function reload() {
    setLoading(true);
    try {
      const [c, s, m, a, w] = await Promise.all([
        fetchCronStatus(),
        fetchSafetyCounts(windowMin),
        fetchRecentMessages({ status: statusFilter, channel: channelFilter, testMode: testModeFilter, windowMinutes: windowMin, limit: 20 }),
        fetchRecentAttempts(20),
        fetchLiveWindowStatus().catch(() => null),
      ]);
      setCron(c); setSafety(s); setMessages(m); setAttempts(a); setLiveWindow(w);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load operational status");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [windowMin, statusFilter, channelFilter, testModeFilter]);


  // Effective live state — env hard gates are unknown from the browser.
  const dbLiveGate = settings.dispatch_enabled && settings.email_live_enabled && !settings.dry_run_only
    && ((settings.allowed_email_addresses?.length ?? 0) > 0 || (settings.allowed_email_domains?.length ?? 0) > 0);
  const banner: "BLOCKED" | "POSSIBLE_IF_ENV" =
    dbLiveGate ? "POSSIBLE_IF_ENV" : "BLOCKED";

  return (
    <>
      {/* Effective safety banner */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {banner === "BLOCKED"
              ? <ShieldCheck className="h-4 w-4 text-primary" />
              : <ShieldAlert className="h-4 w-4 text-destructive" />}
            Effective Live State
          </CardTitle>
          <CardDescription>
            Env hard gates (<code>COMMUNICATION_HUB_DISPATCH_ENABLED</code>,{" "}
            <code>COMMUNICATION_HUB_EMAIL_LIVE</code>,{" "}
            <code>COMMUNICATION_HUB_EMAIL_LIVE_ALLOWLIST</code>) are runtime-only;
            verified by dispatcher responses / not readable in browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {banner === "BLOCKED" ? (
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle>LIVE BLOCKED</AlertTitle>
              <AlertDescription>
                At least one DB safety gate is off: dispatch_enabled={String(settings.dispatch_enabled)},
                email_live_enabled={String(settings.email_live_enabled)},
                dry_run_only={String(settings.dry_run_only)}, allowlist configured={String(dbLiveGate ? "yes" : "no")}.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>LIVE POSSIBLE (subject to env gates)</AlertTitle>
              <AlertDescription>
                All DB gates are permissive. Actual live sending still requires env
                <code className="mx-1">COMMUNICATION_HUB_EMAIL_LIVE=true</code> and env allowlist — verified only at dispatcher runtime.
              </AlertDescription>
            </Alert>
          )}
          <div className="grid gap-2 md:grid-cols-3 text-xs">
            <EnvRow label="COMMUNICATION_HUB_DISPATCH_ENABLED" />
            <EnvRow label="COMMUNICATION_HUB_EMAIL_LIVE" />
            <EnvRow label="COMMUNICATION_HUB_EMAIL_LIVE_ALLOWLIST" />
          </div>
        </CardContent>
      </Card>

      {/* Live eligibility window (Phase 1C-B8-B) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" /> Live Eligibility Window
          </CardTitle>
          <CardDescription>
            Only messages created after the window start and within the max-age window
            can be claimed for live sending. Historical queued live rows are protected.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!liveWindow ? (
            <div className="text-muted-foreground">Loading…</div>
          ) : (
            <>
              <div className="grid gap-2 md:grid-cols-4">
                <Field
                  label="live_eligible_after"
                  value={liveWindow.live_eligible_after
                    ? new Date(liveWindow.live_eligible_after).toLocaleString()
                    : "never"}
                />
                <Field
                  label="max_age_minutes"
                  value={String(liveWindow.live_eligible_max_age_minutes)}
                />
                <Field
                  label="window status (DB)"
                  value={
                    liveWindow.db_dispatch_enabled
                      && liveWindow.db_email_live_enabled
                      && !liveWindow.db_dry_run_only
                      && liveWindow.live_eligible_after
                      ? "OPEN (subject to env)"
                      : "CLOSED"
                  }
                />
                <Field
                  label="last checked"
                  value={new Date(liveWindow.generated_at).toLocaleTimeString()}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2 text-sm">
                <Stat label="Queued live inside window" value={liveWindow.queued_live_inside_window} />
                <Stat
                  label="Queued live outside window"
                  value={liveWindow.queued_live_outside_window}
                  danger={liveWindow.queued_live_outside_window > 0}
                />
              </div>
              {liveWindow.queued_live_outside_window > 0 && (
                <Alert variant="destructive">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>Historical queued live messages exist</AlertTitle>
                  <AlertDescription>
                    {liveWindow.queued_live_outside_window} queued live message(s) exist
                    outside the current live eligibility window. They will NOT be claimed
                    while the window is active. Handle them via a controlled operation.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Historical queued live messages outside window (read-only) */}
      {liveWindow && liveWindow.outside_window_preview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historical Queued Live Messages Outside Window</CardTitle>
            <CardDescription>
              Read-only preview (limit 50). No bulk actions available in this phase.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CommunicationHubDataTable
              screenKey="comm-hub.control-center.queued-live-outside-window"
              columns={outsideWindowColumns}
              rows={liveWindow.outside_window_preview}
              getRowKey={(r) => r.id}
              loading={false}
              error={null}
              defaultSort={{ key: "created_at", direction: "desc" }}
              emptyMessage="No historical queued live messages outside the window."
            />
          </CardContent>
        </Card>
      )}

      {/* Cron status */}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Cron Status</CardTitle>
            <CardDescription>comm-hub-dispatch-every-minute — read-only.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
            <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!cron ? <div className="text-muted-foreground">Loading…</div> : !cron.exists ? (
            <div className="text-muted-foreground">Cron job not scheduled.</div>
          ) : (
            <>
              <div className="grid gap-2 md:grid-cols-4">
                <Field label="jobid" value={String(cron.jobid)} />
                <Field label="schedule" value={cron.schedule ?? "—"} />
                <Field label="active" value={String(cron.active)} />
                <Field label="last run" value={cron.recent_runs?.[0]?.start_time ? new Date(cron.recent_runs[0].start_time).toLocaleString() : "—"} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-left text-muted-foreground">
                    <tr><th className="py-1 pr-3">Start</th><th className="py-1 pr-3">Status</th><th className="py-1 pr-3">Return</th></tr>
                  </thead>
                  <tbody>
                    {(cron.recent_runs ?? []).map(r => (
                      <tr key={r.runid} className="border-t">
                        <td className="py-1 pr-3 whitespace-nowrap">{new Date(r.start_time).toLocaleString()}</td>
                        <td className="py-1 pr-3"><Badge variant={r.status === "succeeded" ? "default" : "destructive"}>{r.status}</Badge></td>
                        <td className="py-1 pr-3 truncate max-w-[40ch]">{r.return_message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Safety counts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Safety Checks</CardTitle>
          <CardDescription>Live-fire indicators. Accidental live sends and stale locks must be zero.</CardDescription>
        </CardHeader>
        <CardContent>
          {!safety ? <div className="text-sm text-muted-foreground">Loading…</div> : (
            <div className="grid gap-3 md:grid-cols-4 text-sm">
              <Stat label="Queued (test)" value={safety.queued_test} />
              <Stat label="Queued (live)" value={safety.queued_live} />
              <Stat label="Sending" value={safety.sending} />
              <Stat label="Stale locks (>10m)" value={safety.stale_locks} danger={safety.stale_locks > 0} />
              <Stat label="Failed (24h)" value={safety.failed_24h} />
              <Stat label="Suppressed (24h)" value={safety.suppressed_24h} />
              <Stat label="Accidental live sends (24h)" value={safety.accidental_live_sends_24h} danger={safety.accidental_live_sends_24h > 0} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters + recent messages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Messages</CardTitle>
          <CardDescription>Last 20 Communication Hub messages in the selected window.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <CommunicationHubDataTable
            screenKey="comm-hub.control-center.recent-messages"
            columns={recentMessageColumns}
            rows={messages}
            getRowKey={(m) => m.id}
            loading={false}
            error={null}
            defaultSort={{ key: "created_at", direction: "desc" }}
            emptyMessage="No recent messages match the current filters."
            toolbar={
              <div className="flex flex-wrap gap-2 items-end">
                <FilterSelect label="Window" value={String(windowMin)} onChange={v => setWindowMin(Number(v))}
                  options={WINDOW_OPTIONS.map(o => ({ value: String(o.v), label: o.label }))} />
                <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter}
                  options={STATUS_OPTIONS.map(s => ({ value: s, label: s }))} />
                <FilterSelect label="Channel" value={channelFilter} onChange={setChannelFilter}
                  options={CHANNEL_OPTIONS.map(s => ({ value: s, label: s }))} />
                <FilterSelect label="Test mode" value={testModeFilter} onChange={v => setTestModeFilter(v as any)}
                  options={[{ value: "all", label: "all" },{ value: "true", label: "true" },{ value: "false", label: "false" }]} />
              </div>
            }
          />
        </CardContent>
      </Card>


      {/* Recent attempts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Delivery Attempts</CardTitle>
          <CardDescription>Last 20 attempts. Provider responses are sanitized before display.</CardDescription>
        </CardHeader>
        <CardContent>
          <CommunicationHubDataTable
            screenKey="comm-hub.control-center.recent-attempts"
            columns={recentAttemptColumns}
            rows={attempts}
            getRowKey={(a) => a.id}
            loading={false}
            error={null}
            defaultSort={{ key: "started_at", direction: "desc" }}
            emptyMessage="No recent delivery attempts found."
          />
        </CardContent>

      </Card>

      {/* Legacy isolation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Legacy Isolation</CardTitle>
          <CardDescription>
            Legacy notification tables are NOT used by the Communication Hub dispatcher. Counts are shown only for isolation monitoring.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!safety ? <div className="text-sm text-muted-foreground">Loading…</div> : (
            <div className="grid gap-3 md:grid-cols-2 text-sm">
              <Stat label={`notification_queue (last ${safety.window_minutes}m)`} value={safety.legacy_notification_queue_window} />
              <Stat label={`notification_logs (last ${safety.window_minutes}m)`} value={safety.legacy_notification_logs_window} />
            </div>
          )}
          <Alert className="mt-3">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Non-zero counts here do not indicate Hub activity — they may reflect legacy modules writing to their own queues.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="font-mono text-xs">{value}</div>
    </div>
  );
}

function Stat({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className={`rounded-md border p-3 ${danger ? "border-destructive bg-destructive/5" : ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold ${danger ? "text-destructive" : ""}`}>{value}</div>
    </div>
  );
}

function EnvRow({ label }: { label: string }) {
  return (
    <div className="rounded-md border p-2 flex items-center justify-between gap-2">
      <code className="text-[11px]">{label}</code>
      <Badge variant="outline" className="text-[10px]">runtime-only</Badge>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
