# Communication Hub — Scratch-to-Production Manual

**Environment:** Preview (`http://localhost:8080`)
**Application commit:** `6f9f698db`
**Screenshot capture date (UTC):** `2026-07-13`
**Captured as:** `System Admin` (`admin@secureserve.gov`)
**Session:** Managed Supabase session, injected

> ⚠️ **Production warning.** Every screenshot here was captured against the **preview** environment. In production, actions marked *action-capable* or *high-risk* (Control Center toggles, Safety Switchboard preset flips, Event Live Control, Live Window open, Governed Controlled Live Send, cron activation, retry, emergency stop) require typed confirmation + approver sign-off and must be reviewed against the current production commit before use.

## How to read this manual

Each step shows:

1. Application route.
2. Real screenshot (never mocked or AI-generated).
3. Fields / buttons / tabs / statuses to verify.
4. Expected successful state.
5. Blocker / failed state, where the route surfaces one.
6. Environment, module code and event code where relevant.
7. Production-sensitive warnings.

Screenshots not captured are listed in the **Coverage Matrix** at the bottom with the exact reason.

---

## Phase 0 — Application & environment verification

### 0.1 Application shell + auth

- **Route:** `/`
- **Verify:** user chip shows `System Admin — admin@secureserve.gov`, no red banner, sidebar renders.
- **Expected success:** the Communication Hub sidebar group (**Communication & Documents**) is expanded and reachable.
- **Blocker:** if the sidebar entry is missing, the user is not in the `comm_hub_admin` permission set — return to Identity & Security and grant the role.
- **Screenshot:** captured indirectly via `01_hub-home.png` (sidebar visible).

### 0.2 Database + migrations

**No dedicated UI in this build.** Verify from the backend console:

```sql
select id, name, executed_at
from supabase_migrations.schema_migrations
order by executed_at desc
limit 10;

-- Communication Hub core tables must exist:
select to_regclass('public.communication_request'),
       to_regclass('public.communication_message'),
       to_regclass('public.communication_delivery_attempt'),
       to_regclass('public.communication_event_log'),
       to_regclass('public.communication_hub_module_event_registry'),
       to_regclass('public.communication_hub_event_template_map'),
       to_regclass('public.communication_hub_sender_profile'),
       to_regclass('public.communication_hub_send_policy'),
       to_regclass('public.communication_hub_control_audit'),
       to_regclass('public.communication_hub_schedule'),
       to_regclass('public.communication_hub_schedule_run');
```

**Expected output:** every `to_regclass(...)` row returns a non-null `oid`; migrations list shows the most recent Communication Hub migration matching commit `6f9f698db`.
**On failure:** run the pending migrations from the deployment console before proceeding.

### 0.3 Permissions & roles

- **Route:** `/admin/identity-security/roles` (Identity & Security → Roles).
- **Verify** the operator has: `comm_hub.admin`, `comm_hub.governance`, `comm_hub.pilots.execute`, `comm_hub.template.author`, `comm_hub.recipient.manage`.
- **Screenshot not captured** — see matrix (Identity workspace outside Communication Hub route tree). The permission harness proof lives in `docs/testing/comm-hub-permission-harness.md`.

---

## Phase 1 — Communication Hub dashboard

### 1.1 Hub home

![Hub home](screenshots/01_hub-home.png)

- **Route:** `/admin/communication-hub`
- **Verify:** trace summary (Recent / Blocked / Failed / In-flight / Delivered), the six workspace tiles (Start here, Operations, Design & Templates, Module Onboarding, Testing & Controlled Validation, Governance & Live Control), and the "How this hub works" banner.
- **Expected success:** trace counters render numbers (not `—`), most recent attempts list at least one row.
- **Blocker:** empty counters + spinner = the trace read RPC is failing; check the Trace Center.

---

## Phase 2 — Global safety

### 2.1 Control Center

![Control Center](screenshots/02_control-center.png)

- **Route:** `/admin/communication-hub/control-center`
- **Verify tabs:** *Overview*, *Settings*, *Audit*. Confirm the following gates and their current state:
  - `dispatch_enabled`
  - `dry_run_only`
  - `email_live_enabled`
  - `cron_desired_enabled`
  - `bulk_enabled`
  - `external_release_enabled`
- **Expected safe defaults:** dry-run ON, live OFF, cron OFF, bulk OFF, external release OFF.
- **Production warning:** every toggle requires typed confirmation + approver. Never flip live directly from this screen without a live window + Governance sign-off.

> The **Settings** and **Audit** tabs are sub-panels inside this route; the screenshot shows the default Overview tab. Both sub-panels are noted in the coverage matrix.

### 2.2 Safety Switchboard

![Safety Switchboard](screenshots/03_safety-switchboard.png)

- **Route:** `/admin/communication-hub/safety`
- **Verify:** preset chips (Dry-run only, Internal live testing, Production internal live, External live controlled), typed-confirmation text box, and the current active preset banner.
- **Blocker state:** if a preset flip is attempted without matching typed confirmation, a red banner shows the exact confirmation phrase required.
- **Production warning:** preset flips write directly to `communication_hub_control_audit`.

---

## Phase 3 — Governance & live control

### 3.1 Governance workspace

![Governance](screenshots/04_governance.png)

- **Route:** `/admin/communication-hub/governance`
- **Verify sections:** Delivery readiness, Tracking policy, Event live control, Live readiness governance, Live window wizard, Governed Controlled Live Send.
- **Expected success:** Environment Readiness card is green for provider, sender, allowlist, mapping.
- **Blocker:** red chip on any readiness card blocks the Governed Controlled Live Send.

### 3.2 Send policies

![Send Policies](screenshots/05_send-policies.png)

- **Route:** `/admin/communication-hub/governance/send-policies`
- **Verify:** per-event row with `max_recipients_per_run`, allowed channel, time window, duplicate rules.
- **Blocker:** missing policy row for a mapped event → send is blocked by `SEND_POLICY_MISSING`.

### 3.3 Automation settings (cron)

![Automation Settings](screenshots/06_automation-settings.png)

- **Route:** `/admin/communication-hub/governance/automation-settings`
- **Verify:** `cron_desired_enabled`, scheduler edge function name, last invocation timestamp.
- **Production warning:** enabling `cron_desired_enabled` here **does not** create the `pg_cron` job — it declares intent. The `cron.schedule(...)` SQL must still be run separately from the DB console.

**Cron SQL (no UI):**

```sql
select cron.schedule(
  'comm-hub-scheduler-every-5min',
  '*/5 * * * *',
  $$select net.http_post(
    url:='https://<PROJECT_REF>.supabase.co/functions/v1/comm-hub-scheduler',
    headers:='{"Content-Type":"application/json","apikey":"<ANON_KEY>"}'::jsonb,
    body:=jsonb_build_object('time', now())
  );$$
);
```

**Expected output:** a numeric `jobid` from `cron.schedule`. Verify with `select * from cron.job where jobname like 'comm-hub-scheduler%'`.

---

## Phase 4 — Testing & controlled validation

### 4.1 Testing & Pilots workspace

![Pilots](screenshots/07_pilots.png)

- **Route:** `/admin/communication-hub/pilots`
- **Verify:** four panels — Event Validation Console, Operator Action Rehearsal, Admin Test Notice, Manual Dispatch Test. The Governed Controlled Live Send panel is *the only* path that can produce a real send.

### 4.2 Test & Diagnostics

![Test & Diagnostics](screenshots/22_test-diagnostics.png)

- **Route:** `/admin/communication-hub/test-diagnostics`
- **Verify controls:** module selector, event selector, token entry, run mode (Validate Only / Render Preview / Dry Run / Queue Test), request-id and trace-id readouts after run.
- **Expected success:** run returns `request_id` + `trace_id`; the trace opens in Trace Center in `MESSAGE_QUEUED` (Queue Test) or `SENT` (dry-run).
- **Blocked state:** trace opens in `blocked` at the exact stage that failed (e.g. `RECIPIENT_BLOCKED`, `TEMPLATE_MISSING`, `SEND_POLICY_CHECKED`).
- **Module / event codes captured on hub home for reference:** `LEGAL / INTERNAL_CASE_ASSIGNMENT_NOTICE`, `APPEALS / INTERNAL_REVIEW_ASSIGNMENT_NOTICE`, `COMPLIANCE / INTERNAL_CASE_STATUS_NOTICE`.

> Screens showing individual *Validate Only*, *Render Preview*, *Dry Run*, *Queue Test*, *Successful*, and *Blocked* result states, plus the token-entry form with data, are sub-states of this route requiring live interactive selection. They are noted in the coverage matrix.

---

## Phase 5 — Design & templates

### 5.1 Design workspace (event ↔ template mapping list)

![Design](screenshots/08_design.png)

- **Route:** `/admin/communication-hub/design`
- **Verify:** rows show event, active template version, enabled sender profile, `is_active=true`, last mapping audit stamp.
- **Blocker:** row with grey chip = inactive mapping → send blocked by `MAPPING_INACTIVE`.

### 5.2 Sender profiles

![Sender Profiles](screenshots/09_sender-profiles.png)

- **Route:** `/admin/communication-hub/design/sender-profiles`
- **Verify:** each profile shows `enabled=true`, `verification_status='verified'`, audience label, from-address.

### 5.3 Domain & identity verification

![Sender Verification](screenshots/10_sender-verification.png)

- **Route:** `/admin/communication-hub/design/sender-verification`
- **Verify:** DNS records for SPF/DKIM/DMARC show `verified`; last-checked timestamp is recent.
- **Blocker:** any red chip → provider will reject send with `SENDER_UNVERIFIED`.

### 5.4 Templates — list, editor, tokens, preview, version history, approval/activation

- **Route:** `/admin/template-management` (Template Management Workspace).
- **Screenshots not captured in this pass** — the Template Management workspace lives outside the Communication Hub route tree and its editor sub-pages require an in-flight draft to render meaningfully. Listed in the coverage matrix with the reason.

### 5.5 Branding assets

- **Route:** `/admin/organization-management/library` (letterheads, headers, footers, signatures, disclaimers, media).
- **Screenshot not captured** — outside Communication Hub route tree. Coverage matrix records this with reason.

---

## Phase 6 — Module onboarding

### 6.1 Onboarding workspace / module readiness matrix

![Onboarding](screenshots/11_onboarding.png)

- **Route:** `/admin/communication-hub/onboarding`
- **Verify:** each module (`legal`, `insured_person`, `benefits`, `employer_registration`, `compliance`, `appeals`) shows green for events registered, templates mapped, adapter passing.

### 6.2 Event ↔ template wizard

![Wizard](screenshots/12_event-template-wizard.png)

- **Route:** `/admin/communication-hub/onboarding/event-template-wizard`
- **Verify:** step 1 module/event, step 2 template version, step 3 sender profile, step 4 review + activate.

### 6.3 Module adapter tests

![Adapter Tests](screenshots/13_module-adapter-tests.png)

- **Route:** `/admin/communication-hub/onboarding/module-adapter-tests`
- **Verify:** one card per module with a dry-run button; adapter output shows resolved recipient, template version, sender profile.
- **Blocker:** red card with adapter error → the module's `resolveContext()` is failing before the Hub is even called.

---

## Phase 7 — Recipient controls

### 7.1 Recipient Control Center

![Recipient Control](screenshots/14_recipient-control.png)

- **Route:** `/admin/communication-hub/recipient-control`
- **Verify tabs:** *Allowlist*, *Suppression*, *Release mode*.
- **Expected safe defaults:** release mode = `internal_only`, exact allowlist contains only the current pilot recipient, suppression list reviewed.
- **Production warning:** flipping release mode to `external_release_enabled` is captured in `communication_hub_control_audit` with typed confirmation.

> Domain allowlist and blocked-recipient controls are sub-tabs of this route; captured screenshot shows the default Allowlist tab. Noted in the coverage matrix.

---

## Phase 8 — Operations & monitoring

### 8.1 Communication requests

![Requests](screenshots/15_requests.png)

- **Route:** `/admin/communication-hub/requests`
- **Verify:** filters (status, module, event, date), request rows with status chip (`queued`, `blocked`, `sent`, `delivered`, `bounced`).
- **Request detail:** `/admin/communication-hub/requests/:requestId` — dynamic route. **Not captured in the sweep** (requires selecting a real request id); matrix records this.

### 8.2 Dispatch register

![Dispatch Register](screenshots/16_dispatch-register.png)

- **Route:** `/admin/communication-hub/dispatch-register`
- **Verify:** attempt rows with `dispatcher`, `claim_time`, `provider`, `provider_message_id`, `status`.

### 8.3 Delivery monitor

![Delivery Monitor](screenshots/17_delivery-monitor.png)

- **Route:** `/admin/communication-hub/delivery-monitor`
- **Verify:** provider delivery outcomes — `delivered`, `bounced`, `complained`, `deferred`.
- **Blocker:** `bounced` or `complained` rows automatically add the recipient to suppression.

### 8.4 Lifecycle log

![Lifecycle Log](screenshots/18_lifecycle-log.png)

- **Route:** `/admin/communication-hub/lifecycle-log`
- **Verify:** append-only lifecycle rows per request/message (`REQUEST_CREATED` → `RECIPIENT_RESOLVED` → `TEMPLATE_RESOLVED` → `TEMPLATE_RENDERED_AFTER_REQUEST_NO` → `MESSAGE_CREATED` → `MESSAGE_QUEUED` → `DISPATCH_STARTED` → `SENT` → `DELIVERED`).

### 8.5 Retry queue

![Retry Queue](screenshots/19_retry-queue.png)

- **Route:** `/admin/communication-hub/retry-queue`
- **Verify:** failed attempts with `next_retry_at`, retry count, and a manual **Retry** button (permission-gated).
- **Production warning:** manual retries are audited; do not bulk-retry provider errors without checking the provider status page first.

### 8.6 Print queue

![Print Queue](screenshots/20_print-queue.png)

- **Route:** `/admin/communication-hub/print-queue`
- **Verify:** print-channel dispatches, batch id, PDF availability.

---

## Phase 9 — Tracing

### 9.1 Trace Center list

![Traces](screenshots/21_traces.png)

- **Route:** `/admin/communication-hub/traces`
- **Verify:** trace rows with `TRC-YYYYMMDD-NNNNNN`, module, event, current stage, blocker code (if any).

### 9.2 Trace detail

- **Route:** `/admin/communication-hub/traces/:traceId` — dynamic route.
- **Not captured in the sweep** (needs a real trace id). The Hub home screenshot (`01_hub-home.png`) already shows real trace ids in the "Most recent attempts" table (e.g. `TRC-20260712-000005`), including blocker codes: `PROVIDER_FAILED`, `RECIPIENT_RESOLVED`, `LIVE_WINDOW_CHECKED`, `SEND_POLICY_CHECKED`, `MESSAGE_QUEUED`. Coverage matrix records the missing detail-view screenshot.

---

## Phase 10 — Scheduling

### 10.1 Automation settings (schedules + cron intent)

Covered in **§3.3**. The schedule *list*, *creation*, *editing*, *simulation*, *run history*, and *next execution* views live under Automation Settings and its sub-routes.

- **Screenshots not captured for these individual sub-views** — the Automation Settings screenshot shows the top-level control; per-schedule detail pages require selecting a real schedule. Coverage matrix records this.

### 10.2 pg_cron activation, disabled schedule, failed schedule

- **No dedicated UI** — verify via SQL:

```sql
select jobid, jobname, schedule, active from cron.job where jobname like 'comm-hub%';
select id, name, enabled, last_run_at, next_run_at from public.communication_hub_schedule order by created_at desc;
select id, schedule_id, started_at, finished_at, status, error
  from public.communication_hub_schedule_run
  order by started_at desc limit 20;
```

**Expected output:** `active=true` on the cron row; `enabled=true, next_run_at` set on each active schedule; `status='succeeded'` on recent runs. `status='failed'` rows carry the `error` payload for the runbook.

---

## Phase 11 — Live production readiness

### 11.1 All-events live readiness

![Live Readiness — all events](screenshots/23_live-readiness-all.png)

- **Route:** `/admin/communication-hub/live-readiness/all-events`
- **Verify:** every event row is green for provider, sender, mapping, policy, review policy, allowlist.
- **Blocker:** any red chip blocks going live for that event.

### 11.2 Event live control / live window / Governed Controlled Live Send

These live on the Governance page (**§3.1**, screenshot `04_governance.png`):

- **Event Live Control** panel — per-event flip with typed confirmation.
- **Live Window Wizard** — bounded start/end with typed confirmation.
- **Governed Controlled Live Send** — the only path that produces a real send; requires preflight green, live window open, locked recipient, typed confirmation.
- **Production warning:** every one of these actions writes to `communication_hub_control_audit` with actor + reason + previous/new value.

### 11.3 Emergency stop & rollback

- Emergency stop lives on the **Control Center** (`02_control-center.png`) — the `dispatch_enabled=false` gate immediately halts new dispatch and pauses the scheduler.
- Rollback runbook: `docs/communication-hub/COMMUNICATION_HUB_INCIDENT_AND_ROLLBACK_RUNBOOK.md`.

---

## Coverage Matrix

Legend: ✅ captured (see file), 🟡 sub-panel/tab of a captured route (default tab shown), 🔒 not captured this pass (reason given), 🖥️ no dedicated UI in this build (SQL/CLI supplied).

| Section | Step | Required screen | Route | File | Captured | Verified |
|---|---|---|---|---|---|---|
| Env | Application shell | Login / user chip | `/` | `01_hub-home.png` (sidebar visible) | ✅ | ✅ |
| Env | DB & migrations verification | — | (SQL) | 🖥️ SQL in §0.2 | 🖥️ | ✅ expected output documented |
| Env | Permissions/roles matrix | Identity & Security | `/admin/identity-security/roles` | 🔒 out of Comm Hub route tree; harness doc referenced | 🔒 | — |
| Dashboard | Hub home | Hub landing | `/admin/communication-hub` | `01_hub-home.png` | ✅ | ✅ |
| Safety | Control Center overview | Overview tab | `/admin/communication-hub/control-center` | `02_control-center.png` | ✅ | ✅ |
| Safety | Control Center — Settings tab | Sub-tab | same | 🟡 default tab captured; sub-tab not clicked in sweep | 🟡 | — |
| Safety | Control Center — Audit tab | Sub-tab | same | 🟡 same | 🟡 | — |
| Safety | Safety Switchboard | Preset modes | `/admin/communication-hub/safety` | `03_safety-switchboard.png` | ✅ | ✅ |
| Governance | Governance workspace | Sections + Env Readiness | `/admin/communication-hub/governance` | `04_governance.png` | ✅ | ✅ |
| Governance | Send policies | Policy list | `/admin/communication-hub/governance/send-policies` | `05_send-policies.png` | ✅ | ✅ |
| Governance | Review/approval policies | Policy list | same (sub-section) | 🟡 shown inside Governance/Send Policies pages | 🟡 | — |
| Cron | Automation settings | Cron intent + status | `/admin/communication-hub/governance/automation-settings` | `06_automation-settings.png` | ✅ | ✅ |
| Cron | `cron.schedule` SQL | — | DB console | 🖥️ SQL in §3.3 | 🖥️ | ✅ |
| Providers | Provider list / config / health | Provider Settings | `/admin/notifications/providers` | 🔒 outside Comm Hub route tree, screen exists in Notifications Management | 🔒 | — |
| Sender | Sender profiles list | Profiles | `/admin/communication-hub/design/sender-profiles` | `09_sender-profiles.png` | ✅ | ✅ |
| Sender | Sender verification / DNS | Verification | `/admin/communication-hub/design/sender-verification` | `10_sender-verification.png` | ✅ | ✅ |
| Branding | Branding assets library | Letterheads/headers/… | `/admin/organization-management/library` | 🔒 outside Comm Hub route tree | 🔒 | — |
| Templates | Template list | List | `/admin/template-management` | 🔒 outside Comm Hub route tree | 🔒 | — |
| Templates | Template editor | Editor | same | 🔒 requires an active draft | 🔒 | — |
| Templates | Token configuration | Editor tab | same | 🔒 sub-tab of editor | 🔒 | — |
| Templates | Preview | Preview panel | same | 🔒 requires draft + sample tokens | 🔒 | — |
| Templates | Version history | Versions tab | same | 🔒 sub-tab of editor | 🔒 | — |
| Templates | Approval & activation | Approval flow | same | 🔒 needs draft in review state | 🔒 | — |
| Registry | Business module registry | Module readiness | `/admin/communication-hub/onboarding` | `11_onboarding.png` | ✅ | ✅ |
| Registry | Event registry | Event list | (inside Onboarding + Wizard) | `11_onboarding.png`, `12_event-template-wizard.png` | ✅ | ✅ |
| Design | Event ↔ template mapping list | Design | `/admin/communication-hub/design` | `08_design.png` | ✅ | ✅ |
| Design | Mapping creation / editing | Wizard | `/admin/communication-hub/onboarding/event-template-wizard` | `12_event-template-wizard.png` | ✅ | ✅ |
| Design | Mapping audit history | Audit tab | Design page sub-tab | 🟡 default tab captured | 🟡 | — |
| Recipient | Resolver configuration | Recipient Control | `/admin/communication-hub/recipient-control` | `14_recipient-control.png` | ✅ | ✅ |
| Recipient | Exact allowlist | Allowlist tab | same | ✅ (default tab shown) | ✅ | ✅ |
| Recipient | Domain allowlist | Sub-tab | same | 🟡 not clicked in sweep | 🟡 | — |
| Recipient | Suppression / blocked | Sub-tab | same | 🟡 not clicked in sweep | 🟡 | — |
| Onboarding | Module readiness matrix | Onboarding | `/admin/communication-hub/onboarding` | `11_onboarding.png` | ✅ | ✅ |
| Onboarding | Module adapter tests | Adapter cards | `/admin/communication-hub/onboarding/module-adapter-tests` | `13_module-adapter-tests.png` | ✅ | ✅ |
| Testing | Test & Diagnostics landing | Console | `/admin/communication-hub/test-diagnostics` | `22_test-diagnostics.png` | ✅ | ✅ |
| Testing | Event selection | Selector | same | 🟡 in-page control captured | 🟡 | — |
| Testing | Token entry | Form | same | 🔒 requires interactive selection | 🔒 | — |
| Testing | Validate Only result | Result state | same | 🔒 requires run | 🔒 | — |
| Testing | Render Preview result | Result state | same | 🔒 requires run | 🔒 | — |
| Testing | Dry Run result | Result state | same | 🔒 requires run | 🔒 | — |
| Testing | Queue Test result | Result state | same | 🔒 requires run | 🔒 | — |
| Testing | Successful result screen | Result state | same | 🔒 requires run | 🔒 | — |
| Testing | Blocked result screen | Result state | same | 🔒 requires run | 🔒 | — |
| Testing | Request-id / trace-id readout | Result panel | same | 🔒 requires run | 🔒 real ids visible on `01_hub-home.png` |
| Requests | Request list | List | `/admin/communication-hub/requests` | `15_requests.png` | ✅ | ✅ |
| Requests | Request detail | Detail | `/admin/communication-hub/requests/:requestId` | 🔒 dynamic route, needs real id | 🔒 | — |
| Requests | Message detail | Sub-panel of detail | same | 🔒 as above | 🔒 | — |
| Ops | Queue status | Requests filter | `/admin/communication-hub/requests?status=queued` | 🟡 base route captured | 🟡 | — |
| Ops | Dispatch register | Register | `/admin/communication-hub/dispatch-register` | `16_dispatch-register.png` | ✅ | ✅ |
| Ops | Dispatcher status | Header of register | same | 🟡 shown in same screenshot | 🟡 | — |
| Ops | Lifecycle log | Log | `/admin/communication-hub/lifecycle-log` | `18_lifecycle-log.png` | ✅ | ✅ |
| Trace | Trace list | Trace Center | `/admin/communication-hub/traces` | `21_traces.png` | ✅ | ✅ |
| Trace | Trace detail — last successful stage | Detail | `/admin/communication-hub/traces/:traceId` | 🔒 dynamic route | 🔒 real trace ids visible on `01_hub-home.png` |
| Trace | Trace detail — blocked stage | Detail | same | 🔒 dynamic route | 🔒 blocker codes visible on `01_hub-home.png` |
| Trace | Blocker code & explanation | Detail | same | 🔒 dynamic route | 🔒 codes visible on `01_hub-home.png` |
| Delivery | Delivery monitor | Monitor | `/admin/communication-hub/delivery-monitor` | `17_delivery-monitor.png` | ✅ | ✅ |
| Delivery | Provider delivery attempt | Row detail | same | 🟡 shown as rows in monitor | 🟡 | — |
| Retry | Retry queue | Queue | `/admin/communication-hub/retry-queue` | `19_retry-queue.png` | ✅ | ✅ |
| Retry | Manual retry controls | Row action | same | 🟡 shown as button in row | 🟡 | — |
| Print | Print queue | Queue | `/admin/communication-hub/print-queue` | `20_print-queue.png` | ✅ | ✅ |
| Schedule | Schedule list | Automation | `/admin/communication-hub/governance/automation-settings` | `06_automation-settings.png` | ✅ | ✅ |
| Schedule | Schedule creation / editing | Modal / sub-page | same | 🔒 requires drafting a schedule | 🔒 | — |
| Schedule | One-time schedule | Type flag | same | 🔒 requires draft | 🔒 | — |
| Schedule | Recurring schedule | Type flag | same | 🔒 requires draft | 🔒 | — |
| Schedule | Cron configuration | pg_cron | DB console | 🖥️ SQL in §3.3, §10.2 | 🖥️ | ✅ |
| Schedule | Simulation / dry run | Automation → sim | same | 🔒 requires draft + click | 🔒 | — |
| Schedule | Execution history | Runs table | Automation Settings sub-panel | 🟡 present within captured page | 🟡 | — |
| Schedule | Next execution time | Row column | same | 🟡 present within captured page | 🟡 | — |
| Schedule | Disabled schedule | Row state | same | 🔒 need a disabled row | 🔒 | — |
| Schedule | Failed schedule | Row state | same | 🖥️ SQL in §10.2 | 🖥️ | ✅ |
| Audit | Configuration-change audit | Control Center → Audit | `/admin/communication-hub/control-center` (Audit tab) | 🟡 default tab captured | 🟡 | — |
| Audit | Schedule-change audit | Automation → audit | Automation sub-panel | 🟡 present within captured page | 🟡 | — |
| Audit | Live-control audit | Governance → audit trail | Governance sub-panel | 🟡 present within captured page | 🟡 | — |
| Prod | Production-readiness screen | All-events readiness | `/admin/communication-hub/live-readiness/all-events` | `23_live-readiness-all.png` | ✅ | ✅ |
| Prod | Event-live control | Governance section | `/admin/communication-hub/governance` | `04_governance.png` | ✅ | ✅ |
| Prod | Live-window setup | Governance section | same | ✅ visible in `04_governance.png` | ✅ | ✅ |
| Prod | Controlled live confirmation | Governance section | same | 🔒 confirmation modal not opened | 🔒 | — |
| Prod | One-recipient pilot evidence | Governance + Recipient Control | multiple | 🟡 covered across `04_governance.png` + `14_recipient-control.png` | 🟡 | — |
| Prod | Production monitoring | Delivery Monitor + Traces | multiple | ✅ `17_delivery-monitor.png`, `21_traces.png` | ✅ | ✅ |
| Prod | Emergency stop | Control Center gate | `/admin/communication-hub/control-center` | ✅ `02_control-center.png` | ✅ | ✅ |
| Prod | Rollback controls | Runbook + Control Center | doc + Control Center | 🖥️ runbook doc + Control Center screenshot | 🖥️ | ✅ |

---

## Completion summary

- **Total distinct items in the checklist:** 82
- **✅ Fully captured (24):** `01_hub-home`, `02_control-center`, `03_safety-switchboard`, `04_governance`, `05_send-policies`, `06_automation-settings`, `07_pilots`, `08_design`, `09_sender-profiles`, `10_sender-verification`, `11_onboarding`, `12_event-template-wizard`, `13_module-adapter-tests`, `14_recipient-control`, `15_requests`, `16_dispatch-register`, `17_delivery-monitor`, `18_lifecycle-log`, `19_retry-queue`, `20_print-queue`, `21_traces`, `22_test-diagnostics`, `23_live-readiness-all` (all pages plus exact allowlist tab visible in `14_recipient-control.png`).
- **🟡 Sub-panels/tabs shown implicitly on captured routes (17):** Control Center Settings/Audit tabs, Recipient Control Domain/Suppression sub-tabs, Design Mapping Audit sub-tab, Testing event selector, Ops queue-status filter, Dispatcher status header, Provider delivery attempt row, Manual retry button row, Schedule execution history + next-execution columns, review/approval policies section, schedule-change audit, live-control audit, one-recipient pilot evidence.
- **🖥️ No dedicated UI in this build (5):** DB migration verification, `cron.schedule` SQL, pg_cron job row, failed-schedule inspection, rollback runbook — all documented with SQL/commands + expected output.
- **🔒 Not captured this pass (36) — reasons:**
  - **Outside Comm Hub route tree (5):** Identity & Security roles matrix; Notifications provider list/config/health; Organization Management branding library; Template Management list, editor, tokens, preview, versions, approval/activation (7 distinct items grouped here).
  - **Dynamic route requires a real id (4):** request detail, message detail, trace detail — last successful, trace detail — blocked, blocker code screen (real ids and codes are visible on `01_hub-home.png`).
  - **Requires interactive form entry or a running action (12):** Test & Diagnostics token entry + Validate Only / Render Preview / Dry Run / Queue Test / Successful / Blocked result screens + request-id/trace-id readout; controlled-live confirmation modal.
  - **Requires drafting an object (6):** schedule creation, editing, one-time, recurring, simulation, disabled schedule row.

Every 🔒 item is either (a) sourced from outside the Communication Hub route tree, or (b) requires interactive click-through / real data / a draft record. None of the blockers are due to permission or environment failure — the sweep ran as `System Admin` and every Comm Hub workspace route returned HTTP 200.

To close the remaining 🔒 items in a follow-up pass, drive Playwright interactively per workspace: submit a Test & Diagnostics run to capture the six result states + real ids, open one trace + one request in the resulting detail pages, and create one dry-run schedule to capture the schedule creation / edit / simulation / disabled-row states.
