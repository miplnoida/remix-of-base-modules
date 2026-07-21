
# CH-SIMPLE-P3F — Unified Go Live Journey + P3E Status Correction

## Part A — P3E status correction (small, mechanical)

Reason: no real provider call ever occurred, so any label implying manual delivery confirmation is invalid. New authoritative status is **P3E_STUB_CERTIFIED**.

Files to update:
- `docs/communication-hub/CH-SIMPLE-P3E-C.md` — replace the top-of-file status and progression note. Add the valid progression list:
  `P3E_NOT_CERTIFIED → P3E_STUB_CERTIFIED → P3E_PROVIDER_ACCEPTED → …_WITH_MANUAL_DELIVERY_CONFIRMATION → P3E_CONTROLLED_LIVE_CERTIFIED`.
- `docs/communication-hub/COMMUNICATION_HUB_MASTER_IMPLEMENTATION_REPORT.md` — same correction where P3E is reported.
- Any status text rendered in `ControlledLivePanel.tsx` that reads "manual delivery confirmation certified" for stub runs — change to "Provider stub certified. Real provider delivery not yet certified." No behavioural change; the certification RPC already only issues records when a real provider run happened.
- Do NOT delete existing stub-produced rows in `communication_controlled_live_certification`; they were issued only for provider-accepted paths, which is correct. Just make sure no UI/doc labels a stub run as "manual-delivery-confirmed".

## Part B — Unified Go Live journey

### Route

- Add route `/admin/communication-hub/go-live` in `src/App.tsx` (or the admin router where Comm Hub routes live), lazy-loaded.
- Component: `src/pages/admin/communicationHub/goLive/GoLivePage.tsx`.

### Page shape

Single page with a vertical stepper. Steps:

1. **Select Event** — module + event pickers. Auto-resolves channel, template + active version, sender, provider, recipient/send/review policies, operating mode, event live status via `resolveBusinessModuleCommunicationContext` and existing config resolvers. Read-only summary card once selected.
2. **Check Readiness** — calls `evaluateCanonicalSendDecision({ sendContext: 'preview' })` and re-uses `BlockersList` + `plainLanguageBlockers` for plain-language blockers and Fix-now links. Verdict pill: Ready / Needs Attention / Blocked. Technical codes collapsed behind a `<details>` "Technical details".
3. **Preview & Approve** — embed existing `PreviewApprovalPanel` with the resolved context.
4. **Run Dry Test** — embed existing `DryRunPanel` with `previewApproved` and canonical decision passed in.
5. **Controlled Live Test** — embed existing `ControlledLivePanel`. Default label "Provider Stub Test". Real-email option is shown only when the server-reported gate is on (already handled inside the panel + orchestrator). No local flag can enable it.
6. **Review & Complete** — new sub-component `GoLiveEvidenceSummary` rendering: event, recipient, preview status/approval id, dry-run status/certification id, controlled-live execution + certification, provider outcome, request/message/attempt/trace ids, operating mode prior/final, cleanup result. Final recommendation label chosen from the fixed set in the brief.

### Step locking

Local wizard state machine in `useGoLiveJourney.ts`:
- Step N+1 locked until step N's authoritative server evidence is present:
  - readiness step: `decision.allowed === true` for preview context
  - preview step: `previewApprovalId` present and not expired
  - dry-run step: valid `dryRunCertificationId` (server-derived `certified` boolean)
  - controlled-live: enabled only when readiness (controlled_live context) allowed + preview + dry-run valid + emergency stop inactive + exactly one recipient
- Any invalidation event (policy version change, decision refresh, cert invalidated) unlocks/relocks downstream steps by re-reading server state — no cached authorisation in localStorage.

### Session state

`sessionStorage` (not localStorage) key `commHub.goLive.v1` stores only: `{ moduleCode, eventCode, currentStep, previewSnapshotId, previewApprovalId, dryRunExecutionId, controlledLiveExecutionId }`. On mount, re-fetch authoritative status for each id.

### Recipient handling

Recipient displayed comes from `evaluate_comm_hub_recipient_policy` for the selected event only. No hardcoded address or domain. Named-recipient mode presents a single-select of active entries. Controlled Live requires exactly one To, no CC/BCC (already enforced server-side).

### Fix-now routing

Map blocker `fix_route` codes to routes:

```
recipient_policy    → /admin/communication-hub/settings/recipient-policy
template_mapping    → /admin/communication-hub/events/templates
sender_profile      → /admin/communication-hub/settings/senders
email_provider      → /admin/communication-hub/settings/providers
send_policy         → /admin/communication-hub/settings/send-policies
review_policy       → /admin/communication-hub/settings/review-policies
event_configuration → /admin/communication-hub/events
emergency_stop      → /admin/communication-hub/settings/operating-mode
```

Actual route strings taken from existing screens if they differ. On return, readiness auto-refreshes (React Query invalidation on focus).

### Overview dashboard simplification

`CommunicationHubOverviewPage.tsx` (or the current overview file) reworked to show only:
- Operating mode chip + Emergency Stop status.
- Counts: events Ready / Blocked / awaiting Preview / awaiting Dry Run / awaiting Controlled Live (queries against send-decision log + certifications).
- Recent delivery failures (last 10 from `communication_delivery_attempt`).
- Recent certifications (dry-run + controlled-live).
- Big primary CTA button linking to `/admin/communication-hub/go-live`.

Existing technical links move under an "Advanced Diagnostics" collapsible section (not removed).

### Manual Production

Show a disabled Step 7-style card "Manual Production approval — Coming after live certification". No wiring.

## Part C — Tests, docs, verification

- New: `src/pages/admin/communicationHub/goLive/__tests__/GoLiveJourney.test.tsx` covering: step locking, blocker fix-route mapping, session restore, recipient auto-load, stub-vs-real label distinction, no localStorage authorisation writes.
- Extend existing suites where step-lock invariants overlap.
- New doc: `docs/communication-hub/COMMUNICATION_HUB_GO_LIVE_OPERATOR_GUIDE.md` (plain-language 7-step guide; explicit "do not" list).
- Update master report + P3 gap register with:
  - Corrected P3E status `P3E_STUB_CERTIFIED`.
  - CH-SIMPLE-P3F landed status.
  - Remaining navigation-consolidation follow-ups.

## Technical details

- No new tables. No new RPCs. All authoritative state comes from existing services: `sendDecisionService`, `previewApprovalService`, `dryRunService`, `controlledLiveTestService`, `controlledLiveCertificationService`, `recipientPolicyService`, `globalSettingsService`.
- Route added lazily; no breaking route changes.
- No changes to auto-generated Supabase client or migrations.
- No real email is sent during this stage; real-email gate remains server-only.

## Out of scope (explicit)

- Manual Production approval logic.
- Automated Production, cron, bulk, external recipients.
- Removing legacy Pilots page or other technical screens (kept under Advanced Diagnostics).
- New DB migrations.

Shall I proceed to build this?
