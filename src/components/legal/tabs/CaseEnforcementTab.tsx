/**
 * EPIC-06B.1 — Case-level Enforcement tab.
 * Lists every enforcement action across all orders on this case.
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, ShieldAlert } from "lucide-react";
import { formatDateForDisplay } from "@/lib/format-config";
import { listEnforcementForCase } from "@/services/legal/lgEnforcementService";
import { LG_ENFORCEMENT_STATUS_LABEL } from "@/services/legal/lgEnforcementStateMachine";

export function CaseEnforcementTab({ caseId }: { caseId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["lg_enforcement_case", caseId],
    queryFn: () => listEnforcementForCase(caseId),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="h-4 w-4" /> Enforcement Actions ({data.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && data.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No enforcement actions. Start enforcement from an active or breached order in Orders / Judgments.
          </p>
        )}
        {data.map((e: any) => (
          <div key={e.id} className="border rounded p-3 text-sm space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs">{e.enforcement_no}</span>
                <Badge variant="outline">{e.enforcement_type}</Badge>
                <Badge>{LG_ENFORCEMENT_STATUS_LABEL[e.status as keyof typeof LG_ENFORCEMENT_STATUS_LABEL] ?? e.status}</Badge>
              </div>
              {e.order_id && (
                <Button size="sm" variant="ghost" asChild>
                  <Link to={`/legal/lg/orders/${e.order_id}`}>
                    Open order <ExternalLink className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Requested {e.requested_date ? formatDateForDisplay(e.requested_date) : "—"}
              {e.execution_date ? ` · Executed ${formatDateForDisplay(e.execution_date)}` : ""}
              {e.amount_targeted != null ? ` · Target EC$${Number(e.amount_targeted).toLocaleString()}` : ""}
              {e.amount_recovered != null ? ` · Recovered EC$${Number(e.amount_recovered).toLocaleString()}` : ""}
            </div>
            {e.external_agency && <div className="text-xs">Agency: {e.external_agency}</div>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
