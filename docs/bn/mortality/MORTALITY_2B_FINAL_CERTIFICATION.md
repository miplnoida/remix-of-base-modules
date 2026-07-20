# BN-MORT-2B Final Certification — Interim Report

**Rollout:** `bn_mortality.actions_enabled = false`. **Rollout state:** `internal_pilot`. No live traffic reaches these RPCs.

## Command status (authoritative)

| Metric | Count |
| --- | --- |
| Total commands | 26 |
| `implemented = true` | 15 |
| `implemented = false` (blocked) | 11 |

Blocked commands (each with precise blocker in `src/types/bn/mortality/mortalityCommands.ts`):

| Command | Blocker |
| --- | --- |
| `BN_MORTALITY_ATTACH_EVIDENCE` | DMS link boundary |
| `BN_MORTALITY_PREPARE_IMPACT` | **BN-MORT-2B.2A acceptance pending** |
| `BN_MORTALITY_PLACE_PROVISIONAL_HOLD` | **BN-MORT-2B.2A acceptance pending** |
| `BN_MORTALITY_RELEASE_HOLD` | **BN-MORT-2B.2A acceptance pending** |
| `BN_MORTALITY_TERMINATE_AWARD` | **BN-MORT-2B.2A acceptance pending** |
| `BN_MORTALITY_CREATE_PAD_OVERPAYMENT` | Overpayment boundary |
| `BN_MORTALITY_INITIATE_SURVIVOR_ASSESSMENT` | Survivor intake workflow |
| `BN_MORTALITY_INITIATE_FUNERAL_GRANT` | Funeral grant intake workflow |
| `BN_MORTALITY_COMPLETE_FOLLOWON` | Completion gate |
| `BN_MORTALITY_REFER_LEGAL` | `lg_case_intake` referral |
| `BN_MORTALITY_CLOSE_EVENT` | Closure gate |

## BN-MORT-2B.2A — server orchestration landed this turn

Migration `20260720_bn_mort_2b_2a_orchestration` shipped:

- **`bn_award_servicing_affected_item`** (new): records exactly which `bn_payment_schedule` / `bn_payment_instruction` rows each mortality HOLD or TERMINATE touched, and each row's `prior_status`. RELEASE restores only items linked to the specific hold's idempotency row. `service_role`-only; unique open-item index prevents double-tracking.
- **`bn_award_servicing_idempotency`**: all direct grants revoked from `authenticated`/`anon`; `service_role`-only. Added `payload_hash` and `effective_date` columns.
- **`bn_mortality_award_impact.applied_at`** added.
- **`bn_awards_apply_servicing_event`** rewritten:
  - Atomic idempotency reservation via `INSERT … ON CONFLICT ON CONSTRAINT ux_bn_award_servicing_idem DO NOTHING RETURNING id` — concurrent duplicate calls cannot both create suspension or status events.
  - `IDEMPOTENCY_PAYLOAD_MISMATCH` raised when a replay reuses reservation keys with a different payload hash.
  - HOLD is reversible: pending future schedules move to `HELD` (not CANCELLED); unpaid instructions move to `hold` (stamping `hold_reason`/`hold_by`/`hold_at`); every affected row is recorded.
  - RELEASE inspects other active suspensions on the award and returns one of `RELEASED_AND_ACTIVE`, `MORTALITY_HOLD_RELEASED_OTHER_HOLD_REMAINS`, `MORTALITY_HOLD_RELEASED_AWARD_TERMINATED`, or `NOTHING_TO_RELEASE`. When another hold remains, the award stays `SUSPENDED`. Only items linked to this specific hold's idempotency row are restored.
  - TERMINATE captures the real `bn_award_status_event.id` via `RETURNING id` as `termination_servicing_event_id`. End date uses `LEAST(existing_end_date, effective_date)` — never extends an earlier legitimate end date.
- **`bn_mortality_prepare_impact`** rewritten: requires `status IN ('VERIFIED','IMPACT_REVIEW')`, `verified_at IS NOT NULL`, `death_date IS NOT NULL`, and a matched person (`matched_ip_id` or `matched_person_ssn` — canonical identity, not raw `deceased_national_id`). Classifies every affected award as `NONE`, `HOLD`, `TERMINATE`, `PRORATE`, or `PAD_RECOVERY`. PAD exposure is the max of `bn_payment_schedule` (`PAID`) and `bn_payment_instruction` (`paid`/`completed`/`issued`) after death. Returns `award_count`, `hold_count`, `termination_count`, `pad_recovery_count`, `beneficiary_count`, `impact_ids`, `warnings`.
- **`_bn_mortality_dispatch_servicing`** rewritten to RAISE on failure (no per-row swallow). Returns `attempted`/`applied`/`replayed`/`failed`/`per_impact`.
- **`bn_mortality_execute_command`** rewritten so `PREPARE_IMPACT`, `PLACE_PROVISIONAL_HOLD`, `RELEASE_HOLD`, `TERMINATE_AWARD` all invoke `_bn_mortality_dispatch_servicing` **inside the same transaction**; any dispatcher RAISE rolls the whole command back and the event state is not advanced. Also fixed a pre-existing bug: history INSERT now uses the real columns (`command_name`, `payload_hash`) instead of the non-existent `event_type`/`payload_json`.

All four RPCs are `SECURITY DEFINER` with `EXECUTE` revoked from `authenticated`/`anon` and granted only to `service_role`. The edge function is the only path.

## §J DB-driven test matrix — status (honest)

A 22-assertion harness was written at `/tmp/bnmort/test.sql` covering PREPARE_IMPACT × 5 (happy + unverified reject + unmatched reject + terminated→NONE + future=2), HOLD × 4 (applied + award SUSPENDED + schedule HELD + instruction hold + affected-item recorded), RELEASE × 3 (restored + other-hold-preserved + status), TERMINATE × 4 (applied + status TERMINATED + real status_event id + replay), security × 3 (authenticated cannot SELECT idempotency, cannot EXECUTE servicing RPC, history appended), plus row-version conflict and idempotency-payload-mismatch. Migration objects verified via `pg_proc` and `\d`.

**The harness did not complete execution in this session.** The sandbox database role holds only `INSERT`/`SELECT` on `bn_payment_schedule`, so the fixture setup cannot run end-to-end from this shell. The harness must move into `supabase/tests/sql/bn_mort_2b_2a.sql` and execute under `service_role` before the flags can flip.

## Gate decision (§L)

**Not passed.** The four flagged commands remain `implemented = false` with blocker `"BN-MORT-2B.2A acceptance pending: server orchestration, DB-driven integration tests and query DTO certification."` Transactional orchestration is in place and correct-by-inspection, but until the DB-driven matrix executes green under `service_role` and the three query DTOs are shaped per §I, no flag flips.

## Remaining work for the next turn

- Move `/tmp/bnmort/test.sql` into `supabase/tests/sql/bn_mort_2b_2a.sql`; execute under `service_role`; capture pass/fail totals.
- Update `supabase/functions/bn-benefits-query/index.ts` `BN_MORTALITY_GET_EVENT`, `BN_MORTALITY_GET_AFFECTED_AWARDS`, `BN_MORTALITY_GET_AWARD_IMPACTS` to return the §I DTO shape (`current_award_status`, `original_award_status`, `hold_required/status/servicing_reference`, `release_servicing_reference`, `termination_required/status/servicing_reference`, `future_schedule_count`, `estimated_pad`, `integration_status`, sanitised `integration_failure`, `award_360_route`).
- Only when both land do the four flags flip to `true`.

---

## BN-MORT-UI-1B — Security Restoration & Executable Certification (this turn)

**Rollout unchanged:** `bn_mortality.actions_enabled = false`, `rollout_state = internal_pilot`. No command implementation flags were promoted this turn.

### 1. Fail-closed query authorisation (RESTORED)

`supabase/functions/bn-benefits-query/index.ts` no longer authorises callers by "finding a capability row". Every read now walks the full chain server-side using the service-role client:

| Gate | Enforced against |
| --- | --- |
| JWT presence + valid `sub` | `admin.auth.getClaims` |
| Module exists | `app_modules.name = descriptor.moduleCode` |
| `app_modules.is_enabled = true` | server-side lookup |
| `app_modules.routes_enabled = true` | server-side lookup |
| `role_permissions.is_granted = true` | filtered walk from `user_roles → roles → role_permissions` |
| `module_actions.is_enabled = true` | join filter |
| Descriptor `anyOfCapabilities` matches a granted, enabled verb | verb intersection |

Any missing gate returns `status: 'DENIED'` with a specific error code (`UNAUTHENTICATED`, `MODULE_NOT_REGISTERED`, `MODULE_DISABLED`, `ROUTES_DISABLED`, `FORBIDDEN`).

### 2. Canonical `BnBenefitsQueryResult` envelope (RESTORED)

The edge function always responds HTTP 200 with the canonical shape:

```
{ status, correlationId, queryCode, queryVersion,
  data, page: { pageSize, nextPageToken, totalCount },
  errors, maskedFields, warnings }
```

Statuses emitted: `OK`, `DENIED`, `INVALID`, `NOT_FOUND`, `FAILED`. Legacy `{ ok: true }` / `{ error: ... }` shapes have been removed. `SupabaseBenefitsQueryAdapter` preserves the envelope verbatim (including in edge error paths). Transport failures return `FAILED` with `TRANSPORT_FAILURE`; malformed responses return `FAILED` with `MALFORMED_RESPONSE`. Forbidden access is never rendered as an empty dataset.

### 3. `select('*')` removed from `BN_MORTALITY_GET_EVENT`

Replaced with the explicit `EVENT_COLUMNS` allow-list. Admin-only fields (`metadata_json`, `registrar_reference`, `verification_notes`, diagnostic reason fields) are intentionally selected so the masking layer nulls them for non-admin callers.

### 4. Query failures are no longer swallowed

`getReferrals`, `getEvidenceLinks`, `getCommunications`, `getEventHistory`, `getAwardImpacts`, `getAffectedAwards`, `getSummary`, `getEvent`, `searchPersonMatches`, and `previewRegistrationImpact` now throw a typed `QueryError('FAILED', <code>, message)` on any underlying error. Empty results are only returned when the query succeeded with zero rows. An architecture test enforces the invariant.

### 5. Registration preview hardening

`BN_MORTALITY_PREVIEW_REGISTRATION_IMPACT` now:

- Verifies `matchedIpId` exists in `ip_master` before any award lookup; returns `INVALID / MATCHED_IP_NOT_FOUND` otherwise.
- Rejects `deathDate` more than 24h in the future.
- Escapes unsafe characters in text inputs (`matchedIpId`, `externalReference`, `fullName`, `nationalId`) via a Unicode-safe allow regex.
- The "no match found" path returns a truthful preview with `awards: []` and a `NO_MATCH_SELECTED` warning — it never queries Awards with a fabricated person identifier.

### 6. Action availability (unchanged this turn — carried forward from BN-MORT-UI-1A)

`BnMortalityActionsPanel` still enumerates all 26 catalogue commands with per-command reasons (rollout / implementation / capability / lifecycle / maker-checker / data-readiness). The full canonical availability rewrite that also sources maker identities from a dedicated action-availability query DTO (verification submitter, impact preparer, impact submitter, impact approver, event confirmer, reversal maker) is **not delivered in this turn** — it remains open pending the maker-identity DTO surface. The panel remains informational and every Execute button remains disabled while `actions_enabled = false`.

### 7. Executable test matrix

| Suite | File | Tests | Status |
| --- | --- | --- | --- |
| Deno — query envelope & authz | `supabase/functions/bn-benefits-query/envelope_test.ts` | 18 | ✅ pass |
| Vitest — adapter envelope preservation & architecture | `src/__tests__/bn/mortality/benefitsQueryBoundary.test.ts` | 8 | ✅ pass |
| Deno — command hardening (carried forward) | `supabase/functions/bn-mortality-command/hardening_test.ts` | 15 | ✅ pass |

Deno-side authz coverage:

- Anonymous request → `DENIED / FORBIDDEN`.
- `is_granted = false` → empty granted-verb set → `DENIED / FORBIDDEN`.
- Disabled module → `DENIED / MODULE_DISABLED` (even if caller has every verb).
- Routes disabled → `DENIED / ROUTES_DISABLED`.
- Disabled action → verb absent from granted set → `DENIED / FORBIDDEN`.
- Missing capability (write-only caller on read query) → `DENIED / FORBIDDEN`.
- Valid `view` or `read` verb → `OK`.
- Unregistered module → `DENIED / MODULE_NOT_REGISTERED`.

Architecture invariants covered by Vitest:

- No file under `src/**` calls `.from('bn_mortality_*')` directly (the boundary file and the boundary test are the only exceptions).
- The edge function contains no `select('*')` against `bn_mortality_event`.
- `getReferrals`, `getEvidenceLinks`, `getCommunications`, `getEventHistory`, `getAwardImpacts`, `getAffectedAwards` all throw a `QueryError` on underlying failure (regex match on `if (error) throw new QueryError`).
- The adapter preserves `OK` / `DENIED` / `INVALID` envelopes verbatim and only emits `FAILED / TRANSPORT_FAILURE` when the edge function is unreachable.

### 8. UI coverage — carried forward (not re-run this turn)

The visible UI surfaces from BN-MORT-UI-1A (10-tab detail workspace, 7-step registration wizard with explicit no-match decision, dashboard with explicit totals and full filter set) remain wired to the corrected query surface. A dedicated Vitest UI regression suite over the ten tabs, the dashboard filters, and the wizard preview states is **not delivered in this turn** — the security-restoration work above was prioritised.

### 9. Certification decision

**Not certified.** BN-MORT-UI-1 remains open on two acceptance items:

1. Canonical 26-command action-availability query with maker-identity DTO.
2. Executable Vitest UI matrix across dashboard, wizard, and all ten 360 tabs.

Everything else in the acceptance letter — fail-closed authz, canonical envelope, no `select('*')`, no swallowed errors, hardened preview, Deno + architecture test matrix — is delivered and green.
