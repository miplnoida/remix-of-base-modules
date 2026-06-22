import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAssignmentHistory } from "@/hooks/legal/useLgAssignment";
import { History, UserCheck, AlertTriangle, ArrowRightLeft } from "lucide-react";
import { formatDateForDisplay } from "@/lib/format-config";

const REASON_LABEL: Record<string, string> = {
  intake: "Intake assignment",
  reassign: "Reassignment",
  escalation: "Escalation",
  workload: "Workload balancing",
  override: "Manual override",
  queue: "Sent to team queue",
};

const REASON_TONE: Record<string, string> = {
  intake: "bg-blue-100 text-blue-800",
  reassign: "bg-amber-100 text-amber-800",
  escalation: "bg-rose-100 text-rose-800",
  workload: "bg-violet-100 text-violet-800",
  override: "bg-orange-100 text-orange-800",
  queue: "bg-slate-200 text-slate-800",
};

interface Props {
  caseId: string;
}

export default function AssignmentHistoryPanel({ caseId }: Props) {
  const { data, isLoading } = useAssignmentHistory(caseId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" /> Assignment History
        </CardTitle>
        <CardDescription>
          Every routing decision, assignment, escalation and override on this case.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <Skeleton className="h-24 w-full" />}
        {!isLoading && (!data || data.length === 0) && (
          <p className="text-sm text-muted-foreground">No assignment history yet.</p>
        )}
        {!isLoading &&
          data?.map((h) => {
            const queued = !h.assigned_to_user_id;
            return (
              <div key={h.id} className="flex items-start gap-3 border-l-2 border-muted pl-3 py-1">
                <div className="mt-0.5">
                  {queued ? (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  ) : h.assigned_from_user_id ? (
                    <ArrowRightLeft className="h-4 w-4 text-violet-600" />
                  ) : (
                    <UserCheck className="h-4 w-4 text-emerald-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2">
                    <Badge className={REASON_TONE[h.reason] ?? "bg-muted text-foreground"}>
                      {REASON_LABEL[h.reason] ?? h.reason}
                    </Badge>
                    {h.assigned_team_code && (
                      <Badge variant="outline" className="text-xs">Team: {h.assigned_team_code}</Badge>
                    )}
                    {h.workbasket_code && (
                      <Badge variant="outline" className="text-xs">WB: {h.workbasket_code}</Badge>
                    )}
                    {h.strategy && (
                      <Badge variant="secondary" className="text-xs">{h.strategy}</Badge>
                    )}
                    {queued && <Badge variant="destructive" className="text-xs">Queued</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {h.assigned_to_user_id
                      ? <>Assigned to <span className="font-mono">{h.assigned_to_user_id.slice(0, 8)}…</span></>
                      : "Held in team queue"}
                    {h.assigned_by && <> · by <span className="font-mono">{h.assigned_by}</span></>}
                    {" · "}
                    {formatDateForDisplay(h.created_at)}
                  </div>
                  {h.notes && <div className="text-xs mt-1">{h.notes}</div>}
                </div>
              </div>
            );
          })}
      </CardContent>
    </Card>
  );
}
