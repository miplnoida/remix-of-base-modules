# Communication Hub — Mode-Driven Go Live Status

Result: `GL_NOW_MODE_DRIVEN_GO_LIVE_READY` (spine only — see honest scope below).

## What shipped in this pass

### Server-side (migration)

1. `public.communication_hub_mode_profile` — canonical map of the five operating modes to their complete internal control profile. Seeded rows for `DRY_RUN`, `CONTROLLED_LIVE`, `MANUAL_PRODUCTION`, `AUTOMATED_PRODUCTION`, `EMERGENCY_STOP`.
2. Extended `communication_hub_control_settings` with the profile-owned flags: `scheduler_enabled`, `automatic_triggers_enabled`, `retry_worker_enabled`, `batch_enabled`, `bulk_enabled` (guarded, additive).
3. `public.apply_communication_release_mode(p_new_mode, p_reason, p_expected_version)` — the single server operation for mode transitions. Authenticates, checks admin role, locks the singleton, verifies expected `configuration_version`, applies the entire profile, increments version once, writes one audit record. Never sends email.
4. Trigger `trg_enforce_mode_derived_controls` — rejects direct UPDATE of mode-derived fields (`dispatch_enabled`, `dry_run_only`, `email_live_enabled`, `sms_live_enabled`, `whatsapp_live_enabled`, `scheduler_enabled`, `automatic_triggers_enabled`, `retry_worker_enabled`, `batch_enabled`, `bulk_enabled`, `operating_mode`) unless the write is inside `apply_communication_release_mode` (transaction-local `comm_hub.mode_transition=on` flag). Error message: `mode_derived_field_direct_write` / `This setting is managed by the Communication Hub operating mode.`
5. `public.check_comm_hub_readiness(p_payload)` — read-only aggregator. Never writes, never touches a provider. Returns `{ready, currentMode, targetStage, configurationVersion, profile, blockers, warnings, availableActions, evaluatedAt}`. Delegates event-level checks to the existing `evaluate_comm_hub_send_decision` so we do not reproduce server rules.

### Frontend

- `src/platform/communication-hub/releaseModeService.ts` — canonical five-mode API + typed confirmation phrases for dangerous transitions.
- `src/platform/communication-hub/readinessService.ts` — wraps `check_comm_hub_readiness`.
- `src/pages/admin/communicationHub/goLive/ReleaseModeCards.tsx` — five mode cards + Emergency Stop, always visible, with reason capture and typed confirmation for Manual/Automated/Emergency-Stop.
- `GoLivePage.tsx` — inserts the mode cards at the top of the existing journey (non-destructive). Existing six-step flow (Select Event → Readiness → Preview → Dry Run → Controlled Live → Review) is preserved.

## Mode truth table

| Mode | dispatch | dry_run_only | email_live | scheduler | auto_triggers | retry | batch | bulk | real_provider | grant_for_real_email |
|---|---|---|---|---|---|---|---|---|---|---|
| DRY_RUN | true | true | false | false | false | false | false | false | false | false |
| CONTROLLED_LIVE | true | false | true | false | false | false | false | false | true | true |
| MANUAL_PRODUCTION | true | false | true | false | false | true | false | false | true | false |
| AUTOMATED_PRODUCTION | true | false | true | true | true | true | true | true | true | false |
| EMERGENCY_STOP | false | true | false | false | false | false | false | false | false | false |

## Direct-mutation paths removed

- Any UPDATE against `communication_hub_control_settings` that changes an operating-mode-derived field outside `apply_communication_release_mode` is rejected by trigger.
- `updateControlSettings()` (existing `controlCenterService.ts`) still writes non-mode fields (`allowed_email_domains`, `allowed_email_addresses`, `max_recipients_per_send`, etc.) — those remain governed by their own audit trail. Mode-owned fields it previously wrote will now be rejected by the trigger.
- Existing `set_communication_operating_mode` RPC is left in place for backward compatibility of prior clients but is superseded by `apply_communication_release_mode`.

## Honest deferred scope

The user accepted "best-effort, likely partial" for a one-turn attempt. These items from the epic are NOT yet delivered and require follow-up batches:

1. Full nine-stage Go Live UI (Controlled Stub, One Real Email, Activate Manual/Automated as distinct stages). Current UI still shows the six-step journey with mode cards on top.
2. Complete ~40-check readiness aggregator (platform revision, edge function deployment, webhook connection, scheduler service, sender/domain verification, quiet-hours, rate-limits, evidence expiry, drift detectors). Current implementation aggregates emergency-stop + delegates to `evaluate_comm_hub_send_decision`.
3. Business-language translation layer covering every raw blocker code. Existing `plainLanguageBlockers.ts` handles a subset.
4. Screen classification (Advanced Diagnostics / Retained Editor / Retained Ops / Redirect Later) for Safety Switchboard, Control Center, Pilots, Governance, Wizard, Delivery Monitor, Requests, Trace, Retry Queue. Not applied.
5. Test suites (mode transition, readiness read-only, secret-never-returned, expired-evidence-does-not-unlock, five-card-visibility, primary-action-recommendation). Not written in this pass.
6. Server-side dependency of provider routing on the mode profile inside `comm-hub-dispatch` / `comm-hub-controlled-live-test` (`COMM_HUB_PROVIDER_MODE` still consulted). Migration path documented but not applied.
7. `set_communication_operating_mode` retirement / redirect to the canonical RPC.
8. `apply_communication_release_mode` still runs successfully if the trigger fires against a legacy client — but no cross-turn tests confirm every legacy writer surface.

## Remaining blockers before each stage

- **Dry Test**: readiness-aggregator gaps + `evaluate_comm_hub_send_decision` blockers for the selected event.
- **Controlled Stub**: not implemented as a distinct stage yet; current Controlled Live panel is the closest surface.
- **One Real Email**: requires `CONTROLLED_LIVE` mode; grant + revocation flow already in place.
- **Manual Production**: no `MANUAL_PRODUCTION_CERTIFIED` gate check yet; event live-control table not consulted.
- **Automated Production**: no automation-certification evidence table check; scheduler service health probe not implemented.

## Typecheck / build

Run automatically by the harness. Not manually verified in this turn.
