/**
 * EPIC-04A §7 — Unified Matter Timeline UI.
 *
 * Renders a filterable chronological feed combining referral, intake, case,
 * hearings, orders, recovery, documents, notices, settlements, audit events.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { loadUnifiedTimeline, type TimelineEvent, type TimelineKind } from "@/services/legal/lgUnifiedTimelineService";

const KIND_LABEL: Record<TimelineKind, string> = {
  REFERRAL: "Referral", INTAKE: "Intake", CASE: "Case", STAGE: "Stage",
  HEARING: "Hearing", ORDER: "Order", PAYMENT: "Payment",
  ARRANGEMENT: "Arrangement", DOCUMENT: "Document", NOTICE: "Notice",
  LETTER: "Letter", SETTLEMENT: "Settlement", TASK: "Task", AUDIT: "Audit",
};

const ALL_KINDS = Object.keys(KIND_LABEL) as TimelineKind[];

export function UnifiedMatterTimeline({ lgCaseId }: { lgCaseId: string }) {
  const [active, setActive] = useState<Set<TimelineKind>>(new Set(ALL_KINDS));

  const q = useQuery({
    queryKey: ["lg-unified-timeline", lgCaseId],
    queryFn: () => loadUnifiedTimeline(lgCaseId),
    enabled: !!lgCaseId,
  });

  const filtered = useMemo<TimelineEvent[]>(
    () => (q.data ?? []).filter((e) => active.has(e.kind)),
    [q.data, active],
  );

  const toggle = (k: TimelineKind) => {
    const next = new Set(active);
    if (next.has(k)) next.delete(k); else next.add(k);
    setActive(next);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Unified Matter Timeline</CardTitle>
        <CardDescription>
          Every event on this matter — referrals, intake, hearings, orders, recovery, documents,
          notices, settlements and audit — in chronological order.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1">
          {ALL_KINDS.map((k) => (
            <Button
              key={k}
              size="sm"
              variant={active.has(k) ? "default" : "outline"}
              className="h-6 px-2 text-[11px]"
              onClick={() => toggle(k)}
            >
              {KIND_LABEL[k]}
            </Button>
          ))}
        </div>

        {q.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No matching events.</p>
        ) : (
          <ol className="relative border-l ml-3 space-y-4">
            {filtered.map((e) => (
              <li key={e.id} className="ml-4">
                <div className="absolute -left-1.5 h-3 w-3 rounded-full bg-primary" />
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{KIND_LABEL[e.kind]}</Badge>
                  <span className="text-sm font-medium">{e.title}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(e.ts).toLocaleString()}
                  {e.actor ? ` · ${e.actor}` : ""}
                </div>
                {e.detail && <div className="text-sm mt-0.5">{e.detail}</div>}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

export default UnifiedMatterTimeline;
