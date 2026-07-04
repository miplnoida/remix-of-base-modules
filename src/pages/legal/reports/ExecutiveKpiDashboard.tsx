/**
 * EPIC-09A / 09B — Executive Analytics Dashboard
 *
 * Route: /legal/reports/executive
 * All Part 1 KPIs + Part 2 charts, drillable into canonical Legal V1 screens.
 * Time range: Month / Quarter / Year / Custom (drives Part 2 chart grain).
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getExecutiveKpis,
  trendMatterIntake, trendMatterClosure, trendRecoveryCollection, trendOutstanding,
  trendAppeals, trendConsent, trendEnforcement, trendLegalCost, trendExternalCounselSpend,
  trendReferralConversion, distMatterAge, distOfficerWorkload, distCourtWorkload,
  type TimeGrain,
} from "@/services/legal/lgReportingService";
import { formatCurrency } from "@/utils/formatCurrency";
import {
  Briefcase, FolderOpen, FolderClosed, FilePlus2, Wallet, CircleDollarSign,
  TrendingUp, TrendingDown, Gavel, ShieldAlert, ScrollText, CalendarClock, Clock,
  Scale, Users, Timer,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface KpiTile {
  key: string;
  label: string;
  value: string | number;
  icon: React.ComponentType<any>;
  tone?: "default" | "success" | "warning" | "danger";
  onClick?: () => void;
}

const toneClass = (t?: KpiTile["tone"]) =>
  t === "success" ? "text-emerald-600" :
  t === "warning" ? "text-amber-600" :
  t === "danger" ? "text-red-600" : "text-primary";

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "#10b981", "#f59e0b", "#ef4444", "#6366f1", "#14b8a6"];

export default function ExecutiveKpiDashboard() {
  const nav = useNavigate();
  const [grain, setGrain] = useState<TimeGrain>("month");

  const { data: kpis, isLoading } = useQuery({
    queryKey: ["legal-exec-kpis"], queryFn: () => getExecutiveKpis(), staleTime: 60_000,
  });

  const t = (fn: () => Promise<any>, key: string) =>
    useQuery({ queryKey: [key, grain], queryFn: fn, staleTime: 60_000 });

  const intake = t(() => trendMatterIntake(grain), "trend-intake");
  const closure = t(() => trendMatterClosure(grain), "trend-closure");
  const collection = t(() => trendRecoveryCollection(grain), "trend-collection");
  const outstanding = t(() => trendOutstanding(grain), "trend-outstanding");
  const appeals = t(() => trendAppeals(grain), "trend-appeals");
  const consent = t(() => trendConsent(grain), "trend-consent");
  const enforcement = t(() => trendEnforcement(grain), "trend-enforcement");
  const legalCost = t(() => trendLegalCost(grain), "trend-legal-cost");
  const counselSpend = t(() => trendExternalCounselSpend(grain), "trend-counsel-spend");
  const referralConv = t(() => trendReferralConversion(grain), "trend-referral-conv");
  const ageDist = useQuery({ queryKey: ["dist-age"], queryFn: distMatterAge, staleTime: 60_000 });
  const officerLoad = useQuery({ queryKey: ["dist-officer"], queryFn: distOfficerWorkload, staleTime: 60_000 });
  const courtLoad = useQuery({ queryKey: ["dist-court"], queryFn: distCourtWorkload, staleTime: 60_000 });

  const k = kpis;

  const tiles: KpiTile[] = useMemo(() => k ? [
    { key: "total", label: "Total Matters", value: k.totalMatters, icon: Briefcase, onClick: () => nav("/legal/lg/cases") },
    { key: "open", label: "Open Matters", value: k.openMatters, icon: FolderOpen, onClick: () => nav("/legal/lg/cases?status=open") },
    { key: "closed", label: "Closed Matters", value: k.closedMatters, icon: FolderClosed, onClick: () => nav("/legal/reports/run/OPS_CLOSED_MATTERS") },
    { key: "new", label: "New This Month", value: k.newMattersThisMonth, icon: FilePlus2, onClick: () => nav("/legal/lg/cases?opened=thisMonth") },
    { key: "closedMonth", label: "Closed This Month", value: k.closedMattersThisMonth, icon: FolderClosed, onClick: () => nav("/legal/reports/run/OPS_CLOSED_MATTERS") },
    { key: "hearings", label: "Active Hearings", value: k.activeHearings, icon: CalendarClock, onClick: () => nav("/legal/reports/run/OPS_HEARINGS_REGISTER") },
    { key: "orders", label: "Pending Orders", value: k.pendingOrders, icon: Gavel, onClick: () => nav("/legal/reports/run/OPS_ORDERS_PENDING_COMPLIANCE") },
    { key: "appeals", label: "Pending Appeals", value: k.pendingAppeals, icon: Scale, onClick: () => nav("/legal/reports/run/OPS_APPEALS_REGISTER") },
    { key: "enforcement", label: "Active Enforcement", value: k.activeEnforcement, icon: ShieldAlert, onClick: () => nav("/legal/reports/run/OPS_ENFORCEMENT_REGISTER") },
    { key: "consent", label: "Active Consent Orders", value: k.activeConsentOrders, icon: ScrollText, onClick: () => nav("/legal/reports/run/OPS_CONSENT_ORDER_REGISTER") },
    { key: "counsel", label: "Active External Counsel", value: k.activeExternalCounsel, icon: Users, onClick: () => nav("/legal/reports/run/EC_ENGAGEMENT_REGISTER") },
    { key: "assessed", label: "Total Recoverable", value: formatCurrency(k.totalAssessed), icon: Wallet, onClick: () => nav("/legal/reports/run/FIN_CASE_SUMMARY") },
    { key: "paid", label: "Total Paid", value: formatCurrency(k.totalPaid), icon: CircleDollarSign, tone: "success", onClick: () => nav("/legal/reports/run/FIN_CASE_SUMMARY") },
    { key: "outstanding", label: "Outstanding", value: formatCurrency(k.totalOutstanding), icon: TrendingDown, tone: "warning", onClick: () => nav("/legal/reports/run/FIN_OUTSTANDING_BY_EMPLOYER") },
    { key: "recovery", label: "Recovery %", value: `${k.recoveryPct}%`, icon: TrendingUp, tone: "success", onClick: () => nav("/legal/reports/run/FIN_RECOVERY_COLLECTION") },
    { key: "age", label: "Average Matter Age", value: `${k.averageMatterAgeDays}d`, icon: Clock, onClick: () => nav("/legal/reports/run/OPS_MATTER_AGING") },
    { key: "resolution", label: "Average Resolution Time", value: `${k.averageResolutionDays}d`, icon: Timer, onClick: () => nav("/legal/reports/run/WL_CLOSURE_PERFORMANCE") },
  ] : [], [k, nav]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Executive Analytics Dashboard"
        subtitle="Board-level Legal KPIs — financials reconcile with v_lg_case_financials"
        breadcrumbs={[
          { label: "Legal Management", href: "/legal/dashboard" },
          { label: "Reports & Analytics", href: "/legal/reports" },
          { label: "Executive" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Tabs value={grain} onValueChange={(v) => setGrain(v as TimeGrain)}>
              <TabsList>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="quarter">Quarter</TabsTrigger>
                <TabsTrigger value="year">Year</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="sm" onClick={() => nav("/legal/reports/analytics/financial")}>Financial</Button>
            <Button variant="outline" size="sm" onClick={() => nav("/legal/reports/analytics/operational")}>Operational</Button>
          </div>
        }
      />

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Card key={tile.key} className="cursor-pointer transition hover:shadow-md hover:border-primary/40" onClick={tile.onClick}>
              <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-[11px] font-medium text-muted-foreground">{tile.label}</CardTitle>
                <Icon className={`h-4 w-4 ${toneClass(tile.tone)}`} />
              </CardHeader>
              <CardContent className="pt-1">
                <div className={`text-xl font-semibold ${toneClass(tile.tone)}`}>{isLoading ? "…" : tile.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Matter Intake vs Closure" subtitle="New matters vs closures per period">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={mergeSeries(intake.data, closure.data, "intake", "closure")}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} />
              <Tooltip /><Legend />
              <Line dataKey="intake" stroke={CHART_COLORS[0]} name="Intake" />
              <Line dataKey="closure" stroke={CHART_COLORS[2]} name="Closure" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Recovery Trend" subtitle="Monthly collections">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={collection.data ?? []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
              <Area dataKey="value" stroke={CHART_COLORS[2]} fill={CHART_COLORS[2]} fillOpacity={0.3} name="Collections" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Outstanding vs Assessed" subtitle="Liability snapshot by period">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={outstanding.data ?? []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
              <Legend />
              <Bar dataKey="secondary" fill={CHART_COLORS[0]} name="Assessed" />
              <Bar dataKey="value" fill={CHART_COLORS[3]} name="Outstanding" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Recovery % Trend" subtitle="Collections ÷ Assessed × 100">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={(outstanding.data ?? []).map((r) => ({ period: r.period, pct: r.secondary ? Math.round(((r.secondary - r.value) / r.secondary) * 1000) / 10 : 0 }))}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip />
              <Line dataKey="pct" stroke={CHART_COLORS[2]} name="Recovery %" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Appeals & Success Rate" subtitle="Filed vs successful outcomes">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={appeals.data ?? []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} />
              <Tooltip /><Legend />
              <Bar dataKey="value" fill={CHART_COLORS[0]} name="Filed" />
              <Bar dataKey="secondary" fill={CHART_COLORS[2]} name="Successful" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Consent Order Performance" subtitle="Paid vs contracted">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={consent.data ?? []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => formatCurrency(Number(v))} /><Legend />
              <Bar dataKey="secondary" fill={CHART_COLORS[0]} name="Contracted" />
              <Bar dataKey="value" fill={CHART_COLORS[2]} name="Paid" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Enforcement Performance" subtitle="Targeted vs recovered">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={enforcement.data ?? []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => formatCurrency(Number(v))} /><Legend />
              <Bar dataKey="secondary" fill={CHART_COLORS[3]} name="Targeted" />
              <Bar dataKey="value" fill={CHART_COLORS[2]} name="Recovered" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Legal Cost Trend" subtitle="Incurred vs recovered">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={legalCost.data ?? []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => formatCurrency(Number(v))} /><Legend />
              <Line dataKey="value" stroke={CHART_COLORS[3]} name="Incurred" />
              <Line dataKey="secondary" stroke={CHART_COLORS[2]} name="Recovered" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="External Counsel Spend" subtitle="Invoiced amounts per period">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={counselSpend.data ?? []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
              <Area dataKey="value" stroke={CHART_COLORS[5]} fill={CHART_COLORS[5]} fillOpacity={0.3} name="Fees" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Referral Conversion" subtitle="Referrals vs accepted">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={referralConv.data ?? []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} />
              <Tooltip /><Legend />
              <Line dataKey="value" stroke={CHART_COLORS[0]} name="Referrals" />
              <Line dataKey="secondary" stroke={CHART_COLORS[2]} name="Accepted" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Matter Age Distribution" subtitle="Open matters bucketed by age">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ageDist.data ?? []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="bucket" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} />
              <Tooltip /><Bar dataKey="value" fill={CHART_COLORS[0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Officer Workload" subtitle="Top 15 officers by open matters">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={officerLoad.data ?? []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="officer" tick={{ fontSize: 10 }} width={100} />
              <Tooltip /><Bar dataKey="value" fill={CHART_COLORS[4]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Court Workload" subtitle="Hearings per court">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={courtLoad.data ?? []} dataKey="value" nameKey="court" outerRadius={80} label>
                {(courtLoad.data ?? []).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Matters by Priority" subtitle="Distribution across priority bands">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={Object.entries(k?.mattersByPriority ?? {}).map(([k, v]) => ({ name: k, value: v }))} dataKey="value" nameKey="name" outerRadius={80} label>
                {Object.keys(k?.mattersByPriority ?? {}).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        {subtitle && <CardDescription className="text-xs">{subtitle}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function mergeSeries(a: any[] = [], b: any[] = [], aKey: string, bKey: string) {
  const map = new Map<string, any>();
  for (const r of a ?? []) map.set(r.period, { period: r.period, [aKey]: r.value });
  for (const r of b ?? []) {
    const ex = map.get(r.period) ?? { period: r.period };
    ex[bKey] = r.value;
    map.set(r.period, ex);
  }
  return Array.from(map.values()).sort((x, y) => x.period.localeCompare(y.period));
}
