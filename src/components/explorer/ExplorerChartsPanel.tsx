import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
  Area, AreaChart,
} from "recharts";
import { aggregate } from "./applyFilters";
import type { ExplorerChartDef, ExplorerViewState } from "./types";

const PALETTE = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

interface Props<T> {
  charts: ExplorerChartDef<T>[];
  rows: T[];
  crossFilter: ExplorerViewState["crossFilter"];
  onCrossFilter: (cf: ExplorerViewState["crossFilter"]) => void;
}

export function ExplorerChartsPanel<T>({ charts, rows, crossFilter, onCrossFilter }: Props<T>) {
  if (!charts?.length) return null;
  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
      {crossFilter && (
        <div className="lg:col-span-2 flex items-center gap-2 text-xs bg-primary/10 border border-primary/30 rounded px-3 py-2">
          <span>Cross-filter active: <strong>{crossFilter.field}</strong> = <strong>{String(crossFilter.value)}</strong></span>
          <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => onCrossFilter(null)}><X className="h-3 w-3" /> Clear</Button>
        </div>
      )}
      {charts.map((c) => <ChartCard key={c.id} chart={c} rows={rows} onCrossFilter={onCrossFilter} />)}
    </div>
  );
}

function ChartCard<T>({ chart, rows, onCrossFilter }: { chart: ExplorerChartDef<T>; rows: T[]; onCrossFilter: (cf: ExplorerViewState["crossFilter"]) => void }) {
  const data = useMemo(() => aggregate(rows as any, String(chart.dimension), chart.measure ? { agg: chart.measure.agg, field: chart.measure.field != null ? String(chart.measure.field) : undefined } : undefined, chart.limit), [rows, chart]);
  const height = chart.height ?? 260;
  const handleClick = (key: string) => {
    if (!chart.crossFilterField) return;
    onCrossFilter({ field: String(chart.crossFilterField), value: key });
  };

  const chartEl = (() => {
    switch (chart.type) {
      case "bar":
      case "stacked-bar":
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="key" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill={PALETTE[0]} onClick={(d: any) => handleClick(d.key)} cursor="pointer" />
          </BarChart>
        );
      case "line":
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="key" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke={PALETTE[0]} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        );
      case "area":
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="key" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Area type="monotone" dataKey="value" stroke={PALETTE[0]} fill={PALETTE[0]} fillOpacity={0.3} />
          </AreaChart>
        );
      case "pie":
      case "donut":
        return (
          <PieChart>
            <Tooltip />
            <Legend />
            <Pie
              data={data} dataKey="value" nameKey="key" cx="50%" cy="50%"
              outerRadius={chart.type === "donut" ? 90 : 100}
              innerRadius={chart.type === "donut" ? 55 : 0}
              onClick={(d: any) => handleClick(d.key)}
            >
              {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
          </PieChart>
        );
      default:
        return <div />;
    }
  })();

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{chart.title}</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>{chartEl}</ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
