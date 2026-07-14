/**
 * BN-AWARD360-B1 — Schedule tab.
 * Read-only workspace: canonical bn_payment_schedule rows with summary
 * metrics, filters, sorting, pagination, drawer detail (with linked payment
 * instruction), and canonical navigation actions. No direct mutations.
 */
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AwardMoney, AwardStatusBadge, dt, KV } from '../components';
import { Award360DataTable, type Award360Column } from '../components/Award360DataTable';
import { Award360FilterBar } from '../components/Award360FilterBar';
import { Award360MetricCards } from '../components/Award360MetricCards';
import { Award360Pagination } from '../components/Award360Pagination';
import { Award360PermissionState } from '../components/Award360PermissionState';
import { Award360PartialWarning } from '../components/Award360PartialWarning';
import { Award360DetailDrawer } from '../components/Award360DetailDrawer';
import { useAwardSchedulesPaged, useAwardScheduleDetail } from '../useAward360Queries';
import type { AwardScheduleItem } from '../viewModels';

const SCHEDULE_STATUSES = ['ALL', 'PENDING', 'DUE', 'PAID', 'HOLD', 'CANCELLED'];
const METHODS = ['ALL', 'EFT', 'CHEQUE', 'CASH', 'MOBILE_MONEY'];

interface Props {
  awardId: string;
  currency?: string | null;
  canView: boolean;
}

export const AwardScheduleTab: React.FC<Props> = ({ awardId, currency, canView }) => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [method, setMethod] = useState('ALL');
  const [paidState, setPaidState] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [dueFrom, setDueFrom] = useState<string | undefined>();
  const [dueTo, setDueTo] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState('dueDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const query = useMemo(
    () => ({
      awardId,
      search: search || undefined,
      statuses: status !== 'ALL' ? [status] : undefined,
      paymentMethod: method !== 'ALL' ? method : undefined,
      paidState,
      overdueOnly,
      dueFrom,
      dueTo,
      page,
      pageSize,
      sortBy,
      sortDirection,
    }),
    [awardId, search, status, method, paidState, overdueOnly, dueFrom, dueTo, page, pageSize, sortBy, sortDirection],
  );

  const q = useAwardSchedulesPaged(query, canView);
  const detailQ = useAwardScheduleDetail(selectedId);

  if (!canView) return <Award360PermissionState moduleLabel="Payment schedule" permissionKey="bn_payments.view" />;

  const s = q.data?.summary;
  const metrics = s
    ? [
        { key: 'rows', label: 'Rows', value: s.totalRows },
        { key: 'gross', label: 'Gross', value: <AwardMoney value={s.totalGross} currency={currency} /> },
        { key: 'ded', label: 'Deductions', value: <AwardMoney value={s.totalDeductions} currency={currency} /> },
        { key: 'net', label: 'Net', value: <AwardMoney value={s.totalNet} currency={currency} /> },
        { key: 'paid', label: 'Paid', value: <AwardMoney value={s.paidAmount} currency={currency} />, tone: 'ok' as const },
        { key: 'pend', label: 'Pending', value: <AwardMoney value={s.pendingAmount} currency={currency} /> },
        { key: 'held', label: 'Held', value: <AwardMoney value={s.heldAmount} currency={currency} />, tone: 'warn' as const },
        { key: 'canc', label: 'Cancelled', value: <AwardMoney value={s.cancelledAmount} currency={currency} />, tone: 'muted' as const },
        { key: 'over', label: 'Overdue unpaid', value: <AwardMoney value={s.overdueUnpaidAmount} currency={currency} />, tone: s.overdueUnpaidAmount > 0 ? ('breach' as const) : undefined },
        { key: 'fut', label: 'Future liability', value: <AwardMoney value={s.futureLiability} currency={currency} /> },
        { key: 'next', label: 'Next due', value: dt(s.nextDueDate) },
        { key: 'lastp', label: 'Last paid', value: dt(s.lastPaidDate) },
      ]
    : [];

  const columns: Award360Column<AwardScheduleItem>[] = [
    { key: 'schedulePeriod', label: 'Period', sortAccessor: (r) => r.schedulePeriod },
    { key: 'dueDate', label: 'Due', render: (r) => dt(r.dueDate), sortAccessor: (r) => r.dueDate },
    { key: 'grossAmount', label: 'Gross', align: 'right', render: (r) => <AwardMoney value={r.grossAmount} currency={currency} />, sortAccessor: (r) => r.grossAmount },
    { key: 'deductions', label: 'Deductions', align: 'right', render: (r) => <AwardMoney value={r.deductions} currency={currency} /> },
    { key: 'netAmount', label: 'Net', align: 'right', render: (r) => <AwardMoney value={r.netAmount} currency={currency} />, sortAccessor: (r) => r.netAmount },
    { key: 'status', label: 'Status', render: (r) => <AwardStatusBadge status={r.status} />, sortAccessor: (r) => r.status },
    { key: 'paymentMethod', label: 'Method', sortAccessor: (r) => r.paymentMethod },
    { key: 'paymentInstructionId', label: 'Instruction', render: (r) => r.paymentInstructionId ? String(r.paymentInstructionId).slice(0, 8) : '—' },
    { key: 'paymentRef', label: 'Reference' },
    { key: 'paidAt', label: 'Paid', render: (r) => dt(r.paidAt), sortAccessor: (r) => r.paidAt },
    { key: 'flags', label: 'Flags', render: (r) => {
      const today = new Date().toISOString().slice(0, 10);
      const overdue = r.dueDate && r.dueDate < today && (r.status ?? '').toUpperCase() !== 'PAID';
      return (
        <div className="flex gap-1 text-[10px]">
          {overdue ? <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-destructive">OVERDUE</span> : null}
          {r.notes ? <span className="rounded bg-muted px-1.5 py-0.5">NOTE</span> : null}
        </div>
      );
    }},
  ];

  const reset = () => {
    setSearch(''); setStatus('ALL'); setMethod('ALL'); setPaidState('ALL');
    setOverdueOnly(false); setDueFrom(undefined); setDueTo(undefined); setPage(1);
  };

  const selectedRow = detailQ.data?.row ?? null;
  const linkedInstr = detailQ.data?.instruction ?? null;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Payment schedule</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Award360MetricCards metrics={metrics as any} />
        {q.data?.warnings?.length ? <Award360PartialWarning warnings={q.data.warnings} /> : null}
        <Award360FilterBar
          search={search}
          onSearch={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Payment reference, period or notes"
          filters={[
            { kind: 'select', key: 'st', label: 'Status', value: status, onChange: (v) => { setStatus(v); setPage(1); }, options: SCHEDULE_STATUSES.map((v) => ({ value: v, label: v })) },
            { kind: 'select', key: 'mt', label: 'Method', value: method, onChange: (v) => { setMethod(v); setPage(1); }, options: METHODS.map((v) => ({ value: v, label: v })) },
            { kind: 'select', key: 'ps', label: 'Paid state', value: paidState, onChange: (v) => { setPaidState(v as any); setPage(1); }, options: [{ value: 'ALL', label: 'ALL' }, { value: 'PAID', label: 'PAID' }, { value: 'UNPAID', label: 'UNPAID' }] },
            { kind: 'date', key: 'df', label: 'Due from', value: dueFrom, onChange: (v) => { setDueFrom(v); setPage(1); } },
            { kind: 'date', key: 'dt', label: 'Due to', value: dueTo, onChange: (v) => { setDueTo(v); setPage(1); } },
            { kind: 'toggle', key: 'od', label: 'Overdue only', value: overdueOnly, onChange: (v) => { setOverdueOnly(v); setPage(1); } },
          ]}
          onReset={reset}
        />
        <Award360DataTable
          rows={q.data?.rows ?? []}
          columns={columns}
          isLoading={q.isLoading}
          error={q.error}
          onRetry={() => q.refetch()}
          emptyTitle="No schedule rows for the current filters"
          getRowKey={(r) => r.id}
          onRowClick={(r) => setSelectedId(r.id)}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={(k, d) => { setSortBy(k); setSortDirection(d); }}
        />
        {q.data ? (
          <Award360Pagination page={page} pageSize={pageSize} total={q.data.total} onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(1); }} />
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline"><a href={`/bn/schedules?awardId=${awardId}`}>Open Payment Schedule</a></Button>
          <Button asChild size="sm" variant="outline"><a href={`/bn/payables?awardId=${awardId}`}>Open Payables</a></Button>
          <Button size="sm" variant="outline" disabled title="Hold, release, cancel and recalculate require an accepted server command not enabled in this build">Mutation controls</Button>
        </div>

        <Award360DetailDrawer
          open={!!selectedId}
          onOpenChange={(v) => { if (!v) setSelectedId(null); }}
          title={`Schedule ${selectedRow?.schedulePeriod ?? ''}`}
          subtitle={selectedRow?.dueDate ? `Due ${dt(selectedRow.dueDate)}` : undefined}
          status={selectedRow?.status ?? null}
          sections={selectedRow ? [
            { key: 'sched', label: 'Schedule', content: (
              <div>
                <KV label="Period" value={selectedRow.schedulePeriod} />
                <KV label="Due" value={dt(selectedRow.dueDate)} />
                <KV label="Gross" value={<AwardMoney value={selectedRow.grossAmount} currency={currency} />} />
                <KV label="Deductions" value={<AwardMoney value={selectedRow.deductions} currency={currency} />} />
                <KV label="Net" value={<AwardMoney value={selectedRow.netAmount} currency={currency} />} />
                <KV label="Method" value={selectedRow.paymentMethod} />
                <KV label="Reference" value={selectedRow.paymentRef} />
                <KV label="Paid" value={dt(selectedRow.paidAt)} />
                <KV label="Notes" value={selectedRow.notes} />
              </div>
            )},
            { key: 'instr', label: 'Linked payment instruction', content: linkedInstr ? (
              <div>
                <KV label="Reference" value={linkedInstr.reference} />
                <KV label="Amount" value={<AwardMoney value={linkedInstr.amount} currency={linkedInstr.currency} />} />
                <KV label="Method" value={linkedInstr.paymentMethod} />
                <KV label="Status" value={<AwardStatusBadge status={linkedInstr.status} />} />
                <KV label="Due" value={dt(linkedInstr.dueDate)} />
                <KV label="Paid" value={dt(linkedInstr.paidDate)} />
                <KV label="Account" value={linkedInstr.accountMasked} />
                <KV label="Cancel reason" value={linkedInstr.cancelReason} />
              </div>
            ) : selectedRow.paymentInstructionId ? (
              <div className="text-xs text-muted-foreground">Linked instruction ID exists but could not be loaded.</div>
            ) : (
              <div className="text-xs text-muted-foreground">No linked instruction for this schedule row.</div>
            )},
            { key: 'proc', label: 'Processing linkage', content: (
              <div className="text-xs text-muted-foreground">
                Batch, batch item, payment issue, exception and reconciliation linkage is not available for this schedule row.
              </div>
            )},
            ...(detailQ.data?.warnings?.length ? [{ key: 'warn', label: 'Warnings', content: <Award360PartialWarning warnings={detailQ.data.warnings} /> }] : []),
          ] : []}
          actions={
            <>
              <Button asChild size="sm" variant="outline"><a href={`/bn/schedules?awardId=${awardId}`}>Open in Schedule workspace</a></Button>
              {linkedInstr ? <Button asChild size="sm" variant="outline"><a href={`/bn/payables?awardId=${awardId}`}>Open Payables</a></Button> : null}
              <Button size="sm" variant="outline" disabled title="Server command not enabled">Hold / release</Button>
            </>
          }
        />
      </CardContent>
    </Card>
  );
};

export default AwardScheduleTab;
