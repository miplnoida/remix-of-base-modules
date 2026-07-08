# Business Module Settings Consumption (Epic BM-SET-1)

Every business module (Employer, Insured Person, Contributions, Benefits,
Compliance, Legal, Finance, Reporting, …) must consume organisation,
department, template, communication, workflow, and governance settings
through the **central business-module settings service**.

## Golden rule

> Business modules must **not** read `core_organization`, `core_department_profile`,
> `comm_letterhead`, `comm_email_signature`, `comm_disclaimer`,
> `comm_print_footer`, `notification_templates`, or `core_configuration_assignment`
> tables directly. Use the central business settings service.

Doing so preserves the OM-6 inheritance model, the OM-9.7.4 business
communication resolver, and the Department Profile "Effective Preview" tab.
It also guarantees every module receives the same source labels, warnings,
health status, and audit trail.

## Which resolver to use

| I need…                                              | Call                                                        |
| ---------------------------------------------------- | ----------------------------------------------------------- |
| Effective letterhead / signature / language / etc.   | `resolveRelevantSettingsForModule(context)`                  |
| Same as above + verify required keys                 | `resolveRequiredSettingsForBusinessEvent(ctx, keys)`         |
| Render a document / notice / email / SMS / PDF       | `resolveBusinessModuleCommunicationContext(input)`           |
| Non-destructive preview of the above                 | `previewBusinessModuleCommunication(input)`                  |
| Verify readiness before an action                    | `validateBusinessModuleSettingsReadiness(ctx, keys?)`        |
| React hooks                                          | `useRelevantSettingsForModule`, `useBusinessModuleCommunicationContext`, `useBusinessModuleSettingsReadiness` |

All the above live in `@/platform/business-settings`.

## Required context fields

```ts
interface BusinessModuleSettingsContext {
  moduleCode: string;               // EMPLOYER | INSURED_PERSON | ...
  departmentCode?: string | null;
  locationId?: string | null;
  businessEventCode?: string | null;
  workflowCode?: string | null;
  workflowStageCode?: string | null;
  userId?: string | null;
  organizationId?: string | null;
  languageCode?: string | null;
  recipientType?: string | null;
  channel?: string | null;
  country?: string | null;
}
```

`moduleCode` is required. `businessEventCode` should be supplied whenever
the setting depends on an event (e.g. `EMPLOYER_REGISTRATION_APPROVED`).

## Scope precedence

The service delegates to the canonical resolver, which respects the
platform-wide precedence chain:

```
USER > WORKFLOW_STAGE > WORKFLOW > LOCATION > DEPARTMENT > MODULE > ORG > GLOBAL
```

Do not implement a competing precedence model inside a business module.

## Business events

Required settings per business event live in
`businessEventSettingsRegistry.ts`. Example:

```
EMPLOYER_REGISTRATION_APPROVED:
  requiredSettings:
    - default_document_template
    - default_letterhead
    - default_disclaimer
    - default_print_footer
    - default_output_channel
    - default_retention_policy
```

Register new events there — never hardcode required keys inside a module.

## Preview & explicit template overrides

To preview a communication:

```ts
const preview = await previewBusinessModuleCommunication({
  moduleCode: 'EMPLOYER',
  departmentCode,
  businessEventCode: 'EMPLOYER_REGISTRATION_APPROVED',
  recipientType: 'EMPLOYER',
  channel: 'DOCUMENT',
});
```

Passing `templateCode` is allowed but flagged as `templateSource: 'EXPLICIT'`
and audited via `BUSINESS_COMMUNICATION_TEMPLATE_OVERRIDE_USED`.

## Handling warnings & missing settings

Every response includes `warnings`, `missingRequiredSettings`, and
`healthStatus`. Recommended UX:

- `MISSING` → block the action and show
  *"This action cannot generate the communication because the required
  template setting is missing."*
- `WARN` → allow the action but show
  *"Communication settings have warnings. Please review before final generation."*
- `ERROR` → block and log; likely a conflicting inheritance flag.

Use `sourceLabel` (e.g. *Department Override*, *Organization Default*) in
the UI — never raw table names.

## What not to do

- ❌ Query `core_department_profile`, `comm_letterhead`, or
  `core_configuration_assignment` from a business module.
- ❌ Re-implement inheritance logic per module.
- ❌ Hardcode template IDs; always pass `businessEventCode` and let the
  resolver pick the effective template.
- ❌ Invent a new response shape — use `BusinessModuleRelevantSettings`.

## Employer example

See `src/platform/business-settings/examples/employerSettingsExample.ts`.
Copy this shape for future modules — it is a thin adapter that only forwards
to the central service, with zero raw-table access.

```ts
const settings = await resolveEmployerRelevantSettings({
  departmentCode,
  businessEventCode: 'EMPLOYER_REGISTRATION_APPROVED',
  languageCode: 'en',
  channel: 'DOCUMENT',
});

const communication = await resolveEmployerCommunicationContext({
  departmentCode,
  businessEventCode: 'EMPLOYER_REGISTRATION_APPROVED',
  recipientType: 'EMPLOYER',
  channel: 'DOCUMENT',
});
```

## Audit events

Emitted by the service (best-effort):

- `BUSINESS_MODULE_SETTINGS_RESOLVED`
- `BUSINESS_MODULE_SETTINGS_PREVIEWED`
- `BUSINESS_MODULE_SETTINGS_READINESS_CHECKED`
- `BUSINESS_COMMUNICATION_CONTEXT_RESOLVED`
- `BUSINESS_COMMUNICATION_CONTEXT_FAILED`
- `BUSINESS_COMMUNICATION_TEMPLATE_OVERRIDE_USED`
- `BUSINESS_COMMUNICATION_MISSING_REQUIRED_SETTING`

Seed these into `core_audit_event_type` when introducing a related admin UI.

## Release readiness

The `checkBusinessModuleSettingsConsumption` check runs as part of
`runAllChecks(...)` and verifies:

- Central service and registry files are importable.
- Employer example adapter exists.
- Every required setting key is a known `SETTING_KEYS` entry.
- Audit events are seeded (best-effort).
