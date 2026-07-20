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
