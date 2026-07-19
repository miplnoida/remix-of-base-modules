# Command Envelope Contract

Every state-changing gap-module command carries this envelope. It is
transport-neutral and works over the current Supabase Edge Function as
well as the future ASP.NET Core `POST /commands/{commandName}`.

## Fields

| Field               | Type              | Required | Notes |
| ------------------- | ----------------- | -------- | ----- |
| `commandName`       | string            | ✅       | SCREAMING_SNAKE_CASE. Stable id. |
| `commandVersion`    | integer ≥ 1       | ✅       | Increment on breaking payload change. |
| `idempotencyKey`    | UUID              | ✅       | Replay-safe. Server caches result. |
| `correlationId`     | UUID              | ✅       | Propagates into logs & audit. |
| `causationId`       | UUID              |          | UUID of the event/command that produced this. |
| `moduleCode`        | enum (6 modules)  | ✅       | Must match `app_modules.name`. |
| `entityType`        | string            | ✅       | Table/aggregate name. |
| `entityId`          | UUID or `null`    | ✅       | `null` for creation commands. |
| `actorUserId`       | UUID              | ✅       | Server re-validates against JWT. |
| `actorUserCode`     | string            | ✅       | BN audit user_code. Never `SYSTEM`. |
| `actorRoles`        | string[]          | ✅       | Hint; server checks `role_permissions`. |
| `reasonCode`        | string            |          | Business reason (audited). |
| `justification`     | string            |          | Free text (audited). |
| `expectedRowVersion`| string            |          | Optimistic-concurrency token. |
| `requestedAtUtc`    | ISO-8601 UTC      | ✅       |  |
| `payload`           | object            | ✅       | Handler-specific. |

## Trust boundary

**The wire is untrusted.** The pipeline re-validates every field, ignores
`actorRoles` for authorisation (uses `role_permissions`), and never trusts
`actorUserId` alone — it must match the JWT subject at the edge.

## Idempotency

The server keeps the first result for each `idempotencyKey` and returns
it with `status = "REPLAYED"` on retry. A different payload sent under
an existing key returns the original result — retries must be exact.
