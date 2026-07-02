import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ExplorerDatasetDescriptor } from "../types";

interface Props<T> {
  dataset: ExplorerDatasetDescriptor<T>;
  rows: T[];
  onRowClick?: (row: T) => void;
}

export function ExplorerKanbanView<T extends Record<string, any>>({ dataset, rows, onRowClick }: Props<T>) {
  const groupBy = dataset.kanban?.groupBy || "status";
  const titleField = dataset.kanban?.titleField || String(dataset.rowKey);
  const subtitleField = dataset.kanban?.subtitleField;

  const groups = useMemo(() => {
    const m = new Map<string, T[]>();
    for (const r of rows) {
      const k = String((r as any)[groupBy] ?? "—");
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    return Array.from(m.entries());
  }, [rows, groupBy]);

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {groups.map(([k, list]) => (
        <div key={k} className="min-w-[280px] w-[280px] shrink-0">
          <Card className="bg-muted/30">
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs uppercase tracking-wide">{k}</CardTitle>
              <Badge variant="secondary">{list.length}</Badge>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[560px] overflow-y-auto">
              {list.map((r, i) => (
                <div
                  key={i}
                  onClick={() => onRowClick?.(r)}
                  className="bg-background border rounded p-2 text-xs cursor-pointer hover:shadow-sm hover:border-primary/40 transition-colors"
                >
                  <div className="font-medium">{String((r as any)[titleField] ?? "-")}</div>
                  {subtitleField && (
                    <div className="text-muted-foreground text-[11px] mt-0.5">{String((r as any)[subtitleField] ?? "")}</div>
                  )}
                </div>
              ))}
              {!list.length && <div className="text-xs text-muted-foreground py-4 text-center">No items</div>}
            </CardContent>
          </Card>
        </div>
      ))}
      {!groups.length && <div className="text-sm text-muted-foreground py-8 w-full text-center">No data to group.</div>}
    </div>
  );
}
