# Enterprise Consumption Registry — Acceptance

Route: `/admin/enterprise-consumption-registry`
Menu: Administration → Setup Centre → Enterprise Consumption Registry (surfaced via Configuration Centre card).
Focus: **Social Security Board — St. Kitts & Nevis** · pre-freeze contract for SSB Platform v1.0.

## Purpose
One ownership and consumption contract for every enterprise entity so that:

- Every entity has a single canonical owner (route, table, service).
- Every consumer is registered with a relationship type and enforcement level.
- Duplicate masters, duplicate shared-domain records, and direct legacy reads are surfaced as violations.
- BN Product Builder Wave 1 has an explicit list of BN-owned entities vs platform-owned entities it must consume via approved resolvers.

No CRUD is duplicated. No BN/BEMA/IA/legacy tables are changed. The registry is additive.

## Schema

Three additive tables (RLS not enabled — role-based grants only, per project rule):

- `enterprise_consumption_registry` — entities (masters, shared domain, policies, processes, module entities, legacy, external).
- `enterprise_consumption_edge` — relationships (CONSUMES, OWNS, MAPS_TO, ADAPTS_TO, VALIDATES, BLOCKS, PRODUCES).
- `enterprise_consumption_violation` — detected violations (DUPLICATE_OWNER, DIRECT_TABLE_READ, HARDCODED_REFERENCE, LEGACY_BYPASS, UNMAPPED_LEGACY, UNKNOWN_OWNER) with P0/P1/P2 severity and OPEN/DEFERRED/RESOLVED status.

Grants: `authenticated` has full CRUD on all three; `service_role` has ALL.

## Seed ownership map

Layers seeded (see migration):

- **Enterprise Masters** — Country, District, Postal District, Village, Relation, Dependent Relation, Marital Status, Occupation, Industry, Sector, Activity Type, Bank Code, Method of Payment, Payment Type/Source, Merchant, Payer Type, Income Category/Code, Pay Period, SSC Rate, Penalty Rate, Verification Type, Invoice/Receipt Status, Legal Status.
- **Shared Domain / Engine** — Geography (country/profile, admin level, area), Identity (type, validation pattern), Financial (currency, bank, branch, payment channel, settlement method, account type), Legal Reference, Document Type/Profile, Communication Channel, Notification Template, Workflow Definition, Number Sequence, Participant Role, Relationship Type.
- **SSB Policies** — Address, Identity, Numbering, Contribution Calendar, Financial, Legal, Document, Communication, Workflow.
- **Business Processes** — Member/Employer Registration, Contribution Collection, Benefit Administration, Claims Processing, Payments, Compliance Case Management.
- **Business Module Entities** — BN Product Builder plus Benefit Type / Product / Eligibility Rule / Formula Rule / Rate Table / Product Version.
- **Legacy / Adapter** — `tb_bank_code`, `tb_method_of_payment`, `bank_code`, `method_of_payment` (all adapters or legacy read-only; mapped through `finance_master_crosswalk`).

Consumption edges are pre-seeded so:

- Policies consume shared-domain entities (REQUIRED).
- Processes consume policies (REQUIRED).
- BN Product Builder consumes processes only (REQUIRED) and owns its own module entities.
- Legacy adapters MAP_TO / ADAPT_TO their canonical Enterprise Master.

## Ownership rules

1. Every entity MUST have exactly one active canonical owner. Additional entries for the same `canonical_table` must be `ADAPTER` or `LEGACY_READONLY`.
2. Business modules MUST NOT register themselves as owners of shared-domain or enterprise-master entities.
3. Legacy tables MUST NOT be promoted to `ACTIVE` — they remain `ADAPTER`/`LEGACY_READONLY` and route through the crosswalk.

## Consumption rules

1. Business modules read platform configuration only through approved resolvers or canonical routes registered as `CONSUMES` edges with `enforcement_level=REQUIRED`.
2. Any direct read of a platform-owned table from a business module is a `DIRECT_TABLE_READ` violation.
3. Hardcoded references to codes owned by an Enterprise Master are `HARDCODED_REFERENCE` violations.
4. Legacy adapters that bypass the crosswalk are `LEGACY_BYPASS` violations.

## Violation types

| Type | Severity default | Meaning |
| --- | --- | --- |
| DUPLICATE_OWNER | P0 | Two or more `ACTIVE` entities own the same canonical table. |
| DIRECT_TABLE_READ | P0/P1 | Module reads a platform-owned table instead of using its resolver. |
| HARDCODED_REFERENCE | P1 | Code owned by an Enterprise Master is inlined in module source. |
| LEGACY_BYPASS | P1 | Legacy adapter used without crosswalk mapping. |
| UNMAPPED_LEGACY | P1 | Legacy rows exist without a `finance_master_crosswalk` mapping. |
| UNKNOWN_OWNER | P1 | Registry entry missing `owner_layer`. |

Runtime detection (`detectConsumptionViolations`) currently covers:

- Unmapped legacy finance rows (`tb_bank_code`, `tb_method_of_payment`) against `finance_master_crosswalk`.
- Duplicate active canonical owners for the same table.
- Registry entries with no owner.

Static source-scan checks (DIRECT_TABLE_READ, HARDCODED_REFERENCE from module source) are documented here and should be enforced by CI grep rules — they are intentionally out of scope for runtime and do not fail the build.

## BN Wave 1 gate

BN Product Builder Wave 1 is BLOCKED when any of these are true:

1. One or more open `P0` consumption violations exist.
2. BN Product Builder directly consumes a platform-owned entity instead of a registered `PROCESS`-level resolver.
3. Finance/payment master duplication has an unresolved P0 source-of-truth issue.

The `getBnConsumptionReadiness()` service returns `READY | READY_WITH_WARNINGS | BLOCKED` with the exact reasons. The Platform Readiness Centre folds these findings into the `source_control_refs` category and its BN Wave 1 gate.

## Legacy crosswalk handling

The Legacy Crosswalks tab is read-only. Mapping rows continue to live in `finance_master_crosswalk` and are authored via the existing bank code / methods-of-payment master screens. Unmapped rows raise `UNMAPPED_LEGACY` findings — recommended fix is either to add the crosswalk row or to seed the corresponding row in `ssp_bank` / `ssp_payment_channel`.

## No duplicate CRUD confirmation

The Enterprise Consumption Registry page is a read-only ownership cockpit plus a lightweight upsert API for registering entities and edges. It does not author policies, does not edit `workflow_definitions`, and does not create numbering sequences, banks, payment channels or templates. All authoring stays in the canonical screens.

## No legacy impact

Zero reads/writes against BN/BEMA/IA legacy tables (`bn_*`, `bema_*`, `ia_*`, `ip_*`, `er_*`, `cl_*`, `cn_*`). Only:

- New tables `enterprise_consumption_registry`, `enterprise_consumption_edge`, `enterprise_consumption_violation`.
- Read-only access to `finance_master_crosswalk`, `tb_bank_code`, `tb_method_of_payment` for detection.

## Integration points

- `Configuration Centre` — Platform section now includes an Enterprise Consumption Registry card.
- `Configuration Governance` — BN Product Builder card now links to both Platform Readiness and the Consumption Registry.
- `Platform Readiness Centre` — open consumption violations (severity P0/P1/P2) are folded into findings and drive the BN Wave 1 blocking gate.

## Rollback

```sql
DROP TABLE IF EXISTS public.enterprise_consumption_violation;
DROP TABLE IF EXISTS public.enterprise_consumption_edge;
DROP TABLE IF EXISTS public.enterprise_consumption_registry;
DROP FUNCTION IF EXISTS public.ecr_touch_updated_at();
```

Remove the route registration and lazy import in `src/components/routing/AppRoutes.tsx`, delete:

- `src/pages/admin/EnterpriseConsumptionRegistryPage.tsx`
- `src/services/enterprise/enterpriseConsumptionRegistryService.ts`

Revert the small edits in `ConfigurationCentre.tsx`, `ConfigurationGovernancePage.tsx` and `platformReadinessService.ts`.

## Acceptance checklist

- [x] `/admin/enterprise-consumption-registry` opens with Entities / Ownership / Consumers / Violations / BN Readiness / Legacy Crosswalks tabs.
- [x] Entities and consumers are visible.
- [x] Ownership model is seeded across all six layers.
- [x] BN Readiness tab lists BN-owned vs platform-owned required entities.
- [x] Platform Readiness includes open P0 consumption violations in its BN Wave 1 gate.
- [x] No duplicate CRUD created.
- [x] No BN/BEMA/IA/legacy tables changed.
- [x] Typecheck passes.
