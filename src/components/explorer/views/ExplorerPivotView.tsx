import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight } from "lucide-react";
import { groupRows } from "../applyFilters";
import type { ExplorerDatasetDescriptor } from "../types";

interface Props<T> {
  dataset: ExplorerDatasetDescriptor<T>;
  rows: T[];
  groupBy: string[];
  onGroupByChange: (g: string[]) => void;
}

export function ExplorerPivotView<T extends Record<string, any>>({ dataset, rows, groupBy, onGroupByChange }: Props<T>) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const fields = useMemo(() =>
    dataset.columns.map((c: any) => ({ value: c.accessorKey || c.id, label: c.header || c.accessorKey })).filter((c) => c.value),
    [dataset]);
  const grouped = useMemo(() => groupRows(rows as any, groupBy), [rows, groupBy]);
  const toggle = (k: string) => setExpanded((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">Multi-level grouping</CardTitle>
        <div className="flex gap-2 items-center">
          {[0, 1, 2].map((lvl) => (
            <Select key={lvl} value={groupBy[lvl] || "__none"} onValueChange={(v) => {
              const next = [...groupBy]; if (v === "__none") next.splice(lvl); else next[lvl] = v;
              onGroupByChange(next.filter(Boolean));
            }}>
              <SelectTrigger className="w-40"><SelectValue placeholder={`Level ${lvl + 1}`} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">— None —</SelectItem>
                {fields.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          ))}
          <Button size="sm" variant="ghost" onClick={() => onGroupByChange([])}>Clear</Button>
        </div>
      </CardHeader>
      <CardContent>
        {!groupBy.length && <div className="text-sm text-muted-foreground py-6 text-center">Pick a grouping to pivot.</div>}
        {groupBy.length > 0 && (
          <div className="border rounded divide-y">
            {Array.from(grouped.entries()).map(([k, list]) => (
              <div key={k}>
                <button className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/40 text-sm" onClick={() => toggle(k)}>
                  <span className="flex items-center gap-2">
                    {expanded.has(k) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-medium">{k}</span>
                  </span>
                  <span className="text-muted-foreground text-xs">{list.length} rows</span>
                </button>
                {expanded.has(k) && (
                  <div className="bg-muted/20 px-3 py-2 text-xs">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {list.slice(0, 20).map((r, i) => (
                        <div key={i} className="border rounded px-2 py-1 bg-background">
                          {String((r as any)[dataset.rowKey as any] ?? Object.values(r as any)[0] ?? "-")}
                        </div>
                      ))}
                    </div>
                    {list.length > 20 && <div className="text-muted-foreground mt-2">+{list.length - 20} more…</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
