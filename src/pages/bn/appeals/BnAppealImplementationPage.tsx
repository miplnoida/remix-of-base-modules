import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { AppealsQueryState } from '@/components/bn/appeals/AppealsQueryState';
import { useAppealImplementation } from '@/hooks/bn/appeals/useAppealOperationalQueries';

type View = 'AWAITING_PLAN' | 'READY' | 'IN_PROGRESS' | 'FAILED' | 'AWAITING_RECON' | 'PARTIAL' | 'COMPLETED';

const VIEWS: { key: View; label: string }[] = [
  { key: 'AWAITING_PLAN', label: 'Awaiting plan' },
  { key: 'READY', label: 'Ready to execute' },
  { key: 'IN_PROGRESS', label: 'In progress' },
  { key: 'FAILED', label: 'Failed' },
  { key: 'AWAITING_RECON', label: 'Awaiting reconciliation' },
  { key: 'PARTIAL', label: 'Partially implemented' },
  { key: 'COMPLETED', label: 'Completed' },
];

export default function BnAppealImplementationPage() {
  const [view, setView] = useState<View>('READY');
  const q = useAppealImplementation({ view, pageSize: 50 });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Decision Implementation</h1>
        <p className="text-sm text-muted-foreground">
          Cross-module actions executing appellate decisions. Read-only pilot.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Implementation actions</CardTitle></CardHeader>
        <CardContent>
          <Tabs value={view} onValueChange={(v) => setView(v as View)}>
            <TabsList className="flex flex-wrap h-auto">
              {VIEWS.map((v) => (
                <TabsTrigger key={v.key} value={v.key}>{v.label}</TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value={view} className="mt-4">
              <AppealsQueryState
                query={q}
                emptyTitle="No implementation actions"
                emptyMessage="No implementation actions in this view."
                loadingRows={5}
                isEmpty={(d) => !Array.isArray(d) || d.length === 0}
              >
                {(rows) => (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Appeal</TableHead>
                      <TableHead>Decision</TableHead>
                      <TableHead>Outcome</TableHead>
                      <TableHead>Remedy</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead>Recon</TableHead>
                      <TableHead className="text-right">Open</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(rows as any[]).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.appealNumber ?? '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{r.decisionNumber ?? '—'}</TableCell>
                        <TableCell className="text-xs">{r.decisionOutcome ?? '—'}</TableCell>
                        <TableCell className="text-xs">{r.remedy ?? '—'}</TableCell>
                        <TableCell className="text-xs">
                          {r.targetModule}
                          {r.targetEntity ? <div className="text-muted-foreground">{r.targetEntity}</div> : null}
                        </TableCell>
                        <TableCell className="text-xs">{r.actionType}</TableCell>
                        <TableCell>
                          <Badge variant={r.actionStatus === 'FAILED' ? 'destructive' : 'outline'}>
                            {r.actionStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{r.attemptCount ?? 0}</TableCell>
                        <TableCell><Badge variant="outline">{r.reconciliationStatus ?? '—'}</Badge></TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="ghost">
                            <Link to={`/bn/appeals/${r.appealId}`}>Open</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                )}
              </AppealsQueryState>
            </TabsContent>

          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
