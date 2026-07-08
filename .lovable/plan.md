# Phase 1C-A — Secure Enqueue + Async Dispatcher Plan (PLAN ONLY, NO CODE CHANGES)

Scope: Design the server-side enqueue path and async dispatcher for the Enterprise Communication Hub. No code, migrations, or provider changes in this phase.

## 1. Recommended Architecture — Option C (Edge Function + SECURITY DEFINER RPC)

Two-layer server-side pipeline:

- **Edge function `comm-hub-enqueue`** — authenticated caller entry point. Validates auth (JWT), extracts `auth.uid()`, resolves module/department authorization, applies rate limits/idempotency, then invokes the RPC with the service-role client. Business modules call this function via `supabase.functions.invoke('comm-hub-enqueue', ...)`.
- **RPC `public.send_communication_v1(payload jsonb) returns jsonb`** (`SECURITY DEFINER`, `search_path=public`) — atomic writer for `communication_request`, `communication_recipient`, `communication_message`, `communication_event_log`. Ensures a single transactional enqueue and lets internal DB triggers/edge functions also enqueue safely.
- **Frontend façade `sendCommunication()` stays** but becomes a thin wrapper that (a) in admin/testMode may write directly (existing behavior), or (b) in production calls `comm-hub-enqueue`. No provider dispatch client-side.

Rationale: matches existing patterns in the repo (edge functions call service-role Supabase client for privileged writes; SECURITY DEFINER RPCs already used elsewhere). RPC gives atomicity; edge function gives authn/authz, rate limiting, request shaping.

## 2. Reuse Resolver / Template Logic (No Duplication)

- `resolveBusinessCommunicationContext`, `coreTemplateResolverService`, `businessEventCatalogue`, `resolveEffectiveSettingsBundle` remain the **single source of truth**.
- Move these resolvers into a **shared TS module usable by both the frontend façade and the edge function** (`supabase/functions/_shared/communication-hub/` — re-export from existing `src/platform/communication-hub` sources OR extract a pure `_shared` copy that the frontend also imports). Preferred: extract pure logic (no `window`, no `supabase` client capture) into `supabase/functions/_shared/communication-hub/resolvers.ts` and have `src/platform/communication-hub/sendCommunication.ts` import from a browser shim that delegates to the same pure functions.
- Edge function `comm-hub-enqueue` calls the shared resolvers server-side with a service-role client, so authorization decisions are not spoofable from the browser.
- The RPC itself does NOT do resolution — it receives already-resolved `subject/body_html/body_text/channel/template_version_id/branding_snapshot_id` from the edge function. Keeps SQL side simple and DB-portable.

## 3. Async Dispatcher — `comm-hub-dispatch`

Triggered by pg_cron (every 30–60s) and optionally by DB `NOTIFY` on insert.

Flow:
1. **Claim**: `UPDATE communication_message SET status='sending', locked_at=now(), locked_by=<worker_id> WHERE id IN (SELECT id FROM communication_message WHERE status='queued' AND (next_retry_at IS NULL OR next_retry_at <= now()) AND channel IN (<enabled>) ORDER BY created_at LIMIT :batch FOR UPDATE SKIP LOCKED) RETURNING *;`
2. Emit `DISPATCH_STARTED` event (`payload.stage`).
3. Resolve active provider from `notification_providers` for `(channel, org_scope)` → emit `PROVIDER_SELECTED`.
4. Dispatch by channel adapter (see §5).
5. Insert `communication_delivery_attempt` row (see §7).
6. On success: `communication_message.status='sent'`, `sent_at=now()`, `provider_message_id=…`; emit `SENT`.
7. On retryable failure: compute next backoff (see §9), `status='queued'`, `next_retry_at=…`, `attempts=attempts+1`; emit `RETRY_SCHEDULED`.
8. On terminal failure: `status='failed'`; emit `FAILED`.
9. Recompute `communication_request` roll-up (see §10).

Safety: `SKIP LOCKED` prevents double-processing; worker respects `MAX_BATCH` (default 25) and per-invocation time budget (< 25s to stay well under function timeout).

## 4. Channels In Scope for First Dispatcher Build

- **EMAIL** — via existing SMTP/Resend paths reused from `send-email-campaign` / `send-notification`.
- **IN_APP** — only if `notification_queue`/`notification_logs` compatibility insert is straightforward; otherwise defer.

Deferred: SMS (needs provider verification), PRINT/LETTER (Phase 1D — generated document materialization), WHATSAPP (later).

## 5. Reuse of Existing Email Code

- `supabase/functions/send-email-campaign/index.ts` (600 LOC): reuse its **provider selection + SMTP/Resend send helpers**, not its campaign loop. Extract the transport helpers into `supabase/functions/_shared/email/transport.ts` if not already shared; import from both.
- `supabase/functions/send-notification/index.ts` (464 LOC): reuse its **notification_providers lookup** and **provider credential decryption** patterns. Do not re-implement provider config.
- `supabase/functions/process-pending-notifications/index.ts` (76 LOC): mirror its cron+claim pattern; keep it running as-is for legacy `notification_queue`. `comm-hub-dispatch` is a **sibling worker**, not a replacement.
- Do NOT hardcode SSB branding/from-address; the Hub already renders content and stores `subject/body_html/body_text` on `communication_message`. The dispatcher sends verbatim.

## 6. Provider Configuration

- Source of truth: `notification_providers` (existing table). No new provider settings table.
- Selection order: (a) module/department override, (b) org default active provider for channel, (c) global default. Use existing `resolveEffectiveSettingsBundle` if it already exposes provider preference; otherwise a small helper in `_shared/communication-hub/providers.ts`.
- Secrets: remain in Supabase Vault / edge-function env (`RESEND_API_KEY`, SMTP creds). Never surfaced to frontend or to RPC payloads.
- Provider response IDs stored on `communication_message.provider_message_id` and on the `communication_delivery_attempt.provider_response_id`.

## 7. `communication_delivery_attempt` Insert Shape

Per attempt:
```
message_id                = <uuid>
attempt_number            = <n>              -- 1-based, incremented
provider_code             = 'resend' | 'smtp' | ...
provider_request_summary  = jsonb { to, from, subject, template_code, size_bytes }
provider_response_summary = jsonb { status_code, message_id, raw_status }
status                    = 'accepted' | 'failed' | 'skipped'
error_code                = nullable
error_message             = nullable (redacted, no PII/secret)
attempted_at              = now()
completed_at              = now() on terminal, null while in-flight
next_retry_at             = null unless retry scheduled
```
Never mutate a prior attempt row; always append.

## 8. Lifecycle Events (respect existing CHECK constraints)

Canonical `event_type` values (as `eventLogService` already uses), with fine-grained stage in `payload.stage`:

| Stage (payload.stage)  | event_type (canonical) |
| ---------------------- | ---------------------- |
| DISPATCH_STARTED       | `dispatched` or `queued` (whichever is allowed) |
| PROVIDER_SELECTED      | `dispatched` |
| SEND_STARTED           | `dispatched` |
| PROVIDER_ACCEPTED      | `sent` |
| SENT                   | `sent` |
| FAILED                 | `failed` |
| RETRY_SCHEDULED        | `queued` |
| SUPPRESSED             | `failed` |
| BOUNCED (Phase 1D+)    | `failed` |

Follow the same pattern already in `eventLogService.ts`. Do not alter DB constraints.

## 9. Retry Flow (uses `communication_retry_policy`)

- Read policy by `(channel, module_code)`, fall back to default row.
- Fields consumed: `max_attempts`, `base_delay_seconds`, `backoff_factor`, `max_delay_seconds`, `jitter_seconds`.
- `next_retry_at = now() + min(base * factor^(attempt-1), max) + rand(0..jitter)`.
- Retryable errors: 429, 5xx, network timeout, SMTP transient (4xx). Non-retryable: 4xx (except 408/429), invalid recipient, suppression hit → move straight to `failed`.
- On `attempts >= max_attempts` → terminal `failed`.

## 10. `communication_request` Roll-up

Recompute after each message state change (small SQL helper `public.recompute_communication_request_status(request_id)`):

- All messages `sent` → `completed`.
- Any `queued`/`sending` remaining → `dispatching` (from `pending` on first claim).
- All terminal, mix of `sent` + `failed` → `partial`.
- All terminal, all `failed` → `failed`.
- `cancelled` is terminal and short-circuits recompute.

## 11. Safety and Test Mode

- Global env flags: `COMMUNICATION_HUB_DISPATCH_ENABLED` (default `false`), `COMMUNICATION_HUB_EMAIL_LIVE` (default `false`).
- `communication_message.test_mode = true` messages: dispatcher renders + logs `SENT` with `provider_code='dry-run'`, but does NOT call provider unless `COMMUNICATION_HUB_TESTMODE_LIVE_SEND=true`.
- Dispatcher filters `WHERE origin = 'comm_hub'` (or equivalent tag) so it **never** touches rows created by legacy Benefits/Legal/Compliance flows.
- No writes to `notification_queue`, `notification_logs`, `bn_communication_log`, `ce_notice_delivery_log`. Optional read-only compatibility mirror deferred to Phase 1D.

## 12. Compatibility

- Existing production flows (BN, Legal, Compliance, Finance, Employer, Registration) continue using their current code paths.
- No module migration in Phase 1C. Migration is Phase 2+.

---

## Files/Functions to Add or Change in Phase 1C-B

**New (edge functions):**
- `supabase/functions/comm-hub-enqueue/index.ts` — authenticated enqueue entry point.
- `supabase/functions/comm-hub-dispatch/index.ts` — cron-driven dispatcher worker.
- `supabase/functions/_shared/communication-hub/resolvers.ts` — extracted pure resolver wrappers.
- `supabase/functions/_shared/communication-hub/providers.ts` — provider selection helper.
- `supabase/functions/_shared/email/transport.ts` — extracted SMTP/Resend transport (if not already shared).

**New (DB, Phase 1C-B migration):**
- RPC `public.send_communication_v1(payload jsonb) returns jsonb` (SECURITY DEFINER).
- Helper `public.recompute_communication_request_status(uuid)`.
- pg_cron schedule invoking `comm-hub-dispatch` every 60s.
- (If missing) columns on `communication_message`: `locked_at`, `locked_by`, `attempts`, `next_retry_at`, `test_mode`, `origin` — **verify existence in Phase 1C-B; do NOT assume**.

**Modified (thin):**
- `src/platform/communication-hub/sendCommunication.ts` — route to `comm-hub-enqueue` in non-admin/non-test mode; keep current direct-write path for admin/testMode.
- `src/platform/communication-hub/index.ts` — export new client wrapper.

**Untouched:**
- All existing `communication_*` tables' schemas beyond the additive columns above.
- `notification_providers`, `notification_queue`, `notification_logs`, `bn_communication_log`, `ce_notice_delivery_log`.
- `send-email-campaign`, `send-notification`, `process-pending-notifications`, `dispatch-core-document`.
- `core_template*`, `comm_*`, `generated_documents`.

---

## Testing Plan

1. **Unit (Deno tests on `_shared/communication-hub/*`)** — resolver pure-function tests, provider selection, retry backoff math, roll-up logic.
2. **RPC integration** — call `send_communication_v1` with fixture payloads via `supabase.rpc`; assert row shape in `communication_*`.
3. **Edge function integration** — `comm-hub-enqueue` end-to-end with test JWT; assert unauthorized rejection; assert idempotency reuse.
4. **Dispatcher dry-run** — seed 10 queued messages with `test_mode=true`; invoke `comm-hub-dispatch`; assert `provider_code='dry-run'`, attempts inserted, request rolled up to `completed`.
5. **Retry path** — inject provider stub returning 500 twice then 200; assert 3 attempt rows, final `sent`, correct backoff timestamps.
6. **Isolation** — assert dispatcher ignores rows lacking `origin='comm_hub'`.
7. **Regression** — run existing BN/Legal/Compliance flows unchanged; assert no rows leak into new dispatcher.

---

## Risks / Classification

**SAFE_TO_FIX_NOW** (for Phase 1C-B):
- Add new edge functions `comm-hub-enqueue`, `comm-hub-dispatch`.
- Extract shared resolvers/transport helpers.
- Add RPC `send_communication_v1` (additive).
- Add pg_cron schedule for dispatcher (behind env flag).

**NEEDS_REVIEW**:
- Confirm `communication_message` has (or accept additive migration for): `locked_at`, `locked_by`, `attempts`, `next_retry_at`, `test_mode`, `origin`. If missing, migration is additive and low-risk but should be reviewed.
- `communication_event_log` CHECK constraint canonical values — confirm allowed enum before wiring new stages.
- `communication_retry_policy` row existence and default fallback.
- Whether an existing shared email transport helper already exists (avoid duplicate).
- RLS on `communication_*` currently admin-only; RPC bypass via SECURITY DEFINER must be reviewed by security.
- Rate-limiting strategy for `comm-hub-enqueue` (per user / per module).

**BLOCKED_DO_NOT_TOUCH**:
- `notification_queue`, `notification_logs`, `bn_communication_log`, `ce_notice_delivery_log`.
- `send-email-campaign`, `send-notification`, `process-pending-notifications`, `dispatch-core-document` runtime behavior.
- Any Benefits/Legal/Compliance module send code.
- `core_template*` and `comm_*` schemas.
- Provider secrets and `notification_providers` schema.

---

## Recommended Build Prompt for Phase 1C-B

> PHASE 1C-B — Build secure enqueue RPC + `comm-hub-enqueue` edge function + `comm-hub-dispatch` async worker (EMAIL only, test-mode default). Follow the Phase 1C-A plan. Audit-first. Additive migration only for missing `communication_message` columns (`locked_at`, `locked_by`, `attempts`, `next_retry_at`, `test_mode`, `origin`) and helper functions (`send_communication_v1`, `recompute_communication_request_status`). Do not modify legacy notification tables, do not touch Benefits/Legal/Compliance runtime, do not hardcode provider secrets in frontend, keep `COMMUNICATION_HUB_DISPATCH_ENABLED=false` and `COMMUNICATION_HUB_EMAIL_LIVE=false` by default. Extract shared resolvers to `supabase/functions/_shared/communication-hub/`. Unit + integration + dry-run tests required before enabling live email. Classify all findings SAFE_TO_FIX_NOW / NEEDS_REVIEW / BLOCKED_DO_NOT_TOUCH.

---

**No code changes were applied in Phase 1C-A. Plan-only deliverable.**
