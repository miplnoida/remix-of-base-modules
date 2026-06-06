import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useExternalPayments } from '@/portals/_shared/externalHooks';

const norm = (s?: string) => String(s ?? '').toUpperCase();

function Section({ rows }: { rows: any[] }) {
  if (rows.length === 0)
    return <p className="text-sm text-muted-foreground py-4">No payments in this category.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Reference</TableHead>
          <TableHead>Gross</TableHead>
          <TableHead>Net</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(p => (
          <TableRow key={p.id}>
            <TableCell>{p.payment_date ?? '—'}</TableCell>
            <TableCell className="font-mono text-xs">{p.payment_reference ?? p.id.slice(0, 8)}</TableCell>
            <TableCell>{p.gross_amount ?? '—'}</TableCell>
            <TableCell>{p.net_amount ?? p.gross_amount ?? '—'}</TableCell>
            <TableCell><Badge>{p.status ?? '—'}</Badge></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function PaymentsPage() {
  const { data, isLoading } = useExternalPayments();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') ?? 'upcoming';
  const rows = (data?.payments ?? []) as any[];

  const today = new Date().toISOString().slice(0, 10);
  const groups = useMemo(() => ({
    upcoming: rows.filter(r => r.payment_date && r.payment_date >= today),
    history: rows.filter(r => r.payment_date && r.payment_date < today),
    returned: rows.filter(r => ['RETURNED', 'FAILED', 'REJECTED'].includes(norm(r.status))),
  }), [rows, today]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payments</CardTitle>
        <CardDescription>Upcoming, recent and returned benefit payments.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-48 w-full" /> : (
          <Tabs value={tab} onValueChange={v => setSp({ tab: v })}>
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming ({groups.upcoming.length})</TabsTrigger>
              <TabsTrigger value="history">History ({groups.history.length})</TabsTrigger>
              <TabsTrigger value="returned">Returned ({groups.returned.length})</TabsTrigger>
            </TabsList>
            {(['upcoming', 'history', 'returned'] as const).map(k => (
              <TabsContent key={k} value={k} className="pt-4"><Section rows={groups[k]} /></TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
