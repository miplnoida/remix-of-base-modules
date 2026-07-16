/**
 * BN-AWARD360-B4B — Audit Timeline operational read-only workspace.
 *
 * Canonical read-only sources:
 *   - bn_award_status_event  (status changes)
 *   - bn_award_rate_history  (rate/currency changes)
 *   - bn_award_suspension_event (suspension lifecycle; canonical actor
 *     resolution: proposed_by_user_id ?? entered_by)
 *   - core_audit_log         (central audit, gated by CENTRAL_AUDIT_VIEW)
 *
 * The tab uses the shared Award 360 workspace components (metric cards,
 * filter bar, data table, pagination, detail drawer). Filters and pagination
 * live in the Award 360 URL state under the `audit` prefix. Export is a
 * navigation-only action to the canonical Audit History workspace via the
 * centrally-evaluated `EXPORT_AUDIT` availability.
 */
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { dt, KV } from '../components';
import { Award360DataTable, type Award360Column } from '../components/Award360DataTable';
import { Award360FilterBar } from '../components/Award360FilterBar';
import { Award360MetricCards } from '../components/Award360MetricCards';
import { Award360Pagination } from '../components/Award360Pagination';
import { Award360PermissionState } from '../components/Award360PermissionState';
import { Award360PartialWarning } from '../components/Award360PartialWarning';
import { Award360DetailDrawer } from '../components/Award360DetailDrawer';
import { Award360ActionButton } from '../components/Award360ActionButton';
import { useAwardAuditPaged } from '../useAward360Queries';
import { useAward360UrlState } from '../useAward360UrlState';
import type { AwardAuditItem } from '../viewModels';
import type { AwardActionAvailability } from '@/services/bn/awards/awardActionAvailability';

const SEVERITIES_FALLBACK = ['info', 'warn', 'error', 'breach'];

interface Props {
  awardId: string;
  canView: boolean;
  canViewCentralAudit: boolean;
  exportAction: AwardActionAvailability;
}

interface TabState extends Record<string, unknown> {
  search: string;
  domain: string;
  severity: string;
  correlationId: string;
  actionFilter: string;
  from: string;
  to: string;
  page: number;
  pageSize: number;
  sortDir: string;
  selectedId: string;
}

const DEFAULTS: TabState = {
  search: '',
  domain: 'ALL',
  severity: 'ALL',
  correlationId: '',
  actionFilter: '',
  from: '',
  to: '',
  page: 1,
  pageSize: 25,
  sortDir: 'desc',
  selectedId: '',
};

export const AwardAuditTab: React.FC<Props> = ({
  awardId,
  canView,
  canViewCentralAudit,
  exportAction,
}) => {
  const [state, setState] = useAward360UrlState<TabState>({
    prefix: 'audit',
    defaults: DEFAULTS,
    parsers: {
      page: (v) => Number(v) || 1,
      pageSize: (v) => Number(v) || 25,
    },
  });
  const [localSearch, setLocalSearch] = useState(state.search);

  const query = useMemo(
    () => ({
      awardId,
      search: state.search || undefined,
      domains: state.domain !== 'ALL' ? [state.domain] : undefined,
      severities: state.severity !== 'ALL' ? [state.severity] : undefined,
      correlationId: state.correlationId || undefined,
      actions: state.actionFilter && state.actionFilter !== 'ALL' ? [state.actionFilter] : undefined,
      from: state.from || undefined,
      to: state.to || undefined,
      page: state.page,
      pageSize: state.pageSize,
      sortDirection: state.sortDir as 'asc' | 'desc',
    }),
    [awardId, state],
  );

  const q = useAwardAuditPaged(query, { includeCentralAudit: canViewCentralAudit }, canView);

  if (!canView) {
    return <Award360PermissionState moduleLabel="Audit timeline" permissionKey="bn_audit_history.view" />;
  }

  const s = q.data?.summary;
  const metrics = s
    ? [
        { key: 'total', label: 'Total events', value: s.totalRows },
        { key: 'status', label: 'Status', value: s.statusEvents },
        { key: 'rate', label: 'Rate', value: s.rateEvents },
        {
          key: 'susp',
          label: 'Suspension',
          value: s.suspensionEvents,
          tone: s.suspensionEvents > 0 ? ('warn' as const) : undefined,
        },
        { key: 'central', label: 'Central audit', value: s.centralAuditEvents },
        {
          key: 'warn',
          label: 'Warnings',
          value: s.warnEvents,
          tone: s.warnEvents > 0 ? ('warn' as const) : undefined,
        },
        { key: 'cid', label: 'With correlation', value: s.eventsWithCorrelation },
      ]
    : [];

  const columns: Award360Column<AwardAuditItem>[] = [
    { key: 'timestamp', label: 'When', render: (r) => dt(r.timestamp) },
    { key: 'domain', label: 'Domain' },
    { key: 'action', label: 'Action' },
    { key: 'actor', label: 'Actor', render: (r) => r.actor ?? '—' },
    { key: 'fromValue', label: 'From', render: (r) => r.fromValue ?? '—' },
    { key: 'toValue', label: 'To', render: (r) => r.toValue ?? '—' },
    { key: 'reason', label: 'Reason', render: (r) => r.reason ?? '—' },
    { key: 'severity', label: 'Severity', render: (r) => r.severity ?? 'info' },
    { key: 'correlationId', label: 'Correlation', render: (r) => r.correlationId ?? '—' },
  ];

  const rows = q.data?.rows ?? [];
  const facets = q.data?.facets ?? { domains: [], actions: [], severities: [] };
  const selected = state.selectedId
    ? rows.find((r) => r.id === state.selectedId) ?? null
    : null;

  const domainOptions = useMemo(
    () => [{ value: 'ALL', label: 'All' }, ...facets.domains.map((v) => ({ value: v, label: v }))],
    [facets.domains],
  );
  const severityOptions = useMemo(() => {
    const list = facets.severities.length ? facets.severities : SEVERITIES_FALLBACK;
    return [{ value: 'ALL', label: 'All' }, ...list.map((v) => ({ value: v, label: v }))];
  }, [facets.severities]);
  const actionOptions = useMemo(
    () => [{ value: 'ALL', label: 'All' }, ...facets.actions.map((v) => ({ value: v, label: v }))],
    [facets.actions],
  );

  // BN-AWARD360-B4B-C1 — clear an open detail drawer when filters change so we
  // never leave the drawer showing a row that has been filtered out.
  const clearSelection = () => {
    if (state.selectedId) setState({ selectedId: '' });
  };

  const reset = () => {
    setState({
      search: '',
      domain: 'ALL',
      severity: 'ALL',
      correlationId: '',
      actionFilter: '',
      from: '',
      to: '',
      page: 1,
      selectedId: '',
    });
    setLocalSearch('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Audit timeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Award360MetricCards metrics={metrics as any} />
        {q.data?.warnings?.length ? <Award360PartialWarning warnings={q.data.warnings} /> : null}
        <Award360FilterBar
          search={localSearch}
          onSearch={(v) => {
            setLocalSearch(v);
            clearSelection();
            setState({ search: v, page: 1 });
          }}
          searchPlaceholder="Search actor, reason, action or value"
          filters={[
            {
              kind: 'select',
              key: 'dom',
              label: 'Domain',
              value: state.domain,
              onChange: (v) => {
                clearSelection();
                setState({ domain: v, page: 1 });
              },
              options: domainOptions,
            },
            {
              kind: 'select',
              key: 'act',
              label: 'Action',
              value: state.actionFilter || 'ALL',
              onChange: (v) => {
                clearSelection();
                setState({ actionFilter: v === 'ALL' ? '' : v, page: 1 });
              },
              options: actionOptions,
            },
            {
              kind: 'select',
              key: 'sev',
              label: 'Severity',
              value: state.severity,
              onChange: (v) => {
                clearSelection();
                setState({ severity: v, page: 1 });
              },
              options: severityOptions,
            },
            {
              kind: 'date',
              key: 'from',
              label: 'From',
              value: state.from || undefined,
              onChange: (v) => {
                clearSelection();
                setState({ from: v ?? '', page: 1 });
              },
            },
            {
              kind: 'date',
              key: 'to',
              label: 'To',
              value: state.to || undefined,
              onChange: (v) => {
                clearSelection();
                setState({ to: v ?? '', page: 1 });
              },
            },
          ]}
          onReset={reset}
        />
        <div className="flex max-w-xs flex-col gap-1">
          <label className="text-[11px] uppercase text-muted-foreground" htmlFor="audit-correlation-id">
            Correlation ID
          </label>
          <Input
            id="audit-correlation-id"
            aria-label="Correlation ID"
            placeholder="Partial match…"
            value={state.correlationId}
            onChange={(e) => {
              clearSelection();
              setState({ correlationId: e.target.value, page: 1 });
            }}
          />
        </div>
        <Award360DataTable
          rows={rows}
          columns={columns}
          isLoading={q.isLoading}
          error={q.error}
          onRetry={() => q.refetch()}
          emptyTitle="No audit events match the current filters"
          getRowKey={(r) => r.id}
          onRowClick={(r) => setState({ selectedId: r.id })}
          sortBy="timestamp"
          sortDirection={state.sortDir as 'asc' | 'desc'}
          onSortChange={(_k, d) => setState({ sortDir: d })}
        />
        {q.data ? (
          <Award360Pagination
            page={state.page}
            pageSize={state.pageSize}
            total={q.data.total}
            onPage={(p) => setState({ page: p })}
            onPageSize={(sz) => {
              clearSelection();
              setState({ pageSize: sz, page: 1 });
            }}
          />
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Award360ActionButton availability={exportAction} label="Open Audit History" />
        </div>

        <Award360DetailDrawer
          open={!!state.selectedId && !!selected}
          onOpenChange={(v) => {
            if (!v) setState({ selectedId: '' });
          }}
          title={selected?.action ?? 'Audit event'}
          subtitle={selected?.timestamp ? dt(selected.timestamp) : undefined}
          status={selected?.severity ?? null}
          statusTone={
            String(selected?.severity ?? '').toLowerCase() === 'warn' ||
            String(selected?.severity ?? '').toLowerCase() === 'warning'
              ? 'warn'
              : 'default'
          }
          sections={
            selected
              ? [
                  {
                    key: 'event',
                    label: 'Event',
                    content: (
                      <div>
                        <KV label="When" value={dt(selected.timestamp)} />
                        <KV label="Domain" value={selected.domain} />
                        <KV label="Action" value={selected.action} />
                        <KV label="Actor" value={selected.actor} />
                        <KV label="Severity" value={selected.severity} />
                        <KV label="Correlation ID" value={selected.correlationId} />
                      </div>
                    ),
                  },
                  {
                    key: 'change',
                    label: 'Change',
                    content: (
                      <div>
                        <KV label="From" value={selected.fromValue} />
                        <KV label="To" value={selected.toValue} />
                        <KV label="Reason" value={selected.reason} />
                      </div>
                    ),
                  },
                  {
                    key: 'source',
                    label: 'Source',
                    content: (
                      <div>
                        <KV label="Source table" value={selected.sourceTable ?? null} />
                        <KV label="Source record ID" value={selected.sourceRecordId ?? null} />
                      </div>
                    ),
                  },
                ]
              : []
          }
          actions={<Award360ActionButton availability={exportAction} label="Open Audit History" />}
        />
      </CardContent>
    </Card>
  );
};

export default AwardAuditTab;
