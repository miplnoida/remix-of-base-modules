/**
 * EPIC-09B — Analytics dashboards (Parts 3-7)
 *
 * Route: /legal/reports/analytics/:kind
 * Kinds: operational | financial | compliance | post-judgment | counsel
 *
 * Each dashboard renders KPI tiles + charts sourced from lgReportingService
 * and lgReportFetchers. Every tile drills into the canonical Legal V1 route.
 */
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatCurrency";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  fetchRecoveryByOfficer, fetchOfficerWorkload, fetchClosurePerformance,
  fetchOverdueWork, fetchHearingOutcomes, fetchOrderCompliance,
  fetchAppealOutcomes, fetchEnforcementOutcomes,
  fetchOutstandingByFund, fetchOutstandingByLiabilityType, fetchOutstandingByEmployer,
  fetchOutstandingByPeriod, fetchRecoveryCollection, fetchLegalCostRegister,
  fetchWriteOff, fetchSettlement,
  fetchReferralRegister, fetchReferralConversion, fetchReferralItemsByFund,
  fetchReferralVsLiability, fetchReferralItems, fetchMultiComponentReferral,
  fetchAppealsRegister, fetchConsentCollection, fetchConsentBreach,
  fetchEnforcementRegister,
  fetchExternalCounselRegister, fetchCounselFees, fetchCounselMatters,
  fetchCounselAvgDuration, fetchCounselCostRecovery,
} from "@/services/legal/lgReportFetchers";
import {
  trendRecoveryCollection, trendOutstanding, trendReferralConversion, trendEnforcement,
} from "@/services/legal/lgReportingService";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "#10b981", "#f59e0b", "#ef4444", "#6366f1"];

type Loader = (...args: any[]) => Promise<any[] | any>;
interface DashSpec {
  title: string;
  subtitle: string;
  tiles: Array<{ key: string; label: string; loader: Loader; agg?: (rows: any[]) => number | string; format?: "currency" | "number" | "text"; drill?: string }>;
  charts: Array<{ title: string; subtitle?: string; loader: Loader; kind: "bar" | "line" | "pie"; xKey: string; yKeys: string[]; formatY?: boolean }>;
}


const SPECS: Record<string, DashSpec> = {
  operational: {
    title: "Operational Analytics",
    subtitle: "Officer performance, hearings, orders, consent, appeals & enforcement outcomes",
    tiles: [
      { key: "officers", label: "Officers with open matters", loader: fetchOfficerWorkload, agg: (r) => r.length, drill: "/legal/reports/run/WL_OFFICER_WORKLOAD" },
      { key: "avgRes", label: "Avg resolution (days, top officer)", loader: fetchClosurePerformance, agg: (r) => r[0]?.avg_days ?? 0, drill: "/legal/reports/run/WL_CLOSURE_PERFORMANCE" },
      { key: "overdue", label: "Overdue work items", loader: fetchOverdueWork, agg: (r) => r.length, drill: "/legal/reports/run/WL_OVERDUE_WORK" },
    ],
    charts: [
      { title: "Officer Workload", loader: fetchOfficerWorkload, kind: "bar", xKey: "officer", yKeys: ["open_matters","open_tasks"] },
      { title: "Hearing Outcomes", loader: fetchHearingOutcomes, kind: "pie", xKey: "outcome", yKeys: ["count"] },
      { title: "Orders by Compliance", loader: fetchOrderCompliance, kind: "bar", xKey: "compliance_status", yKeys: ["count"] },
      { title: "Appeal Outcomes", loader: fetchAppealOutcomes, kind: "pie", xKey: "outcome", yKeys: ["count"] },
      { title: "Enforcement Outcomes", loader: fetchEnforcementOutcomes, kind: "bar", xKey: "outcome", yKeys: ["targeted","recovered"], formatY: true },
      { title: "Officer Recovery Performance", loader: fetchRecoveryByOfficer, kind: "bar", xKey: "officer", yKeys: ["recovered","outstanding"], formatY: true },
    ],
  },
  financial: {
    title: "Financial Analytics",
    subtitle: "Recoverable, paid, outstanding — all reconciled to v_lg_case_financials & lg_recoverable_liability",
    tiles: [
      { key: "outByFund", label: "Fund groups", loader: fetchOutstandingByFund, agg: (r) => r.length, drill: "/legal/reports/run/FIN_OUTSTANDING_BY_FUND" },
      { key: "outByLiab", label: "Liability types", loader: fetchOutstandingByLiabilityType, agg: (r) => r.length, drill: "/legal/reports/run/FIN_OUTSTANDING_BY_LIABILITY_TYPE" },
      { key: "outstandingSum", label: "Total outstanding", loader: fetchOutstandingByFund, agg: (r) => r.reduce((s, x) => s + x.outstanding, 0), format: "currency", drill: "/legal/reports/run/FIN_OUTSTANDING_BY_EMPLOYER" },
      { key: "legalCost", label: "Legal cost items", loader: fetchLegalCostRegister, agg: (r) => r.length, drill: "/legal/reports/run/FIN_LEGAL_COST_REGISTER" },
    ],
    charts: [
      { title: "Recoverable by Fund", loader: fetchOutstandingByFund, kind: "bar", xKey: "fund_code", yKeys: ["assessed","paid","outstanding"], formatY: true },
      { title: "Recoverable by Liability Type", loader: fetchOutstandingByLiabilityType, kind: "bar", xKey: "liability_type", yKeys: ["outstanding"], formatY: true },
      { title: "Recoverable by Employer (top)", loader: async () => (await fetchOutstandingByEmployer({})).slice(0, 12), kind: "bar", xKey: "employer_name", yKeys: ["total_outstanding"], formatY: true },
      { title: "Recoverable by Period", loader: fetchOutstandingByPeriod, kind: "bar", xKey: "contribution_period", yKeys: ["outstanding"], formatY: true },
      { title: "Recovery Collection (per matter)", loader: async () => (await fetchRecoveryCollection({})).slice(0, 15), kind: "bar", xKey: "lg_case_no", yKeys: ["total_paid","total_outstanding"], formatY: true },
      { title: "Settlements", loader: fetchSettlement, kind: "bar", xKey: "settlement_no", yKeys: ["settlement_amount"], formatY: true },
      { title: "Write-offs / Adjustments", loader: fetchWriteOff, kind: "bar", xKey: "liability_type", yKeys: ["write_off_amount"], formatY: true },
    ],
  },
  compliance: {
    title: "Compliance Referral Analytics",
    subtitle: "Referral ageing, conversion, acceptance, rejection, component analysis & reconciliation",
    tiles: [
      { key: "total", label: "Total referrals", loader: fetchReferralRegister, agg: (r) => r.length, drill: "/legal/reports/run/CR_REFERRAL_REGISTER" },
      { key: "items", label: "Referral items", loader: fetchReferralItems, agg: (r) => r.length, drill: "/legal/reports/run/CR_REFERRAL_ITEMS" },
      { key: "conv", label: "Converted (%)", loader: fetchReferralConversion, agg: (r) => { const c = r.filter((x) => x.converted === "YES").length; return r.length ? `${Math.round((c / r.length) * 1000) / 10}%` : "0%"; }, format: "text", drill: "/legal/reports/run/CR_CONVERSION_RATE" },
      { key: "mismatch", label: "Reconciliation mismatches", loader: fetchReferralVsLiability, agg: (r) => r.filter((x) => x.status === "MISMATCH").length, drill: "/legal/reports/run/CR_REFERRED_VS_LIABILITY" },
    ],
    charts: [
      { title: "Referral Conversion Trend", loader: async () => await trendReferralConversion("month"), kind: "line", xKey: "period", yKeys: ["value","secondary"] },
      { title: "Referral Items by Fund", loader: fetchReferralItemsByFund, kind: "bar", xKey: "fund_code", yKeys: ["amount_referred"], formatY: true },
      { title: "Multi-component Referrals", loader: fetchMultiComponentReferral, kind: "bar", xKey: "referral_id", yKeys: ["component_count","fund_count"] },
      { title: "Referral vs Liability Variance", loader: async () => (await fetchReferralVsLiability({})).slice(0, 15), kind: "bar", xKey: "debtor_name", yKeys: ["referred_amount","liability_created"], formatY: true },
    ],
  },
  "post-judgment": {
    title: "Post-Judgment Analytics",
    subtitle: "Appeals, consent orders & enforcement performance",
    tiles: [
      { key: "appeals", label: "Total appeals", loader: fetchAppealsRegister, agg: (r) => r.length, drill: "/legal/reports/run/OPS_APPEALS_REGISTER" },
      { key: "consent", label: "Consent orders", loader: fetchConsentCollection, agg: (r) => r.length, drill: "/legal/reports/run/OPS_CONSENT_ORDER_REGISTER" },
      { key: "breach", label: "Consent breaches", loader: fetchConsentBreach, agg: (r) => r.length, drill: "/legal/reports/run/REC_CONSENT_BREACH" },
      { key: "enforce", label: "Enforcement actions", loader: fetchEnforcementRegister, agg: (r) => r.length, drill: "/legal/reports/run/OPS_ENFORCEMENT_REGISTER" },
    ],
    charts: [
      { title: "Appeals Outcomes", loader: fetchAppealOutcomes, kind: "pie", xKey: "outcome", yKeys: ["count"] },
      { title: "Consent Collection %", loader: async () => (await fetchConsentCollection({})).slice(0, 15), kind: "bar", xKey: "code", yKeys: ["paid_amount","total_amount"], formatY: true },
      { title: "Enforcement Recovery Trend", loader: async () => await trendEnforcement("month"), kind: "line", xKey: "period", yKeys: ["value","secondary"] },
      { title: "Enforcement Outcomes", loader: fetchEnforcementOutcomes, kind: "bar", xKey: "outcome", yKeys: ["targeted","recovered"], formatY: true },
    ],
  },
  counsel: {
    title: "External Counsel Analytics",
    subtitle: "Engagements, matters, fees, duration & cost-vs-recovery",
    tiles: [
      { key: "eng", label: "Active engagements", loader: fetchExternalCounselRegister, agg: (r) => r.filter((x) => x.status === "ACTIVE").length, drill: "/legal/reports/run/EC_ENGAGEMENT_REGISTER" },
      { key: "matters", label: "Matters covered", loader: fetchCounselMatters, agg: (r) => r.reduce((s, x) => s + x.matter_count, 0), drill: "/legal/reports/run/EC_MATTERS" },
      { key: "fees", label: "Total invoiced fees", loader: fetchCounselFees, agg: (r) => r.reduce((s, x) => s + Number(x.amount ?? 0), 0), format: "currency", drill: "/legal/reports/run/EC_FEES" },
    ],
    charts: [
      { title: "Matters per Counsel", loader: fetchCounselMatters, kind: "bar", xKey: "law_firm_name", yKeys: ["matter_count"] },
      { title: "Average Duration", loader: fetchCounselAvgDuration, kind: "bar", xKey: "law_firm_name", yKeys: ["avg_days"] },
      { title: "Cost vs Recovery", loader: fetchCounselCostRecovery, kind: "bar", xKey: "law_firm_name", yKeys: ["fee_incurred","recovered","net"], formatY: true },
    ],
  },
};

function ChartBlock({ spec }: { spec: DashSpec["charts"][number] }) {
  const { data } = useQuery({ queryKey: ["analytics-chart", spec.title], queryFn: () => spec.loader({}), staleTime: 60_000 });
  const rows = data ?? [];
  const fmt = spec.formatY ? (v: any) => formatCurrency(Number(v)) : undefined;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{spec.title}</CardTitle></CardHeader>
      <CardContent style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          {spec.kind === "line" ? (
            <LineChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey={spec.xKey} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt as any} />
              <Tooltip formatter={fmt as any} /><Legend />
              {spec.yKeys.map((k, i) => <Line key={k} dataKey={k} stroke={COLORS[i % COLORS.length]} />)}
            </LineChart>
          ) : spec.kind === "pie" ? (
            <PieChart>
              <Pie data={rows} dataKey={spec.yKeys[0]} nameKey={spec.xKey} outerRadius={80} label>
                {rows.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          ) : (
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey={spec.xKey} tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt as any} />
              <Tooltip formatter={fmt as any} /><Legend />
              {spec.yKeys.map((k, i) => <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} />)}
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function KpiTile({ spec }: { spec: DashSpec["tiles"][number] }) {
  const nav = useNavigate();
  const { data } = useQuery({ queryKey: ["analytics-tile", spec.key], queryFn: () => spec.loader({}), staleTime: 60_000 });
  const rows = data ?? [];
  const raw = spec.agg ? spec.agg(rows) : rows.length;
  const value = spec.format === "currency" ? formatCurrency(Number(raw)) : String(raw);
  return (
    <Card className="cursor-pointer hover:shadow-md" onClick={() => spec.drill && nav(spec.drill)}>
      <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">{spec.label}</CardTitle></CardHeader>
      <CardContent><div className="text-2xl font-semibold text-primary">{value}</div></CardContent>
    </Card>
  );
}

export default function LegalAnalyticsDashboard() {
  const { kind = "" } = useParams();
  const spec = SPECS[kind];
  if (!spec) return <Navigate to="/legal/reports" replace />;
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title={spec.title} subtitle={spec.subtitle}
        breadcrumbs={[
          { label: "Legal Management", href: "/legal/dashboard" },
          { label: "Reports & Analytics", href: "/legal/reports" },
          { label: spec.title },
        ]}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {spec.tiles.map((t) => <KpiTile key={t.key} spec={t} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {spec.charts.map((c) => <ChartBlock key={c.title} spec={c} />)}
      </div>
    </div>
  );
}
