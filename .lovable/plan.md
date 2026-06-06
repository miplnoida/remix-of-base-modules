## Scope

Make the Claim Workbench (`/bn/claims/:id`) respect a per-product **amendment policy** driven by the existing `application_channel` on `bn_claim` / `bn_claim_application`. No new `claim_source` column — we use the channel already in place.

The work has three layers: **schema** (policy + audit), **service** (resolver that says "what's editable, by whom, why locked"), **UI** (banner, editable/locked controls, correction flow).

## Phase 1 — Schema (one migration)

New tables in `public` (RLS off per project rule, plain GRANTs):

1. `bn_product_amendment_policy` — one row per `bn_product_version`
   - flags: `allow_officer_amendments`, `allow_public_corrections`, `allow_participant_amendments`
   - lock gates: `editable_until_status`, `lock_after_eligibility/calculation/decision/approval/payment`
   - approval flags: `requires_reason_for_amendment`, `requires_supervisor_approval_for_locked_changes`
   - area gates: `participant_details_editable_until`, `benefit_facts_editable_until`, `document_details_editable_until`, `payment_details_editable_until`, `calculation_inputs_editable_until`

2. `bn_claim_field_ownership` — per product_version + field_key
   - `field_owner` enum: APPLICANT_SUBMITTED, STAFF_REVIEW, EMPLOYER_SUBMITTED, DOCTOR_SUBMITTED, SYSTEM_DERIVED, DECISION_FIELD, PAYMENT_FIELD
   - `editable_channels text[]`, `editable_until_status`, `requires_reason`, `requires_supervisor_approval`

3. `bn_claim_amendment_log` — before/after/reason/by/at/channel/approval_status (also mirrored into `system_audit_trail`)

4. `bn_claim_correction_request` + `bn_claim_correction_field` — officer requests fields, claimant fills, officer accepts/rejects

5. Add `eligibility_stale boolean` and `calculation_stale boolean` to `bn_claim`

Seed default policy rows for every existing `bn_product_version` and a default field-ownership set for the well-known claim fact keys.

## Phase 2 — Service layer

`src/services/bn/amendmentPolicyService.ts`
- `resolveClaimEditability(claimId)` → returns `{ channel, status, policy, areas: { participants, benefitFacts, documents, payment, calcInputs }, lockedReasons[], canRequestCorrection, canSupervisorOverride }`
- `getFieldEditability(claimId, fieldKey, userRoles)` → uses ownership + channel + status + policy
- `recordAmendment(...)` — writes `bn_claim_amendment_log` + `system_audit_trail` in one RPC; if either fails, both rollback. Flips `eligibility_stale` / `calculation_stale` when amended field is tagged as affecting them.
- `createCorrectionRequest`, `submitCorrection`, `acceptCorrection`, `rejectCorrection` — each writes its audit action.

Hook: `useClaimEditability(claimId)`.

## Phase 3 — Workbench UI

- New `EditabilityBanner` at top of workbench showing channel, status, what's editable, what's locked and why. Variants per channel match the spec text.
- `BenefitDetailSection`, `ClaimParticipantsTab`, documents tab: wrap field inputs with `<AmendableField fieldKey=... />` that consults `useClaimEditability`. Locked fields render read-only with a lock icon + tooltip; correction-request channels show "Request Correction" instead of "Edit".
- `ClaimActionBar` actions become policy-driven: Edit Application, Request Correction, Save Amendment, Re-run Eligibility, Re-run Calculation, Submit for Decision, Supervisor Override, Reopen for Amendment.
- `AmendmentDialog` (reason required when policy says so; supervisor approval gate when applicable).
- `CorrectionRequestDialog` (officer picks fields + message) and `AmendmentHistoryDrawer` (reads `bn_claim_amendment_log`).
- Stale banner: when `eligibility_stale` or `calculation_stale` is true, show "Claim data changed. Re-run eligibility and calculation."

## Phase 4 — Validation + tests

- Add `validateAmendmentConfig()` to the existing Config Validation runner: every product version has a policy row, public-enabled products allow corrections, lock stages set, field ownership present.
- Manual test script under `scripts/qa/bn-amendment-tests.md` covering the four channel scenarios in section 15.

## Out of scope (intentionally)

- Real claimant-portal screens for filling correction tasks (we expose the request + accept/reject inside the workbench; portal-side rendering stays for the public portal pass we deferred earlier).
- Migrating historical claims to backfill `application_channel` (existing values are kept; null treated as `STAFF_OFFLINE` for legacy admin display only — flagged in the banner).

## Technical notes

- All new tables: RLS **off** (project rule), GRANTs to `authenticated` + `service_role`.
- Field ownership table seeded for: `illness_start_date`, `illness_end_date`, `incapacity_dates`, `confinement_date`, `expected_delivery_date`, `funeral_date`, `deceased_*`, `wage_*`, `payment_method`, `bank_account_*`, plus participant identity keys. Anything not listed defaults to `STAFF_REVIEW` with `editable_until_status = 'DECISION_PENDING'`.
- `recordAmendment` is a Postgres function (`security definer`) so the audit-write-or-fail guarantee is atomic.
- TypeScript build must pass — all new types live in `src/types/bn/amendment.ts`.
