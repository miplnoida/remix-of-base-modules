import { Link } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3, Users, MapPin, Clock, CalendarClock, AlertOctagon,
  TrendingUp, Gavel, GitBranch, CheckCircle2, ListTodo, ArrowRight,
} from "lucide-react";

const REPORTS = [
  { to: "/legal/reports/lg/cases-by-stage", title: "Cases by Stage", desc: "Distribution across workflow stages", icon: BarChart3 },
  { to: "/legal/reports/lg/cases-by-officer", title: "Cases by Officer", desc: "Caseload per assigned officer", icon: Users },
  { to: "/legal/reports/lg/cases-by-territory", title: "Cases by Territory", desc: "Volume and value by country/territory", icon: MapPin },
  { to: "/legal/reports/lg/ageing", title: "Ageing Report", desc: "Open cases by age bucket", icon: Clock },
  { to: "/legal/reports/lg/overdue-hearings", title: "Overdue Hearings", desc: "Hearings past scheduled date", icon: CalendarClock },
  { to: "/legal/reports/lg/sla-breach", title: "SLA Breach", desc: "Overdue / at-risk / escalated tasks", icon: AlertOctagon },
  { to: "/legal/reports/lg/recovery", title: "Recovery Report", desc: "Recovery %, outstanding, recovered", icon: TrendingUp },
  { to: "/legal/reports/lg/judgment-order", title: "Judgment / Order", desc: "Court orders and judgments issued", icon: Gavel },
  { to: "/legal/reports/lg/referral-source", title: "Referral Source", desc: "Intake volume and outcome by source", icon: GitBranch },
  { to: "/legal/reports/lg/closed-cases", title: "Closed Cases", desc: "Closures with duration & reason", icon: CheckCircle2 },
  { to: "/legal/reports/lg/pending-action", title: "Pending Actions", desc: "Cases awaiting next action", icon: ListTodo },
];

export default function LgReportsHub() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Legal Reports"
        subtitle="Operational and management reports for the Legal module"
        breadcrumbs={[
          { label: "Legal Management", href: "/legal/dashboard" },
          { label: "Reports" },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map((r) => (
          <Link key={r.to} to={r.to}>
            <Card className="hover:shadow-md hover:border-primary/40 transition h-full">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2"><r.icon className="h-5 w-5 text-primary" /></div>
                    <CardTitle className="text-base">{r.title}</CardTitle>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardDescription className="pt-1">{r.desc}</CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Filters · Export · Print · Drilldown
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
