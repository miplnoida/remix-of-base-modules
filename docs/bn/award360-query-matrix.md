# Award 360 — Query Matrix

Canonical live-schema mapping. Update this file together with the service selects and the schema-aware test fixtures whenever a column is added/renamed.

## Scoping keys

| Table | Scope column | Notes |
|-------|--------------|-------|
| `bn_award` | `id` | Award primary key. |
| `bn_award_beneficiary` | `bn_award_id` | never `award_id`. |
| `bn_payment_schedule` | `bn_award_id` | |
| `bn_payment_instruction` | `award_id` | legacy field name preserved. |
| `bn_life_certificate` | `bn_award_id` | |
| `bn_medical_review_schedule` | `bn_award_id` | order by `scheduled_date`. |
| `bn_award_suspension_event` | `bn_award_id` | status column is `status` (not `event_status`); ordered by `entered_at`. |
| `bn_overpayment` | `bn_award_id` | |
| `bn_communication_log` | `claim_id` + `context @> { award_id }` | Requires award→claim lookup first. |
| `bn_award_status_event` | `bn_award_id` | |
| `bn_award_rate_history` | `bn_award_id` | |
| `core_audit_log` | `entity_type='bn_award' AND entity_id=<award>` | Gated by `CENTRAL_AUDIT_VIEW`. |
| `bn_claim*` (queue/eligibility/calculation/decision/evidence/event/note) | `claim_id` | Resolved from `bn_award.bn_claim_id`. |
| `ip_master` | `ssn` from `bn_award.ssn` | Derive `isDeceased` from `status` (no `is_deceased` column). |
| `ip_depend` | `ssn` from award holder | Verified via `firstname`/`surname`/`status`. |
| `bn_product` | `id` | uses `benefit_code`/`benefit_name`; no `product_code`. |
| `bn_product_version` | `id` | Explicit select includes `formula_template_id`, `payment_frequency`, etc. |
| `bn_claim` | `id` | `assigned_to` (not `assigned_officer`); no `workbasket_id` — see queue table. |
| `bn_claim_queue_assignment` | `claim_id` filter `is_active=true` | Source of workbasket/SLA. |

## Removed / never-selected columns

These names surfaced historically but do **not** exist in the live schema and must never appear in a `.select`, `.eq`, `.order`, `.not`, or `.contains`:

- `bn_award_suspension_event`: `event_status`, `created_at`, `proposed_by`
- `bn_payment_instruction`: `paid_at`, `instruction_number`, `scheduled_date`
- `bn_payment_schedule`: `next_run_date`, `last_run_date`
- `bn_communication_log`: `template_code`, `award_id`
- `bn_overpayment`: `award_id`, `overpayment_reference`, `total_amount`
- `bn_claim`: `bn_product_version_id`, `assigned_officer`, `workbasket_id`
- `bn_product`: `product_code`
- `ip_master`: `residency_status`, `is_deceased` (derive from `place_of_residence` + `status`)
- `ip_depend`: `dependant_name` (use `firstname`/`surname`), `verified` (use `status`)

## Enforcement

- `src/__tests__/bn/award360/summarySchemaAlignment.test.ts` — mock boundary rejects unknown columns for summary service.
- `src/__tests__/bn/award360/award360SchemaCertification.test.ts` — cross-service static grep verifying no forbidden column string appears in any Award 360 service.
- `src/__tests__/bn/award360/mapping.test.ts` — asserts canonical selects on core lists.
