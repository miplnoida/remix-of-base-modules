import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ExplorerKpiDef } from "./types";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

function fmt(v: number | string, kind?: ExplorerKpiDef["format"], ccy = "EC$") {
  if (typeof v === "string") return v;
  if (kind === "currency") return `${ccy}${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (kind === "percent") return `${(Number(v) * (v <= 1 ? 100 : 1)).toFixed(1)}%`;
  if (kind === "duration") return `${Math.round(Number(v))}d`;
  return Number(v).toLocaleString();
}

const toneClasses: Record<string, string> = {
  default: "border-border",
  success: "border-emerald-500/40 bg-emerald-500/5",
  warning: "border-amber-500/40 bg-amber-500/5",
  danger: "border-destructive/40 bg-destructive/5",
  info: "border-primary/40 bg-primary/5",
};

interface Props<T> {
  kpis: ExplorerKpiDef<T>[];
  rows: T[];
  onDrill?: (kpi: ExplorerKpiDef<T>, rows: T[]) => void;
}

export function ExplorerKpiBar<T>({ kpis, rows, onDrill }: Props<T>) {
  if (!kpis?.length) return null;
  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {kpis.map((k) => {
        const { value, delta, trend } = k.compute(rows);
        const tone = toneClasses[k.tone || "default"];
        const clickable = !!onDrill && !!k.drilldown;
        return (
          <Card
            key={k.id}
            className={cn(tone, clickable && "cursor-pointer hover:shadow-md transition-shadow")}
            onClick={() => clickable && onDrill?.(k, rows)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-wide">
                <span className="truncate">{k.label}</span>
                {k.icon}
              </div>
              <div className="text-2xl font-semibold mt-1 tabular-nums">{fmt(value, k.format, k.currency)}</div>
              {(delta != null || trend) && (
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  {trend === "up" && <ArrowUp className="h-3 w-3 text-emerald-600" />}
                  {trend === "down" && <ArrowDown className="h-3 w-3 text-destructive" />}
                  {trend === "flat" && <Minus className="h-3 w-3" />}
                  {delta != null ? `${delta > 0 ? "+" : ""}${delta}%` : null}
                </div>
              )}
              {k.hint && <div className="text-xs text-muted-foreground mt-1 truncate">{k.hint}</div>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
