# Controlled Stub — Root-Cause Fix & One-Time Hardening

Goal: Make `RUN_CONTROLLED_STUB` fully mode-driven, environment-independent, preflight-complete, idempotent, and server-authoritative. Zero real-provider risk. One coordinated implementation, then one connected-environment run.

## Scope Constraint
- No real email is sent. `SEND_ONE_REAL_EMAIL` stays locked.
- Additive migrations only — no destructive changes to historical evidence.

---

## Slice A — Provider & Action Contract (Server)

1. **Edge Function `comm-hub-controlled-live-test`**
   - Remove the `COMM_HUB_PROVIDER_MODE=stub` gate for `RUN_CONTROLLED_STUB` (delete the preflight that emits `controlled_live_provider_mode_inactive`).
   - Explicit action gate stays (already implemented) but is now the *only* provider selector.
   - Server-side legacy translation: if request carries only legacy `allowRealEmail`, coerce to explicit action + attach `deprecation` warning; never surface to UI.
   - Emit new envelope fields: `action_used`, `provider_mode_used`, `provider_adapter_invoked`, `external_provider_call_attempted`, `simulated`.
2. **`_shared/communication-hub/provider-stub.ts`**
   - Remove the `COMM_HUB_PROVIDER_MODE` read. Simulator invocation gated by explicit `action === "RUN_CONTROLLED_STUB"` argument plus server-only caller assertion.
3. **`comm-hub-dispatch`**
   - Accept `operation: "targeted_controlled_test"` + `action`. Adapter selection derived from `action`, never from env. Reject action mismatch with structured blocker.

## Slice B — Read-Only Preflight

1. New RPC `check_comm_hub_controlled_stub_preflight(payload jsonb)` — pure `STABLE`, zero writes.
   - Collects **all** blockers listed in Epic §9 (auth, platform, mode, event, recipient, preview, dry run, drift, execution safety).
   - Returns single JSON envelope: `ready`, `retrySafe`, `currentMode`, `moduleCode`, `eventCode`, `channel`, `blockers[]`, `warnings[]`, `availableActions[]`, `configurationVersion`, `recipientPolicyVersion`, `platform{}`, `recipient{}`, `preview{}`, `dryRun{}`, `existingExecution{}`, `evaluatedAt`.
2. New service `src/platform/communication-hub/controlledStubPreflightService.ts` calls the RPC and normalizes to camelCase.

## Slice C — Retry-Safety Classifier

- New DB function `_comm_hub_classify_retry_safety(stage text, blockers jsonb) returns boolean` — single authoritative classifier used by both preflight and orchestrator.
- Rules per Epic §10.
- Orchestrator uses classifier instead of hardcoded `retry_safe = false`.

## Slice D — Additive Schema Evidence

Migration adds columns (nullable, default sensible values):

- `communication_delivery_attempt`: `attempt_type`, `action_used`, `provider_mode_used`, `provider_adapter_invoked`, `external_provider_call_attempted`, `simulated`, `provider_invocation_key`.
- `communication_controlled_live_execution`: `action_used`, `provider_mode_used`, `provider_adapter_invoked`, `external_provider_call_attempted`, `simulated`.
- `communication_controlled_live_certification`: (already has `certification_kind`); add `provider_mode_used`, `provider_adapter_invoked`, `external_provider_call_attempted`, `simulated`.

Add supporting index `(module_code, event_code, certification_kind, status)`.

## Slice E — Idempotent Lifecycle + Post-Dispatch Verification

1. **`begin_comm_hub_controlled_live`** — extend to accept `action` and to persist new evidence columns. Enforce `certification_kind = 'CONTROLLED_STUB'` when action is `RUN_CONTROLLED_STUB`.
2. **Idempotency**: durable key = `(module, event, channel, previewApprovalId, dryRunCertId, action)`. On replay, return existing terminal evidence with `idempotent_replay = true`, `retrySafe = true`, no new rows.
3. **Post-dispatch reread**: orchestrator reloads execution/grant/request/message/attempt/decision before certifying (Epic §17). Certification issued only if all invariants hold.
4. **Dispatcher validation** (Epic §16): 26-point check performed inside `comm-hub-dispatch` before simulator call; hash recomputation; grant reserve→consume; single attempt row.

## Slice F — UI

1. **`ControlledStubPanel.tsx`** (create if missing / finish):
   - Title: **Run Controlled Stub**. Description per Epic §13.
   - Displays locked inherited context; masked recipient; Preview + Dry-Run status.
   - Business reason field + simulation acknowledgement + optional `RUN CONTROLLED STUB TEST` phrase.
   - Calls `controlledStubPreflightService` on mount / event change; Run button disabled while blockers exist; shows *all* blockers together with plain-language mapping.
   - Removes all real-email / inbox-verification wording.
2. **`GoLivePage.tsx`**:
   - Step 5 uses `ControlledStubPanel`.
   - Completion contract per Epic §19: requires `certificationKind === 'CONTROLLED_STUB'` + all evidence flags. Does not require `providerCallAttempted=true`.
   - Result surface per Epic §20 with "Advanced Evidence" collapse.
3. **`ControlledLivePanel.tsx`**: retained only as shared evidence-view fragments; primary orchestration entrypoints removed.

## Slice G — Blocker Catalog & Messaging

- `canonicalBlockerCatalog.ts`: register every code in Epic §12, plus legacy `controlled_live_provider_mode_inactive` mapped to Epic §11 wording ("Legacy Controlled Stub configuration detected", fix action "Return to Go Live", retrySafe=true).
- `plainLanguageBlockers.ts`: matching plain-language strings.
- `ReadinessSummary.tsx`: never falls back to generic "Readiness check could not be completed" when a known code exists.

## Slice H — Tests

Add / extend tests covering Epic §23:
- `provider-stub` env-independence unit tests.
- `comm-hub-controlled-live-test` action-gate + legacy-translation tests.
- Preflight zero-write and all-blockers-together tests.
- Idempotent replay: assert row-count deltas = 0.
- Retry-safety classifier unit tests.
- UI: `ControlledStubPanel` wording + button-gate + blocker rendering.
- Certification-kind gating for One Real Email.

## Slice I — Verification

- Full repo typecheck (`tsgo`).
- Full Communication Hub Vitest suite + new Controlled Stub suites.
- Production build.
- Connected-environment run through Go Live steps 1→6 (stop before real email). Report per Epic §26.

## Completion Markers

- Return **`GL_NOW_CONTROLLED_STUB_CERTIFIED`** if the connected run produces a `CONTROLLED_STUB` certification with all invariants verified from durable DB reread and zero external provider calls.
- Return **`GL_NOW_CONTROLLED_STUB_READY`** if code, tests, typecheck, build all pass but the connected run is blocked by genuine credential/permission/deployment/event-config.
- Return **`NO_GO`** on any environment leak, retry-safety regression, idempotency gap, or missing authoritative certification.

## Technical Notes

- Migrations are additive; existing columns preserved.
- No changes to `SEND_ONE_REAL_EMAIL` path other than certification-kind precondition.
- No auto mode transitions inside the orchestrator; operator must switch to `CONTROLLED_LIVE` via Go Live selector.
- No secrets returned to the browser; edge functions handle credentials.
- Estimated: ~2 migrations, ~4 edge-function edits, ~3 service updates, ~2 UI components, ~6 new/updated test files.
