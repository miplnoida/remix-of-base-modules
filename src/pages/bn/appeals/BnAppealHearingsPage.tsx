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
import { useAppealHearings } from '@/hooks/bn/appeals/useAppealOperationalQueries';

type View = 'UNSCHEDULED' | 'UPCOMING' | 'TODAY' | 'AWAITING_NOTICE' | 'ADJOURNED' | 'OUTCOME_PENDING' | 'COMPLETED';

const VIEWS: { key: View; label: string }[] = [
  { key: 'UNSCHEDULED', label: 'Unscheduled' },
  { key: 'UPCOMING', label: 'Upcoming' },
  { key: 'TODAY', label: 'Today' },
  { key: 'AWAITING_NOTICE', label: 'Awaiting notice' },
  { key: 'ADJOURNED', label: 'Adjourned' },
  { key: 'OUTCOME_PENDING', label: 'Outcome pending' },
  { key: 'COMPLETED', label: 'Completed' },
];

export default function BnAppealHearingsPage() {
  const [view, setView] = useState<View>('UPCOMING');
  const q = useAppealHearings({ view, pageSize: 50 });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Hearings & Scheduling</h1>
        <p className="text-sm text-muted-foreground">
          Enterprise view of scheduled hearings, notices, participants, and outcomes.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Hearings</CardTitle></CardHeader>
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
                emptyTitle="No hearings"
                emptyMessage="No hearings in this view."
                loadingRows={5}
                isEmpty={(d) => !Array.isArray(d) || d.length === 0}
              >
                {(rows) => (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hearing #</TableHead>
                      <TableHead>Appeal</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Notice</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Next action</TableHead>
                      <TableHead className="text-right">Open appeal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(rows as any[]).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.hearingReference ?? '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{r.appealNumber ?? '—'}</TableCell>
                        <TableCell className="text-xs">{r.appealType ?? '—'}</TableCell>
                        <TableCell className="text-xs">{r.hearingMode}</TableCell>
                        <TableCell className="text-xs">{r.scheduledStart ?? '—'}</TableCell>
                        <TableCell className="text-xs">{r.location}</TableCell>
                        <TableCell><Badge variant="outline">{r.noticeStatus ?? '—'}</Badge></TableCell>
                        <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                        <TableCell className="text-xs">{r.nextAction}</TableCell>
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
