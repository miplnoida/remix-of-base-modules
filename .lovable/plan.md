
# EPIC 4B — Self-Service Event & Template Onboarding Engine

Build a UI-driven wizard so Admins can create module events, tokens, templates, versions, mappings, and dry-run validate — all from Communication Hub. Zero live send, zero cron, zero legacy writes. All existing safety gates preserved.

## Scope guardrails (unchanged)

- Dry-run only. `dispatch_enabled=true`, `dry_run_only=true`, `email_live_enabled=false`, `cron_desired_enabled=false`.
- Recipient locked to `rohit@mishainfotech.com`.
- No promotion to `live_manual_only` / `live_cron_allowed` anywhere in the wizard.
- No writes to `notification_queue`, `notification_logs`, `bn_communication_log`, `ce_audit_communications`, or business-module production tables.
- No secrets exposed. Admin-only, `has_role(auth.uid(), 'admin')` gating on every RPC.

## Deliverables

### 1. Database (single migration)

Extend registry + add SECURITY DEFINER Admin-only RPCs:

- `ALTER TABLE communication_hub_module_event_registry ADD COLUMN token_metadata jsonb DEFAULT '[]'::jsonb` (keeps existing `required_tokens text[]` intact, populated in parallel).
- `RPC upsert_comm_hub_module_event_registry(p_payload jsonb, p_reason text)` — validates snake_case, uniqueness, risk enum; upserts row; writes `communication_hub_control_audit`.
- `RPC update_comm_hub_registry_token_metadata(p_module, p_event, p_channel, p_token_metadata jsonb, p_reason text)` — also mirrors `key`s into `required_tokens[]`.
- `RPC create_comm_hub_template_with_version(p_template jsonb, p_version jsonb, p_reason text, p_confirm text)` — creates `core_template` if missing; inserts new `core_template_version` (status `published`); sets `active_version_id`; requires `p_confirm='CREATE NEW TEMPLATE VERSION'` when template already has an active version.
- `RPC ensure_comm_hub_event_live_control(p_module, p_event, p_channel, p_risk, p_reason)` — inserts row with `status='dry_run_only'` only. Rejects any attempt to set `live_manual_only`, `live_cron_allowed`.
- Reuse existing `upsert_comm_hub_event_template_mapping` for the mapping step.
- Reuse existing `evaluate_comm_hub_live_gate` for preflight.

All RPCs: `SECURITY DEFINER`, `SET search_path = public`, Admin role check, reason required, audit trail.

### 2. Service layer

New: `src/pages/admin/communicationHub/services/eventTemplateOnboardingService.ts`

```text
listKnownModules()                → static + registry-discovered modules
listExistingTemplates(module,event)
upsertModuleEventRegistry(payload, reason)
updateTokenMetadata(...)
createTemplateWithVersion(...)
ensureEventLiveControlDryRun(...)
mapEventToTemplate(...)          → wraps upsert_comm_hub_event_template_mapping
runEventPreflight(module,event,channel) → wraps evaluate_comm_hub_live_gate
runDryRunValidation(...)         → invokes existing comm-hub-event-pilot function, test_mode=true, recipient locked
fetchOnboardingStatus(module,event,channel)
```

Client-side Zod schemas for each step, token key validation (`^[a-z][a-z0-9_]*$`), template body scan for unknown/unclosed tokens and script tags.

### 3. Wizard UI

Route: `/admin/communication-hub/onboarding/event-template-wizard`
Also embedded card entry on `/admin/communication-hub/onboarding` and quick-links from Design, Mapping panel, Registry panel.

Files:

```text
src/pages/admin/communicationHub/onboarding/EventTemplateWizardPage.tsx
src/pages/admin/communicationHub/onboarding/wizard/
  WizardShell.tsx            (stepper + state machine)
  Step1ModuleEvent.tsx
  Step2Tokens.tsx            (locked server-provided rows + editable)
  Step3Template.tsx          (new vs existing, code auto-suggest, token-insert buttons)
  Step4Preview.tsx           (renders subject/body with sample values; no DB write)
  Step5Publish.tsx           (typed confirm for new version)
  Step6LiveControl.tsx       (dry_run_only badge, risk warning)
  Step7Mapping.tsx           (typed confirm MAP EVENT TO TEMPLATE)
  Step8Preflight.tsx         (calls evaluate_comm_hub_live_gate)
  Step9DryRun.tsx            (optional; typed confirm SEND GENERIC EVENT DRY RUN)
  Step10Summary.tsx          (status badges + "What happens next?" guidance + operations links)
  tokenValidation.ts
  templateValidation.ts
```

High-risk events show persistent warning banner from Step 1 onward and disable the Live-Control status field (locked to `dry_run_only`).

### 4. Entry points

- `CommunicationHubOnboardingPage.tsx` — add prominent "Start Event & Template Wizard" card.
- `CommunicationHubDesignPage.tsx` — quick-link.
- `EventTemplateMappingPanel.tsx` — "New event + template" toolbar button; row action "Open in wizard" deep-links `?module=&event=`.
- `BusinessModuleCommunicationRegistryPanel.tsx` — same row action + toolbar.

### 5. Seed the three initial events **through the wizard service layer**

After the wizard exists, invoke the service functions (from a one-time seeding script `scripts/comm-hub/seed-initial-events.ts` OR by running the wizard once per event) for:

1. `LEGAL / INTERNAL_CASE_ASSIGNMENT_NOTICE` — low risk, ADMIN_USER
2. `INSURED_PERSON / INTERNAL_PROFILE_REVIEW_NOTICE` — low risk, ADMIN_USER
3. `BENEFITS / INTERNAL_CLAIM_REVIEW_NOTICE` — low risk, ADMIN_USER

These already exist from EPIC 4B prior work; the wizard will **detect** existing rows, populate `token_metadata`, and confirm dry-run readiness rather than recreate.

### 6. Verification

- Typecheck.
- Manual smoke via Playwright: open wizard, walk through Legal event, confirm registry/mapping/pilot visibility.
- Read-queries against registry, mapping, live-control, `communication_message` (dry-run rows only), safety gate.

## Out of scope

- Any live-send capability.
- SMS / letter channels (email only for now).
- Module adapter cutover — that is EPIC 4C.
- Deleting legacy notification tables.

## Sequence

1. Migration (RPCs + `token_metadata` column) — requires user approval.
2. Service layer + Zod schemas.
3. Wizard UI + entry points.
4. Seed script for the 3 events using the new service.
5. Verification + report.

## Estimated size

~15 new files, 4 edited files, 1 migration with 5 RPCs + 1 ALTER TABLE. All frontend + DB — no edge function changes.
