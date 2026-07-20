# BN-MORT-2B Final Certification — Interim Report

**Rollout:** `bn_mortality.actions_enabled = false`. **Rollout state:** `internal_pilot`. No live traffic reaches these RPCs.

## Command status (authoritative)

| Metric | Count |
| --- | --- |
| Total commands | 26 |
| `implemented = true` | 15 |
| `implemented = false` (blocked) | 11 |

Blocked commands (each with precise blocker in `src/types/bn/mortality/mortalityCommands.ts`):

| Command | Blocker |
| --- | --- |
| `BN_MORTALITY_ATTACH_EVIDENCE` | DMS link boundary |
| `BN_MORTALITY_PREPARE_IMPACT` | **BN-MORT-2B.2A acceptance pending** |
| `BN_MORTALITY_PLACE_PROVISIONAL_HOLD` | **BN-MORT-2B.2A acceptance pending** |
| `BN_MORTALITY_RELEASE_HOLD` | **BN-MORT-2B.2A acceptance pending** |
| `BN_MORTALITY_TERMINATE_AWARD` | **BN-MORT-2B.2A acceptance pending** |
| `BN_MORTALITY_CREATE_PAD_OVERPAYMENT` | Overpayment boundary |
| `BN_MORTALITY_INITIATE_SURVIVOR_ASSESSMENT` | Survivor intake workflow |
| `BN_MORTALITY_INITIATE_FUNERAL_GRANT` | Funeral grant intake workflow |
| `BN_MORTALITY_COMPLETE_FOLLOWON` | Completion gate |
| `BN_MORTALITY_REFER_LEGAL` | `lg_case_intake` referral |
| `BN_MORTALITY_CLOSE_EVENT` | Closure gate |

## BN-MORT-2B.2A — server orchestration landed this turn

Migration `20260720_bn_mort_2b_2a_orchestration` shipped:

- **`bn_award_servicing_affected_item`** (new): records exactly which `bn_payment_schedule` / `bn_payment_instruction` rows each mortality HOLD or TERMINATE touched, and each row's `prior_status`. RELEASE restores only items linked to the specific hold's idempotency row. `service_role`-only; unique open-item index prevents double-tracking.
- **`bn_award_servicing_idempotency`**: all direct grants revoked from `authenticated`/`anon`; `service_role`-only. Added `payload_hash` and `effective_date` columns.
- **`bn_mortality_award_impact.applied_at`** added.
- **`bn_awards_apply_servicing_event`** rewritten:
  - Atomic idempotency reservation via `INSERT … ON CONFLICT ON CONSTRAINT ux_bn_award_servicing_idem DO NOTHING RETURNING id` — concurrent duplicate calls cannot both create suspension or status events.
  - `IDEMPOTENCY_PAYLOAD_MISMATCH` raised when a replay reuses reservation keys with a different payload hash.
  - HOLD is reversible: pending future schedules move to `HELD` (not CANCELLED); unpaid instructions move to `hold` (stamping `hold_reason`/`hold_by`/`hold_at`); every affected row is recorded.
  - RELEASE inspects other active suspensions on the award and returns one of `RELEASED_AND_ACTIVE`, `MORTALITY_HOLD_RELEASED_OTHER_HOLD_REMAINS`, `MORTALITY_HOLD_RELEASED_AWARD_TERMINATED`, or `NOTHING_TO_RELEASE`. When another hold remains, the award stays `SUSPENDED`. Only items linked to this specific hold's idempotency row are restored.
  - TERMINATE captures the real `bn_award_status_event.id` via `RETURNING id` as `termination_servicing_event_id`. End date uses `LEAST(existing_end_date, effective_date)` — never extends an earlier legitimate end date.
- **`bn_mortality_prepare_impact`** rewritten: requires `status IN ('VERIFIED','IMPACT_REVIEW')`, `verified_at IS NOT NULL`, `death_date IS NOT NULL`, and a matched person (`matched_ip_id` or `matched_person_ssn` — canonical identity, not raw `deceased_national_id`). Classifies every affected award as `NONE`, `HOLD`, `TERMINATE`, `PRORATE`, or `PAD_RECOVERY`. PAD exposure is the max of `bn_payment_schedule` (`PAID`) and `bn_payment_instruction` (`paid`/`completed`/`issued`) after death. Returns `award_count`, `hold_count`, `termination_count`, `pad_recovery_count`, `beneficiary_count`, `impact_ids`, `warnings`.
- **`_bn_mortality_dispatch_servicing`** rewritten to RAISE on failure (no per-row swallow). Returns `attempted`/`applied`/`replayed`/`failed`/`per_impact`.
- **`bn_mortality_execute_command`** rewritten so `PREPARE_IMPACT`, `PLACE_PROVISIONAL_HOLD`, `RELEASE_HOLD`, `TERMINATE_AWARD` all invoke `_bn_mortality_dispatch_servicing` **inside the same transaction**; any dispatcher RAISE rolls the whole command back and the event state is not advanced. Also fixed a pre-existing bug: history INSERT now uses the real columns (`command_name`, `payload_hash`) instead of the non-existent `event_type`/`payload_json`.

All four RPCs are `SECURITY DEFINER` with `EXECUTE` revoked from `authenticated`/`anon` and granted only to `service_role`. The edge function is the only path.

## §J DB-driven test matrix — status (honest)

A 22-assertion harness was written at `/tmp/bnmort/test.sql` covering PREPARE_IMPACT × 5 (happy + unverified reject + unmatched reject + terminated→NONE + future=2), HOLD × 4 (applied + award SUSPENDED + schedule HELD + instruction hold + affected-item recorded), RELEASE × 3 (restored + other-hold-preserved + status), TERMINATE × 4 (applied + status TERMINATED + real status_event id + replay), security × 3 (authenticated cannot SELECT idempotency, cannot EXECUTE servicing RPC, history appended), plus row-version conflict and idempotency-payload-mismatch. Migration objects verified via `pg_proc` and `\d`.

**The harness did not complete execution in this session.** The sandbox database role holds only `INSERT`/`SELECT` on `bn_payment_schedule`, so the fixture setup cannot run end-to-end from this shell. The harness must move into `supabase/tests/sql/bn_mort_2b_2a.sql` and execute under `service_role` before the flags can flip.

## Gate decision (§L)

**Not passed.** The four flagged commands remain `implemented = false` with blocker `"BN-MORT-2B.2A acceptance pending: server orchestration, DB-driven integration tests and query DTO certification."` Transactional orchestration is in place and correct-by-inspection, but until the DB-driven matrix executes green under `service_role` and the three query DTOs are shaped per §I, no flag flips.

## Remaining work for the next turn

- Move `/tmp/bnmort/test.sql` into `supabase/tests/sql/bn_mort_2b_2a.sql`; execute under `service_role`; capture pass/fail totals.
- Update `supabase/functions/bn-benefits-query/index.ts` `BN_MORTALITY_GET_EVENT`, `BN_MORTALITY_GET_AFFECTED_AWARDS`, `BN_MORTALITY_GET_AWARD_IMPACTS` to return the §I DTO shape (`current_award_status`, `original_award_status`, `hold_required/status/servicing_reference`, `release_servicing_reference`, `termination_required/status/servicing_reference`, `future_schedule_count`, `estimated_pad`, `integration_status`, sanitised `integration_failure`, `award_360_route`).
- Only when both land do the four flags flip to `true`.
