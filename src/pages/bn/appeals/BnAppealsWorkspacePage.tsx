/**
 * BN Appeals & Disputes — Read-only enterprise dashboard.
 *
 * BN-AP-01 §D — Replaces the pilot notice with a real dashboard driven by
 * BN_APPEAL_GET_SUMMARY (twelve cards + total open) and BN_APPEAL_LIST
 * (paged worklist with server-side filters, sort, and search).
 *
 * Staff commands remain disabled (`actions_enabled=false`); rows are
 * navigable to `/bn/appeals/:appealId` but the row-level Execute buttons
 * live on the 360 workspace delivered in Slice 2.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useBenefitsQuery } from '@/hooks/bn/queries/useBenefitsQuery';
import { BnModuleRouteGate, type BnModuleAccessContext } from '@/components/bn/access/BnModuleRouteGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, ShieldAlert, Filter, ArrowUpRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  BenefitsQueryExecutionError,
  isBenefitsQueryExecutionError,
} from '@/services/bn/queries/benefitsQueryExecutionError';

// ── Summary DTO shape (mirrors edge function §C) ────────────────────────
interface AppealSummaryDto {
  newSubmissions: number;
  acknowledgementOverdue: number;
  lateFilingReview: number;
  admissibilityReview: number;
  unassigned: number;
  evidenceOutstanding: number;
  hearingToSchedule: number;
  recommendationPending: number;
  decisionPending: number;
  implementationPending: number;
  legalReferrals: number;
  slaBreached: number;
  totalOpen: number;
}

interface AppealRowDto {
  id: string;
  appealNumber: string;
  appellantName: string | null;
  claimantSsnMasked: string | null;
  sourceReference: string | null;
  sourceModule: string | null;
  appealType: string | null;
  caseKind: string | null;
  reviewLevel: string | null;
  channel: string | null;
  submittedAt: string | null;
  filingDeadlineDate: string | null;
  lateFilingStatus: string | null;
  status: string;
  outcome: string | null;
  assignedToUserId: string | null;
  assignedWorkbasket: string | null;
  hearingRequired: boolean;
  slaStatus: 'OK' | 'BREACHED';
  nextAction: string;
}

const CARDS: { key: keyof AppealSummaryDto; label: string; tone?: 'default' | 'warn' | 'danger' }[] = [
  { key: 'newSubmissions',          label: 'New submissions (7d)' },
  { key: 'acknowledgementOverdue',  label: 'Acknowledgement overdue', tone: 'warn' },
  { key: 'lateFilingReview',        label: 'Late filing review' },
  { key: 'admissibilityReview',     label: 'Admissibility review' },
  { key: 'unassigned',              label: 'Unassigned', tone: 'warn' },
  { key: 'evidenceOutstanding',     label: 'Evidence outstanding' },
  { key: 'hearingToSchedule',       label: 'Hearing to schedule' },
  { key: 'recommendationPending',   label: 'Recommendation pending' },
  { key: 'decisionPending',         label: 'Decision pending' },
  { key: 'implementationPending',   label: 'Implementation pending' },
  { key: 'legalReferrals',          label: 'Legal referrals' },
  { key: 'slaBreached',             label: 'SLA breached', tone: 'danger' },
];

const STATUS_OPTIONS = [
  'SUBMITTED','ACKNOWLEDGED','ADMISSIBILITY_REVIEW','ADMISSIBLE','CASE_PREPARATION',
  'HEARING_SCHEDULED','HEARING_HELD','RECOMMENDED','DECIDED','IMPLEMENTATION_PENDING',
  'PARTIALLY_IMPLEMENTED','IMPLEMENTED','WITHDRAWN','CANCELLED','INADMISSIBLE',
  'REFERRED_TO_LEGAL','CLOSED',
];

export default function BnAppealsWorkspacePage() {
  return (
    <BnModuleRouteGate moduleCode="bn_appeals" requiredAction="view">
      {(ctx: BnModuleAccessContext) => <AppealsDashboard ctx={ctx} />}
    </BnModuleRouteGate>
  );
}

function AppealsDashboard({ ctx }: { ctx: BnModuleAccessContext }) {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [slaFilter, setSlaFilter] = React.useState<string>('all');
  const [assignmentFilter, setAssignmentFilter] = React.useState<string>('all');
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(0);
  const pageSize = 25;

  const filters = React.useMemo(() => {
    const f: Record<string, unknown> = {};
    if (statusFilter !== 'all') f.status = statusFilter;
    if (slaFilter === 'breached') f.slaStatus = 'BREACHED';
    if (assignmentFilter === 'unassigned') f.unassignedOnly = true;
    if (search.trim().length > 0) f.search = search.trim();
    return f;
  }, [statusFilter, slaFilter, assignmentFilter, search]);

  const summaryQ = useBenefitsQuery<Record<string, never>, AppealSummaryDto>({
    queryCode: 'BN_APPEAL_GET_SUMMARY',
    moduleCode: 'bn_appeals',
    params: {},
    pageSize: 1,
  });

  const listQ = useBenefitsQuery<{ filters: unknown; sort: unknown }, AppealRowDto[]>({
    queryCode: 'BN_APPEAL_LIST',
    moduleCode: 'bn_appeals',
    params: { filters, sort: { field: 'submittedAt', direction: 'desc' } },
    pageSize,
    pageToken: page > 0 ? String(page * pageSize) : null,
  });

  const resetFilters = () => {
    setStatusFilter('all');
    setSlaFilter('all');
    setAssignmentFilter('all');
    setSearch('');
    setPage(0);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb + heading */}
      <div>
        <p className="text-xs text-muted-foreground">
          Benefit Management → Benefit Operations → Appeals &amp; Disputes
        </p>
        <div className="mt-1 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Appeals &amp; Disputes</h1>
            <p className="text-sm text-muted-foreground">
              Operational worklist for appeals against benefit decisions. Read-only pilot — action execution is disabled.
            </p>
          </div>
          <Button variant="default" onClick={() => navigate('/bn/appeals/new')} disabled>
            New Appeal
          </Button>
        </div>
        {!ctx.actionsEnabled && (
          <Alert className="mt-3">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Internal pilot — actions disabled</AlertTitle>
            <AlertDescription>
              Staff commands remain disabled while Slice 2 (wizard, 360 tabs, mutation handlers) is delivered.
              You can browse, filter and drill into appeals; execution controls will remain greyed until promotion.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Summary cards */}
      <SummaryCards q={summaryQ} />

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Status</label>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
                <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">SLA</label>
              <Select value={slaFilter} onValueChange={(v) => { setSlaFilter(v); setPage(0); }}>
                <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any</SelectItem>
                  <SelectItem value="breached">Breached only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Assignment</label>
              <Select value={assignmentFilter} onValueChange={(v) => { setAssignmentFilter(v); setPage(0); }}>
                <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any</SelectItem>
                  <SelectItem value="unassigned">Unassigned only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Search appeal number</label>
              <div className="flex gap-2">
                <Input
                  aria-label="Search appeal number"
                  placeholder="APL-…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setPage(0); }}
                />
                <Button variant="ghost" size="sm" onClick={resetFilters}>Reset</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Worklist */}
      <Worklist q={listQ} page={page} pageSize={pageSize} onPage={setPage} onOpen={(id) => navigate(`/bn/appeals/${id}`)} />
    </div>
  );
}

function SummaryCards({ q }: { q: ReturnType<typeof useBenefitsQuery<Record<string, never>, AppealSummaryDto>> }) {
  if (q.isLoading || q.isPending) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        {CARDS.map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }
  // A: Any non-OK envelope surfaces via BenefitsQueryExecutionError; we MUST
  // avoid rendering zero-valued cards on DENIED/INVALID/FAILED/TRANSPORT/MALFORMED.
  if (q.isError && isBenefitsQueryExecutionError(q.error)) {
    return <QueryStatusBanner err={q.error} onRetry={() => q.refetch()} />;
  }
  const summary = q.data?.data as AppealSummaryDto | null | undefined;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
      {CARDS.map((c) => (
        <Card key={c.key} className={c.tone === 'danger' ? 'border-destructive/40' : c.tone === 'warn' ? 'border-amber-500/40' : ''}>
          <CardContent className="p-4">
            <div className="text-2xl font-semibold tabular-nums">{summary?.[c.key] ?? 0}</div>
            <div className="text-xs text-muted-foreground">{c.label}</div>
          </CardContent>
        </Card>
      ))}
      <Card className="col-span-2 md:col-span-4 lg:col-span-6 bg-muted/30">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Total open</div>
            <div className="text-3xl font-semibold tabular-nums">{summary?.totalOpen ?? 0}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Worklist(props: {
  q: ReturnType<typeof useBenefitsQuery<{ filters: unknown; sort: unknown }, AppealRowDto[]>>;
  page: number;
  pageSize: number;
  onPage: (p: number) => void;
  onOpen: (id: string) => void;
}) {
  const { q, page, pageSize, onPage, onOpen } = props;

  if (q.isLoading || q.isPending) {
    return (
      <Card><CardContent className="space-y-2 p-4">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </CardContent></Card>
    );
  }

  if (q.isError && isBenefitsQueryExecutionError(q.error)) {
    return <QueryStatusBanner err={q.error} onRetry={() => q.refetch()} />;
  }

  const rows = (q.data?.data as AppealRowDto[] | null) ?? [];
  const total = q.data?.page?.totalCount ?? rows.length;

  if (rows.length === 0) {
    return (
      <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
        No appeals match the current filters.
      </CardContent></Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          Worklist <span className="text-muted-foreground">({rows.length} of {total})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Appeal #</TableHead>
              <TableHead>Appellant</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Case</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Late</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead>Hearing</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead>Next action</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow
                key={r.id}
                className="cursor-pointer hover:bg-muted/40"
                onClick={() => onOpen(r.id)}
                aria-label={`Open appeal ${r.appealNumber}`}
              >
                <TableCell className="font-medium">{r.appealNumber}</TableCell>
                <TableCell>{r.appellantName ?? <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>
                  <div className="text-xs">
                    <div>{r.sourceReference ?? '—'}</div>
                    <div className="text-muted-foreground">{r.sourceModule ?? ''}</div>
                  </div>
                </TableCell>
                <TableCell>{r.appealType}</TableCell>
                <TableCell>{r.caseKind ?? '—'}</TableCell>
                <TableCell>{r.reviewLevel ?? '—'}</TableCell>
                <TableCell className="whitespace-nowrap">{r.submittedAt?.slice(0, 10) ?? '—'}</TableCell>
                <TableCell className="whitespace-nowrap">{r.filingDeadlineDate ?? '—'}</TableCell>
                <TableCell>{r.lateFilingStatus ?? '—'}</TableCell>
                <TableCell><Badge variant="outline">{r.status.replace(/_/g, ' ')}</Badge></TableCell>
                <TableCell className="text-xs">
                  {r.assignedToUserId
                    ? <span title={r.assignedToUserId}>Officer</span>
                    : r.assignedWorkbasket
                      ? r.assignedWorkbasket
                      : <span className="text-amber-600">Unassigned</span>}
                </TableCell>
                <TableCell>{r.hearingRequired ? 'Required' : '—'}</TableCell>
                <TableCell>
                  {r.slaStatus === 'BREACHED'
                    ? <Badge variant="destructive">Breached</Badge>
                    : <span className="text-muted-foreground text-xs">OK</span>}
                </TableCell>
                <TableCell className="text-xs">{r.nextAction}</TableCell>
                <TableCell><ArrowUpRight className="h-4 w-4 text-muted-foreground" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-end gap-2 border-t p-3">
          <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => onPage(page - 1)}>Previous</Button>
          <span className="text-xs text-muted-foreground">Page {page + 1}</span>
          <Button variant="ghost" size="sm" disabled={rows.length < pageSize} onClick={() => onPage(page + 1)}>Next</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function QueryStatusBanner({ err, onRetry }: { err: BenefitsQueryExecutionError; onRetry: () => void }) {
  if (err.status === 'DENIED') {
    return (
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Access denied</AlertTitle>
        <AlertDescription>{err.message}</AlertDescription>
      </Alert>
    );
  }
  if (err.status === 'INVALID') {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Invalid request</AlertTitle>
        <AlertDescription>{err.message}</AlertDescription>
      </Alert>
    );
  }
  const code = err.primaryCode;
  const title = code === 'TRANSPORT_FAILURE' || code === 'FUNCTION_NOT_DEPLOYED'
    ? 'Service unavailable'
    : code === 'MALFORMED_RESPONSE'
      ? 'Invalid server response'
      : 'Query failed';
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-3">
        <span>
          {err.message}
          {err.correlationId ? <> · Correlation ID: <code className="text-xs">{err.correlationId}</code></> : null}
        </span>
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" /> Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}
