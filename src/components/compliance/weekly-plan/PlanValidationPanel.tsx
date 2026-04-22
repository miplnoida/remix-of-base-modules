// ============================================
// PLAN VALIDATION PANEL — Pre-submission checklist + readiness score
// Item-count based (no hours) — qualitative balance check
// ============================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { WeeklyPlanItem, PlanCandidate } from '@/types/weeklyPlan';
import { DayOfWeek } from '@/hooks/useWeeklyPlanBuilder';
import { classifyCandidate } from '@/lib/smartDraftEngine';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export interface PlanReadiness {
  score: number;
  isReady: boolean;
  checks: {
    key: string;
    label: string;
    status: 'pass' | 'warn' | 'fail';
    detail: string;
  }[];
}

export function computePlanReadiness(
  itemsByDay: Record<DayOfWeek, WeeklyPlanItem[]>,
  planItems: WeeklyPlanItem[],
  candidates: PlanCandidate[],
  addedSourceIds: Set<string | null>,
): PlanReadiness {
  const checks: PlanReadiness['checks'] = [];

  // 1) At least one item
  const hasItems = planItems.length > 0;
  checks.push({
    key: 'has-items',
    label: 'Plan contains at least one visit',
    status: hasItems ? 'pass' : 'fail',
    detail: hasItems ? `${planItems.length} item(s) planned` : 'Add visits before submitting',
  });

  // 2) Mandatory / critical items covered
  const unaddressedCritical = candidates.filter(
    c => !addedSourceIds.has(c.source_id) &&
      (c.priority === 'CRITICAL' || classifyCandidate(c) === 'OVERDUE')
  ).length;
  checks.push({
    key: 'critical',
    label: 'Mandatory & critical items covered',
    status: unaddressedCritical === 0 ? 'pass' : unaddressedCritical <= 2 ? 'warn' : 'fail',
    detail: unaddressedCritical === 0
      ? 'All critical items addressed'
      : `${unaddressedCritical} critical item(s) still in suggestions`,
  });

  // 3) Overdue items addressed
  const overdueRemaining = candidates.filter(
    c => !addedSourceIds.has(c.source_id) && classifyCandidate(c) === 'OVERDUE'
  ).length;
  checks.push({
    key: 'overdue',
    label: 'Overdue items addressed',
    status: overdueRemaining === 0 ? 'pass' : overdueRemaining <= 1 ? 'warn' : 'fail',
    detail: overdueRemaining === 0
      ? 'No overdue items remaining'
      : `${overdueRemaining} overdue item(s) not yet scheduled`,
  });

  // 4) High-risk presence in plan
  const highRiskCount = planItems.filter(
    i => i.priority === 'CRITICAL' || i.priority === 'HIGH'
  ).length;
  checks.push({
    key: 'high-risk',
    label: 'High-risk cases included',
    status: highRiskCount > 0 ? 'pass' : 'warn',
    detail: highRiskCount > 0
      ? `${highRiskCount} high-risk case(s) in plan`
      : 'Consider including a high-risk case',
  });

  // 5) Workload balance (item-count based, no hours)
  // Pass if no day is empty AND no day has > 2x the average
  const counts = DAYS.map(d => itemsByDay[d]?.length || 0);
  const nonZero = counts.filter(c => c > 0);
  const avg = nonZero.length ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length : 0;
  const heavyDays = counts.filter(c => c > 0 && avg > 0 && c > avg * 2).length;
  const emptyDays = counts.filter(c => c === 0).length;
  let balanceStatus: 'pass' | 'warn' | 'fail' = 'pass';
  let balanceDetail = 'Workload distributed across the week';
  if (planItems.length === 0) {
    balanceStatus = 'fail';
    balanceDetail = 'No items to balance';
  } else if (heavyDays > 0 && emptyDays >= 2) {
    balanceStatus = 'fail';
    balanceDetail = `${heavyDays} overloaded day(s), ${emptyDays} empty day(s)`;
  } else if (heavyDays > 0 || emptyDays >= 3) {
    balanceStatus = 'warn';
    balanceDetail = heavyDays > 0
      ? `${heavyDays} day(s) carry significantly more load`
      : `${emptyDays} day(s) empty — consider redistributing`;
  }
  checks.push({
    key: 'balance',
    label: 'Workload balanced across days',
    status: balanceStatus,
    detail: balanceDetail,
  });

  // Score: pass=20, warn=10, fail=0 → max 100 (5 checks)
  const score = checks.reduce(
    (s, c) => s + (c.status === 'pass' ? 20 : c.status === 'warn' ? 10 : 0),
    0,
  );

  // Ready if no fail and at least one item
  const isReady = hasItems && checks.every(c => c.status !== 'fail');

  return { score, isReady, checks };
}

interface PlanValidationPanelProps {
  readiness: PlanReadiness;
}

export function PlanValidationPanel({ readiness }: PlanValidationPanelProps) {
  const { score, checks, isReady } = readiness;

  const tone = score >= 80
    ? 'text-emerald-700 dark:text-emerald-400'
    : score >= 50
    ? 'text-amber-700 dark:text-amber-400'
    : 'text-destructive';

  const bg = score >= 80
    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900'
    : score >= 50
    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900'
    : 'bg-destructive/5 border-destructive/30';

  return (
    <Card className={`border ${bg}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className={`h-4 w-4 ${tone}`} />
            Plan Readiness
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xl font-bold ${tone}`}>{score}</span>
            <span className="text-xs text-muted-foreground">/100</span>
            <Badge variant="outline" className={`${tone} border-current text-[10px]`}>
              {isReady ? 'Ready to Submit' : 'Needs Attention'}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Progress value={score} className="h-1.5" />
        <ul className="space-y-1.5 mt-2">
          {checks.map(c => (
            <li key={c.key} className="flex items-start gap-2 text-xs">
              {c.status === 'pass' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />}
              {c.status === 'warn' && <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />}
              {c.status === 'fail' && <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />}
              <div className="min-w-0">
                <p className="font-medium leading-tight">{c.label}</p>
                <p className="text-muted-foreground text-[11px] leading-tight">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
