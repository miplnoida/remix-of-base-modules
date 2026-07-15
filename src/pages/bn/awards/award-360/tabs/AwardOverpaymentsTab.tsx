/**
 * BN-AWARD360-B2 — Overpayments tab.
 * Read-only workspace with canonical bn_overpayment mapping, summary metrics,
 * filters, drawer with schedule-deduction enrichment. No Finance or ledger
 * writes. No direct overpayment mutations.
 */
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AwardMoney, AwardStatusBadge, dt, KV } from '../components';
import { Award360DataTable, type Award360Column } from '../components/Award360DataTable';
import { Award360FilterBar } from '../components/Award360FilterBar';
import { Award360MetricCards } from '../components/Award360MetricCards';
import { Award360Pagination } from '../components/Award360Pagination';
import { Award360PermissionState } from '../components/Award360PermissionState';
import { Award360PartialWarning } from '../components/Award360PartialWarning';
import { Award360DetailDrawer } from '../components/Award360DetailDrawer';
import { Award360ActionButton } from '../components/Award360ActionButton';
import { useAwardOverpaymentsPaged, useAwardOverpaymentDetail } from '../useAward360Queries';
import { useAward360UrlState, boolParser, boolSerializer } from '../useAward360UrlState';
import type { AwardOverpaymentItem } from '../viewModels';
import type { AwardActionAvailability, AwardActionContext } from '@/services/bn/awards/awardActionAvailability';

const STATUSES = ['ALL', 'PENDING', 'IN_RECOVERY', 'ACTIVE', 'SUSPENDED', 'RECOVERED', 'CLOSED', 'WAIVED', 'WRITTEN_OFF'];
const METHODS = ['ALL', 'DEDUCTION', 'CASH', 'CHEQUE', 'EFT', 'INSTALMENT', 'MANUAL'];

export interface OverpaymentActionSet {
  openOverpayment: AwardActionAvailability;
  configureRecoveryPlan: AwardActionAvailability;
  requestWaiver: AwardActionAvailability;
}

interface Props {
  awardId: string;
  canView: boolean;
  currency?: string | null;
  actions: OverpaymentActionSet;
  /** Row-scoped evaluator so drawer buttons apply per-row eligibility. */
  evaluateAction?: (
    action: 'CONFIGURE_RECOVERY_PLAN' | 'REQUEST_OVERPAYMENT_WAIVER' | 'OPEN_OVERPAYMENT',
    context: AwardActionContext,
  ) => AwardActionAvailability;
}

interface TabState extends Record<string, unknown> {
  search: string;
  status: string;
  method: string;
  detectedFrom: string;
  detectedTo: string;
  outstandingOnly: boolean;
  page: number;
  pageSize: number;
  sortBy: string;
  sortDir: string;
  selectedId: string;
}

const DEFAULTS: TabState = {
  search: '',
  status: 'ALL',
  method: 'ALL',
  detectedFrom: '',
  detectedTo: '',
  outstandingOnly: false,
  page: 1,
  pageSize: 25,
  sortBy: 'detectedDate',
  sortDir: 'desc',
  selectedId: '',
};

export const AwardOverpaymentsTab: React.FC<Props> = ({ awardId, canView, currency, actions }) => {
  const [state, setState] = useAward360UrlState<TabState>({
    prefix: 'overpayment',
    defaults: DEFAULTS,
    parsers: {
      page: (v) => Number(v) || 1,
      pageSize: (v) => Number(v) || 25,
      outstandingOnly: boolParser,
    },
    serializers: { outstandingOnly: boolSerializer },
  });
  const [localSearch, setLocalSearch] = useState(state.search);

  const query = useMemo(
    () => ({
      awardId,
      search: state.search || undefined,
      recoveryStatuses: state.status !== 'ALL' ? [state.status] : undefined,
      recoveryMethods: state.method !== 'ALL' ? [state.method] : undefined,
      detectedFrom: state.detectedFrom || undefined,
      detectedTo: state.detectedTo || undefined,
      outstandingOnly: state.outstandingOnly,
      page: state.page,
      pageSize: state.pageSize,
      sortBy: state.sortBy,
      sortDirection: state.sortDir as 'asc' | 'desc',
    }),
    [awardId, state],
  );

  const q = useAwardOverpaymentsPaged(query, canView);
  const detailQ = useAwardOverpaymentDetail(state.selectedId || null, canView);

  if (!canView)
    return <Award360PermissionState moduleLabel="Overpayments" permissionKey="bn_overpayments.view" />;

  const s = q.data?.summary;
  const recoveryPct = s && s.originalTotal > 0 ? (s.recoveredTotal / s.originalTotal) * 100 : 0;
  const metrics = s
    ? [
        { key: 'total', label: 'Cases', value: s.totalRows },
        { key: 'orig', label: 'Original', value: <AwardMoney value={s.originalTotal} currency={currency} /> },
        { key: 'rec', label: 'Recovered', value: <AwardMoney value={s.recoveredTotal} currency={currency} />, tone: 'ok' as const },
        { key: 'out', label: 'Outstanding', value: <AwardMoney value={s.outstandingTotal} currency={currency} />, tone: s.outstandingTotal > 0 ? ('breach' as const) : undefined },
        { key: 'pct', label: 'Recovery %', value: `${recoveryPct.toFixed(1)}%` },
        { key: 'open', label: 'Open cases', value: s.openCases, tone: s.openCases > 0 ? ('warn' as const) : undefined },
        { key: 'act', label: 'Active recovery', value: s.activeRecovery },
        { key: 'full', label: 'Fully recovered', value: s.fullyRecovered, tone: 'ok' as const },
        { key: 'susp', label: 'Suspended', value: s.suspendedRecovery, tone: s.suspendedRecovery > 0 ? ('warn' as const) : undefined },
        { key: 'wav', label: 'Waivers', value: s.waiverCases },
        { key: 'wof', label: 'Written off', value: s.writeOffCases },
        { key: 'age', label: 'Oldest open (days)', value: s.oldestOpenAgeDays ?? '—' },
      ]
    : [];

  const columns: Award360Column<AwardOverpaymentItem>[] = [
    { key: 'reference', label: 'Reference' },
    { key: 'detectedDate', label: 'Detected', sortAccessor: (r) => r.detectedDate, render: (r) => dt(r.detectedDate) },
    { key: 'periodFrom', label: 'Period from', sortAccessor: (r) => r.periodFrom, render: (r) => dt(r.periodFrom) },
    { key: 'periodTo', label: 'Period to', render: (r) => dt(r.periodTo) },
    { key: 'originalAmount', label: 'Original', align: 'right', sortAccessor: (r) => r.originalAmount, render: (r) => <AwardMoney value={r.originalAmount} currency={currency} /> },
    { key: 'recoveredAmount', label: 'Recovered', align: 'right', sortAccessor: (r) => r.recoveredAmount, render: (r) => <AwardMoney value={r.recoveredAmount} currency={currency} /> },
    { key: 'outstandingAmount', label: 'Outstanding', align: 'right', sortAccessor: (r) => r.outstandingAmount, render: (r) => <AwardMoney value={r.outstandingAmount} currency={currency} /> },
    {
      key: 'recPct',
      label: 'Rec %',
      align: 'right',
      render: (r) => {
        if (!r.originalAmount) return '—';
        return `${(((r.recoveredAmount ?? 0) / r.originalAmount) * 100).toFixed(1)}%`;
      },
    },
    { key: 'recoveryMethod', label: 'Method', sortAccessor: (r) => r.recoveryMethod },
    { key: 'recoveryStatus', label: 'Status', sortAccessor: (r) => r.recoveryStatus, render: (r) => <AwardStatusBadge status={r.recoveryStatus} tone={(r.outstandingAmount ?? 0) > 0 ? 'warn' : 'default'} /> },
    { key: 'reasonCode', label: 'Reason' },
  ];

  const reset = () => {
    setState({ search: '', status: 'ALL', method: 'ALL', detectedFrom: '', detectedTo: '', outstandingOnly: false, page: 1 });
    setLocalSearch('');
  };

  const selected = detailQ.data?.row ?? null;
  const sched = detailQ.data?.scheduleDeductions ?? [];

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Overpayments</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Award360MetricCards metrics={metrics as any} />
        {q.data?.warnings?.length ? <Award360PartialWarning warnings={q.data.warnings} /> : null}
        <Award360FilterBar
          search={localSearch}
          onSearch={(v) => { setLocalSearch(v); setState({ search: v, page: 1 }); }}
          searchPlaceholder="Reference, reason or remarks"
          filters={[
            { kind: 'select', key: 'st', label: 'Status', value: state.status, onChange: (v) => setState({ status: v, page: 1 }), options: STATUSES.map((v) => ({ value: v, label: v })) },
            { kind: 'select', key: 'mt', label: 'Method', value: state.method, onChange: (v) => setState({ method: v, page: 1 }), options: METHODS.map((v) => ({ value: v, label: v })) },
            { kind: 'date', key: 'df', label: 'Detected from', value: state.detectedFrom || undefined, onChange: (v) => setState({ detectedFrom: v ?? '', page: 1 }) },
            { kind: 'date', key: 'dt', label: 'Detected to', value: state.detectedTo || undefined, onChange: (v) => setState({ detectedTo: v ?? '', page: 1 }) },
            { kind: 'toggle', key: 'oo', label: 'Outstanding only', value: state.outstandingOnly, onChange: (v) => setState({ outstandingOnly: v, page: 1 }) },
          ]}
          onReset={reset}
        />
        <Award360DataTable
          rows={q.data?.rows ?? []}
          columns={columns}
          isLoading={q.isLoading}
          error={q.error}
          onRetry={() => q.refetch()}
          emptyTitle="No overpayments match the current filters"
          getRowKey={(r) => r.id}
          onRowClick={(r) => setState({ selectedId: r.id })}
          sortBy={state.sortBy}
          sortDirection={state.sortDir as 'asc' | 'desc'}
          onSortChange={(k, d) => setState({ sortBy: k, sortDir: d })}
        />
        {q.data ? (
          <Award360Pagination
            page={state.page}
            pageSize={state.pageSize}
            total={q.data.total}
            onPage={(p) => setState({ page: p })}
            onPageSize={(sz) => setState({ pageSize: sz, page: 1 })}
          />
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Award360ActionButton availability={actions.openOverpayment} label="Open Overpayment Recovery" />
          <Award360ActionButton availability={actions.configureRecoveryPlan} label="Configure Recovery Plan" />
          <Award360ActionButton availability={actions.requestWaiver} label="Request Waiver" />
        </div>

        <Award360DetailDrawer
          open={!!state.selectedId}
          onOpenChange={(v) => { if (!v) setState({ selectedId: '' }); }}
          title={selected?.reference ?? 'Overpayment'}
          subtitle={selected?.detectedDate ? `Detected ${dt(selected.detectedDate)}` : undefined}
          status={selected?.recoveryStatus ?? null}
          statusTone={(selected?.outstandingAmount ?? 0) > 0 ? 'warn' : 'default'}
          sections={selected ? [
            { key: 'liab', label: 'Liability', content: (
              <div>
                <KV label="Reference" value={selected.reference} />
                <KV label="Detected" value={dt(selected.detectedDate)} />
                <KV label="Period from" value={dt(selected.periodFrom)} />
                <KV label="Period to" value={dt(selected.periodTo)} />
                <KV label="Reason" value={selected.reasonCode} />
                <KV label="Original amount" value={<AwardMoney value={selected.originalAmount} currency={currency} />} />
                <KV label="Remarks" value={selected.remarks} />
              </div>
            )},
            { key: 'rec', label: 'Recovery', content: (
              <div>
                <KV label="Recovered" value={<AwardMoney value={selected.recoveredAmount} currency={currency} />} />
                <KV label="Outstanding" value={<AwardMoney value={selected.outstandingAmount} currency={currency} />} />
                <KV label="Method" value={selected.recoveryMethod} />
                <KV label="Status" value={selected.recoveryStatus} />
                <div className="mt-2 text-xs text-muted-foreground">Recovery plan and transaction detail rely on canonical services that are not available in this build.</div>
              </div>
            )},
            { key: 'sched', label: 'Related schedule deductions', content: sched.length ? (
              <div className="space-y-1">
                {sched.slice(0, 10).map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-xs">
                    <span>{d.schedulePeriod ?? dt(d.dueDate)}</span>
                    <span><AwardMoney value={d.deductions} currency={currency} /></span>
                    <AwardStatusBadge status={d.status} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">No schedule rows currently record deductions on this award.</div>
            )},
            { key: 'fin', label: 'Finance connection', content: (
              <div className="text-xs text-muted-foreground">
                Benefits owns the overpayment liability. Finance owns the receivable, allocation and ledger posting. No Finance references are currently exposed for this record.
              </div>
            )},
            { key: 'notice', label: 'Notices and approvals', content: (
              <div className="text-xs text-muted-foreground">
                Related notices, approvals and waiver/write-off workflow are viewed through Communication Hub and the workflow console.
              </div>
            )},
            ...(detailQ.data?.warnings?.length ? [{ key: 'warn', label: 'Warnings', content: <Award360PartialWarning warnings={detailQ.data.warnings} /> }] : []),
          ] : []}
          actions={
            <>
              <Award360ActionButton availability={actions.openOverpayment} label="Open in Recovery workspace" />
              <Award360ActionButton availability={actions.configureRecoveryPlan} label="Configure Plan" />
              <Award360ActionButton availability={actions.requestWaiver} label="Request Waiver" />
            </>
          }
        />
      </CardContent>
    </Card>
  );
};

export default AwardOverpaymentsTab;
