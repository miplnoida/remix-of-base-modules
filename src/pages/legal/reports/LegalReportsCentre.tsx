/**
 * EPIC-09A — Legal Reports & Analytics Centre
 *
 * Canonical route: /legal/reports
 * Replaces the previous LgReportsHub (11 explorer reports migrated into the
 * new registry). Cards for planned reports are shown with a "coming soon"
 * badge until Phase 2 wires each detail page.
 */

import { Link } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BarChart3, Briefcase, Building2, Calendar, ClipboardList, DollarSign,
  Gavel, Layers, ScrollText, Users, Bookmark, Clock3, ShieldCheck,
} from "lucide-react";
import {
  LEGAL_REPORTS,
  LEGAL_REPORT_CATEGORIES,
  type LegalReportCategory,
  getReportsByCategory,
} from "@/config/legalReportDefinitions";

const CATEGORY_ICON: Record<LegalReportCategory, React.ComponentType<any>> = {
  executive: BarChart3,
  operational: ClipboardList,
  financial: DollarSign,
  compliance_referral: Building2,
  judicial: Gavel,
  recovery: Briefcase,
  workload: Users,
  external_counsel: ScrollText,
};

function ReportCard({ code, name, purpose, dataSource, status, route }: {
  code: string; name: string; purpose: string; dataSource: string[];
  status?: "live" | "planned"; route: string;
}) {
  const live = status === "live";
  const href = code === "EXEC_DASHBOARD" ? "/legal/reports/executive" : `/legal/reports/run/${code}`;

  return (
    <Link to={live ? href : "#"} className={live ? "" : "pointer-events-none"}>
      <Card className={`h-full transition ${live ? "hover:shadow-md hover:border-primary/40" : "opacity-70"}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-sm">{name}</CardTitle>
            {live ? (
              <Badge variant="default" className="text-[10px]">Live</Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">Planned</Badge>
            )}
          </div>
          <CardDescription className="text-xs">{purpose}</CardDescription>
        </CardHeader>
        <CardContent className="text-[11px] text-muted-foreground space-y-1">
          <div><span className="font-medium text-foreground">Source:</span> {dataSource.slice(0, 3).join(", ")}{dataSource.length > 3 ? "…" : ""}</div>
          <div className="font-mono text-[10px]">{code}</div>
        </CardContent>
      </Card>
    </Link>
  );
}

function CategorySection({ category }: { category: LegalReportCategory }) {
  const meta = LEGAL_REPORT_CATEGORIES[category];
  const reports = getReportsByCategory(category);
  const Icon = CATEGORY_ICON[category];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-primary/10 p-2"><Icon className="h-4 w-4 text-primary" /></div>
        <div>
          <h3 className="text-base font-semibold">{meta.label}</h3>
          <p className="text-xs text-muted-foreground">{meta.description}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {reports.map((r) => <ReportCard key={r.code} {...r} />)}
      </div>
    </div>
  );
}

export default function LegalReportsCentre() {
  const categories = Object.keys(LEGAL_REPORT_CATEGORIES) as LegalReportCategory[];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Legal Reports & Analytics"
        subtitle="Enterprise BI over live Legal V1 data — financials reconcile with v_lg_case_financials"
        breadcrumbs={[
          { label: "Legal Management", href: "/legal/dashboard" },
          { label: "Reports & Analytics" },
        ]}
      />

      <Tabs defaultValue="catalog" className="space-y-4">
        <TabsList>
          <TabsTrigger value="catalog"><Layers className="h-4 w-4 mr-1" />Catalogue</TabsTrigger>
          <TabsTrigger value="executive"><BarChart3 className="h-4 w-4 mr-1" />Executive</TabsTrigger>
          <TabsTrigger value="saved"><Bookmark className="h-4 w-4 mr-1" />Saved</TabsTrigger>
          <TabsTrigger value="scheduled"><Clock3 className="h-4 w-4 mr-1" />Scheduled</TabsTrigger>
          <TabsTrigger value="audit"><ShieldCheck className="h-4 w-4 mr-1" />Export Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-8">
          {categories.map((c) => <CategorySection key={c} category={c} />)}
        </TabsContent>

        <TabsContent value="executive">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Executive Analytics</CardTitle>
              <CardDescription>Board-level KPIs across matters, financials, judicial and recovery. Detail view ships in Phase 2.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/legal/reports/executive" className="text-primary hover:underline text-sm">Open Executive Dashboard →</Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="saved">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bookmark className="h-5 w-5" />Saved Reports</CardTitle>
              <CardDescription>Personal and shared saved report configurations. Detail view ships in Phase 2.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Save a report by opening any live report and clicking <strong>Save</strong>.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5" />Scheduled Reports</CardTitle>
              <CardDescription>Automated email delivery via Lovable Emails. Detail view ships in Phase 2.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Frequencies supported: Daily, Weekly, Monthly, Quarterly. Formats: Excel, CSV, PDF.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Export Audit</CardTitle>
              <CardDescription>Every report export is audited to lg_report_export_audit. Detail view ships in Phase 2.</CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
