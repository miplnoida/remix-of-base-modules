# SSB Policy Lifecycle & Effective Dating — Acceptance

Scope: Social Security Board — St. Kitts & Nevis.
Applies to: all `ssb_*_policy` tables introduced by SSB Implementation Setup.
Non-scope: no changes to BN / BEMA / IA / legacy tables. No new CRUD screens.

## 1. Lifecycle model

Every SSB policy row now carries:

| Field | Purpose |
| ----- | ------- |
| `status` | `DRAFT` \| `SCHEDULED` \| `ACTIVE` \| `RETIRED` \| `SUPERSEDED` |
| `effective_from` / `effective_to` | date window during which the row applies |
| `version_no` | monotonically increasing version within the same scope |
| `is_current` | latest published row for the scope (at most 1) |
| `supersedes_policy_id` | back-link to the version this row replaces |
| `approved_by` / `approved_at` | who approved and when |
| `retired_by` / `retired_at` / `retirement_reason` | retirement audit |

### Scope keys

Uniqueness of "the current policy" is enforced by partial unique indexes on
`(scope_keys) WHERE is_current`:

| Table | Scope keys |
| ----- | ---------- |
| `ssb_address_policy` | `profile_id, country_code` |
| `ssb_communication_policy` | `profile_id, template_code, channel` |
| `ssb_contribution_calendar_policy` | `profile_id` |
| `ssb_document_policy` | `profile_id, document_type_code, applies_to` |
| `ssb_financial_policy` | `profile_id, binding_kind, reference_code` |
| `ssb_identity_policy` | `profile_id, identity_type_code` |
| `ssb_legal_policy` | `profile_id, legal_reference_code, applies_to` |
| `ssb_numbering_policy` | `profile_id, entity_code` |
| `ssb_workflow_policy` | `profile_id, workflow_code, applies_to` |

## 2. Backfill

Existing rows are backfilled to `status = 'ACTIVE'`, `is_current = true`,
`version_no = 1`, `effective_from = created_at::date`. No rows are dropped.

## 3. Resolver — the only supported read path

Business modules **must not** query `ssb_*_policy` directly. They call
`src/services/ssb/ssbPolicyLifecycleService.ts`:

- `resolvePolicy(table, scope, asOfDate)` → the ACTIVE row whose
  effective window contains `asOfDate`; falls back to the current row.
- `resolveAllPolicies(table, profileId, asOfDate)` → all ACTIVE rows
  for a profile at that date.
- `getMemberRegistrationConfig(asOfDate)` — address + identity rules
  + member numbering + member documents.
- `getEmployerRegistrationConfig(asOfDate)` — address + employer
  numbering + employer documents + employer legal references.
- `getBenefitSetupConfig(asOfDate)` — identity, legal, documents,
  workflow, financial, communication, contribution calendar.

## 4. Lifecycle actions (also from `ssbPolicyLifecycleService`)

| Action | Behaviour |
| ------ | --------- |
| `createNewVersion` | Clones the source row as a `DRAFT`, `version_no + 1`, `supersedes_policy_id = source`. |
| `approvePolicy` | Records `approved_by`/`approved_at` without changing status. |
| `schedulePolicy` | Moves to `SCHEDULED` with a future `effective_from`. |
| `activatePolicy` | Marks the currently-active row for the same scope as `SUPERSEDED` (closes its `effective_to`), then flips the target row to `ACTIVE` + `is_current = true`. Partial unique index guarantees only one current row per scope. |
| `retirePolicy` | Sets `RETIRED`, `is_current = false`, `effective_to = today`, records reason. Never hard-deletes. |

All actions insert a row into `ssb_policy_audit` with `policy_table`,
`policy_id`, `action`, `actor`, `reason`, and a JSON `snapshot`.

## 5. UI

`/admin/ssb-setup` (SSB Implementation Setup) now advertises the lifecycle
contract in its Overview card. The section cards, tabs, and Benefits
Readiness gate are unchanged — no new screens were created. Detailed
per-policy Draft / Scheduled / Retire actions are exposed through the
service and can be surfaced inline in the section drawers as needed.

## 6. Acceptance checklist

- [x] Existing policy rows remain valid (backfilled to `ACTIVE` v1).
- [x] Only one active policy per scope + date is possible
      (partial unique index on `is_current`).
- [x] Old policies are retained (`SUPERSEDED` / `RETIRED`, never deleted).
- [x] Future-dated policies can be scheduled (`SCHEDULED` +
      `effective_from > today`).
- [x] Business modules consume the resolver, not raw tables
      (documented above; enforced by code review).
- [x] Audit row is written for create-draft / approve / schedule /
      activate / retire / supersede.
- [x] No BN / BEMA / IA / legacy tables were changed.
- [x] No duplicate screens introduced.
