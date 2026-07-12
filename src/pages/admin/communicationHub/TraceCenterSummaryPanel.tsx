/**
 * Trace Center summary panel — surfaces recent universal traces on the
 * Communication Hub landing so operators can jump straight into diagnosis.
 * Read-only. Uses the same traceService as the Trace Center page.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, AlertTriangle, CheckCircle2, Clock, ArrowRight, RefreshCw, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listTraces, type TraceUnifiedRow } from "./traces/traceService";

function statusTone(status: string): "success" | "warning" | "error" | "info" {
  if (["sent", "delivered", "completed"].includes(status)) return "success";
  if (["blocked", "suppressed"].includes(status)) return "warning";
  if (["failed"].includes(status)) return "error";
  return "info";
}

function StatusBadge({ status }: { status: string }) {
  const tone = statusTone(status);
  const cls =
    tone === "success"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
      : tone === "warning"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
      : tone === "error"
      ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
      : "bg-muted text-muted-foreground";
  return <Badge variant="outline" className={`text-[10px] ${cls}`}>{status}</Badge>;
}

export default function TraceCenterSummaryPanel() {
  const [rows, setRows] = useState<TraceUnifiedRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await listTraces({ limit: 50 });
      setRows(data);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load traces");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const counts = useMemo(() => {
    const r = rows ?? [];
    return {
      total: r.length,
      blocked: r.filter(x => x.status === "blocked" || x.status === "suppressed").length,
      failed: r.filter(x => x.status === "failed").length,
      inflight: r.filter(x => ["queued", "dispatching", "retry_scheduled"].includes(x.status)).length,
      delivered: r.filter(x => ["sent", "delivered", "completed"].includes(x.status)).length,
    };
  }, [rows]);

  const recent = (rows ?? []).slice(0, 6);

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Trace Center — live communication diagnosis
            </CardTitle>
            <CardDescription>
              Every module/event attempt is traced end-to-end. Jump into a trace to see the exact gate that passed, blocked or failed.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button asChild size="sm" className="gap-1">
              <Link to="/admin/communication-hub/traces">
                Open Trace Center <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <KpiTile label="Recent traces" value={counts.total} icon={Search} to="/admin/communication-hub/traces" />
          <KpiTile label="Blocked" value={counts.blocked} icon={AlertTriangle} tone="warning" to="/admin/communication-hub/traces?status=blocked" />
          <KpiTile label="Failed" value={counts.failed} icon={AlertTriangle} tone="error" to="/admin/communication-hub/traces?status=failed" />
          <KpiTile label="In-flight" value={counts.inflight} icon={Clock} tone="info" to="/admin/communication-hub/traces?status=queued" />
          <KpiTile label="Delivered" value={counts.delivered} icon={CheckCircle2} tone="success" to="/admin/communication-hub/traces?status=delivered" />
        </div>

        {/* Recent list */}
        <div className="rounded-md border">
          <div className="px-3 py-2 border-b flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Most recent attempts</span>
            <Link to="/admin/communication-hub/traces" className="text-xs text-primary hover:underline">View all</Link>
          </div>

          {loading && !rows ? (
            <div className="p-3 space-y-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : err ? (
            <div className="p-4 text-sm text-destructive">{err}</div>
          ) : recent.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              No traces yet. Traces will appear here as soon as any module attempts to send a communication.
            </div>
          ) : (
            <ul className="divide-y">
              {recent.map(t => (
                <li key={t.trace_id}>
                  <Link
                    to={`/admin/communication-hub/traces/${t.trace_id}`}
                    className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <span className="font-mono text-xs text-muted-foreground shrink-0">{t.trace_no}</span>
                    <StatusBadge status={t.status} />
                    <span className="truncate">
                      <span className="font-medium">{t.module_code ?? "—"}</span>
                      <span className="text-muted-foreground"> · {t.event_code ?? "—"}</span>
                    </span>
                    <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                      {t.blocked_stage ? (
                        <span className="text-amber-700 dark:text-amber-300">blocked @ {t.blocked_stage}</span>
                      ) : t.current_stage ? (
                        <span>@ {t.current_stage}</span>
                      ) : null}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function KpiTile({
  label, value, icon: Icon, tone = "default", to,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "success" | "warning" | "error" | "info";
  to: string;
}) {
  const toneCls =
    tone === "success" ? "text-emerald-600 dark:text-emerald-400"
    : tone === "warning" ? "text-amber-600 dark:text-amber-400"
    : tone === "error" ? "text-red-600 dark:text-red-400"
    : tone === "info" ? "text-sky-600 dark:text-sky-400"
    : "text-foreground";
  return (
    <Link to={to} className="rounded-md border p-2 hover:bg-muted/50 transition-colors block">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${toneCls}`} />
        {label}
      </div>
      <div className={`text-xl font-semibold tabular-nums ${toneCls}`}>{value}</div>
    </Link>
  );
}
