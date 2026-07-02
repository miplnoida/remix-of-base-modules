import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Grid3x3, Kanban, CalendarDays, Activity, BarChart3, Map as MapIcon, Layers } from "lucide-react";
import { useExplorerState } from "./useExplorerState";
import { applyExplorerState } from "./applyFilters";
import { ExplorerFiltersBar } from "./ExplorerFiltersBar";
import { ExplorerKpiBar } from "./ExplorerKpiBar";
import { ExplorerChartsPanel } from "./ExplorerChartsPanel";
import { ExplorerSavedViewsControl } from "./ExplorerSavedViews";
import { ExplorerExporter } from "./ExplorerExporter";
import { ExplorerScheduler } from "./ExplorerScheduler";
import { ExplorerAiInsights } from "./ExplorerAiInsights";
import { ExplorerGridView } from "./views/ExplorerGridView";
import { ExplorerKanbanView } from "./views/ExplorerKanbanView";
import { ExplorerTimelineView } from "./views/ExplorerTimelineView";
import { ExplorerCalendarView } from "./views/ExplorerCalendarView";
import { ExplorerMapView } from "./views/ExplorerMapView";
import { ExplorerPivotView } from "./views/ExplorerPivotView";
import type { ExplorerDatasetDescriptor, ExplorerViewType } from "./types";

interface Props<T> {
  dataset: ExplorerDatasetDescriptor<T>;
}

const VIEW_ICON: Record<ExplorerViewType, any> = {
  grid: Grid3x3, kanban: Kanban, timeline: Activity, calendar: CalendarDays,
  map: MapIcon, pivot: Layers, chart: BarChart3,
};
const VIEW_LABEL: Record<ExplorerViewType, string> = {
  grid: "Grid", kanban: "Kanban", timeline: "Timeline", calendar: "Calendar",
  map: "Map", pivot: "Pivot", chart: "Charts",
};

export function ExplorerShell<T extends Record<string, any>>({ dataset }: Props<T>) {
  const nav = useNavigate();
  const { state, setView, setSearch, setServerFilters, setFilters, setCrossFilter, setGrouping, reset, load } = useExplorerState({
    view: dataset.defaultView || "grid",
    sort: dataset.defaultSort || [],
  });

  const query = useQuery({
    queryKey: [...dataset.queryKey, state.serverFilters],
    queryFn: () => dataset.fetcher(state.serverFilters),
    staleTime: 30_000,
  });
  const rawRows = query.data || [];
  const rows = useMemo(() => applyExplorerState(rawRows, state), [rawRows, state]) as T[];
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const availableViews: ExplorerViewType[] = (dataset.views?.map((v) => v.type)) ?? [
    "grid", "chart", "pivot",
    ...(dataset.kanban ? (["kanban"] as ExplorerViewType[]) : []),
    ...(dataset.timeline ? (["timeline", "calendar"] as ExplorerViewType[]) : []),
    ...(dataset.map ? (["map"] as ExplorerViewType[]) : []),
  ];

  const rowClick = (r: T) => {
    const to = dataset.rowNavigate?.(r);
    if (to) nav(to);
  };

  const exportCols = useMemo(
    () => dataset.columns.map((c: any) => ({ header: c.header || c.accessorKey, key: c.accessorKey || c.id })).filter((c) => c.key),
    [dataset]
  );

  return (
    <div className="container mx-auto p-6 space-y-4 print:p-0">
      <div className="print:hidden">
        <PageHeader title={dataset.title} subtitle={dataset.subtitle} breadcrumbs={dataset.breadcrumbs} />
      </div>

      <ExplorerFiltersBar
        dataset={dataset}
        state={state}
        onSearch={setSearch}
        onServerFilters={setServerFilters}
        onFilters={setFilters}
        onReset={reset}
      />

      {/* Toolbar row */}
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="flex gap-1 border rounded overflow-hidden">
          {availableViews.map((v) => {
            const I = VIEW_ICON[v]; const active = state.view === v;
            return (
              <Button key={v} size="sm" variant={active ? "default" : "ghost"} className="rounded-none h-8" onClick={() => setView(v)}>
                <I className="h-3.5 w-3.5 mr-1" />{VIEW_LABEL[v]}
              </Button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {dataset.savedViews !== false && <ExplorerSavedViewsControl datasetKey={dataset.key} state={state} onLoad={load} />}
          <ExplorerExporter
            title={dataset.title} fileName={dataset.key} rows={rows as any} columns={exportCols}
            additionalInfo={[
              { label: "Generated", value: new Date().toLocaleString() },
              { label: "Rows", value: String(rows.length) },
            ]}
            onScheduleClick={dataset.scheduling !== false ? () => setScheduleOpen(true) : undefined}
          />
        </div>
      </div>

      {/* KPIs */}
      {dataset.kpis && dataset.kpis.length > 0 && (
        <ExplorerKpiBar
          kpis={dataset.kpis}
          rows={rows}
          onDrill={(k) => {
            const filters = k.drilldown?.(rows);
            if (filters?.length) setFilters([...(state.filters || []), ...filters]);
          }}
        />
      )}

      {/* Charts */}
      {dataset.charts && dataset.charts.length > 0 && (
        <ExplorerChartsPanel
          charts={dataset.charts} rows={rows}
          crossFilter={state.crossFilter}
          onCrossFilter={setCrossFilter}
        />
      )}

      {/* AI Insights */}
      {dataset.aiInsights !== false && (
        <ExplorerAiInsights datasetKey={dataset.key} datasetTitle={dataset.title} module={dataset.module} rows={rows as any} />
      )}

      {/* Main view surface */}
      <Card>
        <CardContent className="p-4">
          {query.isLoading && <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>}
          {query.isError && <div className="text-sm text-destructive py-8 text-center">Failed to load data. {(query.error as any)?.message}</div>}
          {!query.isLoading && !query.isError && rows.length === 0 && <div className="text-sm text-muted-foreground py-8 text-center">No results match your filters.</div>}
          {!query.isLoading && !query.isError && rows.length > 0 && (
            <>
              {state.view === "grid" && (
                <ExplorerGridView id={`explorer.${dataset.key}`} columns={dataset.columns} data={rows} fileName={dataset.key} />
              )}
              {state.view === "kanban" && <ExplorerKanbanView dataset={dataset} rows={rows} onRowClick={rowClick} />}
              {state.view === "timeline" && <ExplorerTimelineView dataset={dataset} rows={rows} onRowClick={rowClick} />}
              {state.view === "calendar" && <ExplorerCalendarView dataset={dataset} rows={rows} onRowClick={rowClick} />}
              {state.view === "map" && <ExplorerMapView dataset={dataset} rows={rows} onRowClick={rowClick} />}
              {state.view === "pivot" && (
                <ExplorerPivotView dataset={dataset} rows={rows}
                  groupBy={state.grouping.map((g) => g.field)}
                  onGroupByChange={(g) => setGrouping(g)} />
              )}
              {state.view === "chart" && (
                <div className="text-sm text-muted-foreground text-center py-4">Chart-only view — see charts above.</div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {dataset.scheduling !== false && (
        <ExplorerScheduler datasetKey={dataset.key} datasetTitle={dataset.title} state={state} open={scheduleOpen} onOpenChange={setScheduleOpen} />
      )}
    </div>
  );
}
