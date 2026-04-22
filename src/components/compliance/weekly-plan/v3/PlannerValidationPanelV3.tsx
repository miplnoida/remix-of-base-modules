import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2, AlertTriangle, XCircle, Info, Shield, MapPin,
  Scale, Activity, Sparkles,
} from 'lucide-react';
import type { PlanCandidateV3, WeeklyPlanItem } from '@/types/weeklyPlan';
import type { PlannerCandidateAction } from '@/services/plannerCandidateActionsService';

type CheckStatus = 'pass' | 'warn' | 'fail' | 'info';

interface Check {
  id: string;
  status: CheckStatus;
  title: string;
  detail: string;
  icon: typeof Shield;
}

interface Props {
  candidates: PlanCandidateV3[];
  scheduled: WeeklyPlanItem[];
  actions: PlannerCandidateAction[];
  /** Cap for exception share of capacity (e.g. 0.30 = 30%). */
  exceptionMaxShare?: number;
}

function tone(s: CheckStatus): string {
  switch (s) {
    case 'pass': return 'text-emerald-600 dark:text-emerald-400';
    case 'warn': return 'text-amber-600 dark:text-amber-400';
    case 'fail': return 'text-destructive';
    default:    return 'text-muted-foreground';
  }
}
function Icon({ s }: { s: CheckStatus }) {
  const cls = `h-4 w-4 ${tone(s)}`;
  if (s === 'pass') return <CheckCircle2 className={cls} />;
  if (s === 'warn') return <AlertTriangle className={cls} />;
  if (s === 'fail') return <XCircle className={cls} />;
  return <Info className={cls} />;
}

export function PlannerValidationPanelV3({
  candidates, scheduled, actions, exceptionMaxShare = 0.3,
}: Props) {
  const exceptionActions = actions.filter(
    (a) => a.action_type === 'convert_exception' && a.is_active,
  );
  const scheduledKeys = new Set(scheduled.map((s) => s.source_ref));

  const mandatory = candidates.filter((c) => c.mandatory_class === 'MANDATORY');
  const overdue = candidates.filter((c) => (c.overdue_days ?? 0) > 0);
  const highRisk = candidates.filter(
    (c) => c.risk_band === 'HIGH' || c.risk_band === 'CRITICAL',
  );
  const zones = new Set(candidates.map((c) => c.zone_id).filter(Boolean));
  const zonesCovered = new Set(
    candidates
      .filter((c) => scheduledKeys.has(c.employer_id))
      .map((c) => c.zone_id)
      .filter(Boolean),
  );

  const mandatoryCovered = mandatory.filter((c) => scheduledKeys.has(c.employer_id)).length;
  const overdueCovered = overdue.filter((c) => scheduledKeys.has(c.employer_id)).length;
  const highRiskCovered = highRisk.filter((c) => scheduledKeys.has(c.employer_id)).length;

  const totalSlots = scheduled.length || 1;
  const exceptionShare = exceptionActions.length / totalSlots;

  // Workload balance — gini-ish min/max ratio across days
  const byDay: Record<string, number> = {};
  scheduled.forEach((s) => { byDay[s.day_of_week] = (byDay[s.day_of_week] || 0) + 1; });
  const counts = Object.values(byDay);
  const balance = counts.length === 0
    ? 1
    : Math.min(...counts) / Math.max(...counts, 1);

  const explainabilityCovered = candidates.filter(
    (c) => c.why_selected && c.why_selected.length > 0,
  ).length;

  const checks: Check[] = [
    {
      id: 'mandatory',
      icon: Shield,
      status: mandatory.length === 0 ? 'info'
        : mandatoryCovered === mandatory.length ? 'pass'
        : mandatoryCovered === 0 ? 'fail' : 'warn',
      title: 'Mandatory items covered',
      detail: `${mandatoryCovered} / ${mandatory.length} mandatory candidates scheduled`,
    },
    {
      id: 'overdue',
      icon: AlertTriangle,
      status: overdue.length === 0 ? 'pass'
        : overdueCovered >= Math.ceil(overdue.length * 0.5) ? 'pass'
        : overdueCovered === 0 ? 'fail' : 'warn',
      title: 'Overdue items covered',
      detail: `${overdueCovered} / ${overdue.length} overdue candidates scheduled`,
    },
    {
      id: 'exception_share',
      icon: Scale,
      status: exceptionShare > exceptionMaxShare ? 'warn' : 'pass',
      title: 'Exceptions within allowed share',
      detail: exceptionActions.length === 0
        ? 'No exceptions recorded'
        : `${exceptionActions.length} exception(s) — ${Math.round(exceptionShare * 100)}% of plan (cap ${Math.round(exceptionMaxShare * 100)}%)`,
    },
    {
      id: 'zone',
      icon: MapPin,
      status: zones.size === 0 ? 'info'
        : zonesCovered.size === zones.size ? 'pass'
        : zonesCovered.size === 0 ? 'fail' : 'warn',
      title: 'Zone coverage',
      detail: `${zonesCovered.size} / ${zones.size} zone(s) covered this week`,
    },
    {
      id: 'workload',
      icon: Activity,
      status: counts.length === 0 ? 'info' : balance >= 0.5 ? 'pass' : 'warn',
      title: 'Workload balance',
      detail: counts.length === 0
        ? 'No items scheduled yet'
        : `Spread ${Math.round(balance * 100)}% (1.0 = perfectly even)`,
    },
    {
      id: 'high_risk',
      icon: Shield,
      status: highRisk.length === 0 ? 'info'
        : highRiskCovered >= Math.ceil(highRisk.length * 0.4) ? 'pass'
        : highRiskCovered === 0 ? 'fail' : 'warn',
      title: 'High-risk coverage',
      detail: `${highRiskCovered} / ${highRisk.length} high/critical-risk candidates scheduled`,
    },
    {
      id: 'explain',
      icon: Sparkles,
      status: candidates.length === 0 ? 'info'
        : explainabilityCovered === candidates.length ? 'pass'
        : 'warn',
      title: 'Explainability complete',
      detail: `${explainabilityCovered} / ${candidates.length} candidates have a “why selected” summary`,
    },
  ];

  const failCount = checks.filter((c) => c.status === 'fail').length;
  const warnCount = checks.filter((c) => c.status === 'warn').length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Plan validation</span>
          <div className="flex items-center gap-1">
            {failCount > 0 && (
              <Badge variant="destructive" className="text-[10px]">{failCount} fail</Badge>
            )}
            {warnCount > 0 && (
              <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700">
                {warnCount} warn
              </Badge>
            )}
            {failCount === 0 && warnCount === 0 && (
              <Badge variant="outline" className="text-[10px] border-emerald-400 text-emerald-700">
                All good
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {checks.map((c) => (
          <div key={c.id} className="flex items-start gap-2 text-sm">
            <Icon s={c.status} />
            <div className="min-w-0 flex-1">
              <p className="font-medium leading-tight">{c.title}</p>
              <p className="text-xs text-muted-foreground">{c.detail}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
