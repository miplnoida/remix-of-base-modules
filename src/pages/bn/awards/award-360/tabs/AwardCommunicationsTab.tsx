/**
 * BN-AWARD360-B2 — Communications tab.
 * Read-only workspace over bn_communication_log + best-effort bn_letter
 * enrichment. All operational actions delegate to Communication Hub. No
 * direct communication-table writes.
 */
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AwardStatusBadge, dt, KV } from '../components';
import { Award360DataTable, type Award360Column } from '../components/Award360DataTable';
import { Award360FilterBar } from '../components/Award360FilterBar';
import { Award360MetricCards } from '../components/Award360MetricCards';
import { Award360Pagination } from '../components/Award360Pagination';
import { Award360PermissionState } from '../components/Award360PermissionState';
import { Award360PartialWarning } from '../components/Award360PartialWarning';
import { Award360DetailDrawer } from '../components/Award360DetailDrawer';
import { Award360ActionButton } from '../components/Award360ActionButton';
import { useAwardCommunicationsPaged, useAwardCommunicationDetail } from '../useAward360Queries';
import { useAward360UrlState, boolParser, boolSerializer } from '../useAward360UrlState';
import type { AwardCommunicationItem } from '../viewModels';
import type { AwardActionAvailability, AwardActionContext } from '@/services/bn/awards/awardActionAvailability';

const CHANNELS = ['ALL', 'EMAIL', 'SMS', 'LETTER', 'IN_APP', 'PORTAL'];
const STATUSES = ['ALL', 'PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'RETRYING', 'SKIPPED'];
const RECIPIENT_TYPES = ['ALL', 'PENSIONER', 'BENEFICIARY', 'CONTACT', 'INTERNAL', 'THIRD_PARTY'];

export interface CommunicationActionSet {
  openCommunicationHub: AwardActionAvailability;
  openDeliveryMonitor: AwardActionAvailability;
  openRetryQueue: AwardActionAvailability;
  sendCommunication: AwardActionAvailability;
}

interface Props {
  awardId: string;
  canView: boolean;
  canViewContent?: boolean;
  actions: CommunicationActionSet;
  /** Row-scoped resolver — used to evaluate RETRY_COMMUNICATION per row. */
  evaluateAction: (action: 'RETRY_COMMUNICATION', context: AwardActionContext) => AwardActionAvailability;
}

interface TabState extends Record<string, unknown> {
  search: string;
  channel: string;
  status: string;
  recipientType: string;
  createdFrom: string;
  createdTo: string;
  failedOnly: boolean;
  hasLetter: string; // 'ANY' | 'YES' | 'NO'
  page: number;
  pageSize: number;
  sortBy: string;
  sortDir: string;
  selectedId: string;
}

const DEFAULTS: TabState = {
  search: '',
  channel: 'ALL',
  status: 'ALL',
  recipientType: 'ALL',
  createdFrom: '',
  createdTo: '',
  failedOnly: false,
  hasLetter: 'ANY',
  page: 1,
  pageSize: 25,
  sortBy: 'createdAt',
  sortDir: 'desc',
  selectedId: '',
};

export const AwardCommunicationsTab: React.FC<Props> = ({ awardId, canView, canViewContent, actions, evaluateAction }) => {
  const [state, setState] = useAward360UrlState<TabState>({
    prefix: 'communication',
    defaults: DEFAULTS,
    parsers: {
      page: (v) => Number(v) || 1,
      pageSize: (v) => Number(v) || 25,
      failedOnly: boolParser,
    },
    serializers: { failedOnly: boolSerializer },
  });
  const [localSearch, setLocalSearch] = useState(state.search);

  const query = useMemo(
    () => ({
      awardId,
      search: state.search || undefined,
      channels: state.channel !== 'ALL' ? [state.channel] : undefined,
      statuses: state.status !== 'ALL' ? [state.status] : undefined,
      recipientTypes: state.recipientType !== 'ALL' ? [state.recipientType] : undefined,
      createdFrom: state.createdFrom || undefined,
      createdTo: state.createdTo || undefined,
      failedOnly: state.failedOnly,
      hasLetter: state.hasLetter === 'YES' ? true : state.hasLetter === 'NO' ? false : undefined,
      page: state.page,
      pageSize: state.pageSize,
      sortBy: state.sortBy,
      sortDirection: state.sortDir as 'asc' | 'desc',
    }),
    [awardId, state],
  );

  const q = useAwardCommunicationsPaged(query, canView);
  const detailQ = useAwardCommunicationDetail(
    state.selectedId || null,
    { canViewContent: !!canViewContent },
    canView,
  );

  if (!canView)
    return <Award360PermissionState moduleLabel="Communications" permissionKey="bn_communications.view" />;

  const s = q.data?.summary;
  const metrics = s
    ? [
        { key: 'total', label: 'Total', value: s.totalRows },
        { key: 'queued', label: 'Queued', value: s.queued },
        { key: 'sent', label: 'Sent', value: s.sent, tone: 'ok' as const },
        { key: 'del', label: 'Delivered', value: s.delivered, tone: 'ok' as const },
        { key: 'fail', label: 'Failed', value: s.failed, tone: s.failed > 0 ? ('breach' as const) : undefined },
        { key: 'retry', label: 'Retrying', value: s.retrying, tone: s.retrying > 0 ? ('warn' as const) : undefined },
        { key: 'skip', label: 'Skipped', value: s.skipped, tone: s.skipped > 0 ? ('muted' as const) : undefined },
        { key: 'ld', label: 'Letters draft', value: s.lettersDraft },
        { key: 'lp', label: 'Letters pending approval', value: s.lettersPendingApproval },
        { key: 'lx', label: 'Letters dispatched', value: s.lettersDispatched, tone: 'ok' as const },
        { key: 'rb', label: 'Recipient blocks', value: s.recipientBlocks, tone: s.recipientBlocks > 0 ? ('warn' as const) : undefined },
        { key: 'na', label: 'Needs attention', value: s.needsAttention, tone: s.needsAttention > 0 ? ('breach' as const) : undefined },
      ]
    : [];

  const columns: Award360Column<AwardCommunicationItem>[] = [
    { key: 'createdAt', label: 'Date', sortAccessor: (r) => r.createdAt, render: (r) => dt(r.createdAt) },
    { key: 'eventCode', label: 'Event', sortAccessor: (r) => r.eventCode },
    { key: 'channel', label: 'Channel', sortAccessor: (r) => r.channel },
    { key: 'recipientType', label: 'Recipient type' },
    { key: 'recipientAddressMasked', label: 'Recipient' },
    { key: 'templateId', label: 'Template', render: (r) => r.templateId ? String(r.templateId).slice(0, 8) : '—' },
    { key: 'subject', label: 'Subject' },
    { key: 'status', label: 'Status', sortAccessor: (r) => r.status, render: (r) => <AwardStatusBadge status={r.status} tone={(r.status ?? '').toUpperCase() === 'FAILED' ? 'breach' : (r.status ?? '').toUpperCase() === 'PENDING' ? 'warn' : 'default'} /> },
    { key: 'retryCount', label: 'Retries', align: 'right', sortAccessor: (r) => r.retryCount },
    { key: 'lastRetryAt', label: 'Last retry', render: (r) => dt(r.lastRetryAt) },
    {
      key: 'flags',
      label: 'Flags',
      render: (r) => (
        <div className="flex flex-wrap gap-1 text-[10px]">
          {r.errorMessage ? <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-destructive">ERROR</span> : null}
          {r.letterId ? <span className="rounded bg-muted px-1.5 py-0.5">LETTER</span> : null}
          {r.correlationId ? <span className="rounded bg-muted px-1.5 py-0.5">TRACE</span> : null}
        </div>
      ),
    },
  ];

  const reset = () => {
    setState({ search: '', channel: 'ALL', status: 'ALL', recipientType: 'ALL', createdFrom: '', createdTo: '', failedOnly: false, hasLetter: 'ANY', page: 1 });
    setLocalSearch('');
  };

  const selected = detailQ.data?.row ?? null;
  const letter = detailQ.data?.letter ?? null;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Communications</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Award360MetricCards metrics={metrics as any} />
        {q.data?.warnings?.length ? <Award360PartialWarning warnings={q.data.warnings} /> : null}
        <Award360FilterBar
          search={localSearch}
          onSearch={(v) => { setLocalSearch(v); setState({ search: v, page: 1 }); }}
          searchPlaceholder="Subject, event, recipient or provider reference"
          filters={[
            { kind: 'select', key: 'ch', label: 'Channel', value: state.channel, onChange: (v) => setState({ channel: v, page: 1 }), options: CHANNELS.map((v) => ({ value: v, label: v })) },
            { kind: 'select', key: 'st', label: 'Status', value: state.status, onChange: (v) => setState({ status: v, page: 1 }), options: STATUSES.map((v) => ({ value: v, label: v })) },
            { kind: 'select', key: 'rt', label: 'Recipient type', value: state.recipientType, onChange: (v) => setState({ recipientType: v, page: 1 }), options: RECIPIENT_TYPES.map((v) => ({ value: v, label: v })) },
            { kind: 'select', key: 'hl', label: 'Has letter', value: state.hasLetter, onChange: (v) => setState({ hasLetter: v, page: 1 }), options: [{ value: 'ANY', label: 'ANY' }, { value: 'YES', label: 'YES' }, { value: 'NO', label: 'NO' }] },
            { kind: 'date', key: 'cf', label: 'Created from', value: state.createdFrom || undefined, onChange: (v) => setState({ createdFrom: v ?? '', page: 1 }) },
            { kind: 'date', key: 'ct', label: 'Created to', value: state.createdTo || undefined, onChange: (v) => setState({ createdTo: v ?? '', page: 1 }) },
            { kind: 'toggle', key: 'fo', label: 'Failed only', value: state.failedOnly, onChange: (v) => setState({ failedOnly: v, page: 1 }) },
          ]}
          onReset={reset}
        />
        <Award360DataTable
          rows={q.data?.rows ?? []}
          columns={columns}
          isLoading={q.isLoading}
          error={q.error}
          onRetry={() => q.refetch()}
          emptyTitle="No communications match the current filters"
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
          <Award360ActionButton availability={actions.openCommunicationHub} label="Open Communication Hub" />
          <Award360ActionButton availability={actions.openDeliveryMonitor} label="Delivery Monitor" />
          <Award360ActionButton availability={actions.openRetryQueue} label="Retry Queue" />
          <Award360ActionButton availability={actions.sendCommunication} label="Send Award Communication" />
        </div>

        <Award360DetailDrawer
          open={!!state.selectedId}
          onOpenChange={(v) => { if (!v) setState({ selectedId: '' }); }}
          title={selected?.subject ?? selected?.eventCode ?? 'Communication'}
          subtitle={selected?.createdAt ? dt(selected.createdAt) : undefined}
          status={selected?.status ?? null}
          statusTone={(selected?.status ?? '').toUpperCase() === 'FAILED' ? 'breach' : (selected?.status ?? '').toUpperCase() === 'PENDING' ? 'warn' : 'default'}
          sections={selected ? [
            { key: 'sum', label: 'Communication summary', content: (
              <div>
                <KV label="Event" value={selected.eventCode} />
                <KV label="Channel" value={selected.channel} />
                <KV label="Recipient type" value={selected.recipientType} />
                <KV label="Recipient" value={selected.recipientAddressMasked} />
                <KV label="Subject" value={selected.subject} />
                <KV label="Status" value={selected.status} />
                <KV label="Provider reference" value={selected.providerMessageId} />
                <KV label="Retries" value={selected.retryCount} />
                <KV label="Last retry" value={dt(selected.lastRetryAt)} />
                <KV label="Error" value={selected.errorMessage} />
              </div>
            )},
            { key: 'content', label: 'Content preview', content: canViewContent ? (
              letter?.renderedSubject || letter?.renderedBodyText ? (
                <div>
                  {letter.renderedSubject ? <div className="mb-2 text-sm font-medium">{letter.renderedSubject}</div> : null}
                  {letter.renderedBodyText ? <pre className="whitespace-pre-wrap text-xs">{letter.renderedBodyText}</pre> : null}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">No rendered snapshot stored for this record.</div>
              )
            ) : (
              <div className="text-xs text-muted-foreground">Content preview requires an additional permission.</div>
            )},
            { key: 'diag', label: 'Recipient diagnosis', content: (
              <div className="text-xs text-muted-foreground">
                {selected.recipientAddressMasked
                  ? 'Recipient address is on the log record. Detailed diagnostics rely on Communication Hub services and are not embedded here.'
                  : 'No recipient address recorded on the log row — recipient may have been blocked or missing.'}
              </div>
            )},
            { key: 'letter', label: 'Letter lifecycle', content: letter ? (
              <div>
                <KV label="Reference" value={letter.referenceNumber} />
                <KV label="Status" value={letter.status} />
                <KV label="Generated" value={dt(letter.generatedAt)} />
                <KV label="Approved" value={dt(letter.approvedAt)} />
                <KV label="Printed" value={dt(letter.printedAt)} />
                <KV label="Dispatched" value={dt(letter.dispatchedAt)} />
                <KV label="Delivered" value={dt(letter.deliveredAt)} />
                <KV label="Returned" value={dt(letter.returnedAt)} />
                <KV label="Cancelled" value={dt(letter.cancelledAt)} />
              </div>
            ) : selected.letterId ? (
              <div className="text-xs text-muted-foreground">Letter ID present but no letter record could be loaded.</div>
            ) : (
              <div className="text-xs text-muted-foreground">This communication has no letter record.</div>
            )},
            { key: 'trace', label: 'Correlation and trace', content: selected.correlationId ? (
              <div>
                <KV label="Correlation ID" value={selected.correlationId} />
                <a
                  className="text-xs text-primary underline"
                  href={`/admin/communication-hub/traces/${selected.correlationId}`}
                >
                  Open trace in Communication Hub
                </a>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">No correlation ID recorded for this row.</div>
            )},
            ...(detailQ.data?.warnings?.length ? [{ key: 'warn', label: 'Warnings', content: <Award360PartialWarning warnings={detailQ.data.warnings} /> }] : []),
          ] : []}
          actions={
            <>
              <Award360ActionButton availability={actions.openCommunicationHub} label="Open Communication Hub" />
              <Award360ActionButton availability={actions.openRetryQueue} label="Retry Queue" />
              {selected ? (
                <Award360ActionButton
                  availability={evaluateAction('RETRY_COMMUNICATION', { communicationStatus: selected.status })}
                  label="Retry Communication"
                />
              ) : null}
            </>
          }
        />
      </CardContent>
    </Card>
  );
};

export default AwardCommunicationsTab;
