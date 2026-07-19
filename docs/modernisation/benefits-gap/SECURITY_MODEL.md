# BN Gap Modules — Security Model

## Trust boundary

**The wire is untrusted.** Every field in `BnGapCommandEnvelope` is re-validated at the server. The client-supplied `actorRoles` are treated as a HINT only — authorisation always walks `role_permissions` on the server side.

## Authentication

- JWT bearer (Supabase Auth today; identical IDP scheme in .NET tomorrow).
- `envelope.actorUserId` MUST match the token subject at the edge; mismatches are rejected with 401.
- No anonymous / service-role commands from browsers.

## Authorisation

- Every command has EXACTLY ONE required capability (`gapCapabilityRegistry`).
- Capability check is server-side and fail-closed (`CAPABILITY_DENIED`).
- Route access (`route_security_config`) is orthogonal and additive.
- The `RoleCapabilityChecker` implementation MUST be transaction-consistent with the audit write to prevent race-condition privilege escalation.

## Maker-Checker

- Handlers that mutate financial state or produce official decisions declare `requiresMakerChecker: true`.
- The pipeline runs `handler.approvalCheck` BEFORE any mutation; self-approval attempts return `REJECTED` with `SELF_APPROVAL_FORBIDDEN`.
- Approval identity is captured in the audit row.

## Idempotency & concurrency

- Idempotency store MUST have UNIQUE constraint on `idempotency_key`.
- Optimistic concurrency: `expectedRowVersion` compared under transaction; mismatch → `CONFLICT`.

## PII handling

- `ip_master` is READ-ONLY from gap modules.
- Command payloads MAY contain PII; storage is behind `<module>:admin` capability + PII-masking middleware for diagnostic views.
- Response bodies unmask to the caller (data owner) only.
- Logs and telemetry sinks scrub PII by allowlist.

## Rate limiting

- Per (actorUserId, moduleCode). Defaults: 60 rpm for `:write`, 10 rpm for `:decide`, 2 rpm for `:admin`.
- Rate limiter breaches return HTTP 429 with `Retry-After`; the envelope status is NOT `EXECUTED`.

## Audit

- Every command produces exactly one row in `system_audit_trail` via `AuditWriter`.
- Audit rows capture: correlation_id, command_id, actor, before/after JSON, outcome, reason code.
- No update or delete on audit rows (enforced by trigger).

## RLS policy (project-wide)

This project uses **application-layer authorisation only**; RLS is disabled by policy (see `docs/ARCHITECTURE-NO-RLS-RULE.md`). The gap modules honour that decision: authorisation is enforced by the pipeline + capability registry + edge function, never by RLS policies on `bn_appeal*` tables.

## Secrets

- Supabase publishable / anon key is the only client-side key.
- Service-role key is never exposed; edge functions use it internally.
- No .env value is ever read from a browser bundle for gap modules.

## Threat model highlights

| Threat                                    | Mitigation                                                 |
| ----------------------------------------- | ---------------------------------------------------------- |
| Replay of an expired command              | idempotency + JWT `exp` at edge                             |
| Privilege escalation via `actorRoles`     | Server ignores it; walks `role_permissions`                 |
| Self-approval                             | `approvalCheck` in pipeline                                 |
| Direct DB mutation from browser           | Architecture test + REST client is anon key only            |
| Cross-tenant leak                         | All lookups scope by `country_code` / `organization_id`     |
| Audit tampering                           | INSTEAD OF triggers on audit tables                         |
