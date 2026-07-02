import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { ExplorerDatasetDescriptor } from "../types";

interface Props<T> { dataset: ExplorerDatasetDescriptor<T>; rows: T[]; onRowClick?: (row: T) => void }

export function ExplorerTimelineView<T extends Record<string, any>>({ dataset, rows, onRowClick }: Props<T>) {
  const dateField = dataset.timeline?.dateField;
  const titleField = dataset.timeline?.titleField || String(dataset.rowKey);
  const sorted = useMemo(() => {
    if (!dateField) return [];
    return [...rows]
      .filter((r) => (r as any)[dateField])
      .sort((a, b) => String((b as any)[dateField]).localeCompare(String((a as any)[dateField])));
  }, [rows, dateField]);

  if (!dateField) return <div className="text-sm text-muted-foreground py-6 text-center">Timeline not configured for this dataset.</div>;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="relative pl-6 border-l-2 border-border space-y-4">
          {sorted.map((r, i) => (
            <div key={i} className="relative cursor-pointer" onClick={() => onRowClick?.(r)}>
              <div className="absolute -left-[29px] top-1.5 w-3 h-3 rounded-full bg-primary" />
              <div className="text-xs text-muted-foreground">{String((r as any)[dateField])}</div>
              <div className="text-sm font-medium">{String((r as any)[titleField] ?? "-")}</div>
            </div>
          ))}
          {!sorted.length && <div className="text-sm text-muted-foreground text-center py-6">No dated rows.</div>}
        </div>
      </CardContent>
    </Card>
  );
}
