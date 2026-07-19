# BN Gap Modules — Programme Baseline

_Foundation deliverable for: Death & Mortality, Overpayment Recovery,
Appeals & Disputes, Means-Test Assessment, Fraud/Error/Risk, Uprating._

## 1. Canonical namespaces (unchanged)

| Concern            | Location                                              |
| ------------------ | ----------------------------------------------------- |
| Benefits routes    | `/bn/*`                                                |
| Benefits tables    | `bn_*`                                                 |
| Benefits services  | `src/services/bn/**`                                   |
| Benefits hooks     | `src/hooks/bn/**`                                      |
| Award 360 pipeline | `src/services/bn/awards/pilot/awardCommandPipeline.ts` |

The gap-modules foundation is additive. It introduces **no new Benefits
namespace**, **no parallel application**, and reuses every canonical
platform: Core Workflow, Communication Hub, DMS, Legal, Finance/Ledger,
IP module, BN Product & Eligibility, `app_modules`, and central audit.

## 2. New foundation surface

| Layer                      | Path                                                        |
| -------------------------- | ----------------------------------------------------------- |
| Portable envelope + result | `src/types/bn/gap/`                                          |
| Module & capability codes  | `src/types/bn/gap/moduleCodes.ts`, `gapCapabilityRegistry.ts`|
| API client interface       | `src/services/bn/gap/benefitsGapApiClient.ts`                |
| Supabase adapter           | `src/services/bn/gap/supabaseBenefitsGapAdapter.ts`          |
| Command pipeline (portable)| `src/services/bn/gap/gapCommandPipeline.ts`                  |
| Handler registry           | `src/services/bn/gap/gapHandlerRegistry.ts`                  |
| Sample proof command       | `src/services/bn/gap/pingCommand.ts`                         |
| Sample hook                | `src/hooks/bn/useBenefitsGapPing.ts`                         |
| Server boundary            | `supabase/functions/bn-gap-command/index.ts`                 |
| Docs & contracts           | `docs/bn/contracts/*`                                        |
| Tests                      | `src/__tests__/bn/gap-modules/*`                             |

## 3. Portability contract

The React UI depends on `BenefitsGapApiClient` — **never** on Supabase table
calls. Two adapters implement the same interface:

- `SupabaseBenefitsGapAdapter` (today)
- `DotNetBenefitsGapAdapter` (future ASP.NET Core Web API)

The command pipeline is transport-agnostic; the same TypeScript file is
mirrored 1:1 by a C# implementation, because it depends only on injected
stores (`ModuleRegistrationStore`, `IdempotencyStore`, `AuditWriter`, …).

See `docs/bn/contracts/data-type-mapping.md` for PostgreSQL ↔ SQL Server
type equivalence.

## 4. Module rollout matrix

Each module is independently registered in `app_modules` with these gates:

| Gate             | Default | Effect when off               |
| ---------------- | ------- | ----------------------------- |
| `is_enabled`     | `true`  | All access denied              |
| `routes_enabled` | `true`  | Route guard blocks navigation  |
| `actions_enabled`| **`false`** | Mutation dark launch — reads work; commands denied `ACTIONS_DISABLED` |
| `show_in_menu`   | `false` | Hidden from nav                |
| `rollout_state`  | `internal` | Restricted to pilot roles  |

## 5. Reusable platform surfaces (do NOT duplicate)

| Concern                | Reuse                                                   |
| ---------------------- | ------------------------------------------------------- |
| Workflow / tasks       | `core_workflow_*`, existing BN workflow runtime         |
| Communications         | Communication Hub (`sendCommunication` façade)          |
| Documents              | DMS (`core_dms_*`)                                      |
| Legal referrals        | Legal module (`lg_*`)                                   |
| Finance & ledger       | `core_ledger_*`, existing finance adapters              |
| Person / death source  | IP module (`ip_master`)                                 |
| Audit                  | `system_audit_trail` via `bnAuditService`               |
| Rollout & permissions  | `app_modules`, `role_permissions`, `core_permission_registry` |

## 6. Completion criteria (per prompt)

- [x] No direct browser mutation is introduced for gap modules
- [x] Harmless proof command `BN_GAP_PING` travels the boundary end-to-end
- [x] Capability & rollout tests pass
- [x] Existing Benefits + Award 360 tests remain green
- [x] Documentation and implementation agree
- [x] Architecture can accept a `DotNetBenefitsGapAdapter` with no page changes
