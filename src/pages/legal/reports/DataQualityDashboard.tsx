/**
 * EPIC-09C Part 10 — Data Quality Dashboard
 * Runs 12 live integrity checks; each row drills to affected records.
 */
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { DATA_QUALITY_CHECKS, runAllDataQualityChecks } from "@/services/legal/lgDataQualityService";

const TONE: Record<string, string> = { critical: "border-destructive/50", warning: "border-amber-500/40", info: "border-border" };

export default function DataQualityDashboard() {
  const nav = useNavigate();
  const q = useQuery({ queryKey: ["legal-dq"], queryFn: runAllDataQualityChecks, staleTime: 30_000 });
  const total = (q.data ?? []).reduce((s, r) => s + r.count, 0);
  const clean = q.data ? q.data.filter((r) => r.count === 0).length : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Data Quality"
        subtitle="Twelve live integrity checks across cases, hearings, orders, recovery, documents and financial reconciliation."
        breadcrumbs={[{ label: "Legal Management", href: "/legal/dashboard" }, { label: "Reports", href: "/legal/reports" }, { label: "Data Quality" }]}
        actions={<Button variant="outline" size="sm" onClick={() => q.refetch()}>Re-run all checks</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Issues</div><div className="text-2xl font-semibold mt-1">{q.isLoading ? "…" : total}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Checks Clean</div><div className="text-2xl font-semibold mt-1">{q.isLoading ? "…" : `${clean} / ${DATA_QUALITY_CHECKS.length}`}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Critical</div><div className="text-2xl font-semibold mt-1">{q.data ? DATA_QUALITY_CHECKS.filter((c, i) => c.severity === "critical" && (q.data?.[i]?.count ?? 0) > 0).length : "…"}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Warnings</div><div className="text-2xl font-semibold mt-1">{q.data ? DATA_QUALITY_CHECKS.filter((c, i) => c.severity === "warning" && (q.data?.[i]?.count ?? 0) > 0).length : "…"}</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DATA_QUALITY_CHECKS.map((check, idx) => {
          const result = q.data?.[idx];
          const isClean = result && result.count === 0;
          return (
            <Card key={check.code} className={TONE[check.severity]}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {isClean ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : check.severity === "critical" ? <ShieldAlert className="h-4 w-4 text-destructive" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                    {check.title}
                  </CardTitle>
                  <Badge variant={isClean ? "secondary" : "destructive"}>{q.isLoading ? "…" : result?.count ?? 0}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{check.description}</p>
              </CardHeader>
              <CardContent className="text-xs space-y-1">
                {q.isLoading ? <Skeleton className="h-16" /> : result && result.count > 0 ? (
                  <>
                    {result.sampleRows.slice(0, 5).map((row: any, i: number) => (
                      <button key={i} className="w-full text-left flex justify-between hover:bg-muted/40 rounded p-1" onClick={() => { if (check.drilldownRoute.includes(":id") && row.id) nav(check.drilldownRoute.replace(":id", row.id)); else nav(check.drilldownRoute); }}>
                        <span className="truncate">{row.lg_case_no ?? row.code ?? row.appeal_no ?? row.filing_no ?? row.id}</span>
                        <span className="text-muted-foreground truncate">{row.matter_title ?? row.title ?? row.status ?? ""}</span>
                      </button>
                    ))}
                    {result.count > 5 && (
                      <Button variant="link" size="sm" className="px-0" onClick={() => nav(check.drilldownRoute.replace(":id", result.sampleRows[0]?.id ?? ""))}>View all {result.count} →</Button>
                    )}
                  </>
                ) : <div className="text-muted-foreground">Clean.</div>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
