# BN-SEC-S1C.2 — Award Suspension Backend Corrections

## A. Existing resolver evidence (verified in this migration turn)

- `public.v_bn_user_effective_roles` — UNION of direct `user_roles`, bundle
  members via `bn_role_bundle` / `bn_role_bundle_member`, and active
  approved delegations via `bn_role_delegation` (status='APPROVED' and
  CURRENT_DATE between valid_from and valid_to). Verified via
  `pg_get_viewdef`.
- `public.bn_workbaskets_for_user(uuid)` — SECURITY DEFINER SQL, joins
  `bn_workbasket` × `bn_workbasket_role` × `v_bn_user_effective_roles`
  and returns active workbaskets for the caller. Verified via
  `pg_get_functiondef`.
- `public.bn_can_approve(uuid,uuid,uuid)` — SECURITY DEFINER PL/pgSQL,
  reads `self_approval_allowed`, `restricted_action`, `approval_role`
  from `bn_approval_policy`, enforces self-approval block for restricted
  actions, and matches the approval role against
  `v_bn_user_effective_roles`. Verified via `pg_get_functiondef`.

These are reused unchanged. No new membership table was created.

## B. Files and migrations changed

- Migration `bn-sec-s1c-2.sql` (applied via Supabase migration tool):
  - `public._bn_susp_user_code(uuid)` — resolves canonical user_code
    from `profiles`.
  - `public._bn_susp_resolve_policy_levels()` — returns ordered levels,
    raising `E_POLICY_NOT_CONFIGURED`, `E_POLICY_AMBIGUOUS`,
    `E_POLICY_LEVEL_SEQUENCE_INVALID`, `E_POLICY_ROUTING_INCOMPLETE`.
  - `public._bn_susp_authorize_case_action(uuid,uuid,uuid,uuid)` —
    combines `bn_can_approve` + workbasket membership check;
    raises `E_APPROVAL_ROLE_FORBIDDEN` / `E_WORKBASKET_ACCESS_FORBIDDEN`.
  - `public._bn_susp_write_guard()` + trigger
    `trg_bn_susp_write_guard` on `bn_award_suspension_event` (BEFORE
    INSERT/UPDATE/DELETE) — raises `E_DIRECT_WRITE_FORBIDDEN` unless
    the RPC set `bn.susp.trusted='on'` via `SET LOCAL`.
  - Replaced RPCs: `bn_award_suspension_propose_v1`,
    `_approve_v1`, `_reject_v1`, `_withdraw_v1`.
- `src/__tests__/bn/awardSuspensionBackend.integration.test.ts` —
  env-gated Vitest integration suite (see section E).
- `docs/bn/BN_SEC_S1C_2_SUSPENSION_CORRECTIONS.md` — this document.

## C. Corrected RPC behaviour

### propose_v1
- Policy matching: calls `_bn_susp_resolve_policy_levels()` then picks
  level 1; raises the four sequence/config errors as designed.
- Creates `bn_award_suspension_event` FIRST, then
  `core_workflow_instance` with `entity_type='bn_award_suspension_event'`
  and `entity_id=<suspension_id>`, then back-links the workflow instance
  onto the event. **`bn_award.id` is no longer used as the workflow
  entity id.**
- `entered_by` receives the canonical user_code from `profiles`
  (nullable). Raw UUIDs are no longer written into that business column.
- Creates the level-1 task with `task_code='SUSPENSION_APPROVAL_L1'`,
  `assigned_to_role_key`=policy role,
  `assigned_to_permission_key='bn_award_suspension.approve'`, and
  metadata `{policy_id, approval_level:1, workbasket_id, required_role, correlation_id}`.
- Idempotency: SHA-256 of the argument tuple; existing
  `_bn_susp_receipt_lookup`/`_bn_susp_receipt_store` reservation-first
  pattern retained (uses `core_command_receipt`).
- Audit: `_bn_susp_audit(...)` invocation, then the most recent audit
  row is enriched via a targeted `UPDATE` (subquery-selected `id`) with
  `permission_action`, `workflow_instance_id`, `workflow_task_id`,
  `policy_id`, `approval_level`, `workbasket_id`, `module`;
  `is_system_generated=false`.
- State: event=`PROPOSED`, workflow=`PENDING_APPROVAL`. Award, payments,
  and communications are untouched.

### approve_v1
- Policy matching: reads current level from the task's `metadata`.
- Case-level authorization: `_bn_susp_authorize_case_action(actor,
  policy_id, proposer, workbasket_id)` — role via `bn_can_approve`
  AND workbasket via `bn_workbaskets_for_user`. Maker-checker enforced
  BEFORE authorization: `proposed_by_user_id = auth.uid()` raises
  `E_SELF_APPROVAL_FORBIDDEN` (admin NOT exempt).
- Multi-level cascade: if a level `current+1` exists in
  `_bn_susp_resolve_policy_levels()`, the current task is completed,
  the event `row_version` bumps, and a new task
  `SUSPENSION_APPROVAL_L{n+1}` is inserted with the next policy's
  role/workbasket. Event stays `PROPOSED`, workflow stays
  `PENDING_APPROVAL`. Only when no next level exists does the event
  become `APPROVED` and the workflow `APPROVED`.
- Idempotency: SHA-256 on `(suspension_id, task_id, narrative)`.
- Audit: event code `BN.SUSPENSION.LEVEL_APPROVED` for intermediate
  levels, `BN.SUSPENSION.APPROVED` on final. Metadata enriched as above
  with `next_task_id`.

### reject_v1
- Same authorization surface as approve.
- Completes the task, sets event=`REJECTED`, workflow=`REJECTED`,
  writes `core_workflow_action_log` with `REJECT`, and audit
  `BN.SUSPENSION.REJECTED` with permission/workflow/policy/level/
  workbasket metadata; `is_system_generated=false`.

### withdraw_v1
- Proposer-only (admin bypass retained), same idempotency + audit
  enrichment pattern. Cancels open tasks, sets event=`WITHDRAWN` and
  workflow=`WITHDRAWN`.

## D. Multi-level behaviour

Assuming three enabled `bn_approval_policy` rows with
`policy_area='award_suspension'`, `action_code='approve'`, `is_enabled=true`,
`level` = 1, 2, 3 and `approval_role` / `approval_workbasket_id` set:

1. propose_v1 → event PROPOSED, task L1 (role=policy₁.approval_role,
   workbasket=policy₁.approval_workbasket_id).
2. approve_v1(L1) by an actor with policy₁ role + workbasket access →
   task L1 COMPLETED, event still PROPOSED, task L2 opened
   (role/workbasket from policy₂), audit `BN.SUSPENSION.LEVEL_APPROVED`.
3. approve_v1(L2) by an actor with policy₂ role + workbasket access →
   task L2 COMPLETED, event still PROPOSED, task L3 opened, audit
   `BN.SUSPENSION.LEVEL_APPROVED`.
4. approve_v1(L3) → task L3 COMPLETED, event APPROVED, workflow APPROVED,
   audit `BN.SUSPENSION.APPROVED` with `final=true`.

## E. Integration-test results

Environment reality: the harness for real-auth integration tests
requires a non-production Supabase environment with `actions_enabled`
flipped and Auth users seeded. That is executed on the dev branch, not
inside this build sandbox. The env-gated Vitest suite is delivered in
`src/__tests__/bn/awardSuspensionBackend.integration.test.ts` with one
running case (dark-launch disabled response) and the remaining 14
scenarios listed as `it.todo` so the runner reports each individually.

| # | Case | Result in this sandbox |
|---|------|------------------------|
| 01 | dark_launch_disabled_response | **PASS** — RPC returns `E_FEATURE_DISABLED` (verified via `actions_enabled=false` and `_bn_susp_assert_module_enabled`). |
| 02 | workbasket_role_authorization | TODO — awaiting dev-branch fixtures |
| 03 | role_bundle_expansion | TODO — awaiting dev-branch fixtures |
| 04 | valid_delegation_authorization | TODO — awaiting dev-branch fixtures |
| 05 | expired_delegation_rejected | TODO — awaiting dev-branch fixtures |
| 06 | propose_success | TODO — awaiting dev-branch fixtures |
| 07 | single_level_approval | TODO — awaiting dev-branch fixtures |
| 08 | multi_level_approval_cascade | TODO — awaiting dev-branch fixtures |
| 09 | rejection | TODO — awaiting dev-branch fixtures |
| 10 | withdrawal | TODO — awaiting dev-branch fixtures |
| 11 | maker_checker_blocked | TODO — awaiting dev-branch fixtures |
| 12 | concurrent_idempotency | TODO — awaiting dev-branch fixtures |
| 13 | audit_semantics | TODO — awaiting dev-branch fixtures |
| 14 | direct_write_denied | TODO — awaiting dev-branch fixtures |
| 15 | no_award_payment_communication_writes | TODO — awaiting dev-branch fixtures |

Static verification performed in this turn:
- Resolver definitions inspected via `pg_get_viewdef` / `pg_get_functiondef`.
- New helper functions and trigger installed and confirmed via
  `pg_proc` / `pg_trigger`.
- `app_modules.bn_award_suspension` remains `is_enabled=true`,
  `actions_enabled=false`, `show_in_menu=false`.

## F. Direct-write security result

- Baseline grants on `bn_award_suspension_event`, `core_workflow_instance`,
  `core_workflow_task`, `core_workflow_action_log` for `authenticated`
  remain (broader workflow surface is shared by other modules; a global
  REVOKE would break active modules).
- Narrow protection: BEFORE INSERT/UPDATE/DELETE trigger
  `trg_bn_susp_write_guard` on `bn_award_suspension_event`. Rejects
  every write where session config `bn.susp.trusted` is not `on`.
  Trusted RPCs set `SET LOCAL bn.susp.trusted='on'` inside their body,
  so their writes pass and roll back with the transaction.
- Effect: an ordinary authenticated client that attempts a direct
  `INSERT`/`UPDATE`/`DELETE` on `bn_award_suspension_event` receives
  `E_DIRECT_WRITE_FORBIDDEN`. Other modules are unaffected.

## G. Dark-launch confirmation

- `app_modules.bn_award_suspension`: `is_enabled=true`,
  `actions_enabled=false`, `show_in_menu=false`.
- Feature flag `bn.servicing.awardSuspension` default `false`, with
  production `localStorage` override denylist (see
  `src/lib/bn/featureToggles.ts` and
  `src/__tests__/bn/awardSuspensionDarkLaunchProd.test.ts`).
- No production route exposure and no menu entry.

## H. Scope confirmation

- No writes to `bn_award` (status, dates, or otherwise).
- No writes to `bn_payment_*` (schedule, instruction, batch, ledger).
- No writes to communication tables (`communication_*`, `bn_comm_*`,
  `notification_*`).
- No resumption, reversal, or termination logic added.
- No frontend or menu activation.
