// ============================================
// SMART OVERVIEW BAR — Top KPI strip for Smart Planner
// Workload is expressed as item count + qualitative load (not hours)
// ============================================

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { WeeklyPlanItem, PlanCandidate } from '@/types/weeklyPlan';
import { classifyCandidate } from '@/lib/smartDraftEngine';
import {
  ListChecks,
  AlertTriangle,
  Flame,
  ShieldCheck,
} from 'lucide-react';

interface SmartOverviewBarProps {
  planItems: WeeklyPlanItem[];
  candidates: PlanCandidate[];
  addedSourceIds: Set<string | null>;
}

// Workload buckets — purely item-count based (no hours)
function getWorkloadBucket(count: number): {
  label: 'Light' | 'Balanced' | 'Heavy';
  tone: string;
  bg: string;
  ring: string;
} {
  if (count <= 5) return { label: 'Light', tone: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', ring: 'border-amber-200 dark:border-amber-900' };
  if (count <= 15) return { label: 'Balanced', tone: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', ring: 'border-emerald-200 dark:border-emerald-900' };
  return { label: 'Heavy', tone: 'text-destructive', bg: 'bg-destructive/5', ring: 'border-destructive/30' };
}

function getRiskTone(count: number) {
  if (count === 0) return { tone: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', ring: 'border-emerald-200 dark:border-emerald-900' };
  if (count <= 2) return { tone: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', ring: 'border-amber-200 dark:border-amber-900' };
  return { tone: 'text-destructive', bg: 'bg-destructive/5', ring: 'border-destructive/30' };
}

function getCoverageTone(pct: number) {
  if (pct >= 80) return { tone: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', ring: 'border-emerald-200 dark:border-emerald-900' };
  if (pct >= 50) return { tone: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', ring: 'border-amber-200 dark:border-amber-900' };
  return { tone: 'text-destructive', bg: 'bg-destructive/5', ring: 'border-destructive/30' };
}

export function SmartOverviewBar({ planItems, candidates, addedSourceIds }: SmartOverviewBarProps) {
  // Workload — total visits planned this week (not hours)
  const totalWorkload = planItems.length;
  const workload = getWorkloadBucket(totalWorkload);

  // High risk in plan
  const highRiskInPlan = planItems.filter(
    i => i.priority === 'CRITICAL' || i.priority === 'HIGH'
  ).length;
  const risk = getRiskTone(highRiskInPlan);

  // Overdue still not addressed
  const overdueCandidates = candidates.filter(c => classifyCandidate(c) === 'OVERDUE');
  const overdueAddressed = overdueCandidates.filter(c => addedSourceIds.has(c.source_id)).length;
  const overdueRemaining = overdueCandidates.length - overdueAddressed;

  // Coverage of "critical" universe (CRITICAL priority + OVERDUE)
  const criticalUniverse = candidates.filter(
    c => c.priority === 'CRITICAL' || classifyCandidate(c) === 'OVERDUE'
  );
  const criticalAddressed = criticalUniverse.filter(c => addedSourceIds.has(c.source_id)).length;
  const coveragePct = criticalUniverse.length === 0
    ? 100
    : Math.round((criticalAddressed / criticalUniverse.length) * 100);
  const coverage = getCoverageTone(coveragePct);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Total Workload */}
      <Card className={`border ${workload.ring} ${workload.bg}`}>
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <ListChecks className={`h-4 w-4 ${workload.tone}`} />
              <span className="text-xs font-medium text-muted-foreground">Total Workload</span>
            </div>
            <Badge variant="outline" className={`text-[10px] ${workload.tone} border-current`}>
              {workload.label}
            </Badge>
          </div>
          <p className="text-2xl font-bold mt-1">{totalWorkload}</p>
          <p className="text-[11px] text-muted-foreground">visits planned this week</p>
        </CardContent>
      </Card>

      {/* High Risk Cases */}
      <Card className={`border ${risk.ring} ${risk.bg}`}>
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Flame className={`h-4 w-4 ${risk.tone}`} />
              <span className="text-xs font-medium text-muted-foreground">High Risk</span>
            </div>
            <Badge variant="outline" className={`text-[10px] ${risk.tone} border-current`}>
              {highRiskInPlan === 0 ? 'None' : highRiskInPlan >= 3 ? 'Watch' : 'OK'}
            </Badge>
          </div>
          <p className="text-2xl font-bold mt-1">{highRiskInPlan}</p>
          <p className="text-[11px] text-muted-foreground">Critical / High in plan</p>
        </CardContent>
      </Card>

      {/* Overdue Items */}
      <Card className={`border ${overdueRemaining === 0 ? 'border-emerald-200 dark:border-emerald-900' : 'border-destructive/30'} ${overdueRemaining === 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-destructive/5'}`}>
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${overdueRemaining === 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'}`} />
              <span className="text-xs font-medium text-muted-foreground">Overdue Items</span>
            </div>
            <Badge variant="outline" className={`text-[10px] ${overdueRemaining === 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'} border-current`}>
              {overdueRemaining === 0 ? 'Cleared' : 'Pending'}
            </Badge>
          </div>
          <p className="text-2xl font-bold mt-1">{overdueRemaining}</p>
          <p className="text-[11px] text-muted-foreground">
            {overdueAddressed > 0 ? `${overdueAddressed} addressed in plan` : 'not yet scheduled'}
          </p>
        </CardContent>
      </Card>

      {/* Coverage Score */}
      <Card className={`border ${coverage.ring} ${coverage.bg}`}>
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className={`h-4 w-4 ${coverage.tone}`} />
              <span className="text-xs font-medium text-muted-foreground">Coverage</span>
            </div>
            <Badge variant="outline" className={`text-[10px] ${coverage.tone} border-current`}>
              {coveragePct >= 80 ? 'Strong' : coveragePct >= 50 ? 'Partial' : 'Low'}
            </Badge>
          </div>
          <p className="text-2xl font-bold mt-1">{coveragePct}%</p>
          <Progress value={coveragePct} className="h-1.5 mt-1.5" />
          <p className="text-[11px] text-muted-foreground mt-1">of critical workload covered</p>
        </CardContent>
      </Card>
    </div>
  );
}
