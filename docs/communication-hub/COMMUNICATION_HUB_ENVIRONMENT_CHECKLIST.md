# Communication Hub — Environment Checklist

Use before any configuration work.

## Repository
- [ ] Correct branch / commit checked out
- [ ] `bun install` succeeds
- [ ] `bun run lint` clean
- [ ] `bun run lint:comm-governance` clean (no direct provider calls, no legacy queue writes)
- [ ] `bun run test` passes
- [ ] `bun run build` passes

## Secrets (verify presence, never print values)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — edge functions
- [ ] `RESEND_API_KEY` — `comm-hub-dispatch`
- [ ] `COMM_HUB_DISPATCH_SECRET`
- [ ] `COMM_HUB_RESEND_WEBHOOK_SECRET`
- [ ] `COMMUNICATION_HUB_EMAIL_LIVE` (bool)
- [ ] `COMMUNICATION_HUB_EMAIL_LIVE_ALLOWLIST` (comma list)
- Verify via preflight: `EnvironmentReadinessCard` on Governance page returns all `*_Present=true`.

## Database
- [ ] All `communication_hub_*` tables exist
- [ ] `communication_request`, `communication_recipient`, `communication_message`, `communication_delivery_attempt`, `communication_event_log` exist
- [ ] `core_template_master`, `core_template_version` exist
- [ ] `scripts/comm-hub/assert_template_mapping.sql` returns 0 broken mappings

## Edge functions deployed
- [ ] `comm-hub-event-pilot`
- [ ] `comm-hub-enqueue`
- [ ] `comm-hub-dispatch`
- [ ] `comm-hub-manual-dispatch-test`
- [ ] `comm-hub-resend-webhook`
- [ ] `comm-hub-sender-verification`
- [ ] `comm-hub-trace-simulate`

## Safety defaults (Control Center)
- [ ] `dry_run_only=true`
- [ ] `email_live_enabled=false`
- [ ] `cron_desired_enabled=false`
- [ ] `bulk_enabled=false`
- [ ] `external_release=false`
- [ ] `dispatch_enabled=true`

## UI reachability
- [ ] `/admin/communication-hub` loads
- [ ] Control Center, Governance, Test & Diagnostics, Trace Center, Delivery Monitor, Retry Queue, Requests all load
