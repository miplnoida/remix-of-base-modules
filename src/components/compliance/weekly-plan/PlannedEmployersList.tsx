// ============================================
// PlannedEmployersList
// Shows the planned employers grouped by selection mode (recommended/direct/exception),
// with badges for plan/approval status, source, priority, and warnings.
// Provides quick approve/reject for exceptions awaiting supervisor decision.
// ============================================
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Building2,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
  History as HistoryIcon,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

import { WeeklyPlanItem } from '@/types/weeklyPlan';
import {
  useEmployerSelectionOrchestrator,
  usePlanItemAuditTrail,
  type SelectionMode,
} from '@/hooks/compliance/useEmployerSelectionOrchestrator';
import { DayOfWeek } from '@/hooks/useWeeklyPlanBuilder';

interface Props {
  planId: string | null | undefined;
  userCode: string | null | undefined;
  weekDays: { name: DayOfWeek; date: string }[];
  items: WeeklyPlanItem[];
  /** Permits inline approve/reject of pending exceptions (manager / senior). */
  canApproveExceptions?: boolean;
  addItem: (item: any) => Promise<unknown>;
}

function modeOf(item: WeeklyPlanItem): SelectionMode {
  // backfill: items added before the migration may be missing selection_mode
  const m = (item as any).selection_mode as SelectionMode | undefined;
  if (m) return m;
  if ((item as any).source_type && (item as any).source_type !== 'MANUAL') return 'RECOMMENDED';
  return 'DIRECT';
}

function modeBadge(mode: SelectionMode) {
  switch (mode) {
    case 'RECOMMENDED':
      return <Badge variant="outline" className="gap-1 border-primary/40 text-primary"><Sparkles className="h-3 w-3" />Recommended</Badge>;
    case 'DIRECT':
      return <Badge variant="outline" className="gap-1"><Building2 className="h-3 w-3" />Direct</Badge>;
    case 'EXCEPTION':
      return <Badge variant="outline" className="gap-1 border-warning/40 text-warning"><ShieldAlert className="h-3 w-3" />Exception</Badge>;
  }
}

function exceptionStatusBadge(status: string | undefined | null) {
  if (!status || status === 'NOT_REQUIRED') return null;
  if (status === 'PENDING_APPROVAL')
    return <Badge variant="outline" className="text-[10px] border-warning/40 text-warning">Pending Approval</Badge>;
  if (status === 'APPROVED')
    return <Badge variant="outline" className="text-[10px] border-success/40 text-success">Approved</Badge>;
  if (status === 'REJECTED')
    return <Badge variant="destructive" className="text-[10px]">Rejected</Badge>;
  return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
}

export function PlannedEmployersList({
  planId,
  userCode,
  weekDays,
  items,
  canApproveExceptions,
  addItem,
}: Props) {
  const [tab, setTab] = useState<'all' | 'recommended' | 'direct' | 'exception'>('all');
  const [historyOpen, setHistoryOpen] = useState(false);

  const orchestrator = useEmployerSelectionOrchestrator({
    planId,
    weekDays,
    userCode,
    addItem,
  });

  const grouped = useMemo(() => {
    const buckets: Record<'recommended' | 'direct' | 'exception', WeeklyPlanItem[]> = {
      recommended: [], direct: [], exception: [],
    };
    for (const it of items) {
      const m = modeOf(it).toLowerCase() as 'recommended' | 'direct' | 'exception';
      buckets[m].push(it);
    }
    return buckets;
  }, [items]);

  const visible = tab === 'all'
    ? items
    : grouped[tab];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Planned Employers
            <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setHistoryOpen(true)}
            disabled={!planId}
          >
            <HistoryIcon className="h-3.5 w-3.5 mr-1" />
            Audit Trail
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={v => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="all">All <Badge variant="secondary" className="ml-1 text-[10px]">{items.length}</Badge></TabsTrigger>
            <TabsTrigger value="recommended">Recommended <Badge variant="secondary" className="ml-1 text-[10px]">{grouped.recommended.length}</Badge></TabsTrigger>
            <TabsTrigger value="direct">Direct <Badge variant="secondary" className="ml-1 text-[10px]">{grouped.direct.length}</Badge></TabsTrigger>
            <TabsTrigger value="exception">Exception <Badge variant="secondary" className="ml-1 text-[10px]">{grouped.exception.length}</Badge></TabsTrigger>
          </TabsList>

          <TabsContent value={tab}>
            {visible.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No planned employers in this view.
              </div>
            ) : (
              <div className="space-y-2 mt-2">
                {visible.map(it => (
                  <PlannedRow
                    key={it.id}
                    item={it}
                    canApproveExceptions={canApproveExceptions}
                    onApprove={() => orchestrator.approveException(it.id)}
                    onReject={() => orchestrator.rejectException(it.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <PlanAuditTrailDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        planId={planId}
      />
    </Card>
  );
}

function PlannedRow({
  item,
  canApproveExceptions,
  onApprove,
  onReject,
}: {
  item: WeeklyPlanItem;
  canApproveExceptions?: boolean;
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const mode = modeOf(item);
  const exStatus = (item as any).exception_status as string | undefined;
  const exCategory = (item as any).exception_category as string | undefined;
  const exNote = (item as any).exception_reason_note as string | undefined;
  const isPendingException = mode === 'EXCEPTION' && exStatus === 'PENDING_APPROVAL';

  const wrap = async (kind: 'approve' | 'reject', fn: () => Promise<void>) => {
    setBusy(kind);
    try { await fn(); } finally { setBusy(null); }
  };

  return (
    <div className="border rounded-md p-3 bg-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {modeBadge(mode)}
            {exceptionStatusBadge(exStatus)}
            <span className="font-medium truncate">{item.employer_name || item.area_name || item.purpose || 'Untitled'}</span>
            {item.employer_id && (
              <span className="font-mono text-[11px] text-muted-foreground">{item.employer_id}</span>
            )}
            {item.priority && (
              <Badge variant="outline" className="text-[10px]">{item.priority}</Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            {item.day_of_week && <span>{item.day_of_week}</span>}
            {item.scheduled_date && <span>· {new Date(item.scheduled_date).toLocaleDateString()}</span>}
            {item.visit_type && <span>· {item.visit_type}</span>}
            {(item as any).execution_status && <span>· {(item as any).execution_status}</span>}
            {item.created_by && <span>· by {item.created_by}</span>}
          </div>
          {mode === 'EXCEPTION' && (exCategory || exNote) && (
            <div className="mt-2 text-[11px] bg-warning/5 border border-warning/30 rounded px-2 py-1.5">
              {exCategory && <span className="font-medium">{exCategory.replace(/_/g, ' ')}</span>}
              {exNote && <span className="text-muted-foreground"> — {exNote}</span>}
            </div>
          )}
        </div>

        {isPendingException && canApproveExceptions && (
          <div className="flex items-center gap-1 shrink-0">
            <Button size="sm" variant="outline" className="h-7"
              disabled={!!busy}
              onClick={() => wrap('approve', onApprove)}>
              {busy === 'approve' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
              <span className="ml-1 text-xs">Approve</span>
            </Button>
            <Button size="sm" variant="outline" className="h-7"
              disabled={!!busy}
              onClick={() => wrap('reject', onReject)}>
              {busy === 'reject' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />}
              <span className="ml-1 text-xs">Reject</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function PlanAuditTrailDialog({
  open, onOpenChange, planId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  planId: string | null | undefined;
}) {
  const trail = usePlanItemAuditTrail(planId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HistoryIcon className="h-5 w-5 text-primary" />
            Plan Selection — Audit Trail
          </DialogTitle>
        </DialogHeader>

        {trail.isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 mx-auto animate-spin" />
          </div>
        ) : (trail.data ?? []).length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No audit events yet.</div>
        ) : (
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-2 pr-2">
              {(trail.data || []).map((row: any) => (
                <div key={row.id} className="border rounded-md p-2.5 text-xs bg-card">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{row.action}</Badge>
                      {row.selection_mode && modeBadge(row.selection_mode)}
                      {row.exception_category && (
                        <span className="text-muted-foreground">{row.exception_category.replace(/_/g, ' ')}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(row.performed_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                    {row.employer_name && (
                      <span><Building2 className="inline h-3 w-3 mr-0.5" />{row.employer_name}</span>
                    )}
                    {row.employer_id && <span className="font-mono">{row.employer_id}</span>}
                    <span>· by {row.performed_by}</span>
                  </div>
                  {(row.exception_reason_note || row.override_note) && (
                    <p className="mt-1 text-[11px] text-foreground/80">
                      {row.exception_reason_note || row.override_note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
