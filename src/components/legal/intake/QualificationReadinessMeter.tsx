import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, XCircle, Info } from "lucide-react";
import type { ReadinessScore } from "@/services/legal/lgIntakeDecisionService";

const LEVEL_LABEL: Record<ReadinessScore["level"], { label: string; color: string }> = {
  READY:       { label: "Ready",         color: "text-emerald-600" },
  ALMOST:      { label: "Almost Ready",  color: "text-amber-600" },
  ATTENTION:   { label: "Needs Attention", color: "text-orange-600" },
  INCOMPLETE:  { label: "Incomplete",    color: "text-red-600" },
};

export function QualificationReadinessMeter({ readiness }: { readiness: ReadinessScore }) {
  const meta = LEVEL_LABEL[readiness.level];
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium">Qualification Readiness</div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" aria-label="Readiness breakdown">
                  <Info className="h-4 w-4 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="text-xs space-y-1">
                  {readiness.criteria.map((c) => (
                    <div key={c.key} className="flex items-start gap-1">
                      {c.met ? <CheckCircle2 className="h-3 w-3 mt-0.5 text-emerald-500" /> : <XCircle className="h-3 w-3 mt-0.5 text-red-500" />}
                      <span>
                        {c.label} <span className="text-muted-foreground">({Math.round(c.weight * 100)}%)</span>
                        {c.detail && <span className="text-muted-foreground"> — {c.detail}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-baseline gap-3">
          <div className={`text-3xl font-semibold ${meta.color}`}>{readiness.score}%</div>
          <div className={`text-xs font-medium ${meta.color}`}>{meta.label}</div>
        </div>
        <Progress value={readiness.score} className="mt-2 h-2" />
      </CardContent>
    </Card>
  );
}
