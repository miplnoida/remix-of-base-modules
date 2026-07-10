# Communication Hub — Business Module Adapters (EPIC 4C)

## Purpose

Business modules (Legal, Insured Person, Benefits, Employer Registration,
Compliance, ...) must never call an email provider, template resolver, or
notification queue directly. They call a thin **module adapter** which delegates
to the canonical Communication Hub façade.

Canonical path (unchanged by EPIC 4C):

```
Module screen / service
  → src/modules/<module>/communication/<module>Communication.ts
    → src/platform/communication-hub/businessModuleCommunicationAdapter.ts
      → supabase.functions.invoke("comm-hub-event-pilot", { action: "dry_run", ... })
        → send_communication_v1 (test_mode = true)
          → comm-hub-dispatch (target-mode, provider stub "dry-run:")
```

Everything writes only to Communication Hub tables
(`communication_request`, `communication_message`,
`communication_delivery_attempt`, `communication_event_log`). No legacy tables
are touched.

## Safety rules (EPIC 4C phase)

- `testMode = true` — enforced client-side and server-side.
- `recipientEmail = rohit@mishainfotech.com` — hard-locked in
  `DRY_RUN_LOCKED_RECIPIENT`. Server rejects any other recipient in this phase.
- `channel = email` only.
- No cron, no bulk dispatch, no live-window, no manual live promotion.
- No writes to `notification_queue`, `notification_logs`,
  `bn_communication_log`, `ce_audit_communications`, `ce_notice_delivery_log`.
- No direct provider invocation.
- Server-provided tokens (`request_no`, `request_id`, `generated_at`,
  `module_code`, `event_code`) are stripped if a module tries to supply them.

## Adding a new module adapter

1. Ensure the event exists in
   `communication_hub_module_event_registry` and is mapped in
   `communication_hub_event_template_map` with an active template version.
   Use the **Event & Template Onboarding Wizard** if not yet mapped.
2. Create `src/modules/<module>/communication/<module>Communication.ts`.
3. Export one function per event. Each function must:
   - accept plain typed inputs (entity references + business tokens),
   - call `sendBusinessModuleCommunicationDryRun({...})`,
   - set `moduleCode`, `eventCode`, `entityType`, `entityId`, `referenceNo`,
     `tokens`, `reason`, `source`,
   - never set `testMode` (always dry-run in this epic),
   - never pass a recipient email (locked).
4. Register a card in
   `src/pages/admin/communicationHub/onboarding/ModuleAdapterTestsPage.tsx`
   so operators can exercise the adapter without touching a production
   module screen.
5. After a successful dry-run, update the registry `integration_status`
   note ("Adapter dry-run validated on YYYY-MM-DD"). Do **not** flip the
   event to `live_manual_only` — live promotion is a governance action.

## Operator validation

For every adapter dry-run, verify in:

- **Delivery Monitor** — row present, `test_mode=true`, recipient masked,
  `provider_message_id` starts with `dry-run:`.
- **Dispatch Register** — `request_no` visible, module/event correct,
  entity/reference populated, `template_version_id` visible.
- **Lifecycle Event Log** — expect `TEMPLATE_RESOLVED`,
  `TEMPLATE_RENDERED_AFTER_REQUEST_NO`, `MESSAGE_CREATED`, `MESSAGE_QUEUED`,
  `DISPATCH_STARTED`, and a dry-run `SENT` (or equivalent) event.
- **Request Detail** — rendered subject/body has no unrendered `{{tokens}}`.
- **Failed & Retry Queue** — nothing stuck.

## Live promotion (future epic)

Live promotion never happens from a module adapter or QA screen. It happens
through **Governance & Live Control** and only after:

- template legal review complete,
- explicit event live-control flip to `live_manual_only`,
- environment gates: `email_live_enabled=true`,
  `COMMUNICATION_HUB_EMAIL_LIVE` set, cron intentionally enabled,
- a typed live confirmation.

## Reference files

- `src/platform/communication-hub/businessModuleCommunicationAdapter.ts`
- `src/modules/legal/communication/legalCommunication.ts`
- `src/modules/insuredPerson/communication/insuredPersonCommunication.ts`
- `src/modules/benefits/communication/benefitsCommunication.ts`
- `src/modules/employerRegistration/communication/employerRegistrationCommunication.ts`
- `src/modules/compliance/communication/complianceCommunication.ts`
- `src/pages/admin/communicationHub/onboarding/ModuleAdapterTestsPage.tsx`
