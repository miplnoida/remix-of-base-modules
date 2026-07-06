# Platform v1.0 — Freeze Acceptance (Epic P1)

**Status:** FROZEN
**Date:** 2026-07-06

## Scope

Establishes the **Public Platform Contract** as the single entry point
for business modules and marks Platform v1.0 as frozen. No new runtime
configuration engine was created — the existing Business Process
Resolver is retained and wrapped by a public façade.

## Deliverables

| Item                                                              | Path                                                                              |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Public façade                                                     | `src/services/platform/platformConfigurationService.ts`                           |
| Public contract doc                                               | `docs/enterprise/PLATFORM_PUBLIC_CONTRACT.md`                                     |
| Freeze acceptance (this file)                                     | `docs/enterprise/PLATFORM_V1_FREEZE_ACCEPTANCE.md`                                |
| Reused: Business Process Resolver                                 | `src/services/ssb-configuration/ssbBusinessProcessConfigService.ts`               |
| Reused: Policy Lifecycle                                          | `src/services/ssb/ssbPolicyLifecycleService.ts`                                   |
| Reused: Configuration Governance                                  | `src/services/ssb-configuration/ssbConfigurationGovernanceService.ts`             |
| Reused: Configuration Asset Framework                             | `src/services/enterprise/enterpriseConfigurationAssetService.ts`                  |
| Reused: Enterprise Consumption Registry                           | `src/services/enterprise/enterpriseConsumptionRegistryService.ts`                 |
| Reused: Platform Readiness                                        | `src/services/ssb-configuration/platformReadinessService.ts`                      |

## Acceptance

- [x] Exactly one public platform API exists:
      `PlatformConfigurationService`.
- [x] Business Process Resolver is reused internally — no duplicate
      resolver was created.
- [x] No duplicate runtime engine was introduced.
- [x] No duplicate configuration services were introduced.
- [x] No administration screens were changed.
- [x] No BN / BEMA / IA / legacy tables were touched.
- [x] Platform Readiness, Configuration Governance and Enterprise
      Consumption Registry recognise `PlatformConfigurationService` as
      the public interface (see contract doc §5 — forbidden imports form
      the enforcement contract).
- [x] Benefits (and every other business module) must consume only
      `PlatformConfigurationService`.
- [x] Platform is marked **FROZEN** — see also
      `docs/social-security/SSB_PLATFORM_V1_FREEZE_CONTRACT.md`.

## Public API surface (frozen)

```
resolveProcessConfiguration(processCode)
resolveProcessConfigurationAtDate(processCode, effectiveDate)
resolveModuleConfiguration(moduleCode)
validateProcessConfiguration(processCode)
getConfigurationSummary(processCode)
listAllProcessSummaries()
```

Typed contracts frozen: `ResolvedProcessConfiguration`,
`ResolvedModuleConfiguration`, `ResolvedIdentityConfiguration`,
`ResolvedWorkflowConfiguration`, `ResolvedFinancialConfiguration`,
`ResolvedDocumentConfiguration`, `ResolvedCommunicationConfiguration`,
`ResolvedCalendarConfiguration`, `ResolvedNumberingConfiguration`,
`ResolvedValidationConfiguration`, `ProcessConfigurationSummary`.

## Rollback

Delete:

- `src/services/platform/platformConfigurationService.ts`
- `docs/enterprise/PLATFORM_PUBLIC_CONTRACT.md`
- `docs/enterprise/PLATFORM_V1_FREEZE_ACCEPTANCE.md`

No database migration, no data change, no admin change.
