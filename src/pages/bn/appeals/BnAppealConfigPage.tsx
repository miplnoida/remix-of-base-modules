import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AppealsQueryState } from '@/components/bn/appeals/AppealsQueryState';
import { useAppealConfiguration } from '@/hooks/bn/appeals/useAppealOperationalQueries';

/**
 * BN-AP-CONFIG-1a §B — Read-only Appeals Configuration overview.
 *
 * NOTE (audit): this page still consumes the legacy
 * `BN_APPEAL_GET_CONFIGURATION` aggregate. Slice 1b/1c will replace the
 * aggregate with typed, focused queries and remove hard-coded
 * `integrationReadiness`. This turn only fixes error/empty classification.
 */
export default function BnAppealConfigPage() {
  const q = useAppealConfiguration();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Appeals Configuration</h1>
        <p className="text-sm text-muted-foreground">
          Read-only view of Appeals configuration surfaces and integration readiness.
        </p>
      </div>

      <AppealsQueryState
        query={q as any}
        loadingRows={6}
        emptyTitle="Appeals configuration is not initialised"
        emptyMessage="No configuration records exist for the current country/scheme."
        isEmpty={(d: any) =>
          !d ||
          ((d.appealTypes?.length ?? 0) === 0 &&
            (d.grounds?.length ?? 0) === 0 &&
            (d.remedies?.length ?? 0) === 0 &&
            (d.integrationReadiness?.length ?? 0) === 0)
        }
      >
        {(d: any) => (
          <>
            <ConfigCard title="Appeal types" rows={d?.appealTypes ?? []} columns={['appeal_type_code', 'display_name', 'requires_hearing', 'active']} />
            <ConfigCard title="Grounds catalogue" rows={d?.grounds ?? []} columns={['ground_code', 'display_name', 'active']} />
            <ConfigCard title="Remedies catalogue" rows={d?.remedies ?? []} columns={['remedy_code', 'display_name', 'active']} />
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Integration readiness</CardTitle></CardHeader>
              <CardContent>
                {(d?.integrationReadiness ?? []).length === 0 ? (
                  <div className="text-sm text-muted-foreground py-3 text-center">
                    Integration readiness not yet computed. Slice 1c will replace the
                    hard-coded readiness list with a real health probe per source module.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source module</TableHead>
                        <TableHead>Ready</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(d?.integrationReadiness ?? []).map((r: any) => (
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
                )}
              </CardContent>
            </Card>
          </>
        )}
      </AppealsQueryState>
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
