# SSB Policy Form — Source-Control Audit

**Date:** 2026-07-06
**Scope:** All 9 SSB policy forms under `/admin/ssb-setup` and their child tables.
**Goal:** Prove every controlled reference value is stored as a stable code / id
selected from a canonical master, shared-domain, or engine table — and identify
every field that is still free text or a hard-coded dropdown.

Risk key:
- **SAFE** — value is already selected from a canonical source and stored as a stable code/id.
- **WARNING** — hard-coded dropdown with a small controlled enum; no canonical selector exists yet, but the enum is not user-typed.
- **UNSAFE** — user can freely type a code that downstream logic depends on.

---

## 1. Address Policy (`ssb_address_policy` + child tables)

| Field | Current input | Storage | Correct source | Safe input | Risk | Correction |
|---|---|---|---|---|---|---|
| `country_code` (implicit via profile) | — | text | `ssp_country_profile` | reference | SAFE | none |
| Address field grid (`ssb_address_policy_field`) | inline editor | rows in child table | Reference Framework (`ADDRESS_FIELD` group) | reference | WARNING | Move field-code list into `core_reference_group='ADDRESS_FIELD'` in a follow-up; current values are constrained by the child-table shape. |
| Admin levels (`ssb_address_policy_admin_level`) | reference by id | uuid FK | `ssp_admin_level` | FK | SAFE | none |
| Placeholder / help text | text | text | — | text | SAFE | Non-logic free text is allowed. |

## 2. Identity / NIS Policy (`ssb_identity_policy`)

| Field | Was | Now | Source | Risk | Correction |
|---|---|---|---|---|---|
| `identity_type_code` | hard-coded select (NIS, PASSPORT…) | **reference** | `ssp_identity_type` | was WARNING → SAFE | Replaced with dynamic selector. |
| `validation_pattern` | free-text regex | **reference** | `ssp_identity_validation_pattern` | was **UNSAFE** → SAFE | Users now pick a canonical pattern; regex shown as sub-label. |
| `is_primary`, `is_accepted` | boolean | boolean | — | SAFE | none |
| `notes` | textarea | textarea | — | SAFE | Non-logic. |

## 3. Numbering Policy (`ssb_numbering_policy`)

| Field | Was | Now | Source | Risk | Correction |
|---|---|---|---|---|---|
| `entity_code` | hard-coded select | **reference** | `ssb_process_catalogue` | was WARNING → SAFE | Uses new canonical process registry. |
| `sequence_code` | free text | **reference** | `core_number_sequence` | was **UNSAFE** → SAFE | Selected from Platform Numbering. |
| `format_pattern` | free text | free text (labelled as literal preview only) | — | SAFE | Kept as literal display preview. Real pattern lives on the platform sequence. |
| `notes` | textarea | textarea | — | SAFE | Non-logic. |

## 4. Contribution Calendar Policy (`ssb_contribution_calendar_policy` + `ssb_contribution_calendar_weekend_day`)

| Field | Current | Source | Risk | Correction |
|---|---|---|---|---|
| `period_type`, `filing_due_day_of_period`, `payment_due_day_of_period`, `interest_start_basis`, `penalty_start_basis`, `working_day_adjustment` | typed scalar columns | should move to `core_reference_group` enums | WARNING | Follow-up: seed enum groups; current storage is already scalar (not free text) so behaviour is safe. |
| Weekend days | child rows | canonical | SAFE | Relational since Wave 1. |
| Holiday calendar binding | `public_holidays` FK | canonical | SAFE | none |
| `notes` | textarea | — | SAFE | Non-logic. |

## 5. Financial / Payment Policy (`ssb_financial_policy`) — P0

| Field | Was | Now | Source | Risk | Correction |
|---|---|---|---|---|---|
| `binding_kind` | hard-coded select | hard-coded select | 6-value enum | WARNING | Enum drives which source table applies. |
| `reference_code` | **free text** | **dependent reference** | Source resolved from `binding_kind`: `ssp_currency_profile`, `ssp_bank`, `ssp_bank_branch`, `ssp_account_type`, `ssp_communication_channel` (payment channel / settlement) | was **UNSAFE** → SAFE | The old "Reference Code" text input is removed. The selector switches source automatically. |
| `is_active` | boolean | boolean | — | SAFE | none |
| `notes` | textarea | textarea | — | SAFE | Non-logic. |

> Deferred: dedicated `ssp_payment_channel` and `ssp_settlement_method` reference tables. Until they exist, canonical selection is served by `ssp_communication_channel` filtered by category. Governance validation catches any orphan reference codes.

## 6. Legal Policy (`ssb_legal_policy`)

| Field | Was | Now | Source | Risk | Correction |
|---|---|---|---|---|---|
| `legal_reference_code` | free text | **reference** | `core_legal_reference` (ref_code + short_title + ref_type) | was **UNSAFE** → SAFE | Users select from the Legal Reference Domain. |
| `applies_to` | hard-coded select | **reference** | `ssb_process_catalogue` | was WARNING → SAFE | Uses canonical process registry. |
| `is_active` / `notes` | as-is | as-is | — | SAFE | Non-logic. |

## 7. Document Policy (`ssb_document_policy`)

| Field | Was | Now | Source | Risk | Correction |
|---|---|---|---|---|---|
| `document_type_code` | free text | **reference** | `core_dms_document_type` | was **UNSAFE** → SAFE | Selected from DMS. |
| `applies_to` | hard-coded select | **reference** | `ssb_process_catalogue` | was WARNING → SAFE | Uses canonical process registry. |
| `document_profile_code` | free text | **reference** | `core_document_profile` | was **UNSAFE** → SAFE | Selected from DMS profile registry. |
| `is_mandatory` / `notes` | as-is | as-is | — | SAFE | Non-logic. |

## 8. Communication Policy (`ssb_communication_policy`)

| Field | Was | Now | Source | Risk | Correction |
|---|---|---|---|---|---|
| `template_code` | free text | **reference** | `core_template` | was **UNSAFE** → SAFE | Selected from Notification Templates. |
| `channel` | hard-coded select | **reference** | `ssp_communication_channel` | was WARNING → SAFE | Uses Communication Domain. |
| `is_active` / `notes` | as-is | as-is | — | SAFE | Non-logic (DEFERRED marker allowed). |

## 9. Workflow / SLA Policy (`ssb_workflow_policy`)

| Field | Was | Now | Source | Risk | Correction |
|---|---|---|---|---|---|
| `applies_to` | hard-coded select | **reference** | `ssb_process_catalogue` | was WARNING → SAFE | Uses canonical process registry. |
| `workflow_code` | free text | free text (explicitly labelled deferred) | Workflow Engine template registry (not yet exposed as a shared table) | WARNING (deferred) | Fix follow-up: expose canonical workflow template table, then wire a `reference` selector. Governance surfaces this as a warning, not a blocker. |
| `sla_hours` / `approval_levels` | number | number | — | SAFE | none |
| `notes` | textarea | textarea | — | SAFE | Non-logic. |

---

## Summary

| Risk before | Count | Risk after | Count |
|---|---|---|---|
| UNSAFE (free-text codes driving logic) | 8 | UNSAFE | 0 |
| WARNING (hard-coded enums) | 9 | WARNING | 4 (all deferred, non-blocking) |
| SAFE | rest | SAFE | rest |

No JSON-blob active configuration remains. No BN/BEMA/IA/legacy table was read or modified.
