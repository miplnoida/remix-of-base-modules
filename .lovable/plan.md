# EPIC CH-TRACE-1 — Universal Communication Trace Center

## Scope
Add end-to-end traceability for every Communication Hub attempt (from any module/event) so admins can see exactly where a send stands or was blocked — without changing any live send behaviour, without sending email, and without touching send/review policy gates.

## Hard constraints (unchanged)
- No email sent, no live gates changed, no cron/bulk/external recipients.
- No provider secrets exposed.
- No writes to legacy `notification_queue` / `notification_logs`.
- Trace is additive and best-effort: a trace failure MUST NEVER block a legitimate send path.

## Part A — Inspection deliverable
Produce a written map (in the final report) of every send path and every blocker point:
- Front-end starters: Legal workflow helper, `GenericEventPilotPanel`, `AdminTestNoticePanel`, `ManualDispatchTestPanel`, `sendCommunication` façade.
- Edge functions: `comm-hub-event-pilot`, `comm-hub-enqueue`, `comm-hub-dispatch`, `_shared/communication-hub/transport-email`, `_shared/communication-hub/provider-lookup`.
- RPC: `send_communication_v1`.
- Tables that hold partial evidence today: `communication_request`, `communication_message`, `communication_event_log`, `communication_delivery_attempt`, `communication_hub_control_audit`.

## Part B — New tables (migration)
`public.communication_hub_trace` and `public.communication_hub_trace_step` exactly as specified, plus indexes on module/event, request_id, request_no, message_id, entity, reference_no, status, created_at. Standard 4-step pattern: CREATE → GRANT (authenticated + service_role, no anon) → ENABLE RLS → POLICY.

RLS: admins with the existing Communication Hub admin role can select; inserts/updates only via SECURITY DEFINER RPCs (below); service_role full access for edge functions.

## Part C — SECURITY DEFINER RPCs
- `start_comm_hub_trace(p_payload jsonb)` → `{ trace_id, trace_no }`. Generates `TRC-YYYYMMDD-######` sequence, masks recipient email, derives domain.
- `append_comm_hub_trace_step(p_trace_id, p_payload)` → `{ ok }`. Also bumps `updated_at`, and if payload sets `set_current_stage` / `set_status` / `set_blocked_stage` / merges `blocker_codes`, updates the parent row.
- `link_comm_hub_trace_request(p_trace_id, p_request_id, p_request_no)` → `{ ok }`.
- `link_comm_hub_trace_message(p_trace_id, p_message_id)` → `{ ok }` (first message wins; second call becomes an INFO step).
- `complete_comm_hub_trace(p_trace_id, p_status, p_payload)` → `{ ok }`.

All RPCs are best-effort: they return `{ ok: false, error }` on failure and never raise to the caller.

## Part D — Payload contract
Standard payload shape forwarded through every layer:
```
trace: { trace_id, trace_no, source_module, source_screen, source_action, correlation_id }
```
Legacy aliases `traceId` / `traceNo` accepted on read. Layers that receive a payload without `trace` MUST NOT create one implicitly (that is the caller's job) — they only append steps when a `trace_id` is present.

## Part E — Module instrumentation
New shared util `src/platform/communication-hub/trace/communicationTrace.ts` exporting:
- `startBusinessCommunicationTrace(input)` → returns `{ trace_id, trace_no }` or `null` on failure.
- `appendTraceStep(trace_id, step)`, `linkRequest`, `linkMessage`, `completeTrace`.

Wire into `legalWorkflowSendHelper` for stages EVENT_INITIATED, RECIPIENT_RESOLVED, AUTOMATION_CHECKED, DUPLICATE_CHECKED. Wire into `sendBusinessModuleCommunicationDryRun` too so Benefits/IP/Compliance/Employer dry-run adapters get traces automatically.

## Part F — comm-hub-event-pilot instrumentation
Append steps: LIVE_PREFLIGHT_CHECKED, SEND_POLICY_CHECKED, REVIEW_POLICY_CHECKED, TEMPLATE_RESOLVED, REQUEST_ENQUEUE_ATTEMPTED, DISPATCH_INVOKED. On block, mark trace status=`blocked`, set `blocked_stage`, forward returned `blocker_codes`.

## Part G — comm-hub-enqueue instrumentation
Steps: ENQUEUE_RECEIVED, PAYLOAD_VALIDATED, SEND_POLICY_CHECKED, RPC_INVOKED. `send_policy_denied` → status=blocked, blocked_stage=SEND_POLICY_CHECKED.

## Part H — send_communication_v1 patch
Accept `p_payload.trace` (or `trace_id`). Emit steps DB_POLICY_GUARD_CHECKED, REQUEST_CREATED, TEMPLATE_RENDERED, RECIPIENT_CREATED, MESSAGE_CREATED, MESSAGE_QUEUED. Call `link_comm_hub_trace_request` and `link_comm_hub_trace_message` once created. Wrapped in `perform` block; trace failures never rollback the request.

## Part I — comm-hub-dispatch instrumentation
For each claimed message that carries a trace: DISPATCH_CLAIM_ATTEMPTED, DISPATCH_CLAIMED, EVENT_LIVE_STATUS_CHECKED, RECIPIENT_ALLOWLIST_CHECKED, PROVIDER_SELECTED, PROVIDER_SEND_ATTEMPTED, PROVIDER_ACCEPTED|PROVIDER_FAILED, DELIVERY_ATTEMPT_RECORDED, REQUEST_STATUS_RECOMPUTED. Skip/suppress mapped to canonical blocker codes: target_not_found, target_not_queued, target_outside_live_window, recipient_not_db_allowlisted, recipient_not_allowlisted, provider_config_missing, subject_missing, body_missing. Trace ID read from `communication_request.context->>'trace_id'` (dispatcher does not receive the payload directly).

## Part J — Legacy trace view
`communication_hub_trace_unified_view` UNIONs real traces with reconstructed rows from `communication_request` (joined to first `communication_message`, event log summary, and last delivery attempt). Reconstructed rows carry `trace_kind='reconstructed'` and a note "Legacy trace reconstructed from request/message/event logs".

## Part K — Trace Center list UI
Route `/admin/communication-hub/traces` (new page `TraceCenterPage.tsx`). Filters: module, event, status, blocked-only, recipient domain, request_no, message_id, entity_type+id, reference_no, date range, blocker code. Table shows trace_no, module.event, current_stage, status badge, blocker summary chips, recipient domain, updated_at, and links to request detail + trace detail.

## Part L — Trace detail UI
Route `/admin/communication-hub/traces/:traceId` (new page `TraceDetailPage.tsx`). Sections: Diagnosis card (Part N), Summary (module/event/entity/recipient masked/status/blocked_stage), Request/Message links, Policy guard, Review policy, Delivery attempts table, Trace step timeline (with plain-language `explainBlocker` per step), Communication event log timeline, collapsed raw JSON.

## Part M — Blocker dictionary expansion
Extend `plainLanguageBlockers.ts` with the 20 new codes listed in the epic (`no_assigned_user_id`, `automation_disabled`, … `body_missing`) with headline / message / fixHint / severity / fixHref.

## Part N — Operator diagnosis
`buildTraceDiagnosis(trace)` helper on the detail page. Rules:
- `blocked_stage=AUTOMATION_CHECKED` + `automation_prepare_only` → "Blocked before request creation: automation is prepare_only."
- `blocked_stage=SEND_POLICY_CHECKED` → "Blocked by send policy: <first blocker>."
- `status=queued` + expired live window → "Queued but not dispatched: live window expired before dispatcher claimed the message."
- `status=suppressed` + `recipient_not_db_allowlisted` → "Suppressed by dispatcher: recipient was not in DB allowlist."
- `provider_config_missing` → "Provider not called: active email provider is missing."
- `provider_send_failed` → "Provider called but failed."

## Part O — Trace-only simulated tests
Test-only RPC / script (no email) that seeds 7 traces covering the scenarios listed. Available from Trace Center as an admin "Simulate scenarios" action, guarded by admin role, that ONLY writes to trace tables (no request/message writes).

## Part P — Typecheck
Run `bunx tsgo --noEmit -p tsconfig.app.json` after all edits.

## Part Q — Report
Deliver the 21-item report at the end of the implementation.

## File plan (create)
- `supabase/migrations/<ts>_ch_trace_schema.sql` — tables, indexes, grants, RLS, RPCs, unified view.
- `src/platform/communication-hub/trace/communicationTrace.ts` — client/edge shared helpers.
- `supabase/functions/_shared/communication-hub/trace.ts` — edge equivalent (service_role).
- `src/pages/admin/communicationHub/traces/TraceCenterPage.tsx`
- `src/pages/admin/communicationHub/traces/TraceDetailPage.tsx`
- `src/pages/admin/communicationHub/traces/traceService.ts`
- `src/pages/admin/communicationHub/traces/traceDiagnosis.ts`

## File plan (edit)
- `src/pages/admin/communicationHub/safety/plainLanguageBlockers.ts` — add 20 codes.
- `src/modules/legal/communication/legalWorkflowSendHelper.ts` — start trace + steps.
- `src/platform/communication-hub/businessModuleCommunicationAdapter.ts` — start trace on dry-run.
- `src/platform/communication-hub/sendCommunication.ts` — forward trace context.
- `supabase/functions/comm-hub-event-pilot/index.ts` — steps E→F.
- `supabase/functions/comm-hub-enqueue/index.ts` — steps.
- `supabase/functions/comm-hub-dispatch/index.ts` — steps + suppression codes.
- `send_communication_v1` RPC (migration) — accept trace, emit steps, link ids.
- `src/components/routing/AppRoutes.tsx` — 2 new routes.
- Communication Hub nav / IA link to Trace Center.

## Rollout order (single approval)
1. Migration (schema + RPCs + view + `send_communication_v1` patch).
2. Shared trace helpers (frontend + edge).
3. Instrument event-pilot, enqueue, dispatch.
4. Instrument module helpers + façade.
5. Ship Trace Center list + detail UI + diagnosis + blocker dictionary.
6. Typecheck.
7. Report.

## Non-technical summary
The Communication Hub already logs bits and pieces about every email attempt in several different tables. When something goes wrong, the story is fragmented and some failures happen before any log row exists. This epic adds one "trace" per attempt (with a human-friendly `TRC-...` number) that stitches every stage together — from the moment a module tries to send, through policy checks, request creation, dispatcher, and provider — so an admin can open one screen and see exactly where a send stands and, if blocked, exactly why in plain language. Older attempts get a reconstructed trace built from existing data. Nothing about live sending changes.
