# Platform Public Contract — v1.0

**Status:** FROZEN
**Date:** 2026-07-06
**Owner:** Enterprise Platform Team

## 1. Architecture

The SSB Platform exposes exactly **one** public interface for business
modules to read platform configuration:

```
Business Modules (Benefits, Claims, Contributions, Employer, Member,
                  Payments, Compliance)
                         │
                         ▼
       ┌─────────────────────────────────────┐
       │  PlatformConfigurationService       │  ← public façade (this contract)
       │  src/services/platform/…            │
       └─────────────────────────────────────┘
                         │ delegates to
                         ▼
       ┌─────────────────────────────────────┐
       │  Business Process Resolver          │  ← internal
       │  ssbBusinessProcessConfigService    │
       └─────────────────────────────────────┘
                         │ delegates to
                         ▼
  Policy Lifecycle · Configuration Asset Framework ·
  Configuration Governance · Platform Readiness ·
  Enterprise Consumption Registry
```

No new runtime engine was created. The Business Process Resolver is
retained as the internal implementation; the façade is the contract.

## 2. Public API

Module: `src/services/platform/platformConfigurationService.ts`

| Function                                    | Purpose                                        |
| ------------------------------------------- | ---------------------------------------------- |
| `resolveProcessConfiguration(code)`         | Fetch a process configuration as-of today      |
| `resolveProcessConfigurationAtDate(c,d)`    | Fetch a process configuration as-of a date     |
| `resolveModuleConfiguration(module)`        | Fetch every process a business module needs    |
| `validateProcessConfiguration(code)`        | Validation status + missing / warning labels   |
| `getConfigurationSummary(code)`             | Compact readiness summary                      |
| `listAllProcessSummaries()`                 | Summary of every registered process            |

### Typed contracts

- `ResolvedProcessConfiguration`
- `ResolvedModuleConfiguration`
- `ResolvedIdentityConfiguration`
- `ResolvedWorkflowConfiguration`
- `ResolvedFinancialConfiguration`
- `ResolvedDocumentConfiguration`
- `ResolvedCommunicationConfiguration`
- `ResolvedCalendarConfiguration`
- `ResolvedNumberingConfiguration`
- `ResolvedValidationConfiguration`

Each interface is a thin wrapper over resolver output — resolvers remain
the single source of truth.

### Stable codes

- `PlatformProcessCode` — `member_registration | employer_registration |
  contribution_collection | benefit_administration | claims_processing |
  payments | compliance_case_management`
- `PlatformModuleCode` — `benefits | claims | contributions | employer |
  member | payments | compliance`

## 3. Internal services reused (not public)

| Internal service                              | Owned surface                          |
| --------------------------------------------- | -------------------------------------- |
| `ssbBusinessProcessConfigService`             | Process resolution                     |
| `ssbPolicyLifecycleService`                   | Policy resolution as-of date           |
| `ssbPolicyRegistry`                           | Policy table → slot mapping            |
| `enterpriseConfigurationAssetService`         | Asset descriptors, readiness derivation|
| `ssbConfigurationGovernanceService`           | Validation runs, packages, snapshots   |
| `enterpriseConsumptionRegistryService`        | Ownership + consumer contract          |
| `platformReadinessService`                    | Aggregate P0/P1 readiness              |

## 4. Business module rules

Business modules **MUST**:

1. Import only from `@/services/platform/platformConfigurationService`.
2. Store the stable codes / ids returned by the façade — never display
   labels.
3. Deep-link users into `/admin/ssb-setup?section=<key>` or
   `/admin/configuration-governance` when configuration is missing.
4. Treat `validateProcessConfiguration(...)` as the authoritative
   activation gate for the module's process(es).

Business modules **MUST NOT**:

- Read `ssb_*_policy` tables.
- Read shared-domain tables (`ssp_*`, `core_*`).
- Read lifecycle, governance, readiness, or asset descriptor tables.
- Import `ssbPolicyLifecycleService`, `ssbPolicyRegistry`,
  `ssbConfigurationGovernanceService`,
  `enterpriseConfigurationAssetService`,
  `enterpriseConsumptionRegistryService`, or
  `ssbBusinessProcessConfigService` directly.
- Duplicate any admin, setup, or governance screen.
- Write to any table outside their own module namespace.

## 5. Forbidden direct reads

| Layer                     | Forbidden imports from business modules                     |
| ------------------------- | ----------------------------------------------------------- |
| Policy tables             | `ssb_*_policy`, `ssb_*_policy_*`                            |
| Shared-domain tables      | `ssp_*`, `core_*`, `public_holidays`, `ssb_process_catalogue` |
| Lifecycle service         | `@/services/ssb/ssbPolicyLifecycleService`                  |
| Policy registry           | `@/services/ssb/ssbPolicyRegistry`                          |
| Governance service        | `@/services/ssb-configuration/ssbConfigurationGovernanceService` |
| Asset framework           | `@/services/enterprise/enterpriseConfigurationAssetService` |
| Consumption registry      | `@/services/enterprise/enterpriseConsumptionRegistryService`|
| Business process resolver | `@/services/ssb-configuration/ssbBusinessProcessConfigService` |

Any of these imports from a business-module folder is a **P0 violation**
and must be flagged by the Enterprise Consumption Registry.

## 6. Future module onboarding

To onboard a new business module:

1. Register the module in `MODULE_PROCESS_MAP` inside
   `platformConfigurationService.ts` (façade update only — no new
   resolver, no new tables).
2. If a genuinely new process is needed, add it to the Business Process
   Resolver and the Policy Registry — never to the façade.
3. Publish acceptance under `docs/enterprise/` referencing this contract.

No new administration screens, no new runtime engines, no new resolver
copies.

## 7. Freeze decision

The Platform Public Contract v1.0 is **FROZEN** as of the Platform v1.0
Freeze Contract (see
`docs/social-security/SSB_PLATFORM_V1_FREEZE_CONTRACT.md`).

Breaking changes require:

- Additive migration under `supabase/migrations/`.
- Façade-signature review — return shapes are part of the contract.
- Updated acceptance under `docs/enterprise/`.
- At least one release of deprecation lead time for consumers.
