/**
 * EPIC-06C Phase 3 — Executive Matter Workspace header.
 * Live financial + judicial KPIs at the top of every matter workspace.
 */
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { getCaseLiabilityRollup } from "@/services/legal/lgLiabilityService";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

interface Props { lgCaseId: string }

const money = (v: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "XCD" }).format(v);

async function loadJudicialCounts(caseId: string) {
  const [orders, appeals, enf] = await Promise.all([
    sb.from("lg_order").select("id, status, compliance_date").eq("lg_case_id", caseId).then((r: any) => r.data ?? []),
    sb.from("lg_appeal").select("id, status").eq("case_id", caseId).then((r: any) => r.data ?? []),
    sb.from("lg_enforcement_action").select("id, status").eq("case_id", caseId).then((r: any) => r.data ?? []),
  ]);
  const activeOrders = orders.filter((o: any) => ["ACTIVE", "GRANTED"].includes(o.status)).length;
  const activeAppeals = appeals.filter((a: any) => ["FILED", "UNDER_REVIEW"].includes(a.status)).length;
  const activeEnf = enf.filter((e: any) => ["INITIATED", "IN_PROGRESS"].includes(e.status)).length;
  const breaches = orders.filter((o: any) => o.status === "BREACHED").length;
  const upcoming = orders
    .map((o: any) => o.compliance_date)
    .filter(Boolean)
    .filter((d: string) => new Date(d).getTime() > Date.now())
    .sort()[0] ?? null;
  return { activeOrders, activeAppeals, activeEnf, breaches, nextDeadline: upcoming };
}

export function MatterWorkspaceHeader({ lgCaseId }: Props) {
  const rollup = useQuery({
    queryKey: ["lg-matter-rollup", lgCaseId],
    queryFn: () => getCaseLiabilityRollup(lgCaseId),
    staleTime: 30_000,
  });
  const jud = useQuery({
    queryKey: ["lg-matter-jud-counts", lgCaseId],
    queryFn: () => loadJudicialCounts(lgCaseId),
    staleTime: 30_000,
  });

  if (rollup.isLoading || jud.isLoading || !rollup.data || !jud.data) {
    return <Skeleton className="h-24 w-full" />;
  }

  const r = rollup.data;
  const j = jud.data;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
          <Metric label="Assessed" value={money(r.totalAssessed)} />
          <Metric label="Paid" value={money(r.totalPaid)} />
          <Metric label="Outstanding" value={money(r.totalOutstanding)} tone="danger" />
          <Metric label="Recovery %" value={`${r.recoveryPct.toFixed(1)}%`} tone={r.recoveryPct >= 75 ? "good" : "warn"} />
          <Metric label="High Risk" value={String(r.highRisk.length)} tone={r.highRisk.length > 0 ? "warn" : "default"} />
        </div>
        <Progress value={Math.min(100, r.recoveryPct)} />
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">Active Orders: {j.activeOrders}</Badge>
          <Badge variant="outline">Appeals: {j.activeAppeals}</Badge>
          <Badge variant="outline">Enforcement: {j.activeEnf}</Badge>
          {j.breaches > 0 && <Badge variant="destructive">Breaches: {j.breaches}</Badge>}
          {j.nextDeadline && <Badge variant="secondary">Next Deadline: {j.nextDeadline}</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "default" | "good" | "warn" | "danger" }) {
  const cls = tone === "danger" ? "text-destructive" : tone === "warn" ? "text-amber-600" : tone === "good" ? "text-emerald-600" : "";
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`text-base font-semibold ${cls}`}>{value}</div>
    </div>
  );
}

export default MatterWorkspaceHeader;
