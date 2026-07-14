import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TabLoading, TabErrorState, AwardStatusBadge, dt } from '../components';
import { SimpleTable } from '../components/SimpleTable';
import { useAwardSuspensions } from '../useAward360Queries';

export const AwardSuspensionsTab: React.FC<{ awardId: string }> = ({ awardId }) => {
  const { data = [], isLoading, error, refetch } = useAwardSuspensions(awardId);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [q, setQ] = useState('');

  const summary = useMemo(() => {
    const open = data.filter((s) => s.displayStatus?.startsWith('PENDING') || s.eventStatus === 'PROPOSED' || s.eventStatus === 'ACTIVE');
    const active = data.filter((s) => s.eventStatus === 'ACTIVE');
    const level = open[0]?.currentApprovalLevel ?? null;
    const suspendedDays = data
      .filter((s) => s.suspendedFrom)
      .reduce((sum, s) => {
        const from = new Date(s.suspendedFrom as string).getTime();
        const to = s.resumedAt ? new Date(s.resumedAt).getTime() : (s.suspendedTo ? new Date(s.suspendedTo).getTime() : Date.now());
        return sum + Math.max(0, Math.round((to - from) / 86400000));
      }, 0);
    return {
      total: data.length,
      open: open.length,
      active: active.length,
      level,
      suspendedDays,
      workbasketId: open[0]?.workbasketId ?? null,
      plannedResumption: active[0]?.suspendedTo ?? null,
      effective: active[0]?.suspendedFrom ?? open[0]?.suspendedFrom ?? null,
    };
  }, [data]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.filter((r) => {
      if (statusFilter !== 'ALL' && r.displayStatus !== statusFilter) return false;
      if (!needle) return true;
      return [r.id, r.reasonCode, r.reasonText, r.suspensionType]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [data, q, statusFilter]);

  if (isLoading) return <TabLoading />;
  if (error) return <TabErrorState error={error} onRetry={() => refetch()} />;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Award suspensions</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6 text-sm">
          <div><div className="text-xs text-muted-foreground">Total</div><div className="font-semibold">{summary.total}</div></div>
          <div><div className="text-xs text-muted-foreground">Open</div><div className="font-semibold">{summary.open}</div></div>
          <div><div className="text-xs text-muted-foreground">Active</div><div className="font-semibold">{summary.active}</div></div>
          <div><div className="text-xs text-muted-foreground">Current level</div><div className="font-semibold">{summary.level ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Effective</div><div className="font-semibold">{dt(summary.effective)}</div></div>
          <div><div className="text-xs text-muted-foreground">Suspended days</div><div className="font-semibold">{summary.suspendedDays}</div></div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reason / type / id" className="max-w-xs" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {['PROPOSED', 'PENDING_LEVEL_1', 'PENDING_LEVEL_2', 'PENDING_LEVEL_N', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'APPLIED'].map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <SimpleTable
          rows={rows}
          empty={data.length === 0 ? 'No suspension events for this award.' : 'No suspensions match the current filters.'}
          columns={[
            { key: 'id', label: 'Request', render: (r) => (r.id ? String(r.id).slice(0, 8) : '—') },
            { key: 'displayStatus', label: 'Status', render: (r) => <AwardStatusBadge status={r.displayStatus} tone={r.displayStatus?.startsWith('PENDING') ? 'warn' : 'default'} /> },
            { key: 'eventStatus', label: 'Event' },
            { key: 'suspensionType', label: 'Type' },
            { key: 'suspendedFrom', label: 'From', render: (r) => dt(r.suspendedFrom) },
            { key: 'suspendedTo', label: 'To', render: (r) => dt(r.suspendedTo) },
            { key: 'resumedAt', label: 'Resumed', render: (r) => dt(r.resumedAt) },
            { key: 'reasonCode', label: 'Reason' },
            { key: 'currentApprovalLevel', label: 'Level' },
            { key: 'workbasketId', label: 'Workbasket', render: (r) => r.workbasketId ? String(r.workbasketId).slice(0, 8) : '—' },
          ]}
        />

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <a href={`/bn/award-suspension?awardId=${awardId}`}>Open Award Suspension workspace</a>
          </Button>
          <Button size="sm" variant="outline" disabled title="Propose/approve controls are governed by app_modules.actions_enabled on bn_award_suspension.">Propose</Button>
          <Button size="sm" variant="outline" disabled title="Approval decisions are executed inside the Award Suspension workspace under maker-checker.">Review approval</Button>
        </div>
      </CardContent>
    </Card>
  );
};

