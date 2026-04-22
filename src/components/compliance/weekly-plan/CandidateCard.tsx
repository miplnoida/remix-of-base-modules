import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PlanCandidate } from '@/types/weeklyPlan';
import { DayOfWeek } from '@/hooks/useWeeklyPlanBuilder';
import {
  Plus,
  Building2,
  AlertTriangle,
  Clock,
  DollarSign,
  CalendarPlus,
  CheckCircle,
} from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { RecommendationReasonsPopover } from './RecommendationReasonsPopover';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

interface CandidateCardProps {
  candidate: PlanCandidate;
  onAddToDay: (day: DayOfWeek) => void;
  isAdded: boolean;
  disabled?: boolean;
}

function getScoreBadgeClass(score: number) {
  if (score >= 70) return 'bg-destructive/15 text-destructive border-destructive/30';
  if (score >= 40) return 'bg-warning/15 text-warning border-warning/30';
  return 'bg-muted text-muted-foreground border-border';
}

function getPriorityBadge(priority: string | null) {
  switch (priority) {
    case 'CRITICAL': return 'bg-destructive/15 text-destructive';
    case 'HIGH': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    case 'MEDIUM': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'LOW': return 'bg-muted text-muted-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
}

function getReasonBadges(candidate: PlanCandidate): string[] {
  const reasons: string[] = [];
  if (candidate.due_date) {
    const due = new Date(candidate.due_date);
    const now = new Date();
    if (due < now) reasons.push('Overdue');
    else {
      const daysLeft = Math.ceil((due.getTime() - now.getTime()) / 86400000);
      if (daysLeft <= 7) reasons.push(`Due in ${daysLeft}d`);
    }
  }
  if (candidate.financial_exposure && candidate.financial_exposure > 10000) {
    reasons.push(`$${(candidate.financial_exposure / 1000).toFixed(0)}K exposure`);
  }
  if (candidate.priority === 'CRITICAL') reasons.push('Critical');
  if (candidate.source_status === 'ESCALATED') reasons.push('Escalated');
  if (candidate.source_status === 'OVERDUE') reasons.push('Overdue action');
  return reasons;
}

export function CandidateCard({ candidate, onAddToDay, isAdded, disabled }: CandidateCardProps) {
  const score = candidate.recommendation_score ?? 0;
  const reasons = getReasonBadges(candidate);
  const age = candidate.source_created_at
    ? formatDistanceToNowStrict(new Date(candidate.source_created_at), { addSuffix: true })
    : null;

  return (
    <Card className={`transition-all ${isAdded ? 'opacity-50 border-dashed' : 'hover:shadow-md'}`}>
      <CardContent className="p-3 space-y-2">
        {/* Top row: score + priority + source ref */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Badge variant="outline" className={`text-xs font-mono ${getScoreBadgeClass(score)}`}>
              {score}
            </Badge>
            {candidate.priority && (
              <Badge variant="outline" className={`text-xs ${getPriorityBadge(candidate.priority)}`}>
                {candidate.priority}
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground font-mono shrink-0">{candidate.source_ref}</span>
        </div>

        {/* Employer */}
        {candidate.employer_name && (
          <div className="flex items-center gap-1.5 text-sm">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate font-medium">{candidate.employer_name}</span>
          </div>
        )}

        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-2">{candidate.description}</p>

        {/* Reason badges + Why? popover */}
        <div className="flex flex-wrap items-center gap-1">
          {reasons.map((r, i) => (
            <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
              {r}
            </Badge>
          ))}
          <RecommendationReasonsPopover
            reasons={(candidate as any).recommendation_reasons as any}
            source={(candidate as any).recommendation_source}
            totalScore={candidate.recommendation_score}
            compact
          />
        </div>

        {/* Bottom row: age + add button */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {age && (
              <>
                <Clock className="h-3 w-3" />
                <span>{age}</span>
              </>
            )}
            {candidate.territory && (
              <Badge variant="outline" className="text-[10px] ml-1">{candidate.territory}</Badge>
            )}
          </div>

          {isAdded ? (
            <Badge variant="outline" className="text-xs gap-1">
              <CheckCircle className="h-3 w-3" /> Added
            </Badge>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={disabled}>
                  <CalendarPlus className="h-3.5 w-3.5" />
                  Add
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {DAYS.map(day => (
                  <DropdownMenuItem key={day} onClick={() => onAddToDay(day)}>
                    {day}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
