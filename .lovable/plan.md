# Phase 1A — Communication Hub Sending Spine: DB Reconciliation Plan

## 1. Inventory of what exists today

| Table | Status | Row count | Role today |
|---|---|---|---|
| `notification_queue` | exists (24 cols, RLS off) | 0 | Legacy per-message queue used by legacy notification adapters. Carries `template_key`, `channel`, `recipient_*`, `module`, `entity_type/id`, `status`, `retry_count`, `provider_message_id`, `scheduled_at`. No parent request, no per-attempt history. |
| `notification_logs` | exists (20 cols) | 56 | Delivery log for real Resend/email path. Has `channel`, `recipient_*`, `status`, `resend_message_id`, `retry_count`, `campaign_id`. Per-message, not per-attempt. |
| `notification_providers` | exists (15 cols) | — | Canonical provider config (email/sms/push). Reuse as-is. |
| `notification_templates` (+ versions + audit) | exists | — | Legacy template shell, already bridged to `core_template*` via `mapped_core_template_id` + `migration_status`. |
| `notification_types` | exists | — | Event catalogue. Reusable as event registry seed. |
| `core_generated_document` | exists (53 cols) | 43 | Canonical rendered artifact (PDF/HTML). Already carries `channel_code`, `delivery_status`, `delivered_at`, `recipient_address`, `dms_*`. |
| `bn_communication_log` | exists (20 cols) | 57 | BN per-claim comm log. Duplicates delivery info. |
| `ce_notice_delivery_log` | exists (12 cols) | 10 | CE notice per-attempt log — already close in shape to a delivery-attempt table but scoped to `notice_id`. |
| `communication_events / _templates / _recipients / _deliveries / _attachments / _approvals / _log` | **do NOT exist** | — | The `communication_*` namespace is unused in the DB. |
| `communication_request / _delivery_attempts / _event_log / _retry_policies` | **do NOT exist** | — | Missing. |

Key finding: there is no `communication_*` namespace in the database. The comm spine today is `notification_queue` (parent-ish, unused) + `notification_logs` (per-message) + module-specific logs (`bn_communication_log`, `ce_notice_delivery_log`). `core_generated_document` is the canonical rendered artifact and must not be re-implemented.

## 2. Target spine (Phase 1A)

```text
communication_request      (1 business intent)
  └── communication_message (per channel; = extended "delivery")
        ├── communication_delivery_attempt (per provider send try)
        ├── communication_attachment       (link to core_generated_document / storage refs)
        └── communication_event_log        (lifecycle events: queued, sent, delivered, bounced, opened, retried, cancelled)
communication_recipient    (per request; supports multi-recipient / cc / bcc)
communication_approval     (approval gates before send)
communication_retry_policy (per channel/provider rules)
```

## 3. Existing tables to **reuse as-is** (no schema changes)

- `notification_providers` — provider config (canonical).
- `notification_templates` + `core_template*` — template catalogue (canonical, already bridged).
- `notification_types` — event catalogue seed for `communication_event.event_code`.
- `core_generated_document` — rendered PDF/HTML artifact; referenced from `communication_attachment` and `communication_message.generated_document_id`. Do NOT duplicate.
- `comm_letterhead`, `comm_email_signature`, `comm_disclaimer`, `comm_print_footer`, `comm_media_asset` — branding assets, resolved by existing resolvers.

## 4. Existing tables to **extend** (additive columns only)

None in Phase 1A. Rationale: `notification_queue` (0 rows, legacy adapter surface) and `notification_logs` (56 rows, active) will stay untouched behind compatibility views/writers (Section 8). Extending them would leak the new spine's shape into the legacy contract and complicate rollback.

`ce_notice_delivery_log` and `bn_communication_log` are read-only historical logs from the module's perspective — do not alter shape.

## 5. New tables (create in `public`)

All follow the mandatory sequence: CREATE TABLE → GRANT → ENABLE RLS → CREATE POLICY. `created_at`/`updated_at` + `update_updated_at_column` trigger on every table.

### 5.1 `communication_request` (parent)
Business intent to communicate. One row per `sendCommunication()` call.

Columns:
- `id uuid pk`
- `request_no text unique not null` (from `core_number_sequence`, prefix `CR-`)
- `module_code text not null`, `department_code text`, `event_code text not null` — FK-lite to `notification_types.type_key` when present
- `entity_type text`, `entity_id text` (polymorphic business ref)
- `reference_no text` (business reference, e.g. claim_no, notice_no)
- `template_id uuid` → `notification_templates.id` (nullable — resolver may pick at send time)
- `core_template_id uuid` → `core_template.id`
- `country_code text`, `language_code text`
- `channels text[] not null` (requested channels; message rows created per channel)
- `priority text not null default 'normal'` (`low|normal|high|urgent`)
- `scheduled_at timestamptz`
- `status text not null default 'pending'` (`pending|approved|dispatching|completed|partial|failed|cancelled`)
- `payload jsonb not null default '{}'` (token data)
- `context jsonb not null default '{}'` (resolver snapshot: sender, branding refs)
- `idempotency_key text unique` (module + business ref hash)
- `requested_by uuid`, `approved_by uuid`, `approved_at timestamptz`
- audit timestamps

### 5.2 `communication_recipient`
- `id uuid pk`
- `request_id uuid not null` → `communication_request(id) on delete cascade`
- `role text not null` (`to|cc|bcc|reply_to`)
- `recipient_type text` (`person|employer|external|role`)
- `recipient_user_id uuid`, `recipient_person_id uuid`, `recipient_employer_id uuid`
- `name text`, `email text`, `phone text`, `postal_address jsonb`
- `channel_hint text` (preferred channel for this recipient)

### 5.3 `communication_message` (per-channel; replaces the "per-message" concept in `notification_queue`)
Naming: **`communication_message`** rather than `communication_deliveries`, because `communication_delivery_attempt` covers the attempt semantics and this keeps parent/attempt terminology clean. This is the same concept the brief calls "communication_deliveries".

- `id uuid pk`
- `request_id uuid not null` → `communication_request(id) on delete cascade`
- `recipient_id uuid` → `communication_recipient(id)`
- `channel text not null` (`email|sms|push|in_app|letter|print|whatsapp`)
- `provider_id uuid` → `notification_providers(id)`
- `template_version_id uuid` → `core_template_version(id)`
- `subject text`, `body_text text`, `body_html text`
- `rendered_at timestamptz`
- `generated_document_id uuid` → `core_generated_document(id)` (for letter/print/PDF-backed email)
- `status text not null default 'queued'` (`queued|sending|sent|delivered|failed|bounced|cancelled|suppressed`)
- `attempt_count int not null default 0`
- `last_attempt_at timestamptz`, `next_attempt_at timestamptz`, `sent_at timestamptz`, `delivered_at timestamptz`
- `provider_message_id text`, `error_code text`, `error_message text`

### 5.4 `communication_delivery_attempt`
- `id uuid pk`
- `message_id uuid not null` → `communication_message(id) on delete cascade`
- `attempt_no int not null`
- `provider_id uuid` → `notification_providers(id)`
- `started_at timestamptz not null default now()`, `finished_at timestamptz`
- `status text not null` (`success|failure|timeout|throttled|skipped`)
- `provider_message_id text`, `provider_response jsonb`, `error_code text`, `error_message text`
- `retry_reason text`
- unique `(message_id, attempt_no)`

### 5.5 `communication_event_log`
Per-message lifecycle events (webhook + internal).
- `id uuid pk`
- `message_id uuid` → `communication_message(id) on delete cascade` (nullable so request-level events can be logged with request_id only)
- `request_id uuid` → `communication_request(id) on delete cascade`
- `event_type text not null` (`created|approved|queued|sent|delivered|opened|clicked|bounced|complained|failed|retried|cancelled|suppressed`)
- `occurred_at timestamptz not null default now()`
- `source text` (`internal|resend|twilio|sendgrid|manual|webhook`)
- `payload jsonb`
- `actor_user_id uuid`

### 5.6 `communication_attachment`
- `id uuid pk`
- `message_id uuid not null` → `communication_message(id) on delete cascade`
- `generated_document_id uuid` → `core_generated_document(id)`
- `storage_ref text`, `filename text`, `mime_type text`, `size_bytes bigint`
- `role text` (`primary|supporting|legal_reference`)

### 5.7 `communication_approval`
- `id uuid pk`
- `request_id uuid not null` → `communication_request(id) on delete cascade`
- `policy_ref text` (name of approval policy applied)
- `required_role text`, `required_permission text`
- `status text not null default 'pending'` (`pending|approved|rejected|skipped`)
- `decided_by uuid`, `decided_at timestamptz`, `decision_note text`
- `sequence int not null default 1` (multi-step approvals)

### 5.8 `communication_retry_policy`
Config table; seeded, not per-message.
- `id uuid pk`
- `channel text not null`, `provider_id uuid` → `notification_providers(id)` (nullable = default for channel)
- `max_attempts int not null default 3`
- `initial_delay_seconds int not null default 60`
- `backoff_strategy text not null default 'exponential'` (`fixed|linear|exponential`)
- `backoff_multiplier numeric not null default 2.0`
- `max_delay_seconds int not null default 3600`
- `retryable_error_codes text[]`
- `is_active boolean not null default true`
- unique `(channel, provider_id)`

## 6. Foreign key relationships (summary)

```text
communication_request 1─* communication_recipient
communication_request 1─* communication_message ─1 communication_recipient
communication_message 1─* communication_delivery_attempt
communication_message 1─* communication_event_log       (also request 1─* event_log)
communication_message 1─* communication_attachment ─? core_generated_document
communication_request 1─* communication_approval
communication_message ?─1 notification_providers
communication_message ?─1 core_template_version
communication_request ?─1 notification_templates / core_template
communication_retry_policy ?─1 notification_providers
```

No FK from `communication_*` into module tables (BN/CE/Legal) — polymorphic `entity_type/entity_id` only, matching existing `notification_queue` and `core_generated_document` conventions.

## 7. RLS / security

All 8 new tables:
- `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated;`
- `GRANT ALL ... TO service_role;` (edge functions dispatch here)
- No `anon` grants.
- `ENABLE ROW LEVEL SECURITY`.

Policies (Phase 1A — permissive but role-gated; tightened in Phase 1B when the façade lands):
- **Read**: `authenticated` may read rows for their module scope. Use existing `has_permission(auth.uid(), 'view_communications')` (or `view_notifications` if that's the current one — will reuse whichever `NotificationChannelSettings` uses). Admins bypass via `has_role(auth.uid(),'admin')`.
- **Insert/Update**: only through the `sendCommunication()` façade running as `service_role`, OR by users with `manage_communications` / `system_administration`. Direct client inserts blocked by policy.
- **Delete**: `service_role` only (audit trail preserved).
- `communication_retry_policy`: read to `authenticated`, write to `system_administration` only.
- `communication_approval`: update restricted to users with the `required_permission` on the row (via `has_permission(auth.uid(), required_permission)`).

Use `SECURITY DEFINER` helper `public.can_access_communication_request(_uuid)` to avoid recursion when messages/attempts/events check the parent's scope.

## 8. Compatibility strategy (no breaking changes)

Goal: existing writers to `notification_queue`, `notification_logs`, `bn_communication_log`, `ce_notice_delivery_log` keep working; the Hub becomes the source of truth going forward.

Phase 1A (this migration) does NOT modify or drop any of these tables. It only adds the spine plus **read-only compatibility views** to smooth Phase 1B façade rollout:

1. **`notification_queue`** (0 rows, unused): leave intact. In Phase 1B the legacy `notificationAdapter` will be rewritten to call the façade; queue becomes a shim. No data migration needed.

2. **`notification_logs`** (56 rows, active): keep as the historical log for legacy paths. Add nullable column `communication_message_id uuid` (single additive column — this is the one exception to Section 4, only if we can add it cleanly) OR skip and correlate via `resend_message_id`↔`provider_message_id`. **Decision**: skip the column in 1A, correlate by provider id. New sends via the façade write to `communication_message` + a mirror row in `notification_logs` in Phase 1B for continuity of the existing Email Audit UI.

3. **`bn_communication_log`** (57 rows): keep. Create view `v_bn_communication_log_unified` that UNIONs legacy rows with new spine rows filtered by `module_code='BN'`, joined to `bn_claim.id = entity_id`. BN screens can migrate to the view when convenient. Legacy writers untouched.

4. **`ce_notice_delivery_log`** (10 rows): keep. Its shape maps well to `communication_delivery_attempt`. Create view `v_ce_notice_delivery_log_unified` similarly, filtered by `module_code='COMPLIANCE'` + `entity_type='ce_notice'`.

5. **`core_generated_document`**: unchanged. `communication_message.generated_document_id` FK-references it. Existing letter/PDF flows keep writing to it directly; the façade will link when it's called.

6. **No backfill in 1A.** Backfill of `bn_communication_log` / `ce_notice_delivery_log` / `notification_logs` into the new spine is deferred to Phase 1C after the façade is live, so the migration is fully rollback-safe.

## 9. Rollback-safe migration sequence

Split into 3 approval-gated migrations. Each is independently reversible.

**Migration 1 — Retry policy + request/recipient (base)**
1. `CREATE TABLE communication_retry_policy` + grants + RLS + policy
2. `CREATE TABLE communication_request` + grants + RLS + policy + `update_updated_at` trigger + `SECURITY DEFINER` helper `can_access_communication_request`
3. `CREATE TABLE communication_recipient` + grants + RLS + policy
4. Seed default retry policies for `email/sms/push/in_app/letter/print` (channel defaults, no provider).

Rollback: drop 3 tables + helper + policies.

**Migration 2 — Message + attempts + attachments + events**
1. `CREATE TABLE communication_message` (FK to request/recipient/providers/template_version/generated_document) + grants/RLS/policy/trigger
2. `CREATE TABLE communication_delivery_attempt` + grants/RLS/policy
3. `CREATE TABLE communication_attachment` + grants/RLS/policy
4. `CREATE TABLE communication_event_log` + grants/RLS/policy
5. Indexes: `(request_id)`, `(status, next_attempt_at)` on message; `(message_id, attempt_no)` unique on attempt; `(message_id, occurred_at)` and `(request_id, occurred_at)` on event log.

Rollback: drop 4 tables.

**Migration 3 — Approvals + compatibility views**
1. `CREATE TABLE communication_approval` + grants/RLS/policy
2. `CREATE VIEW v_bn_communication_log_unified`
3. `CREATE VIEW v_ce_notice_delivery_log_unified`
4. `CREATE VIEW v_communication_message_full` (message + latest attempt + last event) for future Delivery Monitor page

Rollback: drop views + approval table.

Nothing in these 3 migrations alters or drops an existing table. Full rollback = 3 reverse migrations, zero data loss.

## 10. Explicit non-goals for Phase 1A

- No `sendCommunication()` façade implementation (Phase 1B).
- No changes to `resolveBusinessModuleCommunicationContext`, `coreTemplateResolverService`, `notificationDispatchResolver`.
- No rewrites of `bnCommunicationAdapter` / `notificationAdapter`.
- No data backfill from legacy logs (Phase 1C).
- No new UI wiring in the Delivery Monitor / Retry Queue placeholders — they stay placeholders until Phase 1B.
- No changes to `notification_providers`, `notification_templates`, `core_template*`, `core_generated_document` shape.

## Open questions before I write migrations

1. **Permission name** — should new-spine RLS use existing `view_notifications` / `manage_notifications` / `system_administration`, or a new `manage_communications` permission (registered via `core_permission_registry`)? Recommendation: reuse `view_notifications` for read and `system_administration` for write in 1A; introduce `manage_communications` in 1B alongside the façade.
2. **`notification_logs.communication_message_id`** — add now (single additive nullable column) or defer to 1B? Recommendation: defer; correlate via provider ids.
3. **Idempotency scope** — is `idempotency_key` unique globally or per `(module_code, event_code)`? Recommendation: globally unique text (module encodes its own prefix), matches Stripe-style semantics.
