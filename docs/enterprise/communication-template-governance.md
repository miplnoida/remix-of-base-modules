# OM-9.7.6 — Communication Template Governance

This document describes the governed communication-template foundation that
every business module in the platform must consume from. It supersedes any
ad-hoc per-module letter, notice, email, or SMS logic.

## Golden rule

> Business modules **do not** query `comm_media_asset`, `comm_letterhead`,
> `core_template*`, `notification_templates`, `comm_email_signature`,
> `comm_disclaimer`, `comm_print_footer`, or `core_text_block` directly at
> runtime. They call the canonical resolver with business context and
> receive an effective render context.

## Canonical resolver

`src/lib/comm/businessCommunicationResolver.ts`

| Method | Purpose |
|---|---|
| `resolveBusinessCommunicationContext(input)`         | Compose effective settings + resolved template + assets + warnings. |
| `resolveTemplateForBusinessEvent(input)`             | Resolve DOCUMENT (or specified channel) template for a business event. |
| `resolveNotificationTemplateForBusinessEvent(input)` | Resolve EMAIL / SMS / IN_APP / PORTAL template for a business event. |
| `validateTemplateTokens(body, required?)`            | Static token validation using the token catalogue. |
| `previewBusinessCommunication(input)`                | Non-destructive preview of the render context. |
| `runCommunicationTemplateHealth()`                   | Run the template health scan over the seeded catalogue. |

Input shape:

```ts
{
  moduleCode:         'EMPLOYER' | 'INSURED_PERSON' | 'CONTRIBUTIONS' | 'BENEFITS' | ...,
  businessEventCode:  string,          // from the business-event catalogue
  departmentCode?:    string | null,
  workflowCode?:      string | null,
  workflowStageCode?: string | null,
  languageCode?:      string | null,   // defaults to org language
  channel?:           string | null,   // DOCUMENT | EMAIL | SMS | IN_APP | PORTAL | PDF | PRINT
  templateCode?:      string | null,   // explicit override; audited
  ...perTransactionOverrides
}
```

The resolver composes:

1. `resolveEffectiveSettingsBundle` — org → module → department → location
   inheritance (letterhead, signature, disclaimer, footer, default template,
   etc.).
2. `coreTemplateResolverService.resolveRenderContext` — template body,
   version, layout, and channel-aware sub-blocks.
3. `assetSelectionPolicy.evaluateSelectableAsset` — approved / active /
   in-window brand assets only (OM-9.7.5).

## Seed catalogues

Delivered under `src/platform/comm-template-governance/`:

| File | Contents |
|---|---|
| `businessEventCatalogue.ts` | ~60 canonical business events across 9 SSB modules. |
| `tokenCatalogue.ts`         | ~65 tokens across 12 categories, with sample values. |
| `textBlockCatalogue.ts`     | 13 reusable text blocks (contact, disclaimer, footer, etc.). |
| `templateSeedCatalogue.ts`  | Starter DOCUMENT / EMAIL / SMS / IN_APP templates for key events. |
| `communicationTemplateHealth.ts` | Non-mutating health scan + severity codes. |

## Business event naming convention

`MODULE_SUBJECT_ACTION`, uppercase, underscores. Examples:

- `EMPLOYER_REGISTRATION_APPROVED`
- `BENEFIT_CLAIM_APPROVED`
- `WORKFLOW_TASK_ASSIGNED`
- `PAYMENT_RECEIPT`

Naming is enforced by convention. Add new events to
`businessEventCatalogue.ts`.

## Token catalogue

Token keys use dot-notation: `{{organization.name}}`, `{{recipient.name}}`,
`{{claim.number}}`, `{{workflow.taskName}}`. `validateTemplateTokens` returns
`unknownTokens` for anything not in the catalogue and `missingRequired` for
tokens declared as required on a template but not present in the body.

## Reference groups seeded

`COMM_TEMPLATE_TYPE`, `COMM_TEMPLATE_STATUS`, `COMM_TEMPLATE_CATEGORY`,
`COMM_BUSINESS_EVENT`, `COMM_RECIPIENT_TYPE`, `COMM_OUTPUT_CHANNEL`,
`COMM_LANGUAGE`, `COMM_TOKEN_CATEGORY`, `COMM_TEMPLATE_HEALTH_STATUS`,
`COMM_TEMPLATE_APPROVAL_POLICY`, `COMM_TEMPLATE_RENDER_CONTEXT`,
`COMM_MESSAGE_PRIORITY`, `COMM_DELIVERY_PURPOSE`,
`COMM_RENDER_WARNING_TYPE`, `COMM_TEMPLATE_ASSIGNMENT_SCOPE`.

## Health check codes

`COMM_TEMPLATE_NO_BUSINESS_EVENT`, `COMM_TEMPLATE_NO_CHANNEL`,
`COMM_TEMPLATE_NO_RECIPIENT_TYPE`, `COMM_TEMPLATE_UNKNOWN_TOKEN`,
`COMM_TEMPLATE_MISSING_REQUIRED_TOKEN`, `COMM_TEMPLATE_INACTIVE`,
`COMM_TEMPLATE_EXPIRED`, `COMM_TEMPLATE_NO_EFFECTIVE_LETTERHEAD`,
`COMM_TEMPLATE_NO_EFFECTIVE_SIGNATURE`,
`COMM_TEMPLATE_NO_EFFECTIVE_DISCLAIMER`,
`COMM_TEMPLATE_NO_EFFECTIVE_PRINT_FOOTER`,
`COMM_TEMPLATE_UNAPPROVED_ASSET`, `COMM_TEMPLATE_INACTIVE_ASSET`,
`COMM_TEMPLATE_EXPIRED_ASSET`,
`COMM_TEMPLATE_RENDER_CONTEXT_MISSING_SOURCE_TRACE`,
`COMM_BUSINESS_EVENT_NO_DEFAULT_TEMPLATE`,
`COMM_BUSINESS_MODULE_BYPASSES_RESOLVER`,
`COMM_NOTIFICATION_TEMPLATE_DISABLED`,
`COMM_EMAIL_TEMPLATE_NO_HEADER`, `COMM_EMAIL_TEMPLATE_NO_FOOTER`,
`COMM_WAIVER_MIGRATE_NOW_REMAINING`.

Severity is one of `OK | INFO | WARNING | BLOCKER`.

## Permissions

Seeded under `core.admin.template_management.*`:
`manage_templates`, `manage_notification_templates`, `manage_text_blocks`,
`manage_tokens`, `view_render_health`, `run_render_health`,
`export_render_health`, `seed_system_templates`. All are platform / admin
scoped and default to Admin and Application Admin.

## Audit events

Seeded under `core_audit_event_type` with domain `COMMUNICATION`:
`COMM_TEMPLATE_SEED_CATALOGUE_CREATED`, `COMM_TEMPLATE_CREATED`,
`COMM_TEMPLATE_UPDATED`, `COMM_TEMPLATE_DEACTIVATED`,
`COMM_TEMPLATE_REACTIVATED`, `COMM_TEMPLATE_VERSION_CREATED`,
`COMM_TEMPLATE_TOKEN_VALIDATION_RUN`,
`COMM_TEMPLATE_RENDER_PREVIEWED`, `COMM_TEMPLATE_OUTPUT_GENERATED`,
`COMM_TEMPLATE_RENDER_BLOCKED`, `COMM_RENDER_CONTEXT_RESOLVED`,
`COMM_RENDER_CONTEXT_HEALTH_CHECK_RUN`,
`COMM_RENDER_CONTEXT_EXPORT_CREATED`,
`COMM_BUSINESS_EVENT_TEMPLATE_ASSIGNED`,
`COMM_BUSINESS_EVENT_TEMPLATE_UNASSIGNED`,
`COMM_BUSINESS_MODULE_RESOLVER_BYPASS_DETECTED`,
`COMM_DIRECT_READ_WAIVER_BURNDOWN_UPDATED`,
`COMM_TEMPLATE_GOVERNANCE_VERIFIED`.

## Department override

The resolver honours the OM-9.7.4 department override model. Set a
`core_configuration_assignment` at DEPARTMENT scope for the same
`resource_type` (letterhead / signature / disclaimer / default template) —
the resolver will prefer the department value over the module or org
default. Removing the assignment resets to the module/org effective value.

## Asset approval

Only assets that pass `assetSelectionPolicy.evaluateSelectableAsset` (active,
approved, within effective window) are usable in official output. Draft or
rejected assets are surfaced as `COMM_TEMPLATE_UNAPPROVED_ASSET` warnings
and are never rendered in the letterhead.

## Direct-read waiver policy

See `docs/enterprise/comm-direct-read-waiver-burndown.md`. During
OM-9.7.6 the waiver classification was refreshed. No new blockers or
undocumented waivers were introduced. `bun run lint:comm-governance` exits
`0`.

## Release readiness

`checkCommunicationTemplateGovernance` in
`src/platform/release-readiness/checks.ts` verifies:

1. reference groups exist
2. audit events are seeded
3. health scan has 0 blockers
4. attestation for `COMMUNICATION_TEMPLATE_GOVERNANCE` exists

The attestation is recorded as part of the OM-9.7.6 seed migration.

---

## OM-9.7.7 update — Runtime cutover

The runtime notification path now goes through a single canonical wrapper:

`src/lib/comm/notificationDispatchResolver.ts`

- `resolveNotificationForTriggerEvent({ triggerEvent, moduleCode, channel, ... })` — resolves a template subject/body via `resolveNotificationTemplateForBusinessEvent` first; falls back to the legacy `notification_templates` row only inside this allow-listed canonical file.
- `dispatchInAppNotification({ ..., recipientIds, variables, notificationType, module })` — resolves, renders `{{token}}` placeholders, writes `system_notifications`, and logs a `system_business_events` audit row.
- `renderNotificationText(text, vars)` — shared `{{token}}` interpolator.

### Runtime callers migrated in OM-9.7.7

- `src/services/auditPublicSubmissionNotifyService.ts`
- `src/services/iaNotificationService.ts`
- `src/services/compliance/planExceptionNotifier.ts`

These files no longer perform any direct read of `notification_templates`.

### How future modules should consume the resolver

1. **Notifications (in-app / email / SMS / portal):**
   ```ts
   import { dispatchInAppNotification } from '@/lib/comm/notificationDispatchResolver';
   await dispatchInAppNotification({
     triggerEvent: 'employer_registration_approved',
     moduleCode: 'EMPLOYER',
     channel: 'IN_APP',
     recipientIds: [userId],
     variables: { employerName },
     entityId: employerId,
     entityType: 'employer',
     notificationType: 'employer',
     module: 'employer',
   });
   ```

2. **Documents / letters / notices:**
   ```ts
   import { resolveBusinessCommunicationContext } from '@/lib/comm/businessCommunicationResolver';
   const ctx = await resolveBusinessCommunicationContext({
     moduleCode: 'LEGAL',
     businessEventCode: 'legal_notice_issued',
     departmentCode,
     languageCode: 'en',
     channel: 'DOCUMENT',
   });
   // Use ctx.render.body + ctx.effective (letterhead, signature, disclaimer, …).
   ```

3. **Explicit template override (rare, audited):** pass `templateCode` on either call.

### Waiver status

- Direct-read lint (`bun run lint:comm-governance`) exits 0.
- Runtime bypass blockers: 0.
- Runtime bypass warnings: 44 (was 47).
- MIGRATE_NOW backlog: 5 files, all pinned to OM-9.7.8 module cutovers with written reasons — see `docs/enterprise/comm-direct-read-waiver-burndown.md`.

Attestation: `OM-9.7.7 / RUNTIME_COMMUNICATION_RESOLVER_CUTOVER` — 3/8 runtime notification callers migrated; remaining callers documented and scheduled.
