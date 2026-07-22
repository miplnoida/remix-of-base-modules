
# CH-GL-02 — Controlled Stub as a First-Class Stage

Goal: make **Controlled Stub** a genuinely distinct, mode-driven, environment-independent stage using an explicit action contract on the existing orchestrator. Keep **One Real Email** locked. Certify stub only. Then run one connected Preview → Dry Test → Controlled Stub pass and report evidence.

## Scope (in)
- Single orchestrator (`comm-hub-controlled-live-test`) — add explicit `action` field.
- New DB certification_kind on existing controlled-live certification.
- New `ControlledStubPanel.tsx` (React only; no new orchestrator).
- Rename existing panel to `OneRealEmailPanel.tsx`, keep locked.
- Wire Go Live Step 5 → ControlledStubPanel; Step 6 → OneRealEmailPanel (locked).
- Tests + typecheck + build. Then one connected certification run.

## Scope (out)
- Do NOT implement/execute `SEND_ONE_REAL_EMAIL`. Reject it at the orchestrator with `one_real_email_locked` for this task.
- Do NOT create a parallel edge function.
- Do NOT change Dry Run, Preview, or Mode card logic beyond removing the silent DRY_RUN→CONTROLLED_LIVE transition inside the orchestrator.

## Slice A — Backend contract & mode discipline

1. **Orchestrator input contract** (`supabase/functions/comm-hub-controlled-live-test/index.ts`)
   - Add `action: "RUN_CONTROLLED_STUB" | "SEND_ONE_REAL_EMAIL"` (required).
   - Back-compat: if legacy `allowRealEmail` present, map to action and append a `deprecation_warnings` entry; if `action` is present it wins.
   - `SEND_ONE_REAL_EMAIL` → return BLOCKED with `one_real_email_locked` (no execution, no grant).
   - For `RUN_CONTROLLED_STUB`:
     - Do NOT read `COMM_HUB_PROVIDER_MODE`, `COMM_HUB_REAL_EMAIL_TEST`, `COMMUNICATION_HUB_EMAIL_LIVE`. Provider adapter is hard-selected to the deterministic simulator by action.
     - Require current operating mode already = `CONTROLLED_LIVE`. If `DRY_RUN`, return BLOCKED `mode_not_controlled_live` — do NOT call `set_communication_operating_mode` / auto-transition. Do NOT restore mode on exit.
     - Preserve all existing revalidation preflight (Emergency Stop, preview approval, snapshot binding, config/policy versions, one-recipient, no CC/BCC, no conflicting execution).

2. **Response envelope** — return separate authoritative fields:
   - `action_used = "RUN_CONTROLLED_STUB"`
   - `provider_mode_used = "stub"`
   - `provider_adapter_invoked: boolean`
   - `external_provider_call_attempted: boolean` (always `false` for stub)
   - `real_email_authorised: false`
   - **Redefine** legacy `provider_call_attempted` to mean *external provider network call attempted* → `false` for stub.
   - Include `certification_kind` when certification is issued.

3. **DB migration** — add `certification_kind` typed column on `communication_controlled_live_certification`:
   - Enum: `('CONTROLLED_STUB','ONE_REAL_EMAIL')`, default `CONTROLLED_STUB` (backfill existing rows to `CONTROLLED_STUB` — they were all stub).
   - Update `record_controlled_live_certification` RPC to accept and require `p_certification_kind`.
   - Update `get_controlled_live_certification` to surface it.
   - Add index for filtering by `(certification_kind, status)`.

4. **Post-provider evidence reread** — after simulator response, reread from DB:
   execution, grant (consumed), request, recipients=1, messages=1, attempts=1, attempt marked `attempt_type='controlled_live'` + `provider_status` in simulator set, dispatcher revalidation exists, cleanup ok, final mode = CONTROLLED_LIVE. Fail closed with new blocker codes.

5. **Idempotency** — idempotency key already scoped to execution; ensure terminal replay returns existing evidence with `idempotent_replay=true` and same identifiers; make sure no row-count deltas on replay.

## Slice B — Client contract & types

Files:
- `src/platform/communication-hub/controlledLiveTestService.ts` — split into `runControlledStubTest()` (action=RUN_CONTROLLED_STUB) and a stubbed `sendOneRealEmailTest()` that just calls the locked action. Keep legacy `runControlledLiveTest` as thin wrapper mapping to stub for one release.
- New `ControlledStubResult` type with `actionUsed`, `providerModeUsed`, `providerAdapterInvoked`, `externalProviderCallAttempted`, `realEmailAuthorised`, `certificationKind`, plus existing fields.
- Zod schema updated for the new envelope, including deprecation_warnings.

## Slice C — UI split

1. **New `src/pages/admin/communicationHub/controlCenter/ControlledStubPanel.tsx`**
   - Inherits event, template, sender, masked recipient from Go Live state (props). Does NOT reload recipient policy or ask for another recipient.
   - Copy per spec: "Run Controlled Stub", "provider simulator", "No external email will be sent".
   - Reason input + simulation acknowledgement checkbox + optional typed phrase `RUN CONTROLLED STUB TEST` (never the old phrase).
   - Result panel: Passed/Failed, External email sent: No, Simulator invoked, External provider called: No, exec no, request no, delivery attempt evidence, dispatcher revalidation, grant status, cleanup, certification status + kind, final operating mode, next action. UUIDs collapsed under "Advanced evidence".
   - No inbox verification, no Received/Not received controls.

2. **Rename** `ControlledLivePanel.tsx` → `OneRealEmailPanel.tsx` (shared subcomponents extracted to `controlCenter/_shared/` — result rows, evidence table, blocker list). Panel remains locked; button disabled with "Locked — requires CONTROLLED_STUB certification" message. Update all imports.

3. **GoLivePage.tsx**
   - Step 5 renders `ControlledStubPanel`.
   - Step 6 renders `OneRealEmailPanel`. Gate on presence of a valid `certification_kind='CONTROLLED_STUB'` for the current event/recipient/version tuple (still surfaced as locked; unlock not implemented in this task).
   - Removes the current dependency on `provider_call_attempted=true` from Step 5 completion; replace with `providerAdapterInvoked && !externalProviderCallAttempted && certificationKind==='CONTROLLED_STUB'`.

4. **useStageReadiness.ts** — update Step 5/6 lock reasons: Step 5 requires `operating_mode=CONTROLLED_LIVE`; Step 6 requires `stub_certification_present`.

## Slice D — Tests

Add / update under `src/__tests__/comm-hub/` and `src/platform/communication-hub/__tests__/`:

Static (grep-based) contract tests over the orchestrator source:
- No `Deno.env.get("COMM_HUB_PROVIDER_MODE")` on the RUN_CONTROLLED_STUB path.
- No `COMM_HUB_REAL_EMAIL_TEST` / `COMMUNICATION_HUB_EMAIL_LIVE` reads.
- No `set_communication_operating_mode` call from the orchestrator.
- Presence of `action_used`, `provider_adapter_invoked`, `external_provider_call_attempted`, `certification_kind`.

Behavioural (mocked supabase):
- Stub requires CONTROLLED_LIVE; DRY_RUN returns `mode_not_controlled_live` and creates 0 rows.
- Simulator invoked once; exactly one execution/grant/request/recipient/message/attempt/certification (assert via mock call counts + returned identifiers).
- Legacy `provider_call_attempted` is false; `external_provider_call_attempted` false; `provider_adapter_invoked` true.
- Replay with same idempotency key returns identical IDs and `idempotent_replay=true`.
- `SEND_ONE_REAL_EMAIL` returns `one_real_email_locked` with no side effects.
- Certification row carries `certification_kind='CONTROLLED_STUB'`.

UI:
- `ControlledStubPanel` renders no "Send", no "inbox verification", no "Received/Not received"; primary CTA text `Run Controlled Stub`; typed phrase (if used) is `RUN CONTROLLED STUB TEST`.
- `OneRealEmailPanel` is locked; CTA disabled; shows required certification kind.
- Go Live Step 5 uses ControlledStubPanel; Step 6 uses OneRealEmailPanel locked.

## Slice E — Verification & connected run

1. `tsgo --noEmit` — 0 errors.
2. `bunx vitest run src/__tests__/comm-hub src/platform/communication-hub/__tests__` green.
3. `bun run build` green.
4. Connected certification via Go Live UI (`/admin/communication-hub/go-live`) with the currently selected test event and its approved recipient:
   - Switch to Safe Testing → Select event → Check Everything → Prepare Preview → Approve Preview → Run Dry Test → Switch to Controlled Testing → Run Controlled Stub → reread durable evidence.
   - Do NOT proceed to Step 6.
5. Report: module/event, masked recipient, snapshot+approval IDs, dry-test cert ID, stub exec no, grant status, request no, counts, `provider_mode_used`, `provider_adapter_invoked`, `external_provider_call_attempted`, cleanup, final mode, certification ID + kind, replay result, row-count deltas.

## Result codes returned to you
- `GL_NOW_CONTROLLED_STUB_CERTIFIED` — connected stub run passed and reread.
- `GL_NOW_CONTROLLED_STUB_READY` — code/tests green, connected run blocked by missing event/recipient/permission.
- `NO_GO` — any safety, idempotency, evidence, or external-call requirement incomplete.

## Technical notes

- Files touched:
  ```text
  supabase/functions/comm-hub-controlled-live-test/index.ts   (action contract, mode gate, envelope)
  supabase/migrations/<new>.sql                                (certification_kind column + backfill + RPC updates)
  src/platform/communication-hub/controlledLiveTestService.ts (split fns, new types, zod)
  src/pages/admin/communicationHub/controlCenter/
      ControlledStubPanel.tsx                                  (new)
      OneRealEmailPanel.tsx                                    (renamed from ControlledLivePanel.tsx, locked)
      _shared/*.tsx                                            (extracted rows/evidence/blockers)
  src/pages/admin/communicationHub/goLive/GoLivePage.tsx      (Step 5/6 wiring, completion criteria)
  src/platform/communication-hub/useStageReadiness.ts         (lock reasons)
  src/__tests__/comm-hub/* + platform/communication-hub/__tests__/*  (new + updated)
  ```
- Backward compat: legacy `allowRealEmail` accepted for one release with deprecation warning surfaced in envelope; `runControlledLiveTest` client wrapper maps to stub only.
- Idempotency scope for stub run is the existing `(execution, idempotency_key)` unique index; no new dedupe key.
- All new blocker codes: `one_real_email_locked`, `mode_not_controlled_live`, `stub_provider_route_violation`, `stub_evidence_incomplete`, `stub_certification_kind_mismatch`.

Awaiting approval before I start Slice A.
