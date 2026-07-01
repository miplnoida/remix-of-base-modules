/**
 * Phase 8: engine is now the single source of truth.
 *
 * The `VITE_CONFIG_ENGINE_ENABLED` env flag is retired. `useEngineResolver()`
 * and `isEngineResolverEnabled()` remain as thin `() => true` shims so any
 * lingering call sites keep compiling until they are removed in a follow-up
 * sweep. Do NOT reintroduce a legacy `comm_asset_assignment` read path.
 */
export function useEngineResolver(): true {
  return true;
}

export function isEngineResolverEnabled(): true {
  return true;
}
