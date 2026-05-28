import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ViolationReportShell from './ViolationReportShell';
import { ViolationReportRow } from '@/services/violationReportsService';

function aggregate(rows: ViolationReportRow[]) {
  const map = new Map<string, { status: string; count: number; total_amount: number }>();
  rows.forEach(r => {
    const key = r.status || 'UNKNOWN';
    const e = map.get(key) || { status: key, count: 0, total_amount: 0 };
    e.count += 1;
    e.total_amount += r.total_amount || 0;
    map.set(key, e);
  });
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

export default function ViolationsByStatusReport() {
  return (
    <ViolationReportShell
      title="Violations by Status"
      subtitle="Grouped counts and amounts of violations by current status"
      breadcrumbLabel="Violations by Status"
      filters={['dateRange', 'fund', 'zone', 'type', 'severity']}
      exportFilename="violations_by_status"
      exportColumns={[
        { header: 'Status', key: 'status', width: 22 },
        { header: 'Count', key: 'count', width: 12 },
        { header: 'Total Amount', key: 'total_amount', width: 18 },
      ]}
      mapExportRow={(r) => r as any}
      renderBody={(rows) => {
        const agg = aggregate(rows);
        const exportRows = agg.map(a => ({ status: a.status.replace(/_/g, ' '), count: a.count, total_amount: a.total_amount.toFixed(2) }));
        return (
          <>
            <Card>
              <CardHeader><CardTitle>Status Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={agg.map(a => ({ status: a.status.replace(/_/g, ' '), count: a.count }))}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Breakdown</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exportRows.map(r => (
                      <TableRow key={r.status}>
                        <TableCell className="font-medium">{r.status}</TableCell>
                        <TableCell className="text-right">{r.count}</TableCell>
                        <TableCell className="text-right">{r.total_amount}</TableCell>
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
