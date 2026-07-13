# Communication Hub — Production Runbook

Version: 1.0 (PROD-ENV-1)
Owner: Platform Admin + Communication Hub Steward
Status: Governance document for the controlled first internal live send and
subsequent production operation. Read-only visibility helpers live in the
Environment Readiness card on the Live Readiness Governance panel.

> **Non-negotiable safety rule.** Every step below is executed via the
> Communication Hub Control Center UI, the governed pilot flow, or the
> documented Cloud → Advanced tools. Do NOT bypass server-side gates,
> do NOT edit tables directly, and do NOT send email from any surface
> other than the governed pilot flow.

---

## 1. Production readiness overview

The Hub is production-*capable* when ALL of the following are true:

- Environment secrets provisioned (Section 7).
- Sender profile verified in Sender Verification (identity + domain).
- Event → Template mapping asserted clean (Section 4 + assertion SQL).
- Recipient allowlist configured with only sanctioned internal addresses.
- Control Center gates in the documented safe state (Section 8).
- Runbook owners identified and reachable (Section 2).
- Rollback matrix understood by on-call operator (Section 14).

Until the controlled internal live test (Section 10) has succeeded, the
system remains in dry-run-only mode.

## 2. Roles and sign-off owners

| Role                  | Responsibility                                             |
|-----------------------|------------------------------------------------------------|
| Platform Admin        | Secrets, cron enable/disable, emergency stop.              |
| Comm Hub Steward      | Template/mapping approval, allowlist curation.             |
| Delivery On-Call      | Delivery Monitor, provider webhook triage, DLQ review.     |
| Governance Sign-Off   | Approves live promotion of an event (documented proposal). |
| Business Module Owner | Confirms recipient scope, event payload, business intent.  |

Each live promotion requires: Steward + Governance Sign-Off + Business
Module Owner. Emergency stop can be triggered by Platform Admin alone.

## 3. Pre-checks

1. Open Governance → Live Readiness Governance.
2. Confirm the **Environment Readiness** card shows expected values.
3. Confirm **DB control gates** show: `dispatch_enabled=false`,
   `dry_run_only=true`, `email_live_enabled=false`,
   `cron_desired_enabled=false` — this is the pre-live safe state.
4. Run the mapping assertion script (Section 4).

## 4. Template / version checks

Run `scripts/comm-hub/assert_template_mapping.sql` via Cloud → Run SQL
against the target environment. It is SELECT-only. Expected outcome:
every result set returns zero rows. Any non-empty set = a blocker.

The script verifies:

- Active mappings resolve to a real template.
- Mapped template is `is_active=true`.
- Template has an `active_version_id` pointing to an existing version.
- Referenced version status is publish-ready (`APPROVED`/`PUBLISHED`).
- `sender_profile_id` (when set) resolves to an enabled sender profile.

If any check fails, do NOT proceed. Fix mapping/template state via the
Event Template Mapping panel and Template Designer, then re-run.

## 5. Sender / provider checks

- Sender Verification: identity `verified`, domain `verified`, SPF/DKIM/
  DMARC green, sender profile `is_enabled=true`.
- Provider = Resend. Check Delivery Readiness panel — provider health OK.
- Reply-to address monitored by a real inbox.

## 6. Recipient allowlist checks

Two independent allowlists must both permit the recipient:

- **DB** — `communication_hub_control_settings.allowed_email_addresses`
  and `.allowed_email_domains` (Control Center → Allowlist).
- **Env** — `COMMUNICATION_HUB_EMAIL_LIVE_ALLOWLIST` in edge function
  secrets. Comma-separated; entries starting with `@` are domain rules.

For the first live test, load ONE internal email address in both.

## 7. Environment secret checks

Required (edge function secrets — Cloud → Secrets):

- `RESEND_API_KEY`
- `COMMUNICATION_HUB_DISPATCH_SECRET`
- `COMMUNICATION_HUB_RESEND_WEBHOOK_SECRET`
- `COMMUNICATION_HUB_EMAIL_LIVE` (kept `false` until Section 10)
- `COMMUNICATION_HUB_EMAIL_LIVE_ALLOWLIST`

Presence is inspectable from the Environment Readiness card. Values are
NEVER exposed to the browser.

## 8. DB gate checks

Pre-live safe state (Control Center):

- `dispatch_enabled = false`
- `dry_run_only = true`
- `email_live_enabled = false`
- `cron_desired_enabled = false`
- `live_eligible_after = null` (or in the past by less than
  `live_eligible_max_age_minutes`)
- `allowed_email_addresses` / `allowed_email_domains` configured.

## 9. Dry-run validation steps

1. Open the target event in Event Template Mapping — confirm `active`.
2. Run a dry-run from the module's pilot panel or Manual Dispatch Test
   with `testMode=true`. Typed confirmation:
   `DISPATCH ONE TEST MESSAGE`.
3. Verify in Trace Center: request created, message rendered, no
   unrendered `{{tokens}}` remain in `rendered_body`.
4. Verify in Operational Panels → Recent Delivery Attempts that the
   test attempt is present and successful.
5. Repeat until three consecutive clean dry-runs are recorded.

## 10. Controlled single live internal send

Only performed after Sections 3–9 all green and governance sign-off is
recorded.

1. Platform Admin sets `COMMUNICATION_HUB_EMAIL_LIVE=true` in edge
   function secrets (env-layer live gate).
2. In Control Center, with typed confirmation for each change:
   - `dry_run_only = false`
   - `email_live_enabled = true`
   - `dispatch_enabled = true`
   - `live_eligible_after = now()` and `live_eligible_max_age_minutes`
     set to the shortest usable window (e.g. 10).
3. Confirm the target event is promoted to `live_manual_only` in Event
   Live Control for THIS event only.
4. From the Governed Live Pilot panel, submit ONE recipient locked to
   the sanctioned internal address. Typed confirmation:
   `SEND ONE LIVE EMAIL`.
5. Watch preflight — must return `ready=true`. If not, abort and follow
   Section 14 rollback.
6. Confirm dispatch — server enforces every gate independently of UI.

## 11. Post-send verification

- Trace Center → the message shows `status=sent`, `test_mode=false`,
  `provider_message_id` populated.
- Operational Panels → Recent Delivery Attempts records the attempt.
- Resend webhook produces `delivered` within expected latency; the
  Operational Panels webhook summary reflects the event.
- Recipient confirms actual receipt out-of-band.

## 12. Trace Center evidence checklist

- Request row (request_no, module_code, event_code, created_at).
- Message row (channel=email, test_mode=false, status, sent_at).
- Delivery attempt row (status, provider_message_id truncated).
- Communication event log entries (queued, sending, sent, delivered).

## 13. Delivery Monitor evidence checklist

- Provider health OK during send window.
- Webhook `delivered` event captured.
- No `bounced`, `complained`, `failed` events for this message.
- `sent_no_webhook_24h` count did not increase for this send.

## 14. Rollback matrix

Immediate rollback controls, in ascending order of severity:

| Control                                                | Effect                                       |
|--------------------------------------------------------|----------------------------------------------|
| `dispatch_enabled=false`                               | Stops all outbound dispatch.                 |
| `dry_run_only=true`                                    | Forces test_mode on any new work.            |
| `email_live_enabled=false`                             | Blocks live email at DB layer.               |
| Event live-control → `disabled`                        | Blocks THIS event only.                      |
| `cron_desired_enabled=false` + unschedule cron         | Stops autonomous dispatcher.                 |
| Automation mode → `prepare_only`                       | Prepares but never sends.                    |
| Disable sender profile (`is_enabled=false`)            | Blocks all events using that sender.         |
| Empty recipient allowlist (DB + env)                   | Blocks live sends at both allowlists.        |
| Rotate `RESEND_API_KEY`                                | Hard stop at provider layer.                 |

## 15. Emergency stop procedure

1. Control Center: flip `dispatch_enabled=false` and `dry_run_only=true`
   with reason (both are high-risk audited keys).
2. Set `email_live_enabled=false`.
3. Set `cron_desired_enabled=false` and unschedule dispatch cron
   (Section 16).
4. Set target event live-control to `disabled`.
5. Notify Platform Admin and Delivery On-Call.
6. Record incident and open post-mortem entry.

## 16. Cron enable / disable runbook

Cron enable is a Platform Admin action executed only after Section 10
success. Preferred path is Cloud → Run SQL using the project's documented
scheduling helper; do NOT create bespoke cron rows by hand.

- Enable: set `cron_desired_enabled=true` in Control Center, then
  schedule the `comm-hub-dispatch` job via the documented scheduler.
- Disable: unschedule the job, then set `cron_desired_enabled=false`.
- Verify: the Environment Readiness card reflects `Dispatch cron
  scheduled = scheduled / not scheduled`.

## 17. Provider 5xx storm response

1. Observe error rate in Delivery Monitor + Operational Panels.
2. Trigger emergency stop (Section 15) if error rate > 20% for 5 min.
3. Contact provider (Resend) status page and support.
4. Do NOT retry loop manually — the dispatcher's retry/backoff handles
   transient failures within `max_attempts` and `retry_max_seconds`.
5. When provider recovers, re-enable dispatch stepwise (Section 10).

## 18. DLQ / failed queue review

- Operational Panels → Recent Messages filtered by `status=failed`.
- For each failed row: inspect `error_code`, delivery attempt
  `provider_response` (already sanitized in the UI).
- Decide: re-enqueue after fix, or hard-fail with audit note.
- Never bulk-retry without a documented reason and Steward sign-off.

## 19. Evidence screenshots required for sign-off

Attach to the live-promotion proposal document:

1. Environment Readiness card (all rows visible).
2. Control Center gate state before change.
3. Control Center gate state after change (with audit entries).
4. Sender Verification — sender profile green.
5. Trace Center row for the single live message.
6. Operational Panels — Recent Delivery Attempts row for the send.
7. Delivery Monitor — `delivered` webhook event for the send.
8. Recipient acknowledgement (out-of-band screenshot).

---

**Note.** This runbook does not itself enable production. Sending is
governed by server-side gates in the Control Center, the governed pilot
flow, and edge function secrets. Every step above is subject to the
project's audit and permission registries.
