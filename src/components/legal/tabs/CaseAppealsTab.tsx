/**
 * EPIC-06B.1 — Case-level Appeals tab.
 * Lists every appeal filed against any order in this legal case, using the
 * EPIC-06B lgAppealService. Includes a quick link back to each parent order.
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Scale } from "lucide-react";
import { formatDateForDisplay } from "@/lib/format-config";
import { listAppealsForCase } from "@/services/legal/lgAppealService";
import { LG_APPEAL_STATUS_LABEL } from "@/services/legal/lgAppealStateMachine";

export function CaseAppealsTab({ caseId }: { caseId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["lg_appeals_case", caseId],
    queryFn: () => listAppealsForCase(caseId),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="h-4 w-4" /> Appeals ({data.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && data.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No appeals filed on this matter. Appeals are filed from an order — open Orders / Judgments, then the order detail's Appeals tab.
          </p>
        )}
        {data.map((a: any) => (
          <div key={a.id} className="border rounded p-3 text-sm space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs">{a.appeal_no}</span>
                <Badge variant="outline">{LG_APPEAL_STATUS_LABEL[a.status as keyof typeof LG_APPEAL_STATUS_LABEL] ?? a.status}</Badge>
              </div>
              {a.order_id && (
                <Button size="sm" variant="ghost" asChild>
                  <Link to={`/legal/lg/orders/${a.order_id}`}>
                    Open order <ExternalLink className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Filed {a.filing_date ? formatDateForDisplay(a.filing_date) : "—"} · Deadline {a.appeal_deadline ? formatDateForDisplay(a.appeal_deadline) : "—"}
            </div>
            {a.grounds && <div className="text-sm">{a.grounds}</div>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
