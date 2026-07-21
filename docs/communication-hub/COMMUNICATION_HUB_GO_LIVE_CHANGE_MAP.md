# Communication Hub — Go-Live Change Map (CH-GL-00)

Status: **CH_GL_ARCHITECTURE_BASELINED**

This document freezes the architecture for the remaining Go-Live epics.
No functional code is changed in CH-GL-00. Later epics MUST conform to
the reuse decisions and minimal-change map below.

---

## 1. Mandatory reuse decisions

The following surfaces are authoritative. Do not create parallels.

| Surface | Path | Role |
| --- | --- | --- |
| Hub Overview | `src/pages/admin/communicationHub/CommunicationHubShell.tsx` | Entry point |
| Go-Live journey | `src/pages/admin/communicationHub/goLive/GoLivePage.tsx` | Single guided journey |
| Safety Switchboard | `src/pages/admin/communicationHub/safety/SafetySwitchboardPage.tsx` | Global + event gate control |
| Event Setup Wizard | `src/pages/admin/communicationHub/onboarding/EventTemplateWizardPage.tsx` | Event onboarding / correction |
| Readiness surface | `src/pages/admin/communicationHub/goLive/ReadinessSummary.tsx` | Operator blocker view |
| Preview / Approval | `src/pages/admin/communicationHub/controlCenter/PreviewApprovalPanel.tsx` | Snapshot approval |
| Dry Run | `src/pages/admin/communicationHub/controlCenter/DryRunPanel.tsx` | Simulation harness |
| Controlled Live | `src/pages/admin/communicationHub/controlCenter/ControlledLivePanel.tsx` | One-shot live |
| Delivery Monitor / Requests / Trace Center / Retry Queue | existing pages under `controlCenter`, `traces`, request pages | Existing ops surfaces |

Prohibited:

- new Go-Live route,
- new Gate Control route,
- new event onboarding wizard,
- new control-audit table,
- new recipient-policy store,
- any parallel send-decision logic on the frontend.

---

## 2. Global-control conflict — legacy vs canonical

### Legacy direct writers (to be demoted to read-only over time)

- `src/pages/admin/communicationHub/safety/safetyService.ts`
  Directly PATCHes `communication_hub_control_settings` with combinations of
  `dry_run_only`, `email_live_enabled`, `cron_desired_enabled`,
  `dispatch_enabled`. It also constructs "mode patches" (dry-run,
  internal-pilot, restricted-production, full-production, emergency-stop)
  outside the canonical RPC.
- `src/pages/admin/communicationHub/controlCenter/controlCenterService.ts`
  Reads and writes the same singleton row and defines client-side
  transition tables for `dispatch_enabled` and `dry_run_only`.

### Canonical writer (authoritative)

- `src/platform/communication-hub/globalSettingsService.ts`
  → RPC `public.set_communication_operating_mode(p_new_mode, p_reason)`.
  Reads singleton by `singleton_guard = 'primary'`, never uses `.order()`,
  never mutates recipient-approval fields, derives `dispatch_enabled` and
  `dry_run_only` transactionally, writes
  `communication_hub_operating_mode_audit`.

### Decision

- **All future global mode changes MUST go through
  `setOperatingMode(...)` / `set_communication_operating_mode`.**
- `dispatch_enabled` and `dry_run_only` become **read-only** compat
  booleans in every operator screen (Safety Switchboard, Control Center,
  Go Live). They are derived, never authored.
- Legacy code paths in `safetyService.ts` / `controlCenterService.ts`
  that mutate the singleton directly are retired to read-only helpers in
  epic CH-GL-02 (see §5).

---

## 3. Event-level controls — readers and writers

| Concern | Reader | Writer / RPC | Table |
| --- | --- | --- | --- |
| Event live control | `safetyService.ts::loadEventGate`, `evaluate_comm_hub_send_decision` | `safetyService.ts::setEventGate` → RPC-guarded upsert | `communication_hub_event_live_control` |
| Event send policy | `sendPolicy/*` reader, `evaluate_comm_hub_send_decision` | `sendPolicy` service upsert | `communication_hub_event_send_policy` |
| Event review policy | `reviewPolicy/*` reader | `reviewPolicy` service upsert | `communication_hub_event_review_policy` |
| Template mapping | `EventTemplateMappingPanel`, `eventTemplateOnboardingService.ts`, `eventTestContextService.ts` | Same service | `communication_hub_event_template_map` |
| Sender readiness | `SenderProfilesPage`, `senderProfileService.ts` | Same service | `communication_hub_sender_profile` |
| Provider readiness | `DeliveryReadinessPanel`, provider connectors | notification_providers layer | `notification_providers` (legacy) |
| Recipient policy | `recipientPolicyService.ts` | Same service | `communication_hub_recipient_policy` (+ audit) |
| Duplicate prevention | `sendPolicy` duplicate scope fields | send policy service | `communication_hub_event_send_policy` |
| Automation | `moduleAutomationSettingsService.ts` | Same service | `communication_hub_module_automation_setting` |
| Trigger wiring | `moduleAdapters` + `sendCommunication.ts` | Business modules call `sendCommunication` | n/a (code contract) |
| Volume limits | `safetyService.ts` (`bulk_sending`, `max_recipients_per_send`) | Same service — target for demotion in CH-GL-02 | `communication_hub_control_settings` |

All authoritative decisions run through
`evaluate_comm_hub_send_decision` and are surfaced by
`ReadinessSummary.tsx` via `canonicalBlockerCatalog.ts`. Frontend must
not re-implement send-decision logic.

---

## 4. Gate catalogue assessment

Source: `communication_hub_gate_catalog` (seeded in
`supabase/migrations/20260711100226_...sql`). For every active gate:

| gate_code | State source | Actionable? | Safe mutation | Prereqs | Closing always allowed? | Stages | Fix route |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `dispatch_enabled` | derived from `operating_mode` | No (read-only compat) | `set_communication_operating_mode` (EMERGENCY_STOP toggles it) | none | yes via EMERGENCY_STOP | all | `/admin/communication-hub/control-center` |
| `dry_run_only` | derived from `operating_mode` | No (read-only compat) | `set_communication_operating_mode` | none | yes | all | `/admin/communication-hub/safety` |
| `email_live_enabled` | singleton column | Yes (safety-critical) | canonical RPC (mode transition); legacy patch to be demoted | dispatch + provider ready | never as a lone toggle | CONTROLLED_LIVE, MANUAL_PRODUCTION | `/admin/communication-hub/safety` |
| `cron_desired_enabled` | singleton column | Yes | to be moved behind an RPC in CH-GL-02 | dispatch enabled | yes | MANUAL_PRODUCTION only | `/admin/communication-hub/safety` |
| `allowed_email_domains` | `communication_hub_recipient_policy` | Yes | `recipientPolicyService.updateRecipientPolicy` (RPC-audited) | none | yes | all | `/admin/communication-hub/control-center` |
| `allowed_email_addresses` | recipient policy | Yes | same | none | yes | all | same |
| `send_policy` | event send policy row | Yes | `sendPolicy` service | template approved | yes | per-event | governance/send-policies |
| `review_policy` | event review policy row | Yes | `reviewPolicy` service | none | yes | per-event | governance/send-policies |
| `template_approved` | `core_template_version.status` | Yes | template versioning workflow | template exists | yes | per-event | `/admin/communication-hub/design` |
| `sender_verified` | `communication_hub_sender_profile.verification_status` | Yes | sender verification flow | provider configured | yes | per-event | design/sender-verification |
| `duplicate_prevention` | send policy fields | Yes | send policy service | none | requires typed confirm to disable | per-event | governance/send-policies |
| `module_automation` | `communication_hub_module_automation_setting` | Yes | automation service | template + sender ready | yes | per-module | governance/automation-settings |
| `trigger_wired` | code contract (probe via `module-adapter-tests`) | No via UI | code change | none | n/a | per-module | onboarding/module-adapter-tests |
| `bulk_sending` | singleton column | Yes | to be demoted behind RPC | approvals | requires typed confirm | MANUAL_PRODUCTION | `/admin/communication-hub/safety` |
| `max_recipients_per_send` | singleton column | Yes | same | approvals | requires typed confirm | MANUAL_PRODUCTION | `/admin/communication-hub/safety` |
| `emergency_stop` | derived from `operating_mode == EMERGENCY_STOP` | Yes | `set_communication_operating_mode('EMERGENCY_STOP')` | none | closing = resume via mode transition | all | `/admin/communication-hub/safety` |

Rule: **a `gate_code` alone does not imply a mutation.** Any Go-Live UI
that "closes" a gate must call the mutation column above; if none
exists, the UI must deep-link to `fixing_screen_url` and let the owning
screen mutate.

---

## 5. Epic-by-epic minimal change map

### CH-GL-01 — Read-only compat booleans and canonical mode UI

- Reused: `GoLivePage.tsx`, `SafetySwitchboardPage.tsx`,
  `ControlCenterPage.tsx`, `globalSettingsService.ts`.
- Modified: `safety/safetyService.ts`, `controlCenter/controlCenterService.ts`
  (mark `dispatch_enabled` / `dry_run_only` as read-only, remove
  direct-mutation call sites, route mode changes through
  `setOperatingMode`).
- New files: none.
- Migrations: none.
- RPC changes: none (uses existing `set_communication_operating_mode`).
- UI: disable toggles for the two compat booleans; show derived value
  and a "Change operating mode" CTA.
- Risks: existing tests asserting direct PATCH; update, do not delete.
- Tests: extend `CommHubP1GlobalSettings.test.ts`; add UI test that the
  compat toggles are read-only.

### CH-GL-02 — Volume + cron mutations behind an RPC

- Reused: `SafetySwitchboardPage.tsx`, `safetyService.ts`.
- Modified: `safetyService.ts` (call new RPC instead of PATCH for
  `cron_desired_enabled`, `bulk_sending`, `max_recipients_per_send`).
- New: none in UI.
- Migrations: `set_communication_hub_volume_controls` RPC + audit insert.
- RPC changes: new RPC only; no changes to send-decision RPCs.
- UI: unchanged surface, added typed-confirm dialogs already present.
- Risks: hidden callers of the PATCH; grep and migrate all.
- Tests: RPC unit test; safety switchboard integration test.

### CH-GL-03 — Event Gate Control convergence

- Reused: `SafetySwitchboardPage.tsx` (event tab),
  `EventTemplateWizardPage.tsx`, `evaluate_comm_hub_send_decision`.
- Modified: `EventGateSummary.tsx` to consume the canonical blocker
  catalogue (`canonicalBlockerCatalog.ts`); remove any locally-defined
  gate labels.
- New: none.
- Migrations: seed refresh for `communication_hub_gate_catalog` if a
  wording gap exists (data-only).
- RPC: none.
- UI: gate rows link to `fixing_screen_url`; no inline mutations for
  gates without a documented safe mutation.
- Risks: link drift; add a source-static test.
- Tests: extend `plainLanguageBlockers` tests; add link-integrity test.

### CH-GL-04 — Go-Live readiness reuses canonical evaluator

- Reused: `GoLivePage.tsx`, `ReadinessSummary.tsx`,
  `canonicalBlockerCatalog.ts`.
- Modified: remove any front-end shortcuts that compute readiness from
  singleton columns; always call `evaluate_comm_hub_send_decision`.
- New: none.
- Migrations: none.
- RPC: none.
- UI: unchanged surface.
- Risks: perf — cache with tanstack query, 15s stale.
- Tests: `goLiveBlockerCatalog.test.ts` extended for every catalogue row.

### CH-GL-05 — Preview / Dry Run / Controlled Live hardening

- Reused: `PreviewApprovalPanel.tsx`, `DryRunPanel.tsx`,
  `ControlledLivePanel.tsx`, existing edge functions.
- Modified: none functionally in this epic; documentation-only sweep
  confirming envelope contracts (`retry_safe`, `dispatch_secret_source`,
  `snapshot_id` normalization) are the only accepted responses.
- New: none.
- Migrations: none.
- RPC: none.
- UI: none.
- Risks: none.
- Tests: contract snapshot tests for the three edge functions.

### CH-GL-06 — Operator navigation freeze

- Reused: `CommunicationHubShell.tsx` overview cards.
- Modified: cross-link audit — ensure every gate `fixing_screen_url`
  resolves to a mounted route.
- New: none.
- Migrations: none.
- RPC: none.
- UI: none beyond link fixes.
- Risks: dead links.
- Tests: static route-existence test that walks every
  `fixing_screen_url` value.

---

## 6. Non-goals for the Go-Live track

- No new UI routes for Go-Live, Gate Control, or event onboarding.
- No parallel recipient-policy or send-decision code paths.
- No client-side authoritative logic — every "can send?" decision
  comes from `evaluate_comm_hub_send_decision`.
- No direct writes to `communication_hub_control_settings` outside the
  canonical RPC after CH-GL-02 lands.

---

## 7. Result

`CH_GL_ARCHITECTURE_BASELINED`

Later epics (CH-GL-01 … CH-GL-06) MUST reference this document and stay
within the minimal-change scope above.
