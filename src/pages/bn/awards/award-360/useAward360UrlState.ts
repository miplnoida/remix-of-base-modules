/**
 * BN-AWARD360-B2 — Small Award 360 scoped URL-state hook.
 * Keeps the ?tab= param and a prefixed set of tab-scoped keys in the URL so
 * filters and pagination survive browser back/forward.
 */
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface UrlStateSpec<T extends Record<string, unknown>> {
  prefix: string;
  defaults: T;
  parsers?: Partial<{ [K in keyof T]: (raw: string) => T[K] }>;
  serializers?: Partial<{ [K in keyof T]: (value: T[K]) => string | undefined }>;
}

export function useAward360UrlState<T extends Record<string, unknown>>(spec: UrlStateSpec<T>) {
  const [sp, setSp] = useSearchParams();
  const state = useMemo(() => {
    const out: Record<string, unknown> = { ...spec.defaults };
    for (const key of Object.keys(spec.defaults)) {
      const raw = sp.get(`${spec.prefix}${key}`);
      if (raw == null || raw === '') continue;
      const parser = spec.parsers?.[key as keyof T];
      out[key] = parser ? parser(raw) : (raw as unknown);
    }
    return out as T;
  }, [sp, spec]);

  const setState = useCallback(
    (patch: Partial<T>) => {
      const next = new URLSearchParams(sp);
      for (const [key, value] of Object.entries(patch)) {
        const paramKey = `${spec.prefix}${key}`;
        const ser = spec.serializers?.[key as keyof T];
        const serialised = ser ? ser(value as T[keyof T]) : value == null ? undefined : String(value);
        const def = spec.defaults[key as keyof T];
        const defSer = ser ? ser(def) : def == null ? undefined : String(def);
        if (serialised == null || serialised === '' || serialised === defSer) next['delete'](paramKey);
        else next.set(paramKey, serialised);
      }
      setSp(next, { replace: false });
    },
    [sp, setSp, spec],
  );

  return [state, setState] as const;
}

export const strParser = (v: string) => v;
export const numParser = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
export const boolParser = (v: string) => v === 'true' || v === '1';
export const boolSerializer = (v: unknown) => (v ? 'true' : undefined);
