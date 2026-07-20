/**
 * BN Appeals — Appeal 360 detail workspace (BN-AP-01 Slice 2A.3).
 *
 * Fourteen substantive tabs, each backed by a real secure handler on the
 * `bn-benefits-query` Edge Function. When the parent appeal cannot be
 * resolved (NOT_FOUND / DENIED / INVALID) all child readers are held via
 * React Query's `enabled` gate — the shell never fires child queries against
 * an appeal it has not confirmed exists.
 *
 * Staff mutations remain disabled globally (`actions_enabled=false`).
 */
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBenefitsQuery } from '@/hooks/bn/queries/useBenefitsQuery';
import { BnModuleRouteGate, type BnModuleAccessContext } from '@/components/bn/access/BnModuleRouteGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertCircle, ShieldAlert, RefreshCw, ChevronLeft, ClipboardList, Lock, FileQuestion,
} from 'lucide-react';
import {
  BenefitsQueryExecutionError,
  isBenefitsQueryExecutionError,
} from '@/services/bn/queries/benefitsQueryExecutionError';
import type { BnBenefitsQueryCode } from '@/types/bn/queries/queryCodes';

// ── header DTO ────────────────────────────────────────────────────────────
interface AppealHeaderDto {
  id: string;
  appealNumber: string | null;
  appellantName: string | null;
  claimantSsnMasked: string | null;
  appealType: string | null;
  status: string;
  outcome: string | null;
  submittedAt: string | null;
  filingDeadlineDate: string | null;
  assignedToUserId: string | null;
  assignedWorkbasket: string | null;
  slaStatus: 'OK' | 'BREACHED' | null;
  rowVersion: number | null;
  sourceReference: string | null;
}

interface ActionRow {
  command: string;
  displayName: string;
  capability: string;
  available: boolean;
  disabledReasons: string[];
  validFrom: string[];
  implemented: boolean;
}
interface ActionAvailabilityDto {
  actionsEnabled: boolean;
  rolloutState: string | null;
  currentStatus: string | null;
  rows: ActionRow[];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function BnAppealDetailPage() {
  return (
    <BnModuleRouteGate moduleCode="bn_appeals" requiredAction="view">
      {(ctx) => <AppealDetail ctx={ctx} />}
    </BnModuleRouteGate>
  );
}

function AppealDetail({ ctx }: { ctx: BnModuleAccessContext }) {
  const { appealId = '' } = useParams();
  const navigate = useNavigate();

  if (!UUID_RE.test(appealId)) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Invalid appeal reference</AlertTitle>
          <AlertDescription>
            The appeal identifier in the URL is not a valid UUID.
            <Button variant="link" size="sm" onClick={() => navigate('/bn/appeals')}>Return to worklist</Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const headerQ = useBenefitsQuery<{ appealId: string }, AppealHeaderDto>({
    queryCode: 'BN_APPEAL_GET',
    moduleCode: 'bn_appeals',
    params: { appealId },
    pageSize: 1,
  });

  // Parent-derived gating for every child query. When we don't yet have an
  // OK envelope for the parent, no child tab may fire — this satisfies the
  // Slice 2A.3 "parent NOT_FOUND prevents child queries" invariant.
  const parentAvailable =
    !headerQ.isPending && !headerQ.isLoading && !headerQ.isError &&
    headerQ.data?.status === 'OK' && !!headerQ.data?.data;

  return (
    <div className="space-y-4 p-6">
      <Breadcrumbs onBack={() => navigate('/bn/appeals')} />
      <Header q={headerQ} appealId={appealId} actionsEnabled={ctx.actionsEnabled} />
      {parentAvailable && (
        <>
          <BnAppealActionsPanel appealId={appealId} />
          <AppealTabs appealId={appealId} enabled={parentAvailable} />
        </>
      )}
    </div>
  );
}

function Breadcrumbs({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs text-muted-foreground">
        Benefit Management → Benefit Operations → Appeals &amp; Disputes → Appeal 360
      </p>
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ChevronLeft className="mr-1 h-4 w-4" /> Worklist
      </Button>
    </div>
  );
}

function Header({
  q, appealId, actionsEnabled,
}: {
  q: ReturnType<typeof useBenefitsQuery<{ appealId: string }, AppealHeaderDto>>;
  appealId: string;
  actionsEnabled: boolean;
}) {
  if (q.isPending || q.isLoading) {
    return <Card><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>;
  }
  if (q.isError && isBenefitsQueryExecutionError(q.error)) {
    return <QueryFailureBanner err={q.error} onRetry={() => q.refetch()} />;
  }
  if (q.data?.status === 'NOT_FOUND') {
    return (
      <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
        No appeal with reference <code>{appealId.slice(0, 8)}…</code> could be found.
      </CardContent></Card>
    );
  }
  if (q.data?.status === 'DENIED') {
    return (
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Access denied</AlertTitle>
        <AlertDescription>Your role does not permit reading this appeal.</AlertDescription>
      </Alert>
    );
  }
  const h = (q.data?.data as AppealHeaderDto | null | undefined);
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">
                {h?.appealNumber ?? 'Appeal'}
              </h1>
              {h?.status && <Badge variant="outline">{h.status.replace(/_/g, ' ')}</Badge>}
              {h?.outcome && <Badge>{h.outcome.replace(/_/g, ' ')}</Badge>}
              {h?.slaStatus === 'BREACHED' && <Badge variant="destructive">SLA breached</Badge>}
              <Badge variant="secondary" className="uppercase tracking-wide">Internal pilot</Badge>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground md:grid-cols-4">
              <Field label="Appellant" value={h?.appellantName ?? h?.claimantSsnMasked} />
              <Field label="Source" value={h?.sourceReference} />
              <Field label="Type" value={h?.appealType} />
              <Field label="Submitted" value={h?.submittedAt?.slice(0, 10)} />
              <Field label="Filing deadline" value={h?.filingDeadlineDate} />
              <Field label="Assignment" value={h?.assignedToUserId ? 'Officer assigned' : h?.assignedWorkbasket ?? 'Unassigned'} />
              <Field label="Row version" value={h?.rowVersion != null ? String(h.rowVersion) : null} />
            </div>
          </div>
          {!actionsEnabled && (
            <Alert className="w-auto max-w-md">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Actions disabled</AlertTitle>
              <AlertDescription className="text-xs">
                Staff commands remain gated by module rollout state.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide">{label}</div>
      <div className="text-sm text-foreground">{value ?? '—'}</div>
    </div>
  );
}

// ── Actions panel (server-driven) ───────────────────────────────────────
function BnAppealActionsPanel({ appealId }: { appealId: string }) {
  const q = useBenefitsQuery<{ appealId: string }, ActionAvailabilityDto>({
    queryCode: 'BN_APPEAL_GET_ACTION_AVAILABILITY',
    moduleCode: 'bn_appeals',
    params: { appealId },
    pageSize: 1,
  });

  if (q.isPending || q.isLoading) {
    return <Card><CardHeader className="pb-3"><CardTitle className="text-base">Available actions</CardTitle></CardHeader>
      <CardContent className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</CardContent></Card>;
  }
  if (q.isError && isBenefitsQueryExecutionError(q.error)) {
    return (
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Available actions</CardTitle></CardHeader>
        <CardContent><QueryFailureBanner err={q.error} onRetry={() => q.refetch()} /></CardContent>
      </Card>
    );
  }
  if (q.data?.status === 'NOT_FOUND') {
    return (
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Available actions</CardTitle></CardHeader>
        <CardContent>
          <Alert><FileQuestion className="h-4 w-4" /><AlertTitle>Appeal not found</AlertTitle>
            <AlertDescription>The appeal referenced by this page no longer exists.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  const payload = q.data?.data ?? null;
  const rows = payload?.rows ?? [];
  const available = rows.filter((r) => r.available);
  const disabled = rows.filter((r) => !r.available);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          Available actions
          {!payload?.actionsEnabled && (
            <Badge variant="secondary" className="text-[10px] uppercase">Read-only pilot</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {available.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No commands are executable in the current pilot configuration
            {payload?.currentStatus && <> (status: <span className="font-mono">{payload.currentStatus}</span>)</>}.
          </p>
        )}
        {available.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {available.map((r) => (
              <Button key={r.command} size="sm" variant="outline" disabled title={r.command}>
                {r.displayName}
              </Button>
            ))}
          </div>
        )}
        {disabled.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">
              Disabled commands ({disabled.length})
            </summary>
            <ul className="mt-2 space-y-1 pl-4">
              {disabled.map((r) => (
                <li key={r.command} className="flex items-start gap-2 text-xs">
                  <Lock className="mt-0.5 h-3 w-3 flex-shrink-0 text-muted-foreground" />
                  <div>
                    <span className="font-medium">{r.displayName}</span>{' '}
                    <span className="font-mono text-muted-foreground">({r.command})</span>
                    <div className="text-muted-foreground">{r.disabledReasons.join(' · ')}</div>
                  </div>
                </li>
              ))}
            </ul>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

// ── Tab plumbing ────────────────────────────────────────────────────────
interface TabDef {
  value: string;
  label: string;
  queryCode: BnBenefitsQueryCode;
  emptyText: string;
  render: (rows: any[]) => React.ReactNode;
}

const TABS: TabDef[] = [
  { value: 'overview',       label: 'Overview',                queryCode: 'BN_APPEAL_GET_ISSUES',
    emptyText: 'No overview issues have been recorded yet.',
    render: (rows) => <SimpleList rows={rows} labelKey="issueSummary" subKey="status" /> },
  { value: 'source',         label: 'Source Decision',         queryCode: 'BN_APPEAL_GET_SOURCE_DECISION',
    emptyText: 'The underlying source decision has not been snapshotted.',
    render: (rows) => <KeyValue obj={Array.isArray(rows) ? rows[0] : rows} /> },
  { value: 'parties',        label: 'Appellant & Representation', queryCode: 'BN_APPEAL_GET_PARTIES',
    emptyText: 'No additional parties or representatives have been recorded.',
    render: (rows) => <SimpleList rows={rows} labelKey="displayName" subKey="partyRole" /> },
  { value: 'grounds',        label: 'Grounds & Issues',        queryCode: 'BN_APPEAL_GET_GROUNDS',
    emptyText: 'No grounds have been captured.',
    render: (rows) => <SimpleList rows={rows} labelKey="groundCode" subKey="groundText" /> },
  { value: 'admissibility',  label: 'Admissibility & Deadlines', queryCode: 'BN_APPEAL_GET_DEADLINES',
    emptyText: 'No admissibility deadlines have been scheduled.',
    render: (rows) => <SimpleList rows={rows} labelKey="deadlineCode" subKey="dueAt" /> },
  { value: 'evidence',       label: 'Evidence & Info Requests', queryCode: 'BN_APPEAL_GET_EVIDENCE_REQUESTS',
    emptyText: 'No evidence or information requests have been issued.',
    render: (rows) => <SimpleList rows={rows} labelKey="subject" subKey="status" /> },
  { value: 'stay',           label: 'Stay / Interim Relief',   queryCode: 'BN_APPEAL_GET_STAYS',
    emptyText: 'No stay or interim relief has been requested.',
    render: (rows) => <SimpleList rows={rows} labelKey="stayType" subKey="status" /> },
  { value: 'workflow',       label: 'Workflow & Tasks',        queryCode: 'BN_APPEAL_GET_WORKFLOW',
    emptyText: 'No workflow tasks have been created in Core Workflow for this appeal.',
    render: (rows) => <SimpleList rows={rows} labelKey="taskName" subKey="status" /> },
  { value: 'hearing',        label: 'Hearing',                 queryCode: 'BN_APPEAL_GET_HEARING',
    emptyText: 'No hearing has been scheduled.',
    render: (rows) => <SimpleList rows={rows} labelKey="scheduledAt" subKey="status" /> },
  { value: 'recommendation', label: 'Recommendation',          queryCode: 'BN_APPEAL_GET_RECOMMENDATIONS',
    emptyText: 'No recommendation has been prepared.',
    render: (rows) => <SimpleList rows={rows} labelKey="recommendedOutcome" subKey="rationale" /> },
  { value: 'decision',       label: 'Formal Decision',         queryCode: 'BN_APPEAL_GET_DECISIONS',
    emptyText: 'No formal decision has been recorded.',
    render: (rows) => <SimpleList rows={rows} labelKey="outcomeCode" subKey="decisionSummary" /> },
  { value: 'implementation', label: 'Implementation',          queryCode: 'BN_APPEAL_GET_IMPLEMENTATION',
    emptyText: 'No implementation actions exist.',
    render: (rows) => <SimpleList rows={rows} labelKey="actionKind" subKey="status" /> },
  { value: 'comms',          label: 'Communications & Legal',  queryCode: 'BN_APPEAL_GET_COMMUNICATIONS',
    emptyText: 'No communications have been dispatched and no Legal referral has been created.',
    render: (rows) => <SimpleList rows={rows} labelKey="eventCode" subKey="status" /> },
  { value: 'timeline',       label: 'Timeline & Audit',        queryCode: 'BN_APPEAL_GET_EVENTS',
    emptyText: 'No lifecycle events have been recorded yet.',
    render: (rows) => <SimpleList rows={rows} labelKey="eventCode" subKey="occurredAt" /> },
];

function AppealTabs({ appealId, enabled }: { appealId: string; enabled: boolean }) {
  const [tab, setTab] = React.useState('overview');
  return (
    <Card>
      <CardContent className="p-0">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-none border-b bg-transparent p-2">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="data-[state=active]:bg-muted">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {TABS.map((t) => (
            <TabsContent key={t.value} value={t.value} className="p-4">
              {tab === t.value && <TabBody appealId={appealId} tab={t} enabled={enabled} />}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function TabBody({ appealId, tab, enabled }: { appealId: string; tab: TabDef; enabled: boolean }) {
  const q = useBenefitsQuery<{ appealId: string }, any>({
    queryCode: tab.queryCode,
    moduleCode: 'bn_appeals',
    params: { appealId },
    pageSize: 50,
    enabled,
  });

  if (!enabled || q.isPending || q.isLoading) {
    return <div className="space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-2/3" /></div>;
  }
  if (q.isError && isBenefitsQueryExecutionError(q.error)) {
    return <QueryFailureBanner err={q.error} onRetry={() => q.refetch()} />;
  }
  if (q.data?.status === 'NOT_FOUND') {
    return <EmptyState text={tab.emptyText} />;
  }
  const raw = q.data?.data;
  const rows: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
  if (rows.length === 0) {
    return <EmptyState text={tab.emptyText} />;
  }
  return <div className="space-y-2">{tab.render(rows)}</div>;
}

// ── shared render helpers ───────────────────────────────────────────────
function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
      <ClipboardList className="h-4 w-4" />
      <span>{text}</span>
    </div>
  );
}

function SimpleList({ rows, labelKey, subKey }: { rows: any[]; labelKey: string; subKey?: string }) {
  return (
    <ul className="divide-y rounded-md border">
      {rows.map((r, i) => (
        <li key={r?.id ?? i} className="flex items-center justify-between p-3 text-sm">
          <div>
            <div className="font-medium">{fmt(r?.[labelKey])}</div>
            {subKey && <div className="text-xs text-muted-foreground">{fmt(r?.[subKey])}</div>}
          </div>
        </li>
      ))}
    </ul>
  );
}

function KeyValue({ obj }: { obj: any }) {
  if (!obj || typeof obj !== 'object') return <EmptyState text="No source decision snapshot available." />;
  const entries = Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (entries.length === 0) return <EmptyState text="No source decision snapshot available." />;
  return (
    <dl className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {entries.map(([k, v]) => (
        <div key={k} className="rounded-md border p-3 text-sm">
          <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</dt>
          <dd className="text-foreground">{fmt(v as any)}</dd>
        </div>
      ))}
    </dl>
  );
}

function fmt(v: any): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  try { return JSON.stringify(v); } catch { return '—'; }
}

// ── error rendering ─────────────────────────────────────────────────────
function QueryFailureBanner({ err, onRetry }: { err: BenefitsQueryExecutionError; onRetry: () => void }) {
  if (err.status === 'DENIED') {
    return (
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Access denied</AlertTitle>
        <AlertDescription>Your role does not permit reading this appeal surface.</AlertDescription>
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
  const isTransport = code === 'TRANSPORT_FAILURE' || code === 'FUNCTION_NOT_DEPLOYED';
  const isMalformed = code === 'MALFORMED_RESPONSE';
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>
        {isTransport ? 'Service unavailable' : isMalformed ? 'Invalid server response' : 'Query failed'}
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-3">
        <span>
          {err.message}
          {err.correlationId && <> · Correlation ID: <code className="text-xs">{err.correlationId}</code></>}
        </span>
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" /> Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}
