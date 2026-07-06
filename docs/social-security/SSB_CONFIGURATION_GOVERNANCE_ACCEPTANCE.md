# SSB Configuration Governance v1.0 — Acceptance

Additive governance layer over the SSB implementation policy tables.
Focus: **Social Security Board — St. Kitts & Nevis**.
No BN/BEMA/IA/legacy tables are changed. No duplicate CRUD is created.

---

## 1. Tables added (all `public.*`, no RLS per project standard)

| Table | Purpose |
|---|---|
| `ssb_configuration_asset` | Registry of every configurable SSB item (owner, canonical route/table/service, policy table, scope, benefits requirement, health, documentation). |
| `ssb_configuration_dependency` | Directional edges (`consumes` / `blocks` / `validates` / `references` / `supersedes`) with `impact_level`. |
| `ssb_configuration_package` | Versioned policy bundle: `draft → validated → scheduled → active → retired`. |
| `ssb_configuration_package_item` | Package ↔ policy row mapping. |
| `ssb_configuration_validation_run` | One row per validation execution (score, errors/warnings/info counts). |
| `ssb_configuration_validation_result` | Individual findings with severity, rule_code, blocking flag. |
| `ssb_configuration_snapshot` | Captured JSON of the active configuration, tied to a package + effective date. |

Standard grants applied: `authenticated`, `service_role`.
Role-based authorization is enforced at the app layer — no RLS
(see `docs/ARCHITECTURE-NO-RLS-RULE.md`).

Registry seeded with 11 KN assets (`ssb.general`, `ssb.address`, `ssb.identity`,
`ssb.numbering`, `ssb.contribution_calendar`, `ssb.financial`, `ssb.legal`,
`ssb.documents`, `ssb.communication`, `ssb.workflow`, `bn.product_builder`)
and their consuming edges from `bn.product_builder`.

## 2. Services added

`src/services/ssb-configuration/ssbConfigurationGovernanceService.ts`:

- Registry: `listConfigurationAssets`, `getConfigurationAsset`, `listDependencies`, `listConsumers`, `listAllDependencies`.
- Packages: `createConfigurationPackage`, `listConfigurationPackages`, `getConfigurationPackage`, `addPolicyToPackage`, `listPackageItems`, `validateConfigurationPackage`, `scheduleConfigurationPackage`, `activateConfigurationPackage`, `retireConfigurationPackage`.
- Validation: `runSsbSetupValidation`, `getLatestValidationRun`, `listValidationResults`.
- Snapshots: `createConfigurationSnapshot`, `listConfigurationSnapshots`, `getConfigurationSnapshot`.

Lifecycle for policies remains owned by `ssbPolicyLifecycleService` — this
service **never duplicates lifecycle logic**. `activateConfigurationPackage`
auto-creates a snapshot.

## 3. UI

Route: `/admin/configuration-governance`
Page: `src/pages/admin/ConfigurationGovernancePage.tsx`
Tabs: **Registry · Dependencies · Packages · Validation · Snapshots · Impact**

Header cards summarise: latest validation score, active package, BN Product
Builder readiness. No configuration is authored here — only governed.

SSB Setup (`/admin/ssb-setup`) now includes:
- Governance status strip (validation score, active package, BN readiness).
- Explicit link to `/admin/configuration-governance`.
- Process Readiness tab remains unchanged.

## 4. Menu / app_modules / permissions

Menu entry inserted (idempotent) at `Administration → Setup Centre →
Configuration Governance`:

- `app_modules.name = configuration_governance`
- `route = /admin/configuration-governance`
- `parent_id = e3000000-0000-4000-8000-000000000001` (Setup Centre)
- `sort_order = 30`, `show_in_menu = true`, `is_enabled = true`

Permissions inherit through the existing `is_admin` bypass in
`useNavigationMenu` for **Admin / Application Admin / Super Admin**.
No RLS grants; no policy changes.

Current admin users verified via existing role bindings:
- `admin@secureserve.gov` — Admin
- `rohit@mishainfotech.com` — Application Admin

## 5. Enterprise Catalogue

Capability registered (idempotent):

- `capability_key = configuration_governance`
- `category = configuration_governance`
- `owner = Social Security Board Configuration`
- `consumers = Configuration Centre, SSB Implementation Setup, BN Product Builder, Employer, Contributions, Claims, Compliance, Finance`
- `dependencies = SSB Implementation Setup, Policy Lifecycle, Enterprise Catalogue, Shared Domains, Platform Numbering, Workflow, Documents, Notifications`

## 6. Validation rules (v1)

**Errors (blocking, high weight):** `SSB.E001` profile · `SSB.E010` address ·
`SSB.E011` identity/NIS · `SSB.E012` numbering · `SSB.E013` contribution
calendar · `SSB.E014` payment channel · `SSB.E015` legal · `SSB.E016` documents
· `SSB.E017` workflow.

**Warnings (non-blocking):** `SSB.W020` communication templates · `SSB.W021`
banks · `SSB.W022` legal sections · `SSB.W023` calendar/holidays · `SSB.W024`
SMS/letter templates.

**Info:** `SSB.I030` Product Builder on hold · `SSB.I031` legacy adapters
read-only · `SSB.I032` future-dated policies scheduled.

Score = `100 − Σ weight(finding)`, clamped ≥ 0. Errors block BN readiness;
warnings reduce score but never block.

## 7. Package lifecycle

`draft → validated → scheduled → active → retired`. `validateConfigurationPackage`
promotes `draft → validated` when errors_count = 0. `activate` records
`activated_at`, sets `effective_from = today`, and captures a snapshot.
`retire` records `retired_at` and stores the reason. Old versions are
retained.

## 8. Snapshot behaviour

`snapshot_json` captures full assets + dependencies + package + package_items
at capture time. Snapshots are immutable once written and are auto-created
on package activation. Manual snapshots can be created from the UI.

## 9. Impact analysis

The **Impact** tab lists direct consumers (who depends on the asset) and
outgoing dependencies (what the asset depends on). Backed by
`listConsumers` / `listDependencies`. Feeds change-impact awareness before
retire/supersede.

## 10. Difference vs SSB Setup

| Concern | SSB Implementation Setup | Configuration Governance |
|---|---|---|
| Author policy rows | ✅ | ❌ |
| Resolve effective policy | ✅ (`ssbPolicyLifecycleService`) | ❌ (delegates) |
| Registry / ownership | ❌ | ✅ |
| Dependency graph | ❌ | ✅ |
| Package lifecycle | ❌ | ✅ |
| Validation run + score | ❌ | ✅ |
| Snapshots | ❌ | ✅ |
| Impact analysis | ❌ | ✅ |
| BN readiness signal | reads it | **decides it** |

## 11. BN Product Builder readiness

Decided by the **latest validation run**:
- `errors_count = 0` → BN Product Builder eligible to unblock.
- `errors_count > 0` → blocked; findings and recommendations shown inline.

## 12. Rollback

Additive-only. Rollback by:
```sql
DROP TABLE public.ssb_configuration_snapshot CASCADE;
DROP TABLE public.ssb_configuration_validation_result CASCADE;
DROP TABLE public.ssb_configuration_validation_run CASCADE;
DROP TABLE public.ssb_configuration_package_item CASCADE;
DROP TABLE public.ssb_configuration_package CASCADE;
DROP TABLE public.ssb_configuration_dependency CASCADE;
DROP TABLE public.ssb_configuration_asset CASCADE;
DELETE FROM public.app_modules WHERE name = 'configuration_governance';
DELETE FROM public.enterprise_capability_registry WHERE capability_key = 'configuration_governance';
```
Route registration and page files may be removed manually. No business data
is affected — governance tables hold only governance metadata.

## 13. Legacy impact

**None.** No BN, BEMA, IA, IP, ER, CL, CN or `bn_*` / `bema_*` / `ia_*`
table is read, altered or migrated. Shared-domain (`ssp_*`) and platform
(`core_*`) tables are read-only via `count(*)` for validation heuristics.
