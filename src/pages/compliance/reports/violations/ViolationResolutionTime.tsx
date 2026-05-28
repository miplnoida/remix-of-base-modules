import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ViolationReportShell from './ViolationReportShell';
import { ViolationReportRow } from '@/services/violationReportsService';

function daysBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const d = (new Date(b).getTime() - new Date(a).getTime()) / 86400000;
  if (!Number.isFinite(d) || d < 0) return null;
  return Math.round(d);
}

function stats(values: number[]) {
  if (values.length === 0) return { avg: 0, median: 0, min: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const avg = Math.round(sorted.reduce((s, v) => s + v, 0) / sorted.length);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
  return { avg, median, min: sorted[0], max: sorted[sorted.length - 1] };
}

function groupBy<T>(items: T[], key: (t: T) => string) {
  const m = new Map<string, T[]>();
  items.forEach(i => {
    const k = key(i);
    const arr = m.get(k) || [];
    arr.push(i);
    m.set(k, arr);
  });
  return m;
}

export default function ViolationResolutionTimeReport() {
  return (
    <ViolationReportShell
      title="Violation Resolution Time"
      subtitle="Average days from discovery to resolution. Unresolved violations are excluded from timing stats and reported separately."
      breadcrumbLabel="Violation Resolution Time"
      filters={['dateRange', 'type', 'fund', 'zone', 'severity']}
      exportFilename="violation_resolution_time"
      exportColumns={[
        { header: 'Violation Type', key: 'type', width: 32 },
        { header: 'Resolved Count', key: 'resolved', width: 16 },
        { header: 'Unresolved Count', key: 'unresolved', width: 18 },
        { header: 'Avg Days', key: 'avg', width: 12 },
        { header: 'Median Days', key: 'median', width: 14 },
        { header: 'Min Days', key: 'min', width: 12 },
        { header: 'Max Days', key: 'max', width: 12 },
      ]}
      renderBody={(rows) => {
        const resolved = rows.filter(r => r.resolved_at);
        const unresolved = rows.filter(r => !r.resolved_at);

        const overall = stats(
          resolved
            .map(r => daysBetween(r.discovered_date || r.created_at?.slice(0, 10) || null, r.resolved_at))
            .filter((n): n is number => n !== null)
        );

        const byType = groupBy(rows, r => r.violation_type_name || 'Unspecified');
        const tableRows = Array.from(byType.entries()).map(([type, list]) => {
          const days = list
            .filter(r => r.resolved_at)
            .map(r => daysBetween(r.discovered_date || r.created_at?.slice(0, 10) || null, r.resolved_at))
            .filter((n): n is number => n !== null);
          const s = stats(days);
          return {
            type,
            resolved: days.length,
            unresolved: list.length - days.length,
            avg: s.avg,
            median: s.median,
            min: s.min,
            max: s.max,
          };
        }).sort((a, b) => b.avg - a.avg);

        return (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Avg Days</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-primary">{overall.avg}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Median Days</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{overall.median}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Min / Max</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{overall.min} / {overall.max}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Resolved / Unresolved</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{resolved.length} / {unresolved.length}</div></CardContent></Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>By Violation Type</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Unresolved violations are excluded from average / median computation but are shown in the
                  Unresolved column for transparency.
                </p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Violation Type</TableHead>
                      <TableHead className="text-right">Resolved</TableHead>
                      <TableHead className="text-right">Unresolved</TableHead>
                      <TableHead className="text-right">Avg Days</TableHead>
                      <TableHead className="text-right">Median</TableHead>
                      <TableHead className="text-right">Min</TableHead>
                      <TableHead className="text-right">Max</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableRows.map(r => (
                      <TableRow key={r.type}>
                        <TableCell className="font-medium">{r.type}</TableCell>
                        <TableCell className="text-right">{r.resolved}</TableCell>
                        <TableCell className="text-right">{r.unresolved}</TableCell>
                        <TableCell className="text-right">{r.resolved ? r.avg : '—'}</TableCell>
                        <TableCell className="text-right">{r.resolved ? r.median : '—'}</TableCell>
                        <TableCell className="text-right">{r.resolved ? r.min : '—'}</TableCell>
                        <TableCell className="text-right">{r.resolved ? r.max : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        );
      }}
    />
  );
}
