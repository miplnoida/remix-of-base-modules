// ============================================
// PHASE 4 — Recommendation Reasons Popover
// ============================================
// Explainability: shows why a candidate / plan item was recommended,
// reading the recommendation_reasons JSONB column on ce_weekly_plan_items.
// Format: [{ code, label, weight }, ...]
// ============================================
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Info, Sparkles } from 'lucide-react';

export interface RecommendationReason {
  code: string;
  label: string;
  weight?: number;
}

interface Props {
  reasons: RecommendationReason[] | null | undefined;
  source?: string | null;
  totalScore?: number | null;
  triggerLabel?: string;
  compact?: boolean;
}

export function RecommendationReasonsPopover({
  reasons,
  source,
  totalScore,
  triggerLabel = 'Why?',
  compact = false,
}: Props) {
  const hasReasons = Array.isArray(reasons) && reasons.length > 0;
  if (!hasReasons && !source && totalScore == null) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={
            compact
              ? 'h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground gap-1'
              : 'h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1'
          }
        >
          <Info className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
          {triggerLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3">
        <div className="flex items-center gap-2 pb-2 border-b">
          <Sparkles className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">Why this was recommended</h4>
        </div>

        <div className="space-y-2 pt-2">
          {(source || totalScore != null) && (
            <div className="flex items-center justify-between text-xs">
              {source && (
                <span className="text-muted-foreground">
                  Source: <span className="font-mono text-foreground">{source}</span>
                </span>
              )}
              {totalScore != null && (
                <Badge variant="outline" className="font-mono">
                  Score: {totalScore}
                </Badge>
              )}
            </div>
          )}

          {hasReasons ? (
            <ul className="space-y-1.5">
              {reasons!.map((r, i) => (
                <li
                  key={`${r.code}-${i}`}
                  className="flex items-start justify-between gap-2 text-sm rounded-md bg-muted/40 px-2 py-1.5"
                >
                  <span className="text-foreground leading-tight">{r.label}</span>
                  {typeof r.weight === 'number' && (
                    <Badge variant="secondary" className="text-[10px] font-mono shrink-0">
                      +{r.weight}
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No explainability data available for this item.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
