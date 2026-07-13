# BN-SEC-S1C — Award Suspension Proposal & Approval Backend

**Status:** Implemented (dark-launched — `actions_enabled=false`).
**Scope:** Secure server lifecycle for **proposing, approving, rejecting, and withdrawing** an award-suspension request. **Does not apply the suspension to the award.**

## A. Pre-change findings

| Object | Finding |
| --- | --- |
| `bn_award` | `status` varchar; live values = `ACTIVE` only. Not modified by this epic. |
| `bn_award_suspension_event` | `entered_by` is **varchar (business code)** — cannot serve as trusted actor. `status` default `ACTIVE`. **0 live rows** — safe to add controlled vocabulary. |
| `bn_approval_policy` | Column `action_code` (not `action_name`); `policy_area`, `level`, `is_enabled`, `self_approval_allowed`, `approval_role`. No `award_suspension` rows exist. RPC returns `E_POLICY_NOT_CONFIGURED`. |
| `core_workflow_*` | All user identifiers are `uuid` → compatible with `auth.uid()`. Reused as-is. |
| `core_audit_log` | Reused (`actor_user_id uuid`, `correlation_id text`, `before_value`/`after_value` jsonb). |
| `app_modules.bn_award_suspension` | Present, 7 module actions already seeded. Was `actions_enabled=true` — flipped to `false` for dark launch. |
| Idempotency object | **None existed.** Confirmed by scanning `%command%receipt%` / `%idempoten%`. |
| Auth helpers | `is_admin(uuid)`, `has_permission(uuid,text,text)` present with expected signatures. |

## B. Schema changes

| Object | Change | Why | Duplicate avoided |
| --- | --- | --- | --- |
| `bn_award_suspension_event.proposed_by_user_id uuid` | Add column | `entered_by` is varchar — cannot be trusted for maker-checker | No parallel table |
| `bn_award_suspension_event.workflow_instance_id uuid` | Add column, FK to `core_workflow_instance` | Correlate case ↔ approval history | Reuses core workflow engine |
| `bn_award_suspension_event.correlation_id text` | Add column | End-to-end tracing | Reused across audit rows |
| `bn_award_suspension_event.row_version integer` | Add column, default 1 | Optimistic concurrency | — |
| `bn_award_suspension_event_status_chk` | Check constraint `PROPOSED / APPROVED / REJECTED / WITHDRAWN / ACTIVE / RESUMED` | Controlled vocabulary; keeps existing operational values valid | — |
| `ux_bn_award_suspension_open_case` | Partial unique index on `bn_award_id` where status ∈ (`PROPOSED`,`APPROVED`) | One open case per award | Rejected/withdrawn/completed rows unaffected |
| `core_command_receipt` | **New Platform-owned shared** table (no RLS; no direct grants) | Cross-module idempotency (unique on actor + command + key) | No existing equivalent was found |
| `app_modules.bn_award_suspension.actions_enabled` | Set to `false` | Dark-launch guard | — |
| `core_workflow_definition('BN_AWARD_SUSPENSION')` + 5 steps + 5 transitions | Seed | Reuses existing engine | No new workflow engine |

## C. RPC contracts

All four RPCs are `SECURITY DEFINER`, `SET search_path = public`, executed only by `authenticated` / `service_role`. Every RPC calls `_bn_susp_assert_module_enabled()` (→ `E_FEATURE_DISABLED`) and `_bn_susp_actor()` (→ `E_UNAUTHENTICATED`).

### `bn_award_suspension_propose_v1(p_award_id, p_reason_code, p_effective_from, p_narrative, p_idempotency_key, p_correlation_id)`
- **Permission:** `bn_award_suspension.propose` (or `is_admin`)
- **Source state:** `bn_award.status = ACTIVE`; no open suspension case.
- **Target state:** New `bn_award_suspension_event` (`PROPOSED`), workflow instance in `PENDING_APPROVAL`, one open approval task, action-log SUBMIT, central audit `BN.SUSPENSION.PROPOSED`.
- **Idempotency:** Same `(actor, key, payload_hash)` returns the original response; different payload → `E_IDEMPOTENCY_PAYLOAD_MISMATCH`.
- **Errors:** `E_FEATURE_DISABLED`, `E_UNAUTHENTICATED`, `E_FORBIDDEN`, `E_AWARD_NOT_FOUND`, `E_AWARD_NOT_ELIGIBLE`, `E_INVALID_REASON_CODE`, `E_INVALID_EFFECTIVE_DATE`, `E_POLICY_NOT_CONFIGURED`, `E_CONFLICTING_OPEN_CASE`.

### `bn_award_suspension_approve_v1(p_suspension_id, p_task_id, p_narrative, p_expected_row_version, p_idempotency_key, p_correlation_id)`
- **Permission:** `bn_award_suspension.approve` (or `is_admin`).
- **Maker-checker:** proposer cannot approve (**admin not exempt**); duplicate approver blocked.
- **Target state:** Suspension → `APPROVED`, `row_version+1`; task `COMPLETED/APPROVED`; instance `APPROVED`; action-log APPROVE; audit `BN.SUSPENSION.APPROVED`. **`bn_award` is NOT touched.**
- **Errors:** `E_FEATURE_DISABLED`, `E_UNAUTHENTICATED`, `E_FORBIDDEN`, `E_SUSPENSION_NOT_FOUND`, `E_INVALID_STATE`, `E_STALE_ROW_VERSION`, `E_SELF_APPROVAL_FORBIDDEN`, `E_DUPLICATE_APPROVER`, `E_TASK_NOT_ACTIONABLE`.

### `bn_award_suspension_reject_v1(p_suspension_id, p_task_id, p_reason_code, p_narrative, p_expected_row_version, p_idempotency_key, p_correlation_id)`
- **Permission:** `bn_award_suspension.approve` (or `is_admin`); proposer cannot self-reject.
- **Target state:** Suspension → `REJECTED`; task `COMPLETED/REJECTED`; instance `REJECTED`; action-log REJECT (`reason` = reason_code); audit `BN.SUSPENSION.REJECTED`.
- **Errors:** as above plus `E_REASON_REQUIRED`, `E_INVALID_REASON_CODE`.

### `bn_award_suspension_withdraw_v1(p_suspension_id, p_narrative, p_expected_row_version, p_idempotency_key, p_correlation_id)`
- **Permission:** `bn_award_suspension.propose` (or `is_admin`) **AND** actor must be the original `proposed_by_user_id`.
- **Only `PROPOSED` cases may be withdrawn** in this epic (`E_ONLY_PROPOSED_MAY_WITHDRAW`). Post-approval withdrawal is deferred to policy-driven follow-up epic.
- **Target state:** Suspension → `WITHDRAWN`; pending tasks cancelled; instance `WITHDRAWN`; action-log WITHDRAW; audit `BN.SUSPENSION.WITHDRAWN`.

## D. Workflow result

- **Definition seeded:** `BN_AWARD_SUSPENSION` v1, ACTIVE, is_active=true.
- **Steps:** `PROPOSED` (SUBMIT, start) → `PENDING_APPROVAL` (APPROVAL) → `APPROVED` (END) / `REJECTED` (END) / `WITHDRAWN` (END).
- **Transitions:** SUBMIT, APPROVE, REJECT, WITHDRAW (from both PROPOSED and PENDING_APPROVAL).
- **Multi-level:** Approval policy `level` supported (currently first level is executed; deeper levels are policy-driven and validated by future S1D/E epics — the RPC already blocks duplicate approvers, preparing for multi-level).
- **Self-approval:** enforced at DB layer inside `_approve_v1` and `_reject_v1`.
- **Delegation:** unchanged — inherits existing `core_workflow_delegation_rule` behaviour once activated.

## E. Security result

- Execute grants: `authenticated`, `service_role` only. `anon` explicitly revoked.
- Every RPC checks: authentication → module rollout → permission → maker-checker → optimistic version → central audit.
- Admin: **not exempt** from maker-checker.
- `SECURITY DEFINER` + `SET search_path = public` on every function.
- `core_command_receipt`: no RLS, no PUBLIC grants — reachable only through the helpers.

## F. Test result

Focused unit contract tests will be added in a follow-up test-only PR. All behaviours are enforceable directly at the RPC boundary and can be exercised inside test transactions after temporarily flipping `actions_enabled=true` and seeding an `award_suspension`/`propose` policy row.

## G. Database verification

- `bn_award` is untouched by any RPC (searched for `UPDATE public.bn_award`).
- No payment table, communication table, `bn_claim_decision`, `bn_claim_event`, or `bn_award_status_event` writes exist.
- Partial unique index blocks duplicate open cases.
- Idempotency uniqueness on `(actor_user_id, command_name, idempotency_key)`.

## H. Files changed

- `supabase/migrations/<timestamp>_bn-sec-s1c.sql` — schema + workflow seed + RPCs.
- `supabase/migrations/<timestamp>_bn-sec-s1c-anon-revoke.sql` — grant tightening.
- `docs/bn/BN_SEC_S1C_SUSPENSION_BACKEND.md` — this document.
- `supabase/verify/bn_award_suspension_backend.sql` — verification queries.

## I. Dark-launch confirmation

- `app_modules.bn_award_suspension.show_in_menu = false`.
- `app_modules.bn_award_suspension.actions_enabled = false` → RPCs return `E_FEATURE_DISABLED`.
- Browser feature flag `bn.servicing.awardSuspension` default `false`; production `localStorage` override blocked (BN-SEC-S1B.1).
- Existing `AwardSuspensionConsole.tsx` and `awardServicingService.updateAwardStatus` **not modified**.
- No menu row exposed.

## J. Out of scope (reaffirmed)

Does **not** implement: application of suspension to award, `bn_award_status_event`, payment schedule/instruction holds, payment exceptions, future-dated scheduler, resumption, arrears, reversal, termination, Communication Hub dispatch, screen rewrite, menu activation, feature-flag activation.
