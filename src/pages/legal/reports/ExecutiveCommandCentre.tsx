/**
 * EPIC-09C Part 1 — Executive Command Centre
 *
 * The home dashboard for executives. Every widget drills into canonical
 * Legal pages (cases, hearings, orders, recovery, reports).
 *
 * Reuses:
 *   - lgCommandCentreService (KPIs)
 *   - lgReportingService.loadExecutiveKpis (financial KPIs)
 *   - lg_report_export_audit / lg_scheduled_report (recent exports / schedules)
 *   - v_lg_case_financials — never re-computes financials
 */
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GlobalDashboardFilters } from "@/components/legal/reports/GlobalDashboardFilters";
import { FilterChips } from "@/components/legal/reports/FilterChips";
import {
  AlertTriangle, Bell, Calendar, ClipboardList, Clock, DollarSign, Download,
  ExternalLink, FileText, Gavel, ShieldAlert, TrendingUp, Users,
} from "lucide-react";
import { loadCommandCentreMetrics } from "@/services/legal/lgCommandCentreService";
import { loadExecutiveKpis } from "@/services/legal/lgReportingService";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardFilters } from "@/hooks/legal/useDashboardFilters";
import { recordReportAudit } from "@/services/legal/lgReportGovernanceService";

const sb = supabase as any;
const money = (v: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "XCD", maximumFractionDigits: 0 }).format(v ?? 0);

function Kpi({ label, value, href, tone = "default", icon: Icon }: {
  label: string; value: React.ReactNode; href?: string; tone?: "default" | "warn" | "danger" | "good";
  icon?: React.ComponentType<any>;
}) {
  const border = tone === "danger" ? "border-destructive/50" : tone === "warn" ? "border-amber-500/40" : tone === "good" ? "border-emerald-500/40" : "border-border";
  const card = (
    <Card className={`${border} transition-colors hover:bg-accent/40 h-full`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="text-xs text-muted-foreground">{label}</div>
          {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
        </div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
  return href ? <Link to={href}>{card}</Link> : card;
}

function Section({ title, action, children, icon: Icon }: { title: string; action?: React.ReactNode; children: React.ReactNode; icon?: React.ComponentType<any> }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">{Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function ExecutiveCommandCentre() {
  const nav = useNavigate();
  const { filters } = useDashboardFilters();

  useEffect(() => { recordReportAudit({ event_type: "dashboard_view", report_code: "EXEC_COMMAND_CENTRE" }); }, []);

  const cc = useQuery({ queryKey: ["exec-cc-metrics", filters], queryFn: () => loadCommandCentreMetrics(), staleTime: 60_000 });
  const kpi = useQuery({ queryKey: ["exec-cc-kpi", filters], queryFn: () => loadExecutiveKpis({ dateFrom: filters.dateFrom, dateTo: filters.dateTo, employerId: filters.employerId, officerId: filters.officerId, territory: filters.territory }), staleTime: 60_000 });

  const overdueHearings = useQuery({
    queryKey: ["exec-cc-overdue-hearings"],
    queryFn: async () => {
      const today = new Date().toISOString();
      const { data } = await sb.from("lg_hearing").select("id,scheduled_at,hearing_type_code,court_name,status,lg_case_id").lt("scheduled_at", today).eq("status", "SCHEDULED").order("scheduled_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });
  const overdueMatters = useQuery({
    queryKey: ["exec-cc-overdue-matters"],
    queryFn: async () => {
      const { data } = await sb.from("lg_case").select("id,lg_case_no,matter_title,priority,current_stage_code,sla_status").in("sla_status", ["OVERDUE", "BREACHED", "AT_RISK"]).limit(10);
      return data ?? [];
    },
  });
  const upcomingHearings = useQuery({
    queryKey: ["exec-cc-upcoming-hearings"],
    queryFn: async () => {
      const today = new Date().toISOString();
      const in7 = new Date(Date.now() + 7 * 86_400_000).toISOString();
      const { data } = await sb.from("lg_hearing").select("id,scheduled_at,hearing_type_code,court_name,lg_case_id").gte("scheduled_at", today).lte("scheduled_at", in7).order("scheduled_at").limit(10);
      return data ?? [];
    },
  });
  const appealsPending = useQuery({
    queryKey: ["exec-cc-appeals-pending"],
    queryFn: async () => {
      const { data } = await sb.from("lg_appeal").select("id,appeal_no,filing_date,appeal_deadline,status").in("status", ["FILED", "PENDING", "AWAITING_DECISION"]).limit(10);
      return data ?? [];
    },
  });
  const consentBreached = useQuery({
    queryKey: ["exec-cc-consent-breached"],
    queryFn: async () => {
      const { data } = await sb.from("lg_consent_order").select("id,code,title,total_amount,paid_amount,status").eq("status", "BREACHED").limit(10);
      return data ?? [];
    },
  });
  const highRiskEmployers = useQuery({
    queryKey: ["exec-cc-high-risk"],
    queryFn: async () => {
      const { data } = await sb.from("lg_recoverable_liability").select("employer_name,outstanding").order("outstanding", { ascending: false }).limit(10);
      const roll = new Map<string, number>();
      for (const r of data ?? []) roll.set(r.employer_name ?? "—", (roll.get(r.employer_name ?? "—") ?? 0) + Number(r.outstanding ?? 0));
      return Array.from(roll.entries()).map(([name, outstanding]) => ({ name, outstanding })).sort((a, b) => b.outstanding - a.outstanding).slice(0, 8);
    },
  });
  const recentExports = useQuery({
    queryKey: ["exec-cc-exports"],
    queryFn: async () => {
      const { data } = await sb.from("lg_report_export_audit").select("id,report_code,report_name,exported_at,format,row_count").order("exported_at", { ascending: false }).limit(6);
      return data ?? [];
    },
  });
  const schedules = useQuery({
    queryKey: ["exec-cc-schedules"],
    queryFn: async () => {
      const { data } = await sb.from("lg_scheduled_report").select("id,schedule_name,report_code,frequency,next_run_at,is_active").eq("is_active", true).order("next_run_at", { ascending: true }).limit(6);
      return data ?? [];
    },
  });
  const activity = useQuery({
    queryKey: ["exec-cc-activity"],
    queryFn: async () => {
      const { data } = await sb.from("lg_case_activity").select("id,lg_case_id,activity_type,description,created_at").order("created_at", { ascending: false }).limit(12);
      return data ?? [];
    },
  });

  const k = kpi.data;
  const m = cc.data;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Executive Command Centre"
        subtitle="Board-level oversight of legal operations, financials, judicial performance and recovery."
        breadcrumbs={[{ label: "Legal Management", href: "/legal/dashboard" }, { label: "Reports", href: "/legal/reports" }, { label: "Command Centre" }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild><Link to="/legal/reports/executive"><TrendingUp className="h-4 w-4 mr-1" />Executive Analytics</Link></Button>
            <Button variant="outline" size="sm" asChild><Link to="/legal/reports"><FileText className="h-4 w-4 mr-1" />Report Catalogue</Link></Button>
          </div>
        }
      />

      <GlobalDashboardFilters />
      <FilterChips />

      <Section title="Today's KPIs" icon={TrendingUp}>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {kpi.isLoading || !k ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />) : (
            <>
              <Kpi label="Open Matters" value={k.openMatters} href="/legal/lg/cases?status=OPEN" icon={ClipboardList} />
              <Kpi label="Outstanding" value={money(k.totalOutstanding)} href="/legal/reports/run/FIN_OUTSTANDING_BY_EMPLOYER" tone="warn" icon={DollarSign} />
              <Kpi label="Recovered" value={money(k.totalPaid)} href="/legal/reports/run/FIN_RECOVERY_COLLECTION" tone="good" icon={DollarSign} />
              <Kpi label="Recovery %" value={`${(k.recoveryPct ?? 0).toFixed(1)}%`} tone={k.recoveryPct >= 75 ? "good" : k.recoveryPct < 25 ? "danger" : "warn"} icon={TrendingUp} />
              <Kpi label="Upcoming Hearings" value={k.upcomingHearings} href="/legal/reports/run/OPS_UPCOMING_HEARINGS" icon={Calendar} />
              <Kpi label="Legal Costs" value={money(k.legalCostsIncurred)} href="/legal/reports/run/FIN_LEGAL_COST_REGISTER" icon={DollarSign} />
            </>
          )}
        </div>
      </Section>

      <Section title="Critical Alerts" icon={ShieldAlert}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Overdue Matters" value={m?.overdueTasks ?? "—"} tone="danger" href="/legal/lg/cases?status=OVERDUE" icon={AlertTriangle} />
          <Kpi label="SLA Breached" value={m?.breaches ?? "—"} tone="danger" href="/legal/lg/tasks?sla=BREACHED" icon={AlertTriangle} />
          <Kpi label="Consent Orders Breached" value={consentBreached.data?.length ?? 0} tone="danger" href="/legal/lg/consent-orders?status=BREACHED" icon={AlertTriangle} />
          <Kpi label="Escalated" value={m?.escalatedItems ?? "—"} tone="warn" href="/legal/lg/tasks?sla=ESCALATED" icon={Bell} />
        </div>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4" />Overdue Hearings</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            {overdueHearings.data?.length ? overdueHearings.data.map((h: any) => (
              <button key={h.id} className="w-full text-left flex justify-between hover:bg-muted/40 rounded p-1" onClick={() => nav(`/legal/lg/hearings/${h.id}`)}>
                <span>{new Date(h.scheduled_at).toLocaleDateString()} — {h.hearing_type_code}</span>
                <span className="text-muted-foreground">{h.court_name}</span>
              </button>
            )) : <div className="text-muted-foreground">No overdue hearings.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ClipboardList className="h-4 w-4" />Overdue Matters</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            {overdueMatters.data?.length ? overdueMatters.data.map((c: any) => (
              <button key={c.id} className="w-full text-left flex justify-between hover:bg-muted/40 rounded p-1" onClick={() => nav(`/legal/lg/cases/${c.id}`)}>
                <span>{c.lg_case_no} — {c.matter_title}</span>
                <Badge variant="destructive" className="text-[10px]">{c.sla_status}</Badge>
              </button>
            )) : <div className="text-muted-foreground">All matters within SLA.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" />High-Risk Employers</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            {highRiskEmployers.data?.length ? highRiskEmployers.data.map((e: any) => (
              <Link key={e.name} to={`/legal/reports/run/FIN_OUTSTANDING_BY_EMPLOYER?employerId=${encodeURIComponent(e.name)}`} className="flex justify-between hover:bg-muted/40 rounded p-1">
                <span>{e.name}</span>
                <span className="font-mono">{money(e.outstanding)}</span>
              </Link>
            )) : <div className="text-muted-foreground">No liabilities recorded.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4" />Upcoming Court Dates (7d)</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            {upcomingHearings.data?.length ? upcomingHearings.data.map((h: any) => (
              <button key={h.id} className="w-full text-left flex justify-between hover:bg-muted/40 rounded p-1" onClick={() => nav(`/legal/lg/hearings/${h.id}`)}>
                <span>{new Date(h.scheduled_at).toLocaleString()}</span>
                <span className="text-muted-foreground">{h.court_name} — {h.hearing_type_code}</span>
              </button>
            )) : <div className="text-muted-foreground">No hearings scheduled in the next 7 days.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Gavel className="h-4 w-4" />Appeals Pending</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            {appealsPending.data?.length ? appealsPending.data.map((a: any) => (
              <button key={a.id} className="w-full text-left flex justify-between hover:bg-muted/40 rounded p-1" onClick={() => nav(`/legal/lg/appeals/${a.id}`)}>
                <span>{a.appeal_no}</span>
                <Badge variant="secondary" className="text-[10px]">{a.status}</Badge>
              </button>
            )) : <div className="text-muted-foreground">No appeals pending.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Consent Orders Breached</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            {consentBreached.data?.length ? consentBreached.data.map((c: any) => (
              <button key={c.id} className="w-full text-left flex justify-between hover:bg-muted/40 rounded p-1" onClick={() => nav(`/legal/lg/consent-orders/${c.id}`)}>
                <span>{c.code} — {c.title}</span>
                <span className="font-mono">{money(Number(c.total_amount ?? 0) - Number(c.paid_amount ?? 0))}</span>
              </button>
            )) : <div className="text-muted-foreground">No breached consent orders.</div>}
          </CardContent>
        </Card>
      </div>

      <Section title="Recovery Performance" icon={DollarSign}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Total Assessed" value={money(k?.totalAssessed ?? 0)} href="/legal/reports/run/FIN_CASE_SUMMARY" />
          <Kpi label="Monthly Collection" value={money(m?.recoveryDelta30d ?? 0)} tone="good" href="/legal/reports/run/FIN_RECOVERY_COLLECTION" />
          <Kpi label="Legal Cost Recovery" value={money(k?.legalCostsIncurred ?? 0)} href="/legal/reports/run/FIN_LEGAL_COST_RECOVERY" />
          <Kpi label="Active Consent Orders" value={k?.activeConsentOrders ?? "—"} href="/legal/reports/run/OPS_CONSENT_ORDER_REGISTER" />
        </div>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Download className="h-4 w-4" />Recent Exports</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            {recentExports.data?.length ? recentExports.data.map((e: any) => (
              <Link key={e.id} to={`/legal/reports?tab=exports`} className="flex justify-between hover:bg-muted/40 rounded p-1">
                <span>{e.report_name}</span>
                <span className="text-muted-foreground">{new Date(e.exported_at).toLocaleDateString()}</span>
              </Link>
            )) : <div className="text-muted-foreground">No exports in the last 30 days.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" />Scheduled Reports</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            {schedules.data?.length ? schedules.data.map((s: any) => (
              <Link key={s.id} to="/legal/reports?tab=scheduled" className="flex justify-between hover:bg-muted/40 rounded p-1">
                <span>{s.schedule_name} <span className="text-muted-foreground">({s.frequency})</span></span>
                <span className="text-muted-foreground">{s.next_run_at ? new Date(s.next_run_at).toLocaleString() : "—"}</span>
              </Link>
            )) : <div className="text-muted-foreground">No active schedules.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" />Quick Actions</CardTitle></CardHeader>
          <CardContent className="text-xs grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" asChild><Link to="/legal/reports"><FileText className="h-3 w-3 mr-1" />Catalogue</Link></Button>
            <Button variant="outline" size="sm" asChild><Link to="/legal/reports?tab=saved"><FileText className="h-3 w-3 mr-1" />Saved</Link></Button>
            <Button variant="outline" size="sm" asChild><Link to="/legal/reports?tab=scheduled"><Clock className="h-3 w-3 mr-1" />Scheduled</Link></Button>
            <Button variant="outline" size="sm" asChild><Link to="/legal/reports/exports"><Download className="h-3 w-3 mr-1" />Exports</Link></Button>
            <Button variant="outline" size="sm" asChild><Link to="/legal/reports/data-quality"><ShieldAlert className="h-3 w-3 mr-1" />Data Quality</Link></Button>
            <Button variant="outline" size="sm" asChild><Link to="/legal/reports/shared"><ExternalLink className="h-3 w-3 mr-1" />Shared</Link></Button>
          </CardContent>
        </Card>
      </div>

      <Section title="Recent Activity" icon={Bell}>
        <Card>
          <CardContent className="pt-4 space-y-2 text-xs">
            {activity.data?.length ? activity.data.map((a: any) => (
              <button key={a.id} className="w-full text-left flex justify-between hover:bg-muted/40 rounded p-1" onClick={() => nav(`/legal/lg/cases/${a.lg_case_id}`)}>
                <span>{a.activity_type} — {a.description}</span>
                <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
              </button>
            )) : <div className="text-muted-foreground">No recent activity.</div>}
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
