# BN Long-Term Benefits / Pensioner Register

This is a large feature (menu group, 7 pages, award-creation hook, product config, communications, validation). I'll deliver it in 4 focused phases so each is reviewable. Existing tables (`bn_award`, `bn_award_beneficiary`, `bn_payment_schedule`, `bn_life_certificate`, `bn_medical_review_schedule`, `bn_award_suspension_event`, `bn_overpayment`) are already in the database — no schema changes needed for core data. Only small additive columns for product classification.

## Phase 1 — Navigation, Pensioner Register list, Award 360 shell
- Add **Long-Term Benefits** group in `bnMenuItems` with 7 routes.
- Register routes in the BN router (`/bn/awards`, `/bn/awards/:id`, `/bn/awards/survivors`, `/bn/life-certificates`, `/bn/medical-reviews`, `/bn/award-suspension`, `/bn/overpayments`, `/bn/awards/adjustments`).
- Build `PensionerRegister.tsx` reading `bn_award` joined to `ip_master` (name/ssn) and `bn_product` (benefit code/type). Filters: benefit type, status, award type, life-cert due/overdue, medical review due, survivors only, payment hold, SSN/name. Range pagination (1k chunks per memory rules).
- Build `Award360.tsx` shell with all 13 tabs scaffolded; load `bn_award` + related rows in parallel.

## Phase 2 — Award-level data tabs + Survivor Awards
- Award 360 tabs hydrated: Header, Pensioner, Claim Link, Product Version, Beneficiaries (CRUD on `bn_award_beneficiary`), Payment Schedule (`bn_payment_schedule`), Payment History (`bn_payment_instruction`), Life Certificates, Medical Reviews, Suspensions, Overpayments, Communications (existing `bn_communication_log`), Audit (`system_audit_trail`).
- Dedicated **Survivor Awards** page filtering bn_award by survivor benefit codes; shows beneficiaries with share %/amount, guardian, payment details. Actions: add, end, adjust share, suspend, resume.

## Phase 3 — Servicing screens + Award creation hook
- `LifeCertificates.tsx`, `MedicalReviews.tsx`, `AwardSuspensions.tsx`, `Overpayments.tsx`, `AwardAdjustments.tsx` — list+filter+actions wired to the existing tables.
- Service `awardCreationService.ts`: on claim approval (called from `claimWorkbenchService.approveClaim`), if product is LONG_TERM: insert `bn_award`, `bn_award_beneficiary` (survivor), `bn_payment_schedule`, life-cert and medical-review schedules per product policy, fire `bn.claim.approved` via `workflowCommunicationBridge`, link `bn_claim.award_id`.
- Claim Workbench: show "Linked Award" panel + **Open Award 360** button.

## Phase 4 — Product config + Validation + Communication events
- Migration: add columns to `bn_product_version`: `benefit_duration_type` (SHORT_TERM/LONG_TERM/ONE_TIME_GRANT), `award_creation_rule`, `payment_frequency`, `review_policy`, `life_certificate_policy`, `medical_review_policy`, `survivor_beneficiary_policy` (jsonb where appropriate).
- Product Editor: new **Servicing** tab with these fields, conditionally required for LONG_TERM.
- BN Configuration Validation: per-product checks for award rule, payment schedule, life-cert/medical-review when required, comm templates, survivor policy for Survivors benefit.
- Seed `bn_comm_event` codes for the 7 servicing events; ensure templates exist in `notification_templates`.

## Technical notes
- Follow existing patterns: `useBlockingMutation`, `SearchableSelect`, `BnActionToolbar`, `submittingId` for multi-row, `isAuthReady && isAuthenticated` gates, `formatDateForDisplay`, `user_code` for createdby fields.
- No RLS (per project rule). No mock data — read from Supabase only. PII masking honored on SSN/name.
- Pagination via `.range()` for UI; chunked while-loop only if processing.

## Out of scope (will not change)
- No edits to `src/integrations/supabase/client.ts` or auto-gen types beyond what the migration regenerates.
- No changes to short-term claim flow except the approval branch that decides award vs. payment instruction.

## Deliverable size
~25–30 new/edited files across the 4 phases. I'll start Phase 1 immediately upon approval and check in after each phase so you can validate before the next.
