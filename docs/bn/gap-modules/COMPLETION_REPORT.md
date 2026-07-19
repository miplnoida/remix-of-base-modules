# BN Gap Modules — Programme Foundation Completion Report

Status: **FOUNDATION READY** for the six module epics to build on.

## Files added

### Types (portable, framework-agnostic)
- `src/types/bn/gap/commandEnvelope.ts`
- `src/types/bn/gap/commandResult.ts`
- `src/types/bn/gap/moduleCodes.ts`

### Services
- `src/services/bn/gap/benefitsGapApiClient.ts` — portable API client interface
- `src/services/bn/gap/supabaseBenefitsGapAdapter.ts` — today's adapter
- `src/services/bn/gap/gapCapabilityRegistry.ts` — granular capability catalogue
- `src/services/bn/gap/gapCommandPipeline.ts` — transport-neutral pipeline
- `src/services/bn/gap/gapHandlerRegistry.ts` — closed handler list
- `src/services/bn/gap/pingCommand.ts` — harmless proof command
- `src/services/bn/gap/index.ts` — public barrel

### Hooks
- `src/hooks/bn/useBenefitsGapPing.ts` — reference React Query hook

### Server boundary
- `supabase/functions/bn-gap-command/index.ts` — JWT-authenticated, ignores wire-supplied `actorUserId`

### Docs & contracts
- `docs/bn/gap-modules/PROGRAMME_BASELINE.md`
- `docs/bn/contracts/benefits-gap-api.openapi.yaml`
- `docs/bn/contracts/command-envelope.md`
- `docs/bn/contracts/error-codes.md`
- `docs/bn/contracts/data-type-mapping.md`
- `docs/bn/contracts/state-machine-conventions.md`

### Tests
- `src/__tests__/bn/gap-modules/gapCommandPipeline.test.ts` (11 tests)
- `src/__tests__/bn/gap-modules/moduleRegistry.test.ts` (5 tests)
- `src/__tests__/bn/gap-modules/architectureNoDirectMutation.test.ts` (1 test)

## Migrations added

Single additive migration:

- `bn_gap_command_log` — command audit log (before/after images, outcome, correlation id).
- `bn_gap_idempotency` — persistent idempotency store keyed by `idempotencyKey`.
- `bn_actor_has_capability(uuid, text)` — fail-closed SECURITY DEFINER RPC joining `user_roles → roles → role_permissions → app_modules × module_actions` on the canonical capability shape `{module}:{verb}`.
- Six `app_modules` rows: `bn_mortality`, `bn_overpayments`, `bn_appeals`, `bn_means_tests`, `bn_risk_management`, `bn_uprating` — dark launched (`actions_enabled = false`, `show_in_menu = false`, `rollout_state = internal_pilot`).
- 24 `module_actions` rows — `read | write | decide | admin` × 6 modules.

No RLS was enabled — project rule.

## Tests added / regression

- 17 new tests, all passing.
- Full suite: **1,684 passed**, 4 skipped, 14 todo — zero regressions.

## Completion criteria (matched against the prompt)

| Criterion | Status |
| --- | --- |
| Programme baseline document | ✅ `PROGRAMME_BASELINE.md` |
| Portable API client boundary | ✅ `BenefitsGapApiClient` interface + Supabase adapter |
| Server-authorised command foundation | ✅ `gapCommandPipeline` + edge fn boundary |
| Common audit / idempotency / concurrency | ✅ Log table, idempotency store, `expectedRowVersion` check |
| app_modules & capability registration framework | ✅ 6 modules + 24 actions + capability RPC |
| OpenAPI foundation | ✅ `benefits-gap-api.openapi.yaml` |
| SQL Server / .NET type mapping | ✅ `data-type-mapping.md` |
| Architecture enforcement tests | ✅ `architectureNoDirectMutation.test.ts` |
| Diagnostics of six modules and rollout state | ✅ `BenefitsGapApiClient.getAllModuleRolloutStates()` — server-sourced |
| Sample harmless proof command end-to-end | ✅ `BN_GAP_PING` — 11 pipeline scenarios green |
| Existing Benefits + Award 360 tests still pass | ✅ 1,684 total |
| Architecture can accept a `DotNetBenefitsGapAdapter` | ✅ interface + injected pipeline stores |

## Unresolved blockers

None for the foundation. Downstream slices will each:

1. Add module-specific handler(s) — one file each — and register in `gapHandlerRegistry`.
2. Register the command's required capability in `BN_GAP_COMMAND_CAPABILITY`.
3. Add module-specific payload / state-machine types under `src/types/bn/gap/`.
4. Add additive migrations for module tables (all with GRANTs).
5. Flip `actions_enabled = true` for that module when ready for pilot use.

The pipeline, envelope, result, audit, idempotency, capability check, and portability adapters do not need to change to onboard the next module.

## Notes for the future .NET / SQL Server cut-over

- `gapCommandPipeline.ts` is a mechanical 1:1 port target — no PostgreSQL-specific logic.
- Every side effect flows through an injected store, so re-implementing the six stores against EF Core + SQL Server is the sole hand-swap.
- Envelope + result serialise as flat JSON — the same OpenAPI describes both eras.
