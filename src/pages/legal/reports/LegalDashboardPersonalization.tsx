/**
 * EPIC-09B — Dashboard personalization
 *
 * Route: /legal/reports/personalize
 * Choose KPI cards, chart layout, default report, default date range, favourites.
 */
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  getDashboardPreference, saveDashboardPreference, resetDashboardPreference,
  DEFAULT_DASHBOARD_PREFERENCE, type DashboardPreference,
} from "@/services/legal/lgReportingService";
import { LEGAL_REPORTS } from "@/config/legalReportDefinitions";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";

const KPI_CATALOG = [
  { key: "total", label: "Total Matters" },
  { key: "open", label: "Open Matters" },
  { key: "closed", label: "Closed Matters" },
  { key: "new", label: "New This Month" },
  { key: "closedMonth", label: "Closed This Month" },
  { key: "hearings", label: "Active Hearings" },
  { key: "orders", label: "Pending Orders" },
  { key: "appeals", label: "Pending Appeals" },
  { key: "enforcement", label: "Active Enforcement" },
  { key: "consent", label: "Active Consent Orders" },
  { key: "counsel", label: "Active External Counsel" },
  { key: "assessed", label: "Total Recoverable" },
  { key: "paid", label: "Total Paid" },
  { key: "outstanding", label: "Outstanding" },
  { key: "recovery", label: "Recovery %" },
  { key: "age", label: "Average Matter Age" },
  { key: "resolution", label: "Average Resolution Time" },
];

export default function LegalDashboardPersonalization() {
  const { user } = useSupabaseAuth();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["lg-dashboard-pref", user?.id],
    queryFn: () => getDashboardPreference(user!.id),
    enabled: !!user,
  });
  const [pref, setPref] = useState<DashboardPreference | null>(null);
  useEffect(() => { if (data) setPref(data); }, [data]);
  if (!pref) return null;

  const patch = (p: Partial<DashboardPreference>) => setPref({ ...pref, ...p });
  const toggleKpi = (k: string) => patch({
    kpi_cards: pref.kpi_cards.includes(k) ? pref.kpi_cards.filter((x) => x !== k) : [...pref.kpi_cards, k],
  });

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-3xl">
      <PageHeader
        title="Personalize Dashboard"
        subtitle="Choose the KPI cards, layout and defaults for your Legal Reports experience."
        breadcrumbs={[
          { label: "Legal Management", href: "/legal/dashboard" },
          { label: "Reports & Analytics", href: "/legal/reports" },
          { label: "Personalize" },
        ]}
      />

      <Card>
        <CardHeader><CardTitle>KPI cards</CardTitle><CardDescription>Choose which cards appear on your executive dashboard.</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {KPI_CATALOG.map((k) => (
            <label key={k.key} className="flex items-center justify-between gap-2 border rounded p-2 text-sm">
              <span>{k.label}</span>
              <Switch checked={pref.kpi_cards.includes(k.key)} onCheckedChange={() => toggleKpi(k.key)} />
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Defaults</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Chart layout</Label>
            <Select value={pref.chart_layout} onValueChange={(v: any) => patch({ chart_layout: v })}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">Grid (2 columns)</SelectItem>
                <SelectItem value="list">List (1 column)</SelectItem>
                <SelectItem value="compact">Compact</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Default report on open</Label>
            <Select value={pref.default_report_code ?? "__none"} onValueChange={(v) => patch({ default_report_code: v === "__none" ? null : v })}>
              <SelectTrigger className="w-96"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="__none">None</SelectItem>
                {LEGAL_REPORTS.map((r) => <SelectItem key={r.code} value={r.code}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Default date range</Label>
            <Select value={pref.default_date_range} onValueChange={(v: any) => patch({ default_date_range: v })}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="last7d">Last 7 days</SelectItem>
                <SelectItem value="last30d">Last 30 days</SelectItem>
                <SelectItem value="last90d">Last 90 days</SelectItem>
                <SelectItem value="thisMonth">This month</SelectItem>
                <SelectItem value="thisQuarter">This quarter</SelectItem>
                <SelectItem value="thisYear">This year</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={async () => {
          await resetDashboardPreference(user!.id);
          qc.invalidateQueries({ queryKey: ["lg-dashboard-pref", user!.id] });
          setPref({ ...DEFAULT_DASHBOARD_PREFERENCE, user_id: user!.id });
          toast.success("Dashboard reset");
        }}>Reset to defaults</Button>
        <Button onClick={async () => {
          await saveDashboardPreference(pref);
          toast.success("Saved");
        }}>Save</Button>
      </div>
    </div>
  );
}
