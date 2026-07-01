/**
 * Phase 7 cutover flag for the Configuration Center engine.
 *
 * When `useEngineResolver()` returns true, `resolveCommunication()` (and any
 * other domain adapter) will prefer `resolveConfiguration()` and only fall
 * back to legacy `comm_asset_assignment` reads if the engine returns no match.
 *
 * The flag is env-driven so it can be flipped per environment without a
 * schema change or a redeploy of unrelated modules:
 *
 *   VITE_CONFIG_ENGINE_ENABLED=true   → engine is authoritative
 *   VITE_CONFIG_ENGINE_ENABLED=false  → legacy path only (default, safe)
 *
 * Phase 8 will remove this flag and delete the legacy path entirely.
 */
export function useEngineResolver(): boolean {
  const raw = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_CONFIG_ENGINE_ENABLED;
  if (typeof raw !== "string") return false;
  return raw.toLowerCase() === "true" || raw === "1";
}

/**
 * Server-safe variant (Node scripts, edge functions). Reads `process.env`.
 */
export function isEngineResolverEnabled(env: Record<string, string | undefined> = (typeof process !== "undefined" ? process.env : {})): boolean {
  const raw = env.VITE_CONFIG_ENGINE_ENABLED ?? env.CONFIG_ENGINE_ENABLED;
  if (typeof raw !== "string") return false;
  return raw.toLowerCase() === "true" || raw === "1";
}
