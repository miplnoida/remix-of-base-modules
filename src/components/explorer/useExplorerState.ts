import { useCallback, useMemo, useState } from "react";
import { DEFAULT_VIEW_STATE, type ExplorerFilter, type ExplorerServerFilters, type ExplorerSort, type ExplorerViewState, type ExplorerViewType } from "./types";

export function useExplorerState(initial?: Partial<ExplorerViewState>) {
  const [state, setState] = useState<ExplorerViewState>({ ...DEFAULT_VIEW_STATE, ...initial });

  const setView = useCallback((view: ExplorerViewType) => setState((s) => ({ ...s, view })), []);
  const setSearch = useCallback((search: string) => setState((s) => ({ ...s, search })), []);
  const setServerFilters = useCallback((f: ExplorerServerFilters) => setState((s) => ({ ...s, serverFilters: f })), []);
  const setFilters = useCallback((filters: ExplorerFilter[]) => setState((s) => ({ ...s, filters })), []);
  const addFilter = useCallback((f: ExplorerFilter) => setState((s) => ({ ...s, filters: [...s.filters, f] })), []);
  const removeFilter = useCallback((i: number) => setState((s) => ({ ...s, filters: s.filters.filter((_, idx) => idx !== i) })), []);
  const setSort = useCallback((sort: ExplorerSort[]) => setState((s) => ({ ...s, sort })), []);
  const setGrouping = useCallback((fields: string[]) => setState((s) => ({ ...s, grouping: fields.map((f) => ({ field: f })) })), []);
  const setCrossFilter = useCallback((cf: ExplorerViewState["crossFilter"]) => setState((s) => ({ ...s, crossFilter: cf })), []);
  const reset = useCallback(() => setState({ ...DEFAULT_VIEW_STATE, ...initial }), [initial]);
  const load = useCallback((next: ExplorerViewState) => setState({ ...DEFAULT_VIEW_STATE, ...next }), []);

  return useMemo(() => ({
    state, setState, setView, setSearch, setServerFilters,
    setFilters, addFilter, removeFilter, setSort, setGrouping,
    setCrossFilter, reset, load,
  }), [state, setView, setSearch, setServerFilters, setFilters, addFilter, removeFilter, setSort, setGrouping, setCrossFilter, reset, load]);
}
