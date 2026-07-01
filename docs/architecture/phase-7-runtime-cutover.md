# Phase 7 — Runtime Cutover

Purpose: move every runtime read of communication (and, later, workflow /
numbering / branding / reporting / AI) off direct `comm_*` / domain-specific
tables and onto the generic `resolveConfiguration()` engine.

## What ships in Phase 7

1. **Feature flag** — `src/lib/configuration/featureFlag.ts`
   - `useEngineResolver()` (browser) and `isEngineResolverEnabled(env)` (Node)
   - Driven by `VITE_CONFIG_ENGINE_ENABLED` (default `false`).
   - When true, adapters (`resolveCommunicationContext`, …) prefer the engine
     and fall back to legacy reads only if the engine returns no match.

2. **Lint** — `scripts/lint-no-direct-comm.ts`
   - Fails CI when module code outside the approved allow-list imports
     `.from('comm_*')` or `.from('core_text_block')`.
   - Allow-list: `src/lib/comm/**`, `src/lib/configuration/**`,
     `src/pages/admin/organization/**`, `src/hooks/comm/**`,
     `supabase/{migrations,functions}/**`, `scripts/**`.
   - Run: `bunx tsx scripts/lint-no-direct-comm.ts`.

3. **Validation & Impact page** — `src/pages/admin/organization/ValidationImpactPage.tsx`
   - Coverage matrix: rows per (domain, resource_type) × scope tier.
   - Missing GLOBAL fallback detector (invariant from
     `docs/architecture/scope-precedence.md`).
   - Duplicate priority within a scope tier (ambiguous winner).
   - Expired / not-yet-active rows still marked `is_active = true`.

## Cutover checklist

- [ ] Turn `VITE_CONFIG_ENGINE_ENABLED=true` in the target environment.
- [ ] Confirm Validation & Impact → "Engine Health" is green for every
      (domain, resource_type) pair the runtime consumes.
- [ ] Run `bunx tsx scripts/lint-no-direct-comm.ts` in CI; new violations
      must add themselves to the allow-list *and* justify it in review.
- [ ] Monitor `resolveCommunicationContext` fallback rate (log line) for
      one release. Zero fallbacks over the window → safe for Phase 8.

## Phase 8 (next)

- Delete legacy resolver branches and the feature flag.
- Drop `comm_asset_assignment` (view-shimmed since Phase 5).
- Remove legacy `/admin/organization-management` route.
