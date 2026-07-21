# Communication Hub — Go Live Operator Guide (CH-SIMPLE-P3F)

Route: `/admin/communication-hub/go-live`

The Go Live page is the single guided journey to bring one event through
every safety gate before any real email is sent. It reuses the same
authoritative server-side checks the platform enforces everywhere — the
browser is never authoritative.

## Six steps

1. **Select Event.** Enter the module code (e.g. `BENEFITS`) and event
   code (e.g. `AWARD_ISSUED`). Selecting a new event clears every
   downstream approval — this is intentional.
2. **Check Readiness.** The server checks every gate: template mapping,
   sender profile, provider, recipient policy, review/send policies,
   operating mode, and emergency stop. Any blocker shows a plain-language
   explanation and a "Fix in" link that takes you straight to the
   configuration screen. When you return, click **Re-check readiness**.
3. **Preview & Approve.** The server renders a locked preview snapshot
   and issues an approval record. Approval is only valid until it
   expires or is revoked.
4. **Run Dry Test.** One end-to-end simulation through the dispatcher.
   No provider call is made. A `DRY_RUN_PASSED` certification is
   required to enable the controlled-live test.
5. **Controlled Live Test.** Runs exactly one send against the provider.
   By default this is the provider stub. Real-email delivery is only
   possible when platform administrators have enabled the server-side
   real-email gate — no toggle on this page can bypass it.
6. **Review & Complete.** Read-only evidence: every server-issued id,
   the operating mode before and after, cleanup status, and the current
   certification recommendation.

## What Go Live never does

- Send Manual Production or Automated Production email.
- Run cron, batch, or bulk sends.
- Use uncontrolled external recipients.
- Store any authorisation flag in `localStorage`. Only ids are cached in
  `sessionStorage` under `commHub.goLive.v1`, and every downstream step
  re-verifies server state on load.
- Reproduce readiness rules in the browser.

## Certification statuses you will see

| Status | Meaning |
| --- | --- |
| `P3E_STUB_CERTIFIED` | Controlled-live test passed against the provider stub. No real email has been sent. |
| `P3E_PROVIDER_ACCEPTED` | One approved real email was handed to the provider. Delivery not yet confirmed. |
| `P3E_CONTROLLED_LIVE_CERTIFIED_WITH_MANUAL_DELIVERY_CONFIRMATION` | An administrator has manually confirmed the real email was received. |
| `P3E_CONTROLLED_LIVE_CERTIFIED` | The full controlled-live path is trusted end-to-end. |

## Advanced diagnostics

The legacy Testing & Pilots workspace remains available at
`/admin/communication-hub/pilots` for engineers who need to exercise
individual panels in isolation. Operators do not need it.
