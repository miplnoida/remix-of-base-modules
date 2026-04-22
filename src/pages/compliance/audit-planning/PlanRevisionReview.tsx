// ============================================
// PHASE 4c — Plan Revision Review (Manager screen)
// ============================================
// Full-page manager view for reviewing an inspector's revision against the
// approved baseline. Reuses Phase 3 RPCs:
//   - fn_ce_compare_plan_versions  (via usePlanCompare)
//   - fn_ce_approve/reject/query_plan_revision (via useWeeklyPlanRevision)
// Falls back to a client-computed diff when the RPC payload is unavailable.
// ============================================
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  GitCompare,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Loader2,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  Calendar,
  User,
  Info,
  ShieldCheck,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { weeklyPlanService } from '@/services/weeklyPlanService';
import {
  useWeeklyPlanRevision,
  usePlanCompare,
} from '@/hooks/useWeeklyPlanRevision';
import { WeeklyPlanStatus, type WeeklyPlanItem } from '@/types/weeklyPlan';

type Decision = 'approve' | 'query' | 'reject' | null;

function itemKey(i: WeeklyPlanItem): string {
  return (
    [
      i.employer_id || i.area_name || 'unknown',
      i.day_of_week || '',
      i.visit_type || '',
    ].join('|') || i.id
  );
}

interface DiffRow {
  kind: 'added' | 'removed' | 'changed' | 'unchanged';
  key: string;
  label: string;
  prev?: WeeklyPlanItem;
  curr?: WeeklyPlanItem;
  changes: { field: string; from: string; to: string }[];
}

function describe(i: WeeklyPlanItem): string {
  return i.employer_name || i.area_name || 'Unnamed item';
}

function clientDiff(prev: WeeklyPlanItem[], curr: WeeklyPlanItem[]): DiffRow[] {
  const prevMap = new Map(prev.map((i) => [itemKey(i), i]));
  const currMap = new Map(curr.map((i) => [itemKey(i), i]));
  const rows: DiffRow[] = [];

  for (const [k, c] of currMap) {
    const p = prevMap.get(k);
    if (!p) {
      rows.push({ kind: 'added', key: k, label: describe(c), curr: c, changes: [] });
      continue;
    }
    const changes: DiffRow['changes'] = [];
    const fields: [string, keyof WeeklyPlanItem][] = [
      ['Day', 'day_of_week'],
      ['Date', 'scheduled_date'],
      ['Start time', 'scheduled_start_time'],
      ['End time', 'scheduled_end_time'],
      ['Priority', 'priority'],
      ['Purpose', 'purpose'],
      ['Mandatory', 'is_mandatory' as any],
    ];
    for (const [label, key] of fields) {
      const a = (p as any)[key];
      const b = (c as any)[key];
      if (a !== b && (a || b)) {
        changes.push({ field: label, from: String(a ?? '—'), to: String(b ?? '—') });
      }
    }
    rows.push({
      kind: changes.length ? 'changed' : 'unchanged',
      key: k,
      label: describe(c),
      prev: p,
      curr: c,
      changes,
    });
  }
  for (const [k, p] of prevMap) {
    if (!currMap.has(k)) {
      rows.push({ kind: 'removed', key: k, label: describe(p), prev: p, changes: [] });
    }
  }
  const order: Record<DiffRow['kind'], number> = {
    added: 0,
    changed: 1,
    removed: 2,
    unchanged: 3,
  };
  return rows.sort((a, b) => order[a.kind] - order[b.kind]);
}

function coverageStats(items: WeeklyPlanItem[]) {
  const total = items.length;
  const mandatory = items.filter((i) => i.is_mandatory).length;
  const highRisk = items.filter(
    (i) => i.priority === 'CRITICAL' || i.priority === 'HIGH',
  ).length;
  const zones = new Set(items.map((i) => i.territory).filter(Boolean));
  return { total, mandatory, highRisk, zones: zones.size };
}

export default function PlanRevisionReview() {
  const { revisionId } = useParams<{ revisionId: string }>();
  const navigate = useNavigate();
  const [decision, setDecision] = useState<Decision>(null);
  const [notes, setNotes] = useState('');

  const { approveRevision, rejectRevision, queryRevision } = useWeeklyPlanRevision();

  // Load the revision itself
  const revisionQ = useQuery({
    queryKey: ['plan-detail-for-review', revisionId],
    queryFn: () => weeklyPlanService.getById(revisionId as string),
    enabled: !!revisionId,
  });
  const revision: any = revisionQ.data;

  // Resolve baseline = supersedes_plan_id ?? parent_plan_id
  const baselineId: string | null =
    revision?.supersedes_plan_id ?? revision?.parent_plan_id ?? null;

  const baselineQ = useQuery({
    queryKey: ['plan-detail-for-review-base', baselineId],
    queryFn: () => weeklyPlanService.getById(baselineId as string),
    enabled: !!baselineId,
  });
  const baseline: any = baselineQ.data;

  // Server-side diff (Phase 3 RPC), with graceful fallback
  const compareQ = usePlanCompare(baselineId, revisionId ?? null);
  const serverDiff = compareQ.data as any;

  const items = useMemo(() => {
    const prev = (baseline?.ce_weekly_plan_items ?? []) as WeeklyPlanItem[];
    const curr = (revision?.ce_weekly_plan_items ?? []) as WeeklyPlanItem[];
    return { prev, curr };
  }, [baseline, revision]);

  const diff = useMemo(
    () => clientDiff(items.prev, items.curr),
    [items.prev, items.curr],
  );

  const visibleDiff = diff.filter((d) => d.kind !== 'unchanged');
  const counts = {
    added: diff.filter((d) => d.kind === 'added').length,
    changed: diff.filter((d) => d.kind === 'changed').length,
    removed: diff.filter((d) => d.kind === 'removed').length,
    unchanged: diff.filter((d) => d.kind === 'unchanged').length,
  };

  const coverageBefore = useMemo(() => coverageStats(items.prev), [items.prev]);
  const coverageAfter = useMemo(() => coverageStats(items.curr), [items.curr]);

  const isReviewable =
    revision?.status === WeeklyPlanStatus.REVISION_SUBMITTED;
  const loading = revisionQ.isLoading || baselineQ.isLoading;

  const submitDecision = () => {
    if (!revisionId || !decision) return;
    if (decision !== 'approve' && notes.trim().length < 5) return;

    const payload = { revisionId, notes: notes.trim() };
    const opts = {
      onSuccess: () => {
        setDecision(null);
        setNotes('');
        navigate('/compliance/field/revisions-pending');
      },
    };

    if (decision === 'approve') approveRevision.mutate(payload, opts);
    else if (decision === 'query') queryRevision.mutate(payload, opts);
    else rejectRevision.mutate(payload, opts);
  };

  const isSubmitting =
    approveRevision.isPending ||
    queryRevision.isPending ||
    rejectRevision.isPending;

  return (
    <div className="container mx-auto p-6 space-y-4">
      <PageHeader
        title="Review Plan Revision"
        subtitle="Compare the revised plan against the approved baseline and decide"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance/dashboard' },
          { label: 'Field', href: '/compliance/field/plan-builder-v2' },
          { label: 'Revisions Pending', href: '/compliance/field/revisions-pending' },
          { label: 'Review' },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/compliance/field/revisions-pending')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to list
          </Button>
        }
      />

      {loading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !revision ? (
        <Alert variant="destructive">
          <AlertDescription>Revision not found.</AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Summary header */}
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-background to-background">
            <CardContent className="p-4">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Plan</Label>
                  <p className="font-mono text-sm">{revision.plan_number}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    {revision.inspector_name ?? '—'}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Week</Label>
                  <p className="text-sm flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {revision.week_start_date} → {revision.week_end_date}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Versions</Label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      Approved v{baseline?.version_no ?? 1}
                    </Badge>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <Badge className="bg-warning/15 text-warning border-warning/40 text-xs">
                      Revision v{revision.version_no ?? 2}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Submitted
                  </Label>
                  <p className="text-sm">
                    {revision.submitted_date
                      ? new Date(revision.submitted_date).toLocaleString()
                      : '—'}
                  </p>
                </div>
              </div>

              {revision.revision_reason_text && (
                <Alert className="mt-3 border-warning/30 bg-warning/10">
                  <Info className="h-4 w-4 text-warning" />
                  <AlertDescription className="text-xs text-foreground">
                    <strong>
                      Reason
                      {revision.revision_reason_code
                        ? ` · ${revision.revision_reason_code.replace(/_/g, ' ')}`
                        : ''}
                      :
                    </strong>{' '}
                    {revision.revision_reason_text}
                  </AlertDescription>
                </Alert>
              )}

              {!isReviewable && (
                <Alert className="mt-3">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    This revision is currently <strong>{revision.status.replace(/_/g, ' ')}</strong> — read-only view.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Change summary cards */}
          <div className="grid gap-3 md:grid-cols-4">
            <SummaryCard
              icon={<Plus className="h-4 w-4" />}
              tone="success"
              label="Items Added"
              value={counts.added}
            />
            <SummaryCard
              icon={<ArrowRight className="h-4 w-4" />}
              tone="warning"
              label="Items Changed"
              value={counts.changed}
            />
            <SummaryCard
              icon={<Minus className="h-4 w-4" />}
              tone="destructive"
              label="Items Removed"
              value={counts.removed}
            />
            <SummaryCard
              icon={<Layers className="h-4 w-4" />}
              tone="muted"
              label="Unchanged"
              value={counts.unchanged}
            />
          </div>

          {/* Coverage impact */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Coverage impact
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-4 text-sm">
                <CoverageRow
                  label="Total visits"
                  before={coverageBefore.total}
                  after={coverageAfter.total}
                />
                <CoverageRow
                  label="Mandatory"
                  before={coverageBefore.mandatory}
                  after={coverageAfter.mandatory}
                />
                <CoverageRow
                  label="High-risk / Critical"
                  before={coverageBefore.highRisk}
                  after={coverageAfter.highRisk}
                />
                <CoverageRow
                  label="Zones / territories"
                  before={coverageBefore.zones}
                  after={coverageAfter.zones}
                />
              </div>
              {serverDiff?.coverage_impact && (
                <p className="text-[11px] text-muted-foreground mt-2">
                  Server diff payload available — additional metrics:{' '}
                  {Object.keys(serverDiff.coverage_impact).join(', ')}.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Item-by-item diff */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <GitCompare className="h-4 w-4 text-primary" />
                Detailed diff ({visibleDiff.length} change
                {visibleDiff.length === 1 ? '' : 's'})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {visibleDiff.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No structural differences detected between the approved
                  baseline and this revision.
                </p>
              ) : (
                <ScrollArea className="max-h-[420px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Change</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Before</TableHead>
                        <TableHead>After</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleDiff.map((d) => (
                        <TableRow key={d.key}>
                          <TableCell>
                            <DiffBadge kind={d.kind} />
                          </TableCell>
                          <TableCell className="font-medium">
                            {d.label}
                            {(d.curr?.execution_status === 'COMPLETED' ||
                              d.curr?.execution_status === 'IN_PROGRESS') && (
                              <Badge
                                variant="outline"
                                className="ml-2 text-[10px] border-warning/40 text-warning"
                              >
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Execution started
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {d.kind === 'added' ? (
                              <span className="italic">— (new)</span>
                            ) : (
                              <ItemSnapshot item={d.prev} />
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {d.kind === 'removed' ? (
                              <span className="italic text-muted-foreground">
                                — (removed)
                              </span>
                            ) : (
                              <>
                                <ItemSnapshot item={d.curr} />
                                {d.kind === 'changed' && d.changes.length > 0 && (
                                  <ul className="mt-1 space-y-0.5 text-[11px] text-warning">
                                    {d.changes.map((c, i) => (
                                      <li key={i}>
                                        • {c.field}: {c.from} → {c.to}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Decision panel */}
          {isReviewable && (
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Decision</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={decision === 'approve' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDecision('approve')}
                    disabled={isSubmitting}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Approve revision
                  </Button>
                  <Button
                    variant={decision === 'query' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDecision('query')}
                    disabled={isSubmitting}
                  >
                    <HelpCircle className="h-4 w-4 mr-1" />
                    Query (send back)
                  </Button>
                  <Button
                    variant={decision === 'reject' ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => setDecision('reject')}
                    disabled={isSubmitting}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject revision
                  </Button>
                </div>

                {decision && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label htmlFor="decision-notes">
                        {decision === 'approve'
                          ? 'Approval notes (optional)'
                          : decision === 'query'
                          ? 'What needs to change? (required)'
                          : 'Reason for rejection (required)'}
                      </Label>
                      <Textarea
                        id="decision-notes"
                        rows={4}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        maxLength={1000}
                        placeholder={
                          decision === 'approve'
                            ? 'Optional message to the inspector…'
                            : 'Be specific so the inspector can address this quickly…'
                        }
                      />
                      <p className="text-[11px] text-muted-foreground">
                        {notes.trim().length}/1000
                        {decision !== 'approve' && ' — minimum 5 characters'}
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDecision(null);
                          setNotes('');
                        }}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant={decision === 'reject' ? 'destructive' : 'default'}
                        disabled={
                          isSubmitting ||
                          (decision !== 'approve' && notes.trim().length < 5)
                        }
                        onClick={submitDecision}
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : decision === 'approve' ? (
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                        ) : decision === 'query' ? (
                          <HelpCircle className="h-4 w-4 mr-1" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-1" />
                        )}
                        Confirm{' '}
                        {decision === 'approve'
                          ? 'approval'
                          : decision === 'query'
                          ? 'query'
                          : 'rejection'}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────
function SummaryCard({
  icon,
  tone,
  label,
  value,
}: {
  icon: React.ReactNode;
  tone: 'success' | 'warning' | 'destructive' | 'muted';
  label: string;
  value: number;
}) {
  const toneClass: Record<typeof tone, string> = {
    success: 'border-success/30 bg-success/5 text-success',
    warning: 'border-warning/30 bg-warning/5 text-warning',
    destructive: 'border-destructive/30 bg-destructive/5 text-destructive',
    muted: 'border-border bg-muted/30 text-muted-foreground',
  } as any;
  return (
    <Card className={toneClass[tone]}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </div>
        <p className="text-2xl font-bold mt-1 text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function CoverageRow({
  label,
  before,
  after,
}: {
  label: string;
  before: number;
  after: number;
}) {
  const delta = after - before;
  const tone =
    delta > 0
      ? 'text-success'
      : delta < 0
      ? 'text-destructive'
      : 'text-muted-foreground';
  return (
    <div className="rounded-md border border-border p-3 bg-card">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-lg font-semibold">{after}</span>
        <span className={`text-xs ${tone}`}>
          {delta > 0 ? `+${delta}` : delta}
        </span>
      </div>
      <div className="text-[11px] text-muted-foreground">
        was {before}
      </div>
    </div>
  );
}

function DiffBadge({ kind }: { kind: DiffRow['kind'] }) {
  if (kind === 'added')
    return (
      <Badge className="bg-success/15 text-success border-success/40 text-[10px]">
        <Plus className="h-3 w-3 mr-1" />
        Added
      </Badge>
    );
  if (kind === 'removed')
    return (
      <Badge className="bg-destructive/15 text-destructive border-destructive/40 text-[10px]">
        <Minus className="h-3 w-3 mr-1" />
        Removed
      </Badge>
    );
  if (kind === 'changed')
    return (
      <Badge className="bg-warning/15 text-warning border-warning/40 text-[10px]">
        <ArrowRight className="h-3 w-3 mr-1" />
        Changed
      </Badge>
    );
  return <Badge variant="outline" className="text-[10px]">Same</Badge>;
}

function ItemSnapshot({ item }: { item?: WeeklyPlanItem }) {
  if (!item) return <span className="italic text-muted-foreground">—</span>;
  return (
    <div className="space-y-0.5">
      <div>
        {item.day_of_week ?? '—'}
        {item.scheduled_start_time ? ` · ${item.scheduled_start_time}` : ''}
      </div>
      <div className="text-muted-foreground">
        {item.priority ?? '—'}
        {item.is_mandatory ? ' · mandatory' : ''}
      </div>
      {item.purpose && (
        <div className="line-clamp-2 text-muted-foreground">{item.purpose}</div>
      )}
    </div>
  );
}
