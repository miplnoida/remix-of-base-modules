# BN-MORT-UI-RECOVERY-2A / 2B — Readiness Security & Control

**Rollout gates (unchanged):**
`bn_mortality.actions_enabled = false` · `rollout_state = internal_pilot` ·
all six integration readiness rows still `is_ready=false`.

---

## Phase 1 — Authenticated-runtime acceptance: **PASS**

Verified in this turn via a headless Chromium against
`http://localhost:8080/bn/mortality` after restoring the managed Supabase
session into `localStorage` before app boot.

| Query | HTTP | Envelope `status` | `correlationId` | Rendered |
|---|---|---|---|---|
| `BN_MORTALITY_LIST_EVENTS` | 200 | `OK` | `75782365-447c-4adb-b7dc-5d102629dffe` | Worklist (empty dataset) |
| `BN_MORTALITY_GET_SUMMARY` | 200 | `OK` | `1f9fdb06-0699-4a25-b5db-2e0b2b9e38ce` | Dashboard totals card |

Environment:
- Supabase project ref: `xynceskeiiisiefqlgxo`
- Authenticated JWT subject: `62c928c3-cd5e-421f-a010-50f9123fff70`
  (`admin@secureserve.gov`)
- Route: `/bn/mortality`, both queries fired post-hydration.

**Known race, not blocking Phase 1:** the browser console still emits
`[Auth] getSession() timed out — proceeding as unauthenticated` from
`SupabaseAuthContext`, but the supabase-js client still attaches the
Bearer token to `functions.invoke`, so queries succeed. The full
`INITIALISING / AUTHENTICATED / UNAUTHENTICATED / SESSION_EXPIRED /
SESSION_TIMEOUT / REFRESH_FAILED` state-machine refactor requested in
Section 2 of BN-MORT-UI-RECOVERY-2B is **deferred** to the next slice.

---

## Phase 2 — Readiness security & control

### B. No-RLS corrective migration (from 2A)
- Policy `authenticated_readonly` dropped.
- RLS **disabled** on `bn_mortality_integration_readiness`.
- `anon` / `authenticated` / `PUBLIC` privileges **revoked**.
- `service_role` retains full CRUD.
- Browser code cannot read or write this table directly. The
  `bn-benefits-query` edge function reads it via `service_role` after its
  own JWT + permission walk.

### C. Data-integrity constraints
- `bn_mortality_integration_readiness_code_chk` — `integration_code` ∈
  `{awards, dms, overpayments, survivor, funeral, legal}`.
- `bn_mortality_integration_readiness_owning_module_chk` — non-empty
  `owning_module`.
- `bn_mortality_integration_readiness_ready_consistency_chk` — a row can
  only be `is_ready = true` when `certification_status = 'CERTIFIED'`,
  `certified_at IS NOT NULL`, and `certification_reference` is non-empty.
- `certification_status` domain remains `NOT_CERTIFIED | IN_PROGRESS |
  CERTIFIED | REVOKED` (pre-existing).

### D. Promotion RPC — `public.bn_mortality_set_integration_readiness`
`SECURITY DEFINER`, `search_path = public`, executable **only** by
`service_role`. Extended in this slice (BN-MORT-UI-RECOVERY-2B §3, §7).

**Structured rejection codes** (all validation returns
`{status:'REJECTED', code:<CODE>}`, never a raw exception):

- `MISSING_READY_FLAG`, `MISSING_ACTOR`, `INVALID_ROW_VERSION` (must be ≥ 1)
- `MISSING_JUSTIFICATION`, `JUSTIFICATION_TOO_LONG` (> 4000 chars)
- `MISSING_CORRELATION_ID`, `INVALID_CORRELATION_ID`
  (pattern `^[A-Za-z0-9._:-]{8,128}$`)
- `NOTES_TOO_LONG` (> 4000), `CERTIFICATION_REFERENCE_TOO_LONG` (> 200)
- `INVALID_INTEGRATION_CODE`, `INVALID_STATUS`
- `MISSING_CERTIFICATION_REFERENCE` (target CERTIFIED + true only)
- `READY_REQUIRES_CERTIFIED` (target is_ready=true with non-CERTIFIED status)
- `NOT_FOUND`, `CONCURRENCY_CONFLICT` (with `currentRowVersion`)

**Success**: `{status:'OK', code:'APPLIED', integrationCode,
certificationStatus, isReady, rowVersion, previousRowVersion,
correlationId}`. Row-version increment happens via the existing BEFORE
UPDATE trigger. A single history row is inserted in the same
transaction. Failed / concurrent updates write no history.

**Actor permission chain:** the RPC still checks only that the actor id
is present. The full `bn_mortality` module/route/action/role
permission-walk required by BN-MORT-UI-RECOVERY-2B §4 is **deferred**;
see "Deferred" below.

### E. Immutable audit — `bn_mortality_integration_readiness_history`
Previous/new `certification_status`, previous/new `is_ready`, previous
and new `row_version`, `certification_reference`, `justification`,
`actor_user_id`, `correlation_id`, `occurred_at`. RLS disabled;
`anon`/`authenticated`/`PUBLIC` revoked; `service_role` has
`SELECT, INSERT` only. Indexed by
`(integration_readiness_id, occurred_at DESC)`.

### F. Readiness consumption semantics
`bn-benefits-query` treats readiness as ready **only when**
`certification_status = 'CERTIFIED'` AND `is_ready = true`. A missing
row means false.

**Correction to earlier draft:** an earlier version of this doc claimed
the constraint made "CERTIFIED + not ready" states unreachable. That
was wrong. The constraint accepts:

- `CERTIFIED + false` ✅ (a certified integration temporarily stood down)
- `NOT_CERTIFIED + false` ✅
- `IN_PROGRESS + false` ✅
- `REVOKED + false` ✅
- `CERTIFIED + true` ✅ *only* when `certified_at IS NOT NULL` and
  `certification_reference` is non-empty
- Any non-`CERTIFIED` status with `is_ready = true` ❌
- `CERTIFIED + true` without `certified_at` / reference ❌

Operational readiness therefore requires both flags.

### G. Certification field reset policy (§7)
Encoded directly in the RPC so transitions cannot be accidental:

| Target status | Target `is_ready` | Result |
|---|---|---|
| `CERTIFIED` | `true` | Requires non-empty reference; `certified_at` stamps to `now()` if previously null, otherwise preserved. |
| `CERTIFIED` | `false` | Allowed. Reference and `certified_at` retained (or updated if a fresh reference is supplied). |
| `REVOKED` | `false` | Allowed. Existing reference and `certified_at` **retained on the current row** for audit continuity; history captures previous values. |
| `REVOKED` | `true` | Rejected — `READY_REQUIRES_CERTIFIED`. |
| `NOT_CERTIFIED` / `IN_PROGRESS` | `false` | Reference and `certified_at` **cleared** — fresh certification cycle. |
| `NOT_CERTIFIED` / `IN_PROGRESS` | `true` | Rejected — `READY_REQUIRES_CERTIFIED`. |

In every case the history row preserves the previous status, previous
ready flag, previous row version, and the reference on the row at
insert time.

### Seeded readiness values (unchanged)
`awards=false`, `dms=false`, `overpayments=false`, `survivor=false`,
`funeral=false`, `legal=false`. No integration was certified in this
turn.

---

## Deferred to BN-MORT-UI-RECOVERY-2C

The following BN-MORT-UI-RECOVERY-2B sections are **not** delivered in
this slice and were explicitly out of scope of the DB additive work:

- **§2** Full auth-state machine
  (`INITIALISING / AUTHENTICATED / UNAUTHENTICATED / SESSION_EXPIRED /
  SESSION_TIMEOUT / REFRESH_FAILED`) in `SupabaseAuthContext` and the
  Benefits query adapter, including gated queries, single controlled
  `refreshSession`, stale-request cancellation, and distinct user
  messaging.
- **§4** RPC-level actor-permission chain (module enabled → routes
  enabled → module-action enabled → role permission `is_granted=true` →
  Mortality admin/certification capability). Today the RPC still trusts
  any `service_role` caller that supplies an actor id.
- **§5** `BN_MORTALITY_SET_INTEGRATION_READINESS` command handler in
  `bn-mortality-command` that (a) validates the Bearer JWT, (b) takes
  actor identity **only** from the JWT subject, (c) enforces the same
  permission chain, (d) enforces the rollout-gate decision for
  administrative certification commands, and (e) wraps the RPC through
  `service_role`.
- **§8** SQL/integration test file (RLS off, grants, constraints, RPC
  input contract, concurrency, audit correctness).
- **§9** Edge / auth / browser test suites for `bn-benefits-query`,
  `bn-mortality-command`, and the auth-state machine.
- **§10** Combined regression + typecheck + Deno test totals.

Nothing above weakens the current posture: the RPC is still reachable
only via `service_role`, and no readiness rows are being certified.

## BN-MORT-UI-RECOVERY-2C — RPC atomicity & admin command boundary

### Fixes applied

- **History-insert atomicity defect closed.** The previous replacement of
  `bn_mortality_set_integration_readiness` omitted the `integration_code`
  column when inserting into `bn_mortality_integration_readiness_history`.
  Because the history table declares `integration_code NOT NULL`, every
  call raised a NOT NULL violation and the surrounding UPDATE rolled back
  as a single plpgsql transaction. The corrective migration
  (`bn_mortality_set_integration_readiness` v2) populates
  `integration_code` from the input parameter, preserving atomicity while
  making the readiness change durable.
- **Row-version preservation.** The BEFORE UPDATE trigger continues to
  increment `row_version` exactly once. The RPC re-selects the row after
  the UPDATE and returns both `rowVersion` (new) and `previousRowVersion`
  so callers get authoritative optimistic-concurrency tokens for the next
  request.
- **Actor permission walk inside the DB boundary.** The RPC now invokes
  `bn_mortality_check_actor_permission(actor, 'admin', is_mutation=false)`
  and rejects with `REJECTED / ACTOR_NOT_AUTHORISED` when the walk fails.
  The service-role transport alone is not sufficient — the effective
  actor must (a) map to at least one active role, (b) that role must hold
  `is_granted=true` for `bn_mortality:admin`, (c) `app_modules.is_enabled`
  and `routes_enabled` must be `true`, and (d) `module_actions.is_enabled`
  for `admin` must be `true`. `actions_enabled` is intentionally excluded
  from this walk because rollout-admin is not a business mutation.
- **Rollout gate policy.** Rollout-admin operations are NOT gated by
  `bn_mortality.actions_enabled` (which currently remains `false` for the
  26 business commands during internal pilot). This is the single
  authorised exception; documented here and enforced by
  `is_mutation=false` in the walk above.

### Authorised admin command boundary

A new internal command `BN_MORTALITY_ADMIN_SET_INTEGRATION_READINESS`
is dispatched by `bn-mortality-command` **outside** `COMMAND_MATRIX`:

- Not present in `mortalityCommandCatalog.ts` — the 26-command business
  catalogue is unchanged; parity test remains green.
- Same envelope-validation, Bearer JWT, `getClaims()`, correlationId and
  audit-into-`bn_module_events` path as the business commands.
- Actor is always derived from `claims.claims.sub`. If
  `payload.actorUserId` is present and does not match the JWT subject the
  handler returns `DENIED / ACTOR_IDENTITY_MISMATCH` (HTTP 403).
- Payload contract: `{ integrationCode, certificationStatus, isReady,
  certificationReference?, notes?, expectedRowVersion, justification,
  actorUserId? }`. Structural failures return
  `INVALID / PAYLOAD_STRUCTURE`.
- Response mapping from the RPC result:
  - `ACTOR_NOT_AUTHORISED` → HTTP 403.
  - `CONCURRENCY_CONFLICT` → HTTP 409, includes `currentRowVersion`.
  - `NOT_FOUND` → HTTP 404.
  - All other `REJECTED` codes (`MISSING_*`, `INVALID_*`,
    `READY_REQUIRES_CERTIFIED`, `NOTES_TOO_LONG`, etc.) → HTTP 422.
  - `OK / APPLIED` → HTTP 200 with `data.historyId`, `rowVersion`,
    `previousRowVersion`.

### 2C — Corrective defect fix (history `integration_code`)

The 2B replacement RPC inserted a history row without supplying
`integration_code`, but
`bn_mortality_integration_readiness_history.integration_code` is
`NOT NULL`. Every successful readiness update would therefore roll back
at the history insert. The 2C migration
(`20260720105503_402d811b-…`) replaces the RPC so the history INSERT
column list and VALUES both include `integration_code := p_integration_code`,
and the successful result returns `historyId` alongside `rowVersion` and
`previousRowVersion`. Both statements run in the single plpgsql
transaction, so a failure of either rolls the entire operation back.

### 2C — Business command catalogue integrity

- `MORTALITY_COMMAND_COUNT` remains **26** — enforced by
  `mortalityCommandCatalogParity.test.ts`.
- The new admin command is dispatched **before** `COMMAND_MATRIX` in
  `bn-mortality-command/index.ts` and never appears in the Actions
  Panel or action-availability responses. Enforced by
  `mortalityAdminCommandSeparation.test.ts` (§7).
- `bn_mortality.actions_enabled` is still `false`; admin readiness
  updates are the single documented exception because they carry
  `is_mutation=false` through `bn_mortality_check_actor_permission`.

### Deferred to a follow-on slice

Section 8 (full pgTAP-style RPC test matrix executed against the live
database) and Section 9 (Deno edge tests exercising the JWT/spoof
paths end-to-end) are not delivered in this turn. The migration is
verified against the live schema; the architecture separation and
JWT-actor spoof guard are covered by the Vitest matrix. The
`SupabaseAuthContext` state-machine refactor (§2 of RECOVERY-2B)
remains the next isolated slice.

---

## BN-MORT-UI-RECOVERY-2E — Stale-identity guards & Benefit Servicing menu

Scope of this slice:

- **§1 Stale identity protection.** `loadUserDataInBackground` and
  `refreshProfile` in `src/contexts/SupabaseAuthContext.tsx` now capture
  `authGeneration` and the requested user id at request time and refuse to
  apply results (profile, roles, or timeout status) when the identity has
  moved on. `SIGNED_OUT` continues to clear profile/roles synchronously.
- **§2 Benefits query cache isolation.** New `BenefitsQueryLifecycle`
  component (`src/components/bn/BenefitsQueryLifecycle.tsx`) is mounted
  under `QueryClientProvider` + `SupabaseAuthProvider` in `App.tsx`. On
  every `user.id` or `authGeneration` change it calls `cancelQueries` and
  `removeQueries` scoped to the `bn-benefits-query` root key only. All
  other application caches are preserved.
- **§5 Menu placement.** `bn_mortality` is now a child of `bn_servicing`
  (`sort_order = 30`, before Award Suspension at 40). No duplicate row,
  no legacy top-level Mortality module. `actions_enabled=false`,
  `rollout_state=internal_pilot`, all six integration-readiness rows
  remain `is_ready=false`, and the canonical business command count
  stays at 26.
- **§9 Verification SQL.**
  `supabase/verify/bn_mortality_benefit_servicing_menu.sql` fails on
  missing root/group/module, duplicate rows, wrong parent, wrong route,
  or wrong pilot flags. Verified locally: `parent=bn_servicing, order=30`.

Not delivered in this slice: full RTL/reducer test matrices from §10,
and the assigned-to combobox / filter-toolbar redesign (explicitly
out of scope).
