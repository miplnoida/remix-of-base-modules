# Communication Hub — Production Rollout Runbook

**Epic:** PROD-4 — Production Rollout Plan and Runbook
**Mode:** Documentation only. No code, no config, no live enable, no cron, no email.
**Audience:** Approver, Operator, Technical Observer, Business Owner, Post-Test Reviewer.

This runbook is the single operational document for taking Communication Hub
from dry-run into a controlled first internal live test and, only after
success, into progressive phased rollout. Read it end-to-end before any
live action. Nothing in this runbook enables live sending on its own.

---

## 1. Current System Status

The following capabilities are considered complete and in scope for rollout:

| Area | Status | Notes |
|---|---|---|
| UI listing standard | Ready | Standard list/table conventions applied across Hub screens. |
| Breadcrumb / navigation closeout | Ready | Hub nav consistent; entries reachable from Admin. |
| Production Readiness Command Center | Ready | `/admin/communication-hub/production-readiness` |
| Runtime Gate Parity readout | Ready | Backed by `evaluate_comm_hub_runtime_gate_status(jsonb)` (PROD-2A). |
| enqueue runtime gate enforcement | Ready | `comm-hub-enqueue` blocks on runtime gate (PROD-2B). |
| `send_communication_v1` DB backstop | Ready | Live-mode calls gated in DB (PROD-2C). |
| DB fail-closed evaluator hardening | Ready | Evaluator errors on live now block, audit, and raise (PROD-2D). |
| Controlled Internal Live Test page | Ready | `/admin/communication-hub/testing/controlled-live-test` (PROD-3). |
| Dry-run / prepare flow | Preserved | Unchanged by PROD-2 series. |
| Duplicate / dedupe behavior | Preserved | Unchanged. |
| Dispatcher gates (env / allowlist / provider / live window) | Preserved | Existing `comm-hub-dispatch` gates unchanged. |

Not yet in scope (see §9 Open Risks): dispatcher-side runtime gate re-check,
persisted `gate_verdict` on message, direct-caller rerouting through enqueue,
blocker-code severity polish.

---

## 2. Production Readiness Gates (must all pass before first live test)

All of the following must be **Yes / Green** on the Production Readiness
Command Center and Runtime Gate Parity readout, evaluated against the exact
event + recipient chosen for the test.

Control Center / environment:
- [ ] `dispatch_enabled = true`
- [ ] `email_live_enabled = true` (only for the live window)
- [ ] `dry_run_only = false` (only for the live window)
- [ ] `cron_desired_enabled = false`
- [ ] `bulk_enabled = false`
- [ ] Provider API key present and health-checked
- [ ] Dispatcher secret + Resend webhook secret present
- [ ] `COMMUNICATION_HUB_EMAIL_LIVE_ALLOWLIST` contains the test recipient
- [ ] Runtime env verified by live path (not `runtime_env_unknown` for the live send)

Recipient / release:
- [ ] Recipient allowlist configured
- [ ] Release mode: internal / allowlist safe
- [ ] `recipient_count = 1`
- [ ] No external / customer / legal / bulk recipients

Event / policy:
- [ ] Event `live_control = live_manual_only`
- [ ] Event is **not** high-risk
- [ ] Send policy present and approved
- [ ] Review policy present and preview confirmation required
- [ ] Preview confirmed on the operator's screen

Sender / template:
- [ ] Mapped sender enabled
- [ ] Mapped sender `domain_verified = true`
- [ ] Mapped sender `provider_identity_status = verified`
- [ ] Template version approved / published / active

Observability:
- [ ] No stale locks in retry / queue
- [ ] Zero accidental live sends counter
- [ ] Delivery Monitor + Trace Center + Audit reachable
- [ ] Webhook endpoint observed responding OK in staging within the last
      test window

If **any** row above is red or unknown, **do not proceed**.

---

## 3. First Controlled Internal Live Test Plan

Execute in this exact order. Do not skip steps. Do not batch. One recipient,
one event, one send.

1. Choose **one low-risk event** (module + event code). Confirm with Approver.
2. Choose **one internal recipient only**. Confirm against allowlist.
3. Open **Production Readiness Command Center**. Confirm every gate in §2 is
   green for that event + recipient. Screenshot.
4. Open **Controlled Internal Live Test** page
   (`/admin/communication-hub/testing/controlled-live-test`).
5. Select the approved event from the ready list.
6. Enter the approved internal recipient email.
7. Run **Runtime Gate Check** in the panel. Confirm `allowed = true`,
   zero blockers, expected `gate_results`. Screenshot.
8. Render the **template preview**. Have the Business Owner review copy.
9. Type the exact phrase (case-sensitive):
   ```
   SEND ONE INTERNAL LIVE TEST
   ```
10. Tick every confirmation checkbox (internal recipient, one send only,
    rollback owner assigned, evidence owner assigned).
11. Click **Send one live test**. The workflow uses the canonical
    `sendCommunication` façade → `comm-hub-enqueue` → `send_communication_v1`
    → `comm-hub-dispatch`. No direct RPC.
12. Capture from the response panel:
    - request_id / request_no
    - message_id
    - trace_id / trace_no
    - enqueue response JSON
13. Open **Delivery Monitor**. Confirm the attempt row appears, status
    progresses (queued → dispatched → delivered).
14. Open **Trace Center**. Confirm full trace: enqueue gate, DB backstop,
    template resolve, dispatcher gates, provider call, provider response.
15. Confirm the **Resend webhook event** was received and recorded on the
    attempt.
16. Copy the **post-test summary markdown** from the evidence panel and
    file it with the Post-Test Reviewer.

---

## 4. Rollback / Stop Plan

### Stop immediately if any of these occur

- Any recipient other than the approved internal recipient appears anywhere
  in the trace / message / attempt.
- Recipient count > 1 at any layer.
- Missing trace or trace not linked to request/message.
- Provider returns an error.
- Webhook event not observed within the expected window.
- Runtime gate result on the page differs from the DB backstop verdict for
  the same payload.
- Stale lock, orphaned queue row, or duplicate request.
- Accidental live send counter > 0 (any unintended live attempt).
- Unexpected retry or dispatch loop.
- Delivery failure without a clear provider reason.

### Rollback actions (in order)

1. In Control Center, set:
   - `dry_run_only = true`
   - `email_live_enabled = false`
   - Leave `dispatch_enabled = true` unless the incident requires halting the
     queue; only then set `dispatch_enabled = false`.
2. Confirm `cron_desired_enabled = false` (must have been false already).
3. Do **not** retry the failed send blindly. Investigate first.
4. Preserve **all** evidence: request, message, attempt, trace, audit,
   provider response, webhook payload. Never delete audit or trace rows.
5. Export the post-test summary + screenshots to the incident record.
6. If severity warrants, follow
   `docs/communication-hub/COMMUNICATION_HUB_INCIDENT_AND_ROLLBACK_RUNBOOK.md`
   Emergency Stop preset (`ENGAGE EMERGENCY STOP`).

---

## 5. What Must Remain Disabled for the First Test

Explicit disallow list for Phase 1:

- No external recipients.
- No bulk sends. `bulk_enabled` stays `false`.
- No cron-driven dispatch. `cron_desired_enabled` stays `false`.
- No auto-live module rollout. No module set to auto-live.
- No high-risk events.
- No customer / legal / external notices.
- No production-wide automation toggles.
- No dispatcher cron scheduling unless separately approved after Phase 6.
- No event-scoped automation schema redesign during the test.
- No changes to policies, senders, recipients, or event mappings during
  the live window.

---

## 6. Roles and Approvals

### Roles

| Role | Responsibility |
|---|---|
| **Approver** | Authorises the specific event + recipient + window. Sole owner of go/no-go. |
| **Operator** | Executes the Controlled Internal Live Test workflow. No config edits during window. |
| **Technical Observer** | Watches Trace Center, Delivery Monitor, provider dashboard. Calls stop. |
| **Business Owner** | Reviews preview copy and business intent. |
| **Post-Test Reviewer** | Owns the evidence bundle and post-test summary. |

### Approval checklist (all must be signed before Phase 1)

- [ ] Event approved (module, event code, live_manual_only)
- [ ] Recipient approved (internal only, on allowlist)
- [ ] Sender verified (domain + provider identity)
- [ ] Template reviewed (active version, preview approved)
- [ ] Send + review policy reviewed
- [ ] Rollback owner assigned (named person)
- [ ] Evidence owner assigned (named person)

---

## 7. Evidence Checklist

Capture and file all of the following in the test record:

- [ ] Screenshot / export of Production Readiness Command Center (all green)
- [ ] Screenshot of Runtime Gate Parity readout for the exact payload
- [ ] Template preview screenshot
- [ ] Typed confirmation screen screenshot (phrase visible, checkboxes ticked)
- [ ] Enqueue response JSON
- [ ] `request_id` and `request_no`
- [ ] `message_id`
- [ ] `trace_id` and `trace_no`
- [ ] Delivery Monitor row screenshot (final status)
- [ ] Provider response payload
- [ ] Webhook event payload
- [ ] Post-test summary markdown (from evidence panel)

Retention: never delete audit, request, message, delivery attempt, or trace
rows. Archive screenshots and JSON with the incident/test record.

---

## 8. Phased Rollout After First Internal Test

Each phase requires explicit Approver sign-off. No phase auto-progresses.

| Phase | Scope | Gate to enter |
|---|---|---|
| **0** | Dry-run only. No live. | Current baseline. |
| **1** | One controlled internal live test (this runbook §3). | §2 all green + §6 approvals signed. |
| **2** | Repeat internal live tests for 2–3 low-risk events. | Phase 1 clean + no open incidents. |
| **3** | Limited internal module automation, `prepare_only` or manual live only. | Phase 2 stable + module owner sign-off. |
| **4** | One approved external test recipient (if policy allows). | Legal / compliance approval + allowlist update audited. |
| **5** | Pilot with one selected business module. | Phase 4 clean + module runbook. |
| **6** | Cron / dispatcher automation. | Stable delivery record + rollback drill passed. |
| **7** | Bulk sends. | Explicit bulk approval model + bulk gate policy exists. |

Between phases: run the Go/No-Go checklist (§10) again. Any No blocks
progression regardless of phase.

---

## 9. Open Risks / Deferred Items

- **Dispatcher not re-checking runtime gate.** `comm-hub-dispatch` still
  relies on its existing env / allowlist / provider / live-window gates.
  It does not re-run `evaluate_comm_hub_runtime_gate_status` because the
  enqueue-time verdict is not persisted on the message. Enqueue and DB
  backstop cover the current risk surface for Phase 1.
- **Recommended future schema addition:**
  ```
  communication_message.gate_verdict         jsonb
  communication_message.runtime_gate_passed_at timestamptz
  ```
  Would let the dispatcher confirm the enqueue-time verdict without
  re-evaluation and without false positives.
- **Direct live callers bypass enqueue but are DB-backstopped:**
  - `comm-hub-event-pilot`
  - `comm-hub-admin-test-notice`
  Both are protected by the `send_communication_v1` fail-closed backstop,
  but they should be refactored to route through `comm-hub-enqueue` in a
  later epic.
- **Blocker-code → severity mapping polish** is pending; the UI shows raw
  codes for some paths. Functional, not blocking.
- **High-risk events** must require a secondary approval gate before they
  are ever included in a live test. Not built yet.
- **Entity / business-context events** need real test data or safe
  fixtures before they can be exercised end-to-end.

---

## 10. Go / No-Go Checklist (final one-page gate)

**All rows must be Yes. Any No means stop.**

| # | Check | Y/N |
|---|---|---|
| 1 | Production Readiness Command Center all green for target event + recipient | |
| 2 | Runtime Gate Parity `allowed = true`, zero blockers, no unknowns | |
| 3 | `dispatch_enabled = true`, `email_live_enabled = true` for the window | |
| 4 | `dry_run_only = false` for the window; will revert immediately after | |
| 5 | `cron_desired_enabled = false` | |
| 6 | `bulk_enabled = false` | |
| 7 | Recipient allowlist contains only the approved internal recipient | |
| 8 | Event `live_control = live_manual_only`, not high-risk | |
| 9 | Send policy approved, review policy present, preview confirmed | |
| 10 | Mapped sender enabled, domain verified, provider identity verified | |
| 11 | Template version approved / published / active | |
| 12 | `recipient_count = 1` | |
| 13 | No stale locks, no accidental live sends counter | |
| 14 | Provider key present, dispatcher env gates configured | |
| 15 | Delivery Monitor + Trace Center + Audit reachable | |
| 16 | Webhook observed responding in the last test window | |
| 17 | Approver, Operator, Observer, Business Owner, Post-Test Reviewer named | |
| 18 | Rollback owner assigned; rollback steps rehearsed | |
| 19 | Evidence owner assigned; evidence checklist ready | |
| 20 | Post-test summary + revert-to-dry-run plan agreed | |

---

## Related Documents

- `docs/communication-hub/COMMUNICATION_HUB_ENVIRONMENT_CHECKLIST.md`
- `docs/communication-hub/COMMUNICATION_HUB_PRODUCTION_READINESS_CHECKLIST.md`
- `docs/communication-hub/COMMUNICATION_HUB_INCIDENT_AND_ROLLBACK_RUNBOOK.md`
- `docs/communication-hub/COMMUNICATION_HUB_AUDIT_AND_TRACE_RUNBOOK.md`
- `docs/communication-hub/COMMUNICATION_HUB_CONFIGURATION_CHECKLIST.md`

---

*This runbook is documentation only. It does not enable live sending, does
not schedule cron, does not mutate policies, senders, recipients, or
templates. All live actions require explicit human execution against the
checklists above.*
