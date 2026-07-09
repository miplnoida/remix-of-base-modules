# Phase 1C-B8-B — Live Eligibility Window Hardening

**Mode:** Build, audit-first. No live sending, no cron, no module cutover. All existing safety gates stay put.

## Mailbox receipt (blocker before implementation)

Please confirm the B8-A pilot email actually arrived at `rohit@mishainfotech.com` (Resend id `bbd18ddd-da09-42d1-b2e5-276115e4667b`, sent 2026-07-09 12:11:55 UTC). If it did **not** arrive, stop and trace Resend delivery status first — do not resend.

Assuming receipt is confirmed, the plan below runs.

---

## Goal

Close the near-miss found in B8-A: today, `claim_comm_hub_messages(..., p_include_live=true)` has no eligibility timestamp, so any historical queued `test_mode=false` row could be swept up the moment live gates open. Add a live eligibility window (start timestamp + max-age minutes) enforced in the claim RPC, dispatcher, and Control Center.

## Deliverables

### 1. Schema — `communication_hub_control_settings`

Add two columns:
- `live_eligible_after timestamptz null`
- `live_eligible_max_age_minutes int not null default 30` with CHECK `between 1 and 1440`

Trigger `chk_comm_hub_control_settings` updated to:
- When `email_live_enabled` transitions `false → true` and `NEW.live_eligible_after IS NULL`, auto-set `NEW.live_eligible_after = now()`.
- Never auto-clear on `true → false` (kept for audit/history).
- Keep existing allowlist/batch-size checks.

Audit rows written by the service layer for every changed key (`email_live_enabled`, `live_eligible_after`, `live_eligible_max_age_minutes`, `dry_run_only`), reason required.

### 2. Claim RPC — `public.claim_comm_hub_messages`

New signature (backwards-compatible default overload dropped; dispatcher updated in the same phase):

```
claim_comm_hub_messages(
  p_batch_size int,
  p_worker_id text,
  p_include_live boolean,
  p_live_eligible_after timestamptz default null,
  p_live_max_age_minutes int default 30
)
```

Rules inside the function (SECURITY DEFINER, `service_role` EXECUTE only, REVOKE from public/anon/authenticated):

- `test_mode=true` rows: claimable as today when `p_include_live=false` (or true — dry-run always allowed).
- `test_mode=false` rows: claimable **only** when ALL of:
  - `p_include_live = true`
  - `p_live_eligible_after IS NOT NULL`
  - `message.created_at >= p_live_eligible_after`
  - `message.created_at >= now() - make_interval(mins => p_live_max_age_minutes)`
- No auto-suppression, no state changes to ineligible rows — they stay `queued`.

### 3. Dispatcher — `comm-hub-dispatch`

- Read `live_eligible_after` and `live_eligible_max_age_minutes` from `communication_hub_control_settings`.
- `includeLive=false` → pass no eligibility args.
- `includeLive=true` and `live_eligible_after IS NULL` → **fail closed**: do not claim live rows; log `live_eligible_after_missing`; process dry-run only.
- Otherwise pass both eligibility args to the claim RPC.
- Response body adds: `liveEligibleAfterSet`, `liveEligibleAfter`, `liveEligibleMaxAgeMinutes`, `liveWindowOpen`, `liveWindowReason`, `includeLive`.
- No secrets in response.

### 4. Control Center UI

- Show/edit `live_eligible_max_age_minutes` (numeric, 1–1440).
- Read-only display of `live_eligible_after` with a "last live window start" label.
- When toggling `email_live_enabled` on, warn: "Only messages created after the new live window start will be eligible."
- All high-risk toggles keep the existing reason requirement.

### 5. Operational Panel

Add a card **"Live eligibility window"**:
- `live_eligible_after` (formatted, or "never")
- `live_eligible_max_age_minutes`
- Window status:
  - `CLOSED` when `email_live_enabled=false` OR `dry_run_only=true` OR env `COMMUNICATION_HUB_EMAIL_LIVE=false` (env inferred from dispatcher response, not read from browser)
  - `OPEN` otherwise
- `queued_live_outside_window` count
- `queued_live_inside_window` count
- Warning banner when `queued_live_outside_window > 0`

Add a **read-only** panel **"Historical queued live messages outside live window"** with columns: message id, `request_no`, `created_at`, `status`, `test_mode`, masked recipient, subject, reason. No bulk actions.

New RPC `get_comm_hub_live_window_status()` (SECURITY DEFINER, admin-gated) returning the counts and a small preview list (limit 50).

### 6. Verification (no live send)

- **A. Schema/settings** — column presence, defaults, current gates still safe.
- **B. Dry-run claim** — enqueue `comm-hub-live-window-dry-run-001` (`test_mode=true`), dispatch, expect `status=sent`, attempt `skipped`, no Resend call.
- **C. Historical live protection** — enqueue `comm-hub-live-window-historical-001` (`test_mode=false`) with env + DB gates OFF, dispatch, expect row stays `queued`, no attempt.
- **D. Live eligibility sim without env** — DB `email_live_enabled=true`, `dry_run_only=false`, `live_eligible_after=now()`; env stays `false`. Dispatch: expect `includeLive=false` (env hard gate), historical row untouched. Revert DB.
- **E. Direct claim RPC test** — service_role only, in a controlled query, prove ineligible rows are not returned. If not safe, mark NEEDS_REVIEW.
- **F. Legacy isolation** — `notification_queue` / `notification_logs` unchanged.
- **G. Typecheck** — must pass.

Report every step A–G plus BLOCKED_DO_NOT_TOUCH.

## Technical section

### Files touched

- `supabase/migrations/<new>.sql`
  - `ALTER TABLE communication_hub_control_settings ADD COLUMN live_eligible_after timestamptz`
  - `ADD COLUMN live_eligible_max_age_minutes int NOT NULL DEFAULT 30 CHECK (live_eligible_max_age_minutes BETWEEN 1 AND 1440)`
  - `CREATE OR REPLACE FUNCTION chk_comm_hub_control_settings` (adds transition auto-set)
  - `DROP FUNCTION IF EXISTS claim_comm_hub_messages(...)` (old sig) then `CREATE OR REPLACE FUNCTION claim_comm_hub_messages(...)` with new params; `REVOKE ALL ... FROM PUBLIC, anon, authenticated; GRANT EXECUTE ... TO service_role;`
  - `CREATE OR REPLACE FUNCTION get_comm_hub_live_window_status()` (SECURITY DEFINER, admin check via `is_admin`/`has_permission`)
- `supabase/functions/comm-hub-dispatch/index.ts` — read new settings columns, gate live claim, extend response.
- `src/pages/admin/communicationHub/controlCenter/controlCenterService.ts` — extend `CommHubControlSettings` type + validation, mark new keys high-risk.
- `src/pages/admin/communicationHub/controlCenter/ControlCenterPage.tsx` — add max-age input + last-window display + transition warning.
- `src/pages/admin/communicationHub/controlCenter/operationalService.ts` + `OperationalPanels.tsx` — new live-window card + historical read-only panel via new RPC.
- No changes to `notification_*` tables or any business module.

### Non-goals for this phase

- No bulk suppress / cancel UI.
- No cron scheduling.
- No manual dispatch UI (that's B8-C).
- No env flip. `COMMUNICATION_HUB_EMAIL_LIVE` stays `false`.
- No changes to Resend integration.

## Post-implementation invariant

`COMMUNICATION_HUB_EMAIL_LIVE=false`, `dry_run_only=true`, `email_live_enabled=false`, cron absent, allowlist `[rohit@mishainfotech.com]`, `allowed_email_domains=[]`, `live_eligible_after=null`, `live_eligible_max_age_minutes=30`.
