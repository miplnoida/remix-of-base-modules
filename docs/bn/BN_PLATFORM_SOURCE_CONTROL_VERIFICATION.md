# BN Platform Source-Control Verification (pre-Wave 1)

Read-only verification pass. No BN / BEMA / IA / legacy tables changed, no
Product Builder refactor, no new screens.

**Verdict:** the **selector layer is 100 % source-controlled** across all 9
SSB policies. Every canonical field is bound by `reference` to a canonical
platform table with the correct value/label columns and a source badge.
However, **legacy data seeded before the reference lock contains orphan
codes** that governance correctly flags as blocking. Wave 1 is **NOT
green** until those data-level orphans are rebound.

---

## 1. Canonical source audit (selector layer)

| Policy | Field | Selector table | Value col | Label col | Filter | Source badge |
|---|---|---|---|---|---|---|
| Workflow | `applies_to` | `ssb_process_catalogue` | `process_code` | `process_name` | `is_active=true` | SSB Process Catalogue |
| Workflow | `workflow_code` | **`workflow_definitions`** | `id` | `name` | `is_active=true` | Workflow Engine |
| Financial | `binding_kind=CURRENCY` | `ssp_currency_profile` | `currency_code` | `currency_name` | active | Financial Reference · Currency |
| Financial | `binding_kind=BANK_LIST` | `ssp_bank` | `bank_code` | `bank_name` | active | Financial Reference · Bank |
| Financial | `binding_kind=BANK_BRANCH` | `ssp_bank_branch` | `branch_code` | `branch_name` | active | Financial Reference · Bank Branch |
| Financial | `binding_kind=ACCOUNT_TYPE` | `ssp_account_type` | `account_code` | `account_name` | active | Financial Reference · Account Type |
| Financial | `binding_kind=PAYMENT_CHANNEL` | `ssp_communication_channel` | `code` | `name` | active | Financial Reference · Payment Channel |
| Financial | `binding_kind=SETTLEMENT_METHOD` | `ssp_communication_channel` | `code` | `name` | active | Financial Reference · Settlement |
| Identity | `identity_type_code` | `ssp_identity_type` | `code` | `name` | active | Identity Domain |
| Identity | `validation_pattern_code` | `ssp_identity_validation_pattern` | `code` | `name` | active | Identity Domain · Pattern |
| Legal | `legal_reference_code` | `core_legal_reference` | `ref_code` | `short_title` | active | Legal Reference Domain |
| Legal | `applies_to` | `ssb_process_catalogue` | `process_code` | `process_name` | active | SSB Process Catalogue |
| Documents | `document_type_code` | `core_dms_document_type` | `document_type_code` | `document_type_name` | active | DMS · Document Type |
| Documents | `document_profile_code` | `core_document_profile` | `code` | `name` | active | DMS · Document Profile |
| Documents | `applies_to` | `ssb_process_catalogue` | `process_code` | `process_name` | active | SSB Process Catalogue |
| Communication | `template_code` | `core_template` | `code` | `name` | active | Notification Templates |
| Communication | `channel_code` | `ssp_communication_channel` | `code` | `name` | active | Communication Domain · Channel |
| Numbering | `applies_to` | `ssb_process_catalogue` | `process_code` | `process_name` | active | SSB Process Catalogue |
| Numbering | `sequence_code` | `core_number_sequence` | `module_code` | `entity_type` | active | Platform Numbering |

Rule: `SsbPolicySectionShell.ReferenceInput` reads directly from the
declared canonical table via the Supabase client, stores the stable
value column only, and displays a "Stored value not found in canonical
source" warning when the persisted value has no matching row. No form
accepts free-text for a canonical field.

**Result:** ✅ 100 % of platform-canonical fields are selector-bound.
No free-text reference-code input remains.

---

## 2. Route source-of-truth

| Concern | Canonical | Status |
|---|---|---|
| Workflow Engine (registry) | `/admin/workflows` → `workflow_definitions` | ✅ |
| `/admin/workflow` | Redirect → `/admin/workflows` | ✅ |
| `/admin/workflow-management` | Visual designer shell only, NOT the registry | ✅ documented |
| `ssb_configuration_asset.ssb.workflow` | `canonical_route='/admin/workflows'`, `canonical_table='workflow_definitions'` | ✅ (migration `20260706171003`) |
| SSB Setup Workflow deep-link | `/admin/workflows` | ✅ |
| Configuration Governance Workflow deep-link | `/admin/workflows` | ✅ |
| Configuration Centre Workflow domain card | route + `crudAt` = `/admin/workflows` | ✅ |
| Governance rule `SSB.E017.REF` | Recommends `/admin/workflows` | ✅ |
| Docs (`PLATFORM_OWNERSHIP_MATRIX`, `SSB_IMPLEMENTATION_CONFIGURATION_ACCEPTANCE`, `SSB_ADMIN_POLICY_CONFIGURATION_FIX_ACCEPTANCE`) | Updated to `/admin/workflows` | ✅ (route-consistency sweep) |

---

## 3. Data-level orphan report (blocking)

Selector code is correct; the *stored values* in the SSB policy tables
still carry legacy seed codes that don't exist in the canonical sources.
Governance blocks BN readiness on these.

| Policy row | Stored code | Canonical source | Row count | Rule | P-level |
|---|---|---|---:|---|---|
| Workflow | `WF.SSB.MEMBER_REGISTRATION`, `WF.SSB.EMPLOYER_REGISTRATION`, `WF.SSB.CONTRIBUTION_FILING`, `WF.SSB.CLAIM_INTAKE`, `WF.SSB.BENEFIT_APPROVAL` | `workflow_definitions.id` | 5 | `SSB.E017.REF` | **P0** |
| Numbering | 4 rows with `sequence_code` not in `core_number_sequence.module_code` | `core_number_sequence` | 4 | presence + reference | **P0** |
| Financial | `PAYMENT_CHANNEL`: `CHEQUE`, `EFT`, `CASH`, `ONLINE` not in `ssp_communication_channel.code` | `ssp_communication_channel` | 4 | reference | **P0** |
| Financial | `SETTLEMENT_METHOD`: `BANK_FILE`, `MANUAL` not in `ssp_communication_channel.code` (channel table is a proxy source; a dedicated settlement table is a documented deferred item) | `ssp_communication_channel` (interim) | 2 | reference | **P1** |
| Financial | `BANK_LIST`: `DEFERRED` sentinel not in `ssp_bank.bank_code` | `ssp_bank` | 1 | reference | **P1** (intentional placeholder) |
| Communication | 1 row with `template_code` not in `core_template.code` | `core_template` | 1 | reference | **P0** |
| Identity | — | `ssp_identity_type` | 0 | — | ✅ |
| Legal | — | `core_legal_reference` | 0 | — | ✅ |
| Documents | — | `core_dms_document_type` | 0 | — | ✅ |
| Address | 1 active row | — | 1 | ✅ | ✅ |
| Calendar | 1 active row | — | 1 | ✅ | ✅ |
| Process catalogue | 7 rows | — | 7 | ✅ | ✅ |

**Root cause:** these 12 rows were seeded before `SsbPolicySectionShell`
switched the fields to `reference` type. Governance already surfaces every
one of them with a "Reselect from list" warning in the form and a
blocking finding in Configuration Governance.

---

## 4. Governance snapshot

- Rules registered and evaluating: `SSB.E010–E020` (presence),
  `SSB.E013.PREVIEW` (numbering preview), `SSB.E017.REF`
  (workflow reference), `SSB.W017.INACTIVE` (workflow inactive),
  `SSB.W020` / `SSB.I024` (communication non-blocking), plus per-policy
  `SSB.*.ERR` and `SSB.*.W` from `ssbPolicyHealthService`.
- Blocking findings expected right now: **≥ 6** (5 workflow orphans +
  1 comm-template orphan; numbering and financial orphans also raise
  reference errors when their per-policy rules run).
- Non-blocking findings: workflow inactive workflow references (if any),
  communication SMS-deferred info, address/calendar partial warnings.

---

## 5. BN Benefit Administration resolver

Resolver: `ssbBusinessProcessConfigService.getBenefitAdministrationConfiguration`
(consumed by `BnPlatformConsumptionPanel` in Product Builder).

- Reads: `ssb_workflow_policy`, `ssb_numbering_policy`,
  `ssb_document_policy`, `ssb_communication_policy`,
  `ssb_legal_policy` — all via the SSB implementation profile.
- Does not read: any BN-owned rate / formula / product / version /
  eligibility table. Confirmed by absence of `bn_*` references in the
  file.
- BN Product Builder still uses its own tabs for product / eligibility /
  formula / rate-table / versioning. The platform panel is read-only.

**Readiness result today:** ⛔ **Not Ready** — blocked by the workflow
orphan cluster (SSB.E017.REF) and the numbering/communication orphans.
Once those are rebound the resolver will report Ready with only P1/P2
warnings remaining (settlement method deferred table, bank `DEFERRED`
placeholder, SMS channel deferred).

---

## 6. Remaining non-source-controlled items (documented, non-blocking)

| Item | Where | Class | Note |
|---|---|---|---|
| `calendar_source_code` (Contribution Calendar) | `ContributionCalendarPolicyForm.tsx` line ~94 | free text | Points at holiday-calendar source strings. No canonical registry yet. **P2** — flagged for a future calendar-source registry. |
| Settlement-method dedicated table | Financial policy | reuses `ssp_communication_channel` as interim source | **P1** — documented in `SSB_POLICY_FORM_SOURCE_CONTROL_AUDIT.md`. |
| Workflow-template registry | Workflow policy | not implemented; `workflow_definitions` covers registry-level binding | **P2** — deferred. |
| `format_pattern` (Numbering) | Numbering policy | literal preview only; real pattern owned by `core_number_sequence` | acceptable — not a canonical field, marked as preview only in helpText. |
| `notes` fields (all policies) | textarea | free text — not logic-driving | acceptable. |
| `country_code` (Address / others) | text `KN` | fixed to ISO-2; not sourced from a lookup table | **P3** — every SSB profile is country-scoped so this is effectively constant per profile. |

---

## 7. Findings summary

| # | Finding | P-level | Blocks BN Wave 1 |
|---|---|---|---|
| F-1 | 5 workflow policy rows carry `WF.SSB.*` codes that don't match `workflow_definitions.id` | P0 | **YES** |
| F-2 | 4 numbering policy rows carry orphan `sequence_code` | P0 | **YES** |
| F-3 | 4 payment-channel financial rows carry codes not in `ssp_communication_channel` | P0 | **YES** |
| F-4 | 1 communication policy row carries an orphan `template_code` | P0 | **YES** |
| F-5 | 2 settlement-method rows use `ssp_communication_channel` as interim source | P1 | No — documented deferred |
| F-6 | 1 bank row uses `DEFERRED` sentinel | P1 | No — intentional placeholder |
| F-7 | `calendar_source_code` is free text | P2 | No |
| F-8 | Workflow-template registry not implemented | P2 | No |
| F-9 | All selector-layer bindings verified canonical | — | ✅ Pass |
| F-10 | All workflow route references point at `/admin/workflows` | — | ✅ Pass |

---

## 8. Acceptance

- ✅ All 9 SSB policy forms use canonical selectors — no free-text
  reference codes remain in the form layer.
- ✅ Workflow route/source canonicalised on `/admin/workflows` +
  `workflow_definitions`; no stale `/admin/workflow` or
  `/admin/workflow-management` references remain except the redirect and
  historical acceptance docs.
- ✅ Governance rules exist and evaluate for every canonical binding.
- ✅ BN Benefit Administration resolver reads platform data only; no
  BN/BEMA/IA/legacy table was touched.
- ⛔ **P0 data-level orphans (F-1 … F-4) must be rebound before BN
  Product Builder Wave 1 is authorised.** These are data fixes only —
  no code or schema change is required. Rebind each orphan row in
  SSB Setup by opening the row and reselecting from the canonical
  dropdown, or clear them and let SSB Setup rebuild against real
  canonical rows.

Wave 1 can proceed **immediately after** F-1 … F-4 are rebound. P1/P2
items are documented and do not block Wave 1.
