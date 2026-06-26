import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { WorkbenchCardDef, WorkbenchTone } from "./types";

const toneClasses: Record<WorkbenchTone, string> = {
  default: "border-border",
  info: "border-blue-200 bg-blue-50/40 dark:bg-blue-950/20",
  success: "border-green-200 bg-green-50/40 dark:bg-green-950/20",
  warning: "border-amber-200 bg-amber-50/40 dark:bg-amber-950/20",
  danger: "border-red-200 bg-red-50/40 dark:bg-red-950/20",
  muted: "border-muted",
};

interface Props<T> {
  cards: WorkbenchCardDef<T>[];
  counts: Record<string, number>;
  activeCardId: string | null;
  onCardClick: (card: WorkbenchCardDef<T>) => void;
}

export function WorkbenchCards<T>({ cards, counts, activeCardId, onCardClick }: Props<T>) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        const active = activeCardId === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onCardClick(c)}
            className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
          >
            <Card
              className={cn(
                "p-3 transition border hover:shadow-sm",
                toneClasses[c.tone ?? "default"],
                active && "ring-2 ring-primary"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground truncate">
                  {c.label}
                </span>
                {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {counts[c.id] ?? 0}
              </div>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
