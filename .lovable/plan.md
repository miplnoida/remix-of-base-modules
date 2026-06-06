
# Rework Public Benefit Forms — Participant-Role Aware, Config-Driven

This is a large, cross-cutting change touching DB, Product Catalog config, public portal renderer, intake RPC, Claim Workbench, and validation. Below is the staged plan. I recommend executing in phases and approving each phase before moving on.

---

## Phase 0 — Audit & legacy marking (read-only)

1. Inventory current public/legacy form routes:
   - `/newbenefit/apply`, `/newbenefit/apply/:benefitType`, `/newbenefit/my-claims`
   - `/nbenefit/application/:benefitType`, `/nbenefit/short-term/*`, `/nbenefit/long-term/*`
   - `/bn/config/products`, `/bn/config/screen-setup`, `/bn/intake/register`
   - `/claimant/apply/:productCode` (current PublicBenefitApplication)
2. Add a "Legacy — do not use for new products" banner to `/newbenefit/*` and `/nbenefit/*` and stop linking to them from the Claimant Portal. They remain mounted for reference until removed.
3. Single supported public entry becomes:
   `/claimant/apply/:productCode` → `PortalFormRenderer` (new)

## Phase 1 — Participant model (DB)

`bn_claim_participant` already exists (id, claim_id, kind, display_name, ssn, employer_regno, provider_code, email, phone, status, …). Extend it:

- Add columns: `participant_role` (enum), `participant_type` (text), `relationship_to_insured` (text), `verification_status` (enum: UNVERIFIED, VERIFIED, REJECTED), `external_ref` (text), `payload jsonb`, `is_primary_applicant boolean`.
- New enum `bn_participant_role` with the 13 values listed in the request.
- Keep existing `kind` column for backward compatibility; new code reads/writes `participant_role`.
- New table `bn_product_participant_config` (per product version):
  `product_version_id, applicant_must_equal_insured, allowed_applicant_kinds[], required_roles[], optional_roles[], requires_deceased, requires_beneficiaries, requires_guardian_or_payee, requires_employer_task, requires_doctor_task, requires_school_task_when (jsonb), notes`.
- GRANTs to `authenticated` + `service_role`.

## Phase 2 — Product Catalog UI

In `src/pages/bn/config/products/*` (Product Assembly), add a new tab **"Participants & Public Form Rules"** that edits `bn_product_participant_config` for the selected version. Pre-seed defaults for the 11 product families described (Sickness, Maternity, EI, Funeral, Age, Invalidity, Survivors, NCP, Life Cert, School Cert, EFT Update).

## Phase 3 — Public Form Renderer

Create `src/components/external/PortalFormRenderer.tsx` that:

1. Loads product version + `bn_product_participant_config` + `bn_screen_template` + `bn_field_metadata` + `bn_doc_requirement` for channel `PUBLIC_ONLINE`.
2. Renders **Step 0 — "Who are you applying for?"** with options filtered by `allowed_applicant_kinds`.
3. Based on selection, shows the appropriate smart fields:
   `APPLICANT_SSN_LOOKUP`, `INSURED_PERSON_SSN_LOOKUP`, `DECEASED_PERSON_SSN_LOOKUP`, `BENEFICIARY_SELECTOR`, `GUARDIAN_PAYEE_DETAILS`, `EMPLOYER_LOOKUP`, `DOCTOR_PROVIDER_TASK_INVITE`.
   New smart-field types added to `smartFieldRegistry.ts`.
4. Renders remaining configured sections from `bn_screen_template` for channel `PUBLIC_ONLINE` (no hardcoded sections).
5. Enforces document checklist + declaration before submit.

Replace `PublicBenefitApplication.tsx`'s body to mount `PortalFormRenderer` instead of `ApplicationFormEngine` for `PUBLIC_ONLINE`.

## Phase 4 — Submission payload + intake RPC

Public submit payload shape:
```
{ applicant, insuredPerson, deceasedInsuredPerson, beneficiaries[], payee, guardian, employer, doctorProvider, benefitFacts, documents[], declaration }
```
Update edge function `public-benefits` (or call existing `bn_submit_claim_application` RPC) to:
- Create `bn_claim` + `bn_claim_application`
- Insert one `bn_claim_participant` per non-null section with proper `participant_role`
- Snapshot person/deceased/beneficiaries into `bn_claim_person_snapshot` / `bn_claim_employer_snapshot`
- Materialize evidence checklist + external tasks via existing `bn_materialize_external_tasks`
- Start workflow + audit

## Phase 5 — Claim Workbench Participants tab

Update `Participants` tab in claim workspace to group by role:
Applicant · Insured Person · Deceased IP · Beneficiaries · Payee/Guardian · Employer · Doctor/Provider · School/Funeral Home, with task status + documents per row.

## Phase 6 — Claimant Portal dashboard

`/claimant/dashboard` shows four lists, each via a scoped query against `bn_claim_participant`:
- My own claims (role IN APPLICANT+INSURED_PERSON, same SSN)
- Claims I submitted for someone else (APPLICANT but not INSURED_PERSON)
- Claims where I am beneficiary
- Claims where I am payee/guardian
Plus pending actions = `bn_external_task` rows assigned to caller.

## Phase 7 — Security scoping

`public-benefits` edge function `/me/*` endpoints filter by `caller.ssn` matching any `bn_claim_participant.ssn` for that claim (any role) — not just CLAIMANT kind. Add `getClaimsForCaller(ssn)` helper.

## Phase 8 — Configuration validator

New script/page warning when a product version has `PUBLIC_ONLINE` enabled but:
- no participant config row
- Survivors without `requires_deceased`
- Funeral without `requires_deceased`
- Sickness/Maternity without employer/doctor task flags
- Public screen template exposes a field flagged `staff_only`
- No declaration field
- No document checklist

Surface in Product Catalog detail page as a warnings panel.

## Phase 9 — Verification

Manual test matrix covering all 8 scenarios in the request.

---

## Technical notes

- DB: 1 migration adds enum + columns + new config table + GRANTs. No RLS (per project rule — role-based only).
- Edge function: extend `supabase/functions/public-benefits/index.ts` with new submit handler + caller-scoped listing.
- Smart fields: extend `src/services/bn/registries/smartFieldRegistry.ts` with the 7 new role-lookup types.
- Legacy `/newbenefit` and `/nbenefit` routes remain mounted with a deprecation banner so existing links don't 404.

---

## Recommended execution order

Given scope (likely 15–25 file changes + 1 migration + edge function rewrite), I suggest shipping in 3 PRs:

1. **PR1 — Foundation:** DB migration (Phase 1) + smart-field registry + Product Catalog Participants tab (Phase 2).
2. **PR2 — Public renderer:** `PortalFormRenderer` + new submit edge handler + replace `/claimant/apply/:productCode` body (Phases 3–4).
3. **PR3 — Workbench + dashboard + validator:** Phases 5, 6, 8, plus security scoping (7) and verification pass (9).

Please confirm:
- (a) Approve plan as-is and start with **PR1**?
- (b) Approve and want me to push straight through all three PRs sequentially?
- (c) Any product-specific rule you want changed before I encode defaults in `bn_product_participant_config`?
