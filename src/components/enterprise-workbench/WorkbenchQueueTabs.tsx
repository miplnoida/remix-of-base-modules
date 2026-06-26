import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { WorkbenchQueueDef } from "./types";

interface Props<T> {
  queues: WorkbenchQueueDef<T>[];
  counts: Record<string, number>;
  activeId: string;
  onChange: (id: string) => void;
}

export function WorkbenchQueueTabs<T>({ queues, counts, activeId, onChange }: Props<T>) {
  return (
    <div className="flex flex-wrap gap-1 border-b">
      {queues.map((q) => {
        const active = q.id === activeId;
        const count = counts[q.id] ?? 0;
        return (
          <button
            key={q.id}
            type="button"
            onClick={() => onChange(q.id)}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {q.label}
            {count > 0 && (
              <Badge
                variant={active ? "default" : "secondary"}
                className="ml-2 h-5 px-1.5 text-[10px] tabular-nums"
              >
                {count}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
