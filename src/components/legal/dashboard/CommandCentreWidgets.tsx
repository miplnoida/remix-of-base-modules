/**
 * EPIC-06C Phase 2 — Executive Legal Command Centre — 20 widgets.
 * Every widget deep-links via URL filter into the relevant workbench.
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import {
  loadCommandCentreMetrics,
  loadJudicialEfficiency,
  type CommandCentreMetrics,
  type JudicialEfficiencyMetrics,
} from "@/services/legal/lgCommandCentreService";

interface WidgetSpec {
  label: string;
  value: string | number;
  href?: string;
  tone?: "default" | "warn" | "danger" | "good";
  group: "Judicial" | "Recovery" | "Operational";
}

const money = (v: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "XCD", maximumFractionDigits: 0 }).format(v);
const pct = (v: number) => `${v.toFixed(1)}%`;

function buildWidgets(m: CommandCentreMetrics, eff: JudicialEfficiencyMetrics): WidgetSpec[] {
  return [
    // Judicial (8)
    { group: "Judicial", label: "Active Orders", value: m.activeOrders, href: "/legal/lg/orders?status=ACTIVE" },
    { group: "Judicial", label: "Compliance Due (7d)", value: m.complianceDue7d, href: "/legal/lg/orders?compliance=DUE_7D", tone: m.complianceDue7d > 0 ? "warn" : "default" },
    { group: "Judicial", label: "Breaches", value: m.breaches, href: "/legal/lg/orders?status=BREACHED", tone: m.breaches > 0 ? "danger" : "default" },
    { group: "Judicial", label: "Appeals Filed (30d)", value: m.appealsFiled30d, href: "/legal/lg/orders?tab=appeals" },
    { group: "Judicial", label: "Appeals Pending", value: m.appealsPendingDecision, href: "/legal/lg/orders?tab=appeals&status=PENDING" },
    { group: "Judicial", label: "Enforcement In Progress", value: m.enforcementInProgress, href: "/legal/lg/orders?tab=enforcement&status=IN_PROGRESS" },
    { group: "Judicial", label: "Enforcement Completed (30d)", value: m.enforcementCompleted30d, tone: "good" },
    { group: "Judicial", label: "Orders Awaiting Issue", value: m.ordersAwaitingIssue, href: "/legal/lg/orders?status=DRAFT" },
    // Recovery (5)
    { group: "Recovery", label: "Total Outstanding", value: money(m.totalOutstanding), href: "/legal/lg/recovery" },
    { group: "Recovery", label: "Recovery %", value: pct(m.recoveryPct), tone: m.recoveryPct >= 75 ? "good" : m.recoveryPct < 25 ? "danger" : "warn" },
    { group: "Recovery", label: "Recovery Delta (30d)", value: money(m.recoveryDelta30d), tone: "good" },
    { group: "Recovery", label: "Breached Arrangements", value: m.breachedArrangements, href: "/legal/lg/recovery?filter=breached", tone: m.breachedArrangements > 0 ? "danger" : "default" },
    { group: "Recovery", label: "High-Risk Liabilities", value: m.highRiskLiabilities, href: "/legal/lg/recovery?risk=HIGH", tone: m.highRiskLiabilities > 0 ? "warn" : "default" },
    // Operational (7)
    { group: "Operational", label: "SLA On-Time %", value: pct(m.slaOnTimePct), tone: m.slaOnTimePct >= 85 ? "good" : "warn" },
    { group: "Operational", label: "At-Risk Tasks", value: m.atRiskTasks, href: "/legal/lg/tasks?sla=AT_RISK", tone: "warn" },
    { group: "Operational", label: "Overdue Tasks", value: m.overdueTasks, href: "/legal/lg/tasks?sla=OVERDUE", tone: "danger" },
    { group: "Operational", label: "Escalated Items", value: m.escalatedItems, href: "/legal/lg/tasks?sla=ESCALATED", tone: "danger" },
    { group: "Operational", label: "My Actions", value: m.myActions, href: "/legal/lg/tasks?view=my" },
    { group: "Operational", label: "Team Queue", value: m.teamQueueDepth, href: "/legal/lg/tasks?view=team" },
    { group: "Operational", label: "Avg Judicial Cycle (d)", value: eff.avgOrderCycleDays.toFixed(1) },
  ];
}

const TONE_CLASS: Record<NonNullable<WidgetSpec["tone"]>, string> = {
  default: "border-border",
  good: "border-emerald-500/40",
  warn: "border-amber-500/40",
  danger: "border-destructive/50",
};

export function CommandCentreWidgets() {
  const { userCode } = useSupabaseAuth() as any;

  const m = useQuery({
    queryKey: ["lg-command-centre", userCode],
    queryFn: () => loadCommandCentreMetrics(userCode ?? undefined),
    staleTime: 30_000,
  });
  const eff = useQuery({
    queryKey: ["lg-command-centre-efficiency"],
    queryFn: loadJudicialEfficiency,
    staleTime: 60_000,
  });

  if (m.isLoading || eff.isLoading || !m.data || !eff.data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {Array.from({ length: 20 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  const widgets = buildWidgets(m.data, eff.data);
  const groups: WidgetSpec["group"][] = ["Judicial", "Recovery", "Operational"];

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g}>
          <h3 className="text-xs uppercase text-muted-foreground mb-2 font-semibold tracking-wider">{g}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {widgets.filter((w) => w.group === g).map((w) => {
              const inner = (
                <Card className={`transition-colors hover:bg-accent/40 ${TONE_CLASS[w.tone ?? "default"]}`}>
                  <CardContent className="p-3">
                    <div className="text-[11px] text-muted-foreground truncate">{w.label}</div>
                    <div className="text-lg font-semibold mt-1">{w.value}</div>
                  </CardContent>
                </Card>
              );
              return w.href ? <Link key={w.label} to={w.href}>{inner}</Link> : <div key={w.label}>{inner}</div>;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default CommandCentreWidgets;
