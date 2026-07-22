# PHASE_4B3 — Controlled Stub Recovery

## Slice 1 — Structured Dispatcher Envelope and Typed Action Contract

**Status:** `PHASE_4B3_CONTROLLED_STUB_RECOVERY_SLICE1_COMPLETE`

### Scope

Slice 1 changes only:

1. dispatcher response-envelope propagation;
2. targeted dispatcher action typing and validation;
3. associated tests, deployment and documentation.

Slice 1 does **not** create any request, message, execution, grant, or
delivery attempt. It does not invoke a provider. It does not create a
new preview, approval, dry run, or grant. Row counts across every
controlled-live table are unchanged.

### Deployed versions inspected

| Component | Value |
|---|---|
| Repository commit SHA (pre-slice) | `8911341904202f7e5bf15f9571330f1335c2d28c` |
| `comm-hub-controlled-live-test` | Redeployed as part of Slice 1 |
| `comm-hub-dispatch` | Redeployed as part of Slice 1 |
| Dispatch secret name | `COMMUNICATION_HUB_DISPATCH_SECRET` (unchanged) |
| Legacy alias supported | `COMM_HUB_DISPATCH_SECRET` (unchanged) |

Deployment was **non-mutating**. No execution payload was invoked
during Slice 1.

### Canonical dispatcher envelope

The canonical envelope lives in
`supabase/functions/_shared/communication-hub/controlled-dispatch-contract.ts`
and is tagged with `schema_version = "controlled-dispatch.v1"`.

Fields (all present on every response, `null` where not applicable):

`schema_version`, `operation`, `action`, `status`, `passed`,
`idempotent_replay`, `retry_safe`, `automatic_retry_allowed`,
`existing_message_dispatchable`, `requires_new_execution`,
`requires_new_grant`, `requires_new_preview`, `requires_new_dry_run`,
`reconciliation_required`, `request_id`, `message_id`, `execution_id`,
`grant_id`, `grant_status`, `delivery_attempt_id`, `trace_id`,
`original_decision_id`, `revalidation_decision_id`,
`provider_adapter_invoked`, `provider_call_attempted`,
`external_provider_call_attempted`, `simulated`, `provider_name`,
`provider_message_id`, `provider_status`, `provider_response_safe`,
`recipient_set_hash`, `subject_hash`, `body_html_hash`, `body_text_hash`,
`body_hash`, `content_hash`, `blockers`, `warnings`, `failure_stage`,
`started_at`, `completed_at`.

Blocker structure:

```ts
{
  code: string;
  stage?: string | null;
  message?: string | null;
  retry_safe?: boolean | null;
  recommended_action?: string | null;
  metadata?: Record<string, unknown> | null;
}
```

Blockers are deduplicated by `code + stage`.

### Canonical action type

```ts
type ControlledDispatchAction = "RUN_CONTROLLED_STUB" | "SEND_ONE_REAL_EMAIL";
```

`RUN_CONTROLLED_STUB` is the only action accepted by the dispatcher in
Slice 1. `SEND_ONE_REAL_EMAIL` is validated at the same entry gate but
short-circuits with `real_email_action_not_enabled` — it never touches
the database, the grant, the message, or any provider adapter.

### Exact `payload.action` defect

The prior dispatcher selected the adapter with:

```ts
const targetAction = (payload as any)?.action === "RUN_CONTROLLED_STUB"
  ? "RUN_CONTROLLED_STUB"
  : (isProviderStubActive() ? "RUN_CONTROLLED_STUB" : "LEGACY_STUB_INACTIVE");
```

`payload` was not declared inside `processTargetedControlledLive`; the
identifier resolved through closure scope and was `undefined` in the
targeted path. As a result the adapter selector silently fell through
to the `isProviderStubActive()` legacy branch and ultimately to
`LEGACY_STUB_INACTIVE`, which contributed to the Execution-5 409
failure.

Slice 1 removes this branch entirely for targeted requests. The
authoritative source is now `body.action`, validated at function entry
before any DB read. The legacy `isProviderStubActive` import is retained
only for non-targeted queue callers and is explicitly discarded
(`void isProviderStubActive`) inside the targeted handler.

### Non-2xx propagation fix

The orchestrator (`comm-hub-controlled-live-test`) previously inspected
`dispatchRes.ok` before parsing the envelope, collapsing every 4xx/5xx
into a single `dispatcher_http_error` blocker and discarding structured
business blockers such as `message_not_controlled_live`.

The orchestrator now:

1. reads the full response body;
2. rejects an empty body with `dispatcher_response_empty`;
3. parses JSON, rejecting a parse failure with `dispatcher_response_not_json`;
4. validates the envelope against `schema_version = "controlled-dispatch.v1"`,
   rejecting a non-conformant body with `dispatcher_response_contract_invalid`;
5. adopts every dispatcher field verbatim — IDs, hashes, provider
   evidence, blockers, warnings, retry flags, grant status;
6. only then consults the HTTP status, recording it as safe transport
   metadata under `warnings[].dispatcher_http_status`.

`dispatcher_http_error` is no longer emitted as a primary operator
blocker. It is retained conceptually in the transport-code catalogue
as a final legacy fallback for genuinely unrecognisable transport
failures.

### Blocker deduplication

Both edge functions now insert blockers through helpers that skip any
duplicate `code + stage` pair. The orchestrator no longer performs
`env.blockers.push(...dispatchBody.blockers)`; every dispatcher blocker
travels through `addBlocker`. The generic marker
`dispatcher_failed_without_blocker` is appended only when the blocker
array is genuinely empty after propagation.

### Retry-field semantics

For pre-provider structured contract failures (missing/invalid action,
invalid IDs, and every 400 the dispatcher now returns for the action
gate) the envelope sets:

- `retry_safe = true`
- `automatic_retry_allowed = false`
- `existing_message_dispatchable = false`
- `requires_new_execution = true`
- `requires_new_grant = true`
- `provider_adapter_invoked = false`
- `provider_call_attempted = false`
- `external_provider_call_attempted = false`
- `reconciliation_required = false`

For `SEND_ONE_REAL_EMAIL` the same block is applied with
`retry_safe = false` — the operator must not simply retry against the
real-email adapter until its release path ships.

For `RUN_CONTROLLED_STUB` the dispatcher marks
`provider_adapter_invoked = true` and `simulated = true` at the point
of stub invocation.

### Operator-message mapping (catalogue additions)

- `message_not_controlled_live` — "The message was not prepared for
  targeted Controlled Stub processing. No provider was called. A fresh
  run will be required after the message-creation contract is corrected."
- `grant_not_dispatchable` — "The temporary Controlled Stub
  authorisation is no longer valid. No provider was called. Start a
  fresh run after the underlying issue is corrected."
- `controlled_live_attempt_in_progress` — "A durable provider-attempt
  record exists without a final outcome. Do not retry. Reconcile the
  existing attempt first."
- `targeted_action_missing` — "The Controlled Stub request did not
  include an action. Retry after the client attaches an explicit
  action."
- `targeted_action_invalid` — "The Controlled Stub request specified an
  unknown action. Retry after correcting the action."
- `real_email_action_not_enabled` — "One Real Email is not authorised
  on this dispatcher. No provider was called."
- `dispatcher_response_contract_invalid` — "The dispatcher returned a
  response that did not satisfy the controlled-dispatch.v1 contract.
  No provider was called."

### Tests

`src/platform/communication-hub/__tests__/CommHubControlledDispatchSlice1.test.ts`
covers:

- schema-tag stability and envelope validation;
- deduplication in `appendBlocker`;
- dispatcher declares the `action` field on `TargetedControlledLiveBody`;
- dispatcher validates the action **before** the first
  `communication_message` read;
- dispatcher references every required action blocker via the shared
  catalogue;
- `body.action` is the only authoritative action source — no
  `payload.action` fallback survives;
- `LEGACY_STUB_INACTIVE` branch has been removed;
- `provider_adapter_invoked` and `simulated` are set at stub invocation;
- orchestrator no longer emits `addBlocker("dispatcher_http_error", …)`;
- orchestrator adopts envelope fields before HTTP-status inspection;
- envelope validated against `controlled-dispatch.v1`;
- distinct blocker codes for empty / non-JSON / contract-invalid;
- orchestrator preserves dispatcher `grant_status`;
- `dispatcher_failed_without_blocker` only appended when the blocker
  array is genuinely empty.

`src/platform/communication-hub/__tests__/CommHubControlledLiveFailureContract.test.ts`
updated to reflect the new distinct transport blocker set.

Typecheck (`bunx tsgo --noEmit`) and both test suites pass.

### Deployment evidence

Both `comm-hub-dispatch` and `comm-hub-controlled-live-test` were
redeployed after tests passed. The `COMMUNICATION_HUB_DISPATCH_SECRET`
environment name was **not** changed.

### Before/after row counts

| Table | Before | After | Δ |
|---|---|---|---|
| `communication_controlled_live_execution` | 5 | 5 | 0 |
| `communication_controlled_live_grant`     | 5 | 5 | 0 |
| `communication_request`                   | 105 | 105 | 0 |
| `communication_message`                   | 105 | 105 | 0 |
| `communication_delivery_attempt`          | 84 | 84 | 0 |

No new controlled-stub certification rows were created.

### Repository-wide scan

- `payload.action` — 0 references in code (comments stripped) across
  the repository.
- `dispatcher_http_error` — retained only in the shared contract's
  `TRANSPORT_BLOCKER_CODES` catalogue as a documented legacy fallback
  and in the failure-contract test's negative assertion. No primary
  `addBlocker("dispatcher_http_error", …)` call remains.
- `RUN_CONTROLLED_STUB` / `SEND_ONE_REAL_EMAIL` — flow through the
  shared `ControlledDispatchAction` union in both edge functions and
  the shared contract module.
- `TargetedControlledLiveBody` — single definition in
  `comm-hub-dispatch/index.ts`; body is constructed by the orchestrator
  with the shared action names.
- `targeted_controlled_live` — dispatched via `body.operation` at a
  single entry point.

### Remaining Slice 2 requirements

Slice 1 intentionally does **not** implement:

- authoritative message-creation contract (send_context /
  sender_profile_id / template_version_id NOT NULL enforcement);
- `targeted_dispatch_only` message classification and enforcement;
- claim-exclusion logic;
- APPEALS `sender_readiness` seeding;
- APPEALS/APPEAL_RECEIVED_NOTICE active event-mapping row;
- SEND_ONE_REAL_EMAIL adapter and its release-mode gate;
- queue-protection filter for `send_context = "controlled_live"` rows.

These remain Slice 2 work and must not be started until Slice 2 is
explicitly authorised.

---

## Slice 2 — Authoritative Controlled Stub Creation and Targeted Claim

Status: **COMPLETE (PHASE_4B3_CONTROLLED_STUB_RECOVERY_SLICE2_COMPLETE)**.
No runtime rows were created during Slice 2. Row-count delta: `controlled_live` messages 0→0, `targeted_dispatch_only` requests 0→0, controlled attempts 0→0.

### 1. Schema additions (additive only)

`communication_request` — minimal targeting metadata:
- `targeted_dispatch_only boolean NOT NULL DEFAULT false`
- `controlled_action text`
- `controlled_live_execution_id uuid`
- `controlled_live_grant_id uuid`

`communication_message` — frozen evidence bundle:
- `targeted_dispatch_only`, `controlled_action`
- `controlled_live_execution_id`, `controlled_live_grant_id`
- `preview_snapshot_id`, `preview_approval_id`
- `dry_run_certification_id`, `governance_certification_id`
- `certified_dependency_hash`
- `recipient_set_hash`, `subject_hash`, `body_hash`, `content_hash`

`body_html_hash` / `body_text_hash` are **deferred** to a later slice per instructions.

### 2. Constraints and safety

- CHECK enforces targeted rows must carry `send_context='controlled_live'`, non-null action/execution/grant/snapshot/approval, and frozen hashes.
- Partial UNIQUE index guarantees exactly one targeted message per `(execution_id, grant_id, action)` and one targeted request per `(execution_id, grant_id)`.
- Immutability trigger blocks direct mutation of the frozen classification fields once set.
- Foreign keys to executions/grants/snapshots/approvals/dry-run/governance certifications use `ON DELETE RESTRICT` to preserve provenance.

### 3. Server-owned RPCs

- `public.create_comm_hub_controlled_stub_message(p_execution_id, p_grant_id)` — transactional creation of request + recipient + message with frozen evidence loaded from the approved snapshot; deterministic idempotency by `(execution_id, grant_id)`.
- `public.claim_comm_hub_targeted_message(p_message_id, p_execution_id, p_grant_id, p_action, p_worker_id)` — atomic `FOR UPDATE SKIP LOCKED` claim that returns the frozen evidence bundle. Refuses non-targeted rows, action/execution/grant mismatches, non-queued status, existing controlled attempts, and locked rows with precise codes.

### 4. Generic-send hardening

- `send_communication_v1` is now the internal core (`send_communication_v1_core`) wrapped by a validator that raises if any browser call supplies the reserved targeted fields (`targeted_dispatch_only`, `controlled_*`, `preview_*`, `dry_run_certification_id`, `governance_certification_id`, `certified_dependency_hash`).
- `claim_comm_hub_messages` and `claim_comm_hub_message_by_id` filter `targeted_dispatch_only = false` so targeted rows are never picked up by the generic queue.

### 5. Edge Function wiring

- `comm-hub-controlled-live-test` no longer calls `send_communication_v1`. It calls `create_comm_hub_controlled_stub_message` and consumes the returned authoritative IDs.
- `comm-hub-dispatch` targeted path now calls `claim_comm_hub_targeted_message` first. The frozen bundle is used directly; downstream code no longer trusts a fresh SELECT for classification fields. The generic peek path additionally rejects `targeted_dispatch_only=true` rows with `target_is_targeted_dispatch_only` for defence in depth.

### 6. Tests

`src/platform/communication-hub/__tests__/CommHubControlledDispatchSlice2.test.ts` — 8 static invariants covering:
- orchestrator uses the creation RPC and no generic-send RPC call remains;
- dispatcher uses the atomic targeted claim RPC with `action`;
- generic peek path routes targeted rows away with the correct blocker code.

Slice 1 (27) + Slice 2 (8) = **35 passing**.

### 7. Deferred to later slices

- `body_html_hash` / `body_text_hash` columns and hashing.
- SEND_ONE_REAL_EMAIL adapter and release-mode gate.
- Retry policy adaptations for targeted messages.
