/**
 * EPIC-09C Part 11 — Report Performance Monitoring
 */
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { loadPerformanceSummary } from "@/services/legal/lgReportGovernanceService";
import { getReport } from "@/config/legalReportDefinitions";

export default function PerformanceMonitoring() {
  const { data, isLoading } = useQuery({ queryKey: ["legal-report-perf"], queryFn: () => loadPerformanceSummary(30) });
  const totalRuns = (data ?? []).reduce((s, r) => s + r.runs, 0);
  const cacheHits = (data ?? []).reduce((s, r) => s + r.cache_hits, 0);
  const cacheRatio = totalRuns ? Math.round((cacheHits / totalRuns) * 100) : 0;
  const largest = [...(data ?? [])].sort((a, b) => b.total_rows - a.total_rows).slice(0, 5);
  const slowest = [...(data ?? [])].slice(0, 10); // already sorted by avg desc

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Report Performance"
        subtitle="Execution timing, cache hit ratio and dataset volume across all Legal reports."
        breadcrumbs={[{ label: "Legal Management", href: "/legal/dashboard" }, { label: "Reports", href: "/legal/reports" }, { label: "Performance" }]}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Runs (30d)</div><div className="text-2xl font-semibold">{totalRuns.toLocaleString()}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Cache Hit Ratio</div><div className="text-2xl font-semibold">{cacheRatio}%</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Unique Reports</div><div className="text-2xl font-semibold">{(data ?? []).length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Slowest (ms)</div><div className="text-2xl font-semibold">{slowest[0]?.avg_ms ?? 0}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Slowest Reports (avg ms)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Report</TableHead><TableHead className="text-right">Runs</TableHead>
              <TableHead className="text-right">Avg (ms)</TableHead><TableHead className="text-right">Max (ms)</TableHead>
              <TableHead className="text-right">Cache Hits</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">Loading…</TableCell></TableRow>
                : slowest.length ? slowest.map((r) => (
                  <TableRow key={r.report_code}>
                    <TableCell className="text-xs">{getReport(r.report_code)?.name ?? r.report_code}</TableCell>
                    <TableCell className="text-right text-xs">{r.runs}</TableCell>
                    <TableCell className="text-right text-xs font-mono">{r.avg_ms}</TableCell>
                    <TableCell className="text-right text-xs font-mono">{r.max_ms}</TableCell>
                    <TableCell className="text-right text-xs">{r.cache_hits}</TableCell>
                  </TableRow>
                )) : <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">No performance metrics captured yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Largest Datasets (rows exported)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Report</TableHead><TableHead className="text-right">Total Rows</TableHead></TableRow></TableHeader>
            <TableBody>
              {largest.length ? largest.map((r) => (
                <TableRow key={r.report_code}>
                  <TableCell className="text-xs">{getReport(r.report_code)?.name ?? r.report_code}</TableCell>
                  <TableCell className="text-right text-xs">{r.total_rows.toLocaleString()}</TableCell>
                </TableRow>
              )) : <TableRow><TableCell colSpan={2} className="text-center text-xs text-muted-foreground py-6">—</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
