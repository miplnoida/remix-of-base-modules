import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { loadLegalRecoveryDashboard, type RecoveryKpi } from "@/services/legal/postJudgment/legalRecoveryDashboardService";
import { formatCurrency } from "@/utils/formatCurrency";
import { useLgAccess } from "@/hooks/legal/useLgAccess";

const toneClass = (tone?: RecoveryKpi["tone"]) => {
  switch (tone) {
    case "destructive": return "border-destructive/50 bg-destructive/5";
    case "warning":     return "border-yellow-500/40 bg-yellow-500/5";
    case "success":     return "border-emerald-500/40 bg-emerald-500/5";
    default:            return "";
  }
};

const formatKpi = (k: RecoveryKpi) => {
  if (k.format === "currency") return formatCurrency(k.value);
  if (k.format === "percent")  return `${k.value}%`;
  return String(k.value);
};

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#f97316"];

export default function LgLegalRecoveryDashboard() {
  const { can } = useLgAccess();
  const { data, isLoading, error } = useQuery({
    queryKey: ["legal", "recovery-dashboard"],
    queryFn: loadLegalRecoveryDashboard,
    staleTime: 30_000,
  });

  if (!can("viewLegalRecoveryDashboard")) {
    return <div className="p-6 text-sm text-destructive">You lack permission to view this dashboard.</div>;
  }
  if (isLoading) {
    return (
      <div className="p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading dashboard…
      </div>
    );
  }
  if (error || !data) {
    return <div className="p-6 text-destructive text-sm">Failed to load dashboard.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Legal Recovery Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Portfolio-wide post-judgment recovery KPIs and trends.
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 xl:grid-cols-5">
        {data.kpis.map((k) => {
          const inner = (
            <Card className={`h-full ${toneClass(k.tone)}`}>
              <CardContent className="p-4">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {k.label}
                </div>
                <div className="text-2xl font-semibold mt-1">{formatKpi(k)}</div>
                {k.tone && k.tone !== "default" && (
                  <Badge variant={k.tone === "destructive" ? "destructive" : "secondary"} className="mt-1 text-[10px]">
                    {k.tone}
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
          return k.linkTo ? (
            <Link key={k.key} to={k.linkTo} className="block">{inner}</Link>
          ) : (
            <div key={k.key}>{inner}</div>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Judgment Compliance by Status</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <BarChart data={data.breakdowns.complianceByStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Consent Orders by Status</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data.breakdowns.consentByStatus}
                  dataKey="count"
                  nameKey="status"
                  outerRadius={80}
                  label
                >
                  {data.breakdowns.consentByStatus.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Court Filings by Status</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <BarChart data={data.breakdowns.filingsByStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Legal Costs — Incurred vs Recovered</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <BarChart data={data.breakdowns.costsByType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="incurred" fill="#ef4444" name="Incurred" />
                <Bar dataKey="recovered" fill="#10b981" name="Recovered" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Portfolio Totals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <TotalCell label="Ordered" value={data.totals.total_ordered} />
            <TotalCell label="Paid" value={data.totals.total_paid} />
            <TotalCell label="Outstanding" value={data.totals.total_outstanding} />
            <TotalCell label="Counsel Estimate" value={data.totals.total_counsel_estimate} />
            <TotalCell label="Counsel Incurred" value={data.totals.total_counsel_incurred} />
            <TotalCell label="Costs Incurred" value={data.totals.total_costs_incurred} />
            <TotalCell label="Costs Recovered" value={data.totals.total_costs_recovered} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TotalCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{formatCurrency(value)}</div>
    </div>
  );
}
