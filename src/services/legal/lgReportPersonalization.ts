/**
 * EPIC-09B — Report personalization helpers (favourites, pinned, history, presets)
 *
 * Uses localStorage for zero-latency reads. The server-side canonical store is
 * lg_dashboard_preference (favourites / pinned) for cross-device sync.
 */
const K_FAV = "lg-report-favourites";
const K_PIN = "lg-report-pinned";
const K_HIST = "lg-report-history";
const K_PRESET = "lg-report-column-preset:";
const K_LAYOUT = "lg-report-layout:";

function read<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function write<T>(key: string, val: T) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

// ---------- Favourites ----------
export const getFavourites = (): string[] => read<string[]>(K_FAV, []);
export function toggleFavourite(code: string) {
  const list = getFavourites();
  const next = list.includes(code) ? list.filter((c) => c !== code) : [...list, code];
  write(K_FAV, next);
  return next;
}
export const isFavourite = (code: string) => getFavourites().includes(code);

// ---------- Pinned ----------
export const getPinned = (): string[] => read<string[]>(K_PIN, []);
export function togglePinned(code: string) {
  const list = getPinned();
  const next = list.includes(code) ? list.filter((c) => c !== code) : [...list, code];
  write(K_PIN, next);
  return next;
}
export const isPinned = (code: string) => getPinned().includes(code);

// ---------- History (recently used) ----------
export interface HistoryEntry { code: string; name: string; at: string; }
export const getHistory = (): HistoryEntry[] => read<HistoryEntry[]>(K_HIST, []);
export function recordHistory(code: string, name: string) {
  const list = getHistory().filter((h) => h.code !== code);
  list.unshift({ code, name, at: new Date().toISOString() });
  write(K_HIST, list.slice(0, 20));
}
export function clearHistory() { write(K_HIST, []); }

// ---------- Column presets ----------
export interface ColumnPreset { name: string; visibleKeys: string[]; }
export const getColumnPresets = (reportCode: string): ColumnPreset[] => read(K_PRESET + reportCode, []);
export function saveColumnPreset(reportCode: string, preset: ColumnPreset) {
  const presets = getColumnPresets(reportCode).filter((p) => p.name !== preset.name);
  presets.push(preset);
  write(K_PRESET + reportCode, presets);
  return presets;
}
export function deleteColumnPreset(reportCode: string, name: string) {
  const next = getColumnPresets(reportCode).filter((p) => p.name !== name);
  write(K_PRESET + reportCode, next);
  return next;
}

// ---------- Saved layouts (per-report grouping/pivot state) ----------
export interface ReportLayout {
  groupBy?: string[];
  pivotEnabled?: boolean;
  pivotRow?: string;
  pivotCol?: string;
  pivotAgg?: string;
  conditionalRules?: Array<{ column: string; op: "gt" | "lt" | "eq"; value: number; tone: "success" | "warning" | "danger" }>;
}
export const getReportLayout = (code: string): ReportLayout => read(K_LAYOUT + code, {});
export function saveReportLayout(code: string, layout: ReportLayout) { write(K_LAYOUT + code, layout); }
