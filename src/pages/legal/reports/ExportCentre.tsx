/**
 * EPIC-09C Part 6 — Export Centre
 * Tracks every report export from lg_report_export_audit.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, Search } from "lucide-react";
import { listExports } from "@/services/legal/lgReportGovernanceService";
import { getReport } from "@/config/legalReportDefinitions";
import { useNavigate } from "react-router-dom";

export default function ExportCentre() {
  const [q, setQ] = useState("");
  const [days, setDays] = useState(30);
  const nav = useNavigate();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["export-centre", days], queryFn: () => listExports({ limit: 500, days }),
  });
  const filtered = useMemo(() => (data ?? []).filter((r: any) => !q || `${r.report_code} ${r.report_name} ${r.file_name}`.toLowerCase().includes(q.toLowerCase())), [data, q]);
  const totalRows = filtered.reduce((s: number, r: any) => s + Number(r.row_count ?? 0), 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Export Centre"
        subtitle="Every legal report export is tracked here — download again, retry failed jobs, view full audit history."
        breadcrumbs={[{ label: "Legal Management", href: "/legal/dashboard" }, { label: "Reports", href: "/legal/reports" }, { label: "Export Centre" }]}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Exports</div><div className="text-2xl font-semibold">{filtered.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Rows</div><div className="text-2xl font-semibold">{totalRows.toLocaleString()}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Unique Reports</div><div className="text-2xl font-semibold">{new Set(filtered.map((r: any) => r.report_code)).size}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Window</div><div className="text-2xl font-semibold">{days}d</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm flex items-center gap-2"><Download className="h-4 w-4" />Export History</CardTitle>
            <div className="flex gap-2 items-center">
              <div className="relative">
                <Search className="h-3 w-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} className="h-8 pl-7 w-56" />
              </div>
              <select className="h-8 border rounded text-xs" value={days} onChange={(e) => setDays(Number(e.target.value))}>
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Refresh</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>When</TableHead><TableHead>Report</TableHead><TableHead>Format</TableHead>
              <TableHead>Channel</TableHead><TableHead className="text-right">Rows</TableHead>
              <TableHead>File</TableHead><TableHead className="w-24"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">Loading…</TableCell></TableRow>
                : filtered.length ? filtered.map((r: any) => {
                  const def = getReport(r.report_code);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{new Date(r.exported_at).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{r.report_name}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{r.format}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{r.delivery_channel}</Badge></TableCell>
                      <TableCell className="text-right text-xs">{Number(r.row_count ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="text-xs font-mono truncate max-w-[200px]">{r.file_name}</TableCell>
                      <TableCell>
                        {def ? <Button size="sm" variant="ghost" onClick={() => nav(`/legal/reports/run/${r.report_code}`)}>Re-run</Button> : null}
                      </TableCell>
                    </TableRow>
                  );
                })
                : <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">No exports match the current filter.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
