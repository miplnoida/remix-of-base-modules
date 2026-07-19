# BN Gap Modules — API Implementation Guide

## 1. Contract source of truth

`docs/bn/contracts/benefits-gap-api.openapi.yaml` is the SINGLE source of truth for the wire contract. Both the TypeScript adapter and the future ASP.NET Core controllers must conform to it.

## 2. Endpoint shape

**Today (Supabase):** `POST https://<project>.functions.supabase.co/bn-gap-command`
**Tomorrow (.NET):** `POST https://api.example.gov/bn/commands` (or per-module `/bn/{module}/commands`)

Body = `BnGapCommandEnvelope<TPayload>`
Response = `BnGapCommandResult<TData>`

## 3. Required headers

| Header             | Required | Notes                                                    |
| ------------------ | -------- | -------------------------------------------------------- |
| Authorization      | ✅       | Bearer JWT                                                |
| Content-Type       | ✅       | application/json; charset=utf-8                          |
| Idempotency-Key    | 🟡       | UUID; MUST match `envelope.idempotencyKey` if present    |
| X-Correlation-Id   | 🟡       | mirror of `envelope.correlationId` for infra tracing     |

## 4. Response status code mapping

| Envelope `status`  | HTTP  | Notes                                       |
| ------------------ | ----- | ------------------------------------------- |
| EXECUTED           | 200   | Success                                      |
| REPLAYED           | 200   | Idempotent replay                            |
| INVALID            | 400   | Envelope or payload validation failed        |
| DENIED             | 403   | Capability / rollout / role denial           |
| REJECTED           | 409   | Maker-checker / self-approval prevention     |
| CONFLICT           | 409   | Optimistic concurrency mismatch              |
| FAILED             | 500   | Handler-side failure, transaction rolled back |

## 5. Idempotency semantics

- Server stores the FIRST result for each `idempotencyKey`.
- Retries with the same key return the original result with `status = "REPLAYED"`.
- Retries under an existing key with a DIFFERENT payload return the original result — **retries must be exact**. The server MAY log a warning `IDEMPOTENCY_PAYLOAD_DRIFT`.
- Retention: minimum 7 days; recommended 30 days.

## 6. Optimistic concurrency

- Every mutable aggregate carries `row_version`.
- Callers pass the `expectedRowVersion` string they read.
- On mismatch: `CONFLICT` + current `entityVersion` returned so the client can re-fetch.

## 7. Error code taxonomy

All codes are stable strings and appear in `docs/bn/contracts/error-codes.md`. Selected examples:

| Code                          | Meaning                                                 |
| ----------------------------- | ------------------------------------------------------- |
| ENVELOPE_*                    | Structural envelope errors                              |
| MODULE_NOT_REGISTERED         | app_modules row missing                                 |
| MODULE_DISABLED               | `is_enabled = false`                                    |
| ROUTES_DISABLED               | `routes_enabled = false`                                |
| ACTIONS_DISABLED              | Dark-launch — mutation blocked                          |
| CAPABILITY_UNMAPPED           | Command has no capability mapping                       |
| CAPABILITY_DENIED             | Actor lacks the required capability                     |
| HANDLER_NOT_REGISTERED        | No handler for command/version                          |
| HANDLER_MODULE_MISMATCH       | Handler's module ≠ envelope moduleCode                  |
| VERSION_CONFLICT              | Optimistic concurrency lost                             |
| SELF_APPROVAL_FORBIDDEN       | Actor is also the proposer                              |
| INVALID_STATE_TRANSITION      | Command not permitted from current state                |
| HANDLER_FAILED                | Handler threw; transaction rolled back                  |

## 8. PII masking

- Request payloads are stored unmasked in `bn_gap_command_log` behind admin capability `bn_*:admin` reads.
- Response bodies are unmasked to the caller (they own the underlying record).
- Diagnostic surfaces (`GET /diagnostics/gap`) MUST use masked projections.

## 9. Client SDK guidance

- React consumers use hooks in `src/hooks/bn/<module>/` that call `BenefitsGapApiClient.executeCommand`.
- Do NOT call `supabase.from(...).insert / update / delete` for gap-module tables. This is enforced by `src/__tests__/bn/gap-modules/architectureNoDirectMutation.test.ts`.
- Hooks MUST provide their own `idempotencyKey` (crypto.randomUUID) — re-use it on retry.

## 10. Versioning

- Envelope carries `commandVersion` (integer ≥ 1).
- Additive payload changes: bump version, keep old handler alive during transition.
- Breaking changes are NEVER retro-applied; register a new handler at v2 and let clients migrate.
