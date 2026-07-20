# Communication Hub Simplification — Prompt 0 Baseline

Purpose: document the current state of the Communication Hub send-decision layer
before Prompt 1+ simplifications. Everything here is observation only — no code,
schema, or edge-function behavior was modified in this turn.

Scope of audit:
- `src/platform/communication-hub/sendCommunication.ts`
- `supabase/functions/comm-hub-enqueue/index.ts`
- `supabase/functions/comm-hub-dispatch/index.ts`
- `src/pages/admin/communicationHub/controlCenter/*`
- `src/pages/admin/communicationHub/safety/safetyService.ts`
- `src/pages/admin/communicationHub/recipientControl/recipientControlService.ts`
- `src/pages/admin/communicationHub/testing/ControlledLiveTestPage.tsx`
- RPCs `evaluate_comm_hub_send_authorization`,
  `evaluate_comm_hub_runtime_gate_status`,
  `evaluate_comm_hub_live_gate`,
  `resolve_comm_hub_send_policy`,
  `validate_comm_hub_recipient_release_mode`
- Table `communication_hub_control_settings`

## 1. Source-of-truth matrix

| Decision                         | Consumer                                        | Source of truth (as-is)                                                                                                       |
| -------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Global send enabled              | `sendCommunication.ts:53-70`                    | Env vars **plus** `localStorage.commHub.sendEnabled` **plus** `globalThis.__COMMUNICATION_HUB_SEND_ENABLED__` (client override) |
| Dispatcher enabled               | `comm-hub-dispatch/index.ts:200`, RPC send-auth | `communication_hub_control_settings.dispatch_enabled` (first row by `created_at`)                                             |
| Dry-run only                     | RPC send-auth, dispatcher                       | `communication_hub_control_settings.dry_run_only`                                                                             |
| Live email enabled               | Dispatcher                                      | `communication_hub_control_settings.email_live_enabled`                                                                       |
| Recipient allowlist (per-event)  | RPC `evaluate_comm_hub_send_authorization`      | `communication_hub_event_send_policy.allowed_internal_domains` / `.allowed_external_domains`                                  |
| Recipient allowlist (dispatcher) | `comm-hub-dispatch/index.ts:264-340`            | `COMMUNICATION_HUB_EMAIL_LIVE_ALLOWLIST` env, **falls back to** DB `allowed_email_addresses` / `allowed_email_domains`        |
| Recipient allowlist (test UI)    | `ControlledLiveTestPage.tsx:68-81`              | DB `allowed_email_addresses` **and** `allowed_email_domains`, ignoring `recipient_release_mode`                               |
| `recipient_release_mode`         | UI only (metadata)                              | Never read at runtime — no evaluator consults it (validator trigger only checks it on write)                                  |
| Preview confirmation             | `evaluate_comm_hub_runtime_gate_status`         | Top-level `payload.preview_confirmed`                                                                                         |
| Preview confirmation (frontend)  | `ControlledLiveTestPage.tsx:239-240`            | Nested under `metadata.preview_confirmed` and `metadata.review_context.preview_confirmed`                                     |
| Runtime gate result → UI action  | `ControlledLiveTestPage.tsx:569`                | Manual checkbox `ckGatesChecked` (does not read the parity panel's actual result)                                             |
| Control-settings singleton       | 4+ consumers                                    | `ORDER BY created_at ASC LIMIT 1` — no unique or singleton_key constraint                                                     |

## 2. Identified failures (Prompt 0 targets)

Every finding cites file paths and line ranges verified during this audit.

### F1 — Non-singleton control-settings read

- `supabase/functions/comm-hub-enqueue/index.ts:236-238`
- `supabase/functions/comm-hub-dispatch/index.ts:198-201`
- `src/pages/admin/communicationHub/controlCenter/controlCenterService.ts:76-86`
- RPC `evaluate_comm_hub_send_authorization` (pg_proc): `SELECT * INTO v_settings FROM public.communication_hub_control_settings ORDER BY created_at ASC LIMIT 1`

The table has **no unique / singleton_key / primary-invariant constraint**.
Inserting a second row would silently split reads across consumers depending on
transaction visibility, and no CI test asserts row-count = 1.

### F2 — Preview confirmation nesting mismatch

- Producer: `ControlledLiveTestPage.tsx:238-241` writes `metadata: { preview_confirmed: true, review_context: { preview_confirmed: true } }`.
- Transport: `sendCommunication.ts:159` passes `metadata: input.metadata ?? {}` unchanged.
- Consumer: `comm-hub-enqueue/index.ts` reads `payload.preview_confirmed` and `payload.review_context.preview_confirmed` at the top level, never digging into `metadata`.

Effect: the reviewed-preview signal from the test console is silently dropped;
the runtime gate must fail on `preview_not_confirmed`, so operators check the
`ckGatesChecked` checkbox to bypass (see F4).

### F3 — Client-side feature-flag bypass

`sendCommunication.ts:53-70` — `isCommunicationHubSendEnabled()` treats
`localStorage.commHub.sendEnabled` and `globalThis.__COMMUNICATION_HUB_SEND_ENABLED__`
as first-class enablement sources. A browser tab can flip the global send gate
without any server audit event.

### F4 — Manual "gates checked" bypass

`ControlledLiveTestPage.tsx:568-571` renders checkbox `ckGatesChecked`
("I confirm live gates were checked."). The `canSend` predicate at lines 205-215
ORs this checkbox into `allConfirmed` and **never reads the actual
`RuntimeGateParityPanel` result**. Operators can send even when the parity
panel reports blocked gates — the server-side RPC then blocks (see F6 for how
that failure is masked).

### F5 — Preset payload duplication and emergency-stop trap

`safetyService.computePresetChanges` (`safetyService.ts:75-101`):

| Preset                     | Effective patch                                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `internal_live_testing`    | `{ dry_run_only: false, email_live_enabled: true, cron_desired_enabled: false }`                           |
| `production_internal_live` | `{ dry_run_only: false, email_live_enabled: true, cron_desired_enabled: false }` — **identical**           |
| `external_live_controlled` | `{ dry_run_only: false, email_live_enabled: true, cron_desired_enabled: false }` — **identical**           |
| `emergency_stop`           | `{ dispatch_enabled: false, email_live_enabled: false, cron_desired_enabled: false, dry_run_only: true }` |

Three presets, one patch. And after `emergency_stop`, none of the "live"
presets set `dispatch_enabled: true`, so re-selecting `internal_live_testing`
appears to succeed while the dispatcher stays disabled.

### F6 — Generic `COMM_HUB_ENQUEUE_FAILED` masking

`sendCommunication.ts:180` and `sendCommunication.ts:216` collapse every
edge-function failure — HTTP error, function-invoke throw, structured
`data.ok === false` response — into a single `error: 'COMM_HUB_ENQUEUE_FAILED'`
literal. Server-side `blockers` (`policy_not_approved`, `dispatch_disabled`,
`recipient_not_allowed`, `preview_not_confirmed`, `sender_unverified`, …) never
reach the UI. Operators see one opaque failure regardless of cause.

### F7 — Three divergent allowlist consumers

- Per-event RPC (`evaluate_comm_hub_send_authorization`): reads
  `communication_hub_event_send_policy.allowed_internal_domains` and
  `.allowed_external_domains` (per-event JSONB arrays).
- Dispatcher (`comm-hub-dispatch/index.ts:264-340`): reads
  `COMMUNICATION_HUB_EMAIL_LIVE_ALLOWLIST` env when set; otherwise DB
  `allowed_email_addresses` + `allowed_email_domains`. Env-vs-DB mismatch is
  emitted only as a warning (`line 340`), not enforced.
- Test console (`ControlledLiveTestPage.tsx:68-81`): its own
  `isRecipientAllowed` uses DB `allowed_email_addresses` + `allowed_email_domains`
  regardless of `recipient_release_mode`.

Three different answers to "is this recipient allowed?" for one send attempt.

### F8 — `recipient_release_mode` is metadata only

`evaluate_comm_hub_send_authorization`, `evaluate_comm_hub_runtime_gate_status`,
`comm-hub-dispatch` never read the `recipient_release_mode` column. The
`validate_comm_hub_recipient_release_mode` RPC enforces mode/allowlist
consistency **at write time** on the control-settings table, but no runtime
consumer branches on the mode. Switching between `internal_domain_pilot` and
`internal_named_users` changes only the UI label; runtime behavior is
determined entirely by the address/domain array contents.

## 3. Duplicate / overlapping evaluators

Three evaluators exist for what should be a single decision:

- `evaluate_comm_hub_live_gate` — legacy per-event live-gate check
- `evaluate_comm_hub_runtime_gate_status` — richer runtime gate with staged blockers
- `evaluate_comm_hub_send_authorization` — canonical send-decision RPC

The enqueue function calls `evaluate_comm_hub_send_authorization`; the Test
Console UI calls `evaluate_comm_hub_runtime_gate_status`. The two can disagree,
and the UI's disagreement is invisible because of F4 and F6.

## 4. Current DB state snapshot

`communication_hub_control_settings` (1 row):

- `dispatch_enabled: true`, `dry_run_only: false`, `email_live_enabled: true`
- `recipient_release_mode: internal_domain_pilot`
- `allowed_email_addresses: {rohit@mishainfotech.com, raghav.c@mishainfotech.com}`
- `allowed_email_domains: {mishainfotech.com}`
- `cron_desired_enabled: false`

## 5. What Prompt 1+ must resolve

1. Enforce singleton via `singleton_key uuid unique default '00000000-…'` (or
   `check (id = fixed-uuid)`) and update every consumer to key on it.
2. Delete the `localStorage` / `globalThis` bypass; make the server the only
   gate authority.
3. Remove the manual `ckGatesChecked` checkbox and gate `canSend` on the actual
   `RuntimeGateParityPanel` result.
4. Standardize preview-confirmation placement — top-level on the
   `sendCommunication` input, mirrored top-level in the enqueue payload.
5. Collapse the three evaluators into one canonical RPC (or make two of them
   thin wrappers over the canonical).
6. Replace `COMM_HUB_ENQUEUE_FAILED` with the server's `blockers[]` list.
7. Fix `safetyService.computePresetChanges` so the three "live" presets differ
   meaningfully, and every non-stop preset explicitly sets `dispatch_enabled`.
8. Make `recipient_release_mode` the single input to a
   `resolve_recipient_allowlist(mode)` view/RPC that dispatcher + RPC + test
   console all consume.

Characterization tests in
`src/platform/communication-hub/__tests__/CommHubBaseline.test.ts` freeze the
current broken behavior so Prompt 1+ regressions are caught and every fix is
required to flip an assertion.

---

## Addendum — deeper audit findings

Second-pass audit surfaced material corrections and additions to the initial
findings. All claims below cite verified file paths and line numbers.

### F1 (expanded) — singleton reads use inconsistent ordering, one has none

The eight known consumers of `communication_hub_control_settings` do not agree
on how to pick "the" row:

| Caller                                                                                             | Ordering                                     |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `supabase/functions/comm-hub-enqueue/index.ts:236`                                                 | `ORDER BY created_at ASC LIMIT 1`            |
| `supabase/functions/comm-hub-dispatch/index.ts:201`                                                | `ORDER BY created_at ASC LIMIT 1`            |
| `supabase/functions/comm-hub-event-pilot/index.ts:294`                                             | `ORDER BY created_at ASC LIMIT 1`            |
| `supabase/functions/comm-hub-manual-dispatch-test/index.ts:121`                                    | `ORDER BY created_at ASC LIMIT 1`            |
| `supabase/functions/comm-hub-trace-simulate/index.ts:194`                                          | `ORDER BY created_at ASC LIMIT 1`            |
| `src/pages/admin/communicationHub/controlCenter/controlCenterService.ts:80`                        | `ORDER BY created_at ASC LIMIT 1`            |
| `supabase/functions/comm-hub-admin-test-notice/index.ts:94`                                        | **no `.order()`** — default row order        |
| `src/pages/admin/communicationHub/testDiagnostics/validateBusinessCommunication.ts:153`            | **`ORDER BY updated_at DESC LIMIT 1`**       |
| RPC `evaluate_comm_hub_send_authorization`                                                         | `ORDER BY created_at ASC LIMIT 1`            |

If the table ever contains more than one row, `comm-hub-admin-test-notice`
returns whichever row Postgres feels like, and `validateBusinessCommunication`
returns the most-recently-edited row while every other consumer returns the
oldest — the diagnostic tool will report a state that no send path ever
actually sees. No unique index or `check(id = <fixed uuid>)` exists on the
table.

### F9 — enqueue's `email_live_enabled` gate diverges from the dispatcher's

- `comm-hub-enqueue/index.ts:235` selects only DB columns and gates at line
  `243`: `if (gs.email_live_enabled !== true) globalBlockers.push('global_email_live_disabled')`.
- `comm-hub-dispatch/index.ts:263,320-334` ANDs DB `email_live_enabled` with
  the env flag `COMMUNICATION_HUB_EMAIL_LIVE`.

Result: with `email_live_enabled=true` in DB and `COMMUNICATION_HUB_EMAIL_LIVE`
unset, enqueue admits the request and the dispatcher refuses it. From the
operator's viewpoint, the request "succeeds" (queued) and then silently never
delivers.

### F10 — per-policy `max_recipients_per_send` is unenforced at send time

`communication_hub_send_policy.max_recipients_per_send` is editable in the
Send Policy admin UI and referenced in `safetyService.ts:155` for "dangerous
change" governance warnings, but nothing on the send path reads or enforces
it:

- `comm-hub-enqueue/index.ts:37,178` enforces only the flat constant
  `MAX_RECIPIENTS = 200`.
- `evaluate_comm_hub_send_authorization` does not read
  `max_recipients_per_send` (the `v_policy` JSON it materializes lists other
  keys — `duplicate_window_minutes`, `duplicate_scope`,
  `max_sends_per_entity_per_event`, `requires_sender_verified`, allowlist
  arrays — but the per-policy recipient cap is not among them).
- `send_communication_v1` does not enforce it.

An admin can set the policy cap to `1` and the system will still accept up to
200 recipients.

### F11 — same authorization RPC runs 2–3 times per live send

For a single successful live send, the send-decision layer invokes:

- `evaluate_comm_hub_send_authorization` — called 3× (in
  `comm-hub-enqueue/index.ts:304`, then inside `send_communication_v1`
  (`20260713210551:113`), then inside `evaluate_comm_hub_runtime_gate_status`
  Gate 2 (`20260713203244:105`)).
- `evaluate_comm_hub_runtime_gate_status` — called 2× (in
  `comm-hub-enqueue/index.ts:396` and inside `send_communication_v1`
  (`20260713210551:213`)).

Not a correctness bug — `send_communication_v1` is SECURITY DEFINER and raises
`42501` on denial, so it is the authoritative backstop — but it is a real
duplication cost and a source of blocker-shape drift (each layer wraps the
same RPC's `blockers[]` differently on the way back to the client).

### F12 — `preview_confirmed` is inspected at three different payload paths

Correction to F2 — three payload shapes, not two:

- Frontend (`ControlledLiveTestPage.tsx:238-241`): writes
  `metadata.preview_confirmed` and `metadata.review_context.preview_confirmed`.
- Enqueue edge fn (`comm-hub-enqueue/index.ts:378-383`): reads
  `payload.preview_confirmed` and `payload.review_context.preview_confirmed`
  at the top level.
- RPC `send_communication_v1` (`20260713210551:202-210`): reads
  `payload.preview_confirmed`, then `payload.context.preview_confirmed`, then
  `payload.context.review_context.preview_confirmed` — a third distinct root
  (`context`) that neither of the other layers produces or consumes.

Three producers/consumers, zero agreement.

### Reframing F3 and F4

Both the `localStorage` send-enable override (F3) and the `ckGatesChecked`
checkbox (F4) are **client-side UX affordances only**. They never reach the
server payload (`ckGatesChecked` is absent from the enqueue body assembled at
`ControlledLiveTestPage.tsx:236-242`; the localStorage flag is used purely to
decide whether the browser calls `comm-hub-enqueue` at all). Every real gate
is re-enforced inside `send_communication_v1` (SECURITY DEFINER, raises
`42501`). They remain audit findings — they create false operator confidence
and should be removed or explicitly labeled advisory — but they are **not
security bypasses** of the server backstop.

### Additional structural notes

- The dispatcher never invokes `evaluate_comm_hub_send_authorization`,
  `evaluate_comm_hub_runtime_gate_status`, or `evaluate_comm_hub_live_gate`.
  Its check set (env+DB dispatch flag, env+DB email-live flag, live window,
  dual allowlists, provider lookup) is disjoint from the enqueue-side set —
  no shared evaluator, no shared policy read.
- `evaluate_comm_hub_live_gate` (7 migration revisions) is no longer called
  by any edge function directly; it is now a sub-evaluator consumed only by
  `evaluate_comm_hub_runtime_gate_status` Gate 3. Prompt 1+ should either
  inline it or remove the standalone RPC.
- No repo file invokes `comm-hub-dispatch` from the frontend
  (`grep -rn "comm-hub-dispatch" src/` returns zero matches). Dispatch is
  driven by scheduled cron and internal invocations only.

### Prompt 1+ items added by the addendum

- Add a `singleton_key` column + unique constraint (or `check(id=<fixed uuid>)`)
  and rewrite all eight readers to key on it.
- Make enqueue's global gate reuse the same env-AND-DB helper the dispatcher
  uses for `email_live_enabled` (F9).
- Enforce `communication_hub_send_policy.max_recipients_per_send` inside
  `evaluate_comm_hub_send_authorization` / `send_communication_v1` (F10).
- Standardize the runtime authorization pathway so
  `evaluate_comm_hub_send_authorization` is called at most once per send
  (advisory in enqueue, authoritative in `send_communication_v1`), and
  `evaluate_comm_hub_runtime_gate_status` inlines rather than re-calls it (F11).
- Pick one canonical location for `preview_confirmed` (top-level) and update
  all three producers/consumers together (F12).
- Retire or fold `evaluate_comm_hub_live_gate` into the runtime-gate RPC.
