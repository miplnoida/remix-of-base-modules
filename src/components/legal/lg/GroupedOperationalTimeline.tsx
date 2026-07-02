/**
 * EPIC-06C Phase 5 — Grouped operational timeline.
 *
 * Upgrades the unified matter timeline with:
 *  - Category grouping (Judicial · Financial · Compliance · Communication · Task · Audit).
 *  - Category-level filter chips (in addition to per-kind chips).
 *  - Day / Week / Month grouping.
 *
 * Data source unchanged — reuses `loadUnifiedTimeline`.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { loadUnifiedTimeline, type TimelineEvent, type TimelineKind } from "@/services/legal/lgUnifiedTimelineService";

type Category = "Judicial" | "Financial" | "Compliance" | "Communication" | "Task" | "Audit";

const KIND_TO_CATEGORY: Record<TimelineKind, Category> = {
  HEARING: "Judicial", ORDER: "Judicial", STAGE: "Judicial", CASE: "Judicial",
  PAYMENT: "Financial", ARRANGEMENT: "Financial", SETTLEMENT: "Financial",
  REFERRAL: "Compliance", INTAKE: "Compliance", LIABILITY: "Compliance",
  NOTICE: "Communication", LETTER: "Communication", DOCUMENT: "Communication",
  TASK: "Task",
  AUDIT: "Audit",
};

const CATEGORIES: Category[] = ["Judicial", "Financial", "Compliance", "Communication", "Task", "Audit"];

const KIND_LABEL: Record<TimelineKind, string> = {
  REFERRAL: "Referral", INTAKE: "Intake", CASE: "Case", STAGE: "Stage",
  HEARING: "Hearing", ORDER: "Order", PAYMENT: "Payment",
  ARRANGEMENT: "Arrangement", DOCUMENT: "Document", NOTICE: "Notice",
  LETTER: "Letter", SETTLEMENT: "Settlement", TASK: "Task", LIABILITY: "Liability", AUDIT: "Audit",
};

type Grouping = "day" | "week" | "month";

function bucketKey(ts: string, mode: Grouping): string {
  const d = new Date(ts);
  if (mode === "day") return d.toISOString().slice(0, 10);
  if (mode === "month") return d.toISOString().slice(0, 7);
  // week
  const first = new Date(d);
  first.setDate(d.getDate() - d.getDay());
  return `Week of ${first.toISOString().slice(0, 10)}`;
}

export function GroupedOperationalTimeline({ lgCaseId }: { lgCaseId: string }) {
  const [active, setActive] = useState<Set<Category>>(new Set(CATEGORIES));
  const [grouping, setGrouping] = useState<Grouping>("day");

  const q = useQuery({
    queryKey: ["lg-unified-timeline-grouped", lgCaseId],
    queryFn: () => loadUnifiedTimeline(lgCaseId),
    enabled: !!lgCaseId,
    staleTime: 30_000,
  });

  const grouped = useMemo(() => {
    const events = (q.data ?? []).filter((e) => active.has(KIND_TO_CATEGORY[e.kind]));
    const buckets = new Map<string, TimelineEvent[]>();
    for (const e of events) {
      const k = bucketKey(e.ts, grouping);
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k)!.push(e);
    }
    return Array.from(buckets.entries());
  }, [q.data, active, grouping]);

  const toggle = (c: Category) => {
    const n = new Set(active);
    n.has(c) ? n.delete(c) : n.add(c);
    setActive(n);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Operational Timeline</CardTitle>
        <CardDescription>
          Judicial, financial, compliance and communication events — grouped chronologically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map((c) => (
              <Button key={c} size="sm" variant={active.has(c) ? "default" : "outline"}
                className="h-6 px-2 text-[11px]" onClick={() => toggle(c)}>
                {c}
              </Button>
            ))}
          </div>
          <div className="ml-auto flex gap-1">
            {(["day", "week", "month"] as Grouping[]).map((g) => (
              <Button key={g} size="sm" variant={grouping === g ? "default" : "outline"}
                className="h-6 px-2 text-[11px] capitalize" onClick={() => setGrouping(g)}>{g}</Button>
            ))}
          </div>
        </div>

        {q.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : grouped.length === 0 ? (
          <p className="text-sm text-muted-foreground">No matching events.</p>
        ) : (
          <div className="space-y-4">
            {grouped.map(([bucket, events]) => (
              <div key={bucket}>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {bucket} · {events.length}
                </div>
                <ol className="relative border-l ml-3 space-y-3">
                  {events.map((e) => (
                    <li key={e.id} className="ml-4 relative">
                      <div className="absolute -left-[19px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px]">{KIND_TO_CATEGORY[e.kind]}</Badge>
                        <Badge variant="secondary" className="text-[10px]">{KIND_LABEL[e.kind]}</Badge>
                        <span className="text-sm font-medium">{e.title}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(e.ts).toLocaleString()}{e.actor ? ` · ${e.actor}` : ""}
                      </div>
                      {e.detail && <div className="text-sm mt-0.5">{e.detail}</div>}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default GroupedOperationalTimeline;
