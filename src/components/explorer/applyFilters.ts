/**
 * Deterministic client-side filter/sort/search/cross-filter engine.
 * Runs over rows already returned by the dataset's server fetcher.
 */
import type { ExplorerFilter, ExplorerSort, ExplorerViewState } from "./types";

const get = (r: any, path: string): any => {
  if (!path) return undefined;
  return path.split(".").reduce((a, k) => (a == null ? a : a[k]), r);
};

function matches(row: any, f: ExplorerFilter): boolean {
  const v = get(row, f.field);
  switch (f.op) {
    case "eq": return v === f.value;
    case "neq": return v !== f.value;
    case "gt": return v != null && v > f.value;
    case "gte": return v != null && v >= f.value;
    case "lt": return v != null && v < f.value;
    case "lte": return v != null && v <= f.value;
    case "in": return Array.isArray(f.value) && f.value.includes(v);
    case "nin": return Array.isArray(f.value) && !f.value.includes(v);
    case "contains": return typeof v === "string" && v.toLowerCase().includes(String(f.value ?? "").toLowerCase());
    case "startsWith": return typeof v === "string" && v.toLowerCase().startsWith(String(f.value ?? "").toLowerCase());
    case "endsWith": return typeof v === "string" && v.toLowerCase().endsWith(String(f.value ?? "").toLowerCase());
    case "between": return v != null && v >= f.value && v <= f.value2;
    case "isNull": return v == null || v === "";
    case "isNotNull": return v != null && v !== "";
    default: return true;
  }
}

function searchHit(row: any, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return Object.values(row).some((v) => {
    if (v == null) return false;
    if (typeof v === "object") return JSON.stringify(v).toLowerCase().includes(needle);
    return String(v).toLowerCase().includes(needle);
  });
}

export function applyExplorerState<T = any>(rows: T[], state: ExplorerViewState): T[] {
  let out = rows;
  if (state.filters?.length) out = out.filter((r) => state.filters.every((f) => matches(r, f)));
  if (state.crossFilter) out = out.filter((r) => get(r, state.crossFilter!.field) === state.crossFilter!.value);
  if (state.search) out = out.filter((r) => searchHit(r, state.search));
  if (state.sort?.length) {
    const sorts: ExplorerSort[] = [...state.sort];
    out = [...out].sort((a, b) => {
      for (const s of sorts) {
        const av = get(a, s.field); const bv = get(b, s.field);
        if (av == null && bv == null) continue;
        if (av == null) return s.dir === "asc" ? -1 : 1;
        if (bv == null) return s.dir === "asc" ? 1 : -1;
        if (av < bv) return s.dir === "asc" ? -1 : 1;
        if (av > bv) return s.dir === "asc" ? 1 : -1;
      }
      return 0;
    });
  }
  return out;
}

export function groupRows<T = any>(rows: T[], groupBy: string[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  if (!groupBy.length) { map.set("__all", rows); return map; }
  for (const r of rows) {
    const key = groupBy.map((g) => String(get(r, g) ?? "—")).join(" › ");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return map;
}

export function aggregate<T = any>(
  rows: T[],
  dimension: string,
  measure: { field?: string; agg: "sum" | "count" | "avg" | "min" | "max" } = { agg: "count" },
  limit?: number,
): Array<{ key: string; value: number }> {
  const buckets = new Map<string, number[]>();
  for (const r of rows) {
    const k = String(get(r, dimension) ?? "—");
    if (!buckets.has(k)) buckets.set(k, []);
    const v = measure.field ? Number(get(r, measure.field) || 0) : 1;
    buckets.get(k)!.push(v);
  }
  const result = Array.from(buckets.entries()).map(([k, vs]) => {
    let value = 0;
    switch (measure.agg) {
      case "sum": value = vs.reduce((a, b) => a + b, 0); break;
      case "count": value = vs.length; break;
      case "avg": value = vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : 0; break;
      case "min": value = Math.min(...vs); break;
      case "max": value = Math.max(...vs); break;
    }
    return { key: k, value };
  }).sort((a, b) => b.value - a.value);
  return limit ? result.slice(0, limit) : result;
}
