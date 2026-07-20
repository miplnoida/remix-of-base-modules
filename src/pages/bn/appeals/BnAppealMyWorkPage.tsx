import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Search } from 'lucide-react';
import {
  useAppealMyWorkSummary,
  useAppealMyWorkList,
} from '@/hooks/bn/appeals/useAppealOperationalQueries';

type View = 'ALL_OPEN' | 'CASE_PREP' | 'EVIDENCE' | 'HEARING' | 'RECOMMEND' | 'DECISION';

const VIEWS: { key: View; label: string }[] = [
  { key: 'ALL_OPEN', label: 'All open' },
  { key: 'CASE_PREP', label: 'Case preparation' },
  { key: 'EVIDENCE', label: 'Evidence awaiting' },
  { key: 'HEARING', label: 'Hearing preparation' },
  { key: 'RECOMMEND', label: 'Recommendation pending' },
  { key: 'DECISION', label: 'Decision pending' },
];

export default function BnAppealMyWorkPage() {
  const [view, setView] = useState<View>('ALL_OPEN');
  const [search, setSearch] = useState('');
  const summary = useAppealMyWorkSummary();
  const list = useAppealMyWorkList({ view, search, pageSize: 50 });

  const s = summary.data?.data;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My Appeals Workbasket</h1>
        <p className="text-sm text-muted-foreground">
          Officer-scoped view of appeals assigned to you. Read-only pilot.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryTile label="Assigned to me" value={s?.assignedToMe} loading={summary.isLoading} />
        <SummaryTile label="Due today" value={s?.dueToday} loading={summary.isLoading} />
        <SummaryTile label="SLA breached" value={s?.slaBreached} loading={summary.isLoading} tone="danger" />
        <SummaryTile label="Evidence awaiting" value={s?.evidenceAwaiting} loading={summary.isLoading} />
        <SummaryTile label="Case preparation" value={s?.casePreparation} loading={summary.isLoading} />
        <SummaryTile label="Hearing preparation" value={s?.hearingPreparation} loading={summary.isLoading} />
        <SummaryTile label="Recommendation pending" value={s?.recommendationPending} loading={summary.isLoading} />
        <SummaryTile label="Decision pending" value={s?.decisionPending} loading={summary.isLoading} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Appeals</CardTitle>
            <div className="relative w-72">
              <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search appeal number…"
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={view} onValueChange={(v) => setView(v as View)}>
            <TabsList className="flex flex-wrap h-auto">
              {VIEWS.map((v) => (
                <TabsTrigger key={v.key} value={v.key}>{v.label}</TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value={view} className="mt-4">
              {list.isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : list.isError ? (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" /> Failed to load appeals.
                </div>
              ) : (list.data?.data ?? []).length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center">
                  No appeals in this view.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Appeal #</TableHead>
                      <TableHead>Appellant</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Filing deadline</TableHead>
                      <TableHead>SLA</TableHead>
                      <TableHead>Next action</TableHead>
                      <TableHead className="text-right">Open</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(list.data?.data ?? []).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.appealNumber}</TableCell>
                        <TableCell>
                          <div>{r.appellantName ?? '—'}</div>
                          <div className="text-xs text-muted-foreground">{r.claimantSsnMasked ?? ''}</div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.sourceModule}
                          {r.sourceReference ? <div className="text-muted-foreground">{r.sourceReference}</div> : null}
                        </TableCell>
                        <TableCell className="text-xs">{r.currentStage}</TableCell>
                        <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                        <TableCell className="text-xs">{r.filingDeadlineDate ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant={r.slaStatus === 'BREACHED' ? 'destructive' : 'secondary'}>
                            {r.slaStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{r.nextAction}</TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="ghost">
                            <Link to={`/bn/appeals/${r.id}`}>Open</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryTile({ label, value, loading, tone }: { label: string; value: number | undefined; loading: boolean; tone?: 'danger' }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        {loading ? (
          <Skeleton className="h-7 w-16 mt-1" />
        ) : (
          <div className={`text-2xl font-semibold mt-1 ${tone === 'danger' ? 'text-destructive' : ''}`}>
            {value ?? 0}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
