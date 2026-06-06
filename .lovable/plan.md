# Claimant Portal Apply — Product-Catalog-Driven Rework

Scope is large. Splitting into 5 sequential PRs so each ships as a reviewable unit. Nothing changes for internal staff flows.

---

## PR-1 — Catalog schema for public channel

Extend the existing product-catalog tables (no rebuild). All additions are nullable / default-safe so internal BN keeps working.

**`bn_product_channel_config`** — add columns (PUBLIC_ONLINE row per product version):
- `public_online_enabled boolean default false`
- `allowed_applicant_types text[]` — SELF, SURVIVOR, GUARDIAN, PAYEE, REPRESENTATIVE, FUNERAL_RESPONSIBLE_PERSON
- `allowed_subject_types text[]` — INSURED_PERSON, DECEASED_INSURED_PERSON, CHILD_DEPENDANT, BENEFICIARY, AWARD_HOLDER
- `applicant_must_equal_insured boolean default true`
- `allow_apply_for_self / _deceased / _child_dependant boolean`
- `allow_apply_as_guardian / _payee / _representative boolean`
- `allow_managed_contributor_selection boolean default false`
- `required_participant_roles text[]`
- `public_screen_template_id`, `assisted_screen_template_id`, `internal_screen_template_id` — FK to `bn_screen_template`
- `estimated_processing_days int`
- `public_intent_tags text[]` — `self`, `deceased`, `child`, `managed`, `funeral`, `not_sure` (used by Step 1 of the wizard)

**`external_user_person_link`** — confirm/extend:
- `relationship_type text` — SELF, GUARDIAN, PAYEE, REPRESENTATIVE, BENEFICIARY, APPLICANT_FOR, MANAGED_CONTRIBUTOR
- `verification_status text` — UNVERIFIED, PENDING, VERIFIED, REVOKED
- `is_primary boolean`, `verified_at timestamptz`, `verified_by text`
- Unique (`user_id`, `ssn`, `relationship_type`)

**`external_portal_feature_config`** — seed flag `people_i_manage_enabled` (super-admin toggle).

**Validation view** `v_bn_product_public_config_issues` — flags products with public_online_enabled = true but missing template, missing applicant types, conflicting self-only + other applicants, survivor/funeral without deceased role, public template referencing staff-only fields (joined to `bn_field_metadata.is_internal_only`), missing declaration / document checklist.

---

## PR-2 — `publicProductCatalogService`

`src/services/external/publicProductCatalogService.ts`:

- `getPublicAvailableProducts(ctx)` — joins `bn_product` + active `bn_product_version` + `bn_product_channel_config` where channel = PUBLIC_ONLINE and `public_online_enabled` and applicant type / intent tag matches `ctx`.
- `getPublicApplicationDefinition(productCode, ctx)` — pulls template + `bn_field_metadata` + `bn_doc_requirement` + `bn_product_participant_config` + external task config; returns a normalized `PublicApplicationDefinition`.
- `validatePublicApplicationContext(productCode, ctx)` — runs Step-2 gate (active version, channel on, applicant allowed, required participants resolvable, template exists).
- `getRequiredParticipants(productVersionId, ctx)`, `getRequiredDocuments(productVersionId, ctx)`.

Backed by Supabase reads only; no internal BN write paths touched.

Server-side enforcement lives in an edge function `public-benefits/apply-context` that re-validates the same rules before any insert — UI cannot bypass.

---

## PR-3 — Claimant Apply Wizard (`/claimant/apply`)

Replaces current placeholder. Three steps:

1. **Intent** — icon tiles: *Myself / Someone deceased / A child or dependant / Someone I manage / Funeral expenses / Not sure*. "Someone I manage" hidden when `people_i_manage_enabled = false`. Tile click sets `applicationContext.intent` + suggested applicant/subject types.
2. **Catalog** — calls `getPublicAvailableProducts(ctx)`. Renders persona-aware icon cards: name, short description, who-can-apply chip, required-docs summary, processing time, `Start application` CTA, disabled state with reason when validation fails. Lucide icons mapped per product code (Sickness → HeartPulse, Maternity → Baby, EI → Hammer, Age → Sun, Invalidity → Accessibility, Survivors → Users, Funeral → Flower2, NCP → HandHeart, Life Cert → ShieldCheck, School Cert → GraduationCap, EFT → Banknote).
3. **Application** — renders `<PortalFormRenderer productCode channel="PUBLIC_ONLINE" portalRole="CLAIMANT" applicationContext />`.

Examples wired from intent → product filter:
- `myself` → SELF intent tag → Sickness, Maternity, Age, Invalidity, NCP, Life Cert (pensioner-gated).
- `deceased` → Funeral, Survivors, EI Death.
- `child` → Survivors, School Certificate.

---

## PR-4 — `PortalFormRenderer` (public channel)

`src/portals/_shared/PortalFormRenderer.tsx` — generic; no hardcoded forms.

Sections in order, each driven by the resolved `PublicApplicationDefinition`:
- Participant lookup (Applicant / Insured / Deceased / Beneficiaries / Payee / Guardian / Representative) — only the roles in `required_participant_roles`.
- Benefit facts (fields from template, filtered to channel `PUBLIC_ONLINE` and `is_internal_only = false`).
- Document checklist (`bn_doc_requirement` for the version).
- Declaration block.
- External task notices ("Your employer will need to confirm…", "Your doctor will need to complete…") derived from `bn_product_participant_task_config`.

**Self-only contribution rule**: contribution prefill / summary banner is rendered only when `applicationContext.subjectIsSelfVerified === true`. Otherwise the section is omitted; the rendered field list strips fields tagged `requires_self_verified = true`.

Submit payload (unchanged shape from spec):
```
{ applicationContext, applicant, insuredPerson, deceasedInsuredPerson,
  beneficiaries, payee, guardian, representative,
  benefitFacts, documents, declaration }
```
POSTed to `public-benefits/apply` (existing edge function extended) which creates `bn_claim` + `bn_claim_application` + `bn_claim_participant` rows, evidence checklist, external tasks, workflow + audit logs.

---

## PR-5 — Managed people, dashboard, validation

- **People I Manage** page (`/claimant/managed/people`) only mounted when `people_i_manage_enabled = true`. CRUD on `external_user_person_link`. Verification flow writes audit row in `external_persona_audit`.
- **Server gate**: `public-benefits` edge function rejects any request with relationship not VERIFIED for non-SELF subjects, and 404s the managed-people endpoints when flag is off.
- **Dashboard tiles** added (icon-first, persona-filtered): *Apply for myself*, *Apply for someone else*, *People I Manage* (flag-gated), *Claims I submitted*, *Claims for me*, *Claims I manage*, *Pending tasks*. Counts come from existing `me/claim-buckets` endpoint.
- **Admin Catalog Validation** page surfaces `v_bn_product_public_config_issues` so configurators see public-channel misconfigurations before publishing.

---

## Verification matrix (end of PR-5)

| Scenario | Expected |
| --- | --- |
| Insured (SELF verified) opens Apply → Myself | Sickness/Maternity/Age/Invalidity/NCP visible; Funeral hidden |
| Same user opens Apply → Someone deceased | Funeral, Survivors, EI Death visible; Sickness hidden |
| Guardian opens Apply → Child/dependant | Survivors + School Cert visible; eligibility uses internal data, UI shows safe messages only |
| Funeral applicant (no SSN link) | Funeral form opens; no contribution panel anywhere |
| Claimant-only user (no SELF link) | Sickness/Age etc. show "We could not verify your record — eligibility checks unavailable"; contribution panel never renders |
| `people_i_manage_enabled = false` | Sidebar tile, /managed/people route, and managed-person endpoints all 404 |
| Direct POST to apply with mismatched applicant type | Edge function 403s |
| TypeScript build | Passes |

---

## Out of scope

- Rewriting internal BN claim intake (only public channel touched).
- New product authoring UI (only validation surface added).
- Replacing Supabase auth or the existing `public-benefits` function — extended, not rebuilt.
- Payment, letters, life-cert capture flows beyond exposing the apply entry point.

## Approval needed

Reply **approve** to start with PR-1 (schema migration). Each PR will be a separate, reviewable change.