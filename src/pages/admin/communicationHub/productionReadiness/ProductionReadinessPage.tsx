/**
 * EPIC PROD-1 — Production Readiness Command Center.
 * Route: /admin/communication-hub/production-readiness
 *
 * Read-only. Aggregates existing Control Center, All Events Live Readiness,
 * Recipient Control, Sender, Send Policy, Cron, Safety and Delivery data
 * into a single "is Communication Hub ready for production?" surface.
 *
 * SAFETY:
 *  - Never sends email.
 *  - Never enables dispatch or live gates.
 *  - Never schedules cron.
 *  - Never mutates recipient release mode.
 *  - Never verifies senders or approves policies.
 *  - Only surfaces links to existing fix screens.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  CheckCircle2, AlertTriangle, XCircle, HelpCircle, RefreshCcw, ClipboardCopy, Download, ExternalLink,
} from "lucide-react";
import CommunicationHubWorkspaceShell, {
  CommunicationHubSectionCard,
} from "../components/CommunicationHubWorkspaceShell";
import CommunicationHubDataTable, { type HubTableColumn } from "../components/CommunicationHubDataTable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  loadReadinessSnapshot,
  buildReadinessMarkdown,
  type ReadinessSnapshot,
  type Blocker,
  type CategoryStatus,
} from "./productionReadinessService";
import type { ReadinessRow } from "../liveReadiness/allEventsLiveReadinessService";

const OVERALL_LABELS: Record<ReadinessSnapshot["overall"], { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className?: string }> = {
  not_ready:                 { label: "Not ready",                        variant: "destructive" },
  ready_dry_run:             { label: "Ready for dry-run",                variant: "secondary" },
  ready_internal_live_test:  { label: "Ready for controlled live test",   variant: "default", className: "bg-emerald-600 hover:bg-emerald-600" },
  ready_wider_rollout:       { label: "Ready for wider rollout",          variant: "default", className: "bg-green-600 hover:bg-green-600" },
};

function StatusBadge({ status }: { status: CategoryStatus }) {
  if (status === "pass") return <Badge className="bg-emerald-600 hover:bg-emerald-600"><CheckCircle2 className="h-3 w-3 mr-1" />Pass</Badge>;
  if (status === "warning") return <Badge className="bg-amber-500 hover:bg-amber-500"><AlertTriangle className="h-3 w-3 mr-1" />Warning</Badge>;
  if (status === "blocked") return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Blocked</Badge>;
  return <Badge variant="outline"><HelpCircle className="h-3 w-3 mr-1" />Unknown</Badge>;
}

function SeverityBadge({ severity }: { severity: Blocker["severity"] }) {
  if (severity === "critical") return <Badge variant="destructive">critical</Badge>;
  if (severity === "high") return <Badge className="bg-amber-600 hover:bg-amber-600">high</Badge>;
  if (severity === "medium") return <Badge className="bg-amber-500 hover:bg-amber-500">medium</Badge>;
  return <Badge variant="outline">low</Badge>;
}

interface CategoryCardConfig {
  key: keyof ReadinessSnapshot["categories"];
  title: string;
  fixHref?: string;
  fixLabel?: string;
}

const CATEGORY_CARDS: CategoryCardConfig[] = [
  { key: "db_gates",   title: "DB Control Gates",     fixHref: "/admin/communication-hub/control-center",         fixLabel: "Open Control Center" },
  { key: "runtime",    title: "Runtime Environment",  fixHref: "/admin/communication-hub/test-diagnostics",       fixLabel: "Verify via Test & Diagnostics" },
  { key: "senders",    title: "Senders",              fixHref: "/admin/communication-hub/design/sender-verification", fixLabel: "Open Sender Verification" },
  { key: "templates",  title: "Templates",            fixHref: "/admin/communication-hub/design",                 fixLabel: "Open Event → Template mapping" },
  { key: "policies",   title: "Policies",             fixHref: "/admin/communication-hub/governance/send-policies", fixLabel: "Open Send Policies" },
  { key: "recipients", title: "Recipients",           fixHref: "/admin/communication-hub/recipient-control",      fixLabel: "Open Recipient Control" },
  { key: "events",     title: "Event Live Control",   fixHref: "/admin/communication-hub/live-readiness/all-events", fixLabel: "Open All Events Live Readiness" },
  { key: "dispatcher", title: "Dispatcher / Cron",    fixHref: "/admin/communication-hub/control-center",         fixLabel: "Open Control Center" },
  { key: "delivery",   title: "Delivery / Webhook",   fixHref: "/admin/communication-hub/delivery-monitor",       fixLabel: "Open Delivery Monitor" },
];

const QUICK_LINKS = [
  { label: "All Events Live Readiness", href: "/admin/communication-hub/live-readiness/all-events" },
  { label: "Control Center", href: "/admin/communication-hub/control-center" },
  { label: "Test & Diagnostics", href: "/admin/communication-hub/test-diagnostics" },
  { label: "Trace Center", href: "/admin/communication-hub/traces" },
  { label: "Delivery Monitor", href: "/admin/communication-hub/delivery-monitor" },
  { label: "Sender Verification", href: "/admin/communication-hub/design/sender-verification" },
  { label: "Send Policies", href: "/admin/communication-hub/governance/send-policies" },
  { label: "Automation Settings", href: "/admin/communication-hub/governance/automation-settings" },
  { label: "Recipient Control", href: "/admin/communication-hub/recipient-control" },
];

export default function ProductionReadinessPage() {
  const [snapshot, setSnapshot] = useState<ReadinessSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const s = await loadReadinessSnapshot();
      setSnapshot(s);
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(e?.message ?? "Failed to load readiness");
      setError(err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void reload(); }, []);

  const blockerColumns = useMemo<HubTableColumn<Blocker>[]>(() => [
    { key: "category", header: "Category", sortable: true, sortValue: (r) => r.category, cell: (r) => <span className="text-xs font-medium">{r.category}</span> },
    { key: "severity", header: "Severity", sortable: true, sortValue: (r) => ({ critical: 0, high: 1, medium: 2, low: 3 }[r.severity]), cell: (r) => <SeverityBadge severity={r.severity} /> },
    { key: "code", header: "Code", sortable: true, sortValue: (r) => r.code, cell: (r) => <code className="text-[11px]">{r.code}</code> },
    { key: "message", header: "Issue", cell: (r) => <span className="text-xs">{r.message}</span> },
    {
      key: "fix", header: "Fix", sticky: "right",
      cell: (r) => r.fix_href ? (
        <Button asChild variant="outline" size="sm">
          <Link to={r.fix_href}>{r.fix_label ?? "Open"}<ExternalLink className="h-3 w-3 ml-1" /></Link>
        </Button>
      ) : <span className="text-xs text-muted-foreground">—</span>,
    },
  ], []);

  const eventColumns = useMemo<HubTableColumn<ReadinessRow>[]>(() => [
    {
      key: "module_event", header: "Module / Event", sortable: true,
      sortValue: (r) => `${r.module_code}:${r.event_code}`,
      cell: (r) => (
        <div className="font-mono text-[11px]">
          <div>{r.module_code} / {r.event_code}</div>
          <div className="text-muted-foreground">{r.event_name}</div>
        </div>
      ),
    },
    { key: "channel", header: "Channel", sortable: true, sortValue: (r) => r.channel, cell: (r) => <span className="text-xs">{r.channel}</span> },
    {
      key: "live_status", header: "Live status", sortable: true,
      sortValue: (r) => r.live_control_status ?? "",
      cell: (r) => r.live_control_status === "live_manual_only"
        ? <Badge className="bg-green-600 hover:bg-green-600">live_manual_only</Badge>
        : <span className="text-xs text-muted-foreground">{r.live_control_status ?? "—"}</span>,
    },
    {
      key: "eligibility", header: "Eligibility", sortable: true,
      sortValue: (r) => (r.eligible ? 1 : 0),
      cell: (r) => r.eligible
        ? <Badge className="bg-emerald-600 hover:bg-emerald-600"><CheckCircle2 className="h-3 w-3 mr-1" />Eligible</Badge>
        : <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Blocked</Badge>,
    },
    { key: "blockers", header: "Blockers", sortable: true, sortValue: (r) => r.blockers.length, cell: (r) => <span className="text-xs">{r.blockers.length}</span> },
    { key: "warnings", header: "High risk", sortable: true, sortValue: (r) => (r.is_high_risk ? 1 : 0), cell: (r) => r.is_high_risk ? <Badge variant="outline">high risk</Badge> : <span className="text-xs text-muted-foreground">—</span> },
    { key: "action", header: "Recommended action", cell: (r) => <span className="text-xs">{r.recommended_action}</span> },
    {
      key: "open", header: "Open", sticky: "right",
      cell: () => (
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/communication-hub/live-readiness/all-events">Open<ExternalLink className="h-3 w-3 ml-1" /></Link>
        </Button>
      ),
    },
  ], []);

  async function onCopy() {
    if (!snapshot) return;
    const md = buildReadinessMarkdown(snapshot);
    try {
      await navigator.clipboard.writeText(md);
      toast.success("Readiness summary copied");
    } catch {
      toast.error("Clipboard unavailable");
    }
  }

  function onDownload() {
    if (!snapshot) return;
    const md = buildReadinessMarkdown(snapshot);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comm-hub-readiness-${new Date().toISOString().replace(/[:.]/g, "-")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <CommunicationHubWorkspaceShell
      title="Production Readiness"
      purpose="Single read-only view of every gate, blocker and next step required before running Communication Hub in production."
      risk="read-only"
      section="Production Readiness"
      currentBreadcrumbLabel="Production Readiness"
      quickLinks={QUICK_LINKS}
    >
      <Alert>
        <AlertTitle>Read-only command center</AlertTitle>
        <AlertDescription className="text-xs">
          This page never sends email, never enables live sending, never schedules cron, and never mutates senders,
          policies or recipient release mode. All fix actions link to their existing owner screens.
        </AlertDescription>
      </Alert>

      {loading && !snapshot && (
        <div className="grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      )}

      {error && !snapshot && (
        <Alert variant="destructive">
          <AlertTitle>Failed to load readiness</AlertTitle>
          <AlertDescription className="text-xs">{error.message}</AlertDescription>
        </Alert>
      )}

      {snapshot && (
        <>
          {/* Top banner */}
          <CommunicationHubSectionCard title="Overall readiness">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={OVERALL_LABELS[snapshot.overall].variant}
                    className={OVERALL_LABELS[snapshot.overall].className}
                  >
                    {OVERALL_LABELS[snapshot.overall].label}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">Wider rollout: not assessed (later phase)</span>
                </div>
                <p className="text-sm">{snapshot.overall_reason}</p>
                <p className="text-xs text-muted-foreground">
                  Next: <span className="font-medium">{snapshot.next_action.label}</span> — {snapshot.next_action.detail}
                  {snapshot.next_action.href && (
                    <> · <Link to={snapshot.next_action.href} className="underline">Open</Link></>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => void reload()} disabled={loading}>
                  <RefreshCcw className="h-3.5 w-3.5 mr-1" /> Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={() => void onCopy()}>
                  <ClipboardCopy className="h-3.5 w-3.5 mr-1" /> Copy summary
                </Button>
                <Button variant="outline" size="sm" onClick={onDownload}>
                  <Download className="h-3.5 w-3.5 mr-1" /> Download .md
                </Button>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Generated {new Date(snapshot.generated_at).toLocaleString()}
            </div>
          </CommunicationHubSectionCard>

          {/* Category cards */}
          <CommunicationHubSectionCard title="Readiness by category">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {CATEGORY_CARDS.map((c) => {
                const cat = snapshot.categories[c.key];
                return (
                  <div key={c.key} className="rounded-md border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{c.title}</div>
                      <StatusBadge status={cat.status} />
                    </div>
                    <ul className="text-[11px] text-muted-foreground space-y-0.5">
                      {cat.facts.map((f, i) => <li key={i}>• {f}</li>)}
                    </ul>
                    {c.fixHref && (
                      <div>
                        <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
                          <Link to={c.fixHref}>{c.fixLabel ?? "Open"}<ExternalLink className="h-3 w-3 ml-1" /></Link>
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CommunicationHubSectionCard>

          {/* Blockers table */}
          <CommunicationHubSectionCard
            title={`Production blockers (${snapshot.blockers.length})`}
            description="Every check that would prevent or degrade a controlled live send."
          >
            <CommunicationHubDataTable<Blocker>
              screenKey="comm-hub.production-readiness.blockers"
              columns={blockerColumns}
              rows={snapshot.blockers}
              getRowKey={(r) => `${r.category}::${r.code}`}
              defaultSort={{ key: "severity", direction: "asc" }}
              emptyMessage="No blockers detected."
            />
          </CommunicationHubSectionCard>

          {/* Ready events table */}
          <CommunicationHubSectionCard
            title={`Events (${snapshot.event_stats.total})`}
            description="Full per-event live readiness. Promotion actions live on the All Events Live Readiness page."
          >
            <CommunicationHubDataTable<ReadinessRow>
              screenKey="comm-hub.production-readiness.ready-events"
              columns={eventColumns}
              rows={snapshot.events}
              getRowKey={(r) => r.key}
              defaultSort={{ key: "eligibility", direction: "desc" }}
              emptyMessage="No mapped events."
            />
          </CommunicationHubSectionCard>

          {/* Next action panel */}
          <CommunicationHubSectionCard title="Next recommended action">
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-sm">
                <div className="font-medium">{snapshot.next_action.label}</div>
                <div className="text-xs text-muted-foreground">{snapshot.next_action.detail}</div>
              </div>
              {snapshot.next_action.href && (
                <Button asChild size="sm">
                  <Link to={snapshot.next_action.href}>Open<ExternalLink className="h-3 w-3 ml-1" /></Link>
                </Button>
              )}
            </div>
          </CommunicationHubSectionCard>
        </>
      )}
    </CommunicationHubWorkspaceShell>
  );
}
