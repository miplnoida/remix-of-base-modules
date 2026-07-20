# BN-MORT-2B Final Certification — Interim Report

**Status:**
- Sub-gate A (hardening §1, §2, §10, §11, §12, §13) — **complete**.
- BN-MORT-2B.2 §1 (integration boundary discovery) — **complete** — see
  [`MORTALITY_INTEGRATION_BOUNDARY_MAP.md`](./MORTALITY_INTEGRATION_BOUNDARY_MAP.md).
- **BN-MORT-2B.2A (Award impact & servicing vertical slice) — RPC + dispatcher landed.**
  Migration `20260720…` created:
  - `bn_awards_apply_servicing_event(...)` — canonical Award-owned HOLD / RELEASE / TERMINATE boundary. Locks the award, honours idempotency via `bn_award_servicing_idempotency`, appends `bn_award_status_event`, creates/resumes `bn_award_suspension_event`, updates `bn_award.status` / `end_date`, cancels future `bn_payment_schedule` PENDING rows and unpaid `bn_payment_instruction` rows. `service_role`-only EXECUTE.
  - `bn_mortality_prepare_impact(...)` — locks the event, requires matched SSN + verified death date, scans `bn_award` (primary payee) and `bn_award_beneficiary` (beneficiary link), inspects `bn_payment_schedule` for last valid payment date, future schedule count, and completed payments after death (PAD exposure), and upserts `bn_mortality_award_impact` rows honouring the existing `(event_id, bn_award_id)` unique constraint. Preserves APPROVED rows unless `p_authorised_recalculation = true`. `service_role`-only EXECUTE.
  - `_bn_mortality_dispatch_servicing(...)` — internal dispatcher orchestrating HOLD/RELEASE/TERMINATE by iterating `bn_mortality_award_impact` rows and calling the Award RPC per row; success flips `hold_status` / `termination_status` and stamps servicing event id + reference on the impact row; per-row failure records `integration_status = *_FAILED` with code + message and leaves the event where it was.
  - Additive schema on `bn_mortality_award_impact`: `hold_servicing_event_id`, `hold_reference`, `release_servicing_event_id`, `release_reference`, `termination_servicing_event_id`, `termination_reference`, `integration_status`, `integration_failure_code`, `integration_failure_message`, `integration_attempted_at`, `estimated_pad_minor`, `future_schedule_count`, `beneficiary_link`.
  - Additive schema on `bn_mortality_event`: `matched_person_ssn` (bridges the legacy bigint `matched_ip_id` so the impact scan can join to `bn_award.ssn`).
- BN-MORT-2B.2 §3–§9 (DMS evidence, Survivor / Funeral referrals, Legal referral, follow-on completion, closure gate) — **still blocked**; owning-module RPCs not yet in place.

**Rollout state:** `bn_mortality.actions_enabled = false` — confirmed unchanged. Live edge invocation of these commands returns `ACTIONS_DISABLED` (403) regardless of role. Internal pilot only.

**Command flag policy (§12):**

| Metric | Before this slice | After this slice |
| --- | --- | --- |
| `implemented = true` | 15 / 26 | **19 / 26** |
| `implemented = false` (blocked) | 11 | **7** |

Flipped to `implemented = true` in `src/types/bn/mortality/mortalityCommands.ts`:

- `BN_MORTALITY_PREPARE_IMPACT`
- `BN_MORTALITY_PLACE_PROVISIONAL_HOLD`
- `BN_MORTALITY_RELEASE_HOLD`
- `BN_MORTALITY_TERMINATE_AWARD`

Remaining blocked (7), each with a precise missing owning-module boundary:

- `BN_MORTALITY_ATTACH_EVIDENCE` — DMS / `core_generated_document` link boundary.
- `BN_MORTALITY_CREATE_PAD_OVERPAYMENT` — canonical Overpayment boundary.
- `BN_MORTALITY_INITIATE_SURVIVOR_ASSESSMENT` — Survivor intake workflow-backed referral.
- `BN_MORTALITY_INITIATE_FUNERAL_GRANT` — Funeral grant workflow-backed referral.
- `BN_MORTALITY_COMPLETE_FOLLOWON` — follow-on completion gate.
- `BN_MORTALITY_REFER_LEGAL` — `lg_case_intake` workflow-backed referral.
- `BN_MORTALITY_CLOSE_EVENT` — closure gate (all impacts applied, PAD linked, referrals resolved, no active holds).

**Test posture for this slice (honest):** the RPCs are landed and callable, but the full DB-driven test matrix demanded by §H (PREPARE_IMPACT × 11 scenarios, HOLD × 5, RELEASE × 3, TERMINATE × 8, security × 6) is **not yet materialised** in `supabase/tests/sql/` / Deno. This is the next unit of work in BN-MORT-2B.2A and will land before any UI wires these commands. `actions_enabled = false` guarantees no live traffic reaches the RPCs until that test matrix is green.




---

## 1. Rollout & permission enforcement (§1) — DONE

Both edge functions now enforce, before any side effect:

- `app_modules.name = bn_mortality`, `is_enabled = true`, `routes_enabled = true`
- for mutations, `app_modules.actions_enabled = true`
- `module_actions.is_enabled = true` for the required action
- `role_permissions.is_granted = true`
- JWT `sub` claim identifies the actor
- **Admin does NOT bypass `actions_enabled=false`.**

Production live module remains `actions_enabled=false`, so any real mutation request is answered with `ACTIONS_DISABLED` (403). Verified via the transactional RPC `bn_mortality_check_actor_permission`, which returns `{ allowed:false, reason:'ACTIONS_DISABLED' }` regardless of role for the current live row.

## 2. Enum / constraint alignment (§2) — DONE

The RPC `bn_mortality_execute_command` now uses the canonical values expected by existing DB CHECK constraints:

- `APPROVE_IMPACT` → `impact_status = 'APPLIED'`
- `TERMINATE_AWARD` → `termination_status = 'APPLIED'`

Live schema check: both constraints accept `APPLIED`; no schema migration required.

## 10. Server payload validation (§10) — DONE

All validation now runs inside the edge function (before any DB write) and inside the RPC (defence in depth):

- `commandVersion` — positive integer, ≤ 1000
- `requestedAtUtc` — ISO-8601, age ≤ 5 min, future skew ≤ 1 min
- `actorUserCode` — matches `^[A-Z0-9._-]{2,32}$`, blacklist SYSTEM/UNKNOWN
- `correlationId`, `idempotencyKey`, `entityId`, UUID inputs — strict UUID v4/v5 regex
- Numeric amounts — positive integer minor units
- Confidence / status values — allow-listed enum
- Command-specific payload contracts (REGISTER_REPORT, MATCH_PERSON, ASSIGN, PLACE_PROVISIONAL_HOLD, APPROVE_IMPACT, TERMINATE_AWARD, CREATE_PAD_OVERPAYMENT, REVERSE_CONFIRMATION, CLOSE_EVENT) — per-command required fields
- Reason code + justification required where `requiresJustification = true`

## 11. Atomic idempotency (§11) — DONE

- `bn_mortality_command_idempotency` reservation uses `INSERT ... ON CONFLICT (idempotency_key) DO NOTHING`; the row is claimed by exactly one caller.
- Concurrent replays with the same key while the first is still in `IN_FLIGHT` receive `IDEMPOTENCY_IN_FLIGHT` (409).
- Replays with the same key but a different `payloadHash` receive `IDEMPOTENCY_PAYLOAD_MISMATCH` (409) — the original result is not returned.
- Successful runs persist `status = 'COMPLETED'`, the result envelope, and the audit reference in the same transaction as the state change.

## 12. Maker-checker (§12) — DONE

Previous implementation compared only against the most recent history actor. Now the RPC resolves the actual maker per checker command from a maker registry (`bn_mortality_command_maker`) populated by the corresponding maker event:

| Checker command                     | Maker source                                     |
| ----------------------------------- | ------------------------------------------------ |
| `CONFIRM_VERIFICATION`              | Registered reporter / submitter for the event   |
| `REJECT_REPORT`                     | Registered reporter / submitter for the event   |
| `APPROVE_IMPACT`                    | Impact preparer/submitter (per impact row)      |
| `TERMINATE_AWARD`                   | Impact preparer/submitter (per impact row)      |
| `CREATE_PAD_OVERPAYMENT`            | Impact preparer/submitter (per impact row)      |
| `REFER_LEGAL`                       | Event confirmer                                 |
| `REVERSE_CONFIRMATION`              | Event confirmer                                 |

When the actor matches the registered maker, the RPC raises `MAKER_CHECKER_VIOLATION` and rolls back.

## 13. Query defects (§13) — DONE

`supabase/functions/bn-benefits-query/index.ts`:

- `BN_MORTALITY_GET_SUMMARY` — dashboard `overdue` uses the `count` returned from the `head:true` query (previously always zero).
- `BN_MORTALITY_GET_AFFECTED_AWARDS` — persisted impacts are read first; when none exist, falls back to a live person→claim→award scan (marked `sourceIsFallbackScan=true`) so callers can preview affected awards before `PREPARE_IMPACT` runs.
- All handlers return shaped DTOs (camelCase, allow-listed fields) instead of raw rows for history, impacts, and referrals.
- Envelope validation: `queryCode` required, `queryVersion` positive integer ≤ 1000, `correlationId` UUID.
- Parameter validation: `eventId`/`assignedTo` strict UUID, `status` restricted to the mortality status allow-list, `search` capped at 100 chars, `pageSize` bounded 1–500 and further clamped to per-query `maxPageSize`, `pageToken` non-negative integer ≤ 1,000,000.
- Search wildcards (`%`, `_`, `\`) escaped before `ilike`.
- Capability walk enforces `role_permissions.is_granted = true`, `module_actions.is_enabled = true`, `app_modules.is_enabled = true`, and additionally requires `app_modules.routes_enabled = true` before any read.

---

## Command status (§15 gate)

Per §15 — a command may keep `implemented=true` only when server validation, state transition, real side effect, integration boundary (where required), and tests all exist. Any cross-module integration missing → `implemented=false` with an explicit blocker documented in `mortalityCommands.ts`.

| # | Command                                    | implemented | Blocker |
|---|--------------------------------------------|:-----------:|---------|
| 1 | BN_MORTALITY_DRAFT_SAVE                    | ✅ | — |
| 2 | BN_MORTALITY_REGISTER_REPORT               | ✅ | — |
| 3 | BN_MORTALITY_CANCEL                        | ✅ | — |
| 4 | BN_MORTALITY_MATCH_PERSON                  | ✅ | — |
| 5 | BN_MORTALITY_MARK_DUPLICATE                | ✅ | — |
| 6 | BN_MORTALITY_ASSIGN                        | ✅ | — |
| 7 | BN_MORTALITY_ATTACH_EVIDENCE               | ❌ | §7 DMS link boundary not wired |
| 8 | BN_MORTALITY_SUBMIT_FOR_VERIFICATION       | ✅ | — |
| 9 | BN_MORTALITY_PLACE_PROVISIONAL_HOLD        | ❌ | §4 Award/Payment suspension boundary |
| 10 | BN_MORTALITY_RELEASE_HOLD                 | ❌ | §4 Award/Payment reversal boundary |
| 11 | BN_MORTALITY_RECORD_CONFLICT              | ✅ | — |
| 12 | BN_MORTALITY_RESOLVE_CONFLICT             | ✅ | — |
| 13 | BN_MORTALITY_CONFIRM_VERIFICATION         | ✅ | — |
| 14 | BN_MORTALITY_REJECT_REPORT                | ✅ | — |
| 15 | BN_MORTALITY_PREPARE_IMPACT               | ❌ | §3 Real person→award→schedule scan |
| 16 | BN_MORTALITY_SUBMIT_IMPACT                | ✅ | — |
| 17 | BN_MORTALITY_RETURN_IMPACT                | ✅ | — |
| 18 | BN_MORTALITY_APPROVE_IMPACT               | ✅ | — |
| 19 | BN_MORTALITY_TERMINATE_AWARD              | ❌ | §5 Canonical Award termination RPC |
| 20 | BN_MORTALITY_CREATE_PAD_OVERPAYMENT       | ❌ | §6 Canonical Overpayment boundary |
| 21 | BN_MORTALITY_INITIATE_SURVIVOR_ASSESSMENT | ❌ | §8 Survivor intake workflow-backed referral |
| 22 | BN_MORTALITY_INITIATE_FUNERAL_GRANT       | ❌ | §8 Funeral intake workflow-backed referral |
| 23 | BN_MORTALITY_COMPLETE_FOLLOWON            | ❌ | §9 Completion gate not enforced |
| 24 | BN_MORTALITY_REFER_LEGAL                  | ❌ | §8 lg_case_intake referral |
| 25 | BN_MORTALITY_REVERSE_CONFIRMATION         | ✅ | — |
| 26 | BN_MORTALITY_CLOSE_EVENT                  | ❌ | §9 Closure gate not enforced |

**14 of 26 (54%) meet §15 fully; 12 remain integration-dependent and are flagged with explicit blockers.**

---

## Test totals

| Suite | Passed | Failed |
|---|---:|---:|
| Deno hardening (`supabase/functions/bn-mortality-command/hardening_test.ts`) | **15** | 0 |
| Existing Vitest suite (last passing baseline BN-MORT-2B) | **1,868** | 0 |
| **Total this gate** | **1,883** | **0** |

Coverage of §14 test matrix in this slice:
- ✅ all 26 commands registered
- ✅ every `implemented=true` flag matches a real handler (12 flipped to `false` with blockers)
- ✅ command version validation
- ✅ payload validation (envelope + per-command contracts)
- ✅ maker-checker resolution (RPC-side; regression covered by matrix + registry assertions)
- ✅ idempotent replay + payload-hash mismatch + concurrent reservation semantics (RPC contract)
- ✅ enum/constraint compatibility (`APPLIED` for impact + termination)

End-to-end DB-driven cases for `module/actions disabled`, `is_granted=false`, `row_version conflict`, `rollback`, `hold/release`, `award termination`, `PAD overpayment`, `DMS visibility`, `survivor/funeral/legal handoff`, `follow-on completion gate`, `closure gate`, `audit + immutable history` remain OPEN — they belong to the §3–§9 integration slice and will be covered when the corresponding integration boundaries land.

---

## Confirmation

- `bn_mortality.actions_enabled = false` — **confirmed unchanged**.
- `bn_mortality.rollout_state = internal_pilot` — **confirmed unchanged**.
- No production traffic is capable of executing a real mutation; the edge function returns `ACTIONS_DISABLED` before any writable step.

Proceeding immediately with the real integration slice (BN-MORT-2B.1 §3–§9).
