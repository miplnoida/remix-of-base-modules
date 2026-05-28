import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ViolationReportShell from './ViolationReportShell';
import { ViolationReportRow } from '@/services/violationReportsService';

function aggregate(rows: ViolationReportRow[]) {
  const map = new Map<string, { zone: string; count: number; total_amount: number }>();
  rows.forEach(r => {
    const key = r.zone_name || 'Unassigned';
    const e = map.get(key) || { zone: key, count: 0, total_amount: 0 };
    e.count += 1;
    e.total_amount += r.total_amount || 0;
    map.set(key, e);
  });
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

export default function ViolationsByZoneReport() {
  return (
    <ViolationReportShell
      title="Violations by Zone"
      subtitle="Distribution of violations by employer zone. Records without a zone are grouped as Unassigned."
      breadcrumbLabel="Violations by Zone"
      filters={['dateRange', 'status', 'type', 'fund', 'severity']}
      exportFilename="violations_by_zone"
      exportColumns={[
        { header: 'Zone', key: 'zone', width: 28 },
        { header: 'Count', key: 'count', width: 12 },
        { header: 'Total Amount', key: 'total_amount', width: 18 },
      ]}
      renderBody={(rows) => {
        const agg = aggregate(rows);
        return (
          <>
            <Card>
              <CardHeader><CardTitle>Zone Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={agg}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="zone" tick={{ fontSize: 12 }} />
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
                      <TableHead>Zone</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agg.map(r => (
                      <TableRow key={r.zone}>
                        <TableCell className="font-medium">{r.zone}</TableCell>
                        <TableCell className="text-right">{r.count}</TableCell>
                        <TableCell className="text-right">{r.total_amount.toFixed(2)}</TableCell>
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
