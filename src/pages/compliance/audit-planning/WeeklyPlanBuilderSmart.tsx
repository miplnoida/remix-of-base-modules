// ============================================
// SMART WEEKLY PLAN BUILDER — Guided, action-oriented planner
// Reuses existing useWeeklyPlanBuilder hook + ce_weekly_plans tables.
// No DB schema changes. Workload is item-count based (no hours).
// ============================================

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sparkles,
  Send,
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Wand2,
  Building2,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  Trash2,
  Flame,
  ArrowRight,
  ListChecks,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addWeeks, subWeeks } from 'date-fns';

import { useWeeklyPlanBuilder, DayOfWeek } from '@/hooks/useWeeklyPlanBuilder';
import { PlanItemFormDialog } from '@/components/compliance/weekly-plan/PlanItemFormDialog';
import { WeeklyPlanStatus, PlanCandidate, WeeklyPlanItem } from '@/types/weeklyPlan';
import {
  generateSmartDraft,
  draftToRequests,
  classifyCandidate,
} from '@/lib/smartDraftEngine';

import { SmartOverviewBar } from '@/components/compliance/weekly-plan/SmartOverviewBar';
import {
  PlanValidationPanel,
  computePlanReadiness,
} from '@/components/compliance/weekly-plan/PlanValidationPanel';
import { EmployerSelectionWorkbench } from '@/components/compliance/weekly-plan/EmployerSelectionWorkbench';
import { useComplianceRole } from '@/hooks/useComplianceRole';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// ----- Workload (item-count based, no hours) -----
type DayLoad = 'Empty' | 'Light' | 'Optimal' | 'Heavy';
function getDayLoad(count: number): { label: DayLoad; tone: string; bg: string; ring: string } {
  if (count === 0) return { label: 'Empty', tone: 'text-muted-foreground', bg: 'bg-muted/30', ring: 'border-dashed border-border' };
  if (count <= 2) return { label: 'Light', tone: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', ring: 'border-amber-200 dark:border-amber-900' };
  if (count <= 4) return { label: 'Optimal', tone: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', ring: 'border-emerald-200 dark:border-emerald-900' };
  return { label: 'Heavy', tone: 'text-destructive', bg: 'bg-destructive/5', ring: 'border-destructive/30' };
}

function getPriorityChip(p: string | null) {
  switch (p) {
    case 'CRITICAL': return 'bg-destructive/15 text-destructive border-destructive/30';
    case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800';
    case 'MEDIUM': return 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
    default: return 'bg-muted text-muted-foreground border-border';
  }
}

function recommendDay(c: PlanCandidate, itemsByDay: Record<DayOfWeek, WeeklyPlanItem[]>): DayOfWeek {
  // Prefer overdue → Monday
  if (classifyCandidate(c) === 'OVERDUE') return 'Monday';
  // Else: least-loaded day
  let best: DayOfWeek = 'Monday';
  let min = Infinity;
  for (const d of DAYS) {
    const ct = itemsByDay[d]?.length || 0;
    if (ct < min) { min = ct; best = d; }
  }
  return best;
}

interface Props {
  onSwitchToLegacy?: () => void;
}

export default function WeeklyPlanBuilderSmart({ onSwitchToLegacy }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const builder = useWeeklyPlanBuilder();
  const role = useComplianceRole();

  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [narrative, setNarrative] = useState(builder.activePlan?.narrative || '');
  const [isGenerating, setIsGenerating] = useState(false);

  // Sync narrative when plan loads
  const planNarrative = builder.activePlan?.narrative || '';
  if (narrative === '' && planNarrative) {
    setNarrative(planNarrative);
  }

  const readiness = useMemo(
    () => computePlanReadiness(builder.itemsByDay, builder.planItems, builder.candidates, builder.addedSourceIds),
    [builder.itemsByDay, builder.planItems, builder.candidates, builder.addedSourceIds],
  );

  // Top suggestions = unscheduled, sorted by priority/score
  const topSuggestions = useMemo(() => {
    return builder.candidates
      .filter(c => !builder.addedSourceIds.has(c.source_id))
      .sort((a, b) => {
        const pa = a.priority === 'CRITICAL' ? 0 : a.priority === 'HIGH' ? 1 : a.priority === 'MEDIUM' ? 2 : 3;
        const pb = b.priority === 'CRITICAL' ? 0 : b.priority === 'HIGH' ? 1 : b.priority === 'MEDIUM' ? 2 : 3;
        if (pa !== pb) return pa - pb;
        return (b.recommendation_score ?? 0) - (a.recommendation_score ?? 0);
      })
      .slice(0, 12);
  }, [builder.candidates, builder.addedSourceIds]);

  const handleGenerateDraft = useCallback(async () => {
    if (!builder.canEdit) {
      toast({
        title: 'Plan Locked',
        description: 'This plan is no longer editable. Withdraw or request changes to modify it.',
        variant: 'destructive',
      });
      return;
    }

    if (builder.candidatesLoading) {
      toast({ title: 'Still loading', description: 'Candidate list is loading. Please try again in a moment.' });
      return;
    }

    if (!builder.inspectorId) {
      toast({
        title: 'Inspector Profile Required',
        description:
          'Smart Plan needs an inspector profile linked to your account. Please ask an administrator to add you to the Inspectors register, then retry.',
        variant: 'destructive',
      });
      return;
    }

    if (!builder.candidates || builder.candidates.length === 0) {
      toast({
        title: 'No Candidates Available',
        description:
          'There are no eligible items (overdue, high-risk, follow-ups, nominations) to auto-schedule for this week. Add an Exception manually, or use Browse & Add.',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const result = generateSmartDraft(builder.candidates, builder.addedSourceIds);

      if (result.draftItems.length === 0) {
        toast({
          title: 'Nothing to Schedule',
          description:
            'All eligible candidates are already on the plan, or none fit within the weekly capacity. Adjust filters or add items manually.',
        });
        return;
      }

      const requests = draftToRequests(result.draftItems, '', builder.week.days, '');

      let addedCount = 0;
      let firstError: string | null = null;
      for (const req of requests) {
        try {
          await builder.addManualItem(req);
          addedCount++;
        } catch (e: any) {
          if (!firstError) firstError = e?.message || 'Unknown error';
        }
      }

      if (addedCount === 0) {
        toast({
          title: 'Smart Plan Failed',
          description: firstError || 'No items could be added to the plan. Please try again or contact support.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Smart Draft Ready',
        description:
          `${addedCount} of ${requests.length} items scheduled across the week. ` +
          `Review and adjust before submitting.` +
          (firstError ? ` (Some items failed: ${firstError})` : ''),
      });
    } catch (err: any) {
      toast({
        title: 'Smart Plan Failed',
        description: err?.message || 'Failed to generate draft. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [builder, toast]);

  const handleSubmit = () => {
    if (!readiness.isReady) {
      toast({
        title: 'Plan Not Ready',
        description: 'Address the validation checks before submitting.',
        variant: 'destructive',
      });
      return;
    }
    setSubmitDialogOpen(true);
  };

  const confirmSubmit = async () => {
    try {
      if (builder.isNeedsChanges) {
        await builder.resubmitPlan(narrative || undefined);
      } else {
        await builder.submitPlan(narrative || undefined);
      }
      setSubmitDialogOpen(false);
      navigate('/compliance/field/my-plans');
    } catch {
      // Error handled in hook
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case WeeklyPlanStatus.DRAFT: return <Badge variant="outline">Draft</Badge>;
      case WeeklyPlanStatus.SUBMITTED: return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">Submitted</Badge>;
      case WeeklyPlanStatus.NEEDS_CHANGES: return <Badge variant="destructive">Needs Changes</Badge>;
      case WeeklyPlanStatus.APPROVED: return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">Approved</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (builder.userLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!builder.userId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-muted-foreground">Please log in to access the Weekly Plan Builder.</p>
      </div>
    );
  }

  const hasNoPlanYet = builder.planItems.length === 0 && !builder.isLoading;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4">
      <PageHeader
        title="Weekly Plan Builder"
        subtitle={`Smart Planner · Week of ${builder.week.days[0].label} – ${builder.week.days[4].label}`}
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance/dashboard' },
          { label: 'Audit Planning', href: '/compliance/audit-planning/sampling-dashboard' },
          { label: 'Weekly Plan Builder' },
        ]}
        actions={
          onSwitchToLegacy && (
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={onSwitchToLegacy}>
              Use Legacy View
            </Button>
          )
        }
      />

      {/* Section 1 — Weekly Overview */}
      <SmartOverviewBar
        planItems={builder.planItems}
        candidates={builder.candidates}
        addedSourceIds={builder.addedSourceIds}
      />

      {/* Three-path Employer Selection Workbench
          (Recommended | Direct | Exception | Planned) — always visible so the
          redesigned selection model is discoverable from any builder route. */}
      <EmployerSelectionWorkbench
        planId={builder.activePlanId}
        userCode={builder.userCode}
        weekDays={builder.week.days}
        planItems={builder.planItems}
        recommended={builder.candidates}
        addedSourceIds={builder.addedSourceIds}
        canEdit={builder.canEdit}
        canApproveExceptions={role === 'head' || role === 'senior'}
        addItem={builder.addManualItem}
        onAddRecommended={(c, d) => builder.addCandidateToDay(c, d)}
      />

      {/* Action ribbon — week nav, status, primary flow */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8"
                onClick={() => builder.setSelectedWeekRef(subWeeks(builder.selectedWeekRef, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[140px] text-center">
                {builder.week.days[0].label} – {builder.week.days[4].label}
              </span>
              <Button variant="outline" size="icon" className="h-8 w-8"
                onClick={() => builder.setSelectedWeekRef(addWeeks(builder.selectedWeekRef, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {builder.activePlan ? (
                <>
                  <span className="text-xs text-muted-foreground">{builder.activePlan.plan_number}</span>
                  {getStatusBadge(builder.activePlan.status)}
                </>
              ) : (
                <Badge variant="outline" className="text-xs">No plan yet</Badge>
              )}
            </div>

            {/* Primary flow */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="ghost" size="sm"
                onClick={() => { builder.refreshCandidates(); builder.refreshPlan(); }}
                className="h-8 gap-1 text-xs">
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>

              {builder.canEdit && (
                <Button
                  size="sm"
                  onClick={handleGenerateDraft}
                  disabled={isGenerating || builder.candidatesLoading}
                  className="h-8 gap-1.5"
                >
                  {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                  {hasNoPlanYet ? 'Generate Smart Plan' : 'Re-generate'}
                </Button>
              )}

              <Button variant="outline" size="sm"
                onClick={() => setAddItemDialogOpen(true)}
                disabled={!builder.canEdit}
                className="h-8 gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Exception
              </Button>

              {builder.canEdit && (
                <Button size="sm"
                  onClick={handleSubmit}
                  disabled={builder.isSubmitting || !readiness.isReady}
                  className="h-8 gap-1.5"
                  variant={readiness.isReady ? 'default' : 'secondary'}>
                  {builder.isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {builder.isNeedsChanges ? 'Resubmit' : 'Submit for Review'}
                </Button>
              )}

              {builder.activePlan && !builder.canEdit && (
                <Badge variant="secondary" className="text-xs">
                  {builder.activePlan.status === WeeklyPlanStatus.SUBMITTED && 'Awaiting Review'}
                  {builder.activePlan.status === WeeklyPlanStatus.APPROVED && 'Approved — Locked'}
                  {builder.activePlan.status === 'RESUBMITTED' && 'Awaiting Review'}
                  {builder.activePlan.status === WeeklyPlanStatus.IN_EXECUTION && 'In Execution'}
                  {builder.activePlan.status === WeeklyPlanStatus.COMPLETED && 'Completed'}
                </Badge>
              )}
            </div>
          </div>

          {builder.activePlan?.status === WeeklyPlanStatus.NEEDS_CHANGES && builder.activePlan.reviewer_comments && (
            <div className="mt-3 p-3 bg-destructive/5 border border-destructive/20 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-destructive">Changes Requested</p>
                  <p className="text-sm text-muted-foreground mt-1">{builder.activePlan.reviewer_comments}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2 — Smart Draft empty-state CTA */}
      {hasNoPlanYet && builder.canEdit && (
        <Card className="border-primary/30 bg-primary/[0.02]">
          <CardContent className="p-6 flex flex-col md:flex-row items-center gap-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <p className="font-semibold">Start with a System Recommended Plan</p>
              <p className="text-sm text-muted-foreground">
                Auto-schedules overdue, critical, and high-exposure items across the week.
                You can adjust everything before submitting.
              </p>
            </div>
            <Button onClick={handleGenerateDraft} disabled={isGenerating || builder.candidatesLoading} className="gap-1.5">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Generate Smart Plan
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main grid: Board + Suggestions + Validation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Section 3 — Planning Board */}
        <div className="lg:col-span-8 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Planning Board
                </span>
                {builder.activePlan?.status === WeeklyPlanStatus.DRAFT && (
                  <Badge variant="outline" className="text-[10px]">
                    <Sparkles className="h-3 w-3 mr-1" /> System Recommended
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                {builder.week.days.map(day => {
                  const items = builder.itemsByDay[day.name] || [];
                  const load = getDayLoad(items.length);
                  const visits = items.filter(i => i.item_type === 'EMPLOYER_VISIT' || i.item_type === 'SCOUTING').length;
                  const highRisk = items.filter(i => i.priority === 'CRITICAL' || i.priority === 'HIGH').length;

                  return (
                    <div
                      key={day.name}
                      className={`rounded-lg border ${load.ring} ${load.bg} p-2.5 min-h-[220px] flex flex-col`}
                    >
                      {/* Day header */}
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-xs font-semibold">{day.name.substring(0, 3)}</p>
                          <p className="text-[10px] text-muted-foreground">{day.label}</p>
                        </div>
                        <Badge variant="outline" className={`text-[10px] ${load.tone} border-current`}>
                          {load.label}
                        </Badge>
                      </div>

                      {/* Per-day metrics — no hours */}
                      <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 text-[10px] text-muted-foreground mb-2">
                        <span title="Total items">
                          {items.length} {items.length === 1 ? 'item' : 'items'}
                        </span>
                        {visits > 0 && (
                          <span title="Visits" className="flex items-center gap-1">
                            <span aria-hidden="true">·</span>
                            {visits} {visits === 1 ? 'visit' : 'visits'}
                          </span>
                        )}
                        {highRisk > 0 && (
                          <span className="flex items-center gap-1 text-destructive font-medium" title="High risk">
                            <span aria-hidden="true">·</span>
                            <Flame className="h-2.5 w-2.5" />
                            {highRisk}
                          </span>
                        )}
                      </div>

                      {/* Items list */}
                      <ScrollArea className="flex-1 -mx-1 px-1">
                        <div className="space-y-1.5">
                          {items.length === 0 ? (
                            <div className="text-center py-6 text-[10px] text-muted-foreground border border-dashed rounded">
                              No items
                            </div>
                          ) : (
                            items.map(item => (
                              <DayItemPill
                                key={item.id}
                                item={item}
                                canEdit={builder.canEdit}
                                onMove={(target) => builder.moveItemToDay(item.id, target)}
                                onRemove={() => builder.removeItem(item.id)}
                              />
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Plan Narrative */}
          {(builder.activePlanId || builder.planItems.length > 0) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Plan Narrative</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={narrative}
                  onChange={e => setNarrative(e.target.value)}
                  placeholder="Describe your priorities, focus areas, and any considerations for this week..."
                  rows={3}
                  disabled={!builder.canEdit}
                  className="text-sm"
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column — Validation + Suggestions */}
        <div className="lg:col-span-4 space-y-4">
          {/* Section 5 — Validation */}
          <PlanValidationPanel readiness={readiness} />

          {/* Section 4 — Intelligent Suggestions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-primary" />
                  Smart Suggestions
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {topSuggestions.length} pending
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[420px] pr-2">
                {builder.candidatesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : topSuggestions.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                    All suggestions handled
                  </div>
                ) : (
                  <div className="space-y-2">
                    {topSuggestions.map(c => (
                      <SmartSuggestionCard
                        key={c.source_id || c.source_ref}
                        candidate={c}
                        recommendedDay={recommendDay(c, builder.itemsByDay)}
                        canEdit={builder.canEdit}
                        onAddToDay={(day) => builder.addCandidateToDay(c, day)}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Exception Item Dialog */}
      <PlanItemFormDialog
        open={addItemDialogOpen}
        onOpenChange={setAddItemDialogOpen}
        onSubmit={builder.addManualItem}
        weekDays={builder.week.days}
      />

      {/* Section 7 — Submission summary */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              {builder.isNeedsChanges ? 'Resubmit Weekly Plan' : 'Submit Weekly Plan'}
            </DialogTitle>
            <DialogDescription>
              Review the summary below before sending the plan to your supervisor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Summary tiles */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-md border bg-card p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Total Visits</p>
                <p className="text-lg font-bold">{builder.planItems.length}</p>
              </div>
              <div className="rounded-md border bg-card p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Risk Coverage</p>
                <p className="text-lg font-bold">{readiness.score}<span className="text-xs text-muted-foreground">/100</span></p>
              </div>
              <div className="rounded-md border bg-card p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Pending Items</p>
                <p className="text-lg font-bold">{topSuggestions.length}</p>
              </div>
            </div>

            {/* Per-day distribution */}
            <div>
              <Label className="text-xs text-muted-foreground">Distribution</Label>
              <div className="grid grid-cols-5 gap-1 mt-1">
                {builder.week.days.map(day => {
                  const ct = builder.itemsByDay[day.name]?.length || 0;
                  const load = getDayLoad(ct);
                  return (
                    <div key={day.name} className={`text-center p-2 rounded ${load.bg} border ${load.ring}`}>
                      <p className="text-[10px] text-muted-foreground">{day.name.substring(0, 3)}</p>
                      <p className="text-sm font-semibold">{ct}</p>
                      <p className={`text-[9px] ${load.tone}`}>{load.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {!narrative && (
              <div className="space-y-1.5">
                <Label className="text-xs">Add a narrative (optional)</Label>
                <Textarea value={narrative} onChange={e => setNarrative(e.target.value)}
                  placeholder="Brief summary of your priorities for this week..." rows={3} className="text-sm" />
              </div>
            )}
            {narrative && (
              <div>
                <Label className="text-xs text-muted-foreground">Narrative</Label>
                <p className="text-sm mt-1 bg-muted/30 p-2 rounded">{narrative}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmSubmit} disabled={builder.isSubmitting}>
              {builder.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              {builder.isNeedsChanges ? 'Resubmit' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------- Sub-components ----------------

function DayItemPill({
  item, canEdit, onMove, onRemove,
}: {
  item: WeeklyPlanItem;
  canEdit: boolean;
  onMove: (day: DayOfWeek) => void;
  onRemove: () => void;
}) {
  const name = item.employer_name || item.area_name || item.purpose || 'Untitled';
  const priorityCls = getPriorityChip(item.priority);

  return (
    <div className="group bg-card border rounded p-1.5 text-[11px] hover:shadow-sm transition">
      <div className="flex items-start gap-1">
        <Building2 className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
        <span className="font-medium truncate flex-1" title={name}>{name}</span>
      </div>
      <div className="flex items-center justify-between mt-1 gap-1">
        <Badge variant="outline" className={`text-[9px] px-1 py-0 ${priorityCls}`}>
          {item.priority || 'MED'}
        </Badge>
        {canEdit && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" title="Move to day">
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {DAYS.map(d => (
                  <DropdownMenuItem key={d} onClick={() => onMove(d)}>
                    Move to {d}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={onRemove}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function SmartSuggestionCard({
  candidate, recommendedDay, canEdit, onAddToDay,
}: {
  candidate: PlanCandidate;
  recommendedDay: DayOfWeek;
  canEdit: boolean;
  onAddToDay: (day: DayOfWeek) => void;
}) {
  const score = candidate.recommendation_score ?? 0;
  const priorityCls = getPriorityChip(candidate.priority);
  const sla = candidate.due_date
    ? (() => {
        const days = Math.ceil((new Date(candidate.due_date!).getTime() - Date.now()) / 86400000);
        if (days < 0) return { label: `Overdue ${Math.abs(days)}d`, tone: 'text-destructive' };
        if (days <= 3) return { label: `Due in ${days}d`, tone: 'text-amber-700 dark:text-amber-400' };
        return { label: `Due in ${days}d`, tone: 'text-muted-foreground' };
      })()
    : null;

  const exposure = candidate.financial_exposure
    ? `$${Math.round(candidate.financial_exposure).toLocaleString()}`
    : null;

  return (
    <div className="border rounded-md p-2 bg-card hover:bg-accent/30 transition">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${priorityCls}`}>
            {candidate.priority || 'MEDIUM'}
          </Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
            score {score}
          </Badge>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground shrink-0">{candidate.source_ref}</span>
      </div>

      {/* Employer */}
      {candidate.employer_name && (
        <div className="flex items-center gap-1 text-xs font-medium truncate" title={candidate.employer_name}>
          <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="truncate">{candidate.employer_name}</span>
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground flex-wrap">
        {sla && <span className={sla.tone}>{sla.label}</span>}
        {exposure && <span>· {exposure} exposure</span>}
        {candidate.territory && <span>· {candidate.territory}</span>}
      </div>

      {/* Recommendation row */}
      <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" />
          Recommended: <span className="font-medium text-foreground">{recommendedDay}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="default"
            className="h-6 text-[10px] px-2 gap-1"
            disabled={!canEdit}
            onClick={() => onAddToDay(recommendedDay)}
          >
            <CalendarPlus className="h-3 w-3" />
            Quick Add
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-6 text-[10px] px-1.5" disabled={!canEdit}>
                <ChevronRight className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {DAYS.map(d => (
                <DropdownMenuItem key={d} onClick={() => onAddToDay(d)}>
                  Add to {d}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
