# Command Error Codes

All codes are stable; wire messages are safe to display to end users.

## Envelope / validation (`status = INVALID`)

| Code | Meaning |
| --- | --- |
| `ENVELOPE_MISSING` | No envelope supplied. |
| `ENVELOPE_COMMAND_NAME` | `commandName` missing/blank. |
| `ENVELOPE_COMMAND_VERSION` | Non-integer or < 1. |
| `ENVELOPE_IDEMPOTENCY_KEY` | Not a UUID. |
| `ENVELOPE_CORRELATION_ID` | Not a UUID. |
| `ENVELOPE_MODULE_CODE` | Not one of the six registered modules. |
| `ENVELOPE_ENTITY_TYPE` | Missing. |
| `ENVELOPE_ENTITY_ID` | Neither UUID nor null. |
| `ENVELOPE_ACTOR_USER_ID` | Missing. |
| `ENVELOPE_ACTOR_USER_CODE` | Missing or one of the forbidden sentinels. |
| `ENVELOPE_ACTOR_ROLES` | Not an array. |
| `ENVELOPE_REQUESTED_AT` | Not ISO-8601. |

Per-handler payload codes are documented alongside the handler.

## Authorisation / rollout (`status = DENIED`)

| Code | Meaning |
| --- | --- |
| `MODULE_NOT_REGISTERED` | `app_modules.name` row missing. |
| `MODULE_DISABLED` | `is_enabled = false`. |
| `ROUTES_DISABLED` | `routes_enabled = false`. |
| `ACTIONS_DISABLED` | `actions_enabled = false` (mutation dark launch). |
| `CAPABILITY_UNMAPPED` | Command has no capability mapping. |
| `CAPABILITY_DENIED` | Actor lacks the required capability. |
| `HANDLER_NOT_REGISTERED` | No handler for `(commandName, commandVersion)`. |
| `HANDLER_MODULE_MISMATCH` | Handler module ≠ envelope module. |

## Concurrency / consistency

| Code | Status | Meaning |
| --- | --- | --- |
| `VERSION_CONFLICT` | `CONFLICT` | `expectedRowVersion` stale. |

## Business / rejection

| Code | Status | Meaning |
| --- | --- | --- |
| `SELF_APPROVAL_FORBIDDEN` | `REJECTED` | Approver = requester. |
| `MAKER_CHECKER_REQUIRED` | `REJECTED` | Missing checker for this action. |
| (handler-specific) | `REJECTED` | See handler docs. |

## Execution

| Code | Status | Meaning |
| --- | --- | --- |
| `HANDLER_FAILED` | `FAILED` | Handler exception; transaction rolled back. |
| `TRANSPORT_FAILURE` | `FAILED` | Client-side network failure. |
