
# Legal Master Data Consumption — Implementation Plan

This is a large, cross-cutting refactor touching every operational Legal screen. Scope is significant (15+ screens, 60+ fields, new shared service, dependent lookups, legacy value handling, validation, and full documentation). I want to confirm scope and sequencing before spending the credits.

## Scope Summary

**Screens to touch (14):**
Intake & Qualification · Legal Matters (Workspace) · Recoverable Liabilities · Court Operations (Hearings) · Judicial Orders & Judgments · Appeals · Enforcement Actions · Judgment Compliance · Consent Orders · Legal Settlements · Court Filings · External Counsel · Legal Cost Recovery · Recovery Assignments

**Masters to consume (~20):**
`LG_COURT`, `LG_COURT_DIVISION`, `LG_COURT_VENUE`, `LG_COURT_OFFICER`, `LG_HEARING_TYPE`, `LG_ORDER_TYPE`, `LG_APPEAL_TYPE`, `LG_APPEAL_GROUND`, `LG_ENFORCEMENT_TYPE`, `LG_FUND_TYPE`, `LG_LIABILITY_TYPE`, `LG_PRIORITY`, `LG_RISK`, `LG_CLOSURE_REASON`, `LG_WRITEOFF_REASON`, `LG_MATTER_TYPE`, `LG_PARTY_ROLE`, `LG_DOCUMENT_CATEGORY`, `LG_NOTICE_TYPE`, `LG_FEE_HEAD` / `lg_fee_rule`.

## Deliverables

### 1. Unified Reference Service
- `src/hooks/legal/useLegalReferenceData.ts` — single hook, param `{ groupCode, activeOnly, search, includeInactive, parentValue }`.
- Backed by React Query with 5-min staleTime, keyed by `['legal-ref', groupCode, parentValue]`.
- Companion `useLegalCourtOfficers(courtId)`, `useLegalCourtVenues(courtId)`, `useLegalFeeRules(feeHead)` for dependent tables (still one shared query pattern).
- Legacy resolver `resolveLegacyValue(groupCode, storedValue)` → returns `{ label, isLegacy: true }` when not found.

### 2. Shared Selector Components
- `<ReferenceSelect groupCode … />` — replaces bespoke selects everywhere.
- `<LegalCourtSelect />`, `<LegalJudgeSelect courtId />`, `<LegalVenueSelect courtId />`, `<LegalFeeRuleSelect feeHead />` — thin wrappers, dependent behaviour.
- All render a `Legacy` badge for unmapped stored values.
- All refuse selection of `is_active = false` values but display them read-only when already stored.

### 3. Field Migration (per screen)

```text
Intake              → matter_type, priority, risk, party_role, doc_category
Matter Workspace    → court, judge, hearing_type, order_type, priority, risk, closure_reason, writeoff_reason
Recoverable Liab.   → liability_type, fund_type, writeoff_reason
Hearings            → court, division, venue, judge, hearing_type, outcome
Orders              → order_type, court, judge, compliance_status
Appeals             → appeal_type, appeal_ground, court
Enforcement         → enforcement_type, court_officer
Consent Orders      → order_type (subset), variation_reason
Settlements         → closure_reason, fund_type
Court Filings       → court, division, filing_type (LG_ORDER_TYPE subset), fee_rule
External Counsel    → counsel_type ref, fee_rule
Legal Costs         → fee_head, fee_rule (dependent)
Recovery Assignments→ strategy, campaign, priority, risk
```

### 4. Dependencies (enforced in wrappers)
- Court → Judge (`lg_court_officer.court_id`)
- Court → Venue (`lg_court_venue.court_id`)
- Fee Head → Fee Rule → Default Charge (`lg_fee_rule.fee_head_code`)
- Liability Type → Fund Type (mapped via `core_reference_value.metadata->>'fund_code'`)
- Order Type → Allowed next-stage workflow (`lg_stage_transition_rule`)

Parent clear → child clears.

### 5. Legacy Value Handling
- Reference service returns `{ code, label, isActive, isLegacy }`.
- Free-text values stored historically render with a muted "Legacy" badge in list views and detail read-only mode.
- New admin screen row `/legal/config/reference-data` gets a "Legacy Values" tab listing distinct unmapped strings per column with a "Map to master" action.

### 6. Validation
- Zod schemas per form updated: `z.string().refine(value ∈ activeCodes)`.
- Mandatory-master fields marked required.
- Backend guard: `bn_/lg_` insert triggers already exist for some — add a lightweight `lg_validate_reference()` PL/pgSQL helper for the highest-risk columns (liability_type, fund_type, enforcement_type, order_type, hearing_type). Warn-only initially (log to `legal_audit_log`) to avoid breaking legacy inserts.

### 7. Report
`docs/legal/LEGAL_MASTER_CONSUMPTION_IMPLEMENTATION.md` with:
- Full field × screen matrix (Current → Target → Status)
- Dependency map
- Legacy handling policy
- Remaining free-text (with justification)
- Typecheck result

## Technical Notes
- No new tables. One migration only: `lg_validate_reference()` function + optional metadata backfill (`liability_type → fund_code`).
- Column types stay `text` — enforcement via UI + soft validation, matching NO-RLS + app-layer-security memory rule.
- All selectors go through `SearchableSelect` per project standard.
- Auth gating uses existing `isAuthReady && isAuthenticated` pattern.

## Sequencing (proposed, one PR per phase)

1. **Phase A — Foundation** (this turn if approved): reference service + shared selectors + legacy resolver + docs skeleton.
2. **Phase B — High-priority screens**: Recoverable Liabilities, Hearings, Orders (biggest free-text offenders per the audit).
3. **Phase C — Remaining screens**: Appeals, Enforcement, Settlements, Filings, Costs, Assignments, External Counsel, Intake, Matter Workspace.
4. **Phase D — Legacy tab in admin + soft validation function + final report + typecheck**.

## Decision needed

This is easily a multi-turn build (est. 40-80 file changes). Please confirm:

1. Proceed with **all four phases in this single turn** (large diff, higher risk, one typecheck at the end)?
2. Or execute **phase-by-phase** with a checkpoint between each (safer, easier to review)?
3. Any screens to **defer or exclude** (e.g. External Counsel if not yet operational)?
