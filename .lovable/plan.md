# CH-SIMPLE-P3E-B — Targeted Controlled-Live Dispatch and Provider Evidence

Build the real controlled-live email path end-to-end, but certify it with a deterministic provider stub. The first real email is deferred to P3E-C.

## Scope guardrails

- P3E-A remains accepted; only hardening its RLS.
- No real email sent.
- No unified Go Live UI, no Manual/Automated Production, no cron/bulk, no external recipients.
- Reuse existing evaluator, preview approval, dry-run certification, `send_communication_v1`, dispatcher, guarded transport, trace/event logs. No parallel sender.

## Deliverables

### 1. Database migration — P3E-B foundations

**RLS hardening (P3E-A tables)**
- `communication_controlled_live_execution`: SELECT restricted to `initiated_by = auth.uid()` OR admin (`has_permission(auth.uid(),'communication_hub','admin')` / `is_admin`). Service role bypass. No INSERT/UPDATE/DELETE to `authenticated`.
- `communication_controlled_live_grant`: SELECT restricted to service_role + admin RPC only. No direct authenticated SELECT. Frontend reads grant status via execution result.
- Admin evidence RPC: `get_comm_hub_controlled_live_grant(p_grant_id uuid)` — SECURITY DEFINER, admin-only, audited.

**Execution/attempt columns (new)**
- `communication_controlled_live_execution`: `prior_operating_mode`, `final_operating_mode`, `restored_operating_mode`, `cleanup_state`, `cleanup_succeeded`, `failure_stage`, `provider_call_attempted`, `provider_invocation_key`, `provider_invocation_started_at`, `provider_call_completed_at`, `provider_name`, `provider_status`, `provider_message_id`, `provider_response_safe`, `delivery_attempt_id`, `request_id`, `message_id`, `dispatcher_revalidation_decision_id`, `warnings jsonb`, `blockers jsonb`, `completed_at`.
- `communication_delivery_attempt`: add `controlled_live_execution_id`, `grant_id`, `provider_invocation_key`, `provider_call_attempted`, `provider_call_completed_at`, `provider_status`, `provider_message_id`, `provider_response_safe`, `original_decision_id`, `revalidation_decision_id`, `preview_approval_id`, `dry_run_certification_id`, `attempt_type`, `recipient_set_hash`, `subject_hash`, `body_hash`, `result`.

**Grant lifecycle**
- Statuses enforced: `ISSUED → RESERVED → CONSUMED` OR `ISSUED → RESERVED → REVOKED` OR `ISSUED → EXPIRED`.
- Immutability trigger: no transition from CONSUMED/REVOKED/EXPIRED back to ISSUED/RESERVED.
- Uniqueness: only one non-terminal grant per execution.

**Advisory-lock single-active guard**
- `bn_advisory_key('comm_hub_controlled_live')` acquired for the duration of a temporary DRY_RUN→CONTROLLED_LIVE transition.

**Orchestrator RPCs (SECURITY DEFINER)**
- `reserve_comm_hub_controlled_live_grant(p_grant_id, p_execution_id, p_recipient_set_hash, p_subject_hash, p_body_hash)` — atomic ISSUED→RESERVED with binding checks.
- `consume_comm_hub_controlled_live_grant(p_grant_id, p_execution_id, p_provider_invocation_key)` — RESERVED→CONSUMED, only allowed once provider invocation attempted.
- `revoke_comm_hub_controlled_live_grant(p_grant_id, p_execution_id, p_reason)` — pre-provider revocation.
- `record_comm_hub_controlled_live_provider_attempt(p_execution_id, p_invocation_key)` — sets `provider_call_attempted=true`, `provider_invocation_started_at=now()`. Idempotent.
- `record_comm_hub_controlled_live_provider_outcome(p_execution_id, p_status, p_provider_message_id, p_response_safe, p_warnings)` — final outcome capture.
- `finalize_comm_hub_controlled_live(p_execution_id, p_state, p_final_operating_mode, p_cleanup_succeeded, p_warnings)` — end state.
- `restore_comm_hub_operating_mode_after_controlled_live(p_execution_id)` — restores prior mode; on failure engages EMERGENCY_STOP.
- Canonical evaluator extended: `controlled_live` context requires a matching RESERVED-or-CONSUMED grant bound to exact execution + recipient set hash + subject hash + body hash.

**Runtime tests**
- `run_ch_p3e_b_runtime_tests()` — RLS, mode transitions, grant lifecycle, targeted dispatch preconditions, emergency stop boundaries, idempotency.

### 2. Edge Function — `comm-hub-controlled-live-test`

Single browser-facing entry point. Steps:
1. Authenticate user via Supabase JWT; resolve operator id.
2. Preflight: reject if EMERGENCY_STOP, AUTOMATED_PRODUCTION, kill switch, or another controlled-live execution owns the advisory lock.
3. Call `begin_comm_hub_controlled_live` (idempotent via `idempotency_key`). Receive execution + grant.
4. If prior mode = DRY_RUN: acquire advisory lock, set `prior_operating_mode` on execution, `set_communication_operating_mode('CONTROLLED_LIVE', reason=execution_no)`. Cron/bulk untouched (already off in this mode by construction).
5. Reserve grant with exact recipient/subject/body hashes.
6. Create request + one recipient + one message via `send_communication_v1({ send_context: 'controlled_live', ... })`. Persist execution_id, grant_id, preview_approval_id, dry_run_certification_id, original_decision_id, configuration_version, recipient_policy_version, provider_invocation_key.
7. Call dispatcher: `comm-hub-dispatch { operation: 'targeted_controlled_live', message_id, execution_id, grant_id }`.
8. On dispatcher return: capture outcome, update execution state, consume/revoke grant appropriately.
9. Cleanup: `restore_comm_hub_operating_mode_after_controlled_live`. On failure engage EMERGENCY_STOP.
10. Return the stable P3E-B response shape (status, provider evidence, ids, timings, cleanup).

Idempotency: replay with same `idempotency_key + operator + scope_hash` returns the same execution/attempt/provider evidence, no second provider call.

### 3. Extend `comm-hub-dispatch` — `targeted_controlled_live` operation

- Load message → request → execution → grant.
- Enforce: `send_context='controlled_live'`, exactly one To, no CC/BCC, canonical revalidation, preview + dry-run revalidation, EMERGENCY_STOP + kill switch off, sender/provider ready.
- Reserve (or verify already-reserved) grant.
- Create exactly one `communication_delivery_attempt` bound to execution.
- Call `record_comm_hub_controlled_live_provider_attempt` immediately before provider transport.
- Invoke `sendEmailViaGuardedTransport()` with the provider stub in test mode (env `COMM_HUB_PROVIDER_MODE=stub`).
- Classify outcome: PROVIDER_ACCEPTED / PROVIDER_REJECTED / DELIVERY_PENDING (+ `provider_outcome_unconfirmed` warning on timeout). DELIVERED only via webhook.
- On any provider invocation, consume grant permanently.
- Do not process the queue. Do not fall back to batch. No retry after ambiguous outcome.

### 4. Provider stub

- `supabase/functions/_shared/providerStub.ts` — deterministic stub keyed by `recipient` local-part convention set only for test fixtures (e.g. `accepted+*`, `rejected+*`, `timeout+*`, `delivered+*`). No hardcoded production addresses.
- Env-guarded: stub only active when `COMM_HUB_PROVIDER_MODE=stub`. Production defaults reject.
- Records: exactly-once invocation guard (in-memory + provider_invocation_key durability check).

### 5. Client service

- `controlledLiveTestService.ts` — thin wrapper calling the edge function and reading own execution row afterwards. No grant table reads.
- Update `controlledLiveService.ts` to remove direct grant table SELECT (uses execution row instead).

### 6. Tests

- `CommHubP3EBRlsHardening.test.ts` — assertions on `pg_policies` + row-level probes.
- `CommHubP3EBGrantLifecycle.test.ts` — reserve/consume/revoke, concurrency (via SQL harness).
- `CommHubP3EBOrchestrator.test.ts` — harness against `comm-hub-controlled-live-test` with stub provider (skipIf no PGHOST + no edge deploy; asserts stable response shape and idempotency at the service layer with mocked supabase functions client).
- `CommHubP3EBProviderStub.test.ts` — accepted/rejected/timeout/duplicate-call.
- `CommHubP3EBRuntime.test.ts` — wraps `run_ch_p3e_b_runtime_tests()` (skipIf no PGHOST, matches P3E-A pattern).
- Governance scan: `scripts/comm-hub/scan_controlled_live_governance.ts` — grep for direct provider calls, missing grants, hardcoded recipients, `ENQUEUED` treated as success.

### 7. Documentation

- Append P3E-B section to `COMMUNICATION_HUB_MASTER_IMPLEMENTATION_REPORT.md` covering RLS model, orchestrator sequence, mode transition, grant lifecycle, idempotency, provider outcome classification, cleanup/fail-safe, gap register, environmental limitations.
- Add `docs/communication-hub/COMMUNICATION_HUB_CONTROLLED_LIVE_ORCHESTRATION.md` with sequence diagram (ASCII), state transitions, response schema.

## Technical details

**Provider invocation key**: `sha256(execution_id || ':' || message_id || ':' || delivery_attempt_id)` truncated to 32 chars, stored on both execution and delivery attempt.

**Scope hash for idempotency**: `sha256(operator_id || module_code || event_code || recipient || preview_approval_id || dry_run_certification_id)`.

**Emergency Stop boundaries**: checked in orchestrator preflight, after grant reservation, in dispatcher pre-provider check, and post-provider outcome finalisation.

**Advisory lock key**: `pg_try_advisory_xact_lock(hashtext('comm_hub_controlled_live_singleton'))` during mode transition; execution acquires a per-execution durable single-active row lock too.

**RLS admin definition**: reuse existing `is_admin(auth.uid()) OR has_role(auth.uid(),'Admin') OR has_permission(auth.uid(),'communication_hub','admin')`.

**Non-goals**: unified Go Live page, Manual/Automated Production flow, cron scheduling, bulk pipeline, real SendGrid/Postmark call, permanent env allowlist.

## Files (new/modified, high-level)

Migrations:
- `supabase/migrations/<ts>_ch_p3e_b_rls_and_orchestration.sql`

Edge Functions:
- `supabase/functions/comm-hub-controlled-live-test/index.ts` (new)
- `supabase/functions/comm-hub-dispatch/index.ts` (extend with `targeted_controlled_live`)
- `supabase/functions/_shared/providerStub.ts` (new)
- `supabase/functions/_shared/guardedTransport.ts` (extend to route through stub in stub mode)

Client:
- `src/platform/communication-hub/controlledLiveTestService.ts` (new)
- `src/platform/communication-hub/controlledLiveService.ts` (remove grant table read)

Tests:
- `src/platform/communication-hub/__tests__/CommHubP3EBRlsHardening.test.ts`
- `src/platform/communication-hub/__tests__/CommHubP3EBGrantLifecycle.test.ts`
- `src/platform/communication-hub/__tests__/CommHubP3EBOrchestrator.test.ts`
- `src/platform/communication-hub/__tests__/CommHubP3EBProviderStub.test.ts`
- `src/platform/communication-hub/__tests__/CommHubP3EBRuntime.test.ts`

Governance:
- `scripts/comm-hub/scan_controlled_live_governance.ts`

Docs:
- `docs/communication-hub/COMMUNICATION_HUB_MASTER_IMPLEMENTATION_REPORT.md` (append P3E-B)
- `docs/communication-hub/COMMUNICATION_HUB_CONTROLLED_LIVE_ORCHESTRATION.md` (new)

## Completion signals

- Migration applied; `run_ch_p3e_b_runtime_tests()` returns `ok=true`.
- All existing Communication Hub suites still pass.
- Provider stub receives exactly one call for accepted/rejected/timeout scenarios; replay produces zero additional calls.
- Governance scan reports zero violations.
- Typecheck + build clean.
- P3E-B status recorded as `P3E_B_CERTIFIED_WITH_PROVIDER_STUB` in the master report; real-email certification deferred to P3E-C.
