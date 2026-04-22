// ============================================
// EmployerSelectionWorkbench
// ============================================
// Persistent, on-page surface that exposes the redesigned three-path
// employer-selection model directly in the Weekly Plan Builder — without
// requiring the user to open the Add Employer dialog to discover it.
//
//   Tabs: Recommended  |  Direct Selection  |  Exception  |  Planned
//
// All four sections are always rendered. Edit operations are gated by
// `canEdit`; when the plan is locked the tabs remain visible (so the
// architecture is discoverable) but the action buttons are disabled with
// an explanatory hint.
// ============================================
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Sparkles,
  Building2,
  ShieldAlert,
  ClipboardList,
  Lock,
  Plus,
} from 'lucide-react';

import { AddEmployerToPlanDialog } from './AddEmployerToPlanDialog';
import { PlannedEmployersList } from './PlannedEmployersList';
import { DayOfWeek } from '@/hooks/useWeeklyPlanBuilder';
import { PlanCandidate, WeeklyPlanItem } from '@/types/weeklyPlan';

interface Props {
  planId: string | null | undefined;
  userCode: string | null | undefined;
  weekDays: { name: DayOfWeek; date: string }[];
  planItems: WeeklyPlanItem[];
  recommended: PlanCandidate[];
  addedSourceIds: Set<string | null>;
  canEdit: boolean;
  canApproveExceptions: boolean;
  addItem: (item: any) => Promise<unknown>;
  onAddRecommended: (candidate: PlanCandidate, day: DayOfWeek) => Promise<void> | void;
}

export function EmployerSelectionWorkbench({
  planId,
  userCode,
  weekDays,
  planItems,
  recommended,
  addedSourceIds,
  canEdit,
  canApproveExceptions,
  addItem,
  onAddRecommended,
}: Props) {
  const [tab, setTab] = useState<'recommended' | 'direct' | 'exception' | 'planned'>('recommended');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTab, setDialogTab] = useState<'recommended' | 'direct' | 'exception'>('recommended');

  const recommendedCount = recommended.filter(c => !addedSourceIds.has(c.source_id)).length;
  const exceptionCount = planItems.filter(
    i => (i as any).selection_mode === 'EXCEPTION',
  ).length;

  const openDialog = (which: 'recommended' | 'direct' | 'exception') => {
    setDialogTab(which);
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Employer Selection
            <Badge variant="outline" className="text-[10px] font-normal">
              3 controlled paths
            </Badge>
          </CardTitle>
          {!canEdit && (
            <Badge variant="outline" className="gap-1 text-[11px] text-muted-foreground">
              <Lock className="h-3 w-3" /> Plan locked — view only
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-2 space-y-3">
        {!canEdit && (
          <Alert className="border-muted-foreground/20 bg-muted/30 py-2">
            <AlertDescription className="text-xs text-muted-foreground">
              The plan is approved or in execution. Use{' '}
              <strong>Revise Approved Plan</strong> in the header to open a working
              revision before adding new employers.
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={tab} onValueChange={v => setTab(v as any)}>
          <TabsList className="flex w-full flex-wrap gap-1 h-auto">
            <TabsTrigger value="recommended" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Recommended
              <Badge variant="secondary" className="ml-1 text-[10px]">{recommendedCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="direct" className="gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Direct Selection
            </TabsTrigger>
            <TabsTrigger value="exception" className="gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" /> Exception
              {exceptionCount > 0 && (
                <Badge variant="outline" className="ml-1 text-[10px]">{exceptionCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="planned" className="gap-1.5">
              <ClipboardList className="h-3.5 w-3.5" /> Planned
              <Badge variant="secondary" className="ml-1 text-[10px]">{planItems.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recommended" className="mt-3">
            <PathSummaryPanel
              icon={<Sparkles className="h-4 w-4 text-primary" />}
              title="Recommended employers"
              description="Surfaced by risk score, audit history, overdue follow-up, sector focus, complaint flags, or planning rules."
              count={recommendedCount}
              countLabel="awaiting selection"
              actionLabel="Browse & add"
              disabled={!canEdit || recommendedCount === 0}
              onAction={() => openDialog('recommended')}
            />
          </TabsContent>

          <TabsContent value="direct" className="mt-3">
            <PathSummaryPanel
              icon={<Building2 className="h-4 w-4 text-primary" />}
              title="Direct employer selection"
              description="Search any employer in Employer Master (name, ID, registration, phone, email, sector). Bypasses recommendation logic but still runs validation, conflict checks, and intelligence."
              actionLabel="Search Employer Master"
              disabled={!canEdit}
              onAction={() => openDialog('direct')}
            />
          </TabsContent>

          <TabsContent value="exception" className="mt-3">
            <PathSummaryPanel
              icon={<ShieldAlert className="h-4 w-4 text-warning" />}
              title="Exception (controlled override)"
              description="Governed override workflow — employer must be selected from Master, an exception category is mandatory, and high-impact categories route for supervisor approval. No free-text employer entry."
              count={exceptionCount}
              countLabel="logged this week"
              actionLabel="Start exception flow"
              disabled={!canEdit}
              onAction={() => openDialog('exception')}
            />
          </TabsContent>

          <TabsContent value="planned" className="mt-3">
            <PlannedEmployersList
              planId={planId}
              userCode={userCode}
              weekDays={weekDays}
              items={planItems}
              canApproveExceptions={canApproveExceptions}
              addItem={addItem}
            />
          </TabsContent>
        </Tabs>
      </CardContent>

      <AddEmployerToPlanDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        weekDays={weekDays}
        planId={planId}
        userCode={userCode}
        existingItems={planItems}
        addItem={addItem}
        recommended={recommended}
        addedSourceIds={addedSourceIds}
        onAddRecommended={onAddRecommended}
        defaultTab={dialogTab}
      />
    </Card>
  );
}

function PathSummaryPanel({
  icon,
  title,
  description,
  count,
  countLabel,
  actionLabel,
  disabled,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  count?: number;
  countLabel?: string;
  actionLabel: string;
  disabled?: boolean;
  onAction: () => void;
}) {
  return (
    <div className="rounded-md border bg-card p-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
      <div className="flex gap-3 min-w-0">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div className="min-w-0">
          <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
            {title}
            {typeof count === 'number' && (
              <Badge variant="secondary" className="text-[10px]">
                {count} {countLabel}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Button size="sm" onClick={onAction} disabled={disabled} className="shrink-0">
        {actionLabel}
      </Button>
    </div>
  );
}
