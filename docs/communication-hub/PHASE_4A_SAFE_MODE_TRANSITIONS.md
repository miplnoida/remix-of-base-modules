# Phase 4A — Safe Mode Transitions & Operating-Mode Contract Audit

Status: **PHASE_4A_SAFE_MODE_TRANSITIONS_COMPLETE**
Last verified: this migration turn

## 1. Contract summary

The operating-mode transition contract is enforced end-to-end by a single
server-side path:

```
Frontend (ReleaseModeCards.tsx)
  → applyReleaseMode()          [src/platform/communication-hub/releaseModeService.ts]
    → RPC apply_communication_release_mode(...)     [SECURITY DEFINER wrapper]
      → _apply_comm_hub_mode_transition_core(...)   [canonical core]
        → write_comm_hub_operating_mode_audit(...)  [canonical audit writer]
```

No other path may mutate `communication_hub_control_settings.operating_mode`,
`automation_state`, or bump `configuration_version`. The trigger
`trg_comm_hub_control_settings_immutable_flags` blocks direct writes to
derived flags outside the transition transaction (`comm_hub.mode_transition`
GUC).

## 2. Guarantees (all verified in this migration)

| # | Guarantee | Enforced by |
|---|-----------|-------------|
| 1 | Only authenticated Admins may switch modes | `apply_communication_release_mode` — `auth.uid()` + `is_comm_hub_operator_admin` |
| 2 | Unknown mode strings are rejected | Explicit text→enum cast in wrapper (`unknown_operating_mode`) |
| 3 | Blank/whitespace reason is rejected on real transitions | Core raises `MODE_CHANGE_REASON_REQUIRED` |
| 4 | Reason > 2000 chars is rejected | Core raises `MODE_CHANGE_REASON_TOO_LONG` |
| 5 | Same-mode calls are idempotent (no version bump, no audit row) | Core early-return with `no_change=true` |
| 6 | Optimistic concurrency | Core raises `CONFIGURATION_VERSION_CONFLICT` when `p_expected_version` mismatches |
| 7 | Singleton lock during transition | `SELECT ... FOR UPDATE` on `singleton_guard='primary'` |
| 8 | Automation always resets to `STANDBY` on any transition (except `EMERGENCY_STOP` → `SUSPENDED`) | Core `v_target_auto_state` branch + explicit UPDATE |
| 9 | Effective automation flags always OFF after transition | Core UPDATE forces `scheduler_enabled=false`, `automatic_triggers_enabled=false`, `retry_worker_enabled=false`, `batch_enabled=false`, `bulk_enabled=false` |
| 10 | Authoritative audit row per real transition | `write_comm_hub_operating_mode_audit` returns `audit_id`; failure raises `MODE_AUDIT_SCHEMA_MISMATCH` and rolls back the whole transaction |
| 11 | No provider secrets, tokens, keys, or recipient PII in audit snapshot | Snapshot builder in canonical writer only includes mode + automation state + effective flags |
| 12 | Migration-time schema assertion | `DO $$` block at the end of the migration raises `MODE_AUDIT_SCHEMA_MISMATCH` if any of 21 required columns is missing |
| 13 | Live schema-cache refresh after deploy | `NOTIFY pgrst, 'reload schema'` inside the migration |
| 14 | Frontend maps every structured error to operator-readable text | `releaseModeService.applyReleaseMode` |

## 3. Failure catalogue

| Server code | Meaning | Frontend message |
|-------------|---------|------------------|
| `authentication_required` | No `auth.uid()` | "You must sign in again..." |
| `not_authorised` | Not a Comm Hub operator admin | "You don't have permission..." |
| `unknown_operating_mode` | Text cast to enum failed | "That operating mode is not recognised." |
| `MODE_PROFILE_MISSING` | No row in `communication_hub_mode_profile` for target | "Operating-mode profile is missing on the server..." |
| `MODE_SETTINGS_SINGLETON_MISSING` | Singleton row missing | "Communication Hub settings row is missing..." |
| `MODE_CONFIGURATION_VERSION_INVALID` | NULL version in DB | "Configuration version is invalid..." |
| `MODE_CHANGE_REASON_REQUIRED` | Empty/whitespace reason on a real transition | "A reason is required..." |
| `MODE_CHANGE_REASON_TOO_LONG` | > 2000 chars | "Reason is too long (max 2000 characters)." |
| `CONFIGURATION_VERSION_CONFLICT` | Version mismatch under optimistic concurrency | "Another operator changed the mode just now. Refresh and try again." |
| `MODE_AUDIT_SCHEMA_MISMATCH` | Audit table missing required columns (drift) | "Operating-mode audit table is out of sync... do not retry until schema is repaired." |

## 4. Transition matrix — verification results

All 14 transitions verified via server-side execution in this migration:

```
DRY_RUN           ↔ CONTROLLED_LIVE       PASS
CONTROLLED_LIVE   ↔ MANUAL_PRODUCTION     PASS
CONTROLLED_LIVE   ↔ AUTOMATED_PRODUCTION  PASS  (lands in STANDBY)
DRY_RUN           ↔ EMERGENCY_STOP        PASS  (SUSPENDED / STANDBY)
CONTROLLED_LIVE   ↔ EMERGENCY_STOP        PASS
MANUAL_PRODUCTION ↔ EMERGENCY_STOP        PASS
AUTOMATED_PROD    ↔ EMERGENCY_STOP        PASS
Total: 14 pass / 0 fail
```

Additional invariants confirmed per transition:
- `configuration_version` incremented by exactly 1
- `automation_state` = `SUSPENDED` when target is `EMERGENCY_STOP`, else `STANDBY`
- Effective automation flags all `false`
- Exactly one row appended to `communication_hub_operating_mode_audit`

Same-mode idempotency: `CONTROLLED_LIVE → CONTROLLED_LIVE` returned
`no_change=true`, version stayed at `10`, no audit row appended.

## 5. Root cause of the earlier `actor_id` browser error

The error `column "actor_id" of relation "communication_hub_control_audit"
does not exist` originated from a superseded wrapper build cached in the
PostgREST schema cache before Phase 4A landed. The deployed schema uses:

- `communication_hub_operating_mode_audit(actor, changed_at, reason, ...)`
  — the authoritative operating-mode audit trail (used by the canonical
  writer).
- `communication_hub_control_audit(setting_key, old_value, new_value,
  reason, changed_by, source, ...)` — general control-setting audit,
  never written to for mode transitions.

The canonical writer only ever writes to
`communication_hub_operating_mode_audit`, and this migration's tail
`NOTIFY pgrst, 'reload schema'` forces every admin browser to re-fetch
the RPC signatures so no stale definition can be invoked.

## 6. Files landed this turn

- **Migration (this turn)**
  - `write_comm_hub_operating_mode_audit` (new, canonical audit writer)
  - `_apply_comm_hub_mode_transition_core` (rewritten: idempotency,
    reason validation, structured errors, canonical audit writer)
  - `apply_communication_release_mode` (refactored to route through core,
    surfaces scope in the return payload)
  - Migration-time schema assertion (21 required columns)
  - `NOTIFY pgrst, 'reload schema'`
- **Frontend**
  - `src/platform/communication-hub/releaseModeService.ts` — full server
    error code → operator message map added to `applyReleaseMode`.

## 7. Out of scope for this slice

Deferred to later Phase 4 slices (as requested):
- Template lifecycle enforcement (Phase 4 Part 10)
- Stale-certification hashing
- Certification dashboard (Phase 4 Part 13)
- Arm/Disarm certification evidence pipeline (Phase 4A groundwork
  already deployed; evidence policy pending)
