// ============================================
// PHASE 3 — Plan Version History Dialog
// ============================================
// Shows the full version family of a weekly plan (root + revisions).
// Pure read view — no schema changes; reads ce_weekly_plans by parent_plan_id.
// ============================================
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GitBranch, Loader2, CheckCircle2, Clock, FileText } from 'lucide-react';
import { usePlanVersionHistory } from '@/hooks/useWeeklyPlanRevision';
import type { WeeklyPlan } from '@/types/weeklyPlan';

interface Props {
  plan: WeeklyPlan | null;
  onClose: () => void;
}

export function PlanVersionHistoryDialog({ plan, onClose }: Props) {
  const { data: versions, isLoading } = usePlanVersionHistory(plan?.id);

  return (
    <Dialog open={!!plan} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Version History
          </DialogTitle>
          <DialogDescription>
            All versions of this plan family. The current version is highlighted.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !versions?.length ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No version history found.
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-2">
            <ol className="relative border-l border-border ml-3 space-y-4">
              {versions.map((v) => {
                const isCurrent = (v as any).is_current_version === true;
                return (
                  <li key={v.id} className="ml-4">
                    <span
                      className={`absolute -left-[7px] flex h-3.5 w-3.5 items-center justify-center rounded-full ring-4 ring-background ${
                        isCurrent ? 'bg-primary' : 'bg-muted-foreground/40'
                      }`}
                    />
                    <div
                      className={`rounded-lg border p-3 ${
                        isCurrent ? 'border-primary/40 bg-primary/5' : 'bg-card'
                      }`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{v.plan_number}</span>
                          <Badge variant="outline" className="text-xs">
                            v{(v as any).version_no ?? 1}
                          </Badge>
                          {isCurrent && (
                            <Badge className="text-xs bg-primary/15 text-primary border-primary/30">
                              CURRENT
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {v.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(v.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      {(v as any).revision_reason && (
                        <p className="mt-2 text-sm text-muted-foreground flex gap-1.5">
                          <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span>
                            <span className="font-medium text-foreground">Reason: </span>
                            {(v as any).revision_reason}
                          </span>
                        </p>
                      )}

                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{v.total_planned_visits} planned</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {v.completed_visits} completed
                        </span>
                        {v.approved_by_name && (
                          <>
                            <span>•</span>
                            <span>Approved by {v.approved_by_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
