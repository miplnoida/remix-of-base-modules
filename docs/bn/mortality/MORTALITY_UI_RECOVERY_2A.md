# BN-MORT-UI-RECOVERY-2A / 2B / 2C / 2D / 2D.1 / 2E / 2F — Consolidated Implementation Record

_Last updated: BN-MORT-UI-RECOVERY-2F certification pass._

This document captures the cumulative Mortality UI recovery work through the
2F certification slice. It is the single source of truth for role mapping,
canonical action decisions, stale-identity semantics, and test totals.

---

## Invariants (unchanged from 2D.1 and confirmed at 2F)

| Invariant                                | Value                       |
| ---------------------------------------- | --------------------------- |
| `bn_mortality.actions_enabled`           | `false`                     |
| `bn_mortality.rollout_state`             | `internal_pilot`            |
| `bn_mortality` parent                    | `bn_servicing`              |
| Route                                    | `/bn/mortality`             |
| All 6 integration-readiness `is_ready`   | `false`                     |
| RLS on `bn_mortality*` tables            | disabled (service-role only) |
| Direct browser access to mortality tables| forbidden (edge boundary)   |
| Canonical business command count         | exactly `26`                |

---

## §5 — Approved role mapping for Mortality view

The approved operational role → permission mapping (Mortality VIEW only):

| Role            | View  | Any other action |
| --------------- | :---: | :--------------: |
| `bn_clerk`      |  ✅   |        —         |
| `bn_officer`    |  ✅   |        —         |
| `bn_supervisor` |  ✅   |        —         |
| `bn_manager`    |  ✅   |        —         |
| `bn_finance`    |  ✅   |        —         |
| `Admin`         | ✅ (existing) | ✅ (existing) |

No `write`, `decide`, `approve`, `approve_impact`, `reverse`, or `admin`
permissions are granted by this recovery slice.

Admin visibility continues through the existing `is_admin` /
administrative-permission resolution; the 2F migration does not add a
blanket explicit Admin role grant.

---

## §6 — Canonical view-action decision

Live audit against `module_actions` for `bn_mortality`:

- Both `view` and `read` action rows exist.
- Route gate: `BnModuleRouteGate` defaults to `requiredAction: "view"`, and
  all three mortality routes explicitly pass `"view"`.
- Menu resolution: `useNavigationMenu.ts` filters permissions by
  `action_name === 'view'`.

**Decision:** `view` is the authoritative action. `read` is retained as a
legacy compatibility alias (currently only bound to `Admin`) and is NOT
modified by the 2F migration. Parallel permission semantics are not created.

Canonical action id: `e95a002b-f8f7-421a-ad8e-316ee8a78b47`.

---

## §7 — Role-permission migration status

The additive, idempotent 2F migration (`BN-MORT-UI-RECOVERY-2F`) validates:

1. `bn_mortality` module exists → OK
2. Canonical `view` action exists and is enabled → OK
3. All five approved operational roles exist → **BLOCKED**

Live `public.roles` state at run time contains only:
- `Admin` (system role, active)

The five approved operational roles — `bn_clerk`, `bn_officer`,
`bn_supervisor`, `bn_manager`, `bn_finance` — do **not** exist in
`public.roles`. Per the explicit §7 rule ("Do not create missing roles
silently"), the 2F migration **failed loudly** with:

```
BN-MORT-2F: approved role definition(s) missing: bn_clerk, bn_officer,
bn_supervisor, bn_manager, bn_finance. Create the roles first — this
migration will NOT create them silently.
```

**Next-step gate for §7:** an operator/administrator must create the five
canonical operational roles (with the correct system semantics and any
associated seed data). After that, re-running the 2F migration will:

- insert `is_granted = true` view grants for approved roles that lack a row,
- leave `is_granted = false` rows untouched (explicit denies preserved),
- report `inserted`, `already-granted`, and `explicit-denied` sets via NOTICE.

### Reports produced when re-run

| Bucket             | Contents                                    |
| ------------------ | ------------------------------------------- |
| inserted grants    | roles that received a new `view` grant      |
| existing grants    | roles that already had `is_granted = true`  |
| explicit denies    | roles with `is_granted = false` (preserved) |

No non-view Mortality permission is created by the migration under any
outcome.

---

## §1 — Stale-identity loader correction

`SupabaseAuthContext` now maintains the canonical ref set:

| Ref                       | Purpose                                     |
| ------------------------- | ------------------------------------------- |
| `mountedRef`              | Guards against setState after unmount       |
| `generationRef`           | Detects identity replacement                |
| `currentUserIdRef`        | Confirms result belongs to the current user |
| `authRuntimeStatusRef`    | Ensures status is `AUTHENTICATED`           |

Composite `identityGuardPasses(capturedGeneration, capturedUserId)` returns
true **only** when all four canonical refs align.

Consumers updated to consult the canonical gate (not the stale `authState`
closure):

- `loadUserDataInBackground` — dataPromise `.then`, `.catch`, and timeout
  callback paths.
- `refreshProfile`.
- `retrySessionBootstrap`, `refreshSessionOnce`, `scheduleTokenRefresh` —
  already generation-guarded via `generationRef`; behavior confirmed.

Behaviour matrix (spec §1):

| Scenario                                                        | Outcome                       |
| --------------------------------------------------------------- | ----------------------------- |
| User A signs in → User A profile/roles arrive                   | Applied                       |
| User A pending → User B signs in → late User A profile arrives  | Discarded                     |
| User A pending → SIGNED_OUT → late User A profile arrives       | Discarded                     |
| User A timeout fires after User B signs in                      | Cannot touch User B state     |

---

## §8 — Menu verification SQL

`supabase/verify/bn_mortality_benefit_servicing_menu.sql` extended to
assert (in addition to the 2E structural checks):

- Sibling order among any of `{life_certificates, medical_reviews,
  mortality, award_suspension, overpayments, survivors_processing}` that
  exist under `bn_servicing`, using pairwise `sort_order` comparisons.
- Canonical `view` action exists.
- Approved roles' effective grant state is enumerated (effective grants,
  explicit denies, missing grants, missing roles).
- **Hard failure** when any approved role has been granted any non-view,
  non-read Mortality action by an out-of-scope migration.

The verify script emits a structured NOTICE report at completion.

---

## Test totals (this pass)

| Suite (representative subset in 2F)                               | Tests |
| ----------------------------------------------------------------- | ----: |
| `src/contexts/__tests__/authStateMachine.test.ts` (existing)      |    — |
| `src/contexts/__tests__/refreshCoordinator.test.ts` (new, §2)     |   10 |
| `BnMortalityBreadcrumbs.test.tsx` (new, §4)                       |   11 |
| `BnMortalityAuthState.test.tsx` (new, §3)                         |    8 |

Sections not fully enumerated in this pass are called out below and queued
for follow-up.

---

## Completion gate status

| Gate                                                                                     | Status |
| ---------------------------------------------------------------------------------------- | :----: |
| `bn_mortality.actions_enabled` remains `false`                                            |   ✅   |
| `rollout_state` remains `internal_pilot`                                                  |   ✅   |
| All six readiness rows `is_ready = false`                                                 |   ✅   |
| Canonical business command count remains `26`                                             |   ✅   |
| Mortality appears exactly once under Benefit Servicing (`sort_order = 30`)                |   ✅   |
| No non-view permission added                                                              |   ✅   |
| Explicit denies preserved                                                                 |   ✅   |
| Stale profile/role responses cannot cross identities (§1 refs + composite gate)           |   ✅   |
| Refresh is demonstrably single-flight (coordinator tests, §2)                             |   ✅   |
| Authorised operational roles can see and open Mortality                                   |   🛑   |
| Unauthorised roles cannot see or open Mortality                                           |   ✅   |
| §7 migration applied                                                                     |   🛑   |
| Sections 9/10/11 fully enumerated executable coverage (dynamic-menu, audit, regression)   |   🟨   |

Legend: ✅ done · 🛑 blocked · 🟨 partial (representative subset delivered)

---

## Outstanding follow-up (queued after role-definition gate)

1. Define the five canonical operational roles in `public.roles` (out of
   scope for this recovery slice per §7 policy).
2. Re-run the 2F migration to apply view grants.
3. Re-run `supabase/verify/bn_mortality_benefit_servicing_menu.sql` to
   produce the effective-grants report.
4. Complete §9 dynamic-menu RTL, §10 command-audit Deno matrix, and the
   §11 full regression + typecheck sweep. Representative coverage for the
   auth-state, breadcrumb, and refresh-coordinator layers is in place.

After the operational-role gate closes, the next visible UX slice begins:
searchable Assigned-To combobox, filter-toolbar redesign, date-range
picker, status/source multi-select, active filter chips, and coordinated
dashboard/worklist error states.
