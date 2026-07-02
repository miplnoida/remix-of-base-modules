import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, X, RotateCcw } from "lucide-react";
import type { ExplorerDatasetDescriptor, ExplorerFilter, ExplorerFilterOp, ExplorerServerFilters, ExplorerViewState } from "./types";
import { useLgOfficers, useLgTerritories } from "@/hooks/legal/useLgReports";

interface Props<T> {
  dataset: ExplorerDatasetDescriptor<T>;
  state: ExplorerViewState;
  onSearch: (s: string) => void;
  onServerFilters: (f: ExplorerServerFilters) => void;
  onFilters: (f: ExplorerFilter[]) => void;
  onReset: () => void;
}

const OPS: Array<{ v: ExplorerFilterOp; l: string }> = [
  { v: "eq", l: "equals" }, { v: "neq", l: "not equals" },
  { v: "contains", l: "contains" }, { v: "startsWith", l: "starts with" },
  { v: "gt", l: ">" }, { v: "gte", l: "≥" }, { v: "lt", l: "<" }, { v: "lte", l: "≤" },
  { v: "isNull", l: "is empty" }, { v: "isNotNull", l: "is not empty" },
];

const STATUSES = ["OPEN", "IN_PROGRESS", "AWAITING_HEARING", "JUDGMENT", "ENFORCEMENT", "SETTLED", "CLOSED"];
const STAGES = ["INTAKE", "PREP", "FILED", "HEARING", "JUDGMENT", "ENFORCEMENT", "CLOSED"];

export function ExplorerFiltersBar<T>({ dataset, state, onSearch, onServerFilters, onFilters, onReset }: Props<T>) {
  const { data: officers = [] } = useLgOfficers();
  const { data: territories = [] } = useLgTerritories();
  const [draftField, setDraftField] = useState<string>("");
  const [draftOp, setDraftOp] = useState<ExplorerFilterOp>("contains");
  const [draftValue, setDraftValue] = useState("");

  const sf = dataset.serverFilterFields ?? ["dateRange", "territory", "officer", "status"];
  const patch = (p: Partial<ExplorerServerFilters>) => onServerFilters({ ...state.serverFilters, ...p });

  const fieldOptions = useMemo(() => {
    const src = dataset.filterFields?.length ? dataset.filterFields.map((f) => ({ value: f.field, label: f.label })) : [];
    if (src.length) return src;
    return dataset.columns.map((c: any) => ({ value: c.accessorKey || c.id, label: c.header || c.accessorKey })).filter((c) => c.value);
  }, [dataset]);

  const addDraft = () => {
    if (!draftField) return;
    const f: ExplorerFilter = { field: draftField, op: draftOp, value: draftValue };
    onFilters([...state.filters, f]);
    setDraftValue("");
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">Filters</CardTitle>
        <Button size="sm" variant="ghost" onClick={onReset}><RotateCcw className="h-3.5 w-3.5 mr-1" />Reset</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Global search */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Global search across all fields…" className="pl-9" value={state.search} onChange={(e) => onSearch(e.target.value)} />
          </div>
        </div>

        {/* Server quick filters */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          {sf.includes("dateRange") && (
            <>
              <div><Label className="text-xs">From</Label>
                <Input type="date" value={state.serverFilters.dateFrom || ""} onChange={(e) => patch({ dateFrom: e.target.value || undefined })} />
              </div>
              <div><Label className="text-xs">To</Label>
                <Input type="date" value={state.serverFilters.dateTo || ""} onChange={(e) => patch({ dateTo: e.target.value || undefined })} />
              </div>
            </>
          )}
          {sf.includes("territory") && (
            <div><Label className="text-xs">Territory</Label>
              <Select value={state.serverFilters.territory || "__all"} onValueChange={(v) => patch({ territory: v === "__all" ? undefined : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All</SelectItem>
                  {territories.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {sf.includes("officer") && (
            <div><Label className="text-xs">Officer</Label>
              <Select value={state.serverFilters.officerId || "__all"} onValueChange={(v) => patch({ officerId: v === "__all" ? undefined : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All</SelectItem>
                  {officers.map((o: any) => <SelectItem key={o.id} value={o.user_id || o.id}>{o.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {sf.includes("status") && (
            <div><Label className="text-xs">Status</Label>
              <Select value={state.serverFilters.status || "__all"} onValueChange={(v) => patch({ status: v === "__all" ? undefined : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All</SelectItem>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {sf.includes("stage") && (
            <div><Label className="text-xs">Stage</Label>
              <Select value={state.serverFilters.stage || "__all"} onValueChange={(v) => patch({ stage: v === "__all" ? undefined : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All</SelectItem>
                  {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Advanced filter builder */}
        <div className="border-t pt-3">
          <Label className="text-xs">Advanced filters</Label>
          <div className="flex flex-wrap items-end gap-2 mt-1">
            <Select value={draftField} onValueChange={setDraftField}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Field" /></SelectTrigger>
              <SelectContent>{fieldOptions.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={draftOp} onValueChange={(v) => setDraftOp(v as ExplorerFilterOp)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{OPS.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
            </Select>
            {!["isNull", "isNotNull"].includes(draftOp) && (
              <Input value={draftValue} onChange={(e) => setDraftValue(e.target.value)} placeholder="Value" className="w-48" />
            )}
            <Button size="sm" onClick={addDraft} disabled={!draftField}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>
          </div>
          {state.filters.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {state.filters.map((f, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  <span>{f.field} {f.op} {f.value != null ? String(f.value) : ""}</span>
                  <button onClick={() => onFilters(state.filters.filter((_, x) => x !== i))}><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
