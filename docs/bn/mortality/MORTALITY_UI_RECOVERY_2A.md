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
