/**
 * BN-AWARD360-B1 — Payments tab.
 * Read-only workspace over bn_payment_instruction with summary, filters,
 * sortable table, pagination, and drawer detail. No direct mutations.
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
import { useAwardPaymentsPaged } from '../useAward360Queries';
import type { AwardPaymentItem } from '../viewModels';

const STATUSES = ['ALL', 'QUEUED', 'BATCHED', 'ISSUED', 'PAID', 'FAILED', 'RETURNED', 'CANCELLED', 'HOLD'];
const METHODS = ['ALL', 'EFT', 'CHEQUE', 'CASH', 'MOBILE_MONEY'];

interface Props { awardId: string; currency?: string | null; canView: boolean; }

export const AwardPaymentsTab: React.FC<Props> = ({ awardId, currency, canView }) => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [method, setMethod] = useState('ALL');
  const [failedOnly, setFailedOnly] = useState(false);
  const [dueFrom, setDueFrom] = useState<string | undefined>();
  const [dueTo, setDueTo] = useState<string | undefined>();
  const [paidFrom, setPaidFrom] = useState<string | undefined>();
  const [paidTo, setPaidTo] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState('dueDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<AwardPaymentItem | null>(null);

  const query = useMemo(
    () => ({
      awardId,
      search: search || undefined,
      statuses: status !== 'ALL' ? [status] : undefined,
      paymentMethods: method !== 'ALL' ? [method] : undefined,
      failedOnly,
      dueFrom, dueTo, paidFrom, paidTo,
      page, pageSize, sortBy, sortDirection,
    }),
    [awardId, search, status, method, failedOnly, dueFrom, dueTo, paidFrom, paidTo, page, pageSize, sortBy, sortDirection],
  );

  const q = useAwardPaymentsPaged(query, canView);

  if (!canView) return <Award360PermissionState moduleLabel="Payments" permissionKey="bn_payments.view" />;

  const s = q.data?.summary;
  const metrics = s ? [
    { key: 'total', label: 'Instructions', value: s.totalRows },
    { key: 'amt', label: 'Total amount', value: <AwardMoney value={s.totalAmount} currency={currency} /> },
    { key: 'paid', label: 'Paid/Issued', value: s.paidCount, tone: 'ok' as const },
    { key: 'queue', label: 'Queued/Batched', value: s.queuedCount },
    { key: 'held', label: 'Held', value: s.heldCount, tone: s.heldCount > 0 ? ('warn' as const) : undefined },
    { key: 'fail', label: 'Failed/Returned', value: s.failedCount, tone: s.failedCount > 0 ? ('breach' as const) : undefined },
    { key: 'canc', label: 'Cancelled', value: s.cancelledCount, tone: 'muted' as const },
    { key: 'other', label: 'Other status', value: s.otherCount, tone: s.otherCount > 0 ? ('warn' as const) : undefined },
  ] : [];

  const columns: Award360Column<AwardPaymentItem>[] = [
    { key: 'reference', label: 'Reference', sortAccessor: (r) => r.reference },
    { key: 'dueDate', label: 'Due', render: (r) => dt(r.dueDate), sortAccessor: (r) => r.dueDate },
    { key: 'amount', label: 'Amount', align: 'right', render: (r) => <AwardMoney value={r.amount} currency={r.currency ?? currency} />, sortAccessor: (r) => r.amount },
    { key: 'currency', label: 'Currency' },
    { key: 'paymentMethod', label: 'Method', sortAccessor: (r) => r.paymentMethod },
    { key: 'accountMasked', label: 'Account' },
    { key: 'status', label: 'Status', render: (r) => <AwardStatusBadge status={r.status} tone={(r.status ?? '').toUpperCase() === 'FAILED' ? 'breach' : undefined} />, sortAccessor: (r) => r.status },
    { key: 'paidDate', label: 'Paid', render: (r) => dt(r.paidDate), sortAccessor: (r) => r.paidDate },
    { key: 'cancelReason', label: 'Cancel reason' },
  ];

  const reset = () => {
    setSearch(''); setStatus('ALL'); setMethod('ALL'); setFailedOnly(false);
    setDueFrom(undefined); setDueTo(undefined); setPaidFrom(undefined); setPaidTo(undefined); setPage(1);
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Payment instructions</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Award360MetricCards metrics={metrics as any} />
        {q.data?.warnings?.length ? <Award360PartialWarning warnings={q.data.warnings} /> : null}
        <Award360FilterBar
          search={search}
          onSearch={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Reference, ID or cancel reason"
          filters={[
            { kind: 'select', key: 'st', label: 'Status', value: status, onChange: (v) => { setStatus(v); setPage(1); }, options: STATUSES.map((v) => ({ value: v, label: v })) },
            { kind: 'select', key: 'mt', label: 'Method', value: method, onChange: (v) => { setMethod(v); setPage(1); }, options: METHODS.map((v) => ({ value: v, label: v })) },
            { kind: 'date', key: 'df', label: 'Due from', value: dueFrom, onChange: (v) => { setDueFrom(v); setPage(1); } },
            { kind: 'date', key: 'dt', label: 'Due to', value: dueTo, onChange: (v) => { setDueTo(v); setPage(1); } },
            { kind: 'date', key: 'pf', label: 'Paid from', value: paidFrom, onChange: (v) => { setPaidFrom(v); setPage(1); } },
            { kind: 'date', key: 'pt', label: 'Paid to', value: paidTo, onChange: (v) => { setPaidTo(v); setPage(1); } },
            { kind: 'toggle', key: 'fo', label: 'Failed/Returned only', value: failedOnly, onChange: (v) => { setFailedOnly(v); setPage(1); } },
          ]}
          onReset={reset}
        />
        <Award360DataTable
          rows={q.data?.rows ?? []}
          columns={columns}
          isLoading={q.isLoading}
          error={q.error}
          onRetry={() => q.refetch()}
          emptyTitle="No payment instructions match the current filters"
          getRowKey={(r) => r.id}
          onRowClick={(r) => setSelected(r)}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={(k, d) => { setSortBy(k); setSortDirection(d); }}
        />
        {q.data ? (
          <Award360Pagination page={page} pageSize={pageSize} total={q.data.total} onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(1); }} />
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline"><a href={`/bn/payables?awardId=${awardId}`}>Open Payables</a></Button>
          <Button asChild size="sm" variant="outline"><a href="/bn/batches">Batches</a></Button>
          <Button asChild size="sm" variant="outline"><a href="/bn/issue">Payment Issue</a></Button>
          <Button asChild size="sm" variant="outline"><a href="/bn/post-issue">Post-Issue Review</a></Button>
          <Button asChild size="sm" variant="outline"><a href="/bn/exceptions">Exceptions</a></Button>
          <Button size="sm" variant="outline" disabled title="Cancel, reissue, reverse, and mark-reconciled require accepted server commands not enabled in this build">Mutation controls</Button>
        </div>

        <Award360DetailDrawer
          open={!!selected}
          onOpenChange={(v) => { if (!v) setSelected(null); }}
          title={`Payment ${selected?.reference ?? ''}`}
          subtitle={selected?.dueDate ? `Due ${dt(selected.dueDate)}` : undefined}
          status={selected?.status ?? null}
          statusTone={(selected?.status ?? '').toUpperCase() === 'FAILED' ? 'breach' : undefined}
          sections={selected ? [
            { key: 'instr', label: 'Instruction', content: (
              <div>
                <KV label="Reference" value={selected.reference} />
                <KV label="ID" value={selected.id} />
                <KV label="Amount" value={<AwardMoney value={selected.amount} currency={selected.currency ?? currency} />} />
                <KV label="Currency" value={selected.currency} />
                <KV label="Method" value={selected.paymentMethod} />
                <KV label="Account" value={selected.accountMasked} />
                <KV label="Due" value={dt(selected.dueDate)} />
                <KV label="Paid" value={dt(selected.paidDate)} />
                <KV label="Cancel reason" value={selected.cancelReason} />
              </div>
            )},
            { key: 'enrich', label: 'Batch / issue / exception / reconciliation', content: (
              <div className="text-xs text-muted-foreground">
                Enrichment from batch, issue, exception and reconciliation tables is not available in this build.
                Base instruction data remains visible. Open the specialist workspace for the full history.
              </div>
            )},
            { key: 'comm', label: 'Related communications', content: (
              <div className="text-xs text-muted-foreground">
                Payment-ready / issued / failed / returned events are shown in the Communications tab.
              </div>
            )},
          ] : []}
          actions={
            <>
              <Button asChild size="sm" variant="outline"><a href={`/bn/payables?awardId=${awardId}`}>Open Payables</a></Button>
              <Button asChild size="sm" variant="outline"><a href="/bn/exceptions">Exceptions</a></Button>
              <Button size="sm" variant="outline" disabled title="Cancel command not enabled">Cancel</Button>
              <Button size="sm" variant="outline" disabled title="Reissue command not enabled">Reissue</Button>
              <Button size="sm" variant="outline" disabled title="Reverse command not enabled">Reverse</Button>
              <Button size="sm" variant="outline" disabled title="Mark-reconciled command not enabled">Mark reconciled</Button>
            </>
          }
        />
      </CardContent>
    </Card>
  );
};

export default AwardPaymentsTab;
