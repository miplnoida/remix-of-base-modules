# Communication Hub — Audit & Trace Runbook

## Audit tables
- `communication_hub_control_audit` — global gates + safety switchboard
- Per-config-table audit companions (mapping, policy, allowlist, schedule) — reason + previous/new value + actor
- `communication_event_log` — lifecycle events per request/message

## Required audit fields
- actor (`user_id` + role)
- timestamp
- environment
- organisation_id
- previous value / new value
- reason
- approval reference (where applicable)
- source screen / service
- correlation_id

## Auditable actions
Provider create/update/enable/disable; sender create/update/enable/verify; template create/version/approve/activate; event register; mapping create/update; recipient policy change; allowlist change; send/review policy change; schedule create/update/enable/disable; cron activation; live window open/close; event-live flip; emergency stop; retry action; manual resend; queue cancellation.

## Trace Center
Route: `/admin/communication-hub/traces`, detail at `/admin/communication-hub/traces/:traceId`.

Trace stages:
| Stage | Meaning | Record | On failure |
|---|---|---|---|
| REQUEST_CREATED | request row inserted | `communication_request` | blocker code stored on request |
| RECIPIENT_RESOLVED | recipient computed + allowlist checked | `communication_recipient` | RECIPIENT_BLOCKED |
| TEMPLATE_RESOLVED | template + version selected | event_log | TEMPLATE_MISSING / VERSION_INACTIVE |
| TEMPLATE_RENDERED_AFTER_REQUEST_NO | tokens rendered | event_log | TOKEN_MISSING |
| MESSAGE_CREATED | message row inserted | `communication_message` | — |
| MESSAGE_QUEUED | attempt row pending | `communication_delivery_attempt` | QUEUE_FAILED |
| DISPATCH_STARTED | dispatcher acquired attempt | event_log | DISPATCH_DISABLED |
| SENT | provider returned success (or dry-run stub) | attempt updated | PROVIDER_ERROR |
| DELIVERED | webhook confirmed | attempt updated | BOUNCED / COMPLAINED |

Distinguishing failures:
- **Module / adapter** — no request row, error surfaced in caller stack.
- **Policy** — request row exists with `status='blocked'` and blocker code.
- **Template / token** — request row exists, no message row, `TEMPLATE_*` event.
- **Sender** — SENDER_DISABLED / SENDER_UNVERIFIED lifecycle event.
- **Queue / dispatcher** — message row exists but no attempt or attempt stuck.
- **Provider** — attempt row with `status='failed'` + provider error payload.
- **Webhook** — attempt sent but never delivered/bounced update.
- **Scheduler** — `schedule_run` with `status='failed'`.

## Retention
Audit + trace rows are append-only. Never delete during incident recovery.
