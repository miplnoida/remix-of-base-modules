# Communication Hub — Scratch-to-Production Developer Manual

**Audience:** A developer who has not previously worked on the Communication Hub and must set it up from scratch, validate every gate, and take it safely to production.

**Scope:** This manual documents the Communication Hub *as it currently exists in this repository*. Where a feature is incomplete, dry-run only, or missing, it is stated explicitly. **No production live email is sent for documentation purposes.**

**Companion documents (this directory):**
- `COMMUNICATION_HUB_ENVIRONMENT_CHECKLIST.md`
- `COMMUNICATION_HUB_CONFIGURATION_CHECKLIST.md`
- `COMMUNICATION_HUB_MODULE_ONBOARDING_CHECKLIST.md`
- `COMMUNICATION_HUB_PRODUCTION_READINESS_CHECKLIST.md`
- `COMMUNICATION_HUB_SCHEDULING_RUNBOOK.md`
- `COMMUNICATION_HUB_AUDIT_AND_TRACE_RUNBOOK.md`
- `COMMUNICATION_HUB_INCIDENT_AND_ROLLBACK_RUNBOOK.md`
- `COMMUNICATION_HUB_TEST_EVIDENCE_TEMPLATE.md`
- `PROD_RUNBOOK.md` (operational runbook, pre-existing)
- `module-adapters.md` (adapter contract, pre-existing)
- Screenshot folder: `docs/communication-hub/screenshots/`

---

## PART A — Architecture and system foundation

### A.1 Purpose

The Communication Hub is the single canonical spine for every outbound business communication produced by this application. Business modules (Legal, Insured Person, Benefits, Employer Registration, Compliance, …) **never** call an email provider, resolve a template, or write to a legacy notification queue directly. They call one thin module adapter which delegates to the Hub façade.

The Hub owns:
- template + version resolution,
- branding (letterhead, header, footer, signature, disclaimer),
- sender + provider selection,
- recipient resolution + allowlist enforcement,
- send-policy and review-policy evaluation,
- request/message creation,
- queue + dispatcher orchestration,
- lifecycle events + trace,
- audit,
- retries,
- scheduling,
- global safety gates and emergency stop.

**Channels currently implemented:** email (via Resend, through `comm-hub-dispatch`).
**Channels partially scaffolded / not production ready:** SMS, print (letter), in-app.

### A.2 Layered flow (actual implementation)

```
Business action or scheduler
  → Module adapter (src/modules/<module>/communication/<module>Communication.ts)
    → Business-module adapter façade (src/platform/communication-hub/businessModuleCommunicationAdapter.ts)
      → supabase.functions.invoke("comm-hub-event-pilot", { action: "dry_run" | "live_send", ... })
        → send_communication_v1 RPC (canonical: creates request/recipient/message,
          resolves template+version, sender, tokens, applies allowlist + send-policy)
          → communication_request / communication_message / communication_delivery_attempt
          → communication_event_log (lifecycle events)
          → comm-hub-dispatch (edge function, target mode)
            → provider (Resend) OR dry-run stub `dry-run:<id>`
            → comm-hub-resend-webhook (delivery events)
```

Every stage produces database evidence:

| Stage | Source | DB record | Failure result |
|---|---|---|---|
| Adapter | `businessModuleCommunicationAdapter.ts` | none | throws before DB write |
| Preflight | `comm-hub-manual-dispatch-test` / `comm-hub-event-pilot` | none | `blocked: true`, `reasons[]` |
| Request | `send_communication_v1` | `communication_request` | request row with `status='blocked'` and blocker code |
| Recipient | same | `communication_recipient` | request blocked at policy stage |
| Message | same | `communication_message` | not created if template resolution fails |
| Queue | dispatcher | `communication_delivery_attempt` (pending) | none |
| Dispatch | `comm-hub-dispatch` | `communication_delivery_attempt` (sent/failed) | attempt row with error |
| Lifecycle | all stages | `communication_event_log` | event row `*_FAILED` |
| Webhook | `comm-hub-resend-webhook` | `communication_delivery_attempt` (delivered/bounced/complained) | attempt updated |

### A.3 Discovered routes

All routes are declared under `src/App.tsx` and mount inside `CommunicationHubShell`.

| Route | Purpose |
|---|---|
| `/admin/communication-hub` | Hub home |
| `/admin/communication-hub/control-center` | Global safety gates |
| `/admin/communication-hub/safety` | Safety Switchboard (preset modes) |
| `/admin/communication-hub/design` | Event → Template mapping workspace |
| `/admin/communication-hub/design/sender-profiles` | Sender profiles |
| `/admin/communication-hub/design/sender-verification` | Sender/domain verification |
| `/admin/communication-hub/onboarding` | Onboarding workspace |
| `/admin/communication-hub/onboarding/event-template-wizard` | Event + template wizard |
| `/admin/communication-hub/onboarding/module-adapter-tests` | Adapter dry-run harness |
| `/admin/communication-hub/governance` | Governance (live readiness, event live control, live window) |
| `/admin/communication-hub/governance/send-policies` | Per-event send policy |
| `/admin/communication-hub/governance/automation-settings` | Cron/dispatcher automation |
| `/admin/communication-hub/pilots` | Governed Controlled Live Send |
| `/admin/communication-hub/recipient-control` | Recipient allowlist, suppression |
| `/admin/communication-hub/requests`, `.../:requestId` | Request browser + detail |
| `/admin/communication-hub/dispatch-register` | Dispatch register |
| `/admin/communication-hub/delivery-monitor` | Delivery monitor |
| `/admin/communication-hub/lifecycle-log` | Lifecycle event log |
| `/admin/communication-hub/retry-queue` | Retry / failed queue |
| `/admin/communication-hub/traces`, `.../:traceId` | Trace Center |
| `/admin/communication-hub/test-diagnostics` | Test & Diagnostics |
| `/admin/communication-hub/live-readiness/all-events` | All-events readiness matrix |
| `/admin/communication-hub/print-queue` | Print queue (scaffold, not production) |

### A.4 Discovered edge functions

| Function | JWT | Role |
|---|---|---|
| `comm-hub-event-pilot` | required | Canonical dry-run / live-send pilot entry |
| `comm-hub-enqueue` | required | Enqueue message to dispatcher |
| `comm-hub-dispatch` | required | Dispatcher: target mode + provider call |
| `comm-hub-manual-dispatch-test` | required | Admin one-off manual dispatch + preflight |
| `comm-hub-admin-test-notice` | required | Admin test notice fixture |
| `comm-hub-sender-verification` | required | Sender/domain verification checks |
| `comm-hub-trace-simulate` | required | Trace simulator |
| `comm-hub-resend-webhook` | false | Resend delivery webhook |
| `ce-audit-communication-dispatch` | required | Compliance audit dispatch |
| `ce-audit-communication-event-hook` | required | Compliance audit event hook |

### A.5 Discovered business-module adapters

- `src/modules/legal/communication/legalCommunication.ts`
- `src/modules/insuredPerson/communication/insuredPersonCommunication.ts`
- `src/modules/benefits/communication/benefitsCommunication.ts`
- `src/modules/employerRegistration/communication/employerRegistrationCommunication.ts`
- `src/modules/compliance/communication/complianceCommunication.ts`

All go through `src/platform/communication-hub/businessModuleCommunicationAdapter.ts`. All current adapters are wired to `sendBusinessModuleCommunicationDryRun` (dry-run only). Live promotion happens through Governance → Governed Controlled Live Send, never from a module adapter.

---

## PART B — Installation and environment setup

### B.1 Environments

| Setting | Local | QA | Staging | Production |
|---|---|---|---|---|
| Database | shared Supabase (dev) | dev | dev | prod |
| Provider | Resend sandbox / dry-run | sandbox | sandbox or live-limited | live |
| Test mode | forced true | forced true | true unless pilot window | true unless governed live |
| Dispatch enabled | true | true | true | true (gated) |
| `email_live_enabled` | false | false | false unless pilot | false until go-live |
| External recipients | blocked | blocked | blocked | blocked unless allowlisted |
| Cron | manual | manual | manual | disabled until authorised |
| Bulk send | disabled | disabled | disabled | disabled |
| Approval required | no | no | yes for pilot | yes for every live event |
| Audit retention | full | full | full | full |

Production defaults to **safe mode** (dry-run only, cron off, live off). Only Governance + typed confirmation can move it.

### B.2 Repository setup

```
bun install
bun run lint
bun run lint:comm-governance   # blocks direct provider calls / legacy queue writes
bun run test
bun run build
```

If any command differs in this repository's `package.json`, use the script as declared there — do not invent commands.

### B.3 Secrets

| Secret | Consumer | Public? | Purpose |
|---|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` | frontend | yes | Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | edge functions only | secret | privileged writes |
| `RESEND_API_KEY` | `comm-hub-dispatch` | secret | Resend provider |
| `COMM_HUB_DISPATCH_SECRET` | dispatcher ↔ dispatch handler | secret | dispatcher auth |
| `COMM_HUB_RESEND_WEBHOOK_SECRET` | `comm-hub-resend-webhook` | secret | webhook signature |
| `COMMUNICATION_HUB_EMAIL_LIVE` | dispatcher | secret env flag | live-email gate (bool) |
| `COMMUNICATION_HUB_EMAIL_LIVE_ALLOWLIST` | dispatcher | secret env | comma-separated recipient allowlist |

Verification: `EnvironmentReadinessCard` (mounted on `LiveReadinessGovernancePanel`) returns presence booleans + counts via the preflight endpoint. Values are **never** returned to the browser.

### B.4 Migrations and schema

Communication Hub tables (public schema — no RLS per project `docs/ARCHITECTURE-NO-RLS-RULE.md`; authorization enforced in application + RPC layer):

| Table | Purpose |
|---|---|
| `communication_hub_module_event_registry` | Module + event definitions |
| `communication_hub_event_template_map` | Active event → template + version + sender mapping |
| `communication_hub_control_settings` | Global safety controls |
| `communication_hub_control_audit` | Change audit for control settings |
| `communication_hub_gate_catalog` | Human-readable gate catalog |
| `communication_hub_send_policy` | Per-event send policy |
| `communication_hub_review_policy` | Per-event review policy |
| `communication_hub_recipient_allowlist` | Exact-email + domain allowlist |
| `communication_hub_suppressed_email` | Suppression list |
| `communication_hub_sender_profile` | Sender profiles |
| `communication_hub_sender_verification` | Domain/sender verification |
| `communication_hub_live_readiness` | Per-event readiness sign-offs |
| `communication_hub_live_window` | Live windows |
| `communication_hub_event_live_control` | Per-event live enablement |
| `communication_hub_schedule` | Scheduled communications (see scheduling runbook) |
| `communication_hub_schedule_run` | Schedule executions |
| `communication_request` | Request (per module event) |
| `communication_recipient` | Recipient rows |
| `communication_message` | Rendered message |
| `communication_delivery_attempt` | Per-attempt row (queue/sent/delivered/failed) |
| `communication_event_log` | Lifecycle events |
| `core_template_master`, `core_template_version` | Canonical template master + versions |

Verify migrations by connecting to Cloud → Run SQL and running the queries in `scripts/comm-hub/assert_template_mapping.sql` (SELECT-only).

### B.5 Roles

| Action | Business user | Module admin | Comm admin | Tester | Operator | Approver |
|---|---|---|---|---|---|---|
| View traces | ✓ (own) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Edit templates | | ✓ | ✓ | | | |
| Activate template version | | | ✓ | | | ✓ |
| Configure providers/senders | | | ✓ | | | |
| Run dry run | | ✓ | ✓ | ✓ | ✓ | |
| Enable event-live | | | | | | ✓ |
| Open live window | | | | | | ✓ |
| Trigger Governed Controlled Live Send | | | | | | ✓ |
| Stop dispatch | | | ✓ | | ✓ | ✓ |
| Manage retries | | | ✓ | | ✓ | |
| View audit | | ✓ | ✓ | ✓ | ✓ | ✓ |

Route permissions are enforced by `PermissionProtectedRoute` and `SecurityPolicyProvider` (route_security_config + role_permissions).

### B.6 Health check

Before touching any Hub configuration:

1. App loads, user authenticated, correct commit hash visible.
2. `/admin/communication-hub/control-center` loads and shows current gates.
3. `EnvironmentReadinessCard` (on Governance page) reports secrets present, cron scheduled=false (expected until go-live), allowlist count > 0 for pilot recipient.
4. `/admin/communication-hub/test-diagnostics` loads.
5. `assert_template_mapping.sql` returns zero broken mappings.

Failing check → stop, log evidence, remediate before continuing.

---

## PART C — Communication Hub configuration

Configuration must happen in this exact order.

**Step 1 — Organisation / tenant context.** Verified via login + org context. Audit rows must record `organisation_id`.

**Step 2 — Register business modules** in `communication_hub_module_event_registry`. Fields: `module_code`, `module_name`, `owner`, `technical_owner`, `is_active`, `risk_level`, `channels`. Verify: registry visible in Onboarding wizard.

**Step 3 — Configure providers.** Currently: Resend (email). Configure via `/admin/notifications/providers` (legacy notification provider table, reused). Verify: `EnvironmentReadinessCard.resendApiKeyPresent = true`.

**Step 4 — Configure sender profiles** at `/admin/communication-hub/design/sender-profiles`. Verify identity + domain via `/admin/communication-hub/design/sender-verification`. Row must be `enabled=true` and `verification_status='verified'`.

**Step 5 — Branding assets** (letterhead / signature / footer / disclaimer) — canonical tables prefixed `comm_*`. Managed under Organisation Management → Library.

**Step 6 — Templates** — canonical `core_template_master` / `core_template_version`. Author under `/admin/template-management`. Only *active* versions are usable. Approval + activation are audited.

**Step 7 — Register events** in `communication_hub_module_event_registry` (event side). Every event must declare required tokens, recipient type, channel, risk, scheduling eligibility.

**Step 8 — Event ↔ Template mapping** under `/admin/communication-hub/design`. Row must be `is_active=true` and reference an approved template version + enabled sender profile. Assertion script: `scripts/comm-hub/assert_template_mapping.sql`.

**Step 9 — Recipient resolution.** Each event declares its resolver (internal user / applicant / employer / officer / static test recipient). Missing recipient → request blocked.

**Step 10 — Recipient controls** under `/admin/communication-hub/recipient-control`: exact allowlist, domain allowlist, external release toggle, suppression list. All changes audited.

**Step 11 — Send policies** under `/admin/communication-hub/governance/send-policies`. Enforced inside `send_communication_v1`. Blocked requests carry the blocker code.

**Step 12 — Review policies** — per-event review + approval requirement. Expiring approval blocks send.

**Step 13 — Global safety controls** at `/admin/communication-hub/control-center`. Default safe state:
- `dry_run_only = true`
- `email_live_enabled = false`
- `cron_desired_enabled = false`
- `dispatch_enabled = true` (dispatcher runs but stays in target/dry-run mode)
- `bulk_enabled = false`
- `external_release = false`

---

## PART D — Business module onboarding

Follow `COMMUNICATION_HUB_MODULE_ONBOARDING_CHECKLIST.md` per module. Adapter contract is `src/platform/communication-hub/businessModuleCommunicationAdapter.ts`. Modules must not:

- call Resend or any provider directly,
- import provider SDKs,
- insert into `notification_queue` / `notification_logs` / `bn_communication_log` / `ce_audit_communications` / `ce_notice_delivery_log`,
- read provider secrets,
- resolve templates independently,
- bypass send / review / recipient policies,
- disable safety gates.

`bun run lint:comm-governance` enforces most of these statically.

---

## PART E — Dry-run and testing

Test progression (per event):
1. Source-code lint + governance lint + unit tests + build.
2. Configuration validation (`assert_template_mapping.sql`).
3. Token validation (Test & Diagnostics → Validate Only).
4. Render preview (Test & Diagnostics → Render Preview).
5. Adapter test (`/admin/communication-hub/onboarding/module-adapter-tests`).
6. Dry run — full flow, `test_mode=true`, provider stub `dry-run:*`.
7. Queue test — dispatcher evaluates gates, produces attempt row without provider call.
8. Idempotency test — repeat identical event, verify duplicate blocked.
9. Permission test — attempt actions across roles.
10. Negative / blocker tests — every gate must produce its documented blocker code.

Evidence template: `COMMUNICATION_HUB_TEST_EVIDENCE_TEMPLATE.md`.

---

## PART F — Queue, dispatcher and scheduling

See `COMMUNICATION_HUB_SCHEDULING_RUNBOOK.md`. Key points:
- Dispatcher edge function is `comm-hub-dispatch`, guarded by `COMM_HUB_DISPATCH_SECRET`.
- Live-email path requires all of: `dispatch_enabled=true`, `dry_run_only=false`, `email_live_enabled=true`, `COMMUNICATION_HUB_EMAIL_LIVE=true`, per-event live control on, live window open, recipient in allowlist.
- Cron (pg_cron on Supabase) stays **off** until Governance explicitly enables it with typed confirmation and approver present.

---

## PART G — Audit, trace, evidence

See `COMMUNICATION_HUB_AUDIT_AND_TRACE_RUNBOOK.md`. Every mutation of every configuration table writes to `communication_hub_control_audit` (or its per-table audit companion) with actor, timestamp, previous value, new value, reason.

---

## PART H — Staging / UAT

Use dedicated staging Supabase project. Never reuse production secrets. Run the complete Part E test progression per event in staging, then obtain sign-off in evidence template before promotion.

---

## PART I — Production readiness and activation

See `COMMUNICATION_HUB_PRODUCTION_READINESS_CHECKLIST.md`. Progressive activation:

- **Stage 0** — Production configured; sending disabled.
- **Stage 1** — Production dry run (real config, provider stub).
- **Stage 2** — One Governed Controlled Live Send to one approved internal recipient in one bounded live window. Close window immediately.
- **Stage 3** — Bounded pilot (defined recipient cap, duration, stop conditions).
- **Stage 4** — Scheduled pilot (one schedule).
- **Stage 5** — Normal production (only approved events + schedules).

Recommended first live event (from PROD-AUDIT-1): `legal.internal_case_created_notice` (internal-only).

---

## PART J — Production monitoring

Daily operator checks via Delivery Monitor, Retry Queue, Lifecycle Log, and Scheduled-job monitor. Alert thresholds are advisory unless configured in `communication_hub_control_settings`.

---

## PART K — Emergency stop and rollback

See `COMMUNICATION_HUB_INCIDENT_AND_ROLLBACK_RUNBOOK.md`. Safety Switchboard preset **Emergency Stop** flips: `dispatch_enabled=false`, `email_live_enabled=false`, `cron_desired_enabled=false`, `dry_run_only=true`. Never delete requests, messages, delivery attempts, traces, audit rows, or schedule-run history during incident recovery.

---

## Discovered inventory

**Modules:** legal, insuredPerson, benefits, employerRegistration, compliance.
**Events:** declared in `communication_hub_module_event_registry`. Query live to enumerate.
**Providers:** Resend (email). SMS / print / in-app are scaffolded but not production ready.
**Scheduling:** `communication_hub_schedule` + pg_cron; runbook in `COMMUNICATION_HUB_SCHEDULING_RUNBOOK.md`.
**Audit/trace:** `communication_hub_control_audit`, `communication_event_log`, Trace Center UI.

**Current dry-run limitations / production blockers (from PROD-AUDIT-1):**
- Cron activation still manual (intentional).
- Confirmation strings between manual dispatch and governed live send were aligned in PROD-FIX-2.
- Nightly template-mapping assertion recommended but not yet scheduled.
- SMS / print / in-app channels are not production ready.

**No production live email has been sent for documentation purposes.**
