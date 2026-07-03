/**
 * EPIC-07 Finalization — shared portfolio-wide workbench component.
 * Renders a filterable list from a single post-judgment table.
 * All data comes from Supabase; no mocks.
 */
import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/formatCurrency";

const sb = supabase as any;

export type WorkbenchColumn = {
  key: string;
  label: string;
  format?: "text" | "currency" | "date" | "badge";
  className?: string;
};

interface PostJudgmentListWorkbenchProps {
  title: string;
  description: string;
  table: string;
  select: string;
  columns: WorkbenchColumn[];
  caseIdField?: string;
  orderBy?: { column: string; ascending?: boolean };
  statusField?: string;
}

const formatValue = (v: any, fmt?: WorkbenchColumn["format"]) => {
  if (v === null || v === undefined || v === "") return "—";
  if (fmt === "currency") return formatCurrency(Number(v));
  if (fmt === "date") {
    try { return new Date(v).toLocaleDateString(); } catch { return String(v); }
  }
  return String(v);
};

export default function PostJudgmentListWorkbench({
  title, description, table, select, columns,
  caseIdField = "lg_case_id", orderBy, statusField,
}: PostJudgmentListWorkbenchProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["post-judgment", table],
    queryFn: async () => {
      let q = sb.from(table).select(select).limit(500);
      if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending ?? false });
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 30_000,
  });

  const statuses = useMemo(() => {
    if (!statusField || !data) return [];
    return Array.from(new Set(data.map((r) => r[statusField]).filter(Boolean)));
  }, [data, statusField]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((r) => {
      if (statusField && statusFilter && r[statusField] !== statusFilter) return false;
      if (search) {
        const hay = JSON.stringify(r).toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [data, search, statusFilter, statusField]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Badge variant="outline">{filtered.length} record{filtered.length === 1 ? "" : "s"}</Badge>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            {statusField && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All statuses</option>
                {statuses.map((s) => (
                  <option key={String(s)} value={String(s)}>{String(s)}</option>
                ))}
              </select>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-destructive">Failed to load data.</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {columns.map((c) => (
                      <th key={c.key} className="px-3 py-2 text-left font-medium">{c.label}</th>
                    ))}
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id} className="border-t hover:bg-muted/30">
                      {columns.map((c) => (
                        <td key={c.key} className={`px-3 py-2 ${c.className ?? ""}`}>
                          {c.format === "badge"
                            ? <Badge variant="outline">{formatValue(row[c.key], "text")}</Badge>
                            : formatValue(row[c.key], c.format)}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right">
                        {row[caseIdField] ? (
                          <Button asChild variant="ghost" size="sm">
                            <Link to={`/legal/lg/post-judgment/${row[caseIdField]}`}>Open Case</Link>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
