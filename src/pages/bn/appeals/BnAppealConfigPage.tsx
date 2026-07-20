import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { useAppealConfiguration } from '@/hooks/bn/appeals/useAppealOperationalQueries';

export default function BnAppealConfigPage() {
  const q = useAppealConfiguration();
  const d = q.data?.data;

  if (q.isLoading) {
    return <div className="p-6 space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  }
  if (q.isError) {
    return (
      <div className="p-6 flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" /> Failed to load configuration.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Appeals Configuration</h1>
        <p className="text-sm text-muted-foreground">
          Read-only view of Appeals configuration surfaces and integration readiness.
        </p>
      </div>

      <ConfigCard title="Appeal types" rows={d?.appealTypes ?? []} columns={['appeal_type_code', 'display_name', 'requires_hearing', 'active']} />
      <ConfigCard title="Grounds catalogue" rows={d?.grounds ?? []} columns={['ground_code', 'display_name', 'active']} />
      <ConfigCard title="Remedies catalogue" rows={d?.remedies ?? []} columns={['remedy_code', 'display_name', 'active']} />

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Integration readiness</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source module</TableHead>
                <TableHead>Ready</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(d?.integrationReadiness ?? []).map((r) => (
                <TableRow key={r.sourceModule}>
                  <TableCell className="font-mono text-xs">{r.sourceModule}</TableCell>
                  <TableCell>
                    <Badge variant={r.ready ? 'default' : 'secondary'}>{r.ready ? 'Ready' : 'Pending'}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.reason ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ConfigCard({ title, rows, columns }: { title: string; rows: any[]; columns: string[] }) {
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-3 text-center">No records configured.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>{columns.map((c) => <TableHead key={c}>{c}</TableHead>)}</TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={r.id ?? i}>
                  {columns.map((c) => (
                    <TableCell key={c} className="text-xs">
                      {typeof r[c] === 'boolean' ? (r[c] ? 'Yes' : 'No') : (r[c] ?? '—')}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
