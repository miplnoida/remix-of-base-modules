
# Communication Hub — Live Test Investigation (no code changes)

This is analysis + step-by-step guidance only. No files will be edited if you approve this plan; if you want fixes afterwards, ask separately.

---

## Issue 1 — Event Live Control error

**Error you saw:**
`Failed: set_event_live_control: event COMM_HUB/OPERATOR_REHEARSAL_RESULT_NOTICE not permitted for live_manual_only in this phase`

### Root cause
The RPC `public.set_event_live_control` (migration `20260710143442_...sql`) enforces a hard-coded phase allowlist. In the current phase, only three events may be promoted to `live_manual_only`:

- `COMM_HUB / ADMIN_TEST_NOTICE`
- `COMPLIANCE / INTERNAL_CASE_STATUS_NOTICE`
- `LEGAL / INTERNAL_CASE_ASSIGNMENT_NOTICE`

Every other event — including `LIVE_PROPOSAL_CREATED_NOTICE` and `OPERATOR_REHEARSAL_RESULT_NOTICE` — is refused with the exact error you got. `live_cron_allowed` is refused for every event in this phase.

### Why the error names a different event than the one you thought you clicked
The client (`EventLiveControlPanel.tsx`, `save()`) sends `editing.module_code / editing.event_code`, which is set by whichever row's **Change** button was clicked (`openEdit(row)`). The RPC then echoes the exact `module/event` it received in the error text. Because it named `OPERATOR_REHEARSAL_RESULT_NOTICE`, that is the row the dialog was actually bound to — most likely an adjacent-row mis-click (the two COMM_HUB rows sit next to each other in the table). There is no evidence of stale row state or a wrong-key bug; the dialog title/subject reflects whichever row you opened.

Result: **not a bug — expected guardrail**. Even had you truly opened `LIVE_PROPOSAL_CREATED_NOTICE`, the error would have been identical (with that event name), because that event is not on the phase allowlist either.

### What to check next time
Before typing the confirmation phrase, confirm the dialog header shows the intended `MODULE / EVENT`. Only the three events above will succeed.

---

## Issue 2 — Controlled Internal Live Test shows "No candidate events available"

### How the candidate list is built
`ControlledLiveTestPage.tsx` (lines 112–132) filters `loadAllEventsReadiness()` rows and requires **all** of:

```
channel === "email"
eligible === true
live_control_status === "live_manual_only"
template_mapped
template_version_ok
sender_mapped
sender_enabled
sender_domain_verified
send_policy_exists
send_policy_approved
review_policy_exists
```

### Current state of `COMM_HUB / ADMIN_TEST_NOTICE` (verified live in DB)

| Check | Value | Pass? |
|---|---|---|
| live_control_status | `live_manual_only` | ✅ |
| risk_level (event_live_control) | `low` | ✅ |
| Phase allowlist | on it | ✅ |
| Mapping active | yes | ✅ |
| Template mapped | `COMM_HUB_ADMIN_TEST_NOTICE_EMAIL`, is_active=true, status ACTIVE | ✅ |
| Template active_version_id | present | ✅ |
| Active version status in DB | **`PUBLISHED` (uppercase)** | **❌** |
| Sender profile enabled | true | ✅ |
| Sender domain verified | true | ✅ |
| Provider active | 1 row | ✅ |
| **`send_policy` row exists** | **none** | **❌** |
| **`review_policy` row exists** | **none** | **❌** |

### Exact failing conditions
Three blockers on the same event make it invisible to the candidate dropdown:

1. **`template_version_ok = false`** — `allEventsLiveReadinessService.ts` line 140 compares `version.status` against lowercase literals `"approved" | "published" | "active"`, but the row's status is stored uppercase (`PUBLISHED`). Case-sensitive mismatch → readiness marks the version as not approved. (This same rule will silently fail every template whose version status is uppercase.)
2. **`send_policy_exists = false`** — no row in `communication_hub_event_send_policy` for `COMM_HUB / ADMIN_TEST_NOTICE / email`.
3. **`review_policy_exists = false`** — no row in `communication_hub_event_review_policy` for the same key.

Because the filter is a hard AND, any one of these hides the event, and `eligible` is already `false` before the candidate filter runs (blockers include `template_version_not_approved`, `send_policy_missing`, `review_policy_missing`).

Everything else you listed (dispatch_enabled, email_live_enabled, dry_run_only, bulk, cron, recipient allowlist, runtime gates) is checked **later** at send time, not during candidate selection — so those settings are not why the dropdown is empty.

---

## Issue 3 — Safe path to one internal live test **without any code change**

You cannot complete a live send today from admin screens alone, because two required rows are missing and the version-status casing is uppercase. The **only** admin-only remediation is:

1. Author + approve a `send_policy` row for `COMM_HUB/ADMIN_TEST_NOTICE/email` via `/admin/communication-hub/governance` → Send Policies (set `is_enabled=true`, `approved_at` populated by the approve action).
2. Author a `review_policy` row for the same key with `review_mode ∈ {manual_review, auto_send, operator_review}` and, if `require_template_approval=true`, `approval_status ∈ {approved_internal, approved_external}`.
3. Re-approve/republish the `COMM_HUB_ADMIN_TEST_NOTICE_EMAIL` template so the active version's status is written as lowercase `published` / `approved` / `active`. If your Template Management screen only writes uppercase, this cannot be fixed from the UI and needs a one-line code/data fix — flag it back to me.

If (3) cannot be done from an admin screen in your build, the Controlled Live Test page will keep showing "No candidate events available" no matter what else you do.

Assuming the three items above are corrected from admin screens, the safe end-to-end flow is:

### A. Governance — `/admin/communication-hub/governance`
- **Environment Readiness card:** every `*_Present` = true (esp. `RESEND_API_KEY`, `COMM_HUB_DISPATCH_SECRET`, `COMMUNICATION_HUB_EMAIL_LIVE`, `COMMUNICATION_HUB_EMAIL_LIVE_ALLOWLIST`).
- **Event Live Control:** `COMM_HUB / ADMIN_TEST_NOTICE` = `Live — manual only`, risk `low`. Do **not** attempt to promote any other event; the phase allowlist will refuse it.
- **Template mapping assertion** (`scripts/comm-hub/assert_template_mapping.sql` — read-only) returns zero rows.

### B. Control Center
Confirm safe defaults are held: `dry_run_only=true`, `email_live_enabled=false`, `cron_desired_enabled=false`, `bulk_enabled=false`, `external_release=false`, `dispatch_enabled=true`. Do **not** flip these manually — the Controlled Live Test uses `open_comm_hub_live_window` (RPC) which flips `dry_run_only=false` + `email_live_enabled=true` transactionally and expires them automatically.

### C. Recipient Control
Under `/admin/communication-hub/recipient-control`, the exact allowlist required by `open_comm_hub_live_window` is:
- `allowed_email_addresses = ['rohit@mishainfotech.com']` (exactly this one address, lowercased)
- `allowed_email_domains = []` (empty)
- `external_release = false`
Any other configuration will refuse the live window with `allowlist must be exactly [rohit@mishainfotech.com] with zero domains`.

### D. Sender Verification
On `/admin/notifications/providers` and the Sender Profiles screen: profile for `COMM_HUB_ADMIN_TEST_NOTICE_EMAIL` is `is_enabled=true`, `domain_verified=true` (already true per DB).

### E. Send + Review Policies
Governance → Send Policies: row for `COMM_HUB/ADMIN_TEST_NOTICE/email` exists, enabled, approved_at set. Governance → Review Policies: row exists and `review_mode` is one of the three accepted modes; if approval-gated, template shows `approved_internal`.

### F. Templates
Template Management: `COMM_HUB_ADMIN_TEST_NOTICE_EMAIL` v1 published/approved/active (lowercase in DB — see Issue 2 caveat).

### G. Controlled Internal Live Test — `/admin/communication-hub/testing/controlled-live-test`
Once the dropdown lists `COMM_HUB / ADMIN_TEST_NOTICE / email`:
1. Select the event.
2. Recipient email: **`rohit@mishainfotech.com`** (matches the allowlist exactly).
3. Recipient name: any label.
4. Click "Run preview" and read the rendered subject/body.
5. Tick all five checklist items (internal, one recipient, not bulk, preview reviewed, gates checked).
6. Runtime Gate Parity Panel: every gate green.
7. Typed confirmation phrase: **`SEND ONE INTERNAL LIVE TEST`** (exact; declared in `ControlledLiveTestPage.tsx` line 46).
8. Press Send.

### H. After sending — verify, then rollback
- **Trace Center** — `/admin/communication-hub/trace`: follow the correlation ID through the stages `EVENT_INITIATED → … → PROVIDER_ACCEPTED → DELIVERY_ATTEMPT_RECORDED → COMPLETED`. Any `BLOCKED` / `SUPPRESSED` / `FAILED` step names the gate that stopped it.
- **Delivery Monitor** — verify one `communication_message` row (channel `email`, `test_mode=false`, `status=sent` then `delivered` after webhook).
- **Retry Queue** — should stay empty.
- **Audit** — `communication_hub_control_audit` will contain the four rows written by `open_comm_hub_live_window` (dry_run_only, email_live_enabled, live_eligible_after, live_eligible_max_age_minutes) and a matching close.
- **Rollback** is automatic: the live window closes after the duration you chose (1–30 minutes for COMM_HUB events); `dry_run_only` and `email_live_enabled` revert to their prior values. Manually confirm on Control Center that the flags are back to the safe defaults listed in section B.

Do **not** touch cron, bulk, external_release, or any other event's live control during this test.

---

## Summary of root causes

- **Issue 1:** Working as designed. Only `COMM_HUB/ADMIN_TEST_NOTICE`, `COMPLIANCE/INTERNAL_CASE_STATUS_NOTICE`, `LEGAL/INTERNAL_CASE_ASSIGNMENT_NOTICE` are phase-allowed. The error naming `OPERATOR_REHEARSAL_RESULT_NOTICE` means that row's Change button was the one opened (adjacent-row mis-click), not a stale-state bug.
- **Issue 2:** Three data gaps hide `ADMIN_TEST_NOTICE` from the candidate list — missing `send_policy` row, missing `review_policy` row, and uppercase `PUBLISHED` template-version status that the readiness code compares only against lowercase.
- **Issue 3:** A clean live test is only possible after those three data conditions are corrected; the exact operator flow is spelled out above.

If you want, next turn I can either (a) add the two missing policy rows via a data-only migration and normalise the version status to lowercase, or (b) leave it and just log this as a gap in the UAT batch reports.
