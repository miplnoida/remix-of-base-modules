import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  Scale,
  FileText,
  Gavel,
  DollarSign,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Clock,
  ListTodo,
  Layers,
  AlertCircle,
  Percent,
  CalendarX,
  ShieldAlert,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getLegalDashboardRecoveryKpis } from "@/services/legal/lgRecoveryService";
import { cn } from "@/lib/utils";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "#2563EB",
  "#F59E0B",
  "#EF4444",
  "#0EA5E9",
  "#8B5CF6",
  "#10B981",
  "#EC4899",
];

const CLOSED_STATUSES = ["CLOSED", "WITHDRAWN", "DISMISSED", "CLOSED_COMPLIANT", "CLOSED_NON_COMPLIANT"];

const formatCurrency = (n: number) =>
  `EC$${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const ageBucket = (days: number) => {
  if (days <= 30) return "0-30 days";
  if (days <= 60) return "31-60 days";
  if (days <= 90) return "61-90 days";
  if (days <= 180) return "91-180 days";
  return "180+ days";
};

async function loadDashboard() {
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = now.toISOString();
  const todayDate = now.toISOString().slice(0, 10);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    .toISOString()
    .slice(0, 10);

  const [
    casesRes,
    hearingsUpcomingRes,
    ordersRes,
    feesRes,
    palRes,
    tasksRes,
    referralsRes,
  ] = await Promise.all([
    supabase
      .from("lg_case")
      .select(
        "id, status_code, current_stage_code, country_code, opened_date, closed_date, next_action_due_date, total_outstanding, outstanding_amount_snapshot, claim_amount, case_source_code, source_module"
      ),
    supabase
      .from("lg_hearing")
      .select("id, scheduled_at, status")
      .gte("scheduled_at", nowIso)
      .lte("scheduled_at", in30)
      .neq("status", "CANCELLED"),
    supabase.from("lg_order").select("id, status, ordered_amount, issued_date"),
    supabase
      .from("lg_fee_charge")
      .select("id, amount, waived_amount, net_amount, status, charge_date"),
    supabase
      .from("lg_payment_arrangement_link")
      .select("id, arranged_amount, paid_amount, outstanding_amount, active, linked_at")
      .eq("active", true),
    supabase
      .from("lg_case_task")
      .select("id, status, due_date")
      .not("status", "in", '("COMPLETED","CANCELLED","CLOSED")'),
    supabase
      .from("legal_referral")
      .select("id, source_module, created_at")
      .gte("created_at", `${sixMonthsAgo}T00:00:00Z`),
  ]);

  const recoveryKpis = await getLegalDashboardRecoveryKpis();

  const firstError =
    casesRes.error ||
    hearingsUpcomingRes.error ||
    ordersRes.error ||
    feesRes.error ||
    palRes.error ||
    tasksRes.error ||
    referralsRes.error;
  if (firstError) throw firstError;

  const cases = casesRes.data || [];
  const hearings = hearingsUpcomingRes.data || [];
  const orders = ordersRes.data || [];
  const fees = feesRes.data || [];
  const pals = palRes.data || [];
  const tasks = tasksRes.data || [];
  const referrals = referralsRes.data || [];

  const activeCases = cases.filter(
    (c) => !CLOSED_STATUSES.includes((c.status_code || "").toUpperCase())
  );

  const overdue = cases.filter(
    (c) =>
      c.next_action_due_date &&
      c.next_action_due_date < todayDate &&
      !CLOSED_STATUSES.includes((c.status_code || "").toUpperCase())
  ).length;

  // SLA breach ~ open + opened >= 90 days & not closed
  const slaBreached = activeCases.filter((c) => {
    if (!c.opened_date) return false;
    const opened = new Date(c.opened_date);
    const days = (now.getTime() - opened.getTime()) / (1000 * 60 * 60 * 24);
    return days > 90;
  }).length;

  const totalOutstanding = cases.reduce(
    (s, c) => s + Number(c.total_outstanding || c.outstanding_amount_snapshot || 0),
    0
  );
  const totalRecovered = pals.reduce((s, p) => s + Number(p.paid_amount || 0), 0);
  const totalOrdered = orders.reduce((s, o) => s + Number(o.ordered_amount || 0), 0);

  // Cases by Stage
  const stageMap = new Map<string, number>();
  cases.forEach((c) => {
    const k = c.current_stage_code || "UNKNOWN";
    stageMap.set(k, (stageMap.get(k) || 0) + 1);
  });
  const casesByStage = Array.from(stageMap.entries()).map(([stage, count]) => ({
    stage,
    count,
  }));

  // Cases by Territory
  const territoryMap = new Map<string, number>();
  cases.forEach((c) => {
    const k = c.country_code || "N/A";
    territoryMap.set(k, (territoryMap.get(k) || 0) + 1);
  });
  const casesByTerritory = Array.from(territoryMap.entries()).map(([name, value]) => ({
    name,
    value,
  }));

  // Case ageing (open cases)
  const ageMap = new Map<string, number>();
  ["0-30 days", "31-60 days", "61-90 days", "91-180 days", "180+ days"].forEach((b) =>
    ageMap.set(b, 0)
  );
  activeCases.forEach((c) => {
    if (!c.opened_date) return;
    const days = Math.max(
      0,
      Math.floor((now.getTime() - new Date(c.opened_date).getTime()) / (1000 * 60 * 60 * 24))
    );
    const b = ageBucket(days);
    ageMap.set(b, (ageMap.get(b) || 0) + 1);
  });
  const caseAgeing = Array.from(ageMap.entries()).map(([bucket, count]) => ({ bucket, count }));

  // Recovery trend last 6 months (by pal.linked_at as proxy)
  const months: { key: string; label: string; recovered: number; ordered: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({
      key,
      label: d.toLocaleString(undefined, { month: "short" }),
      recovered: 0,
      ordered: 0,
    });
  }
  const monthIndex = new Map(months.map((m, i) => [m.key, i]));
  pals.forEach((p) => {
    if (!p.linked_at) return;
    const k = p.linked_at.slice(0, 7);
    const i = monthIndex.get(k);
    if (i !== undefined) months[i].recovered += Number(p.paid_amount || 0);
  });
  orders.forEach((o) => {
    if (!o.issued_date) return;
    const k = o.issued_date.slice(0, 7);
    const i = monthIndex.get(k);
    if (i !== undefined) months[i].ordered += Number(o.ordered_amount || 0);
  });

  // Referral source
  const refMap = new Map<string, number>();
  referrals.forEach((r) => {
    const k = r.source_module || "UNKNOWN";
    refMap.set(k, (refMap.get(k) || 0) + 1);
  });
  cases.forEach((c) => {
    const k = c.source_module || c.case_source_code;
    if (!k) return;
    if (!refMap.has(k)) refMap.set(k, 0);
  });
  const referralSources = Array.from(refMap.entries()).map(([name, value]) => ({ name, value }));

  const openTasks = tasks.length;
  const publishedJudgments = orders.filter((o) =>
    ["ACTIVE", "ISSUED", "PUBLISHED", "FINAL"].includes((o.status || "").toUpperCase())
  ).length;

  return {
    kpis: {
      total: cases.length,
      active: activeCases.length,
      stages: stageMap.size,
      judgments: publishedJudgments,
      totalOrdered,
      totalOutstanding,
      totalRecovered,
      pendingHearings: hearings.length,
      overdue,
      slaBreached,
      openTasks,
      recoveryPct: recoveryKpis.recoveryPct,
      missedInstallments: recoveryKpis.missedInstallments,
      arrangementsInBreach: recoveryKpis.arrangementsInBreach,
    },
    casesByStage,
    casesByTerritory,
    caseAgeing,
    recoveryTrend: months,
    referralSources,
  };
}

interface KPIProps {
  title: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "success" | "warning" | "danger";
  onClick?: () => void;
}
const KPICard = ({ title, value, hint, icon: Icon, tone = "default", onClick }: KPIProps) => (
  <Card
    onClick={onClick}
    className={cn(
      "transition-all",
      onClick && "cursor-pointer hover:shadow-md hover:border-primary"
    )}
  >
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon
        className={cn("h-4 w-4", {
          "text-muted-foreground": tone === "default",
          "text-green-600": tone === "success",
          "text-amber-600": tone === "warning",
          "text-destructive": tone === "danger",
        })}
      />
    </CardHeader>
    <CardContent>
      <div
        className={cn("text-2xl font-bold", {
          "text-green-600": tone === "success",
          "text-amber-600": tone === "warning",
          "text-destructive": tone === "danger",
        })}
      >
        {value}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </CardContent>
  </Card>
);

const ChartCard = ({
  title,
  isEmpty,
  children,
}: {
  title: string;
  isEmpty: boolean;
  children: React.ReactNode;
}) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>
      {isEmpty ? (
        <EmptyState title="No data yet" description="No records for this view." />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          {children as any}
        </ResponsiveContainer>
      )}
    </CardContent>
  </Card>
);

const LegalDashboard = () => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["legal-dashboard"],
    queryFn: loadDashboard,
  });

  const isEmpty = useMemo(
    () => !isLoading && !error && data && data.kpis.total === 0,
    [isLoading, error, data]
  );

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <PageHeader title="Legal Dashboard" breadcrumbs={[{ label: "Legal Management" }]} />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load dashboard</AlertTitle>
          <AlertDescription>
            {(error as Error).message}{" "}
            <button className="underline ml-2" onClick={() => refetch()}>
              Retry
            </button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const k = data!.kpis;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Legal Dashboard"
        subtitle="Live overview of legal cases, hearings, orders and recovery"
        breadcrumbs={[{ label: "Legal Management" }]}
      />

      {isEmpty && (
        <EmptyState
          title="No legal cases yet"
          description="Once cases are created they will appear here with live metrics."
        />
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPICard
          title="Total Legal Cases"
          value={k.total}
          hint="All time"
          icon={Scale}
          onClick={() => navigate("/legal/cases")}
        />
        <KPICard
          title="Active Cases"
          value={k.active}
          hint="Not closed"
          icon={FileText}
          onClick={() => navigate("/legal/cases?status=active")}
        />
        <KPICard
          title="Cases by Stage"
          value={k.stages}
          hint="Distinct stages"
          icon={Layers}
          onClick={() => navigate("/legal/cases?groupBy=stage")}
        />
        <KPICard
          title="Judgments / Orders"
          value={k.judgments}
          hint="Active orders"
          icon={Gavel}
          onClick={() => navigate("/legal/orders")}
        />
        <KPICard
          title="Outstanding"
          value={formatCurrency(k.totalOutstanding)}
          hint="Across all cases"
          icon={DollarSign}
          tone="warning"
          onClick={() => navigate("/legal/cases?filter=outstanding")}
        />
        <KPICard
          title="Recovered"
          value={formatCurrency(k.totalRecovered)}
          hint="Paid via arrangements"
          icon={TrendingUp}
          tone="success"
          onClick={() => navigate("/legal/reports")}
        />
        <KPICard
          title="Pending Hearings"
          value={k.pendingHearings}
          hint="Next 30 days"
          icon={Calendar}
          onClick={() => navigate("/legal/hearings")}
        />
        <KPICard
          title="Overdue Matters"
          value={k.overdue}
          hint="Next action past due"
          icon={AlertTriangle}
          tone="danger"
          onClick={() => navigate("/legal/cases?filter=overdue")}
        />
        <KPICard
          title="SLA Breached"
          value={k.slaBreached}
          hint="Open > 90 days"
          icon={Clock}
          tone="danger"
          onClick={() => navigate("/legal/cases?filter=sla_breached")}
        />
        <KPICard
          title="Open Tasks"
          value={k.openTasks}
          hint="Across all cases"
          icon={ListTodo}
          onClick={() => navigate("/legal/workbench")}
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Cases by Stage" isEmpty={data!.casesByStage.length === 0}>
          <BarChart data={data!.casesByStage}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill={CHART_COLORS[0]} name="Cases" />
          </BarChart>
        </ChartCard>

        <ChartCard title="Cases by Territory" isEmpty={data!.casesByTerritory.length === 0}>
          <PieChart>
            <Pie
              data={data!.casesByTerritory}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}`}
              outerRadius={100}
              dataKey="value"
            >
              {data!.casesByTerritory.map((_, idx) => (
                <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <ChartCard
        title="Recovery Trend (Ordered vs Recovered, last 6 months)"
        isEmpty={data!.recoveryTrend.every((m) => m.ordered === 0 && m.recovered === 0)}
      >
        <LineChart data={data!.recoveryTrend}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip formatter={(v: number) => formatCurrency(v)} />
          <Legend />
          <Line type="monotone" dataKey="ordered" stroke={CHART_COLORS[1]} name="Ordered" />
          <Line type="monotone" dataKey="recovered" stroke={CHART_COLORS[0]} name="Recovered" />
        </LineChart>
      </ChartCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Case Ageing (Open Cases)" isEmpty={data!.caseAgeing.every((a) => a.count === 0)}>
          <BarChart data={data!.caseAgeing}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill={CHART_COLORS[2]} name="Open Cases" />
          </BarChart>
        </ChartCard>

        <ChartCard title="Referral Source-wise Cases" isEmpty={data!.referralSources.length === 0}>
          <BarChart data={data!.referralSources} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill={CHART_COLORS[3]} name="Referrals" />
          </BarChart>
        </ChartCard>
      </div>
    </div>
  );
};

export default LegalDashboard;
