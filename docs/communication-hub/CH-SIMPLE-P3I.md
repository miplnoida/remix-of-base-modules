# CH-SIMPLE-P3I — Pre-Manual-Production Blocker Closure

**Stage:** P3I — Blocker Closure and Manual-Production Recommendation
**Outcome:** `MANUAL_PRODUCTION_NOT_APPROVED`
**Reason:** Blockers 1 (P3D staging immutability) and 2 (real-provider controlled test) require environments not available inside the Lovable build sandbox. They must be executed by an authorised administrator against a real staging PostgreSQL and a real SMTP provider before Manual Production can be approved.

Per the P3I instructions: *"Do not upgrade the status when tests remain skipped."*
All four P3 sub-stage statuses are therefore **retained** exactly as they were at the end of P3H.

---

## 1. Blocker 1 — P3D Role-Capable Immutability (NOT EXECUTED IN THIS STAGE)

**Status:** Retained — `P3D_CERTIFIED_WITH_ENVIRONMENTAL_TEST_LIMITATION`.

### Why it was not executed here
The sandbox that runs Lovable builds has no `PGHOST` route to a privileged staging database, so it cannot exercise the seven role-capable mutation matrices (authenticated non-admin, Comm Hub administrator, service-role runtime, direct request mutation, direct message mutation, migration-local bypass, and negative bypass attempts). The static/trigger-definition proof already covered by `commHubDryRunImmutabilityGovernance.test.ts` (4/4 pass) is **not** substitutable for role-capable runtime evidence.

### Execution plan owner must run before Manual Production
Environment matrix and evidence to record when executed in staging:

| Field | Value to record |
|---|---|
| Environment | staging (identifier + region) |
| PostgreSQL version | `SELECT version();` |
| Migration version | latest applied migration id (`supabase migration list`) |
| Roles exercised | `authenticator` (non-admin JWT), Comm Hub Administrator JWT, `service_role`, direct SQL as owner, migration bypass path |
| Assertions | seven role-capable matrices (see §1 of the blocker), each producing pass/fail + captured error text |
| Duration | wall-clock per matrix |

### The seven assertions to prove
1. `dry_run_locked=true` cannot be cleared by an administrator JWT.
2. It cannot be cleared by `service_role` runtime code.
3. Dry-run `send_context` cannot be flipped to `live` after certification.
4. Request dry-run context cannot be flipped to `live`.
5. Request/message classification cannot become inconsistent (parent/child linkage triggers must fire).
6. The migration-local bypass GUC is settable **only** through the documented migration process.
7. No runtime RPC or edge function can activate the bypass (grep already enforced statically; runtime attempt must return a distinct denial code).

### Upgrade gate
Upgrade to `P3D_CERTIFIED` only when all seven pass with captured evidence. Any single skip retains the current status.

---

## 2. Blocker 2 — Real-Provider Controlled Test (NOT EXECUTED IN THIS STAGE)

**Status:** Retained — `P3E_STUB_CERTIFIED`.

### Why it was not executed here
Executing one real controlled email requires: a live SMTP provider secret, `COMM_HUB_REAL_EMAIL_TEST=true`, the exact operator confirmation phrase typed by a human administrator, and receipt of the email in a real inbox for manual delivery verification. None of these can be simulated in the build sandbox without violating the P3I directive to send **exactly one** explicitly approved real email.

### Preconditions the operator must reconfirm at execution time
- P3D staging immutability tests passed (Blocker 1 closed).
- Authorised administrator identity captured.
- Active Recipient Policy resolves to **exactly one** permitted recipient (address never logged, only masked hash).
- Valid preview approval + valid dry-run certification linked.
- Emergency Stop clear; cron off; bulk off.
- `COMM_HUB_PROVIDER_MODE=live` (or unset) and `COMM_HUB_REAL_EMAIL_TEST=true`.
- Confirmation phrase typed verbatim; business reason recorded.
- Executed **only** through `comm-hub-controlled-live-test`.

### Invariants to verify after the single send
Recorded via SQL against staging:
- one row in `communication_controlled_live_execution`
- one row in `communication_controlled_live_grant` (state = CONSUMED)
- one `communication_request` (context=`controlled_live`)
- one `communication_deliveries` (or per-channel equivalent) row
- one `communication_delivery_attempts` row
- one provider invocation in the connector log
- prior operating mode restored (evidenced by `communication_hub_control_settings` history)
- no automatic retry attempted
- no secrets present in Edge Function logs or response bodies (verified by grep on the log export)

### Result classification (do not conflate)
- `provider_rejected` — provider returned a hard failure.
- `provider_accepted` — API returned success only.
- `delivery_pending` — accepted but no bounce/complaint yet.
- `delivery_confirmed_manual` — administrator sighted the message in the recipient inbox.
- `delivery_confirmed_authoritative` — SMTP/relay delivery receipt captured.

### Upgrade gate
| Evidence | New status |
|---|---|
| Manual inbox confirmation | `P3E_CONTROLLED_LIVE_CERTIFIED_WITH_MANUAL_DELIVERY_CONFIRMATION` |
| Authoritative delivery receipt | `P3E_CONTROLLED_LIVE_CERTIFIED` |
| Provider accepted but no inbox proof | `P3E_PROVIDER_ACCEPTED` |
| Not executed | `P3E_STUB_CERTIFIED` (unchanged — current state) |

---

## 3. Legacy-Route Review — Completed

Reviewed each retained route from `CH-SIMPLE-P3H.md §9`.

| Route | Owner | Current users | Unique purpose | Replacement | Reason it cannot be removed | Target removal | Permission | Searchable in primary nav |
|---|---|---|---|---|---|---|---|---|
| `/admin/communication-hub/pilots` | Comm Hub programme | Technical Support | Historical pilot orchestration diagnostics still linked from traces | `/admin/communication-hub/go-live` | Trace deep-links reference pilot execution ids | After Manual Production + 1 quarter | Comm Hub Admin + Tech Support | No |
| `/admin/communication-hub/testing/controlled-live-test` | Comm Hub programme | Technical Support | Standalone stub harness for provider isolation | Go Live → Controlled Live step | Regression evidence must remain reproducible outside the wizard | After Automated Production certified | Comm Hub Admin + Tech Support | No |
| `/admin/communication-hub/test-diagnostics` | Platform Governance | Technical Support | Environment-level RPC/queue diagnostics | Advanced Diagnostics landing | Unique harness runners not surfaced elsewhere | Deferred (evaluate at Automated Production) | Tech Support only | No |
| `/admin/communication-hub/governance` | Platform Governance | Technical Support | Diagnostic index over policy/automation sub-pages | Individual `/governance/*` sub-pages | Cross-links from historical runbooks | Deferred | Tech Support only | No |
| `/admin/communication-hub/onboarding/module-adapter-tests` | Comm Hub programme | Technical Support | Module adapter smoke harness | Advanced Diagnostics | Adapter tests have no operator-facing equivalent | Deferred | Tech Support only | No |

### Confirmations
- No legacy route appears in primary navigation (enforced by `CommHubP3GNavigation.test.ts` — 5/5 pass).
- No legacy route is described as the normal process in operator documentation (`COMMUNICATION_HUB_OPERATOR_NAVIGATION_GUIDE.md` reviewed).
- Each deprecated workflow renders `DeprecatedRouteBanner` linking to Go Live (verified by grep in `src/pages/admin/communicationHub`).
- Technical routes remain gated by `CommHubAdminRoute` and page-level permission checks.
- No route in this table is a Removal Candidate for P3I — every one preserves unique evidence or diagnostic value.

### Non-route legacy item retained
`localStorage['commHub.sendEnabled']` (Test Console). Not authoritative — server evaluator still gates every send. Removal condition: retirement of the Test Console dev toggle after Automated Production.

---

## 4. Operator Acceptance Sign-Off — Structure in place, human sign-off pending

`docs/communication-hub/COMMUNICATION_HUB_P3_OPERATOR_ACCEPTANCE.md` contains the required fields (test context, sign-off table, known limitations, blockers list, signature block). The document cannot be automatically signed by the build agent — it requires the named administrator, technical reviewer, and programme owner to complete the signature rows after executing Blockers 1 and 2.

The acceptance checklist rows already reflect **evidence collected in P3H**. Rows dependent on Blockers 1–2 (specifically: "real controlled test works", authoritative delivery confirmation) are **not** pre-marked Pass; they are held until execution.

Per the P3I directive: *"Record unresolved findings rather than automatically marking all rows as Pass."*

---

## 5. Full Regression After Attempted Blocker Closure

Executed on 2026-07-21 in the build sandbox.

| Category | Result |
|---|---|
| Static governance assertions (route/menu/storage) | ✅ pass |
| Unit tests (services, evaluators, adapters) | ✅ pass |
| Live-database assertions (RPC harness runners against Supabase Test) | ✅ pass |
| Staging role-capable assertions | ⏭ **skipped — environment** (Blocker 1) |
| Provider-stub assertions | ✅ pass |
| Real-provider assertions | ⏭ **skipped — environment** (Blocker 2) |
| End-to-end operator assertions (Go Live shell + panels) | ✅ pass |
| Environmental skips | 4 skips reported separately (P3D immutability role-capable, P3E real-email, cross-tenant grant isolation, one runtime harness variant) |

**Aggregate:** 20/20 test files pass, **133 assertions pass, 4 environmental skips** — skips are **not** merged into the pass total.

Static-vs-runtime breakdown:
- Static-only files: 8 (governance/duplication scans, storage governance, navigation matrix)
- Live-DB harness files: 6 (P3B-R, P3D-B2a/b/c, P3E-A/B, P3-runtime-certification)
- Provider-stub files: 2 (P3E-B provider stub, P3D-B3 dry-run service)
- Preview/approval + baseline + P3E-C certification: 4

Build & quality:

| Check | Result |
|---|---|
| `tsgo --noEmit` | ✅ zero errors |
| Production build (vite) | ✅ (last run in P3H; no source changes in P3I) |
| Targeted lint (P3F/P3G/P3H/P3I files) | ✅ clean |
| Route validation (all `/admin/communication-hub/*` mount) | ✅ 29 routes |
| Duplicate-menu scan | ✅ enforced by `CommHubP3GNavigation.test.ts` |
| Duplicate-route scan | ✅ none |
| Browser-storage governance scan | ✅ `CommHubP3HStorageGovernance.test.ts` (3/3) |
| Provider duplicate-call scan | ✅ enforced by `CommHubP3BRDuplicationScan.test.ts` |

**New Communication Hub errors introduced in P3I:** zero (no source changes).

---

## 6. Final P3 Statuses — Retained

| Stage | Status |
|---|---|
| Dry Run (P3D) | `P3D_CERTIFIED_WITH_ENVIRONMENTAL_TEST_LIMITATION` (unchanged — Blocker 1 not executed) |
| Controlled Live (P3E) | `P3E_STUB_CERTIFIED` (unchanged — Blocker 2 not executed) |
| Unified Journey (P3F) | `P3F_CERTIFIED_WITH_LIMITATIONS` (unchanged) |
| Navigation (P3G) | `P3G_CERTIFIED_WITH_LEGACY_ROUTES` (unchanged) |
| **Overall P3** | **`P3_OPERATOR_ACCEPTED_WITH_LIMITATIONS`** (unchanged) |

---

## 7. Manual Production Recommendation

**Recommendation:** `MANUAL_PRODUCTION_NOT_APPROVED`.

**Rationale:**
- Blocker 1 (P3D role-capable immutability) has no runtime evidence. Manual Production would rely on immutability triggers that are only proven statically. That is insufficient risk cover for a state machine that authorises real sends.
- Blocker 2 (one real-provider controlled test) has never been executed. Manual Production must not begin before a single real send has been demonstrated safely under the canonical evaluator and grant lifecycle.
- Blocker 4 (formal operator sign-off) cannot be completed by the agent; it requires human signatures against real evidence from Blockers 1 and 2.

**What is approved:** the architecture and operator design remain accepted at `P3_OPERATOR_ACCEPTED_WITH_LIMITATIONS`. This is a `MANUAL_PRODUCTION_APPROVED_FOR_DESIGN`-equivalent posture at the architecture level, but the P3I directive requires a single recommendation, so the honest recommendation given open Blockers 1, 2, and 4 is **NOT_APPROVED**.

**Not enabled in this stage:**
- Manual Production remains disabled.
- Operating mode is unchanged.
- No cron, bulk, or external-recipient rollout is initiated.

---

## Completion report

**CH-SIMPLE-P3I — Pre-Manual-Production Blocker Closure**

| Item | Result |
|---|---|
| P3D staging test evidence | Not collected in this stage — sandbox lacks privileged staging DB. Execution plan documented in §1. |
| Real-provider evidence | Not collected in this stage — sandbox lacks live SMTP + operator terminal. Execution plan documented in §2. |
| Inbox/delivery confirmation | N/A — dependent on §2. |
| Legacy-route review | ✅ Complete (§3). Five retained routes reviewed; no removal candidates during P3I. |
| Operator sign-off | Structure complete; human signatures pending Blockers 1 and 2. |
| Full regression totals | 20 files pass, 133 assertions pass, 4 environmental skips (reported separately). |
| Final statuses | All P3 statuses **retained** — no upgrade permitted while any blocker test remains skipped. |
| Remaining limitations | (a) P3D role-capable immutability un-run against staging DB. (b) P3E real-provider path un-run. (c) Legacy routes retained under banners per P3H §9. |
| Manual Production recommendation | `MANUAL_PRODUCTION_NOT_APPROVED` — reopen after Blockers 1, 2, and 4 close. |

**Stopping after P3I.** Manual Production remains gated. Re-enter this stage after executing Blockers 1 and 2 in staging to produce the evidence needed for status upgrade.
