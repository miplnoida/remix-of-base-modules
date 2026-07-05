# Epic 1.1 — Enterprise Reference Framework

**Status:** Design & Discovery (documentation only)
**Phase:** 1 — First implementation epic after Enterprise Architecture phase (0.35 → 0.36C)
**Predecessors:** 0.36A, 0.36A.1, 0.36A.2, 0.36B, 0.36C
**Successor:** Epic 1.1.1 — Framework Hardening & Adoption Wave 1
**BN Product Builder:** Remains ON HOLD (Epic 0.40)

---

## 1. Purpose

Establish **one** reusable Enterprise Reference Framework that every current and
future Misha Infotech enterprise product (Social Security, HRMS, DMS/EDRMS,
Prison Management, Licensing, Budgeting, Payroll, Asset Management, Compliance,
Finance, and future government platforms) uses for reference / lookup / master
data of the "code + label + metadata" family.

This epic delivers **the framework only** — not any specific reference master.
Country, Bank, Legal Reference, Payment Channel, Participant Types, Currencies,
Reason Codes, Status Codes, Occupation Types, Medical Codes, Document Types,
etc. are **future consumers** delivered in later epics.

## 2. Non-Goals

- No Country Pack, Banks, Legal Reference, Payment Channels, Participant Types.
- No Products, Configurations, Formulas.
- No BN Product Builder work.
- No big-bang migration of existing tb_* / bn_* reference tables.
- No parallel/duplicate lookup engine.

---

## 3. Step 1 — Discovery (repository inspection)

### 3.1 Existing reusable reference substrate (KEEP & EXTEND)

| Asset | Location | Reuse verdict |
|---|---|---|
| `core_reference_group` (table) | `supabase/migrations/*` | **Reuse as Reference Category/Type root.** Already carries `group_code`, `group_name`, `module_code`, `is_system`, `is_active`. |
| `core_reference_value` (table) | `supabase/migrations/*` | **Reuse as Reference Item.** Already carries `value_code`, `value_label`, `description`, `sort_order`, `is_default`, `is_system`, `is_active`, `status`, `effective_from`, `effective_to`, `metadata_json`, `module_code`. |
| `coreReferenceDataService.ts` | `src/services/core/` | **Reuse as the single service surface.** All modules already import from here; BN/Legal/Compliance aliases exist. |
| `core_legal_reference*` | migrations | Domain-specific master — **NOT** the framework. Will become a consumer of the framework via a thin bridge (Epic later). |
| `core_reference_data` legacy views | migrations | Wrap-only; do not extend. |

### 3.2 Legacy / module-owned reference tables (CONSUMERS — do not touch here)

- `tb_legal_status`, `tb_*` — legacy shared lookups.
- `bn_*` reference tables (rate table type, participant type, etc.) — many already dual-registered as `BN_*` groups inside `core_reference_group`.
- `lg_matter_type`, `lg_court*`, `lg_case_action_catalog`, `lg_case_intake_source`, etc. — domain masters, not generic reference items.
- `ce_*` compliance masters.
- Country / bank / currency data currently owned by BN.

These are **future consumers** and are addressed by Epics 0.36D / 0.37 / 0.38 / 0.39, not this epic.

### 3.3 Existing reusable UI / audit / component surface (KEEP)

| Concern | Existing asset | Reuse |
|---|---|---|
| Standard table | `src/components/common/DataTable.tsx` | Yes |
| Standard modal / entity form | `src/components/common/EntityModal.tsx`, `StandardModal.tsx` | Yes |
| Page shell / header | `PageShell`, `PageHeader` (common + shared) | Yes |
| Search / filter | `StandardSearchFilterBar`, `QueryByFilter` | Yes |
| Column visibility | `ColumnSelector` | Yes |
| Bulk upload | `BulkUploadModal` | Yes |
| Export | `ExportDropdown`, `ExportButton` | Yes |
| Status display | `StatusBadge` | Yes |
| Auto code | `AutoCodeField`, `src/config/autoCodeRegistry.ts` | Yes |
| Audit columns | `created_by`, `created_at`, `updated_by`, `updated_at` on `core_reference_*` already | Yes |
| Effective dating | `effective_from` / `effective_to` on `core_reference_value` already | Yes |
| Activation | `is_active` on both tables | Yes |
| Metadata bag | `metadata_json jsonb` on `core_reference_value` | Yes |
| Scope precedence resolver | `src/lib/configuration/resolver.ts` | Reuse pattern (not code) for scoped overrides later |

### 3.4 Gaps in current substrate (framework must add)

The following capabilities are **not yet present** on `core_reference_group` / `core_reference_value`, or are inconsistent, and must be added by this epic (spec only — implementation lands in Epic 1.1.1):

1. **Reference Category** layer above Group (e.g. `GEOGRAPHY`, `FINANCE`, `PARTY`, `CLINICAL`, `LEGAL`, `WORKFLOW`) — currently only `module_code` grouping.
2. **Hierarchy** — parent/child within a group (country → state → city; ledger → account tree; ISCO occupation tree). No `parent_value_id` yet.
3. **Explicit versioning** — `version_number`, `supersedes_id`, `status ∈ {DRAFT, ACTIVE, SUPERSEDED, RETIRED}`. Today only `status` text and `effective_from/to` exist.
4. **Localization** — labels/descriptions in multiple locales. No `core_reference_value_i18n` yet.
5. **Soft delete** — `deleted_at`, `deleted_by` (today only `is_active`).
6. **Governance attributes** — `ownership_module_code`, `is_platform_owned`, `is_org_overridable`, `is_country_scoped`, `country_code`, `organization_id`.
7. **Typed metadata schema** — optional JSON Schema reference per group, so consumers can trust the shape of `metadata_json`.
8. **External code mapping** — sibling table for ISO / SNOMED / ISCO / SWIFT / internal legacy code cross-walks.
9. **Aliases / synonyms** — for search and import matching.
10. **Change log / approval trail** — leverage existing audit-communication + workflow patterns; do not build a parallel engine.

---

## 4. Step 2 — Design (framework, not a master)

### 4.1 Conceptual model

```text
ReferenceCategory        (e.g. GEOGRAPHY, FINANCE, PARTY, CLINICAL, LEGAL)
   └── ReferenceGroup    (e.g. COUNTRY, CURRENCY, BANK, OCCUPATION, ID_TYPE)
          └── ReferenceItem     (e.g. KN, USD, RBTT, ISCO-2411, NATIONAL_ID)
                 ├── ReferenceItemHierarchy    (parent_item_id, path, depth)
                 ├── ReferenceItemVersion      (version_number, status, supersedes_id, effective_from/to)
                 ├── ReferenceItemLocale       (locale, label, description)
                 ├── ReferenceItemAlias        (alias, alias_kind)
                 ├── ReferenceItemExternalCode (system, external_code)  -- ISO, SNOMED, SWIFT, etc.
                 └── metadata_json             (validated against group.schema_ref)
```

All layers extend the existing `core_reference_group` / `core_reference_value` — nothing new replaces them.

### 4.2 Core capabilities

| Capability | Design |
|---|---|
| Categories | Add `core_reference_category` (code, name, description, sort_order, is_system). Add `category_code` FK on `core_reference_group`. |
| Types (Groups) | Keep `core_reference_group`. Add `category_code`, `ownership_module_code`, `is_platform_owned`, `is_org_overridable`, `is_country_scoped`, `schema_ref`, `hierarchy_enabled`, `versioning_enabled`, `localization_enabled`. |
| Items (Values) | Keep `core_reference_value`. Add `parent_value_id`, `path`, `depth`, `version_number`, `supersedes_id`, `country_code`, `organization_id`, `deleted_at`, `deleted_by`. |
| Hierarchies | Materialized `path` (`ltree`-style string) + adjacency list. Cycle guard trigger. |
| Effective dating | Already present. Add `resolve_effective(value_code, at_date)` SQL helper. |
| Activation | Keep `is_active`. |
| Versioning | New sibling `core_reference_value_version` OR row-level via `supersedes_id`. Prefer row-level for simplicity (matches `core_legal_reference` pattern already in repo). |
| Status lifecycle | `DRAFT → ACTIVE → SUPERSEDED → RETIRED` enum; enforced by trigger + workflow policy. |
| Localization | New `core_reference_value_i18n(value_id, locale, label, description)`. Read-path resolves locale with graceful fallback to base. |
| Metadata | `metadata_json` typed via `schema_ref` (JSON Schema id in a registry). Validation is service-side, not DB-side (portable to non-Postgres backends). |
| Audit | Reuse existing `created_by/at`, `updated_by/at`; add `deleted_by/at`; emit change events into existing audit-communication pipeline. |
| Soft delete | `deleted_at IS NULL` predicate on every read; hard delete only for `is_system=false` items with no consumers. |
| Governance | `ownership_module_code`, `is_platform_owned`, `is_org_overridable` — enforced by service, not by DB alone. |
| Scope / overrides | Org- and country-level overrides read through the same **scope precedence** pattern already implemented in `src/lib/configuration/resolver.ts`. |
| External codes | `core_reference_value_external_code(value_id, system, external_code, is_primary)`. |
| Aliases | `core_reference_value_alias(value_id, alias, alias_kind)` for search + bulk import matching. |

### 4.3 Service surface (single entry point)

Extend `src/services/core/coreReferenceDataService.ts` with a **capabilities API** (spec only — no code in this epic):

- `listCategories()`
- `listGroups({ categoryCode?, moduleCode?, ownershipModuleCode? })`
- `getGroup(groupCode)`
- `listItems(groupCode, { at?, locale?, countryCode?, organizationId?, includeInactive?, parentValueId? })`
- `getItem(groupCode, valueCode, { at?, locale? })`
- `resolveHierarchy(groupCode, { rootValueCode?, depth? })`
- `createItem(groupCode, payload, { userCode })`
- `updateItem(valueId, patch, { userCode })`
- `retireItem(valueId, { userCode, reason })`
- `newVersion(valueId, patch, { userCode })`
- `translate(valueId, locale, { label, description }, { userCode })`
- `addExternalCode(valueId, { system, code, isPrimary? })`
- `addAlias(valueId, { alias, aliasKind })`

All existing consumers (`useReferenceValues(groupCode)`, BN aliases, LG groups) continue to work unchanged.

### 4.4 UI surface (reuse existing components)

A single **Reference Framework Admin** screen family (spec only — built in Epic 1.1.1):

- `PageShell` + `PageHeader`
- `StandardSearchFilterBar` (filters: Category, Group, Module, Status, Country, Active)
- `DataTable` with `ColumnSelector`
- `EntityModal` for create/edit
- `BulkUploadModal` for import
- `ExportDropdown` for export
- `StatusBadge` for lifecycle
- `AutoCodeField` for `value_code`
- Tree view (new small component, reuses `DataTable` row expansion) for hierarchies

No new UI framework is introduced.

---

## 5. Step 3 — Validation against future products

The framework is validated by walking through each planned consumer and confirming zero gaps:

| Future consumer | Group | Uses hierarchy | Uses versioning | Uses locale | Uses external codes | Country-scoped | Framework covers? |
|---|---|---|---|---|---|---|---|
| Country | `COUNTRY` | Yes (country → subdivision) | Yes | Yes | Yes (ISO-3166) | — | ✅ |
| Bank | `BANK` | No | Yes | Yes | Yes (SWIFT/BIC) | Yes | ✅ |
| Legal Reference | `LEGAL_REFERENCE` (bridge) | Yes (act → section) | Yes | Yes | Optional | Yes | ✅ (bridged) |
| Payment Channel | `PAYMENT_CHANNEL` | No | Yes | Yes | Optional | Yes | ✅ |
| Employer Types | `EMPLOYER_TYPE` | Yes | Yes | Yes | Optional | Yes | ✅ |
| Person Types | `PERSON_TYPE` | Yes | Yes | Yes | — | — | ✅ |
| Relationship Types | `RELATIONSHIP_TYPE` | No | Yes | Yes | — | — | ✅ |
| Reason Codes | `REASON_CODE` per domain | No | Yes | Yes | — | — | ✅ |
| Status Codes | `STATUS_CODE` per domain | No | Yes | Yes | — | — | ✅ |
| Currencies | `CURRENCY` | No | Yes | Yes | Yes (ISO-4217) | — | ✅ |
| Holiday Types | `HOLIDAY_TYPE` | No | Yes | Yes | — | Yes | ✅ |
| Occupation Types | `OCCUPATION` | Yes (ISCO tree) | Yes | Yes | Yes (ISCO) | Optional | ✅ |
| Disability Types | `DISABILITY_TYPE` | Yes | Yes | Yes | Optional | — | ✅ |
| Medical Codes | `MEDICAL_CODE` per system | Yes | Yes | Yes | Yes (ICD/SNOMED) | — | ✅ |
| Claim Types | `CLAIM_TYPE` | Yes | Yes | Yes | — | Yes | ✅ |
| Document Types | `DOCUMENT_TYPE` | Yes | Yes | Yes | — | Yes | ✅ |

No product requires a capability the framework does not offer.

---

## 6. Step 4 — Implementation plan

### 6.1 Repository impact (surface only; code lands in Epic 1.1.1)

| Layer | Impact | Notes |
|---|---|---|
| Migrations | Additive: new `core_reference_category` table; ALTERs on `core_reference_group` / `core_reference_value`; new `core_reference_value_i18n`, `_external_code`, `_alias` tables; GRANTs. | Strictly additive. No column drops. No renames. |
| Services | Extend `coreReferenceDataService.ts` only. | No new parallel service. |
| Hooks | New `useReferenceCategories`, `useReferenceItemsHierarchy`, `useReferenceItemLocale`. Keep `useReferenceValues`. | Backward compatible. |
| Components | Reuse `common/*` and `shared/*`. One new `ReferenceTree` component. | No new design system. |
| Routes / menus | None in this epic. | Admin routes added in Epic 1.1.1. |
| Permissions | New capabilities `reference.read`, `reference.write`, `reference.retire`, `reference.translate` registered in existing capability registry. | No RLS added — per project rule, role-based only. |
| Feature flags | None in this epic. | Rollout flag added in Epic 1.1.1. |

### 6.2 Migration strategy (no big-bang)

1. **Phase A — Additive schema.** New tables + additive columns; defaults keep old rows valid. Existing `core_reference_group` / `core_reference_value` behavior unchanged.
2. **Phase B — Service extension.** New API methods land; old methods keep identical signatures and results.
3. **Phase C — Adoption wave 1.** Two low-risk groups migrate onto the extended framework (candidates: `CURRENCY`, `RELATIONSHIP_TYPE`) to prove hierarchy, locale, versioning, external codes.
4. **Phase D — Adoption wave 2.** Country / Bank / Payment Channel / Legal Reference bridge onto the framework (delivered by Epics 0.36D → 0.38, not here).
5. **Phase E — Legacy shim.** `tb_*` and module-owned reference tables get read-through shims into the framework; writes remain on legacy until their owning module's refactor epic.
6. **Phase F — Retire legacy** one release after all consumers cut over.

### 6.3 Backward compatibility

- `core_reference_group.group_code` and `core_reference_value.value_code` remain stable primary business keys.
- All existing dropdowns via `useReferenceValues(groupCode)` return the same shape.
- BN aliases (`BnReferenceGroup`, `BnReferenceValue`, `BN_REF_GROUPS`) remain exported.
- Locale, versioning, hierarchy, external codes are **opt-in per group** via new flags (`localization_enabled`, `versioning_enabled`, `hierarchy_enabled`). Groups that do not opt in behave exactly as today.

### 6.4 Adoption strategy

- Each product team consumes the framework via `coreReferenceDataService` only.
- No product may create a new `xx_*_type` / `xx_*_reason` / `xx_*_status` table. Governance gate added to code review checklist.
- Product-owned domain masters (e.g. `lg_matter_type`, `lg_court`) that are richer than a code+label remain as **domain aggregates** but MUST register their controlled code sets as framework groups (see §7).

### 6.5 Future consumers

Social Security (SSP), HRMS, DMS/EDRMS, Prison Management, Licensing, Budgeting, Payroll, Asset Management, Compliance, Finance, and future government platforms — all consume via the same service surface. No product ships its own reference engine.

### 6.6 Dependencies

- Existing `core_reference_group` / `core_reference_value` schema.
- Existing `coreReferenceDataService.ts`.
- Existing audit-communication pipeline for change notifications.
- Existing `src/lib/configuration/resolver.ts` scope-precedence pattern (reused conceptually for org/country overrides).
- Existing capability/permission registry.

### 6.7 Risks

| Risk | Mitigation |
|---|---|
| Adding columns to `core_reference_value` slows hot dropdown reads | All new columns are nullable; indexes only where needed; keep default read query column list unchanged. |
| Hierarchy misuse (deep trees on flat groups) | `hierarchy_enabled` gate at group level; cycle-guard trigger. |
| Metadata drift | Optional `schema_ref` + service-side JSON Schema validation. |
| Governance gaps allow duplicate reference tables to reappear | Add lint rule sibling to `scripts/lint-no-direct-*.ts` and enforce in CI. |
| Locale explosion | Locale rows opt-in per group; base row remains authoritative. |
| Legacy `tb_*` consumers | Read-through shim in Phase E; no forced cutover. |

### 6.8 Acceptance criteria

- Document exists at `docs/enterprise/EPIC_1_1_ENTERPRISE_REFERENCE_FRAMEWORK.md` and defines: current reusable components, proposed additions, framework architecture, repo impact, migration strategy, backward compatibility, adoption strategy, future consumers, dependencies, risks.
- Design confirms **zero** new parallel lookup engines.
- Design confirms **zero** duplicated existing reference tables.
- Every reference master in §5 is covered by the framework without extension.
- BN Product Builder remains **on hold**; this epic does not touch product-builder code, schema, routes, `app_modules`, menus, feature flags, or permissions.
- Minimum code-change set for Epic 1.1.1 is enumerated (see §7).

---

## 7. Step 5 — Implementation readiness (minimum change set for Epic 1.1.1)

Enumerated only. **Not implemented in this epic.**

### 7.1 Schema (additive migration)

1. `CREATE TABLE public.core_reference_category (...)` + GRANTs.
2. `ALTER TABLE public.core_reference_group ADD COLUMN category_code text, ownership_module_code text, is_platform_owned boolean DEFAULT false, is_org_overridable boolean DEFAULT false, is_country_scoped boolean DEFAULT false, hierarchy_enabled boolean DEFAULT false, versioning_enabled boolean DEFAULT false, localization_enabled boolean DEFAULT false, schema_ref text;`
3. `ALTER TABLE public.core_reference_value ADD COLUMN parent_value_id uuid, path text, depth int, version_number int DEFAULT 1, supersedes_id uuid, country_code text, organization_id uuid, deleted_at timestamptz, deleted_by text;`
4. `CREATE TABLE public.core_reference_value_i18n (...)` + GRANTs.
5. `CREATE TABLE public.core_reference_value_external_code (...)` + GRANTs.
6. `CREATE TABLE public.core_reference_value_alias (...)` + GRANTs.
7. Cycle-guard trigger on `parent_value_id`.
8. Indexes: `(group_id, parent_value_id)`, `(group_id, country_code)`, `(group_id, organization_id)`, `(value_id, locale)`, `(system, external_code)`.

### 7.2 Service

- Extend `src/services/core/coreReferenceDataService.ts` with the API in §4.3.
- Keep every existing export.

### 7.3 Hooks

- `useReferenceCategories`
- `useReferenceItemsHierarchy(groupCode, opts)`
- `useReferenceItemLocale(valueId, locale)`

### 7.4 UI (admin only)

- `src/pages/platform/reference-framework/` shell with list / tree / edit / import / translate — all composed from existing common/shared components.

### 7.5 Governance

- CI lint: forbid new `*_type`, `*_reason`, `*_status`, `*_category` tables outside `core_reference_*` unless whitelisted.
- Capability registry entries.

### 7.6 Rollout

- One feature flag `enterprise_reference_framework_v2` gating admin UI.
- Zero user-visible change for existing dropdowns.

---

## 8. Success criteria (recap)

- Every future reference master in the enterprise inherits this framework.
- No module ever implements an independent reference architecture again.
- Generic enough for all listed products; immediately usable by SSP.
- BN Product Builder unblocked path is preserved (Epic 0.40 remains gated on 0.36D → 0.39).
