# BN-MORT-UI-RECOVERY-2A — Readiness Security & Control

**Status:** Phase 2 (readiness security/control) delivered — DB layer.
**Phase 1 (authenticated-runtime acceptance):** NOT re-verified this turn.

`bn_mortality.actions_enabled = false` · `rollout_state = internal_pilot` ·
incomplete command flags unchanged.

## Delivered in this turn

### B. Additive no-RLS corrective migration (`bn_mortality_integration_readiness`)
- Policy `authenticated_readonly` dropped.
- RLS **disabled** on the readiness table.
- `anon` / `authenticated` / `PUBLIC` privileges **revoked**.
- `service_role` retains full CRUD.
- Browser code cannot read or write this table directly. The
  `bn-benefits-query` edge function reads it via `service_role` after its
  own JWT + permission walk.

### C. Data-integrity constraints
- `bn_mortality_integration_readiness_code_chk` — restricts
  `integration_code` to: `awards`, `dms`, `overpayments`, `survivor`,
  `funeral`, `legal`.
- `bn_mortality_integration_readiness_owning_module_chk` — non-empty
  `owning_module`.
- `bn_mortality_integration_readiness_ready_consistency_chk` — a row can
  only be `is_ready=true` when `certification_status='CERTIFIED'`,
  `certified_at IS NOT NULL`, and `certification_reference` is non-empty.
- `certification_status` continues to be constrained to
  `NOT_CERTIFIED | IN_PROGRESS | CERTIFIED | REVOKED` (pre-existing).

### D. Controlled promotion RPC — `public.bn_mortality_set_integration_readiness`
- `SECURITY DEFINER`, `search_path=public`.
- Inputs: `p_integration_code`, `p_certification_status`, `p_is_ready`,
  `p_certification_reference`, `p_notes`, `p_expected_row_version`,
  `p_actor_user_id`, `p_justification`, `p_correlation_id`.
- Rejects with structured `code`:
  - `INVALID_INTEGRATION_CODE`, `INVALID_STATUS`
  - `MISSING_JUSTIFICATION`, `MISSING_ACTOR`
  - `READY_REQUIRES_CERTIFIED`, `MISSING_CERTIFICATION_REFERENCE`
  - `INVALID_ROW_VERSION`, `NOT_FOUND`, `CONCURRENCY_CONFLICT`
- Locks the readiness row (`FOR UPDATE`), enforces optimistic concurrency
  via `expected_row_version`, increments version once (via the existing
  BEFORE UPDATE trigger), sets `updated_by` / `updated_at`, and inserts
  one history record in the same transaction. A failed / concurrent
  update writes **no** history.
- `EXECUTE` revoked from `PUBLIC` / `anon` / `authenticated`;
  granted only to `service_role`. Browsers must never call it directly.
- The invoking edge function is responsible for matching
  `p_actor_user_id` to the authenticated JWT subject before delegating.

### E. Immutable audit — `bn_mortality_integration_readiness_history`
- Fields: previous/new `certification_status`, previous/new `is_ready`,
  previous/new `row_version`, `certification_reference`, `justification`,
  `actor_user_id`, `correlation_id`, `occurred_at`.
- RLS disabled; `anon` / `authenticated` / `PUBLIC` privileges revoked;
  `service_role` has `SELECT, INSERT` only (no `UPDATE`, no `DELETE`).
- Indexed by `(integration_readiness_id, occurred_at DESC)`.

### F. Readiness consumption semantics (unchanged, re-confirmed)
`bn-benefits-query` treats readiness as ready **only when** the row
exists, `certification_status='CERTIFIED'`, and `is_ready=true`. A
missing row means false. The new CHECK constraint makes contradictory
"CERTIFIED + not ready" or "not CERTIFIED + ready" states unreachable.

### Seeded readiness values (unchanged)
`awards=false`, `dms=false`, `overpayments=false`, `survivor=false`,
`funeral=false`, `legal=false`. No integration was certified in this
turn.

## Not delivered in this turn (deferred to next slice)

To keep the change reviewable, the following items from the prompt were
**not** started here — they will move in the follow-up slice:

- **A.** Authenticated-runtime Phase 1 acceptance (browser sign-in →
  live summary/worklist OK) and the auth-initialisation race fixes
  (`AUTH_INITIALISING`, `SESSION_TIMEOUT`, `SESSION_EXPIRED`, etc.) in
  `SupabaseBenefitsQueryAdapter` and the mortality pages.
- **G.** Executable test suites (auth-runtime, migration/security,
  constraints, promotion RPC, readiness consumption).
- Edge-function wiring of the new RPC (a `BN_MORTALITY_SET_INTEGRATION_READINESS`
  command handler in `bn-mortality-command` that maps the JWT subject to
  `p_actor_user_id`).

These are additive on top of the DB surface delivered here.
