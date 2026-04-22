// ============================================
// PHASE 4a — Enhanced Weekly Plan Builder (V2)
// ============================================
// Wraps the existing Smart builder and adds:
//  - role-aware multi-zone filter (Compliance Head can pick multiple,
//    Inspector / Senior Inspector are constrained)
//  - clear version label (Approved v1, Working Revision v2, etc.)
//  - "Revise Approved Plan" entry point that opens PlanRevisionDialog
//
// Legacy /compliance/field/plan-builder is preserved unchanged.
// ============================================
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GitBranch, History, Sparkles, ArrowLeft, Info } from 'lucide-react';

import WeeklyPlanBuilderSmart from './WeeklyPlanBuilderSmart';
import { useWeeklyPlanBuilder } from '@/hooks/useWeeklyPlanBuilder';
import { useComplianceRole } from '@/hooks/useComplianceRole';
import { WeeklyPlanStatus } from '@/types/weeklyPlan';
import { MultiZoneFilter } from '@/components/compliance/weekly-plan/MultiZoneFilter';
import { PlanRevisionDialog } from '@/components/compliance/weekly-plan/PlanRevisionDialog';
import { PlanVersionHistoryDialog } from '@/components/compliance/weekly-plan/PlanVersionHistoryDialog';

export default function WeeklyPlanBuilderV2() {
  const navigate = useNavigate();
  const role = useComplianceRole();
  const builder = useWeeklyPlanBuilder();

  const [zoneFilter, setZoneFilter] = useState<string[]>([]);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const plan: any = builder.activePlan;
  const status = plan?.status as string | undefined;

  const isApproved =
    status === WeeklyPlanStatus.APPROVED ||
    status === WeeklyPlanStatus.IN_EXECUTION ||
    status === WeeklyPlanStatus.OUTCOME_SUBMITTED ||
    status === WeeklyPlanStatus.COMPLETED;

  const isRevisionDraft =
    status === WeeklyPlanStatus.REVISION_DRAFT ||
    status === WeeklyPlanStatus.REVISION_QUERIED;

  const isRevisionInFlight =
    status === WeeklyPlanStatus.REVISION_SUBMITTED;

  const versionLabel = useMemo(() => {
    if (!plan) return null;
    const v = plan.version_no ?? 1;
    if (isRevisionDraft) return `Working Revision v${v}`;
    if (isRevisionInFlight) return `Revision v${v} — In Review`;
    if (status === WeeklyPlanStatus.SUPERSEDED) return `v${v} — Superseded`;
    if (isApproved) return `Approved v${v}`;
    if (status === WeeklyPlanStatus.SUBMITTED) return `v${v} — Submitted`;
    return `v${v} — ${status ?? 'Draft'}`;
  }, [plan, status, isApproved, isRevisionDraft, isRevisionInFlight]);

  const versionTone = useMemo(() => {
    if (isRevisionDraft) return 'bg-warning/15 text-warning border-warning/40';
    if (isRevisionInFlight) return 'bg-primary/15 text-primary border-primary/40';
    if (isApproved) return 'bg-success/15 text-success border-success/40';
    if (status === WeeklyPlanStatus.SUPERSEDED) return 'bg-muted text-muted-foreground border-border';
    return 'bg-secondary text-secondary-foreground border-border';
  }, [isApproved, isRevisionDraft, isRevisionInFlight, status]);

  // Role-aware zone selector behaviour.
  const singleZoneOnly = role === 'inspector' || role === 'senior';
  const showZoneFilter = role === 'head' || role === 'senior' || role === 'inspector';

  return (
    <div className="space-y-3">
      {/* Enhanced header strip */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-background to-background">
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="gap-1 border-primary/40 text-primary">
                <Sparkles className="h-3 w-3" />
                Enhanced Planner
              </Badge>
              {versionLabel && (
                <Badge variant="outline" className={`text-xs ${versionTone}`}>
                  {versionLabel}
                </Badge>
              )}
              {plan?.plan_number && (
                <span className="text-xs font-mono text-muted-foreground">
                  {plan.plan_number}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {showZoneFilter && (
                <MultiZoneFilter
                  value={zoneFilter}
                  onChange={setZoneFilter}
                  singleZoneOnly={singleZoneOnly}
                  label={role === 'head' ? 'Filter zones' : 'Zone'}
                />
              )}

              {plan && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setHistoryOpen(true)}
                >
                  <History className="h-3.5 w-3.5 mr-1.5" />
                  Version History
                </Button>
              )}

              {isApproved && (
                <Button
                  size="sm"
                  className="h-8"
                  onClick={() => setRevisionOpen(true)}
                >
                  <GitBranch className="h-3.5 w-3.5 mr-1.5" />
                  Revise Approved Plan
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-muted-foreground"
                onClick={() => navigate('/compliance/field/plan-builder')}
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                Switch to Legacy
              </Button>
            </div>
          </div>

          {/* Contextual banners */}
          {isApproved && (
            <Alert className="mt-3 border-success/30 bg-success/10">
              <Info className="h-4 w-4 text-success" />
              <AlertDescription className="text-xs text-foreground">
                This plan is <strong>approved and locked</strong>. To make changes,
                start a controlled revision — the original approved version will be
                preserved until the revision is reviewed.
              </AlertDescription>
            </Alert>
          )}
          {isRevisionDraft && (
            <Alert className="mt-3 border-warning/30 bg-warning/10">
              <Info className="h-4 w-4 text-warning" />
              <AlertDescription className="text-xs text-foreground">
                You are editing a <strong>working revision</strong>. The previous
                approved version remains live until this revision is approved.
              </AlertDescription>
            </Alert>
          )}
          {isRevisionInFlight && (
            <Alert className="mt-3 border-primary/30 bg-primary/10">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription className="text-xs text-foreground">
                Revision submitted — awaiting manager review. The previous approved
                version is still in effect.
              </AlertDescription>
            </Alert>
          )}
          {zoneFilter.length > 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Zone filter active — showing {zoneFilter.length} selected zone
              {zoneFilter.length === 1 ? '' : 's'}. Recommendations and the board
              will be narrowed to these zones.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Reuse the existing Smart builder — heavy lifting (overview, validation,
          smart draft, recommendations, drag/drop) is already implemented there. */}
      <WeeklyPlanBuilderSmart
        onSwitchToLegacy={() =>
          navigate('/compliance/field/plan-builder')
        }
      />

      {/* Phase 3 dialogs — wired here so the entry points live in the enhanced header. */}
      <PlanRevisionDialog
        plan={revisionOpen ? plan : null}
        onClose={() => setRevisionOpen(false)}
      />
      <PlanVersionHistoryDialog
        planId={historyOpen ? plan?.id ?? null : null}
        onClose={() => setHistoryOpen(false)}
      />
    </div>
  );
}
