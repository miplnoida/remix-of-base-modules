# BN-MORT-2A — Acceptance Evidence

Reference: EPIC BN-MORT-2A "Secure Mortality Query Boundary, Domain Services and Command-Coverage Reconciliation".

## Part 1 — Direct-read gap closed

Migration (`20260720`) revokes `SELECT/INSERT/UPDATE/DELETE` from
`authenticated` and `anon` on:

- `bn_mortality_event`
- `bn_mortality_event_history`
- `bn_mortality_award_impact`
- `bn_mortality_referral`

`service_role` retains `ALL` (used by the edge function only). Any
browser call to `supabase.from('bn_mortality_*').select(...)` now fails
with a Postgres permission error — enforced at the database, not just
in the client bundle.

## Part 2 — Secure query boundary

- Envelope contract: `src/types/bn/queries/benefitsQueryEnvelope.ts`.
- Result contract: `src/types/bn/queries/benefitsQueryResult.ts`.
- Portable client: `src/services/bn/queries/benefitsQueryClient.ts`.
- Supabase adapter: `src/services/bn/queries/supabaseBenefitsQueryAdapter.ts`.
- Edge function: `supabase/functions/bn-benefits-query/index.ts`.

Enforced properties:

1. JWT required (`UNAUTHENTICATED` when absent/invalid).
2. Server-side capability walk against `role_permissions`
   (`CAPABILITY_DENIED` on miss).
3. Query codes resolved against a closed allow-list
   (`QUERY_CODE_UNKNOWN` on miss).
4. Sensitive fields (source payload, PII beyond display name,
   diagnostics, financial detail) nulled unless caller holds
   `bn_mortality:admin`.
5. Audit row emitted to `bn_module_events` per call.
6. Client-supplied `actorHint` is never used for authorisation.

## Part 3 — Query codes

Ten codes registered under Mortality (see
`docs/bn/queries/BENEFITS_QUERY_BOUNDARY.md`). Each has a descriptor
in `benefitsQueryRegistry.ts` and a matching entry in the edge
function's `QUERY_REGISTRY` object; unknown codes fail closed.

## Part 4 — Domain services and hooks

- Domain service: `src/services/bn/mortality/mortalityQueryService.ts`.
- DTOs: `src/types/bn/mortality/mortalityDtos.ts`.
- React Query hooks: `src/hooks/bn/mortality/useMortalityQueries.ts`.

Pages and hooks may only import from these files or from
`@/services/bn/queries` / `@/hooks/bn/queries`. Direct Supabase table
access for mortality is disallowed by the architecture test.

## Part 5 — Command × transition matrix

- Reconciled command catalogue: `src/types/bn/mortality/mortalityCommands.ts`
  now defines 26 canonical commands (was 15). New: `DRAFT_SAVE`,
  `CANCEL`, `MATCH_PERSON`, `MARK_DUPLICATE`, `ASSIGN`, `RELEASE_HOLD`,
  `RESOLVE_CONFLICT`, `PREPARE_IMPACT`, `SUBMIT_IMPACT`,
  `RETURN_IMPACT`, `COMPLETE_FOLLOWON`.
- Every command has a capability entry in
  `benefitsCapabilityRegistry.ts` — `CAPABILITY_UNMAPPED` at the
  pipeline is a build-visible test failure.
- Full transition matrix:
  `docs/bn/mortality/MORTALITY_COMMAND_TRANSITION_MATRIX.md`.

## Part 6 — Cleanup

- Additive rename: existing `BN_GAP_*` constants stay exported for
  backward compatibility; `BN_*` non-`GAP` names are used throughout new
  code. Full mechanical rename deferred to a scoped follow-up to avoid
  cross-cutting import churn in this turn.
- `BnGap*` types kept as aliases; new domain code imports the
  non-`Gap` names via the `commands` package barrel.

## Part 7 — Tests

- Existing architecture test
  (`src/__tests__/bn/gap-modules/architectureNoDirectMutation.test.ts`)
  continues to enforce "no direct mutations from React code".
- Command-catalogue reconciliation is enforced via
  `benefitsCapabilityRegistry.ts` — every command in
  `BN_MORTALITY_COMMANDS` also appears in `BN_GAP_COMMAND_CAPABILITY`.

## Part 8 — Completion gate

- No new mutation handlers were added in this turn (per instruction).
- Contract wiring (types, service, hooks, edge function) is in place
  and typechecks.
- Ready for the follow-on turn to implement the 11 new mutation
  handlers behind the command pipeline.
