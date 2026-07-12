# EPIC CH-RECIPIENT-1 — Recipient Control Center & Progressive Release Modes

Replace the hardcoded "Rohit-only" allowlist gate with a UI-managed, staged recipient release model. No email is sent, no cron/bulk/external is enabled in this epic.

## 1. Schema changes (migration)

Extend `communication_hub_control_settings`:

```sql
ALTER TABLE public.communication_hub_control_settings
  ADD COLUMN IF NOT EXISTS recipient_release_mode text
    NOT NULL DEFAULT 'single_recipient_pilot';

-- Enforce allowed values via trigger (not CHECK, per project rules)
CREATE OR REPLACE FUNCTION public.validate_recipient_release_mode_tg()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.recipient_release_mode NOT IN (
    'single_recipient_pilot','internal_named_users','internal_domain_pilot',
    'internal_production','approved_external_domains','approved_user_segments',
    'full_production_controlled'
  ) THEN
    RAISE EXCEPTION 'invalid recipient_release_mode: %', NEW.recipient_release_mode;
  END IF;
  RETURN NEW;
END $$;
```

Backfill existing row to `single_recipient_pilot`.

## 2. New RPC — `validate_comm_hub_recipient_release_mode`

Pure function returning `jsonb { ok, mode, blockers[], summary }`. Rules exactly per spec (single_recipient_pilot / internal_named_users / internal_domain_pilot / internal_production valid; three future modes return their respective `*_phase_not_enabled` blockers). Blocker codes:

- `recipient_release_mode_invalid`
- `single_recipient_required`
- `internal_email_required`
- `internal_domain_required`
- `external_domain_phase_not_enabled`
- `user_segment_phase_not_enabled`
- `full_production_phase_not_enabled`

Grants: `EXECUTE TO authenticated, service_role`.

## 3. Patch `open_comm_hub_live_window`

Replace the hardcoded Rohit-only check with:
1. Read `recipient_release_mode` + `allowed_email_addresses` + `allowed_email_domains` from settings.
2. Call the new validator.
3. If `ok=false`, abort with blockers written to audit + returned in error payload.
4. All existing gates preserved: admin role, reason, typed confirmation, event permitted, event status `live_manual_only`, `live_queued=0`, max duration cap, cron off, bulk off.

## 4. UI — `/admin/communication-hub/recipient-control`

New page `RecipientControlCenterPage.tsx` with sections:

1. **Current Mode Card** — mode label, plain-language explanation, validator status.
2. **Mode Progression** — 7-stage stepper; future 3 stages shown as locked.
3. **Allowed Individual Emails** — CRUD on `allowed_email_addresses` (with mode-appropriate validation).
4. **Allowed Domains** — CRUD; this epic restricts to `mishainfotech.com`.
5. **Blocked / Future Domains** — informational read-only list.
6. **Volume Protection** — max recipients, bulk off, cron off (read-only if fields absent).
7. **Audit History** — recent `communication_hub_control_audit` rows.

Change-mode UX: reason required; typed confirmation strings exactly as spec:
`SET RECIPIENT MODE SINGLE RECIPIENT PILOT`, `... INTERNAL NAMED USERS`, `... INTERNAL DOMAIN PILOT`, `... INTERNAL PRODUCTION`. Future modes not selectable.

## 5. Component — `EventRecipientScopeCard`

Reusable card in `src/components/communication-hub/`. Preconfigured display for `LEGAL / INTERNAL_CASE_ASSIGNMENT_NOTICE`:
- Recipient = Assigned Legal Officer
- Scope = Internal only
- Fallback = rohit@mishainfotech.com
- Max recipients = 1; External/Bulk/Cron = OFF

## 6. Safety Switchboard integration

- Add "Open Recipient Control Center" link.
- Add summary block: current mode, allowed emails, allowed domains, external blocked, bulk off, cron off.

## 7. Live Window Wizard integration

- Display current `recipient_release_mode`, allowed recipient summary, validator result, and human-readable reason why the window can/cannot open.
- Ensure `LEGAL / INTERNAL_CASE_ASSIGNMENT_NOTICE` is a selectable event (max 5 min, `event_pilot_live` preflight, template `LEGAL_INTERNAL_CASE_ASSIGNMENT_EMAIL`) — seed via data insert if missing.

## 8. Safety — explicitly NOT changed

No email send. No `communication_request` / `communication_message` writes. No cron. No bulk. No external recipients. No `notification_queue`/`notification_logs` writes. Emergency stop untouched. Send/review policies untouched. No secrets exposed.

## 9. Validation checklist (manual, non-sending)

Run the 10 scenarios in Part J via the validator RPC and UI (Rohit-only valid; domain in single_pilot blocked; internal_named_users valid/blocked; domain pilot valid/blocked; future modes locked; legal event visible; switchboard shows mode; route works).

## 10. Typecheck & report

- `bunx tsgo --noEmit -p tsconfig.app.json`
- Deliver report items 1–17 per Part M, including `NEEDS_REVIEW` (items I could not verify without sending) and recommended next epic (event-level scope persistence + operator rehearsal for internal_domain_pilot).

## Technical notes

- Files to touch/create:
  - Migration: schema + validator RPC + patched `open_comm_hub_live_window`.
  - `src/pages/admin/communication-hub/RecipientControlCenterPage.tsx` (+ route registration).
  - `src/components/communication-hub/EventRecipientScopeCard.tsx`.
  - Safety Switchboard page — add link + summary.
  - Live Window Wizard — add mode/validator panel; ensure legal event seeded.
  - Hooks: `useRecipientReleaseMode`, `useValidateRecipientReleaseMode`.
- No changes to sending spine, resolvers, or provider settings.
