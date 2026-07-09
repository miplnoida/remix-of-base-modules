
# EPIC 1B + EPIC 2A — Cleanup & Business-Module Dry-Run Onboarding

Strict guardrails: no live email, no cron, no `COMMUNICATION_HUB_EMAIL_LIVE=true`, no live_cron_allowed, no writes to `notification_queue`/`notification_logs`, no business-module production table mutation. Only external address permitted this phase: `rohit@mishainfotech.com`.

## Part A — Cancel stale live queued pilot message

Migration adds Admin-only SECURITY DEFINER RPC:

`public.cancel_comm_hub_message(p_message_id uuid, p_reason text, p_actor_user_id uuid) returns jsonb`

Behavior:
- Requires `has_role(p_actor_user_id,'admin')`; requires non-empty reason.
- Loads message; asserts `origin='comm_hub'` and `status in ('queued','sending')`.
- Updates message: `status='cancelled'`, `error_code='STALE_LIVE_PILOT_CANCELLED'`, `error_message=p_reason`, clears `locked_at`/`locked_by`, bumps `updated_at`.
- Inserts `communication_event_log` row (`stage='MESSAGE_CANCELLED_BY_ADMIN'`, reason, actor).
- Inserts `communication_hub_control_audit` row keyed `message_cancelled:<id>` with before/after JSON.
- Calls `recompute_communication_request_status(request_id)` if it exists (conditional `EXECUTE`).
- Never touches provider, notification_queue, notification_logs; never deletes.

Then invoke the RPC once for `b76a7d14-8b5c-4e4e-aecc-a7e1ed406f67` with reason "Clearing stale live queued pilot message before business-module onboarding." and re-run `evaluate_comm_hub_live_gate` to confirm `other_live_messages_queued` is gone.

## Part B — Business Module Readiness Matrix (read-only)

New file `src/pages/admin/communicationHub/controlCenter/BusinessModuleReadinessMatrixPanel.tsx` mounted in `ControlCenterPage.tsx`.

Columns: module_code, event_code, event_name, default_channels, live_control_status, risk_level, template_exists, active_version_exists, required_tokens, provider_available, tracking_policy, last_dry_run_request, last_dry_run_status, blockers, recommended_next_action.

Data sources (read-only queries): business event catalogue, `communication_hub_event_live_control`, `core_template`, `core_template_version`, `notification_providers`, `communication_request`, `communication_message`.

Rows this phase:
1. `COMM_HUB / ADMIN_TEST_NOTICE`
2. `EMPLOYER_REGISTRATION / INTERNAL_ACKNOWLEDGEMENT_NOTICE` (new low-risk internal event)

## Part C — Seed event + template

Migration + seed (via insert):
- Business event catalogue row for `EMPLOYER_REGISTRATION / INTERNAL_ACKNOWLEDGEMENT_NOTICE` (channels `[EMAIL]`, recipient `ADMIN_USER`, risk `low`, internal-only description).
- `communication_hub_event_live_control` row: `dry_run_only`, `risk_level=low`, reason "Initial business-module dry-run onboarding candidate." Live_manual_only NOT permitted.
- `core_template` + active `core_template_version`:
  - code `EMPLOYER_REGISTRATION_INTERNAL_ACK_EMAIL`, channel `EMAIL`
  - required tokens: `recipient_name`, `employer_name`, `reference_no`, `request_no`, `generated_at`
  - subject: `Employer Registration Internal Acknowledgement — {{reference_no}}`
  - body html/text renders all tokens, clearly labeled "Internal dry-run / admin validation".

## Part D — Generic Event Pilot edge function

New edge function `supabase/functions/comm-hub-event-pilot/index.ts` with actions `preflight` and `dry_run` only. Registered in `supabase/config.toml` with `verify_jwt = true`.

Input: `moduleCode, eventCode, templateCode?, recipientEmail, recipientName, tokens, reason, typedConfirmation, idempotencyKey?`.

Auth: caller must be authenticated admin (`has_role`); uses service-role client server-side only.

Preflight (no DB writes): validate event exists, template exists+active, live-control row exists+not disabled, recipient equals allowlisted `rohit@mishainfotech.com`, required tokens present. Returns blockers list.

Dry-run: enforce typed confirmation `SEND GENERIC EVENT DRY RUN`, force `testMode=true`, call `send_communication_v1` only, dispatcher runs on `targetMessageId` (no batch fallback), no Resend call, writes audit row `setting_key='generic_event_pilot_dry_run'`.

## Part E — Generic Event Pilot UI panel

New `GenericEventPilotPanel.tsx` mounted in `ControlCenterPage.tsx`. Fields: module/event selector sourced from readiness matrix rows, template code display, recipient email (locked to `rohit@mishainfotech.com`), recipient name, token JSON editor, reason, typed confirmation, `Run preflight` button, `Send dry-run` button. No live-send controls.

## Part F — Execute first business-module dry-run

Through the new panel: module `EMPLOYER_REGISTRATION`, event `INTERNAL_ACKNOWLEDGEMENT_NOTICE`, template `EMPLOYER_REGISTRATION_INTERNAL_ACK_EMAIL`, recipient Rohit Wadhwa / rohit@mishainfotech.com, tokens as specified, typed confirmation supplied.

## Part G — Verification checklist

Query DB + inspect logs to confirm all 14 verification points (stale message cancelled, evaluator clean, env still false, dry_run_only still true, dispatch_enabled true, no cron, no new `test_mode=false` rows, dry-run succeeded with rendered `request_no`, matrix shows both events, `EMPLOYER_REGISTRATION` still `dry_run_only`, no live send, legacy tables untouched, typecheck passes).

## Technical notes

- All SQL goes through one migration (RPC + event live-control row + template scaffolding); data seeds for catalogue/template rows through the insert tool after schema exists.
- Readiness matrix uses `supabase.from(...).select(...)` only — no new tables created.
- Edge function reuses existing `send_communication_v1` and dispatcher; no new sending spine.
- `communication_hub_control_audit` used for every state-changing action (cancel, dry-run).
- No secrets referenced in browser bundle; edge function reads service role via env.
- No modification to `notification_*`, `comm-hub-cron`, or business-module tables.

## Deliverable report

At end I will report: files changed, cancellation RPC result JSON, evaluator diff, seeded event/template IDs, dry-run request/message/template IDs with rendered `request_no`, dispatcher stats (`sentDryRun=1`, `sentLive=0`, provider_message_id `dry-run:*`), final gate state, cron-absent confirmation, legacy-isolation confirmation, secret safety, NEEDS_REVIEW, and recommended next step (EPIC 2B — expand readiness matrix + add second low-risk event).
