# Phase 1C-B8-C — Targeted One-Time Manual Dispatch Workflow (Dry-Run Only)

**Mode:** Build, safety-first. No live email. No cron. No module migration. No env flip.

## Guardrails (unchanged)

- `COMMUNICATION_HUB_EMAIL_LIVE=false` stays.
- DB `dry_run_only=true`, `email_live_enabled=false` stay.
- Allowlist stays `[rohit@mishainfotech.com]`, no domain allowlist.
- Cron stays absent. No changes to `notification_*` or business modules.
- No secret ever leaves the server; frontend never sees dispatch secret or service role.

## 1. Targeted claim RPC (new)

New function, does NOT touch existing `claim_comm_hub_messages`:

```
public.claim_comm_hub_message_by_id(
  p_message_id uuid,
  p_worker_id text,
  p_include_live boolean,
  p_live_eligible_after timestamptz default null,
  p_live_max_age_minutes int default 30
) returns public.communication_message
```

- `SECURITY DEFINER`, `search_path=public`.
- `REVOKE ALL FROM public, anon, authenticated`; `GRANT EXECUTE TO service_role`.
- `SELECT ... FOR UPDATE SKIP LOCKED` on the exact id.
- Requires: `origin='comm_hub'`, `channel='email'`, `status='queued'`, `next_attempt_at IS NULL OR <= now()`, lock null or stale (>10 min).
- `test_mode=true`: claimable regardless of `p_include_live`.
- `test_mode=false`: requires `p_include_live=true`, `p_live_eligible_after IS NOT NULL`, `created_at >= p_live_eligible_after`, `created_at >= now() - make_interval(mins=>p_live_max_age_minutes)`.
- On claim: `status='sending'`, `attempt_count+=1`, `locked_at=now()`, `locked_by=p_worker_id`, `last_attempt_at=now()`. Returns the row, else no row.

## 2. Dispatcher — target mode

Extend `supabase/functions/comm-hub-dispatch/index.ts` request body:

```
{ batchSize?: number, targetMessageId?: string, manual?: boolean, reason?: string }
```

When `targetMessageId` present:
- Skip batch claim entirely.
- Call `claim_comm_hub_message_by_id` with the same eligibility args the batch path computes.
- Process only that one message through existing per-message send/dry-run logic.
- No fallback to batch on failure.
- Response adds: `targetMode=true`, `targetMessageId`, `claimed`, `processed`, `includeLive`, `liveWindowOpen`, `liveWindowReason`, and one of `target_not_claimable | target_outside_live_window | target_not_queued | target_not_found` when nothing was claimed.
- Existing batch behavior untouched when `targetMessageId` absent.

## 3. Admin-only edge function (server-side broker)

New `supabase/functions/comm-hub-manual-dispatch-test/index.ts`:

- Requires authenticated admin (checks `has_role(auth.uid(),'admin')` via service_role client).
- Body: `{ recipientEmail, recipientName, subject, bodyText, testMode, reason, typedConfirmation }`.
- Validates `typedConfirmation === 'DISPATCH ONE TEST MESSAGE'`, non-empty reason.
- Phase gate: forces `testMode=true` regardless of input (with a warning field in response). Live path returns `live_blocked_this_phase`.
- Server flow:
  1. Insert `communication_request` + `communication_message` (origin=`comm_hub`, channel=`email`, status=`queued`, `test_mode=true`, idempotency key `manual-<uuid>`).
  2. Invoke `comm-hub-dispatch` with `{ targetMessageId, manual:true }` using `Deno.env.COMMUNICATION_HUB_DISPATCH_SECRET`.
  3. Fetch resulting message row + latest attempt + event log entries.
  4. Insert audit row into `communication_hub_control_audit` with `setting_key='manual_dispatch_test'`, masked recipient, actor, reason, result summary.
- Never returns provider secrets, service role, or dispatch secret.

## 4. Control Center UI

New section on `ControlCenterPage.tsx`: **"One-Time Manual Dispatch Test"** (collapsed by default).

Fields: recipient email, recipient name, subject, body text, testMode toggle (defaulting true, live option disabled with tooltip explaining phase gate + live window state), reason, typed-confirmation input.

Client-side validations:
- Recipient must match `allowed_email_addresses` exactly if user tries to enable live (blocked this phase anyway).
- Reason non-empty.
- Typed confirmation exact match.
- No batch dispatch controls.

On submit: call new edge function via `supabase.functions.invoke` (user JWT), display returned `requestId`, `messageId`, dispatcher response, message state, attempts, event log entries.

New service file: `manualDispatchService.ts` in `src/pages/admin/communicationHub/controlCenter/`.

## 5. Audit

Reuse `communication_hub_control_audit` with `setting_key='manual_dispatch_test'`, `new_value` JSON of `{ request_id, message_id, test_mode, recipient_masked, reason, result }`, `changed_by=auth.uid()`, `source='manual-dispatch-test'`.

## 6. Verification (dry-run only)

- **A.** Confirm new RPC exists, grants correct (query `pg_proc` + `has_function_privilege`).
- **B.** Enqueue test-mode message via new function → assert `status=sent`, attempt `skipped`, `provider_message_id` starts `dry-run:`, no Resend call.
- **C.** Target-mode called with (i) non-existent id → `target_not_found`, claimed=0; (ii) already-sent id → `target_not_queued`; (iii) synthetic historical live row w/ env off → `target_not_claimable`/`target_outside_live_window`, no unrelated row claimed.
- **D.** UI dry-run flow end-to-end (manual/spot-check note in report).
- **E.** grep bundle for dispatch secret / service role → none.
- **F.** `notification_queue` / `notification_logs` row counts unchanged.
- **G.** `get_comm_hub_cron_status()` → absent.

## Files touched

- New migration: targeted claim RPC + grants.
- `supabase/functions/comm-hub-dispatch/index.ts` — add target mode branch.
- New `supabase/functions/comm-hub-manual-dispatch-test/index.ts`.
- `supabase/config.toml` — register new function (verify_jwt=true).
- `src/pages/admin/communicationHub/controlCenter/ControlCenterPage.tsx` — add section.
- New `src/pages/admin/communicationHub/controlCenter/ManualDispatchTestPanel.tsx`.
- New `src/pages/admin/communicationHub/controlCenter/manualDispatchService.ts`.

## Non-goals

- No live send. No env flip. No cron. No allowlist changes. No provider changes. No module cutover. No batch-from-UI. No changes to existing `claim_comm_hub_messages`.

## Post-phase invariant

All B8-B invariants hold; additionally: targeted claim RPC exists and is service-role-only; dispatcher supports target mode; new admin edge function present; UI panel present but hard-limited to dry-run.

## Recommended next step

Phase 1C-B8-D — one live email through the targeted workflow after explicit approval and confirmed B8-A receipt.
