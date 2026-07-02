import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Lightbulb } from "lucide-react";
import type { Recommendation } from "@/services/legal/lgIntakeDecisionService";

const TONE_BG: Record<Recommendation["tone"], string> = {
  success: "border-emerald-500/40 bg-emerald-500/5",
  warning: "border-amber-500/40 bg-amber-500/5",
  info:    "border-sky-500/40 bg-sky-500/5",
  danger:  "border-red-500/40 bg-red-500/5",
};
const TONE_BADGE: Record<Recommendation["tone"], "default" | "outline" | "secondary" | "destructive"> = {
  success: "default", warning: "secondary", info: "outline", danger: "destructive",
};

export function RecommendationCard({
  rec,
  onAction,
}: {
  rec: Recommendation;
  onAction?: (outcome: Recommendation["outcome"]) => void;
}) {
  return (
    <Card className={TONE_BG[rec.tone]}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" /> Recommended Outcome
          </span>
          <Badge variant={TONE_BADGE[rec.tone]}>{rec.label}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        {rec.reasons.length > 0 && (
          <div>
            <div className="font-medium mb-1">Why</div>
            <ul className="space-y-0.5">
              {rec.reasons.slice(0, 6).map((r, i) => (
                <li key={i} className="flex gap-1"><CheckCircle2 className="h-3 w-3 mt-0.5 text-emerald-500 shrink-0" />{r.replace(/^✓ /, "")}</li>
              ))}
            </ul>
          </div>
        )}
        {rec.blockers.length > 0 && (
          <div>
            <div className="font-medium mb-1 text-red-600">Blockers</div>
            <ul className="space-y-0.5">
              {rec.blockers.slice(0, 6).map((r, i) => (
                <li key={i} className="flex gap-1"><XCircle className="h-3 w-3 mt-0.5 text-red-500 shrink-0" />{r.replace(/^✗ /, "")}</li>
              ))}
            </ul>
          </div>
        )}
        {onAction && (
          <div className="pt-1">
            <Button size="sm" variant="outline" onClick={() => onAction(rec.outcome)}>
              Apply Recommendation
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
