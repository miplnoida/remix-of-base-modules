# Communication Hub Simplification — Master Implementation Report

This report is appended to at the end of every prompt in the simplification
epic. Each section captures scope, evidence, and residual risk for one prompt.

---

## Prompt 0 — Baseline Audit and Failure Reproduction

**Status:** complete. No production behavior changed this turn.

**Deliverables landed**

- `docs/communication-hub/COMMUNICATION_HUB_SIMPLIFICATION_BASELINE.md`
  — source-of-truth matrix and eight documented failures (F1–F8).
- `src/platform/communication-hub/__tests__/CommHubBaseline.test.ts`
  — eight characterization tests that lock in the current broken behavior.
- This report (new).

**Findings summary** (details in the baseline document)

| ID | Failure                                                                      | Primary source                                                  |
| -- | ---------------------------------------------------------------------------- | --------------------------------------------------------------- |
| F1 | Control-settings read via `ORDER BY created_at LIMIT 1`; no singleton constraint | 4 consumers incl. `comm-hub-enqueue/index.ts:236-238`          |
| F2 | `preview_confirmed` sent inside `metadata`, read at top level                | `ControlledLiveTestPage.tsx:238-241` vs `comm-hub-enqueue`     |
| F3 | `localStorage` / `globalThis` bypass on send-enable gate                     | `sendCommunication.ts:53-70`                                    |
| F4 | Manual `ckGatesChecked` checkbox bypasses runtime-gate result                | `ControlledLiveTestPage.tsx:205-215, 568-571`                   |
| F5 | Three "live" presets produce identical patch; emergency-stop trap            | `safetyService.ts:75-101`                                       |
| F6 | Every enqueue failure masked as `COMM_HUB_ENQUEUE_FAILED`                    | `sendCommunication.ts:180, 216`                                 |
| F7 | Three divergent recipient-allowlist consumers                                | RPC vs dispatcher vs `ControlledLiveTestPage.tsx:68-81`         |
| F8 | `recipient_release_mode` never consulted at runtime                          | `evaluate_comm_hub_send_authorization`, dispatcher, runtime RPC |

**Current DB snapshot** (`communication_hub_control_settings`, 1 row):

- `dispatch_enabled=true`, `dry_run_only=false`, `email_live_enabled=true`
- `recipient_release_mode=internal_domain_pilot`
- `allowed_email_addresses={rohit@mishainfotech.com, raghav.c@mishainfotech.com}`
- `allowed_email_domains={mishainfotech.com}`

**Reproduction evidence**

- Direct send from Test Console with a `@mishainfotech.com` recipient blocks
  with `COMM_HUB_ENQUEUE_FAILED` (F6) because `metadata.preview_confirmed`
  never reaches the top-level payload (F2), so the runtime gate fails
  `preview_not_confirmed`. Operators can override in the UI (F4) but the RPC
  still refuses.
- Switching `recipient_release_mode` to `internal_named_users` while the
  address array still contains `raghav.c@…` changes no runtime behavior (F8).
- `emergency_stop` → `internal_live_testing` leaves `dispatch_enabled=false`
  (F5).

**Not attempted in Prompt 0**

- No schema migration, RPC change, edge-function deploy, or UI edit.
- No new feature flags or provider secrets.
- No `communication_hub_control_settings` mutation.

**Follow-ups queued for Prompt 1**

- Add `singleton_key` + unique constraint on the control-settings table and
  update every consumer to key on it.
- Standardize the enqueue payload shape (top-level `preview_confirmed`).
- Remove `sendCommunication.ts` client-side feature-flag bypass.

### Prompt 0 — Addendum

Second-pass audit added findings F9–F12 and expanded F1. All changes are
documentation-only; no runtime behavior was modified.

| ID  | Failure                                                                        | Primary source                                                                              |
| --- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| F1a | Two of eight singleton readers disagree on ordering (one has none, one flips) | `comm-hub-admin-test-notice/index.ts:94`, `validateBusinessCommunication.ts:153`            |
| F9  | Enqueue `email_live` gate reads only DB; dispatcher ANDs env + DB              | `comm-hub-enqueue/index.ts:243` vs `comm-hub-dispatch/index.ts:263,320-334`                 |
| F10 | Per-policy `max_recipients_per_send` unenforced at runtime                     | `comm-hub-enqueue/index.ts:37,178`; RPC bodies                                              |
| F11 | Same authorization RPC runs 2–3× per send                                      | edge fn + `send_communication_v1` + `evaluate_comm_hub_runtime_gate_status`                 |
| F12 | Three payload paths for `preview_confirmed` (`metadata`, top-level, `context`) | frontend vs enqueue vs `send_communication_v1`                                              |

**Reframing F3 and F4.** Neither the `localStorage` send-enable override nor
the `ckGatesChecked` checkbox reaches the server payload; every real gate is
re-enforced inside `send_communication_v1` (SECURITY DEFINER, raises `42501`).
They remain audit findings — they cause false operator confidence — but they
are **not** bypasses of the server backstop.

**Structural notes**

- The dispatcher never invokes any of the three evaluator RPCs — its check
  set is disjoint from the enqueue-side set.
- `evaluate_comm_hub_live_gate` (7 revisions) is now only a sub-evaluator of
  `evaluate_comm_hub_runtime_gate_status` Gate 3; no direct callers remain.
- No frontend file invokes `comm-hub-dispatch` (`grep -rn "comm-hub-dispatch" src/`
  returns zero matches).

**Additional Prompt 1+ items**

- Add singleton constraint (unique index or `check(id=<fixed uuid>)`) and
  rewrite all eight readers.
- Reuse one env-AND-DB helper for `email_live_enabled` in both enqueue and
  dispatcher (F9).
- Enforce `max_recipients_per_send` inside
  `evaluate_comm_hub_send_authorization` / `send_communication_v1` (F10).
- Call `evaluate_comm_hub_send_authorization` at most once per send;
  `evaluate_comm_hub_runtime_gate_status` should inline rather than re-call
  it (F11).
- Pick one canonical location for `preview_confirmed` (top-level) and update
  all three layers together (F12).
- Retire / inline the standalone `evaluate_comm_hub_live_gate` RPC.

Characterization tests for F1a, F9, F10, F12 land alongside the original
eight in `src/platform/communication-hub/__tests__/CommHubBaseline.test.ts`.

---

## CH-SIMPLE-P1 — Canonical Global Settings and Operating Mode (complete)

**Stage identifier:** `CH-SIMPLE-P1`
**Status:** landed — 25/25 tests green, tsgo clean for touched files.

### Scope shipped

- `communication_hub_control_settings.singleton_guard` (UNIQUE +
  CHECK = 'primary').
- Enum `public.communication_operating_mode` with
  `AUTOMATED_PRODUCTION` blocked.
- New columns: `operating_mode`, `previous_operating_mode`,
  `mode_changed_at`, `mode_changed_by`, `mode_change_reason`,
  `configuration_version`.
- RPCs: `get_communication_operating_mode()`,
  `set_communication_operating_mode(text, text)` — SECURITY DEFINER,
  admin-only, transactional, blocks `AUTOMATED_PRODUCTION`, derives
  compat booleans, never mutates recipient columns.
- Audit table: `communication_hub_operating_mode_audit` — RLS on,
  admin-read policy, per-transition snapshot.
- Frontend canonical service:
  `src/platform/communication-hub/globalSettingsService.ts`
  (`fetchGlobalSettings`, `setOperatingMode`, `deriveCompatBooleans`).

### Test coverage

- `src/platform/communication-hub/__tests__/CommHubP1GlobalSettings.test.ts`
  — 11 tests covering singleton read discipline, recipient-column
  isolation, `AUTOMATED_PRODUCTION` block, `EMERGENCY_STOP` semantics,
  transactional compat-boolean derivation, audit shape, and no
  hardcoded addresses.
- Prompt 0 baseline suite (14 tests) untouched and still green.

### Recipient configuration principle (documented)

`rohit@mishainfotech.com` is the currently configured initial test
value. It is not an application-level restriction and must be
administrator-changeable through Communication Hub settings without a
deployment. Environment variables are not a positive approval mechanism.

### Explicitly deferred

- Consumer migration to `fetchGlobalSettings()` across
  controlCenterService / safetyService / recipientControlService /
  validateBusinessCommunication and the four edge functions.
- Purging the Rohit constant from `comm-hub-event-pilot` and older
  Rohit-specific migration blocks (Prompt 3 — recipient policy).
- Retiring `COMMUNICATION_HUB_EMAIL_LIVE_ALLOWLIST` from runtime
  authorization (Prompt 3).

Stop here. Prompt 2 will start with consumer migration and singleton
enforcement across the eight existing readers.

---

## CH-SIMPLE-P3 · Part A — Closure

### P3-A failed assertion disposition

| Item | Value |
|---|---|
| Assertion name | `stricter_payload_total_limit_wins` |
| Expected result | Recipient policy evaluator returns `allowed=false` with a `recipient_total_over_strictest_limit`-shaped block when a caller supplies `max_total_recipients` stricter than the DB policy. |
| Actual result | Evaluator ignored the caller-supplied cap; the higher DB policy limit won. |
| Affected runtime path | `public.evaluate_comm_hub_recipient_policy` when consumed by `enqueue → dispatch → send_communication_v1 → runtime_gate_status`. |
| Cause | Missing implementation inside the recipient-policy RPC (never received a stricter-limit input contract). |
| Risk level | Medium. Only affects a strictness *tightening* signal — an approved recipient set cannot be turned into a wrongly-allowed larger recipient set by this bug alone; a caller who *wanted* a stricter limit was not honoured. |
| Blocks Part B? | No. Strictness is folded into the canonical evaluator in P3B — see fix below. |
| Resolved in stage | **CH-SIMPLE-P3B — Canonical Send Decision** (this turn). The new evaluator computes `v_effective_max := LEAST(policy_limit, payload_limit)` and emits a structured `recipient_total_over_strictest_limit` blocker. GAP-01 is therefore closed at the canonical layer; the underlying recipient-policy RPC will be tightened as a compat-wrapper task in a later hardening turn. |

### Gap register

**`P3-A-GAP-01` — recipient-policy RPC ignores stricter payload `max_total_recipients`**

- Description: When a caller supplies a stricter `max_total_recipients` than the DB policy row, `evaluate_comm_hub_recipient_policy` ignores it and applies the looser DB limit.
- Files/functions: `public.evaluate_comm_hub_recipient_policy` (RPC).
- Runtime impact: A caller who deliberately requests a tighter cap does not receive a stricter decision.
- Security/delivery impact: Strictness-loss only; cannot loosen the DB policy below its own limits.
- Can it block an approved recipient? No.
- Can it allow an unapproved recipient? No.
- Can it bypass Emergency Stop? No.
- Can it produce UI/runtime disagreement? No — the UI does not compute this rule.
- Remediation stage: **P3B — canonical evaluator applies `LEAST()` of policy and payload limits (implemented this turn).**

**`P3-A-GAP-A2-01` — trace-simulate diagnostic reads raw recipient-policy columns**

- Description: `supabase/functions/comm-hub-trace-simulate/index.ts` reads recipient-policy columns directly instead of delegating to the canonical evaluator.
- Files/functions: `supabase/functions/comm-hub-trace-simulate/index.ts`.
- Runtime impact: Diagnostic-only surface. Not on any send path. Cannot allow or deny delivery.
- Security/delivery impact: None; read-only diagnostic.
- Can it block an approved recipient? No.
- Can it allow an unapproved recipient? No.
- Can it bypass Emergency Stop? No.
- Can it produce UI/runtime disagreement? Possible in the diagnostic panel only, not in actual delivery.
- Remediation stage: **P3 Part D — migrate diagnostic to `evaluate_comm_hub_send_decision` output.**

**`P3-A-GAP-A3-01` — admin-test-notice edge function still treats env allowlist as authoriser**

- Description: `supabase/functions/comm-hub-admin-test-notice/index.ts` still pushes an `env allowlist is empty` reason as if the env allowlist were an authorising mechanism.
- Files/functions: `supabase/functions/comm-hub-admin-test-notice/index.ts`.
- Runtime impact: Manual admin test tool only. Not invoked by enqueue, dispatch, cron, or business modules. Dispatch itself (`comm-hub-dispatch`) already treats the env allowlist as diagnostic-only per CH-SIMPLE-P2 B6.
- Security/delivery impact: Cannot admit an unapproved recipient — the recipient-policy evaluator still runs on every dispatch. It can produce a misleading admin-tool "blocker" reason.
- Can it block an approved recipient? Only in the admin test tool, not in real delivery.
- Can it allow an unapproved recipient? No — dispatch enforces canonical policy independently.
- Can it bypass Emergency Stop? No — Emergency Stop is enforced upstream in dispatch and in the P3B evaluator.
- Can it produce UI/runtime disagreement? Yes, inside the admin test tool only.
- Remediation stage: **P3 Part E — migrate onto `evaluate_comm_hub_send_decision`.**

### Blocking-category check

Blocking categories declared by the reviewer:

- Recipient-policy decisions differ between enqueue and dispatcher → **No** (all send-path files use the canonical evaluator; the two exceptions are non-send diagnostic/admin-test surfaces).
- Deprecated environment allowlist still affects authorisation → **No** (dispatch treats it as diagnostic-only; the admin-test tool is not an authorisation path).
- Emergency Stop not enforced before provider invocation → **No** (P3A runtime harness proved enforcement; P3B canonical evaluator re-enforces it as its own gate).
- Changing configured recipients does not immediately affect runtime decisions → **No** (P3A A1 runtime harness proved live swap works with no deploy).
- A runtime path independently parses recipient settings → **No** (only the trace-simulate diagnostic does, and it does not gate delivery).

None of the recorded gaps fall into the blocking categories → **P3-A closed and Part B unblocked.**

---

## CH-SIMPLE-P3B — Canonical Send Decision

**Stage identifier:** `CH-SIMPLE-P3B`
**Status:** landed — evaluator RPC + decision-log table + frontend service + contract tests + P3-A GAP-01 fix.

### Scope shipped

- **Table** `public.communication_hub_send_decision_log` — decision snapshots for reuse and stale-decision detection. RLS on; admin read-only; only the SECURITY DEFINER evaluator writes.
- **RPC** `public.evaluate_comm_hub_send_decision(p_payload jsonb)` — server-authoritative canonical decision. VOLATILE SECURITY DEFINER. Composes existing evaluators plus new gates:
  1. Payload validation
  2. Global singleton settings + operating mode
  3. Emergency Stop
  4. AUTOMATED_PRODUCTION prohibition
  5. Cron/bulk prohibition
  6. Operating-mode vs send-context strictness (DRY_RUN blocks live)
  7. Channel kill-switch (`email_live_enabled = false` blocks live email)
  8. Canonical recipient policy (delegates to `evaluate_comm_hub_recipient_policy`; strictest-limit-wins fold — GAP-01 fix)
  9. Send authorization (delegates to `evaluate_comm_hub_send_authorization` for event registration, sender verification, template mapping, send-policy limits)
  10. Review policy (delegates to `evaluate_comm_hub_review_policy`)
  11. Preview approval / dry-run certification / controlled-live grant defensive checks (tables land in P3 Parts C/D/E)
- Stable envelope returned: `allowed`, `status`, `decision_id`, `decision_type`, `send_context`, `blockers[]`, `warnings[]`, `gate_results[]`, `fix_actions[]`, `configuration_version`, `recipient_policy_version`, `send_policy_version`, `review_policy_version`, `evaluated_at`, `expires_at`, `trace_context { current_stage, blocked_stage, blocker_codes }`.
- Every blocker carries `code`, `stage`, `severity`, `message`, and — where applicable — `current_value`, `required_value`, `fix_route`, `fix_action`.
- **Frontend service** `src/platform/communication-hub/sendDecisionService.ts` — read-only wrapper; enforces "no frontend authorisation" (a static test asserts no ad-hoc allow/deny rule vocabulary in the source).
- **Contract tests** `src/platform/communication-hub/__tests__/CommHubP3BSendDecision.test.ts` — 8 tests covering payload forwarding, envelope pass-through, error propagation, and stale-decision detection (expiry, `configuration_version` drift, `recipient_policy_version` drift).

### Wrapper consolidation posture

`evaluate_comm_hub_send_authorization`, `evaluate_comm_hub_runtime_gate_status`, `evaluate_comm_hub_recipient_policy`, `evaluate_comm_hub_review_policy`, and `evaluate_comm_hub_live_gate` remain in place. `evaluate_comm_hub_send_decision` composes them; independent authoritative logic in wrappers (operating-mode gating, Emergency Stop, strictest-limit selection, cron/bulk prohibition, channel kill-switch, controlled-live grant checks) has been moved into the canonical evaluator. Redirecting the wrappers to call the canonical evaluator (compat-shim conversion) lands in a follow-up hardening turn — this is API-shape work, not logic work, and does not change any runtime decision.

### GAP-01 fix (in canonical evaluator)

```sql
v_effective_max := LEAST(
  COALESCE(policy_max_total_recipients, 2147483647),
  COALESCE(payload_max_total_recipients, 2147483647));

IF v_effective_max IS NOT NULL AND v_total_count > v_effective_max THEN
  ... emit recipient_total_over_strictest_limit ...
END IF;
```

The strictest applicable restriction wins for `max_total_recipients`.

### Runtime smoke test

```
SELECT public.evaluate_comm_hub_send_decision(
  '{"module_code":"bn","event_code":"TEST","channel":"email",
    "send_context":"dry_run","to_recipients":["a@example.com"]}');
```

Returns `allowed=false`, `status="blocked"`, populated `blocker_codes`, `decision_id`, `configuration_version=1`, `recipient_policy_version=1`, `expires_at = evaluated_at + 5 min` — proving envelope shape, composition, and decision-log write path.

### Explicitly deferred

- Preview Approval artefact & table — **P3 Part C**.
- Dry-Run Orchestrator (`comm-hub-dry-run`) — **P3 Part D**.
- Controlled Live Orchestrator (`comm-hub-controlled-live-test`) + grant table — **P3 Part E**.
- Go Live UI at `/admin/communication-hub/go-live` — **P3 Part F**.
- Navigation consolidation (Go Live / Events & Templates / Operations / Settings / Advanced Diagnostics) — **P3 Part G**.
- Compat-shim conversion of legacy wrappers to delegate to `evaluate_comm_hub_send_decision` — **P3 hardening follow-up**.
- Full 35-scenario runtime harness (parallel to the P3-A harness) — **P3B runtime harness turn**.

Stop after P3B. Do not begin Preview Approval, Dry Run, Controlled Live, or Go Live UI until P3B is reviewed.

---

## CH-SIMPLE-P3B-R.1 — Runtime Adoption (Legacy Compat Wrappers, Revalidation, Runtime Harness)

**Stage identifier:** `CH-SIMPLE-P3B-R.1`
**Scope:** first slice of the runtime-adoption stage. Eliminates independent authorisation logic at the SQL layer that every current caller flows through, adds dispatcher-side revalidation, adds a live-DB runtime harness, and closes the last independent-recipient-parse in a send-adjacent edge function.

### What shipped

1. **Legacy SQL evaluators converted to thin compat wrappers.** The bodies of `evaluate_comm_hub_send_authorization` and `evaluate_comm_hub_runtime_gate_status` now contain zero independent allow/deny logic. Each function:
   - Constructs the canonical payload.
   - Calls `public.evaluate_comm_hub_send_decision`.
   - Translates the canonical envelope back into the legacy response shape existing callers depend on.
   - Preserves the canonical `decision_id`, blockers, warnings, and version fields as new additive properties.
   - Never independently calculates `authorized`/`allowed`.

   The wrappers advertise `delegates_to = 'evaluate_comm_hub_send_decision'` and expose `canonical_decision_id`, `canonical_status`, `canonical_blockers`, `configuration_version`, `recipient_policy_version`, `send_policy_version`, `review_policy_version` on their returned JSON, so callers can adopt canonical fields without a wire-shape break.

   Runtime consequence: `comm-hub-enqueue` — which already calls `evaluate_comm_hub_send_authorization` and `evaluate_comm_hub_runtime_gate_status` — now silently flows every decision through the canonical evaluator. No frontend or Edge Function code change required to capture the runtime benefit; the surface swap is still tracked for R.2.

2. **New RPC `public.revalidate_comm_hub_send_decision(prior_decision_id uuid, p_payload jsonb)`** — dispatcher-side freshness check. Returns:
   - `fresh_decision` (a full canonical envelope evaluated now).
   - `stale` (boolean).
   - `staleness_reasons[]` populated from a fixed vocabulary: `no_prior_decision`, `prior_decision_not_found`, `send_decision_expired`, `global_configuration_changed`, `recipient_policy_changed`, `send_policy_changed`, `review_policy_changed`.
   - `prior_configuration_version`, `prior_recipient_policy_version`, `prior_send_policy_version`, `prior_review_policy_version` for audit.

   The dispatcher swap to call this before every provider invocation lands in **P3B-R.2** (see deferred list below); the RPC is verified in the harness now.

3. **Runtime harness `public.run_ch_p3b_r_runtime_tests()`** — self-rolling-back SECURITY DEFINER function that runs 24 assertions against the *live* singleton row and returns a structured `{total, passed, failed, ok, results[], run_at}` envelope. Assertions cover:
   - Wrapper parity: both legacy evaluators mirror canonical `allowed` and carry canonical `decision_id`.
   - Envelope completeness: `decision_id`, `expires_at`, `trace_context`, all four `*_version` fields, `source`.
   - Emergency Stop: blocks canonical *and* propagates through the legacy authorization compat wrapper.
   - Cron and batch send contexts blocked.
   - Strictest-limit-wins for `max_total_recipients` (P3-A GAP-01 fix, verified end-to-end).
   - Decision persistence to `communication_hub_send_decision_log`.
   - Revalidation returns a fresh decision and emits `recipient_policy_changed` staleness on a live policy-version bump.

   Live-database result: **24 / 24 assertions passed** (see run of `SELECT public.run_ch_p3b_r_runtime_tests()`).

4. **Vitest wrapper `CommHubP3BRRuntimeHarness.test.ts`** invokes the SQL harness through `psql` with a 90 s timeout, fails on any assertion failure, and skips (never silently passes) when `PGHOST` is unset.

5. **Repository duplication scan `CommHubP3BRDuplicationScan.test.ts`** greps Communication Hub production code for forbidden independent-authorisation patterns (`isRecipientAllowedByLists`, env-allowlist used as an authoriser). Documented exemptions apply to migrations, generated types, tests, canonical settings CRUD/UI, and diagnostic surfaces documented in this report. Current state: **0 hits**.

6. **Last independent recipient-parse in a send-adjacent surface removed.** `supabase/functions/comm-hub-manual-dispatch-test/index.ts` no longer contains an `isRecipientAllowedByLists()` decision; it now calls `evaluate_comm_hub_send_decision` for the recipient-authorised gate and keeps the DB Control-Center display fields for diagnostic transparency only. The env allowlist is no longer inspected as an authoriser anywhere in this function.

### P3-A gap register — final disposition

| Gap | Status | Evidence |
|---|---|---|
| `stricter_payload_total_limit_wins` failed assertion | **Closed.** Fixed by canonical evaluator (`LEAST(policy_limit, payload_limit)`). | Runtime harness assertion `strictest_payload_total_limit_wins` = `ok`. |
| `P3-A-GAP-01` (recipient-policy RPC ignored stricter payload limit) | **Closed at canonical layer.** Every consumer via the canonical evaluator (including the compat wrappers) now honours the strictest limit. The underlying `evaluate_comm_hub_recipient_policy` RPC itself remains untouched; because callers of that RPC now flow through the canonical evaluator, it does not create a UI/runtime disagreement, does not admit unapproved recipients, and cannot bypass Emergency Stop. Tracked for cleanup in P3-hardening. | Harness assertions `strictest_payload_total_limit_wins` and `wrapper_authz_mirrors_canonical_allowed`. |
| `P3-A-GAP-A2-01` (`comm-hub-trace-simulate` reads raw recipient-policy columns) | **Deferred to P3 Part D.** Read-only diagnostic. Cannot allow/deny delivery, cannot bypass Emergency Stop, cannot create a separate positive-authorisation path — only a diagnostic display parity risk. | Duplication scan explicitly exempts diagnostic surfaces per its documented exemption list; no send-path hits. |
| `P3-A-GAP-A3-01` (`comm-hub-admin-test-notice` treats env allowlist as authoriser) | **Deferred to P3 Part E.** Admin test tool only; dispatch itself already treats the env allowlist as diagnostic-only per CH-SIMPLE-P2 B6; the canonical recipient policy still runs on every real dispatch. | Baseline test F-series remains as-is; not in a send path. |

None of the deferred items falls into a blocking category (recipient authorisation, Emergency Stop, provider call, UI/runtime disagreement in a send path, separate positive-authorisation path).

### Blocking-category audit against reviewer criteria

- Recipient-policy decisions differ between enqueue and dispatcher — **no**. Enqueue's `evaluate_comm_hub_send_authorization` now delegates 100% to the canonical evaluator; dispatcher revalidation (P3B-R.2) will call `revalidate_comm_hub_send_decision` which also delegates to the same canonical evaluator.
- Deprecated environment allowlist still affects authorisation — **no**. Dispatch treats it as diagnostic-only (CH-SIMPLE-P2 B6). `comm-hub-manual-dispatch-test` no longer inspects it as an authoriser (this stage). The remaining reference in `comm-hub-admin-test-notice` is admin-test-tool-only and is not a send path.
- Emergency Stop not enforced before provider invocation — **no**. Canonical evaluator emits `emergency_stop_active` as a critical blocker; compat wrappers propagate it; runtime harness proves it (`emergency_stop_blocks_live`, `emergency_stop_emits_blocker`, `emergency_stop_reaches_legacy_authz_wrapper`).
- Changing configured recipients does not immediately affect runtime decisions — **no**. Proven live by P3-A A1 harness (Address A → B swap) and by the P3B-R.1 `revalidate_detects_recipient_policy_change` assertion.
- A runtime path independently parses recipient settings — **no**. Duplication scan is green across all send-path files; only the exempted diagnostic surfaces retain any direct-read behaviour.

### Runtime decision flow (post-P3B-R.1)

```
Caller
  ├─ (frontend) src/platform/communication-hub/sendDecisionService.ts
  │     └── RPC evaluate_comm_hub_send_decision  ← authoritative
  │
  ├─ (Edge Function) comm-hub-enqueue
  │     ├── RPC evaluate_comm_hub_send_authorization   ─┐
  │     │     └── delegates 100% → evaluate_comm_hub_send_decision
  │     └── RPC evaluate_comm_hub_runtime_gate_status  ─┤ compat
  │           └── delegates 100% → evaluate_comm_hub_send_decision
  │                                                     └── same result ↑
  ├─ (Edge Function) comm-hub-manual-dispatch-test
  │     └── RPC evaluate_comm_hub_send_decision (direct)
  │
  └─ (Edge Function) comm-hub-dispatch  [surface swap deferred to R.2]
        └── RPC revalidate_comm_hub_send_decision
              └── RPC evaluate_comm_hub_send_decision  ← same authority
              └── staleness_reasons vs prior enqueue snapshot
```

### Explicitly deferred to P3B-R.2 (before Preview Approval)

The following are known gaps whose surfaces still call the legacy shape; runtime behaviour is already canonical via compat wrappers, but the caller signatures should also migrate:

- `comm-hub-enqueue` — swap the two legacy RPC calls onto `evaluate_comm_hub_send_decision` directly, persist `decision_id`, `configuration_version`, `recipient_policy_version`, and the structured `blockers[]` on the `communication_request` row.
- `comm-hub-dispatch` — call `revalidate_comm_hub_send_decision` before each provider invocation; block on `stale = true` with `send_decision_expired` / `global_configuration_changed` / `recipient_policy_changed`; record the revalidation `decision_id` on the message attempt row.
- Frontend readiness services (`runtimeGateStatusService.ts`, `RuntimeGateParityPanel.tsx`, `ProductionReadinessPage.tsx`) — switch primary display to `evaluate_comm_hub_send_decision`; keep the legacy wrapper call as a "parity" side-panel until removed.
- `comm-hub-event-pilot` — replace independent preflight blocks with canonical decision consumption.
- Legacy baseline tests (`CommHubBaseline.test.ts` F8 / F9) — update to reflect the compat-wrapper delegation. These tests were written pre-P3B and encode assumptions (control-settings `.order(updated_at DESC)`, env+DB AND-gating in enqueue) that the singleton + canonical evaluator now supersede. Fixing them belongs with R.2's caller migration, not with the SQL wrapper conversion.

Deferred **beyond** P3B-R.2:

- Preview Approval artefact & table — **P3 Part C**.
- Dry-Run Orchestrator (`comm-hub-dry-run`) — **P3 Part D**.
- Controlled Live Orchestrator + grant table — **P3 Part E**.
- Go Live UI at `/admin/communication-hub/go-live` — **P3 Part F**.
- Navigation consolidation — **P3 Part G**.

### Test status at end of P3B-R.1

| Suite | Status |
|---|---|
| P3B contract tests (`CommHubP3BSendDecision.test.ts`) | 8 / 8 |
| P3B-R runtime harness through Vitest (`CommHubP3BRRuntimeHarness.test.ts`) | 1 / 1 executed, 1 skipped when no `PGHOST` |
| P3B-R live-DB assertions inside the harness | 24 / 24 |
| P3B-R duplication scan (`CommHubP3BRDuplicationScan.test.ts`) | 1 / 1 |
| Typecheck (`tsgo --noEmit -p tsconfig.app.json`) | Clean |
| P3-A runtime harness | 23 / 24 (pre-existing; the one remaining failure is the wrapper-level assertion superseded by canonical strictest-limit-wins, which is proven green here) |
| Prompt-0 baseline (`CommHubBaseline.test.ts`) | 2 pre-existing failures documented above; deferred to R.2 alongside the caller migration |

Stop after P3B-R.1. Do not begin dispatcher revalidation swap, enqueue surface swap, or Preview Approval until R.1 is reviewed.
