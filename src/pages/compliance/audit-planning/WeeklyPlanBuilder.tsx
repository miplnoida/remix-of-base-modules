import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import WeeklyPlanBuilderSmart from './WeeklyPlanBuilderSmart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Save,
  Send,
  Plus,
  Loader2,
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Wand2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, addWeeks, subWeeks } from 'date-fns';

import { useWeeklyPlanBuilder, DayOfWeek } from '@/hooks/useWeeklyPlanBuilder';
import { CandidateQueuePanel } from '@/components/compliance/weekly-plan/CandidateQueuePanel';
import { WeeklyBoardPanel } from '@/components/compliance/weekly-plan/WeeklyBoardPanel';
import { PlanItemFormDialog } from '@/components/compliance/weekly-plan/PlanItemFormDialog';
import { PlanKPISummary } from '@/components/compliance/weekly-plan/PlanKPISummary';
import { DayDetailPanel } from '@/components/compliance/weekly-plan/DayDetailPanel';
import { WeeklyPlanStatus } from '@/types/weeklyPlan';
import { generateSmartDraft, draftToRequests } from '@/lib/smartDraftEngine';

const STORAGE_KEY = 'compliance.weeklyPlan.viewMode';
type ViewMode = 'smart' | 'legacy';

export default function WeeklyPlanBuilder() {
  const [mode, setMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'smart';
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'legacy' ? 'legacy' : 'smart';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, mode);
    }
  }, [mode]);

  if (mode === 'smart') {
    return <WeeklyPlanBuilderSmart onSwitchToLegacy={() => setMode('legacy')} />;
  }
  return <WeeklyPlanBuilderLegacy onSwitchToSmart={() => setMode('smart')} />;
}

function WeeklyPlanBuilderLegacy({ onSwitchToSmart }: { onSwitchToSmart: () => void }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const builder = useWeeklyPlanBuilder();

  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [narrative, setNarrative] = useState(builder.activePlan?.narrative || '');
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Sync narrative when plan loads
  const planNarrative = builder.activePlan?.narrative || '';
  if (narrative === '' && planNarrative) {
    setNarrative(planNarrative);
  }

  const handleGenerateDraft = useCallback(async () => {
    if (!builder.canEdit) return;
    setIsGenerating(true);
    try {
      const result = generateSmartDraft(builder.candidates, builder.addedSourceIds);

      if (result.draftItems.length === 0) {
        toast({ title: 'No Suggestions', description: 'No candidate items available to auto-schedule.' });
        setIsGenerating(false);
        return;
      }

      const requests = draftToRequests(result.draftItems, '', builder.week.days, '');

      // Add items sequentially to avoid race conditions
      let addedCount = 0;
      for (const req of requests) {
        try {
          await builder.addManualItem(req);
          addedCount++;
        } catch {
          // Skip failed items
        }
      }

      if (result.warnings.length > 0) {
        toast({
          title: `Draft Generated — ${addedCount} items added`,
          description: result.warnings[0],
        });
      } else {
        toast({
          title: 'Smart Draft Generated',
          description: `${addedCount} items auto-scheduled across the week.`,
        });
      }

      if (result.unscheduled.length > 0) {
        toast({
          title: 'Unscheduled Items',
          description: `${result.unscheduled.length} items could not fit — review manually.`,
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to generate draft', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  }, [builder, toast]);

  const handleSaveDraft = async () => {
    try {
      await builder.saveNarrative(narrative);
    } catch {
      // Error handled in hook
    }
  };

  const handleSubmit = async () => {
    if (builder.planItems.length === 0) {
      toast({
        title: 'Cannot Submit',
        description: 'Please add at least one item to your plan before submitting.',
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

  const selectedDayItems = selectedDay ? (builder.itemsByDay[selectedDay] || []) : [];
  const selectedDayLabel = selectedDay ? (builder.week.days.find(d => d.name === selectedDay)?.label || '') : '';

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4">
      <PageHeader
        title="Weekly Plan Builder"
        subtitle={`Legacy View · Week of ${builder.week.days[0].label} – ${builder.week.days[4].label}`}
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance/dashboard' },
          { label: 'Audit Planning', href: '/compliance/audit-planning/sampling-dashboard' },
          { label: 'Weekly Plan Builder' },
        ]}
        actions={
          <Button variant="default" size="sm" className="gap-1.5" onClick={onSwitchToSmart}>
            <Wand2 className="h-3.5 w-3.5" />
            Switch to Smart Planner
          </Button>
        }
      />

      {/* KPI Summary */}
      <PlanKPISummary
        planItems={builder.planItems}
        candidates={builder.candidates}
        addedSourceIds={builder.addedSourceIds}
      />

      {/* Week navigation + plan status + actions */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Week navigation */}
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

            {/* Plan status */}
            <div className="flex items-center gap-2">
              {builder.activePlan ? (
                <>
                  <span className="text-xs text-muted-foreground">{builder.activePlan.plan_number}</span>
                  {getStatusBadge(builder.activePlan.status)}
                </>
              ) : (
                <Badge variant="outline" className="text-xs">No plan yet — add items or generate draft</Badge>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="ghost" size="sm"
                onClick={() => { builder.refreshCandidates(); builder.refreshPlan(); }}
                className="h-8 gap-1 text-xs">
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>

              {builder.canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateDraft}
                  disabled={isGenerating || builder.candidatesLoading}
                  className="h-8 gap-1 text-xs"
                >
                  {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                  Generate Draft
                </Button>
              )}

              <Button variant="outline" size="sm"
                onClick={() => setAddItemDialogOpen(true)}
                disabled={!builder.canEdit}
                className="h-8 gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Exception Item
              </Button>

              {builder.canEdit && (
                <>
                  <Button variant="outline" size="sm"
                    onClick={handleSaveDraft}
                    disabled={builder.isSaving || !builder.activePlanId}
                    className="h-8 gap-1 text-xs">
                    {builder.isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save Draft
                  </Button>
                  <Button size="sm"
                    onClick={handleSubmit}
                    disabled={builder.isSubmitting || builder.planItems.length === 0}
                    className="h-8 gap-1 text-xs"
                    variant={builder.isNeedsChanges ? 'default' : 'default'}>
                    {builder.isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    {builder.isNeedsChanges ? 'Update & Resubmit' : 'Submit for Review'}
                  </Button>
                </>
              )}

              {/* Read-only status indicators */}
              {builder.activePlan && !builder.canEdit && (
                <Badge variant="secondary" className="text-xs">
                  {builder.activePlan.status === WeeklyPlanStatus.SUBMITTED && 'Awaiting Review'}
                  {builder.activePlan.status === WeeklyPlanStatus.APPROVED && 'Approved — Locked'}
                  {builder.activePlan.status === 'RESUBMITTED' && 'Resubmitted — Awaiting Review'}
                  {builder.activePlan.status === WeeklyPlanStatus.IN_EXECUTION && 'In Execution'}
                  {builder.activePlan.status === WeeklyPlanStatus.COMPLETED && 'Completed'}
                </Badge>
              )}
            </div>
          </div>

          {/* Supervisor feedback */}
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

      {/* Two-panel layout: Suggestions (left) + Board + Detail (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Suggestions panel */}
        <div className="lg:col-span-3 xl:col-span-3">
          <CandidateQueuePanel
            candidates={builder.candidates}
            addedSourceIds={builder.addedSourceIds}
            onAddToDay={(candidate, day) => builder.addCandidateToDay(candidate, day)}
            isLoading={builder.candidatesLoading}
            disabled={!builder.canEdit}
          />
        </div>

        {/* Right: Weekly Board + Day Detail + Narrative */}
        <div className="lg:col-span-9 xl:col-span-9 space-y-4">
          {builder.isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <WeeklyBoardPanel
                days={builder.week.days}
                itemsByDay={builder.itemsByDay}
                onRemoveItem={builder.removeItem}
                canEdit={builder.canEdit}
                totalItems={builder.planItems.length}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
              />

              {/* Day Detail - shows when a day is selected */}
              {selectedDay && (
                <DayDetailPanel
                  selectedDay={selectedDay}
                  items={selectedDayItems}
                  dateLabel={selectedDayLabel}
                />
              )}
            </>
          )}

          {/* Plan Narrative */}
          {(builder.activePlanId || builder.planItems.length > 0) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Plan Narrative
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={narrative}
                  onChange={e => setNarrative(e.target.value)}
                  placeholder="Describe your plan priorities, focus areas, and any special considerations for this week..."
                  rows={3}
                  disabled={!builder.canEdit}
                  className="text-sm"
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Exception Item Dialog */}
      <PlanItemFormDialog
        open={addItemDialogOpen}
        onOpenChange={setAddItemDialogOpen}
        onSubmit={builder.addManualItem}
        weekDays={builder.week.days}
      />

      {/* Submit Confirmation Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{builder.isNeedsChanges ? 'Resubmit Weekly Plan' : 'Submit Weekly Plan'}</DialogTitle>
            <DialogDescription>
              {builder.isNeedsChanges
                ? `Resubmit your updated plan with ${builder.planItems.length} items for supervisor review.`
                : `Submit your plan with ${builder.planItems.length} items for supervisor review.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="text-sm">
              <Label className="text-xs text-muted-foreground">Plan Summary</Label>
              <div className="grid grid-cols-5 gap-1 mt-1">
                {builder.week.days.map(day => (
                  <div key={day.name} className="text-center p-2 bg-muted/40 rounded">
                    <p className="text-[10px] text-muted-foreground">{day.name.substring(0, 3)}</p>
                    <p className="text-sm font-semibold">{builder.itemsByDay[day.name]?.length || 0}</p>
                  </div>
                ))}
              </div>
            </div>
            {narrative && (
              <div>
                <Label className="text-xs text-muted-foreground">Narrative</Label>
                <p className="text-sm mt-1 bg-muted/30 p-2 rounded">{narrative}</p>
              </div>
            )}
            {!narrative && (
              <div className="space-y-1.5">
                <Label className="text-xs">Add a narrative (optional)</Label>
                <Textarea value={narrative} onChange={e => setNarrative(e.target.value)}
                  placeholder="Brief summary of your priorities for this week..." rows={3} className="text-sm" />
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
