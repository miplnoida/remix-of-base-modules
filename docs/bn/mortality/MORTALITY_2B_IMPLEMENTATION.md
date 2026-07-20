# BN-MORT-2B — Complete Secure Queries and All Mortality Command Handlers

## Scope delivered

### Part 1 — Query boundary corrections (`supabase/functions/bn-benefits-query`)

- `BN_MORTALITY_GET_SUMMARY` now returns a dashboard aggregate when no
  `eventId` is supplied: `totals.byStatus`, `totals.overdue`,
  `totals.openNonTerminal`, `totals.all`, `recent[]` (10 latest events),
  and a `generatedAt` timestamp. When an `eventId` IS supplied it still
  returns the per-event snapshot.
- `BN_MORTALITY_GET_EVENT_HISTORY` now orders by `occurred_at DESC`
  (the immutable history column), no longer `created_at`. Sensitive
  fields are `justification` and `reason_code`.
- `BN_MORTALITY_GET_AFFECTED_AWARDS` uses a real lookup: reads
  `bn_mortality_award_impact` for the event then joins `bn_award` for
  the master award record, and shapes each row into a stable
  `AffectedAward` DTO with `impactId`, `awardId`, `awardReference`,
  `action`, `overpaymentAmountMinor`, `holdStatus`, `terminationStatus`,
  `impactDecision`, and the `award` snapshot.
- `BN_MORTALITY_GET_EVIDENCE_LINKS` now reads `core_generated_document`
  (DMS) filtered by `module_code = 'bn_mortality'` and
  `reference_id = eventId` — fail-soft to `[]` if DMS is not present.
- `BN_MORTALITY_GET_COMMUNICATIONS` now reads `communication_hub_trace`
  scoped by the same module/reference — fail-soft as well.
- Envelope validation strengthened: `Bearer` scheme required,
  `getClaims()` used to verify the JWT before any handler runs,
  `queryCode` must resolve against the closed registry.

### Part 2 & 3 — 26 canonical command handlers

Handlers grouped into 7 modules under
`src/services/bn/mortality/handlers/`:

| Group | Handlers |
| --- | --- |
| `registration.ts` (5) | `DRAFT_SAVE`, `REGISTER_REPORT`, `CANCEL`, `ASSIGN`, `ATTACH_EVIDENCE` |
| `matching.ts` (2) | `MATCH_PERSON`, `MARK_DUPLICATE` |
| `verification.ts` (7) | `SUBMIT_FOR_VERIFICATION`, `PLACE_PROVISIONAL_HOLD`, `RELEASE_HOLD`, `RECORD_CONFLICT`, `RESOLVE_CONFLICT`, `CONFIRM_VERIFICATION`, `REJECT_REPORT` |
| `impact.ts` (6) | `PREPARE_IMPACT`, `SUBMIT_IMPACT`, `RETURN_IMPACT`, `APPROVE_IMPACT`, `TERMINATE_AWARD`, `CREATE_PAD_OVERPAYMENT` |
| `followon.ts` (4) | `INITIATE_SURVIVOR_ASSESSMENT`, `INITIATE_FUNERAL_GRANT`, `REFER_LEGAL`, `COMPLETE_FOLLOWON` |
| `closure.ts` (2) | `REVERSE_CONFIRMATION`, `CLOSE_EVENT` |
| **Total** | **26** |

Every handler is registered in
`benefitsCommandHandlerRegistry.ts`; every command is marked
`implemented: true` in
`src/types/bn/mortality/mortalityCommands.ts` (26/26). Unregistered
commands still fail closed with `HANDLER_NOT_REGISTERED`.

Handlers are declarative:
- Client-side validation of required fields (`deceased_full_name`,
  `source`, `reason`, `ip_id`, `duplicate_of_event_id`,
  `amount_minor > 0`, assignment target).
- `loadBefore` returns `{ before: null, version: null }` — the client
  cannot read `bn_mortality_*` directly because `authenticated` grants
  were revoked. Row-version enforcement runs server-side.
- `execute` forwards the entire signed envelope to the
  `bn-mortality-command` edge function; any non-EXECUTED result becomes
  a thrown `${code}:${message}` which the pipeline maps to
  `REJECTED` / `CONFLICT` / `FAILED`.

### Part 4 & 5 — Server-authored mutation boundary

New edge function `supabase/functions/bn-mortality-command/index.ts`
enforces the full FAIL-CLOSED pipeline server-side using the service
role:

1. Bearer JWT + `getClaims()` (no anonymous).
2. Envelope structural validation (UUIDs, `moduleCode='bn_mortality'`,
   `actorUserCode !== 'SYSTEM'`, ISO timestamp).
3. Capability mapping via a server-owned matrix. Justification is
   required for commands that demand it (cancel, hold, conflict,
   reject, return-impact, terminate-award, PAD-overpayment,
   refer-legal, reverse-confirmation, mark-duplicate).
4. `role_permissions` walk. `bn_mortality:admin` acts as an override.
5. Maker-checker: any command marked `makerChecker=true` refuses when
   the most recent history row for the same entity was written by the
   same actor.
6. Idempotency replay: `bn_mortality_command_idempotency` stores the
   first execution keyed by `(idempotency_key, command_name)`; retries
   return the cached result with `status = REPLAYED`.
7. Transactional execution via a single Postgres RPC
   `bn_mortality_execute_command()` (SECURITY DEFINER, executable
   only by `service_role`). The RPC:
   - locks the row `FOR UPDATE`,
   - enforces the canonical from→to matrix (rejects with
     `STATE_INVALID_TRANSITION`),
   - enforces optimistic concurrency against `expectedRowVersion`
     (rejects with `ROW_VERSION_CONFLICT`),
   - applies command-specific side effects atomically (match person,
     assign, evidence merge, hold/release, verify, reject, approve
     impact + cascade to `bn_mortality_award_impact`, terminate award
     + cascade, PAD-overpayment link, referral inserts into
     `bn_mortality_referral`, reverse, close, cancel, draft save,
     register report),
   - increments `row_version` on every mutation,
   - appends an immutable row to `bn_mortality_event_history` (blocked
     from update/delete by pre-existing triggers).
8. Audit trail: writes one row to `bn_module_events` with
   `event_type = 'command.executed'` containing correlation id,
   idempotency key, actor, entity, version, and payload hash.

Terminal states (`CLOSED`, `CANCELLED`, `DUPLICATE`, `REVERSED`) refuse
all further commands with `STATE_TERMINAL`.

### Part 7 — Cross-module adapters

The RPC-level side effects act as the initial cross-module boundary:

- **Award servicing**: `APPROVE_IMPACT` / `TERMINATE_AWARD` cascade
  into `bn_mortality_award_impact` (`approval_state`, `approved_at`,
  `termination_status`, `termination_effective_date`, `impact_status`).
  A future adapter will consume these rows and drive award status
  events; for the pilot the impact table is the authoritative
  interface record.
- **Overpayments**: `CREATE_PAD_OVERPAYMENT` writes
  `overpayment_id` + `overpayment_reference` + `payment_after_death_minor`
  onto impact rows. Overpayments module (`bn_overpayment`) consumes
  from this record.
- **Referral fan-out**: `INITIATE_SURVIVOR_ASSESSMENT`,
  `INITIATE_FUNERAL_GRANT`, and `REFER_LEGAL` insert typed rows into
  `bn_mortality_referral` (`SURVIVOR`, `FUNERAL`, `LEGAL`) with
  target module + reference — consumed by Claims, Legal and Comm Hub.
- **DMS**: evidence links surface via `core_generated_document`.
- **Communications**: outbound events surface via
  `communication_hub_trace`.

Pilot-mode remains dark (`app_modules.bn_mortality.actions_enabled =
false`); the browser cannot fire commands until it is flipped, but the
entire server pipeline is now live and can be exercised via unit /
integration tests that inject an in-memory ModuleRegistrationStore.

## Files changed

- **New**
  - `supabase/functions/bn-mortality-command/index.ts`
  - `src/services/bn/mortality/handlers/mortalityHandlerShared.ts`
  - `src/services/bn/mortality/handlers/registration.ts`
  - `src/services/bn/mortality/handlers/matching.ts`
  - `src/services/bn/mortality/handlers/verification.ts`
  - `src/services/bn/mortality/handlers/impact.ts`
  - `src/services/bn/mortality/handlers/followon.ts`
  - `src/services/bn/mortality/handlers/closure.ts`
  - `src/services/bn/mortality/handlers/index.ts`
- **Migrated**
  - `bn_mortality_command_idempotency` table (service_role only).
  - `bn_mortality_execute_command()` RPC (service_role only).
- **Modified**
  - `supabase/functions/bn-benefits-query/index.ts` — dashboard summary,
    history ordering, real affected-awards / evidence / communications
    handlers.
  - `src/services/bn/commands/benefitsCommandHandlerRegistry.ts` — 26
    Mortality handlers registered.
  - `src/types/bn/mortality/mortalityCommands.ts` — all 26 commands
    flipped to `implemented: true`.

## Not yet delivered (candidate follow-ups)

- Explicit adapters as separate TS modules
  (`awardServicingAdapter.ts`, `overpaymentsAdapter.ts`, etc.). Today
  the coupling is via database side effects in the RPC.
- Comprehensive vitest coverage per handler + failure scenario. The
  handler factory is exercised through the existing pipeline tests but
  a dedicated `mortalityHandlers.test.ts` matrix should be added.
- E2E Playwright flow behind an `actions_enabled=true` staging toggle.
