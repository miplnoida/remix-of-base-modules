// ============================================
// PHASE 4 — Plan Compare Dialog (Manager view)
// ============================================
// Side-by-side compare of a plan revision against its previous version.
// Reads from ce_weekly_plans + ce_weekly_plan_items via getVersionHistory + getById.
// No schema changes. Pure read.
// ============================================
import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { weeklyPlanService } from '@/services/weeklyPlanService';
import { usePlanVersionHistory } from '@/hooks/useWeeklyPlanRevision';
import { GitCompare, Loader2, Plus, Minus, ArrowRight } from 'lucide-react';
import type { WeeklyPlan, WeeklyPlanItem } from '@/types/weeklyPlan';

interface Props {
  plan: WeeklyPlan | null;
  onClose: () => void;
}

interface DiffRow {
  kind: 'added' | 'removed' | 'changed' | 'unchanged';
  key: string;
  current?: WeeklyPlanItem;
  previous?: WeeklyPlanItem;
  label: string;
  changes?: string[];
}

function itemKey(item: WeeklyPlanItem): string {
  // Stable identity = employer/area + day + visit_type. Falls back to id.
  return [
    item.employer_id || item.area_name || 'unknown',
    item.day_of_week || '',
    item.visit_type || '',
  ].join('|') || item.id;
}

function describeItem(item: WeeklyPlanItem): string {
  const name = item.employer_name || item.area_name || 'Unnamed';
  const day = item.day_of_week ? ` (${item.day_of_week})` : '';
  return `${name}${day}`;
}

function diffItems(prev: WeeklyPlanItem[], curr: WeeklyPlanItem[]): DiffRow[] {
  const prevMap = new Map(prev.map((i) => [itemKey(i), i]));
  const currMap = new Map(curr.map((i) => [itemKey(i), i]));
  const rows: DiffRow[] = [];

  for (const [k, c] of currMap) {
    const p = prevMap.get(k);
    if (!p) {
      rows.push({ kind: 'added', key: k, current: c, label: describeItem(c) });
    } else {
      const changes: string[] = [];
      if (p.scheduled_date !== c.scheduled_date) changes.push(`date ${p.scheduled_date ?? '—'} → ${c.scheduled_date ?? '—'}`);
      if (p.scheduled_start_time !== c.scheduled_start_time) changes.push(`time ${p.scheduled_start_time ?? '—'} → ${c.scheduled_start_time ?? '—'}`);
      if (p.priority !== c.priority) changes.push(`priority ${p.priority ?? '—'} → ${c.priority ?? '—'}`);
      if (p.purpose !== c.purpose && (p.purpose || c.purpose)) changes.push('purpose updated');
      rows.push({
        kind: changes.length ? 'changed' : 'unchanged',
        key: k,
        previous: p,
        current: c,
        label: describeItem(c),
        changes,
      });
    }
  }
  for (const [k, p] of prevMap) {
    if (!currMap.has(k)) {
      rows.push({ kind: 'removed', key: k, previous: p, label: describeItem(p) });
    }
  }
  // Sort: added → changed → removed → unchanged
  const order: Record<DiffRow['kind'], number> = { added: 0, changed: 1, removed: 2, unchanged: 3 };
  return rows.sort((a, b) => order[a.kind] - order[b.kind]);
}

export function PlanCompareDialog({ plan, onClose }: Props) {
  const { data: family, isLoading: famLoading } = usePlanVersionHistory(plan?.id);

  // Pick the previous version (one below current version_no)
  const previousVersionId = useMemo(() => {
    if (!family || !plan) return null;
    const currentV = (plan as any).version_no ?? 1;
    const prev = family.find((v) => ((v as any).version_no ?? 1) === currentV - 1);
    return prev?.id ?? null;
  }, [family, plan]);

  const previousQ = useQuery({
    queryKey: ['plan-detail-for-compare', previousVersionId],
    queryFn: () => weeklyPlanService.getById(previousVersionId!),
    enabled: !!previousVersionId,
  });

  const currentQ = useQuery({
    queryKey: ['plan-detail-for-compare', plan?.id],
    queryFn: () => weeklyPlanService.getById(plan!.id),
    enabled: !!plan?.id,
  });

  const isLoading = famLoading || previousQ.isLoading || currentQ.isLoading;

  const diff = useMemo(() => {
    const prevItems = previousQ.data?.ce_weekly_plan_items ?? [];
    const currItems = currentQ.data?.ce_weekly_plan_items ?? [];
    return diffItems(prevItems, currItems);
  }, [previousQ.data, currentQ.data]);

  const counts = useMemo(
    () => ({
      added: diff.filter((d) => d.kind === 'added').length,
      removed: diff.filter((d) => d.kind === 'removed').length,
      changed: diff.filter((d) => d.kind === 'changed').length,
      unchanged: diff.filter((d) => d.kind === 'unchanged').length,
    }),
    [diff],
  );

  const currentVersion = (plan as any)?.version_no ?? 1;
  const prevVersion = currentVersion - 1;
  const noPrevious = !previousVersionId && !famLoading;

  return (
    <Dialog open={!!plan} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-primary" />
            Compare Plan Versions
          </DialogTitle>
          <DialogDescription>
            {noPrevious ? (
              <>This is the first version of <span className="font-mono">{plan?.plan_number}</span> — nothing to compare against.</>
            ) : (
              <>
                Comparing <span className="font-mono">v{prevVersion}</span> →{' '}
                <span className="font-mono">v{currentVersion}</span> of {plan?.plan_number}.{' '}
                {(plan as any)?.revision_reason && (
                  <span className="block mt-1 text-xs italic">
                    Reason: {(plan as any).revision_reason}
                  </span>
                )}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : noPrevious ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No previous version exists for this plan.
          </div>
        ) : (
          <>
            {/* Summary bar */}
            <div className="flex flex-wrap gap-2 pb-2 border-b">
              <Badge className="bg-success/15 text-success border-success/30">
                <Plus className="h-3 w-3 mr-1" />
                {counts.added} added
              </Badge>
              <Badge className="bg-warning/15 text-warning border-warning/30">
                <ArrowRight className="h-3 w-3 mr-1" />
                {counts.changed} changed
              </Badge>
              <Badge className="bg-destructive/15 text-destructive border-destructive/30">
                <Minus className="h-3 w-3 mr-1" />
                {counts.removed} removed
              </Badge>
              <Badge variant="outline">{counts.unchanged} unchanged</Badge>
            </div>

            <ScrollArea className="max-h-[55vh] pr-2">
              <ul className="space-y-2 mt-2">
                {diff
                  .filter((d) => d.kind !== 'unchanged')
                  .map((d) => (
                    <li
                      key={d.key}
                      className={`rounded-md border p-2.5 text-sm ${
                        d.kind === 'added'
                          ? 'border-success/30 bg-success/5'
                          : d.kind === 'removed'
                          ? 'border-destructive/30 bg-destructive/5'
                          : 'border-warning/30 bg-warning/5'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {d.kind === 'added' && <Plus className="h-4 w-4 mt-0.5 text-success shrink-0" />}
                        {d.kind === 'removed' && <Minus className="h-4 w-4 mt-0.5 text-destructive shrink-0" />}
                        {d.kind === 'changed' && <ArrowRight className="h-4 w-4 mt-0.5 text-warning shrink-0" />}
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{d.label}</div>
                          {d.kind === 'changed' && d.changes && d.changes.length > 0 && (
                            <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                              {d.changes.map((c, i) => (
                                <li key={i}>• {c}</li>
                              ))}
                            </ul>
                          )}
                          {(d.current?.purpose || d.previous?.purpose) && d.kind !== 'changed' && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {d.current?.purpose || d.previous?.purpose}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                {diff.filter((d) => d.kind !== 'unchanged').length === 0 && (
                  <li className="text-center text-sm text-muted-foreground py-6">
                    No structural differences detected between versions.
                  </li>
                )}
              </ul>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
