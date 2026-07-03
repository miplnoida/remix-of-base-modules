/**
 * EPIC-09A Phase 2 — Executive KPI Dashboard
 *
 * Route: /legal/reports/executive
 * KPI tiles read only from lgReportingService (v_lg_case_financials
 * powers financial figures). Every tile drills into the correct
 * canonical Legal V1 workspace with the appropriate filter.
 */
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { getExecutiveKpis } from "@/services/legal/lgReportingService";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/formatCurrency";
import {
  Briefcase, FolderOpen, FolderClosed, FilePlus2, Wallet, CircleDollarSign,
  TrendingUp, TrendingDown, Gavel, ShieldAlert, ScrollText, CalendarClock, AlarmClock,
} from "lucide-react";

interface KpiTile {
  key: string;
  label: string;
  value: string | number;
  icon: React.ComponentType<any>;
  tone?: "default" | "success" | "warning" | "danger";
  onClick?: () => void;
}

export default function ExecutiveKpiDashboard() {
  const nav = useNavigate();
  const { data: kpis, isLoading } = useQuery({
    queryKey: ["legal-exec-kpis"],
    queryFn: () => getExecutiveKpis(),
    staleTime: 60_000,
  });

  const { data: caseCounts } = useQuery({
    queryKey: ["legal-exec-case-counts"],
    queryFn: async () => {
      const [total, closed, hearingsWeek, deadlines] = await Promise.all([
        (supabase as any).from("lg_case").select("id", { count: "exact", head: true }),
        (supabase as any).from("lg_case").select("id", { count: "exact", head: true })
          .in("status_code", ["CLOSED", "CANCELLED"]),
        (supabase as any).from("lg_hearing").select("id", { count: "exact", head: true })
          .gte("scheduled_at", new Date().toISOString())
          .lte("scheduled_at", new Date(Date.now() + 7 * 86_400_000).toISOString()),
        (supabase as any).from("lg_case_deadline").select("id", { count: "exact", head: true })
          .gte("due_date", new Date().toISOString())
          .lte("due_date", new Date(Date.now() + 14 * 86_400_000).toISOString()),
      ]);
      return {
        totalMatters: total.count ?? 0,
        closedMatters: closed.count ?? 0,
        hearingsThisWeek: hearingsWeek.count ?? 0,
        upcomingDeadlines: deadlines.count ?? 0,
      };
    },
    staleTime: 60_000,
  });

  const k = kpis;
  const c = caseCounts;

  const tiles: KpiTile[] = [
    { key: "total", label: "Total Matters", value: c?.totalMatters ?? "—", icon: Briefcase,
      onClick: () => nav("/legal/lg/cases") },
    { key: "open", label: "Open Matters", value: k?.openMatters ?? "—", icon: FolderOpen,
      onClick: () => nav("/legal/lg/cases?status=open") },
    { key: "closed", label: "Closed Matters", value: c?.closedMatters ?? "—", icon: FolderClosed,
      onClick: () => nav("/legal/reports/run/OPS_CLOSED_MATTERS") },
    { key: "new", label: "New This Month", value: k?.newMattersThisMonth ?? "—", icon: FilePlus2,
      onClick: () => nav("/legal/lg/cases?opened=thisMonth") },
    { key: "assessed", label: "Total Assessed", value: formatCurrency(k?.totalAssessed ?? 0), icon: Wallet, tone: "default",
      onClick: () => nav("/legal/reports/run/FIN_CASE_SUMMARY") },
    { key: "paid", label: "Total Paid", value: formatCurrency(k?.totalPaid ?? 0), icon: CircleDollarSign, tone: "success",
      onClick: () => nav("/legal/reports/run/FIN_CASE_SUMMARY") },
    { key: "outstanding", label: "Outstanding", value: formatCurrency(k?.totalOutstanding ?? 0), icon: TrendingDown, tone: "warning",
      onClick: () => nav("/legal/reports/run/FIN_OUTSTANDING_BY_EMPLOYER") },
    { key: "recovery", label: "Recovery %", value: `${k?.recoveryPct ?? 0}%`, icon: TrendingUp, tone: "success",
      onClick: () => nav("/legal/reports/run/FIN_RECOVERY_COLLECTION") },
    { key: "appeals", label: "Appeals", value: k?.activeAppeals ?? "—", icon: Gavel,
      onClick: () => nav("/legal/reports/run/OPS_APPEALS_REGISTER") },
    { key: "enforcement", label: "Enforcement", value: k?.activeEnforcement ?? "—", icon: ShieldAlert,
      onClick: () => nav("/legal/reports/run/OPS_ENFORCEMENT_REGISTER") },
    { key: "consent", label: "Consent Orders (Breached)", value: k?.consentOrdersBreached ?? "—", icon: ScrollText, tone: "danger",
      onClick: () => nav("/legal/reports/run/OPS_CONSENT_ORDER_REGISTER") },
    { key: "hearings", label: "Hearings This Week", value: c?.hearingsThisWeek ?? "—", icon: CalendarClock,
      onClick: () => nav("/legal/reports/run/OPS_HEARINGS_REGISTER") },
    { key: "deadlines", label: "Upcoming Deadlines (14d)", value: c?.upcomingDeadlines ?? "—", icon: AlarmClock,
      onClick: () => nav("/legal/lg/deadlines") },
  ];

  const toneClass = (t?: KpiTile["tone"]) =>
    t === "success" ? "text-emerald-600" :
    t === "warning" ? "text-amber-600" :
    t === "danger" ? "text-red-600" : "text-primary";

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
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Card key={t.key}
              className="cursor-pointer transition hover:shadow-md hover:border-primary/40"
              onClick={t.onClick}>
              <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground">{t.label}</CardTitle>
                <Icon className={`h-4 w-4 ${toneClass(t.tone)}`} />
              </CardHeader>
              <CardContent className="pt-1">
                <div className={`text-2xl font-semibold ${toneClass(t.tone)}`}>
                  {isLoading ? "…" : t.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">By Priority</CardTitle>
          <CardDescription className="text-xs">Open + closed matters grouped by priority</CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          {k && Object.keys(k.mattersByPriority).length > 0 ? (
            <div className="flex flex-wrap gap-4">
              {Object.entries(k.mattersByPriority).map(([p, n]) => (
                <div key={p} className="rounded border px-3 py-1.5">
                  <span className="text-muted-foreground text-xs">{p}: </span>
                  <span className="font-semibold">{n}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-muted-foreground text-xs">No data</p>}
        </CardContent>
      </Card>
    </div>
  );
}
