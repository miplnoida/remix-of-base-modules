# Appeals — No-Mock / Synthetic Data Audit (BN-AP-CONFIG-1a §D)

**Status:** BN-AP-CONFIG-1a inventory only. This document classifies every
hard-coded structure in the Appeals module runtime. Removal / replacement is
scheduled in later slices (1b–1e). **No production data structure is deleted
in 1a.**

## Classification key

| Code | Meaning |
|------|---------|
| **CANONICAL_CODE_CATALOGUE** | Stable technical identifier owned by application code (status/command/error codes). Allowed. |
| **APPROVED_DEFAULT_SEED** | Small, documented default set the DB is expected to hold. Allowed as UI fallback when DB is empty during pilot. |
| **COMPUTED_DISPLAY_VALUE** | Label/badge derived from live data. Allowed. |
| **MOCK_OR_PLACEHOLDER** | Fabricated production output that misrepresents system state. **Must be removed.** |
| **UNIMPLEMENTED_FALLBACK** | Empty array / stub returned in place of a not-yet-built integration. **Must be replaced with a truthful NOT_CONFIGURED / INTEGRATION_NOT_READY result.** |
| **TEST_FIXTURE_ONLY** | Under `__tests__/`, `.test.ts`, or `test-support/`. Allowed. |

## Findings

### 1. Edge function — `supabase/functions/bn-benefits-query/index.ts`

| # | Location | Finding | Class | Remediation turn |
|---|----------|---------|-------|-----------|
| 1.1 | `getAppealConfiguration` handler, lines ~2312–2314 | `admin.from('bn_appeal_type_config').select('*')` on all three configuration tables (types, grounds, remedies). Bypasses column allow-list, exposes unaudited columns, and hides schema drift. | MOCK_OR_PLACEHOLDER (select-star anti-pattern) | 1c |
| 1.2 | `getAppealConfiguration` handler, line ~2325 | Hard-coded `integrationReadiness: [ ... ]` array (only Claims flagged `ready: true`). Not derived from any adapter registry, connectivity probe, or migration state. | MOCK_OR_PLACEHOLDER | 1c |
| 1.3 | Same handler | Catches DB errors and coerces to synthetic empty arrays instead of returning `FAILED` / `INTEGRATION_NOT_READY`. | UNIMPLEMENTED_FALLBACK | 1c |
| 1.4 | Registry entry `BN_APPEAL_GET_CONFIGURATION` (`moduleCode: 'bn_appeals'`, `anyOfCapabilities: ['bn_appeals:view','bn_appeals:read']`) | Ordinary Appeals officers can read raw configuration. Config queries must move to `moduleCode: 'bn_appeals_config'` in 1c. | UNIMPLEMENTED_FALLBACK (permission scope) | 1c |

### 2. Frontend hook — `src/hooks/bn/appeals/useAppealOperationalQueries.ts`

| # | Location | Finding | Class | Remediation turn |
|---|----------|---------|-------|-----------|
| 2.1 | `AppealConfigurationDto` uses `any[]` for `appealTypes`, `grounds`, `remedies`, `filingPolicies`, `hearingPolicies`, `workflowMappings`, `communicationTemplates` | Operational DTO is untyped; downstream UI cannot rely on shape. | MOCK_OR_PLACEHOLDER (untyped operational surface) | 1c |
| 2.2 | `integrationReadiness` typed as inline literal | Type accepts any shape; needs to move to a discriminated `IntegrationHealth` union in 1c. | UNIMPLEMENTED_FALLBACK | 1c |

### 3. Frontend page — `src/pages/bn/appeals/BnAppealConfigPage.tsx`

| # | Location | Finding | Class | Remediation turn |
|---|----------|---------|-------|-----------|
| 3.1 | Raw snake_case columns array (`['appeal_type_code','display_name','requires_hearing','active']`) rendered directly. | Snake-case operational DTO leaks to UI; will be replaced by typed camelCase columns per 1c/1e. | UNIMPLEMENTED_FALLBACK | 1c/1e |
| 3.2 | Generic `ConfigCard` renders arbitrary `any[]` — no typed table for each configuration resource. | Displays "Yes/No/—" without governance metadata (status, version, effective range). Must be replaced by the ten-tab configuration UI in 1e. | UNIMPLEMENTED_FALLBACK | 1e |

### 4. Frontend page — `src/pages/bn/appeals/BnAppealsWorkspacePage.tsx`

| # | Location | Finding | Class | Remediation turn |
|---|----------|---------|-------|-----------|
| 4.1 | `STATUS_OPTIONS` array of lifecycle codes hard-coded in the client. | Lifecycle codes are canonical technical identifiers owned by application code and match server-side state machines. | CANONICAL_CODE_CATALOGUE | Allowed |
| 4.2 | `CARDS` summary tile labels hard-coded. | Static display labels for canonical summary buckets. | COMPUTED_DISPLAY_VALUE | Allowed |
| 4.3 | `AppealRowDto.nextAction: string` accepted verbatim from server. | Verify server never returns a hard-coded literal like `"Review"` disconnected from workflow. Server-side derivation certified separately in 1c. | (verification only) | 1c |

### 5. Frontend page — `src/pages/bn/appeals/BnAppealDetailPage.tsx`

| # | Location | Finding | Class | Remediation turn |
|---|----------|---------|-------|-----------|
| 5.1 | Tab bodies rendered from `render: (rows) => <SimpleList ... />` with `any[]` payloads. | Every child tab renders untyped rows. DTOs must be typed per query code in 1c. | UNIMPLEMENTED_FALLBACK | 1c |
| 5.2 | Inline `QueryFailureBanner` component instead of `AppealsQueryState`. | Not standardised; must move to `AppealsQueryState` for consistent classification (see §B in 1a). Deferred to 1c because it touches 14 tabs. | UNIMPLEMENTED_FALLBACK (UX consistency) | 1c |

### 6. Frontend page — `src/pages/bn/appeals/BnAppealNewPreviewPage.tsx` (Intake wizard)

| # | Location | Finding | Class | Remediation turn |
|---|----------|---------|-------|-----------|
| 6.1 | `SOURCE_MODULES` hard-coded list (bn_claim, bn_award, bn_overpayment, bn_medical, bn_means_test). | Canonical set of gap-module identifiers. Owned by application code. | CANONICAL_CODE_CATALOGUE | Allowed |
| 6.2 | Fallback priority list `['LOW','NORMAL','HIGH','URGENT']` when config does not return one. | Approved default until 1b adds `bn_appeal_reference_value.category='PRIORITY'`. Document as APPROVED_DEFAULT_SEED. | APPROVED_DEFAULT_SEED | 1b |
| 6.3 | Inline `Alert` for `q.isError` instead of `AppealsQueryState`. | Wizard steps must migrate to `AppealsQueryState` in 1e when the wizard becomes writable. | UNIMPLEMENTED_FALLBACK | 1e |

### 7. Hooks — `src/hooks/bn/appeals/useAppealWizardQueries.ts`, `useMyAppeals.ts`, `useSubmitClaimantAppeal.ts`

| # | Location | Finding | Class | Remediation turn |
|---|----------|---------|-------|-----------|
| 7.1 | (verified) No `select('*')`, no mock imports, no fabricated sample records. | — | — | — |

### 8. Types — `src/types/bn/appeals/**`

No mock/fake types identified. Envelope types (`BnBenefitsQueryEnvelope`, `BnBenefitsQueryResult`) are canonical.

### 9. Migrations & seeds

`bn_appeal_type_config`, `bn_appeal_ground_config`, `bn_appeal_remedy_config` exist and hold live rows. **No mock production seed identified.** Governance columns (`config_status`, `version_number`, `effective_from`, `effective_to`, `row_version`, `approved_by`, etc.) are absent — additive migration required in 1b.

### 10. Command-side edge functions

Appeals mutation edge functions are not yet wired to the UI (staff commands
disabled via `actions_enabled=false`). No synthetic command output detected.

### 11. localStorage / browser persistence

Grepped `src/pages/bn/appeals/**`, `src/components/bn/appeals/**`,
`src/hooks/bn/appeals/**` — **no** `localStorage.setItem`/`getItem` on
Appeals business records.

### 12. Mock imports in production

Grepped for `mock`, `Mock`, `sample`, `fabricat` — **no** production Appeals
path imports fixtures. All matches are inside `__tests__/`.

## Summary counts

| Class | Count |
|-------|-------|
| MOCK_OR_PLACEHOLDER | **3** (1.1, 1.2, 2.1) |
| UNIMPLEMENTED_FALLBACK | **7** (1.3, 1.4, 2.2, 3.1, 3.2, 5.1, 5.2, 6.3) |
| APPROVED_DEFAULT_SEED | **1** (6.2) |
| CANONICAL_CODE_CATALOGUE | **2** (4.1, 6.1) |
| COMPUTED_DISPLAY_VALUE | **1** (4.2) |
| TEST_FIXTURE_ONLY | **all `__tests__/` matches** — allowed |

## Handoff — required by remediation turn

- **1b (schema + permissions)**:
  - Add governance columns to `bn_appeal_type_config` / `_ground_config` / `_remedy_config`.
  - Create `bn_appeal_sla_policy`, `bn_appeal_hearing_policy`, `bn_appeal_reference_value`, `bn_appeal_source_adapter_config`.
  - Add `bn_appeals_config:{read,manage,approve,retire,admin}` module_actions.
  - Corrective grant: remove any inherited `bn_appeals_config:view` from ordinary Appeals officers (audit today shows only `Admin` role holds it — verify no other role inherited it during 1a→1b).
  - Retire the approved seed at §6.2 by seeding `bn_appeal_reference_value.category='PRIORITY'`.

- **1c (secure config queries)** — must remove:
  - Finding **1.1** — `select('*')` on all three appeal_*_config tables.
  - Finding **1.2** — hard-coded `integrationReadiness`.
  - Finding **1.3** — swallowed errors → typed `FAILED` / `INTEGRATION_NOT_READY`.
  - Finding **1.4** — move Config queries to `moduleCode: 'bn_appeals_config'`.
  - Finding **2.1**, **2.2** — replace with typed camelCase DTOs.
  - Finding **5.1** — type all 14 Appeal 360 child DTOs.
  - Finding **5.2** — migrate Detail page to `AppealsQueryState`.
  - Finding **4.3** — certify server-side derivation of `nextAction`.

- **1d (commands + maker-checker)**: no direct finding, but requires
  1c's typed config queries to exist.

- **1e (ten-tab configuration UI)** — must replace:
  - Finding **3.1**, **3.2** — remove raw snake_case ConfigCard; introduce
    typed tab-level tables (Appeal Types, Grounds, Remedies, SLA, Hearing,
    Workflow Mapping, Communication Templates, Reference Values,
    Integration Health, Change History).
  - Finding **6.3** — Intake wizard adopts `AppealsQueryState` and gains
    writable form state gated by `bn_appeals_register:write`.

## Unresolved risks after 1a

1. `BN_APPEAL_GET_CONFIGURATION` still allows ordinary `bn_appeals:view`
   readers to fetch raw configuration snapshots. Not exploitable for
   mutation (staff actions disabled), but leaks configuration surface to
   non-config roles. **1c must gate on `bn_appeals_config`.**
2. Configuration `select('*')` returns whatever columns exist in the three
   config tables — including any columns 1b adds. 1c must land the typed
   handler before or alongside the 1b schema migration to avoid leaking
   audit/approval metadata.
3. `AppealsQueryState` is not yet adopted on the Detail 360 (14 tabs) or
   Intake wizard steps. These paths already avoid rendering zero content on
   failure via bespoke banners, so the risk is UX inconsistency rather than
   data disclosure. **Deferred to 1c and 1e respectively.**
