/**
 * BN-AWARD360-B2 — Beneficiaries tab.
 * Read-only workspace. Canonical mapping of bn_award_beneficiary rows with
 * validation resolver, summary metrics, filters, sorting, pagination, drawer
 * and canonical navigation actions. No direct beneficiary mutations.
 */
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { AwardMoney, AwardStatusBadge, dt, KV } from '../components';
import { Award360DataTable, type Award360Column } from '../components/Award360DataTable';
import { Award360FilterBar } from '../components/Award360FilterBar';
import { Award360MetricCards } from '../components/Award360MetricCards';
import { Award360Pagination } from '../components/Award360Pagination';
import { Award360PermissionState } from '../components/Award360PermissionState';
import { Award360PartialWarning } from '../components/Award360PartialWarning';
import { Award360DetailDrawer } from '../components/Award360DetailDrawer';
import { Award360ActionButton } from '../components/Award360ActionButton';
import { useAwardBeneficiariesPaged, useAwardBeneficiaryDetail } from '../useAward360Queries';
import { useAward360UrlState, boolParser, boolSerializer } from '../useAward360UrlState';
import type { AwardBeneficiaryItem } from '../viewModels';
import type { AwardActionAvailability, AwardActionContext, AwardActionKey } from '@/services/bn/awards/awardActionAvailability';

const STATUSES = ['ALL', 'ACTIVE', 'INACTIVE', 'ENDED', 'PENDING'];
const RELATIONSHIPS = ['ALL', 'SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'DEPENDENT', 'OTHER'];

/**
 * Top-level (non row-scoped) actions used in the tab header — these do not
 * require a selected beneficiary. Row-scoped actions (amend/end/person360/
 * payment-profile) are evaluated via `evaluateAction` against the selected
 * row context.
 */
interface BeneficiaryActionSet {
  openSurvivorsWorkspace: AwardActionAvailability;
  addBeneficiary: AwardActionAvailability;
}

interface Props {
  awardId: string;
  canView: boolean;
  currency?: string | null;
  award?: { baseAmount?: number | null; awardType?: string | null } | null;
  actions: BeneficiaryActionSet;
  evaluateAction: (action: AwardActionKey, context: AwardActionContext) => AwardActionAvailability;
}

interface TabState extends Record<string, unknown> {
  search: string;
  status: string;
  relationship: string;
  activeOn: string;
  missing: boolean;
  expired: boolean;
  warn: boolean;
  page: number;
  pageSize: number;
  sortBy: string;
  sortDir: string;
  selectedId: string;
}

const DEFAULTS: TabState = {
  search: '',
  status: 'ALL',
  relationship: 'ALL',
  activeOn: '',
  missing: false,
  expired: false,
  warn: false,
  page: 1,
  pageSize: 25,
  sortBy: 'startDate',
  sortDir: 'desc',
  selectedId: '',
};

export const AwardBeneficiariesTab: React.FC<Props> = ({ awardId, canView, currency, award, actions }) => {
  const [state, setState] = useAward360UrlState<TabState>({
    prefix: 'beneficiary',
    defaults: DEFAULTS,
    parsers: {
      page: (v) => Number(v) || 1,
      pageSize: (v) => Number(v) || 25,
      missing: boolParser,
      expired: boolParser,
      warn: boolParser,
    },
    serializers: {
      missing: boolSerializer,
      expired: boolSerializer,
      warn: boolSerializer,
    },
  });
  const [localSearch, setLocalSearch] = useState(state.search);

  const query = useMemo(
    () => ({
      awardId,
      search: state.search || undefined,
      statuses: state.status !== 'ALL' ? [state.status] : undefined,
      relationships: state.relationship !== 'ALL' ? [state.relationship] : undefined,
      activeOn: state.activeOn || undefined,
      missingPaymentProfileOnly: state.missing,
      expiredOnly: state.expired,
      hasWarningsOnly: state.warn,
      page: state.page,
      pageSize: state.pageSize,
      sortBy: state.sortBy,
      sortDirection: state.sortDir as 'asc' | 'desc',
    }),
    [awardId, state],
  );

  const q = useAwardBeneficiariesPaged(query, award ?? null, canView);
  const detailQ = useAwardBeneficiaryDetail(state.selectedId || null, canView);

  if (!canView)
    return <Award360PermissionState moduleLabel="Beneficiaries" permissionKey="bn_awards.view" />;

  const s = q.data?.summary;
  const metrics = s
    ? [
        { key: 'total', label: 'Total', value: s.totalRows },
        { key: 'active', label: 'Active', value: s.activeCount, tone: 'ok' as const },
        { key: 'inactive', label: 'Inactive/Ended', value: s.inactiveCount, tone: 'muted' as const },
        {
          key: 'pct',
          label: 'Active share %',
          value: `${s.totalSharePercent.toFixed(2)}%`,
          tone: (s.overallocatedPercent > 0
            ? 'breach'
            : s.unallocatedPercent > 0.01 && s.activeCount
              ? 'warn'
              : 'ok') as 'ok' | 'warn' | 'breach',
        },
        { key: 'amt', label: 'Active share amount', value: <AwardMoney value={s.totalShareAmount} currency={currency} /> },
        {
          key: 'un',
          label: 'Unallocated %',
          value: `${s.unallocatedPercent.toFixed(2)}%`,
          tone: s.unallocatedPercent > 0.01 ? ('warn' as const) : undefined,
        },
        {
          key: 'ov',
          label: 'Overallocated %',
          value: `${s.overallocatedPercent.toFixed(2)}%`,
          tone: s.overallocatedPercent > 0.01 ? ('breach' as const) : undefined,
        },
        { key: 'exp', label: 'Expired', value: s.expiredCount, tone: s.expiredCount > 0 ? ('warn' as const) : undefined },
        {
          key: 'mp',
          label: 'Missing payment info',
          value: s.missingPaymentDetails,
          tone: s.missingPaymentDetails > 0 ? ('warn' as const) : undefined,
        },
        {
          key: 'vw',
          label: 'With warnings',
          value: s.withValidationWarnings,
          tone: s.withValidationWarnings > 0 ? ('warn' as const) : undefined,
        },
      ]
    : [];

  const columns: Award360Column<AwardBeneficiaryItem>[] = [
    { key: 'fullName', label: 'Name', sortAccessor: (r) => r.fullName },
    { key: 'ssnMasked', label: 'SSN' },
    { key: 'relationship', label: 'Relationship', sortAccessor: (r) => r.relationship },
    { key: 'sharePercent', label: 'Share %', align: 'right', sortAccessor: (r) => r.sharePercent, render: (r) => (r.sharePercent != null ? `${r.sharePercent}%` : '—') },
    { key: 'shareAmount', label: 'Amount', align: 'right', sortAccessor: (r) => r.shareAmount, render: (r) => <AwardMoney value={r.shareAmount} currency={currency} /> },
    { key: 'startDate', label: 'Start', sortAccessor: (r) => r.startDate, render: (r) => dt(r.startDate) },
    { key: 'endDate', label: 'End', sortAccessor: (r) => r.endDate, render: (r) => dt(r.endDate) },
    { key: 'status', label: 'Status', sortAccessor: (r) => r.status, render: (r) => <AwardStatusBadge status={r.status} tone={(r.status ?? '').toUpperCase() === 'ACTIVE' ? 'default' : 'warn'} /> },
    { key: 'bankAccountMasked', label: 'Account' },
    { key: 'bankCode', label: 'Bank' },
    {
      key: 'flags',
      label: 'Flags',
      render: (r) => (
        <div className="flex flex-wrap gap-1 text-[10px]">
          {r.isExpired ? <span className="rounded bg-muted px-1.5 py-0.5">EXPIRED</span> : null}
          {!r.hasPaymentDetails ? <span className="rounded bg-yellow-500/20 px-1.5 py-0.5">NO PAY INFO</span> : null}
          {r.validationKeys.length ? (
            <span className="flex items-center gap-1 rounded bg-destructive/15 px-1.5 py-0.5 text-destructive">
              <AlertTriangle className="h-3 w-3" />
              {r.validationKeys.length}
            </span>
          ) : null}
        </div>
      ),
    },
    { key: 'modifiedAt', label: 'Modified', sortAccessor: (r) => r.modifiedAt, render: (r) => dt(r.modifiedAt) },
  ];

  const reset = () => {
    setState({
      search: '', status: 'ALL', relationship: 'ALL', activeOn: '',
      missing: false, expired: false, warn: false, page: 1,
    });
    setLocalSearch('');
  };

  const selected = detailQ.data?.row ?? null;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Beneficiaries</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Award360MetricCards metrics={metrics as any} />
        {q.data?.warnings?.length ? <Award360PartialWarning warnings={q.data.warnings} /> : null}
        {s?.validation?.warnings?.length ? (
          <div className="space-y-1">
            {s.validation.warnings.slice(0, 6).map((w, i) => (
              <div
                key={i}
                className={`rounded-md border p-2 text-xs ${
                  w.severity === 'ERROR'
                    ? 'border-destructive/50 bg-destructive/10 text-destructive'
                    : w.severity === 'WARNING'
                      ? 'border-yellow-500/50 bg-yellow-500/10'
                      : 'border-muted bg-muted/40'
                }`}
              >
                <span className="font-medium">{w.severity}</span> · {w.message}
              </div>
            ))}
          </div>
        ) : null}
        <Award360FilterBar
          search={localSearch}
          onSearch={(v) => { setLocalSearch(v); setState({ search: v, page: 1 }); }}
          searchPlaceholder="Name, masked SSN or relationship"
          filters={[
            { kind: 'select', key: 'st', label: 'Status', value: state.status, onChange: (v) => setState({ status: v, page: 1 }), options: STATUSES.map((v) => ({ value: v, label: v })) },
            { kind: 'select', key: 'rel', label: 'Relationship', value: state.relationship, onChange: (v) => setState({ relationship: v, page: 1 }), options: RELATIONSHIPS.map((v) => ({ value: v, label: v })) },
            { kind: 'date', key: 'ao', label: 'Active on', value: state.activeOn || undefined, onChange: (v) => setState({ activeOn: v ?? '', page: 1 }) },
            { kind: 'toggle', key: 'mp', label: 'Missing payment info', value: state.missing, onChange: (v) => setState({ missing: v, page: 1 }) },
            { kind: 'toggle', key: 'ex', label: 'Expired only', value: state.expired, onChange: (v) => setState({ expired: v, page: 1 }) },
            { kind: 'toggle', key: 'wn', label: 'Has warning', value: state.warn, onChange: (v) => setState({ warn: v, page: 1 }) },
          ]}
          onReset={reset}
        />
        <Award360DataTable
          rows={q.data?.rows ?? []}
          columns={columns}
          isLoading={q.isLoading}
          error={q.error}
          onRetry={() => q.refetch()}
          emptyTitle="No beneficiaries match the current filters"
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
          <Award360ActionButton availability={actions.openSurvivorsWorkspace} label="Open Survivors Processing" />
          <Award360ActionButton availability={actions.addBeneficiary} label="Add Beneficiary" />
          <Award360ActionButton availability={actions.amendBeneficiary} label="Amend Beneficiary" />
          <Award360ActionButton availability={actions.endBeneficiary} label="End Beneficiary" />
        </div>

        <Award360DetailDrawer
          open={!!state.selectedId}
          onOpenChange={(v) => { if (!v) setState({ selectedId: '' }); }}
          title={selected?.fullName ?? 'Beneficiary'}
          subtitle={selected?.relationship ?? undefined}
          status={selected?.status ?? null}
          statusTone={(selected?.status ?? '').toUpperCase() === 'ACTIVE' ? 'default' : 'warn'}
          sections={selected ? [
            { key: 'id', label: 'Identity', content: (
              <div>
                <KV label="Full name" value={selected.fullName} />
                <KV label="SSN" value={selected.ssnMasked} />
                <KV label="Relationship" value={selected.relationship} />
                <KV label="Status" value={selected.status} />
              </div>
            )},
            { key: 'alloc', label: 'Allocation', content: (
              <div>
                <KV label="Share %" value={selected.sharePercent != null ? `${selected.sharePercent}%` : null} />
                <KV label="Amount" value={<AwardMoney value={selected.shareAmount} currency={currency} />} />
                <KV label="Start" value={dt(selected.startDate)} />
                <KV label="End" value={dt(selected.endDate)} />
                <KV label="Expired" value={selected.isExpired ? 'Yes' : 'No'} />
              </div>
            )},
            { key: 'pay', label: 'Payment information', content: (
              <div>
                <KV label="Account" value={selected.bankAccountMasked} />
                <KV label="Bank" value={selected.bankCode} />
                <KV label="Has payment details" value={selected.hasPaymentDetails ? 'Yes' : 'No'} />
              </div>
            )},
            { key: 'audit', label: 'Record metadata', content: (
              <div>
                <KV label="Entered by" value={selected.enteredBy} />
                <KV label="Entered at" value={dt(selected.enteredAt)} />
                <KV label="Modified by" value={selected.modifiedBy} />
                <KV label="Modified at" value={dt(selected.modifiedAt)} />
                <KV label="Notes" value={selected.notes} />
              </div>
            )},
            ...(detailQ.data?.warnings?.length ? [{ key: 'warn', label: 'Warnings', content: <Award360PartialWarning warnings={detailQ.data.warnings} /> }] : []),
          ] : []}
          actions={
            <>
              <Award360ActionButton availability={actions.openSurvivorsWorkspace} label="Open in Survivors Processing" />
              <Award360ActionButton availability={actions.openPerson360} label="Open Person 360" />
              <Award360ActionButton availability={actions.openPaymentProfile} label="Open Payment Profile" />
              <Award360ActionButton availability={actions.amendBeneficiary} label="Amend" />
              <Award360ActionButton availability={actions.endBeneficiary} label="End" />
            </>
          }
        />
      </CardContent>
    </Card>
  );
};

export default AwardBeneficiariesTab;
