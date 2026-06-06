import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useExternalAwards } from '@/portals/_shared/externalHooks';

const norm = (s?: string) => String(s ?? '').toUpperCase();

function Section({ rows }: { rows: any[] }) {
  if (rows.length === 0)
    return <p className="text-sm text-muted-foreground py-4">No entitlements in this category.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Award #</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Start</TableHead>
          <TableHead>End</TableHead>
          <TableHead>Rate</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(a => (
          <TableRow key={a.id}>
            <TableCell className="font-mono">{a.award_number ?? a.id.slice(0, 8)}</TableCell>
            <TableCell>{a.award_type ?? a.benefit_code ?? '—'}</TableCell>
            <TableCell>{a.start_date ?? '—'}</TableCell>
            <TableCell>{a.end_date ?? '—'}</TableCell>
            <TableCell>{a.base_amount ?? a.weekly_rate ?? a.monthly_rate ?? '—'}</TableCell>
            <TableCell><Badge>{a.status ?? '—'}</Badge></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function EntitlementsPage() {
  const { data, isLoading } = useExternalAwards();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') ?? 'active';
  const rows = (data?.awards ?? []) as any[];

  const groups = useMemo(() => ({
    active: rows.filter(r => ['ACTIVE', 'IN_PAYMENT', 'AWARDED'].includes(norm(r.status))),
    pending: rows.filter(r => ['PENDING', 'AWAITING_APPROVAL', 'DRAFT'].includes(norm(r.status))),
    suspended: rows.filter(r => ['SUSPENDED', 'ON_HOLD'].includes(norm(r.status))),
    historical: rows.filter(r => ['CLOSED', 'TERMINATED', 'EXPIRED'].includes(norm(r.status))),
  }), [rows]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entitlements</CardTitle>
        <CardDescription>Awards and pensions assigned to you.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-48 w-full" /> : (
          <Tabs value={tab} onValueChange={v => setSp({ tab: v })}>
            <TabsList>
              <TabsTrigger value="active">Active ({groups.active.length})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({groups.pending.length})</TabsTrigger>
              <TabsTrigger value="suspended">Suspended ({groups.suspended.length})</TabsTrigger>
              <TabsTrigger value="historical">Historical ({groups.historical.length})</TabsTrigger>
            </TabsList>
            {(['active', 'pending', 'suspended', 'historical'] as const).map(k => (
              <TabsContent key={k} value={k} className="pt-4"><Section rows={groups[k]} /></TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
