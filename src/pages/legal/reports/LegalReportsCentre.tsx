/**
 * EPIC-09A / 09B — Legal Reports & Analytics Centre
 *
 * Route: /legal/reports
 * Tabs: Catalogue | Executive | Analytics | Saved | Scheduled | Recipient Groups | Audit
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BarChart3, Briefcase, Building2, ClipboardList, DollarSign, Gavel, Layers,
  ScrollText, Users, Bookmark, Clock3, ShieldCheck, Star, Pin, History as HistoryIcon,
  MailIcon, LayoutDashboard, Settings2, Search, ShieldAlert, Download, Activity, Share2, BadgeCheck,
} from "lucide-react";
import {
  LEGAL_REPORTS, LEGAL_REPORT_CATEGORIES,
  type LegalReportCategory, getReportsByCategory,
} from "@/config/legalReportDefinitions";
import { getFavourites, getPinned, getHistory, clearHistory } from "@/services/legal/lgReportPersonalization";
import {
  SavedReportsPanel, ScheduledReportsPanel, ExportAuditPanel, RecipientGroupsPanel,
} from "./LegalReportsManagers";

const CATEGORY_ICON: Record<LegalReportCategory, React.ComponentType<any>> = {
  executive: BarChart3, operational: ClipboardList, financial: DollarSign,
  compliance_referral: Building2, judicial: Gavel, recovery: Briefcase,
  workload: Users, external_counsel: ScrollText,
};

const CERT_TONE: Record<string, "default" | "secondary" | "destructive"> = {
  certified: "default", draft: "secondary", deprecated: "destructive",
};

function ReportCard({ r, favSet, historySet }: {
  r: typeof LEGAL_REPORTS[number]; favSet: Set<string>; historySet: Set<string>;
}) {
  const href = r.code === "EXEC_DASHBOARD" ? "/legal/reports/executive" : `/legal/reports/run/${r.code}`;
  const cert = r.certification ?? "draft";
  return (
    <Link to={href}>
      <Card className="h-full transition hover:shadow-md hover:border-primary/40">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-sm">{r.name}</CardTitle>
            <div className="flex gap-1">
              {favSet.has(r.code) && <Star className="h-3 w-3 text-amber-500" />}
              {historySet.has(r.code) && <HistoryIcon className="h-3 w-3 text-muted-foreground" />}
              {r.isRecommended && <BadgeCheck className="h-3 w-3 text-primary" />}
              <Badge variant={CERT_TONE[cert]} className="text-[10px]">{cert}</Badge>
            </div>
          </div>
          <CardDescription className="text-xs">{r.purpose}</CardDescription>
        </CardHeader>
        <CardContent className="text-[11px] text-muted-foreground space-y-1">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {r.owner && <span><span className="font-medium text-foreground">Owner:</span> {r.owner}</span>}
            {r.frequency && <span><span className="font-medium text-foreground">Freq:</span> {r.frequency}</span>}
            {r.financialReconciled && <Badge variant="outline" className="text-[10px]">v_lg_case_financials</Badge>}
          </div>
          <div><span className="font-medium text-foreground">Source:</span> {r.dataSource.slice(0, 3).join(", ")}{r.dataSource.length > 3 ? "…" : ""}</div>
          <div className="font-mono text-[10px]">{r.code}</div>
        </CardContent>
      </Card>
    </Link>
  );
}

function CategorySection({ category, favSet, historySet, filter }: {
  category: LegalReportCategory; favSet: Set<string>; historySet: Set<string>; filter?: (r: any) => boolean;
}) {
  const meta = LEGAL_REPORT_CATEGORIES[category];
  const reports = getReportsByCategory(category).filter((r) => !filter || filter(r));
  const Icon = CATEGORY_ICON[category];
  if (!reports.length) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-primary/10 p-2"><Icon className="h-4 w-4 text-primary" /></div>
        <div>
          <h3 className="text-base font-semibold">{meta.label} <span className="text-xs text-muted-foreground font-normal">({reports.length})</span></h3>
          <p className="text-xs text-muted-foreground">{meta.description}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {reports.map((r) => <ReportCard key={r.code} r={r} favSet={favSet} historySet={historySet} />)}
      </div>
    </div>
  );
}

function PersonalizedSection() {
  const [fav, setFav] = useState<string[]>([]);
  const [pin, setPin] = useState<string[]>([]);
  const [hist, setHist] = useState<Array<{ code: string; name: string; at: string }>>([]);
  useEffect(() => { setFav(getFavourites()); setPin(getPinned()); setHist(getHistory()); }, []);
  const resolve = (code: string) => LEGAL_REPORTS.find((r) => r.code === code);
  const chip = (code: string) => {
    const r = resolve(code); if (!r) return null;
    return <Link key={code} to={r.code === "EXEC_DASHBOARD" ? "/legal/reports/executive" : `/legal/reports/run/${code}`}
      className="inline-block border rounded px-2 py-1 text-xs hover:bg-muted/50 mr-2 mb-2">{r.name}</Link>;
  };
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Pin className="h-4 w-4" />Pinned</CardTitle></CardHeader>
        <CardContent>{pin.length ? pin.map(chip) : <p className="text-xs text-muted-foreground">Pin a report from its header to add it here.</p>}</CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Star className="h-4 w-4" />Favourites</CardTitle></CardHeader>
        <CardContent>{fav.length ? fav.map(chip) : <p className="text-xs text-muted-foreground">Mark reports as favourites to jump back quickly.</p>}</CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm flex items-center gap-2"><HistoryIcon className="h-4 w-4" />Recently used</CardTitle>
          {hist.length > 0 && <Button size="sm" variant="ghost" onClick={() => { clearHistory(); setHist([]); }}>Clear</Button>}
        </CardHeader>
        <CardContent>{hist.length ? hist.slice(0, 12).map((h) => chip(h.code)) : <p className="text-xs text-muted-foreground">Reports you open will appear here.</p>}</CardContent>
      </Card>
    </div>
  );
}

export default function LegalReportsCentre() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "catalog";
  const qParam = params.get("q") ?? "";
  const catParam = params.get("cat") ?? "";
  const [q, setQ] = useState(qParam);
  const setTab = (v: string) => { params.set("tab", v); setParams(params); };
  const categories = Object.keys(LEGAL_REPORT_CATEGORIES) as LegalReportCategory[];

  const [fav, setFav] = useState<string[]>([]);
  const [hist, setHist] = useState<Array<{ code: string; name: string }>>([]);
  useEffect(() => { setFav(getFavourites()); setHist(getHistory()); }, []);
  const favSet = useMemo(() => new Set(fav), [fav]);
  const historySet = useMemo(() => new Set(hist.map((h) => h.code)), [hist]);

  const searchFilter = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (r: typeof LEGAL_REPORTS[number]) => {
      if (catParam && r.category !== catParam) return false;
      if (!term) return true;
      return [r.code, r.name, r.purpose, r.owner ?? "", (r.tags ?? []).join(" "), (r.keywords ?? []).join(" "), (r.dataSource ?? []).join(" ")]
        .join(" ").toLowerCase().includes(term);
    };
  }, [q, catParam]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Legal Reports & Analytics"
        subtitle="Enterprise BI over live Legal V1 data — financials reconcile with v_lg_case_financials"
        breadcrumbs={[
          { label: "Legal Management", href: "/legal/dashboard" },
          { label: "Reports & Analytics" },
        ]}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" asChild><Link to="/legal/reports/command-centre"><LayoutDashboard className="h-4 w-4 mr-1" />Command Centre</Link></Button>
            <Button variant="outline" size="sm" asChild><Link to="/legal/reports/executive"><BarChart3 className="h-4 w-4 mr-1" />Executive</Link></Button>
            <Button variant="outline" size="sm" asChild><Link to="/legal/reports/personalize"><Settings2 className="h-4 w-4 mr-1" />Personalize</Link></Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-64 max-w-lg">
          <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search reports by name, keyword, owner, module…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
        </div>
        {catParam && (
          <Badge variant="secondary" className="gap-1">Category: {catParam}
            <button aria-label="Clear category" onClick={() => { params.delete("cat"); setParams(params); }}>×</button>
          </Badge>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="catalog"><Layers className="h-4 w-4 mr-1" />Catalogue</TabsTrigger>
          <TabsTrigger value="personal"><Star className="h-4 w-4 mr-1" />My Reports</TabsTrigger>
          <TabsTrigger value="executive"><BarChart3 className="h-4 w-4 mr-1" />Executive</TabsTrigger>
          <TabsTrigger value="analytics"><LayoutDashboard className="h-4 w-4 mr-1" />Analytics</TabsTrigger>
          <TabsTrigger value="saved"><Bookmark className="h-4 w-4 mr-1" />Saved</TabsTrigger>
          <TabsTrigger value="scheduled"><Clock3 className="h-4 w-4 mr-1" />Scheduled</TabsTrigger>
          <TabsTrigger value="groups"><MailIcon className="h-4 w-4 mr-1" />Recipients</TabsTrigger>
          <TabsTrigger value="exports"><Download className="h-4 w-4 mr-1" />Exports</TabsTrigger>
          <TabsTrigger value="quality"><ShieldAlert className="h-4 w-4 mr-1" />Data Quality</TabsTrigger>
          <TabsTrigger value="performance"><Activity className="h-4 w-4 mr-1" />Performance</TabsTrigger>
          <TabsTrigger value="shared"><Share2 className="h-4 w-4 mr-1" />Shared</TabsTrigger>
          <TabsTrigger value="certification"><BadgeCheck className="h-4 w-4 mr-1" />Certification</TabsTrigger>
          <TabsTrigger value="audit"><ShieldCheck className="h-4 w-4 mr-1" />Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-8">
          {categories.map((c) => <CategorySection key={c} category={c} favSet={favSet} historySet={historySet} filter={searchFilter} />)}
        </TabsContent>

        <TabsContent value="personal"><PersonalizedSection /></TabsContent>

        <TabsContent value="executive">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Executive Analytics</CardTitle>
              <CardDescription>Board-level KPIs across matters, financials, judicial and recovery — with Month / Quarter / Year charts and full drilldowns.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild><Link to="/legal/reports/executive">Open Executive Dashboard →</Link></Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { key: "operational", label: "Operational", desc: "Officer performance, hearings, orders, outcomes", icon: ClipboardList },
            { key: "financial",   label: "Financial",   desc: "Recoverable, paid, outstanding, forecasts",     icon: DollarSign },
            { key: "compliance",  label: "Compliance",  desc: "Referral ageing, conversion, reconciliation",   icon: Building2 },
            { key: "post-judgment", label: "Post-Judgment", desc: "Appeals, consent, enforcement performance", icon: Gavel },
            { key: "counsel",     label: "External Counsel", desc: "Engagements, fees, cost-vs-recovery",      icon: ScrollText },
          ].map((c) => {
            const Icon = c.icon;
            return (
              <Link key={c.key} to={`/legal/reports/analytics/${c.key}`}>
                <Card className="hover:shadow-md hover:border-primary/40 transition h-full">
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Icon className="h-4 w-4" />{c.label} Analytics</CardTitle></CardHeader>
                  <CardContent className="text-xs text-muted-foreground">{c.desc}</CardContent>
                </Card>
              </Link>
            );
          })}
        </TabsContent>

        <TabsContent value="saved"><SavedReportsPanel /></TabsContent>
        <TabsContent value="scheduled"><ScheduledReportsPanel /></TabsContent>
        <TabsContent value="groups"><RecipientGroupsPanel /></TabsContent>
        <TabsContent value="exports">
          <Card><CardContent className="pt-6 text-sm space-y-2">
            <div>Full Export Centre with retry & re-download:</div>
            <Button asChild size="sm"><Link to="/legal/reports/exports">Open Export Centre →</Link></Button>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="quality">
          <Card><CardContent className="pt-6 text-sm space-y-2">
            <div>Twelve live data-quality checks:</div>
            <Button asChild size="sm"><Link to="/legal/reports/data-quality">Open Data Quality →</Link></Button>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="performance">
          <Card><CardContent className="pt-6 text-sm space-y-2">
            <div>Report execution timing & cache stats:</div>
            <Button asChild size="sm"><Link to="/legal/reports/performance">Open Performance →</Link></Button>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="shared">
          <Card><CardContent className="pt-6 text-sm space-y-2">
            <div>Team / department / organization dashboards:</div>
            <Button asChild size="sm"><Link to="/legal/reports/shared">Open Shared Dashboards →</Link></Button>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="certification">
          <Card><CardContent className="pt-6 text-sm space-y-2">
            <div>Certified / draft / deprecated status per report:</div>
            <Button asChild size="sm"><Link to="/legal/reports/certification">Open Certification →</Link></Button>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="audit">
          <ExportAuditPanel />
          <div className="mt-4"><Button asChild size="sm" variant="outline"><Link to="/legal/reports/audit">Open enterprise audit →</Link></Button></div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
