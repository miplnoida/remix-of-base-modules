# Phase 4B3 — Runtime Boundary Map (Authoritative)

**Status:** committed as part of `PHASE_4B3_RUNTIME_FOUNDATION_CLOSURE`.
**Scope:** every mutation point on the Preview → Approval → Dry Run → Controlled Stub → (future) Real Email chain, as currently deployed.
**Excludes:** Manual Production and Automated Production remain gate-denied and are not mapped as reachable boundaries.

Legend:
- **DB tx** = single Postgres transaction inside a `SECURITY DEFINER` RPC.
- **EF** = Deno Edge Function; each HTTP invocation is its own trust and transaction domain.
- **Provider/Simulator** = external SMTP/API boundary; Controlled Stub never crosses it.

---

## 1. `prepare_comm_hub_preview` — DB tx

| Field | Value |
| --- | --- |
| Source | migration `…_comm_hub_prepare_preview_scanner_v2*` (latest deployed def in `pg_proc`) |
| Caller identity | authenticated `Admin` (`auth.uid()` required) |
| Gate action | `PREPARE_PREVIEW` via `assert_comm_hub_runtime_transition` |
| First protected mutation | `INSERT INTO communication_preview_snapshot` |
| Required inputs | `module_code`, `event_code`, `channel`, `correlation_id?`, scenario/fixture id |
| Rows read | active `communication_hub_event_template_map`, active `core_template_version`, `communication_hub_control_settings`, `communication_hub_recipient_policy`, current governance record + certification |
| Rows mutated | 1 × `communication_preview_snapshot` (+ 1 gate-log row) |
| Idempotency | none (each preview is a fresh snapshot; supersede-on-new via `status='SUPERSEDED'`) |
| Concurrency | statement-level; no advisory lock (safe: no external-visible resource) |
| Success state | snapshot `status='PREPARED'`, scanner v2 evidence populated, hashes frozen |
| Failure | RAISE rolls the snapshot back (denial log currently rolls back with it — **residual #3**) |
| External provider reachable | **no** |

## 2. `approve_comm_hub_preview` — DB tx

| Field | Value |
| --- | --- |
| Source | latest `pg_proc` definition (Phase 4B3 security closure v1) |
| Caller identity | authenticated `Admin` |
| Gate action | `APPROVE_PREVIEW` |
| First protected mutation | `INSERT INTO communication_preview_approval` |
| Required inputs | `snapshot_id`, `approval_reason≥1`, optional `expected_content_hash`, `expected_recipient_set_hash`, `correlation_id` |
| Rows read | target snapshot, current `configuration_version`, current `recipient_policy_version` |
| Rows mutated | 1 × `communication_preview_approval`; snapshot flipped to `status='APPROVED'` |
| Idempotency | none (a fresh approval per attempt; expired approvals must never be revived) |
| Concurrency | tx-level; snapshot state check guards against double-approve |
| Success state | approval `status='ACTIVE'`, `expires_at=now()+30m`, hashes frozen at approval |
| Failure | RAISE with distinct code; denial evidence currently rolled back (**residual #3**) |
| External provider reachable | **no** |

## 3. `assert_comm_hub_runtime_transition` — DB tx (helper)

| Field | Value |
| --- | --- |
| Source | `pg_proc`, evaluator `4b3.security-closure-v1` |
| Caller identity | any SECURITY-DEFINER RPC in this chain, or `service_role` with `service_operation` |
| Gate action | *(the action being evaluated)* |
| First protected mutation | `INSERT INTO comm_hub_runtime_transition_log` (append-only; admin-only read) |
| Required inputs | `action`, context (`module_code`, `event_code`, `channel`, `correlation_id`, `preview_snapshot_id?`, `preview_approval_id?`, …) |
| Rows read | target snapshot + approval when action requires them |
| Rows mutated | exactly 1 log row per invocation |
| Idempotency | not required (log is append-only evidence) |
| Concurrency | none needed |
| Success state | returns `{allowed:true, evaluator_version:…}` |
| Failure | returns `{allowed:false, denied_reasons:[…]}`. Log row is written **before** return. **Residual #3** is on the callers: they RAISE after inspecting the return, which currently rolls back the log row. |
| External provider reachable | **no** |

## 4. `begin_comm_hub_dry_run` — DB tx

| Field | Value |
| --- | --- |
| Source | `pg_proc` (deployed) |
| Caller identity | authenticated Admin/operator |
| Gate action | `START_DRY_RUN` (not yet wired — **residual for next turn**) |
| First protected mutation | `INSERT INTO communication_dry_run_execution` |
| Required inputs | preview_snapshot_id, preview_approval_id, idempotency_key, module/event/channel |
| Rows read | preview, approval, control settings, recipient policy, template map, template version |
| Rows mutated | 1 × execution + downstream stub rows |
| Idempotency | `communication_dry_run_execution.idempotency_key` (currently non-unique — closed by **residual #6** this turn) |
| Concurrency | no advisory lock today |
| Success state | execution `state='COMPLETED'` |
| Failure | terminalises execution row |
| External provider reachable | **no** (dry-run path never calls provider) |

## 5. `comm-hub-dry-run` — Edge Function (~612 lines)

| Field | Value |
| --- | --- |
| Source | `supabase/functions/comm-hub-dry-run/index.ts` |
| Caller identity | Admin JWT via `verify_jwt=true` |
| Gate action | processor should call `START_DRY_RUN` / finalisation ⇒ `CERTIFY_DRY_RUN` (wiring pending) |
| First protected mutation | claims + updates `communication_dry_run_execution`, writes `communication_dry_run_certification` on pass |
| Idempotency | derived from execution id (unique after **residual #6**) |
| Concurrency | claim via conditional UPDATE (audit pending) |
| Success state | active certification row |
| Failure | execution terminalised, no certification |
| External provider reachable | **no** — provider adapter is never selected on the dry-run path |

## 6. `begin_comm_hub_controlled_live` — DB tx

| Field | Value |
| --- | --- |
| Source | `pg_proc` (deployed, CH-GL-01 hotfix) |
| Caller identity | authenticated `is_comm_hub_operator_admin` |
| Gate action | must move to `START_CONTROLLED_STUB` (still uses legacy admin check; wiring pending) |
| First protected mutation | `INSERT INTO communication_controlled_live_execution`, then `communication_controlled_live_grant` |
| Required inputs | recipient, preview_approval_id, dry_run_certification_id, idempotency_key, reason, confirmation |
| Rows read | control settings, recipient policy, existing execution by idempotency_key |
| Rows mutated | 1 execution + 1 grant (both in same tx) |
| Idempotency | `idempotency_key` + `scope_hash` (unique index closed by **residual #6**) |
| Concurrency | scope_hash gate; grant lifecycle currently non-atomic (**residual #5**) |
| Success state | execution `state='REQUESTED'`, grant `status='ISSUED'` |
| Failure | replay-safe blockers with distinct codes |
| External provider reachable | **no** in stub path; the same function currently also fronts controlled-live real email — real-email path remains gate-denied |

## 7. `create_comm_hub_controlled_stub_message` — DB tx

| Field | Value |
| --- | --- |
| Source | `pg_proc` |
| Caller identity | service_role (`comm-hub-controlled-live-test` EF) |
| Gate action | `CREATE_TARGETED_MESSAGE` (wiring pending) |
| First protected mutation | `INSERT INTO communication_request`, `communication_recipient`, `communication_message` (with `targeted_dispatch_only=true`) |
| Idempotency | uniqueness on `(controlled_live_execution_id, controlled_live_grant_id)` closed by **residual #6** |
| Concurrency | none today (**residual #5** grant reservation) |
| External provider reachable | **no** — dispatcher rejects `targeted_dispatch_only` unless explicit stub action |

## 8. `claim_comm_hub_targeted_message` — DB tx

| Field | Value |
| --- | --- |
| Source | `pg_proc` |
| Caller identity | service_role dispatcher |
| Gate action | `CLAIM_TARGETED_MESSAGE` (wiring pending) |
| First protected mutation | conditional `UPDATE communication_message SET locked_by=… WHERE status='queued' AND targeted_dispatch_only=true AND locked_by IS NULL` |
| Idempotency | 0-row claim ⇒ already claimed / not eligible |
| Concurrency | claim is already conditional; normal queue workers cannot claim `targeted_dispatch_only=true` rows |
| External provider reachable | **no** |

## 9. `comm-hub-controlled-live-test` — Edge Function (~976 lines)

| Field | Value |
| --- | --- |
| Source | `supabase/functions/comm-hub-controlled-live-test/index.ts` |
| Caller identity | Admin JWT |
| Gate action | orchestrates the controlled-stub chain; per-step gate wiring pending |
| First protected mutation | calls the DB RPCs above via service key |
| Idempotency | passes idempotency_key through |
| External provider reachable | **only via `sendEmailViaGuardedTransport`** — guard requires `COMMUNICATION_HUB_EMAIL_LIVE=true` + allowlist + non-stub. Stub path skips it entirely. |

## 10. `comm-hub-dispatch` — Edge Function (~2 615 lines)

| Field | Value |
| --- | --- |
| Source | `supabase/functions/comm-hub-dispatch/index.ts` |
| Caller identity | service_role, invoked from queue or targeted claim |
| Gate action | `DISPATCH_CONTROLLED_STUB` for targeted path; other actions unreachable in this checkpoint |
| First protected mutation | `INSERT INTO communication_delivery_attempt` |
| Idempotency | `(message_id, attempt_no)` unique (closed by **residual #6**) + `provider_invocation_key` |
| Concurrency | claim is atomic (residual #5 covers grant lifecycle around it) |
| External provider reachable | **guarded** — four independent env/header/allowlist checks; stub explicitly refuses provider |

## 11. `certify_comm_hub_controlled_stub` / `certify_comm_hub_dry_run` — DB tx

| Field | Value |
| --- | --- |
| Source | `pg_proc` |
| Caller identity | Admin or service_role certifier |
| Gate action | `CERTIFY_DRY_RUN` / `CERTIFY_CONTROLLED_STUB` (wiring pending) |
| First protected mutation | `INSERT INTO communication_dry_run_certification` / `communication_controlled_live_certification` (active row) |
| Idempotency | active-row uniqueness per execution (closed by **residual #6**) |
| External provider reachable | **no** |

---

## Residuals closed in this checkpoint

| # | Closure | Deployed as |
| - | ------- | ----------- |
| 1 | Preview evidence joint predicate | `public.check_comm_hub_preview_runtime_evidence(uuid, uuid, text, text)` |
| 2 | Approval binding predicate | `public.check_comm_hub_preview_approval_binding(uuid, uuid, uuid)` |
| 3 | Durable denial architecture | `public.check_comm_hub_runtime_transition_safe(text, jsonb)` — return-not-raise wrapper; log row survives caller `RETURN`; caller pattern documented |
| 4 | Governed service-operation allowlist | table `public.comm_hub_service_operation_allowlist` + `public.assert_comm_hub_service_operation(text, text)` |
| 5 | Atomic grant lifecycle | `public.reserve_comm_hub_controlled_live_grant / consume_… / revoke_…` (conditional UPDATE with `WHERE status = expected`) |
| 6 | Partial-unique constraints | seven indexes: `communication_dry_run_execution_idem_uk`, `communication_dry_run_certification_idem_uk`, `communication_controlled_live_execution_idem_uk`, `communication_controlled_live_grant_exec_active_uk`, `communication_message_ctrl_exec_grant_uk`, `communication_delivery_attempt_msg_no_uk`, `communication_controlled_live_certification_exec_active_uk` |

## Row-count baseline before this checkpoint

- `communication_dry_run_execution`: 22 rows, 0 idempotency duplicates.
- `communication_controlled_live_execution`: 5 rows, 0 idempotency duplicates.
- `communication_controlled_live_grant`: 5 rows, 0 duplicate active-per-execution.
- `communication_dry_run_certification`: idempotency-key-scoped, 0 duplicates.
- `communication_controlled_live_certification`: 0 duplicate active-per-execution.
- `communication_message` (`controlled_live_execution_id IS NOT NULL`): 0 duplicate `(exec, grant)`.
- `communication_delivery_attempt`: 0 duplicate `(message_id, attempt_no)`.

All seven partial-unique indexes are safe to install.

## Not touched in this checkpoint

- Downstream runtime wiring of the gate into RPCs #4, #5, #7, #8, #9, #11 (next iteration).
- Dry Run and Controlled Stub end-to-end execution.
- Any provider or simulator invocation.
- Manual Production and Automated Production paths (remain hard-denied by the gate).
