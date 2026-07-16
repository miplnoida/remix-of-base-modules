## Scope

BN-AWARD360-B3D-C1: correct the existing Product / Claim / Pensioner deep views in Award 360. Read-only, no migrations, no RLS changes, no scope expansion into other Award 360 tabs.

## Investigation before edits

1. Read `award360DeepService.ts` (939 lines) end-to-end to map:
   - The exact `bn_product_version` fields the readiness resolver reads today.
   - The current Claim evidence math (`required = received`, `missing = 0`).
   - Every place `canViewWorkflow`, `canViewPerson360`, `canViewConfiguration` are (or aren't) enforced.
2. Confirm the real `bn_product_version` schema via `supabase--read_query` on `information_schema.columns` — never invent columns.
3. Locate the canonical evidence model: `bn_evidence_checklist`, `bn_doc_requirement`, `bn_claim_evidence`, and any existing evidence service under `src/services/bn/`.
4. Read the current supabase mock at `src/test/mocks/supabaseClientMock.ts` — `.select()` currently discards column args (confirmed above).

## Changes

### 1. Product readiness — typed row and honest `.select()`
- In `award360DeepService.ts`, introduce a `ProductVersionReadinessRow` type listing only fields that exist in `bn_product_version`.
- Replace the `bn_product_version` `.select('*')`/loose select with an explicit column list matching that type — covering formula/workflow bindings, document profile, screen template, payment frequency/setup, life-certificate policy, medical-review policy, suspension/review policy, beneficiary/survivor policy.
- Cast the query result to `ProductVersionReadinessRow` (not `any`). Readiness resolver reads from the typed row only.
- If the resolver currently references a field that does not exist in `bn_product_version`, mark that readiness item `NOT_APPLICABLE` with a comment referencing the schema — do not fabricate columns.

### 2. Select-aware supabase mock + tests
- Extend `src/test/mocks/supabaseClientMock.ts` (or add a sibling `selectAwareSupabaseMock.ts`) so `.select(cols)`:
  - Records the requested columns.
  - Returns rows containing **only** requested columns.
  - Optionally throws when a field is later accessed that wasn't requested (opt-in strict mode).
- New tests under `src/__tests__/bn/award360/product-readiness.test.ts`:
  - Fully-configured product returns `READY` for each readiness item.
  - Deliberately-unselected column would surface as a test failure (proves select-awareness).
  - Missing workflow / document profile / screen template / payment frequency each produce the correct `MISSING` state.

### 3. Claim evidence — canonical counts
- Replace the `required = received, missing = 0` shortcut in `getAwardClaimDeep`.
- Resolve required baseline from `bn_evidence_checklist` (or `bn_doc_requirement` fallback) keyed by product/claim; count `bn_claim_evidence` grouped by status (`received`, `verified`, `waived`, `rejected`/blocking).
- `missing = max(0, required - (received + waived))`. Blocking = evidence rows with reject/blocking status.
- When no baseline can be resolved, return `required = null`, `missing = null`, and push a partial warning `evidence-baseline-unavailable`. Never emit `0 missing` as fabricated certainty.
- New tests in `src/__tests__/bn/award360/claim-evidence.test.ts`:
  - Required doc with no evidence → 1 missing.
  - Fulfilled requirement → 0 missing, 1 received.
  - Waived requirement → counted in `waived`, not `missing`.
  - Rejected evidence → surfaces in `blocking`.
  - Missing baseline → partial warning + null counts.

### 4. Claim workflow capability enforcement
- In `getAwardClaimDeep`, when `access.canViewWorkflow === false`:
  - Skip queries to `bn_claim_event` and `bn_claim_note` entirely.
  - Return empty `timeline` and set a new `workflowRestricted: true` flag on the view model.
  - Mask `workbasket` and `currentTask` (return `null`).
- Extend `AwardClaimDeepView` in `deepViewModels.ts` with `workflowRestricted: boolean`.
- In `AwardClaimTab.tsx`, render `Award360RestrictedNotice` for the timeline/workflow section when `workflowRestricted`, and hide workflow-only nav buttons.
- Test: with `canViewWorkflow: false`, the supabase mock records zero calls to `bn_claim_event`/`bn_claim_note`.

### 5. Person 360 capability enforcement
- Review whether `canViewPerson360` is genuinely distinct from the pensioner-tab capability. Two outcomes:
  - **If distinct:** when false, null out `routes.person360` and `routes.personProfile`, don't expose SSN via URL, render restricted notice in `AwardPensionerTab.tsx` around those buttons.
  - **If redundant:** remove `canViewPerson360` from `PensionerAccess`, document in a short comment in `award360Capabilities.ts` that the pensioner-tab capability is the single gate.
- Decision recorded in the commit message. Denied-access test added either way.

### 6. Product configuration navigation
- In `AwardProductTab.tsx`, when `restrictedConfiguration` (already derived from `canViewConfiguration`) is true, only render the restricted notice — remove the Formulas / Document Setup / Screen Setup buttons in that branch. Keep the Catalog link only if the user is authorized to reach it; otherwise hide it too.

## Safety
- Read-only. No inserts/updates/deletes/upserts.
- No migrations. If a required column is genuinely absent from `bn_product_version`, document it and return `NOT_APPLICABLE` rather than adding a column.
- No RLS changes. Canonical routes preserved. Partial-failure behaviour preserved.
- No changes to Schedule, Payments, Life Certificates, Beneficiaries, Overpayments, Communications, Suspensions, Medical Reviews, or Audit tabs.

## Files expected to change
- `src/services/bn/awards/award360DeepService.ts`
- `src/pages/bn/awards/award-360/deepViewModels.ts`
- `src/pages/bn/awards/award-360/tabs/AwardClaimTab.tsx`
- `src/pages/bn/awards/award-360/tabs/AwardProductTab.tsx`
- `src/pages/bn/awards/award-360/tabs/AwardPensionerTab.tsx` (only if capability enforcement requires it)
- `src/pages/bn/awards/award-360/award360Capabilities.ts` (only if Person 360 flag is simplified)
- `src/test/mocks/supabaseClientMock.ts` (extend `.select()` to be column-aware)
- New: `src/__tests__/bn/award360/product-readiness.test.ts`
- New: `src/__tests__/bn/award360/claim-evidence.test.ts`
- New: `src/__tests__/bn/award360/claim-workflow-capability.test.ts`
- New: `src/__tests__/bn/award360/pensioner-person360-capability.test.ts`

## Completion evidence I'll return
- Files changed list, exact `bn_product_version` columns selected, evidence tables/services used, new test names, full Award 360 test count, `tsgo` typecheck result, and Playwright screenshots of: configured Product readiness, missing evidence, restricted workflow, restricted Product configuration.

## Open question before I start
The select-aware mock change touches a shared test helper used across the repo. Two options:

- **A (preferred):** extend the existing `supabaseClientMock.ts` so `.select(cols)` records columns and returns only requested keys, defaulting to non-strict so existing tests keep passing; opt into strict mode from the new Award 360 tests only.
- **B:** leave the shared mock untouched and add a new `selectAwareSupabaseMock.ts` used only by the new Award 360 tests.

Confirm A or B (I'll default to **A** if you don't specify), then I'll execute end-to-end.