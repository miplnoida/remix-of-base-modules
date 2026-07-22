# Phase 4B3 — Unified Go-Live Certification Foundation

**Status:** FOUNDATION LANDED (readiness runner active; no runtime rows created).

## What shipped

1. **Business event envelope contract** (`src/platform/communication-hub/contracts/BusinessEventEnvelope.ts`,
   version `business-event-envelope/1`) plus validator that rejects reserved
   platform fields (`templateId`, `senderProfileId`, `recipientEmail`, etc.).
2. **Manifest builder** `public._comm_hub_build_event_manifest(module, event, channel)`
   — collects safe identifiers, versions, and hashes for the whole event
   configuration graph.
3. **Certification runner** `public.run_comm_hub_go_live_certification(module, event, channel, target_stage, execute=false)`
   — inspects registry, live control, mapping, template version, payload
   schema, variable contract, governed fixture, recipient policy, sender
   profile, sender readiness, template-version governance, calls the existing
   `check_comm_hub_runtime_governance`, resolves variables through the platform
   resolver, renders subject + body to count raw tokens, records a
   certification row (kind `go_live_readiness_<STAGE>`) and returns the full
   blocker set. `p_execute=true` is intentionally inert in the foundation
   iteration — the runner never creates runtime request/message/attempt rows.
4. **Platform-wide renderability assessment** `public.check_all_comm_hub_template_renderability()`
   — one row per active/published template version with purpose-specific
   blockers and a recommended action.
5. **Stop-gate helper** `public.assert_comm_hub_event_ready_for_stage(module, event, channel, stage)`
   — cheap, deterministic gate the runtime callers (`prepare_comm_hub_preview`,
   `begin_comm_hub_dry_run`, `begin_comm_hub_controlled_live`,
   `admin_get_comm_hub_controlled_live_grant`) can consult before mutating
   anything.
6. **Frontend service wrapper** `goLiveCertificationService.ts` exposes
   `runGoLiveCertification`, `assessAllTemplateRenderability`, and
   `assertEventReadyForStage` to admin surfaces.
7. **APPEALS enforcement** — payload schema and variable contract for
   `APPEALS / APPEAL_RECEIVED_NOTICE` flipped from `DISCOVERED` to `ENFORCED`.

## APPEALS pilot certification snapshot

Executed against `APPEALS / APPEAL_RECEIVED_NOTICE / email`:

| Stage                    | Ready | Key remaining blockers |
| ------------------------ | :---: | ---------------------- |
| READINESS_ONLY           | true  | (informational) `template_version_certification_missing`, `TEMPLATE_VERSION_NOT_CERTIFIED` |
| PREVIEW_READY            | false | Template version has no PASS certification yet |
| DRY_RUN_READY            | false | Same; runtime governance stage code mismatch `DRY_RUN` |
| CONTROLLED_STUB_READY    | false | Same; sender readiness row missing |

Manifest hash: `f5efd439b64b875919a71ee202a0cedd0f5275e9d28e97a659fbadd459aee4bd`.
Certification rows written: 4 (one per stage). No runtime rows created.
Row counts unchanged: `communication_message.controlled_live = 0`,
`communication_request.targeted_dispatch_only = 0`,
`communication_delivery_attempt.controlled_live = 0`.

## Progress estimate

| Milestone                                       | Iterations remaining |
| ----------------------------------------------- | :------------------: |
| Successful Controlled Stub                      | ~1                   |
| One controlled real test email                  | ~3                   |
| First Manual Production business event          | ~5–7                 |

## Next iteration (not started)

- Certify the APPEALS template version (`certify_comm_hub_template_version`)
  to clear the two remaining PREVIEW_READY blockers.
- Seed `comm_hub_sender_readiness` for the SENDER_LEGAL profile so
  CONTROLLED_STUB_READY can pass.
- Align `check_comm_hub_runtime_governance` stage names (`DRY_RUN` →
  supported stage set) or adjust the runner mapping.
- Wire `assert_comm_hub_event_ready_for_stage` into the four runtime call
  sites listed above so no snapshot/dry-run/stub/grant can be created without
  an in-date certification.
