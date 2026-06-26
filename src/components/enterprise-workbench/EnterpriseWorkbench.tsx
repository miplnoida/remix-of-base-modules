import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { WorkbenchCards } from "./WorkbenchCards";
import { WorkbenchQueueTabs } from "./WorkbenchQueueTabs";
import type { WorkbenchAdapter } from "./types";

interface Props<T> {
  adapter: WorkbenchAdapter<T>;
}

/**
 * EnterpriseWorkbench — generic operational dashboard shell.
 * Cards + queue tabs + filter chips + grid + auto-refresh.
 * Reusable across Legal Referrals, Legal Matters, Contract Reviews,
 * Employer Recovery, Appeals, and Payment Arrangements via an Adapter.
 */
export function EnterpriseWorkbench<T>({ adapter }: Props<T>) {
  const scope = adapter.useScope();
  const { rows, isLoading, isError, errorMessage, refetch } = adapter.useRows();

  const defaultQueue =
    adapter.queues.find((q) => q.isDefault)?.id ?? adapter.queues[0]?.id ?? "";
  const [activeQueueId, setActiveQueueId] = useState<string>(defaultQueue);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  const [chipValues, setChipValues] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    (adapter.filterChips ?? []).forEach((c) => {
      m[c.id] = c.defaultValue ?? "ALL";
    });
    return m;
  });

  // Apply filter chips first (they are global, e.g. source department)
  const chipFiltered = useMemo(() => {
    return rows.filter((r) =>
      (adapter.filterChips ?? []).every((chip) => {
        const v = chipValues[chip.id] ?? "ALL";
        if (v === "ALL") return true;
        return chip.predicate(r, v);
      })
    );
  }, [rows, chipValues, adapter.filterChips]);

  // Counts for cards (computed against chip-filtered rows so they reflect filters)
  const cardCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of adapter.cards) {
      m[c.id] = chipFiltered.reduce(
        (acc, r) => acc + (c.predicate(r, scope) ? 1 : 0),
        0
      );
    }
    return m;
  }, [chipFiltered, adapter.cards, scope]);

  // Counts for queues
  const queueCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const q of adapter.queues) {
      m[q.id] = chipFiltered.reduce(
        (acc, r) => acc + (q.predicate(r, scope) ? 1 : 0),
        0
      );
    }
    return m;
  }, [chipFiltered, adapter.queues, scope]);

  const activeQueue = adapter.queues.find((q) => q.id === activeQueueId) ?? adapter.queues[0];
  const activeCard = activeCardId
    ? adapter.cards.find((c) => c.id === activeCardId) ?? null
    : null;

  const visibleRows = useMemo(() => {
    return chipFiltered.filter((r) => {
      if (activeQueue && !activeQueue.predicate(r, scope)) return false;
      if (activeCard && !activeCard.predicate(r, scope)) return false;
      return true;
    });
  }, [chipFiltered, activeQueue, activeCard, scope]);

  const handleCardClick = (card: (typeof adapter.cards)[number]) => {
    if (activeCardId === card.id) {
      setActiveCardId(null);
      return;
    }
    setActiveCardId(card.id);
    if (card.switchToQueue) setActiveQueueId(card.switchToQueue);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{adapter.title}</h1>
          {adapter.subtitle && (
            <p className="text-sm text-muted-foreground">{adapter.subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(adapter.filterChips ?? []).map((chip) => (
            <div key={chip.id} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{chip.label}</span>
              <Select
                value={chipValues[chip.id] ?? "ALL"}
                onValueChange={(v) =>
                  setChipValues((p) => ({ ...p, [chip.id]: v }))
                }
              >
                <SelectTrigger className="h-8 w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  {chip.options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={refetch} className="gap-1">
            <RefreshCcw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <WorkbenchCards
        cards={adapter.cards}
        counts={cardCounts}
        activeCardId={activeCardId}
        onCardClick={handleCardClick}
      />

      <Card className="p-0">
        <WorkbenchQueueTabs
          queues={adapter.queues}
          counts={queueCounts}
          activeId={activeQueueId}
          onChange={(id) => {
            setActiveQueueId(id);
            setActiveCardId(null);
          }}
        />
        <div className="p-3">
          {adapter.renderGrid({
            rows: visibleRows,
            isLoading,
            isError,
            errorMessage,
            onRefresh: refetch,
            onRowAction: adapter.actions,
          })}
        </div>
      </Card>
    </div>
  );
}
