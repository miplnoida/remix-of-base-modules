# BN Gap Modules — Completion Register

**Purpose:** Per-module ledger of what is IMPLEMENTED, what is CONTRACT-CERTIFIED (state machines, commands, capabilities, fixtures, docs), and what remains before production activation.

Legend:
- ✅ Implemented and green
- 🟡 Contract-certified (types + capabilities + fixtures + docs); handler / DB schema not yet materialised
- ⏳ Planned in next slice
- ⛔ Out of scope for this programme

---

## 1. bn_appeals — Appeals & Disputes

| Concern                          | Status | Evidence                                                         |
| -------------------------------- | ------ | ---------------------------------------------------------------- |
| Routes                           | ✅     | `/bn/appeals` (portal), staff console (existing)                 |
| app_modules registration         | ✅     | `bn_appeals`                                                     |
| Capability registration          | ✅     | 10 verbs (read/write/decide/admin + 6 extended)                  |
| Tables                           | ✅     | `bn_appeal`, `bn_appeal_ground`, `bn_appeal_evidence`, `bn_appeal_event`, `bn_appeal_hearing_link`, `bn_appeal_decision_snapshot` |
| Commands                         | 🟡     | 15 named in catalogue; 1 (`SUBMIT_CLAIMANT`) implemented          |
| Queries                          | ✅     | `useMyAppeals`                                                    |
| State machine                    | ✅     | 15 states / 24 transitions certified                              |
| Workflows                        | ⏳     | Panel workflow template pending                                   |
| Communication events             | ⏳     | Acknowledge letter, decision letter                               |
| DMS links                        | ⏳     | Decision packet linkage                                           |
| Legal referral                   | 🟡     | `REFER_TO_LEGAL` command certified                                |
| Reports                          | ⏳     |                                                                   |
| Tests                            | ✅     | State machine + service tests                                     |
| Direct browser mutation          | ✅     | ELIMINATED (dedicated edge function)                              |
| SQL Server mapping status        | 🟡     | Complete in `SQL_SERVER_DATA_MODEL_MAPPING.md`                    |
| .NET API contract status         | 🟡     | Contract v0.2                                                     |
| Production prerequisites         |        | Remaining 14 commands; workflow template; comm templates          |

## 2. bn_mortality — Death & Mortality

| Concern                          | Status | Evidence                                    |
| -------------------------------- | ------ | ------------------------------------------- |
| Routes                           | ⏳     | `/bn/mortality` planned                     |
| app_modules registration         | ✅     | `bn_mortality`                              |
| Capability registration          | ✅     | 4 base verbs                                |
| Tables                           | ⏳     | `bn_mortality_event`, `_history`, `_award_impact`, `_referral` in `SQL_SERVER_DATA_MODEL_MAPPING.md` |
| Commands                         | 🟡     | 12 named + capability-mapped                |
| State machine                    | ✅     | 11 states                                    |
| IP-module read-only boundary     | ✅     | Documented in `INTEGRATION_BOUNDARIES.md`   |
| Cross-module handoffs            | 🟡     | FLOW-1 canonical flow certified              |
| SQL Server mapping               | 🟡     | Complete                                    |
| .NET API contract                | 🟡     | Complete                                    |
| Production prerequisites         |        | DB migration + handlers + IP feed hookup    |

## 3. bn_overpayments — Overpayment Recovery

| Concern                          | Status | Evidence                                    |
| -------------------------------- | ------ | ------------------------------------------- |
| app_modules registration         | ✅     |                                             |
| Capability registration          | ✅     | 4 base verbs                                |
| Tables                           | ✅ (base) / 🟡 (extensions) | `bn_overpayment` exists (16 cols) — additive extensions listed |
| Commands                         | 🟡     | 11 named + capability-mapped                |
| State machine                    | ✅     | 11 states                                    |
| Finance handoff                  | 🟡     | Documented; posts through Finance façade    |
| Cross-module handoffs            | 🟡     | FLOW-2 (appeal-driven recalc) certified     |
| SQL Server mapping               | 🟡     | Additive columns spec'd                     |
| .NET API contract                | 🟡     | Complete                                    |
| Production prerequisites         |        | Schema extensions + handlers + ledger integration tests |

## 4. bn_means_tests — Means-Test Assessment

| Concern                          | Status | Evidence                                    |
| -------------------------------- | ------ | ------------------------------------------- |
| app_modules registration         | ✅     |                                             |
| Capability registration          | ✅     |                                             |
| Tables                           | ⏳     | 5 tables spec'd                              |
| Commands                         | 🟡     | 11 named + capability-mapped                |
| State machine                    | ✅     | 10 states                                    |
| Cross-module handoffs            | 🟡     | FLOW-3 certified                             |
| Golden calc tests                | ⏳     | Thresholds fixtures pending                  |
| SQL Server mapping               | 🟡     |                                             |
| .NET API contract                | 🟡     |                                             |

## 5. bn_risk_management — Fraud/Error/Risk

| Concern                          | Status | Evidence                                    |
| -------------------------------- | ------ | ------------------------------------------- |
| app_modules registration         | ✅     |                                             |
| Capability registration          | ✅     |                                             |
| Tables                           | ⏳     | 5 tables spec'd                              |
| Commands                         | 🟡     | 12 named + capability-mapped                |
| State machine                    | ✅     | 12 states                                    |
| Payment hold integration         | 🟡     | Documented; commands transactional          |
| Cross-module handoffs            | 🟡     | FLOWs 4 & 6 certified                        |
| SQL Server mapping               | 🟡     |                                             |
| .NET API contract                | 🟡     |                                             |

## 6. bn_uprating — Uprating & Indexation

| Concern                          | Status | Evidence                                    |
| -------------------------------- | ------ | ------------------------------------------- |
| app_modules registration         | ✅     |                                             |
| Capability registration          | ✅     |                                             |
| Tables                           | ⏳     | 6 tables spec'd                              |
| Commands                         | 🟡     | 13 named + capability-mapped                 |
| State machine                    | ✅     | 14 states; hard APPROVE gate                 |
| Cross-module exclusions          | 🟡     | Excludes PENDING mortality; flags unresolved appeals |
| Finance reconciliation           | 🟡     | Documented                                   |
| Batch execution semantics        | ⏳     | Worker design in `DOTNET_SOLUTION_BLUEPRINT.md` |
| SQL Server mapping               | 🟡     |                                             |
| .NET API contract                | 🟡     |                                             |

---

## Cross-cutting

| Concern                          | Status | Evidence                                                             |
| -------------------------------- | ------ | -------------------------------------------------------------------- |
| Portable envelope + result       | ✅     | `src/types/bn/gap/*`                                                  |
| Command pipeline (transport-neutral) | ✅ | `src/services/bn/gap/gapCommandPipeline.ts`                            |
| Capability registry              | ✅     | `gapCapabilityRegistry.ts` — full command→capability map              |
| Contract test framework          | ✅     | `contract-tests/fixtureFramework.ts`                                  |
| Integration flow scenarios       | ✅     | 6 canonical flows in `contract-tests/integrationFlows.ts`             |
| Diagnostics                      | ✅     | `gapDiagnosticsService.ts`                                            |
| Architecture no-direct-mutation  | ✅     | `architectureNoDirectMutation.test.ts`                                |
| Modernisation pack (.NET / SQL)  | ✅     | 8 documents under `docs/modernisation/benefits-gap/`                  |
| Idempotency store                | ✅     | `bn_gap_idempotency`                                                   |
| Command log                      | ✅     | `bn_gap_command_log`                                                   |

## Deployment order recommendation

1. Appeals — complete remaining 14 handlers + workflow + comm events.
2. Overpayments — additive schema extensions + recalc handler.
3. Mortality — new schema + IP-feed hookup.
4. Means-Tests — new schema + eligibility rerun bridge.
5. Risk — new schema + payment-hold integration.
6. Uprating — new schema + batch worker.

## Known limitations

- Handlers for the 73 non-appeals commands are **contract-certified only** — schemas and handlers are the next materialisation slice.
- Diagnostics health probes for Workflow / Comm Hub / Finance / Legal / DMS currently report `unknown`; wire real probes when each module's handlers land.
- OpenAPI YAML currently documents the envelope + result. Per-command schemas will be generated from the C# `Contracts` project once .NET work begins.
