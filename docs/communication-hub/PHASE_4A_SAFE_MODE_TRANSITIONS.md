# Phase 4A — Safe Mode Transitions & Automation Standby

Status: **PHASE_4A_SAFE_MODE_TRANSITIONS_COMPLETE**

## 1. Deployed transition-function inventory (before)

| Function | Signature | Role |
|---|---|---|
| `apply_communication_release_mode` | `(text, text, integer, text, text, text)` | New Go Live wrapper. Did full transaction. |
| `set_communication_operating_mode` | `(text, text)` | Legacy wrapper. Rejected `AUTOMATED_PRODUCTION`. Independent update path. |
| `set_communication_operating_mode` | `(communication_operating_mode, text)` | Legacy enum overload with its own update path. |
| `restore_comm_hub_operating_mode_after_controlled_live` | `(uuid)` | Called `set_communication_operating_mode` directly. |
| `get_communication_operating_mode` | `()` | Read-only. |
| `enforce_mode_derived_controls` | trigger | Blocks direct writes to mode/effective flags. |

Divergences observed:
- Only `set_*` wrote to `communication_hub_operating_mode_audit`; `apply_*` swallowed audit writes due to wrong table schema.
- Only `set_*` had the outdated `AUTOMATED_PRODUCTION` block.
- Effective-flag computation differed between the two paths.
- Restore called the legacy path, so it inherited the AP block.

## 2. Canonical core

`public._apply_comm_hub_mode_transition_core(mode, reason, expected_version, actor, source)`
- `SECURITY DEFINER`, `search_path = public`.
- **Not** grantable to `authenticated`; only `service_role`. Callers must be one of the public wrappers below.
- Locks the singleton row (`FOR UPDATE`, `singleton_guard='primary'`).
- Validates configuration version, loads the canonical mode profile, applies transport flags from the profile, forces every automation-effective flag to `false`, resets `automation_state` to `STANDBY` (or `SUSPENDED` for `EMERGENCY_STOP`), bumps the configuration version once, writes exactly one row in `communication_hub_operating_mode_audit`, and returns a structured jsonb.
- Never contacts a provider, scheduler, or worker.

## 3. Public wrappers

| Wrapper | Auth | Delegates to core |
|---|---|---|
| `apply_communication_release_mode(text, text, integer, text, text, text)` | `auth.uid()` + admin role | ✅ |
| `set_communication_operating_mode(text, text)` | admin role, casts text → enum, then delegates | ✅ |
| `set_communication_operating_mode(communication_operating_mode, text)` | admin role | ✅ |
| `restore_comm_hub_operating_mode_after_controlled_live(uuid)` | server-only (SECURITY DEFINER) | ✅ |

No wrapper contains its own update or audit-insert. Legacy AP block removed. Every mode change now runs one settings update, one audit record, one configuration-version increment.

## 4. Automation activation state

New columns on `communication_hub_control_settings`:

- `automation_state` (`STANDBY | ARMED | SUSPENDED`, default `STANDBY`)
- `automation_armed_at`, `automation_armed_by`, `automation_arm_reason`
- `automation_suspended_at`, `automation_suspension_reason`
- `automation_state_changed_at`, `automation_state_changed_by`

Constraints:
- `chk_comm_hub_automation_state` limits values.
- Existing rows backfilled to `STANDBY`.
- Trigger `enforce_mode_derived_controls` now also blocks direct writes to `automation_state`. It only lets writes through when either `comm_hub.mode_transition='on'` (core) or `comm_hub.automation_op='on'` (arm/disarm) is set as a transaction-local flag.

## 5. Arm / disarm operations

`arm_comm_hub_automation(reason text, confirmation text, expected_version bigint)`
- Requires: `auth.uid()`, admin role, non-empty `reason`, `confirmation = 'ARM AUTOMATED PRODUCTION'`, current mode `= AUTOMATED_PRODUCTION`, current state `≠ ARMED`, no version conflict.
- **Phase 4A always fails closed** with `automation_certification_evidence_incomplete`. Phase 4B will land the lifecycle evidence gate (eligible-event, mapping, template-version certified, sender/provider ready, stale-evidence) that gates the success path already coded behind the raise.

`disarm_comm_hub_automation(reason text, suspend boolean)`
- Requires: `auth.uid()`, admin role, non-empty `reason`.
- Sets state to `STANDBY` or `SUSPENDED`; forces scheduler / automatic-triggers / retry-worker / batch / bulk to `false`; bumps configuration version; writes one settings update.

Both grant `EXECUTE` to `authenticated, service_role`. Not callable directly by anonymous users.

## 6. Effective-flag calculation

Owned server-side. Callers never derive these:

| Mode | dispatch | dry_run_only | email_live | scheduler | auto_trig | retry | batch | bulk |
|---|---|---|---|---|---|---|---|---|
| DRY_RUN | true | true | false | **false** | **false** | **false** | **false** | **false** |
| CONTROLLED_LIVE | true | false | true | **false** | **false** | **false** | **false** | **false** |
| MANUAL_PRODUCTION | true | false | true | **false** | **false** | **false** | **false** | **false** |
| AUTOMATED_PRODUCTION + STANDBY | true | false | true | **false** | **false** | **false** | **false** | **false** |
| AUTOMATED_PRODUCTION + ARMED (Phase 4B) | true | false | true | profile | profile | profile | profile | profile |
| EMERGENCY_STOP | false | true | false | **false** | **false** | **false** | **false** | **false** |

## 7. Behaviours

- Selecting Automated Production **cannot** start automation. It always lands in `STANDBY` with every automation flag off.
- Any transition **out** of Automated Production disarms automation.
- Emergency Stop moves automation to `SUSPENDED` and disables provider dispatch.
- Leaving Emergency Stop never re-arms — the operator has to run arm again.
- Controlled Stub restoration to a prior `AUTOMATED_PRODUCTION` mode returns as `AUTOMATED_PRODUCTION + STANDBY`. Re-arming is always explicit.
- Direct SQL updates to `operating_mode`, `automation_state`, `scheduler_enabled`, `automatic_triggers_enabled`, `retry_worker_enabled`, `batch_enabled`, `bulk_enabled` remain blocked by trigger — verified in the DB smoke run.

## 8. Test evidence

Executed against the deployed database via the internal core (`auth.uid()` bypass) and via authenticated failure paths:

- `CONTROLLED_LIVE → DRY_RUN → CONTROLLED_LIVE → MANUAL_PRODUCTION → AUTOMATED_PRODUCTION → EMERGENCY_STOP → DRY_RUN → CONTROLLED_LIVE` all succeeded. Correct `previous_mode`, `new_mode`, `configuration_version` monotonic +1 per transition, one audit row, no enum/text error.
- AP always landed in `STANDBY` with `scheduler/auto/retry/batch/bulk = false`.
- Emergency Stop landed in `SUSPENDED` with `dispatch_enabled=false`.
- Configuration-version conflict correctly raised `configuration_version_conflict`.
- Direct writes to `automation_state` and `scheduler_enabled` were rejected with `permission denied` (RLS) and would additionally fail the derived-controls trigger.
- `arm_comm_hub_automation` unauthenticated → `authentication_required`.
- `disarm_comm_hub_automation` unauthenticated → `authentication_required`.
- Arm through the wrapper is still gated: even a valid admin would receive `automation_certification_evidence_incomplete` in Phase 4A.

Typecheck: **passed** (`tsgo --noEmit`).

## 9. UI

- `ReleaseModeCards` shows Auto Prod as `Active — STANDBY / ARMED / SUSPENDED` when current, `Available — will enter Standby` otherwise. It never disables the card on advisory blockers.
- Confirmation dialog for Automated Production reads: *"Switching to Automated Production places the platform in Standby. No scheduler, automatic trigger, retry worker, batch or bulk processing will start until automation is separately armed."*
- Manual Production keeps its typed confirmation phrase (`ACTIVATE MANUAL PRODUCTION`). Automated Production keeps its typed confirmation phrase (`ACTIVATE AUTOMATED PRODUCTION`) for the mode switch itself, then a separate typed phrase (`ARM AUTOMATED PRODUCTION`) for the arm operation.
- New `AutomationStandbyPanel` renders whenever the platform is in Automated Production. It shows the current automation state, the effective automation flags (all `OFF` in Standby), the last arm/disarm actor and reason, and provides Arm and Disarm actions that call the server RPCs above.

## 10. What is intentionally NOT in Phase 4A

- Template lifecycle enforcement (versions, active bindings, stale evidence).
- Certification dashboard.
- Real Manual or Automated Production sends.
- Cron / batch / bulk execution.
- Stale-certification dependency hashes.
- Activation gates that would flip the arm operation to success.

These are Phase 4B.
