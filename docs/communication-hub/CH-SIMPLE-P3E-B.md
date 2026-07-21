# CH-SIMPLE-P3E-B — Controlled-Live Dispatch and Provider Evidence

**Status:** landed, tests green (SQL harness requires PGHOST).
**Predecessors:** CH-SIMPLE-P1, P2, P3, P3B, P3B-R, P3B-R.2, P3C, P3D, **P3E-A**.
**Successor:** CH-SIMPLE-P3E-C (first real provider send).

## Scope

P3E-B builds the real controlled-live delivery pipeline **against a
deterministic provider stub**. No real email is sent in this stage. It
extends what P3E-A landed (`begin_comm_hub_controlled_live`,
`validate_comm_hub_controlled_live_grant`, the execution + grant tables,
the tightened send-decision core) with:

- Grant lifecycle RPCs: `reserve_comm_hub_controlled_live_grant`,
  `consume_comm_hub_controlled_live_grant`,
  `revoke_comm_hub_controlled_live_grant`,
  `admin_get_comm_hub_controlled_live_grant`.
- Execution state RPCs: `record_comm_hub_controlled_live_provider_attempt`,
  `record_comm_hub_controlled_live_provider_outcome`,
  `restore_comm_hub_operating_mode_after_controlled_live`,
  `finalize_comm_hub_controlled_live`,
  `get_my_comm_hub_controlled_live_executions`.
- Provider evidence columns on `communication_delivery_attempt`
  (`provider_invocation_key` unique, `provider_status`,
  `provider_message_id`, `provider_response_safe`, `recipient_set_hash`,
  `subject_hash`, `body_hash`, `attempt_type`,
  `controlled_live_execution_id`, `grant_id`, `revalidation_decision_id`).
- Read hardening: direct SELECT on both controlled-live tables is
  revoked for `authenticated`; all reads flow through operator-scoped
  or admin-scoped SECURITY DEFINER RPCs (project-wide no-RLS rule).
- Provider stub: `supabase/functions/_shared/communication-hub/provider-stub.ts`
  — activated by `COMM_HUB_PROVIDER_MODE=stub`, deterministic outcome
  routing (`accepted+*`, `rejected+*`, `timeout+*`).
- Dispatcher extension: new `operation: "targeted_controlled_live"` in
  `comm-hub-dispatch`; enforces one recipient, requires a RESERVED
  grant, revalidates the canonical send decision, invokes the stub,
  updates the attempt, records provider outcome on the execution and
  consumes the grant.
- Orchestrator: `comm-hub-controlled-live-test` edge function — the
  single browser entry point. Confirms authorisation, transitions
  DRY_RUN → CONTROLLED_LIVE (if needed), calls `send_communication_v1`,
  dispatches, always restores the prior operating mode, and finalises
  the execution row.

## Exactly-once invariants

1. `communication_delivery_attempt.provider_invocation_key` has a
   `UNIQUE` index scoped to `attempt_type = 'controlled_live'`. A retry
   collides at the database, is caught, and returns the original
   outcome with `idempotent_replay: true`.
2. The provider stub maintains an in-memory registry keyed by the same
   `providerInvocationKey`. A duplicate call inside a single isolate
   returns the original outcome with `duplicateCall: true` and does not
   invoke the classifier twice.
3. `consume_comm_hub_controlled_live_grant` is called only after
   `record_comm_hub_controlled_live_provider_attempt`; a pre-provider
   block (revalidation deny, Emergency Stop, reservation failure) calls
   `revoke_comm_hub_controlled_live_grant` instead. Both transitions
   are single-shot in the grant state machine.

## Blocker propagation

Every failure path appends `{ code, stage, message? }` entries into the
execution row's `blockers` (via the finalize RPC) and returns them in
both the dispatcher and orchestrator envelopes. The dispatcher captures
the `revalidation_decision_id` so a rejected controlled-live attempt is
audit-linked to the canonical evaluator run that blocked it.

## Cleanup and mode restoration

The orchestrator captures `prior_operating_mode` at the top of the
turn, transitions to `CONTROLLED_LIVE` only from `DRY_RUN`, and always
calls `restore_comm_hub_operating_mode_after_controlled_live`. Cleanup
failure is recorded on the execution row (`cleanup_succeeded=false`,
`cleanup_state='restore_failed'`) but never masks a successful provider
outcome — both facts are surfaced independently on the envelope.

## Environmental limitations

Runtime assertions run against the live database via
`public.run_ch_p3e_b_runtime_tests()`. Lovable Cloud CI does not
provide `PGHOST`; that test skips there and is enforced locally and in
project runbooks (see
`docs/communication-hub/COMMUNICATION_HUB_MASTER_IMPLEMENTATION_REPORT.md`).
The pure-function stub test (`CommHubP3EBProviderStub.test.ts`) and
governance scan (`CommHubP3EBGovernance.test.ts`) run in every CI.

## Guardrails not touched by P3E-B

- No real provider send.
- No cron, no bulk, no external recipient release.
- No Manual Production, no Automated Production.
- No unified Go Live page.
- No navigation consolidation.

P3E-C will replace the stub with the guarded real transport for the
first sanctioned send.
