# EPIC CH-TRACE-2 — Full Gate-by-Gate Communication Trace Timeline

## Scope guarantees (unchanged from your directives)

- No email sent.
- No live gate changes.
- No cron / bulk enabled.
- No external recipients.
- No send-policy / review-policy bypass.
- No provider secrets logged.
- No legacy `notification_queue` / `notification_logs` writes.

## Files to inspect first (parallel reads)

- `supabase/functions/comm-hub-event-pilot/index.ts` (already partly instrumented in CH-TRACE-2 pt1)
- `supabase/functions/comm-hub-enqueue/index.ts`
- `supabase/functions/comm-hub-dispatch/index.ts`
- `src/platform/communication-hub/sendCommunication.ts` (façade)
- `src/platform/communication-hub/businessModuleCommunicationAdapter.ts`
- `src/modules/legal/communication/legalWorkflowSendHelper.ts` (already instrumented)
- `src/modules/legal/communication/legalCommunication.ts`
- `src/modules/compliance/communication/complianceCommunication.ts`
- `src/modules/benefits/communication/benefitsCommunication.ts`
- `src/modules/insuredPerson/communication/insuredPersonCommunication.ts`
- `src/modules/employerRegistration/communication/employerRegistrationCommunication.ts`
- `src/pages/admin/communicationHub/traces/*`
- `src/pages/admin/communicationHub/safety/plainLanguageBlockers.ts`

## Part A — Shared stage constants

Two mirrored files (client + edge):

- `src/platform/communication-hub/trace/traceStages.ts`
- `supabase/functions/_shared/commHubTraceStages.ts` (new folder, edge-side)

Both export the same 45-value `CommHubTraceStage` string union plus a `TRACE_STAGE_ORDER` array (used by the UI to compute *last passed* / *next expected*), and a `TRACE_STEP_STATUS` union: `passed | warning | blocked | skipped | failed | info`.

## Part B — Reusable trace helper

- **Client:** extend `src/platform/communication-hub/trace/communicationTrace.ts` with `appendTraceStepSafe()` (never throws, masks recipient, extracts trace_id from any of `trace.trace_id`, `trace_id`, `context.trace.trace_id`).
- **Edge:** new `supabase/functions/_shared/commHubTrace.ts` with:
    - `resolveTraceId(payload)` — same fallback chain.
    - `appendTraceStepSafe(admin, traceId, step)` — best-effort RPC call to `append_comm_hub_trace_step`.
    - `completeTraceSafe(admin, traceId, status, blockedStage?, extras)` — RPC `complete_comm_hub_trace`.
    - `linkTraceRequestSafe` / `linkTraceMessageSafe`.
    - `maskEmail()` helper (already duplicated per-function; centralize).

Every helper swallows errors and never throws to business logic.

## Part C — Instrument module helpers

Update `sendBusinessModuleCommunicationDryRun` in `businessModuleCommunicationAdapter.ts` to:

1. Start a trace before touching anything.
2. Append `EVENT_INITIATED`, `SOURCE_CONTEXT_CAPTURED`, `RECIPIENT_RESOLUTION_STARTED`, `RECIPIENT_RESOLVED`.
3. Pass `trace` in payload to `sendCommunication` façade so downstream edges see it.
4. On adapter early-exit (missing recipient, no assigned user) → append blocked step + `completeTraceSafe("blocked", "RECIPIENT_RESOLVED")`.

Legal helper (`legalWorkflowSendHelper.ts` — already partial): add `AUTOMATION_CHECKED` (mode disabled → blocked; prepare_only → `status=info summary="prepared"`), `DUPLICATE_CHECKED` (blocked/skipped with `duplicate_suppressed_local`), recipient fallback → `RECIPIENT_RESOLVED` with `status=warning`.

Compliance / Benefits / Insured Person / Employer Registration helpers get the same 4 initial stages via the adapter — no per-module code needed beyond passing trace through if they use the adapter. Any module that bypasses the adapter (grep for direct `sendCommunication` / `functions.invoke("comm-hub-event-pilot")` calls) gets a minimal wrapper that starts a trace.

## Part D — comm-hub-event-pilot

Extend existing CH-TRACE-2 pt1 instrumentation with the remaining stages:

- `TYPED_CONFIRMATION_CHECKED` (before `entry.typed` check)
- `TEMPLATE_MAPPING_CHECKED` after `loadEventAndTemplate`
- `REQUEST_ENQUEUE_ATTEMPTED` alias step around `send_communication_v1` (in addition to existing `RPC_SEND_COMMUNICATION_ATTEMPTED`, keep both for continuity)
- On every failure path, `completeTraceSafe(admin, traceId, "blocked" | "failed", <blocked_stage>, { reasons })`
- Every JSON response body already includes `stage`, `build`; extend with `trace_id`, `trace_no`, `current_stage`, `blocked_stage`.

## Part E — comm-hub-enqueue

Add:
- `ENQUEUE_RECEIVED` (entry)
- `PAYLOAD_VALIDATED` (blocked on validation error)
- `SEND_POLICY_CHECKED` (calls `evaluate_comm_hub_send_authorization`; blocked on deny)
- `REQUEST_ENQUEUE_ATTEMPTED` (failed if RPC returns error)

Return body includes `stage`, `trace_id`, `trace_no`, `current_stage`, `blocked_stage`, `blockers`.

## Part F — send_communication_v1 RPC

Add a **new migration** that wraps the existing function body with trace-step calls at:

- `DB_POLICY_GUARD_CHECKED` (right after existing send-authorization guard)
- `REQUEST_CREATE_ATTEMPTED` / `REQUEST_CREATED` (link trace via `link_comm_hub_trace_request`)
- `TEMPLATE_RESOLVED` / `TEMPLATE_RENDERED`
- `RECIPIENT_CREATE_ATTEMPTED` / `RECIPIENT_CREATED`
- `MESSAGE_CREATE_ATTEMPTED` / `MESSAGE_CREATED` / `MESSAGE_QUEUED` (link trace via `link_comm_hub_trace_message` on first message)

Trace id read from `payload->'trace'->>'trace_id'`, `payload->>'trace_id'`, or `payload->'context'->'trace'->>'trace_id'`.

All step-inserts wrapped in `BEGIN … EXCEPTION WHEN OTHERS THEN NULL; END` blocks so tracing never rolls back the send.

## Part G — comm-hub-dispatch

Instrument both the batch path and the `targetMessageId` path with:

`DISPATCH_CLAIM_ATTEMPTED → DISPATCH_CLAIMED → CONTROL_GATES_CHECKED → LIVE_WINDOW_CHECKED → EVENT_LIVE_STATUS_CHECKED → RECIPIENT_ALLOWLIST_CHECKED → ENV_ALLOWLIST_CHECKED → PROVIDER_LOOKUP_STARTED → PROVIDER_SELECTED → PROVIDER_SEND_ATTEMPTED → (PROVIDER_ACCEPTED | PROVIDER_FAILED) → DELIVERY_ATTEMPT_RECORDED → REQUEST_STATUS_RECOMPUTED → COMPLETED / SUPPRESSED / FAILED`

Blocker-code mapping documented in Part I.

## Part H — Trace Center UI

- `TraceCenterPage` list: add columns Current Stage, Blocked Stage, Last Passed Stage, Next Expected Stage, Source Path, Has Request (bool), Has Message (bool), Provider Called (bool). "Next Expected" computed client-side from `TRACE_STAGE_ORDER` and `current_stage`.
- `TraceDetailPage`: top diagnosis card gains Request/Message/Provider yes-no chips; timeline rows tinted green/yellow/red by status; per-row `<details>` for raw JSON payload; add "Copy trace id" button for support.

## Part I — Blocker dictionary

Extend `src/pages/admin/communicationHub/safety/plainLanguageBlockers.ts` with any of the listed 23 codes not already present. Each entry: `headline`, `businessMeaning`, `technicalMeaning`, `fixAction`, `fixHref`.

## Part J — Simulation harness

New admin-only edge function `comm-hub-trace-simulate` (POST, admin JWT, dry only):

Body: `{ scenario: "blocked_before_request" | "automation_prepare_only" | "send_policy_denied" | "review_policy_denied" | "request_created_and_queued" | "dispatch_outside_live_window" | "dispatch_recipient_not_db_allowlisted" | "provider_config_missing" | "provider_send_failed" }`.

For each scenario the function ONLY writes trace + trace-step rows (no request, no message, no queue) simulating the exact stage sequence with the right blocker code. A new UI button on `/admin/communication-hub/traces` — "Simulate scenario" — pops a dropdown and calls this function. Each simulation is tagged `trace_kind='native'` + `metadata.simulation=true` so operators can distinguish.

## Part K — Safety verification

- Grep for `testMode: false`, `notification_queue`, `notification_logs`, `Resend` API calls to prove no new live-send paths.
- Grep for `add_secret`, `Deno.env.get.*_SECRET` to confirm no secret leakage.

## Part L — Typecheck

Run `bunx tsgo --noEmit -p tsconfig.app.json` at the end.

## Part M — Deliverables

Report exactly the 17-point structure requested (files inspected, stage model, helper, per-layer instrumentation, UI diff, blocker dictionary diff, simulation menu, validation, safety state, typecheck, `NEEDS_REVIEW`, next live test recommendation).

## Rough size

- ~2 new shared files (client + edge stages/helpers)
- ~5 edge function edits (pilot, enqueue, dispatch, new simulate function, shared)
- ~1 SQL migration for `send_communication_v1` trace patches
- ~5 module-helper edits (adapter + 4 modules + legal delta)
- ~2 UI file edits (list + detail) + blocker dictionary
- typecheck at end

Ready to implement on approval.
