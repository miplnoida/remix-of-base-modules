# Legal Master Data Consumption — Implementation Report

_Last updated: Phase B complete · Phase D admin + soft validation shipped · Phase C tracked below_

This document tracks the enterprise-wide replacement of free-text fields across
the Legal module with master-driven selectors. Every operational Legal screen
must consume master/reference data through the unified service described below.

Companion documents:
- `LEGAL_MASTER_EXISTENCE_AUDIT.md` — inventory of masters (verified previous pass)
- `LEGAL_FEE_MASTER_POLICY.md` — cost / fee-head governance
- `LEGAL_MASTER_CONSUMPTION_PLAN.md` — field → master mapping plan

---

## 1. Architecture

### 1.1 Single Reference Service

All Legal reference-data lookups go through **one** hook module:

```
src/hooks/legal/useLegalReferenceData.ts
```

Exports:

| API | Purpose |
| --- | --- |
| `useLegalReferenceData(groupCode, opts)` | Any `core_reference_group` (module `LEGAL` + COMMON fallback). Returns options, `resolveOption()`, `labelFor()`, `isKnown()`. |
| `useLegalCourts()` | Parent for Judge / Venue / Division. |
| `useLegalCourtOfficers(courtCode)` | Judges, magistrates, registrars — dependent on court. |
| `useLegalCourtVenues(courtCode)` | Court venue/registry — dependent on court. |
| `useLegalCourtDivisions(courtCode)` | Court divisions — dependent on court. |
| `useLegalFeeRules(feeHeadCode)` | Fee rules — dependent on fee head. |
| `LG_REF` constant | Canonical group-code map (`LG_PRIORITY`, `LG_RISK`, `LG_HEARING_TYPE`, …). |

Guarantees:
- **Cached** — React Query, `staleTime = 5 min`.
- **Active only by default** — retired values readable but not selectable.
- **Search** — client-side substring filter on label / code / description.
- **Legacy handling** — `resolveOption(value)` returns a synthetic option with `isLegacy: true` for stored values not in the master, so history stays viewable.

Duplicate hooks such as `useWaiverReasons`, `useFeeEvents`, and any bespoke
`core_reference_value` fetches will be migrated to `useLegalReferenceData` in
Phase C.

### 1.2 Shared Selector Components

```
src/components/legal/reference/LegalReferenceSelect.tsx
src/components/legal/reference/LegalCourtSelect.tsx
```

| Component | Group / Table |
| --- | --- |
| `<LegalReferenceSelect groupCode … />` | Any Legal reference group. |
| `<LegalReferenceValueBadge groupCode … />` | Read-only display with LEGACY / RETIRED badges. |
| `<LegalCourtSelect />` | `lg_court` |
| `<LegalJudgeSelect courtCode … />` | `lg_court_officer` filtered by court |
| `<LegalVenueSelect courtCode … />` | `lg_court_venue` filtered by court |
| `<LegalDivisionSelect courtCode … />` | `lg_court_division` filtered by court |
| `<LegalFeeRuleSelect feeHeadCode … />` | `lg_fee_rule` filtered by head |

Every selector:
- Renders through the project-standard `SearchableSelect`.
- Shows the current value even when retired or legacy (with badge / suffix).
- Refuses selection of retired / legacy pseudo-options.
- Disables the child until the parent is chosen.

---

## 2. Field × Screen Consumption Matrix

Legend — **Status**: ⬜ pending · 🟡 in-progress · ✅ done · ⛔ N/A · ♻ legacy-only

| # | Screen | Field | Current Control | Target Master | Status | Gap / Notes |
|---|---|---|---|---|---|---|
| 1 | Intake & Qualification | Matter type | native `<select>` (hard-coded) | `LG_MATTER_TYPE` | ⬜ | Phase C |
| 2 | Intake & Qualification | Priority | native `<select>` | `LG_PRIORITY` | ⬜ | Phase C |
| 3 | Intake & Qualification | Risk band | native `<select>` | `LG_RISK` | ⬜ | Phase C |
| 4 | Intake & Qualification | Party role | free text | `LG_PARTY_ROLE` | ⬜ | Phase C |
| 5 | Intake & Qualification | Document category | free text | `LG_DOCUMENT_CATEGORY` | ⬜ | Phase C |
| 6 | Matter Workspace | Court | text | `lg_court` (`LegalCourtSelect`) | ⬜ | Phase B |
| 7 | Matter Workspace | Judge | text | `lg_court_officer` (`LegalJudgeSelect`) | ⬜ | Phase B, depends on Court |
| 8 | Matter Workspace | Priority | mixed | `LG_PRIORITY` | ⬜ | Phase C |
| 9 | Matter Workspace | Risk | mixed | `LG_RISK` | ⬜ | Phase C |
| 10 | Matter Workspace | Closure reason | text | `LG_CLOSURE_REASON` | ⬜ | Phase C |
| 11 | Matter Workspace | Write-off reason | text | `LG_WRITEOFF_REASON` | ⬜ | Phase C |
| 12 | Recoverable Liabilities | Liability type | text | `LG_LIABILITY_TYPE` | ✅ | `IntakeProposedLiabilitiesCard`, `LiabilityLinkDialog` |
| 13 | Recoverable Liabilities | Fund | text | `LG_FUND_TYPE` (default from Liability metadata `fund_code`) | ✅ | idem |
| 14 | Recoverable Liabilities | Write-off reason | text | `LG_WRITEOFF_REASON` | ⬜ | Phase C |
| 15 | Court Operations (Hearings) | Court | text | `lg_court` | ✅ | `HearingOutcomeDialog` |
| 16 | Court Operations (Hearings) | Division | text | `lg_court_division` | ⬜ | Phase C (Court Filings) |
| 17 | Court Operations (Hearings) | Venue | text | `lg_court_venue` | ✅ | `HearingOutcomeDialog` |
| 18 | Court Operations (Hearings) | Judge | text | `lg_court_officer` | ✅ | `HearingOutcomeDialog`, `AddOrderDialog` |
| 19 | Court Operations (Hearings) | Hearing type | text | `LG_HEARING_TYPE` | ✅ | `HearingOutcomeDialog` |
| 20 | Court Operations (Hearings) | Outcome | text | `LG_HEARING_OUTCOME` | ✅ | `HearingOutcomeDialog` |
| 21 | Judicial Orders & Judgments | Order type | text | `LG_ORDER_TYPE` | ✅ | `AddOrderDialog`, `DraftOrderDialog` |
| 22 | Judicial Orders & Judgments | Court | text | `lg_court` | ✅ | `AddOrderDialog` |
| 23 | Judicial Orders & Judgments | Judge | text | `lg_court_officer` | ✅ | `AddOrderDialog` |
| 24 | Appeals | Appeal type | text | `LG_APPEAL_TYPE` | ⬜ | Phase C |
| 25 | Appeals | Appeal ground | text | `LG_APPEAL_GROUND` | ⬜ | Phase C |
| 26 | Appeals | Court | text | `lg_court` | ⬜ | Phase C |
| 27 | Enforcement Actions | Enforcement type | text | `LG_ENFORCEMENT_TYPE` | ⬜ | Phase C |
| 28 | Enforcement Actions | Enforcement officer | text | `lg_court_officer` (bailiff subtype) | ⬜ | Phase C |
| 29 | Consent Orders | Order sub-type | text | `LG_ORDER_TYPE` (`CONSENT_*` subset) | ⬜ | Phase C |
| 30 | Consent Orders | Variation reason | text | `LG_CLOSURE_REASON` (subset) | ⬜ | Phase C |
| 31 | Legal Settlements | Closure reason | text | `LG_CLOSURE_REASON` | ⬜ | Phase C |
| 32 | Legal Settlements | Fund | text | `LG_FUND_TYPE` | ⬜ | Phase C |
| 33 | Court Filings | Court | text | `lg_court` | ⬜ | Phase C |
| 34 | Court Filings | Division | text | `lg_court_division` | ⬜ | Phase C |
| 35 | Court Filings | Filing type | text | `LG_ORDER_TYPE` (filing subset) | ⬜ | Phase C |
| 36 | Court Filings | Fee rule | text | `lg_fee_rule` | ⬜ | Phase C, depends on fee head |
| 37 | External Counsel | Counsel type | text | `LG_PARTY_TYPE` (`COUNSEL_*` subset) | ⬜ | Phase C |
| 38 | External Counsel | Retainer fee rule | text | `lg_fee_rule` | ⬜ | Phase C |
| 39 | Legal Cost Recovery | Fee head | text | `LG_FEE_HEAD` | ✅ | `AddCostDialog` (×2) |
| 40 | Legal Cost Recovery | Fee rule | text | `lg_fee_rule` | ⬜ | Phase C, depends on fee head |
| 41 | Recovery Assignments | Strategy | text | `lg_recovery_strategy_type` | ⬜ | Phase C |
| 42 | Recovery Assignments | Campaign | text | `lg_recovery_campaign_type` | ⬜ | Phase C |
| 43 | Recovery Assignments | Priority | text | `LG_PRIORITY` | ⬜ | Phase C |
| 44 | Recovery Assignments | Risk band | text | `LG_RISK` | ⬜ | Phase C |
| 45 | Judgment Compliance | Compliance status | text | workflow enum (not master) | ⛔ | Owned by workflow |
| 46 | Judgment Compliance | Non-compliance reason | text | `LG_CLOSURE_REASON` (subset) | ⬜ | Phase C |

---

## 3. Dependency Rules

| Parent | Child | Enforcement |
|---|---|---|
| Court | Judge | `LegalJudgeSelect` disabled until court set; clears on court change |
| Court | Venue | same |
| Court | Division | same |
| Fee Head | Fee Rule | `LegalFeeRuleSelect` disabled until head set |
| Fee Rule | Default Charge | Fee rule row supplies `default_amount`; caller pre-fills the charge input |
| Liability Type | Fund | `useLegalReferenceData(LG_LIABILITY_TYPE).resolveOption(v).metadata.fund_code` → default fund selection |
| Order Type | Allowed workflow | Filtered by `lg_stage_transition_rule` in the Draft-Order dialog |

---

## 4. Legacy Value Handling

1. **Reading history is never broken.** `resolveOption` synthesises an option for any stored value not in the master.
2. **UI surfaces the gap.** The selector renders a `LEGACY` badge under the field; list/detail views render `<LegalReferenceValueBadge>` which shows `LEGACY` inline.
3. **Users cannot re-select legacy strings.** Once cleared, the value is gone from the dropdown.
4. **Administrator mapping** — Phase D adds a "Legacy Values" tab to `/legal/config/reference-data` listing distinct unmapped strings per column, with a "Map to master" action that either creates a new reference value or updates rows to an existing one.

---

## 5. Validation

Client-side (delivered):
- `LegalReferenceSelect` refuses selection of retired / legacy pseudo-options.
- Selectors expose `required` so callers can drive Zod / manual validation.

Server-side (Phase D — delivered, warn-only):
- `public.lg_validate_reference(group_code, value_code) → boolean` — soft
  validator, LEGAL-scope with COMMON fallback. Returns TRUE for empty inputs
  and unknown groups so it never blocks writes.
- `public.lg_list_unmapped_reference_values(table, column, group, limit)` —
  helper that powers the Admin Legacy Values page.
- Per-column CHECK triggers are intentionally NOT enabled yet; enable per
  column after its legacy list reaches zero on `/legal/config/reference-legacy`.

---

## 6. Phase Status

| Phase | Scope | Status |
|---|---|---|
| **A** | Foundation: unified hook, shared selectors, legacy resolver, doc skeleton | ✅ Complete |
| **B** | High-priority screens: Recoverable Liabilities, Hearings, Orders | ✅ Complete |
| **C** | Remaining screens (Appeals, Enforcement, Settlements, Filings, Costs — cost-head only done, Assignments, External Counsel, Intake headers, Matter Workspace) | ⬜ Tracked in §2 |
| **D** | Legacy admin tab + soft server validation + final report | ✅ Complete |

### Phase B deliverables

| File | Change |
|---|---|
| `src/components/legal/lg/AddOrderDialog.tsx` | `LegalReferenceSelect` (ORDER_TYPE) + `LegalCourtSelect` + `LegalJudgeSelect`; payload now stores `court_code` / `judge_code`. |
| `src/components/legal/HearingOutcomeDialog.tsx` | Hearing type / outcome via `LegalReferenceSelect`; court / venue / judge via dependent court selectors. |
| `src/components/legal/DraftOrderDialog.tsx` | Order-type dropdown replaced with `LegalReferenceSelect(LG_ORDER_TYPE)`. |
| `src/components/legal/intake/IntakeProposedLiabilitiesCard.tsx` | Liability type + fund via reference selectors; list view via `LegalReferenceValueBadge`. |
| `src/components/legal/liability/LiabilityLinkDialog.tsx` | Liability type + fund badges via `LegalReferenceValueBadge` (legacy strings render with the LEGACY chip). |
| `src/components/legal/AddCostDialog.tsx` · `src/components/legal/financials/AddCostDialog.tsx` | Cost-stage dropdowns replaced with `LegalReferenceSelect(LG_FEE_HEAD)`. |

### Phase D deliverables

| Artifact | Purpose |
|---|---|
| Migration `lg_validate_reference` + `lg_list_unmapped_reference_values` | Soft server-side validation + legacy-value enumeration helper. |
| `src/pages/legal/LegalReferenceLegacyValues.tsx` | Admin page listing distinct unmapped stored values per (table, column) with a one-click "Map" link into the Reference Data admin. |
| Route `/legal/config/reference-legacy` | Registered in `AppRoutes.tsx`. |

---

## 7. Remaining Free-Text (justified)

| Field | Reason |
|---|---|
| Case notes, task notes | Free text is the point. |
| Party name, addresses | Person / employer master, not a reference group. |
| Judgment narrative, order text | Rendered from templates but body is authored. |
| Compliance / case status | Owned by the workflow engine, not master data. |

## 8. Typecheck

`bunx tsgo --noEmit` — clean after each edit batch in this pass (zero new
errors introduced by Phase B / D).

