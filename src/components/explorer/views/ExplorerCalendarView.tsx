import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ExplorerDatasetDescriptor } from "../types";

interface Props<T> { dataset: ExplorerDatasetDescriptor<T>; rows: T[]; onRowClick?: (row: T) => void }

export function ExplorerCalendarView<T extends Record<string, any>>({ dataset, rows, onRowClick }: Props<T>) {
  const dateField = dataset.timeline?.dateField;
  const titleField = dataset.timeline?.titleField || String(dataset.rowKey);
  const [cursor, setCursor] = useState(() => new Date());

  const { grid, monthLabel } = useMemo(() => {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const first = new Date(y, m, 1);
    const start = new Date(first); start.setDate(first.getDate() - first.getDay());
    const cells: { date: Date; items: T[] }[] = [];
    if (!dateField) return { grid: cells, monthLabel: "" };
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      cells.push({ date: d, items: rows.filter((r) => String((r as any)[dateField] || "").slice(0, 10) === iso) });
    }
    return { grid: cells, monthLabel: cursor.toLocaleString("default", { month: "long", year: "numeric" }) };
  }, [cursor, rows, dateField]);

  if (!dateField) return <div className="text-sm text-muted-foreground py-6 text-center">Calendar not configured for this dataset.</div>;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm">{monthLabel}</CardTitle>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" onClick={() => setCursor(new Date())}>Today</Button>
          <Button size="icon" variant="ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px bg-border text-xs">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="bg-muted/30 px-2 py-1 font-medium">{d}</div>
          ))}
          {grid.map((c, i) => {
            const isCurMonth = c.date.getMonth() === cursor.getMonth();
            return (
              <div key={i} className={`bg-background min-h-[86px] p-1 ${isCurMonth ? "" : "opacity-40"}`}>
                <div className="text-[10px] text-muted-foreground">{c.date.getDate()}</div>
                <div className="space-y-0.5 mt-0.5">
                  {c.items.slice(0, 3).map((r, k) => (
                    <div key={k} onClick={() => onRowClick?.(r)}
                      className="text-[10px] bg-primary/10 text-primary rounded px-1 py-0.5 truncate cursor-pointer hover:bg-primary/20">
                      {String((r as any)[titleField] ?? "-")}
                    </div>
                  ))}
                  {c.items.length > 3 && <div className="text-[10px] text-muted-foreground">+{c.items.length - 3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
