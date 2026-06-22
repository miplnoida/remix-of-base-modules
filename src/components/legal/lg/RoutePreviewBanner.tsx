import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle2, Info, Route } from "lucide-react";
import { useResolveRoute } from "@/hooks/legal/useLgAssignment";

interface Props {
  source: string | null | undefined;
  caseType: string | null | undefined;
  stage: string | null | undefined;
  priority?: string | null;
}

export default function RoutePreviewBanner({ source, caseType, stage, priority }: Props) {
  const { data, isLoading } = useResolveRoute(
    source && caseType ? { source_code: source, case_type_code: caseType, stage_code: stage ?? null, priority_code: priority ?? "MEDIUM" } : null,
  );

  if (!source || !caseType) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-3 text-sm text-muted-foreground flex items-center gap-2">
          <Info className="h-4 w-4" /> Select a source and case type to preview routing.
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !data) {
    return <Skeleton className="h-16 w-full" />;
  }

  const status = data.validation_status;
  const Icon = status === "ERROR" ? AlertTriangle : status === "WARNING" ? AlertTriangle : CheckCircle2;
  const tone =
    status === "ERROR" ? "border-rose-300 bg-rose-50" :
    status === "WARNING" ? "border-amber-300 bg-amber-50" :
    "border-emerald-300 bg-emerald-50";

  return (
    <Card className={tone}>
      <CardContent className="py-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Icon className="h-4 w-4" />
          <span className="text-sm font-medium">Routing preview</span>
          <Badge variant={status === "ERROR" ? "destructive" : "secondary"}>{status}</Badge>
          {data.team_code && <Badge variant="outline"><Route className="h-3 w-3 mr-1" />Team: {data.team_code}</Badge>}
          {data.workbasket_code && <Badge variant="outline">WB: {data.workbasket_code}</Badge>}
          {data.assignment_strategy && <Badge variant="outline">Strategy: {data.assignment_strategy}</Badge>}
          {data.required_skill && <Badge variant="outline">Skill: {data.required_skill}</Badge>}
          {data.escalation_team_code && <Badge variant="outline">Escalation: {data.escalation_team_code}</Badge>}
        </div>
        {data.reasons?.length > 0 && (
          <ul className="text-xs space-y-0.5 ml-1">
            {data.reasons.map((r, i) => <li key={i}>• {r}</li>)}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
