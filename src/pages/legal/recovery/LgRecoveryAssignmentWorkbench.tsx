/**
 * EPIC-06D — Recovery Assignment Workbench
 * High-density grid of all recovery assignments with KPIs, filters, and bulk actions.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle, CheckCircle2, Activity, Clock, ArrowRightLeft, TrendingUp, Users,
} from "lucide-react";
import { useLgAccess } from "@/hooks/legal/useLgAccess";
import { loadAssignmentWorkbench, type AssignmentWorkbenchRow } from "@/services/legal/lgRecoveryAssignmentWorkbenchService";

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT: "bg-muted text-muted-foreground",
    ASSIGNED: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    ACTIVE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    SUSPENDED: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    ESCALATED: "bg-red-500/10 text-red-700 dark:text-red-300",
    COMPLETED: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
    CLOSED: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[status] ?? ""}`}>{status}</span>;
}

function HealthDot({ health }: { health: string }) {
  const map: Record<string, string> = {
    HEALTHY: "bg-emerald-500",
    AT_RISK: "bg-amber-500",
    CRITICAL: "bg-red-500",
  };
  return <span title={health} className={`inline-block h-2.5 w-2.5 rounded-full ${map[health] ?? "bg-muted"}`} />;
}

export default function LgRecoveryAssignmentWorkbench() {
  const nav = useNavigate();
  const { can } = useLgAccess();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [healthFilter, setHealthFilter] = useState<string>("ALL");
  const [strategyFilter, setStrategyFilter] = useState<string>("ALL");

  const data = useQuery({
    queryKey: ["lg-recovery-assignment-workbench"],
    queryFn: loadAssignmentWorkbench,
    staleTime: 30_000,
  });

  const rows = useMemo(() => {
    const all = data.data?.rows ?? [];
    return all.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (healthFilter !== "ALL" && r.health !== healthFilter) return false;
      if (strategyFilter !== "ALL" && r.strategy_type_code !== strategyFilter) return false;
      if (q) {
        const s = q.toLowerCase();
        if (
          !r.code.toLowerCase().includes(s) &&
          !r.title.toLowerCase().includes(s) &&
          !(r.assigned_officer_code ?? "").toLowerCase().includes(s)
        ) return false;
      }
      return true;
    });
  }, [data.data, q, statusFilter, healthFilter, strategyFilter]);

  const kpis = data.data?.kpis;

  if (!can("viewRecoveryAssignment")) {
    return <div className="p-6 text-muted-foreground">You do not have permission to view Recovery Assignments.</div>;
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Recovery Assignment Workbench</h1>
        <p className="text-sm text-muted-foreground">
          Operational workspace for recovery officers. Every assignment is derived from Recoverable Liabilities.
        </p>
      </div>

      {/* KPI chips */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <KpiCard icon={<Activity className="h-4 w-4" />} label="Active" value={kpis?.active ?? 0} />
        <KpiCard icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} label="At Risk" value={kpis?.at_risk ?? 0} />
        <KpiCard icon={<AlertTriangle className="h-4 w-4 text-red-600" />} label="Critical" value={kpis?.critical ?? 0} />
        <KpiCard icon={<Clock className="h-4 w-4 text-red-600" />} label="Overdue Actions" value={kpis?.overdue_actions ?? 0} />
        <KpiCard icon={<ArrowRightLeft className="h-4 w-4" />} label="Pending Transfers" value={kpis?.pending_transfers ?? 0} />
        <KpiCard icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} label="Recovery %" value={`${kpis?.recovery_pct ?? 0}%`} />
        <KpiCard icon={<Users className="h-4 w-4" />} label="Total" value={kpis?.total ?? 0} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 flex flex-wrap gap-2 items-center">
          <Input placeholder="Search code, title, officer…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {["DRAFT", "ASSIGNED", "ACTIVE", "SUSPENDED", "ESCALATED", "COMPLETED", "CLOSED"].map((s) =>
                <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={healthFilter} onValueChange={setHealthFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Health" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All health</SelectItem>
              <SelectItem value="HEALTHY">Healthy</SelectItem>
              <SelectItem value="AT_RISK">At Risk</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
            </SelectContent>
          </Select>
          <Select value={strategyFilter} onValueChange={setStrategyFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Strategy" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All strategies</SelectItem>
              {["DEMAND", "PHONE", "VISIT", "NEGOTIATION", "INSTALLMENT", "COURT_FU", "ESCALATION"].map((s) =>
                <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {can("createRecoveryAssignment") && (
            <Button className="ml-auto" onClick={() => nav("/legal/recovery/assignments/new")}>New Assignment</Button>
          )}
        </CardContent>
      </Card>

      {/* Grid */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-2">Code</th>
                <th className="p-2">Title</th>
                <th className="p-2">Officer</th>
                <th className="p-2">Team</th>
                <th className="p-2">Strategy</th>
                <th className="p-2">Campaign</th>
                <th className="p-2">Status</th>
                <th className="p-2">Health</th>
                <th className="p-2 text-right">Liabilities</th>
                <th className="p-2 text-right">Outstanding</th>
                <th className="p-2 text-right">Rec %</th>
                <th className="p-2">Next Action</th>
              </tr>
            </thead>
            <tbody>
              {data.isLoading && <tr><td colSpan={12} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
              {data.isError && <tr><td colSpan={12} className="p-6 text-center text-red-600">Failed to load assignments.</td></tr>}
              {!data.isLoading && rows.length === 0 && (
                <tr><td colSpan={12} className="p-6 text-center text-muted-foreground">No assignments match the current filters.</td></tr>
              )}
              {rows.map((r: AssignmentWorkbenchRow) => (
                <tr key={r.id} className="border-t hover:bg-muted/30 cursor-pointer"
                    onClick={() => nav(`/legal/recovery/assignments/${r.id}`)}>
                  <td className="p-2 font-mono text-xs">{r.code}</td>
                  <td className="p-2">{r.title}</td>
                  <td className="p-2">{r.assigned_officer_code ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="p-2">{r.assigned_team_code ?? "—"}</td>
                  <td className="p-2">{r.strategy_name ?? r.strategy_type_code ?? "—"}</td>
                  <td className="p-2">{r.campaign_name ?? "—"}</td>
                  <td className="p-2"><StatusPill status={r.status} /></td>
                  <td className="p-2 flex items-center gap-2"><HealthDot health={r.health} /><span className="text-xs">{r.health}</span></td>
                  <td className="p-2 text-right">{r.liability_count}</td>
                  <td className="p-2 text-right">{Number(r.total_outstanding).toLocaleString()}</td>
                  <td className="p-2 text-right">
                    <span className={r.recovery_pct >= 80 ? "text-emerald-600" : r.recovery_pct < 40 ? "text-red-600" : ""}>
                      {r.recovery_pct}%
                    </span>
                  </td>
                  <td className="p-2 text-xs">
                    {r.next_action_code ?? "—"}
                    {r.is_overdue_action && <Badge variant="destructive" className="ml-1">Overdue</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}
