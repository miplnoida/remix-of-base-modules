## BN Participant Type Lifecycle & Cleanup

Redesign Participant Type management with explicit lifecycle (DRAFT/ACTIVE/RETIRED), reference-data sourcing, product usage validation, and a cleaned-up admin UI.

### 1. Database changes (migration)

**`bn_country_participant_type`** — add lifecycle + usage tracking:
- `lifecycle_status` TEXT CHECK IN ('DRAFT','ACTIVE','RETIRED') DEFAULT 'ACTIVE'
- `retired_at` TIMESTAMPTZ, `retired_by` TEXT, `retired_reason` TEXT
- Backfill: rows with `is_active=true` → ACTIVE; else RETIRED

**`bn_reference_value`** — already has `is_active`; use as lifecycle source for ref groups. Seed/upsert for SKN to ensure all 13 recommended types are ACTIVE in `BN_PARTICIPANT_TYPE`; mark any duplicates/unclear ones (e.g. legacy `APPLICANT`, `REPRESENTATIVE` if redundant) as inactive.

**New view `v_bn_participant_type_usage`** — counts per (country_code, type_code):
- `product_usage_count` from `bn_product_participant_config.required_roles` + `allowed_applicant_kinds` + `optional_roles` (jsonb array contains)
- `historical_claim_count` from `bn_claim_participant.participant_type`
- `active_product_count` joined on `bn_product_version.status='ACTIVE'`

**Seed for SKN** (insert tool, not migration): ensure 13 recommended types exist as ACTIVE rows in `bn_country_participant_type` for country_code='KN'.

### 2. Service layer

- `countryParticipantTypeService.ts`:
  - `listForSelection(countryCode, { includeRetired=false })` — used by Product Catalog & Online Portal pickers; filters `lifecycle_status='ACTIVE'`
  - `listAll(countryCode)` — admin screen, returns all statuses + usage counts via view
  - `retire(id, reason, userCode)` / `reactivate(id, userCode)` / `markDraft(id)`
  - `validate(row)` — returns warnings array per spec §8
- `referenceDataService.ts`: no schema change; ensure `listReferenceValues` already filters `is_active` (it does).

### 3. UI: Country Participant Types screen (`CountryParticipantTypes.tsx`)

Replace existing list/editor with a richer table:

| Status badge | Type code (ref) | Role category | Country enabled | Online rules | Proof req | Product usage | Historical usage | Actions |

- Status badge: DRAFT / ACTIVE / RETIRED with color via `StatusBadge`
- "Show retired" toggle (default off)
- Row actions: Edit · Retire · Reactivate · Mark Draft
- Retire dialog: requires reason; blocks if no replacement and active products reference it (warn-only, force option)
- Editor: lifecycle field + existing fields; inline warnings panel from `validate()`
- "Reference value" column shows whether the `type_code` still exists & is active in `BN_PARTICIPANT_TYPE` ref group; flag if missing
- Disable selecting retired ref values when creating new rows

### 4. Product Catalog (`PublicFormRulesTab.tsx` and product participant config)

- Replace `useReferenceValues('BN_PARTICIPANT_TYPE')` source with `listForSelection(countryCode)` from country participant types (ACTIVE only)
- On load of an existing product, if `required_roles`/`allowed_applicant_kinds` include a RETIRED code, show inline warning badge "Retired — replace before publish"
- Block publish/save of a NEW version that references RETIRED codes (validation in save handler)
- Seed default participant config for the 6 example products (Sickness, Maternity, Age Pension, Funeral Grant, Survivors, Medical Expense) via insert tool

### 5. Online portal gate (`onlineResponsePortalGate.ts` + intake)

- When resolving allowed applicant kinds for a public/online form, filter by `lifecycle_status='ACTIVE'`
- Historical claim views: read raw `participant_type` value; render label from ref value even if retired, append "(retired)" suffix

### 6. Validation rules surfaced in admin (§8)

Compute in `validate()` and render in a "Warnings" panel on the participant type list and editor:

1. Active product version references RETIRED type
2. Online application channel exposes RETIRED type (`bn_product_channel_config`)
3. Type missing `role_category`
4. Type has `requires_relationship_proof` / `requires_authority_proof` true but no `proof_requirement_code`
5. Type has `can_receive_payment=true` but `requires_identity_verification=false`

Surface count badge in sidebar of the screen.

### 7. Files touched

```text
supabase/migrations/<ts>_participant_type_lifecycle.sql    (new)
src/services/bn/countryParticipantTypeService.ts            (new or extend)
src/types/bn.ts                                             (lifecycle fields)
src/pages/bn/config/country/CountryParticipantTypes.tsx     (redesign)
src/components/bn/config/PublicFormRulesTab.tsx             (active-only + warnings)
src/components/bn/country/ParticipantTypeSelector.tsx       (filter retired)
src/lib/onlineResponsePortalGate.ts                         (active-only)
src/integrations/supabase/types.ts                          (regenerated)
```

### 8. Acceptance verification

- Manual: open Country Participant Types — see status column, retire toggle works, retiring blocks new product selection
- Open Product Catalog → participant config — retired types not in dropdown, existing usages flagged
- Open historical claim with retired participant — still renders with "(retired)" label
- Warnings panel lists at least the §8 cases when seeded

### Non-goals

- No changes to legacy `cl_head` participant data
- No new reference groups beyond what already exists
- Document Library linkage stays out of scope (handled by earlier `bn_country_participant_proof_link`)
