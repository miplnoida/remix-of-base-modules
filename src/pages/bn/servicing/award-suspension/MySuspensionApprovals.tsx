import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Inbox, Loader2, ShieldAlert, Eye, AlertTriangle } from 'lucide-react';
import type { SuspensionApprovalTask } from '@/services/bn/awardSuspensionViewService';
import { SuspensionStatusBadge } from './SuspensionStatusBadge';
import { formatDate, slaTone } from './suspensionViewModels';

interface Props {
  rows: SuspensionApprovalTask[];
  loading: boolean;
  canApprove: boolean;
  onReview: (requestId: string) => void;
  actionsEnabled?: boolean;
}

export function MySuspensionApprovals({ rows, loading, canApprove, onReview, actionsEnabled = false }: Props) {
  if (!canApprove) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-muted-foreground">
          <ShieldAlert className="mx-auto h-6 w-6 mb-2 opacity-60" aria-hidden />
          You do not currently have the <span className="font-mono">bn_award_suspension.approve</span>{' '}
          permission. Ask an administrator if this looks wrong.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        {!actionsEnabled && (
          <div className="rounded-md border border-amber-400/50 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
            <ShieldAlert className="h-4 w-4 inline mr-1" aria-hidden />
            Approve and Reject actions are disabled while the Award Suspension feature is
            dark-launched. You can still open and review each request.
          </div>
        )}

        <div className="rounded-md border overflow-hidden">
          <div className="max-h-[560px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Priority</TableHead>
                  <TableHead>Claimant</TableHead>
                  <TableHead>Award #</TableHead>
                  <TableHead>Benefit</TableHead>
                  <TableHead>Requested effective</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Proposer</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Workbasket</TableHead>
                  <TableHead>Age (d)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Review</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="py-10 text-center">
                      <Loader2 className="h-4 w-4 animate-spin inline mr-2" aria-hidden />
                      Loading approval queue…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="py-10 text-center text-muted-foreground">
                      <Inbox className="mx-auto h-6 w-6 mb-2 opacity-60" aria-hidden />
                      Nothing to approve right now.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => {
                    const tone = slaTone(r.ageDays);
                    return (
                      <TableRow key={r.requestId} className="hover:bg-muted/40">
                        <TableCell>
                          {r.slaBreached ? (
                            <Badge variant="outline" className="border-destructive/60 text-destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" aria-hidden />
                              SLA
                            </Badge>
                          ) : tone === 'warn' ? (
                            <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300">
                              At risk
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Normal
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{r.claimantName}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {r.awardNumber ?? r.awardId.slice(0, 8)}
                        </TableCell>
                        <TableCell>{r.benefitCode ?? '—'}</TableCell>
                        <TableCell className="text-xs">
                          {formatDate(r.requestedEffectiveDate)}
                        </TableCell>
                        <TableCell className="text-xs">{r.reasonCode ?? '—'}</TableCell>
                        <TableCell className="text-xs">{r.proposedBy ?? '—'}</TableCell>
                        <TableCell className="text-xs">
                          {r.currentApprovalLevel != null
                            ? `L${r.currentApprovalLevel}${
                                r.totalApprovalLevels ? ` / ${r.totalApprovalLevels}` : ''
                              }`
                            : '—'}
                        </TableCell>
                        <TableCell className="text-xs">{r.assignedWorkbasketCode ?? '—'}</TableCell>
                        <TableCell>{r.ageDays}</TableCell>
                        <TableCell>
                          <SuspensionStatusBadge status={r.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => onReview(r.requestId)}>
                            <Eye className="h-3.5 w-3.5 mr-1" aria-hidden />
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
