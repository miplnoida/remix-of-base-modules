import { Card, CardContent } from '@/components/ui/card';
import { WeeklyPlanItem, PlanCandidate } from '@/types/weeklyPlan';
import { classifyCandidate } from '@/lib/smartDraftEngine';
import { AlertTriangle, CheckCircle2, Calendar, CircleDashed } from 'lucide-react';

interface PlanKPISummaryProps {
  planItems: WeeklyPlanItem[];
  candidates: PlanCandidate[];
  addedSourceIds: Set<string | null>;
}

export function PlanKPISummary({ planItems, candidates, addedSourceIds }: PlanKPISummaryProps) {
  const mandatoryCount = planItems.filter(i => i.is_mandatory).length;
  const overdueCount = candidates.filter(c =>
    !addedSourceIds.has(c.source_id) && classifyCandidate(c) === 'OVERDUE'
  ).length;
  const plannedCount = planItems.length;
  const unscheduledMandatory = candidates.filter(c =>
    !addedSourceIds.has(c.source_id) &&
    (c.priority === 'CRITICAL' || classifyCandidate(c) === 'OVERDUE')
  ).length;

  const cards = [
    {
      label: 'Mandatory',
      value: mandatoryCount,
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      label: 'Overdue',
      value: overdueCount,
      icon: AlertTriangle,
      color: 'text-destructive',
      bg: 'bg-destructive/5',
    },
    {
      label: 'Planned',
      value: plannedCount,
      icon: Calendar,
      color: 'text-primary',
      bg: 'bg-primary/5',
    },
    {
      label: 'Unscheduled',
      value: unscheduledMandatory,
      icon: CircleDashed,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map(card => (
        <Card key={card.label} className={card.bg}>
          <CardContent className="p-3 flex items-center gap-3">
            <card.icon className={`h-5 w-5 ${card.color} shrink-0`} />
            <div>
              <p className="text-2xl font-bold leading-none">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
