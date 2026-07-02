import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MockCase } from "@/data/mockLegalCases";
import { Calendar, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

interface CaseHearingsTabProps {
  caseData: MockCase;
}

/**
 * DEPRECATED — legacy tab used by `LegalCaseView` / `SSBCaseView`.
 * All new work happens in the LG Case 360 workspace hearings tab
 * (`/legal/lg/cases/:id?tab=hearings`) which reads from `lg_hearing`.
 *
 * This shell renders an empty state and a deep-link to the live workspace
 * so no mock data is displayed. Do not extend this file; retirement is
 * tracked in `docs/legal/route-retirement-plan.md`.
 */
export function CaseHearingsTab({ caseData }: CaseHearingsTabProps) {
  const targetHref = caseData?.id
    ? `/legal/lg/cases/${caseData.id}?tab=hearings`
    : "/legal/lg/hearings";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Hearings</h2>
          <p className="text-sm text-muted-foreground">
            Hearings for this case are managed in the LG Case 360 workspace.
          </p>
        </div>
        <Button asChild size="sm" variant="outline" className="gap-2">
          <Link to={targetHref}>
            Open Hearings <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground max-w-sm">
            This legacy view no longer displays sample hearings. Use the LG Case
            workspace to schedule, record outcomes, adjourn, or cancel hearings
            against live data.
          </p>
          <Button asChild size="sm" className="mt-4">
            <Link to={targetHref}>Go to Live Hearings</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
