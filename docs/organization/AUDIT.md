# Organization Management — Schema Audit

**Date:** 2026-06-27
**Scope:** Audit existing tables before any new schema creation for enterprise-wide Organization Management foundation (Legal, Benefits, Compliance, Finance, HR, Employer Services, Registration, DMS, Notifications, Reports, AI, Public Portal).

**Headline:** ~98% of required infrastructure already exists. Only **one new table** and **two additive columns** required. Everything else is **resolver + UI wiring**.

---

## Audit Table

| Existing Table | Purpose | Reused For | New Table Needed? | Reason |
|---|---|---|---|---|
| `core_organization` (31 cols) | Enterprise identity & defaults | Organization Profile — all enterprise defaults (logo, seal, letterhead, signature, disclaimer, footer, dms folder, location, currency, language, timezone, country, registration_no, main_email, main_phone) | **No** | All required columns already exist including `default_letterhead_id`, `default_email_signature_id`, `default_disclaimer_id`, `default_print_footer_id`, `default_dms_folder_id`, `default_location_id`, `logo_asset_id`, `seal_asset_id`. |
| `core_department` | Department master | Department records | **No** | Master exists. |
| `core_department_profile` (50 cols) | Per-department config & overrides | Department Profiles screen — inherit flags + overrides for letterhead/signature/disclaimer/footer/logo/seal/location/dms; manager, deputy, escalation, teams, workbaskets, AI prefix | **No** | Inherit flags + override fields already present (`inherit_letterhead_from_org`, `inherit_email_signature_from_org`, `inherit_disclaimer_from_org`, `inherit_print_footer_from_org`, `inherit_logo_from_org`, `inherit_seal_from_org`, `inherit_location_from_org`, `inherit_dms_folder_from_org`; `default_*_id` columns act as overrides when inherit flag is false). |
| `core_department_location` | Department↔Location M:N | Active locations per department | **No** | Exists. |
| `core_module_department_map` | Module↔Department mapping | Module ownership resolution | **No** | Exists. |
| `lg_department_profile` (57 cols) | **Legacy** legal-only profile | Source for backfill | **No (deprecate)** | Superseded by `core_department_profile`. Resolver will read core; legacy retained read-only via `legacy_lg_profile_id` link until full migration. |
| `app_modules` (25 cols) | Module registry | Module Registry screen — display_name, icon, route, sort_order, rollout_state, is_enabled | **No** (additive: 2 cols) | Has display_name, icon, route. Missing `short_name` and `owner_department_id` — added in migration. |
| `office_locations` (24 cols) | Branches/offices master | Locations & Branches screen | **No** | Single canonical source. (`er_locations` and `tb_office` are employer-/legacy-specific and remain scoped.) |
| `core_team` | Teams master | Team selector | **No** | Exists. |
| `core_workbasket` | Workbaskets master | Workbasket selector | **No** | Exists. |
| `comm_media_asset` (39 cols) + `comm_media_asset_version` | Central asset library (logo, seal, signature, stamp, watermark, etc.) | Communication Assets screen | **No** | Already centralized with approval workflow, versions, scopes (global/org/dept/location). |
| `comm_letterhead` | Letterhead definitions | Letterheads (under Assets) | **No** | Exists. |
| `comm_email_signature` | Email signature definitions | Signatures | **No** | Exists. |
| `comm_disclaimer` | Disclaimer definitions | Disclaimers | **No** | Exists. |
| `comm_print_footer` | Print footer definitions | Print footers | **No** | Exists. |
| `comm_asset_mapping` | Asset-to-context bindings | Where asset is used (module/dept/communication type) | **No** | Exists; powers `resolve_comm_asset` RPC. |
| `core_template` + `core_template_*` family (category, channel, layout, section, token, version, localization, schedule_policy, usage, variable_binding, legal_reference, approval) | Template engine | All template authoring & rendering | **No** | Rich, complete template platform. New text blocks will be referenced from templates, not duplicated into them. |
| `core_dms_provider`, `core_dms_document_type`, `core_dms_module_mapping`, `core_dms_storage_policy` | DMS configuration | DMS folder/provider resolution | **No** | Exists. |
| `tb_country` | Country master | Country selector | **No** | Exists (5 cols). |
| `core_reference_group` + `core_reference_value` | Generic ref-data (`CORE_CURRENCY`, `CORE_LANGUAGE`, `CORE_TIMEZONE`) | Currency/Language/Timezone selectors | **No** | Already used by `useCurrencyOptions`, `useLanguageOptions`, `useTimezoneOptions`. |
| `tb_currencies` | Detailed currency master | Optional richer currency display | **No** | Reuse as-is. |
| `core_number_sequence` family | Number sequencing | Document numbering | **No** | Not part of org mgmt scope. |
| **`core_text_block`** | Reusable content blocks (confidentiality notice, legal disclaimer, appeal instructions, footer text, etc.) | Text Blocks screen + template references | **YES (new)** | No equivalent table exists. `comm_disclaimer` is too narrow (legal only). Templates currently embed hardcoded paragraphs — this table breaks that anti-pattern. |

---

## Tables explicitly **NOT** created

- ❌ New `organization` / `organization_profile` table → use `core_organization`.
- ❌ New `department_profile` table → use `core_department_profile`.
- ❌ New `module` / `module_registry` table → use `app_modules`.
- ❌ New `location` / `branch` table → use `office_locations`.
- ❌ New `letterhead` / `signature` / `disclaimer` / `footer` tables → use `comm_*` family.
- ❌ New `template` tables → use `core_template` family.
- ❌ Duplicate department master per module — strictly forbidden.

---

## Gaps requiring action

### Schema (Phase 2 — 1 migration)
1. **Create `core_text_block`** — reusable text blocks with module/department scope, language, versioning, effective dates.
2. **Add `short_name` and `owner_department_id` to `app_modules`** — for resolver and display.

### Code (Phase 3 — no schema)
3. **`src/lib/org/organizationContextResolver.ts`** — unified resolver wrapping existing `resolveCommunicationContext`, `resolveCommAsset`, plus module + text-block lookup.
4. **Hooks** — `useOrganizationContext`, `useAppModules`, `useTextBlock`.
5. **Deprecate** direct reads of `lg_department_profile` — route through `core_department_profile`.

### UI (Phase 4 — thin v1)
6. Seven screens under Organization Management: Organization Profile · Locations & Branches · Communication Assets · **Text Blocks (new)** · Department Profiles · Module Registry · Usage & Validation.

---

## Acceptance Mapping

| Requirement | Met by |
|---|---|
| No hardcoded org/module/dept text | Resolver + `useAppModules` display names |
| Department profiles inherit org defaults | `core_department_profile.inherit_*_from_org` (exists) |
| Module names from registry | `app_modules.display_name` (+ new `short_name`) |
| Centralized communication assets | `comm_media_asset` + `comm_*` family (exists) |
| Reusable text blocks | **`core_text_block` (new)** |
| Legal/Benefits/Compliance/Finance resolve branding | `organizationContextResolver` (new code) |
| No duplicate masters | Audit confirms — no new masters created |
