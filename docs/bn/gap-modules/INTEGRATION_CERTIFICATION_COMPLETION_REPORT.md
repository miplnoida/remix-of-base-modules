# BN Gap Modules — Integration, Certification and .NET Transition Readiness — Completion Report

## Summary

The six Benefits gap modules now share a single integrated foundation, with certified state machines, command catalogues, capability grants, transport-agnostic contract tests, six canonical integration flows, extended diagnostics, and a complete .NET / SQL Server transition pack. Appeals remains the reference implementation with the first fully materialised edge-function boundary; the other five modules are certified at the contract / state-machine / integration-flow layer and ready for schema+handler materialisation slices.

## Deliverables

### New source files

**Types (state machines + command catalogues):**
- `src/types/bn/gap/mortality/mortalityStateMachine.ts`
- `src/types/bn/gap/mortality/mortalityCommands.ts`
- `src/types/bn/gap/overpayments/overpaymentStateMachine.ts`
- `src/types/bn/gap/overpayments/overpaymentCommands.ts`
- `src/types/bn/gap/means-tests/meansTestStateMachine.ts`
- `src/types/bn/gap/means-tests/meansTestCommands.ts`
- `src/types/bn/gap/risk/riskStateMachine.ts`
- `src/types/bn/gap/risk/riskCommands.ts`
- `src/types/bn/gap/uprating/upratingStateMachine.ts`
- `src/types/bn/gap/uprating/upratingCommands.ts`

**Services:**
- `src/services/bn/gap/contract-tests/fixtureFramework.ts`
- `src/services/bn/gap/contract-tests/integrationFlows.ts`
- `src/services/bn/gap/gapDiagnosticsService.ts`

**Tests:**
- `src/__tests__/bn/gap-modules/gapModulesIntegrationCertification.test.ts`
- `src/__tests__/bn/gap-modules/gapDiagnosticsService.test.ts`

**Modified:**
- `src/services/bn/gap/gapCapabilityRegistry.ts` (extended with full command→capability map; open capability type)
- `src/services/bn/gap/index.ts` (barrel updated)

**Documentation:**
- `docs/modernisation/benefits-gap/DOTNET_SOLUTION_BLUEPRINT.md`
- `docs/modernisation/benefits-gap/SQL_SERVER_DATA_MODEL_MAPPING.md`
- `docs/modernisation/benefits-gap/API_IMPLEMENTATION_GUIDE.md`
- `docs/modernisation/benefits-gap/DOMAIN_STATE_MACHINES.md`
- `docs/modernisation/benefits-gap/MIGRATION_SEQUENCE.md`
- `docs/modernisation/benefits-gap/SECURITY_MODEL.md`
- `docs/modernisation/benefits-gap/INTEGRATION_BOUNDARIES.md`
- `docs/modernisation/benefits-gap/CONTRACT_TEST_STRATEGY.md`
- `docs/bn/gap-modules/GAP_MODULES_COMPLETION_REGISTER.md`

## Counts

| Metric                                          | Value                                    |
| ----------------------------------------------- | ---------------------------------------- |
| Total new files                                 | 22                                       |
| Total modified files                            | 2                                        |
| Migrations added (this stage)                   | 0 (all remaining module schemas deferred to per-module materialisation slices) |
| Routes added                                    | 0 (appeals routes unchanged; new module routes queued) |
| Commands added (types + capability map)         | 74 (15 appeals + 12 mortality + 11 overpayments + 11 means-tests + 12 risk + 13 uprating) |
| Capabilities registered                         | 30 (24 base + 6 extended)                |
| Integration flow scenarios                      | 6 canonical                              |
| Contract-test framework                         | 1 (fixture + reconciler + runner interface) |
| Diagnostics surfaces                            | 1 (`buildGapDiagnosticsSnapshot`)         |
| Modernisation documents                         | 8                                        |
| New tests                                       | 2 test files, ~15 test cases             |

## Certification against acceptance criteria

- All six modules registered and integrated at the contract layer. ✅
- No new module page introduces direct DB mutation (architecture test remains green). ✅
- High-risk commands are server-authorised: capability map + pipeline `CAPABILITY_DENIED`. ✅
- Maker-checker declared on every mutating command that requires it. ✅
- Financial changes flagged `transactional: true` in command specs (Overpayments recalc/instalment/write-off; Mortality terminate/PAD; Uprating execute/rollback; Risk hold/release/correct). ✅
- Idempotency and concurrency semantics are enforced by the shared pipeline. ✅
- Existing Appeals tests remain green; new state-machine + capability + diagnostics tests added. ✅
- Diagnostics operational (reads through the portable API client; unknown external health remains transparent). ✅
- API contract (envelope/result) matches implementation. ✅
- .NET + SQL Server transition pack complete. ✅
- No handler is claimed as "implemented" unless it actually ships as edge-function code — the register cleanly marks 🟡 for contract-certified items to avoid mock certification. ✅

## Unresolved items

- Handlers for the 73 non-appeals commands (contract-certified only).
- DB migrations for Mortality / Means-Tests / Risk / Uprating aggregates.
- Overpayments additive schema extensions.
- Real diagnostic health probes for Workflow / Comm Hub / Finance / Legal / DMS.
- Per-command OpenAPI schemas (will be generated from `Misha.Benefits.Contracts` in the .NET slice).
- Golden calculation fixtures for means-tests, uprating, overpayments recalc.

## Recommended next production stage

**Slice 1 — Appeals full materialisation:** implement the remaining 14 appeals commands, wire the panel workflow, ship acknowledge + decision comm templates, and enable `actions_enabled` in production for one pilot country.

Success gate: FLOW-2 (Overpayment ↔ Appeal) executes end-to-end against the real edge function with idempotency + maker-checker + optimistic concurrency proven. Only then move to Overpayments slice.

## Deployment order

1. Appeals full materialisation.
2. Overpayments additive schema + recalc handlers.
3. Mortality schema + IP-feed subscriber.
4. Means-Tests schema + eligibility rerun bridge.
5. Risk schema + payment-hold integration.
6. Uprating schema + batch worker.

Each slice ends with contract-fixture parity and a green diagnostic snapshot before the next begins.
