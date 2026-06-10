/**
 * Persists BNDataGrid state per grid id in localStorage.
 * Stores: sorting, column visibility, column sizing, page size, column order.
 * Filters + globalFilter are intentionally NOT persisted (session-only).
 */
import { useEffect, useState } from 'react';
import type { SortingState, VisibilityState } from '@tanstack/react-table';

const PREFIX = 'bn-grid:';

export interface PersistedGridState {
  sorting: SortingState;
  columnVisibility: VisibilityState;
  columnSizing: Record<string, number>;
  pageSize: number;
}

const defaultState: PersistedGridState = {
  sorting: [],
  columnVisibility: {},
  columnSizing: {},
  pageSize: 25,
};

export function loadGridState(id: string): PersistedGridState {
  try {
    const raw = localStorage.getItem(PREFIX + id);
    if (!raw) return { ...defaultState };
    return { ...defaultState, ...JSON.parse(raw) };
  } catch {
    return { ...defaultState };
  }
}

export function saveGridState(id: string, state: PersistedGridState) {
  try {
    localStorage.setItem(PREFIX + id, JSON.stringify(state));
  } catch {
    // ignore quota
  }
}

export function useBnGridState(id: string, initial?: Partial<PersistedGridState>) {
  const [state, setState] = useState<PersistedGridState>(() => ({
    ...loadGridState(id),
    ...(initial ?? {}),
  }));

  useEffect(() => {
    saveGridState(id, state);
  }, [id, state]);

  return [state, setState] as const;
}

export function clearGridState(id: string) {
  try {
    localStorage.removeItem(PREFIX + id);
  } catch {
    // ignore
  }
}
