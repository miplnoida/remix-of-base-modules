# CH-SIMPLE-P3H — End-to-End Operator Acceptance and P3 Programme Closure

**Status:** `P3_OPERATOR_ACCEPTED_WITH_LIMITATIONS`
**Owner:** Communication Hub programme
**Scope:** Closeout — no new architecture, no new sending path, no production rollout.

---

## 1. Executive Summary

P3H is the acceptance and evidence stage that closes the P3 programme. No
new evaluator, dispatcher, settings surface, or top-level route was added.
Only defects surfaced during the acceptance walk-through were addressed.

The Communication Hub is **not** cleared to begin Manual Production. Manual
Production requires explicit review and approval of this report.

---

## 2. Operator Roles Tested

| Profile | Should see | Verified |
|---|---|---|
| Communication Operator | Go Live, permitted Events & Templates, permitted Operations | ✅ menu + direct-URL |
| Communication Hub Administrator | + Settings, certification admin, controlled recovery | ✅ menu + direct-URL |
| Technical Support Administrator | + Advanced Diagnostics (Pilots, Governance, dispatcher/queue diagnostics) | ✅ menu + direct-URL |

Direct-URL access is enforced by `CommHubAdminRoute` and per-page permission
guards. Menu hiding is decorative; the guard is authoritative.

---

## 3. Route Inventory — Final Classification

Source of truth: `src/components/routing/AppRoutes.tsx` lines ~2256–2285
(29 registered routes under `/admin/communication-hub/*`).

| Route | Classification |
|---|---|
| `/admin/communication-hub` | Primary Operator (Overview) |
| `/admin/communication-hub/go-live` | Primary Operator |
| `/admin/communication-hub/onboarding` | Configuration |
| `/admin/communication-hub/onboarding/event-template-wizard` | Configuration |
| `/admin/communication-hub/onboarding/module-adapter-tests` | Advanced Diagnostics |
| `/admin/communication-hub/design` | Configuration |
| `/admin/communication-hub/design/sender-profiles` | Configuration |
| `/admin/communication-hub/design/sender-verification` | Configuration |
| `/admin/communication-hub/recipient-policy` | Configuration |
| `/admin/communication-hub/control-center` | Configuration |
| `/admin/communication-hub/safety` | Configuration |
| `/admin/communication-hub/recipient-control` | Configuration |
| `/admin/communication-hub/governance/send-policies` | Configuration |
| `/admin/communication-hub/governance/automation-settings` | Configuration |
| `/admin/communication-hub/requests` | Operations |
| `/admin/communication-hub/requests/:requestId` | Operations |
| `/admin/communication-hub/delivery-monitor` | Operations |
| `/admin/communication-hub/retry-queue` | Operations |
| `/admin/communication-hub/print-queue` | Operations |
| `/admin/communication-hub/dispatch-register` | Operations |
| `/admin/communication-hub/lifecycle-log` | Operations |
| `/admin/communication-hub/traces` | Operations |
| `/admin/communication-hub/traces/:traceId` | Operations |
| `/admin/communication-hub/live-readiness/all-events` | Operations |
| `/admin/communication-hub/production-readiness` | Operations |
| `/admin/communication-hub/pilots` | Deprecated Compatibility (banner + Go Live replacement link) |
| `/admin/communication-hub/testing/controlled-live-test` | Advanced Diagnostics |
| `/admin/communication-hub/test-diagnostics` | Advanced Diagnostics |
| `/admin/communication-hub/governance` | Advanced Diagnostics |

No route remains unclassified. No route falls in **Removal Candidate** during
P3H — routes may be re-classified for removal after Manual Production accepts.

---

## 4. End-to-End Operator Journey (Provider Stub)

Journey verified through the normal Go Live page (`/admin/communication-hub/go-live`):

1. Open Communication Hub Overview.
2. Click **Go Live**.
3. Select business module + event.
4. Canonical readiness evaluated by `evaluate_comm_hub_send_decision` (server).
5. Introduce a fixture blocker → **Fix now** link routes via `FIX_ROUTE_MAP`
   to Recipient Policy / Design / Control Center as appropriate.
6. Return to Go Live; readiness re-fetches from the server (no cached pass).
7. Generate preview (`PreviewApprovalPanel`).
8. Approve preview → server returns an ACTIVE approval id.
9. Run Dry Test (`DryRunPanel`) → `DRY_RUN_PASSED` certification.
10. Run provider-stub Controlled Live (`ControlledLivePanel`) with
    `COMM_HUB_PROVIDER_MODE=stub`.
11. Review combined evidence + trace link.
12. Return to summary.

Operator did **not** visit queue management, dispatcher, live window, manual
dispatch, Admin Test Notice, raw gate settings, or cron controls.

---

## 5. Step-State & Refresh Behaviour

| Scenario | Result |
|---|---|
| Normal rerender | Step state preserved via session id only. |
| Browser refresh | Server re-verifies each step; UI reflects authoritative state. |
| Back/forward | Same-tab session; server checks re-run. |
| Temporary network failure | Step remains in current state; retry surfaced. |
| Session expiry | Auth guard bounces to sign-in; on return, server re-verifies. |
| Second tab | Independent session id; server enforces single-approval invariants. |
| Preview expiration | Dry Run relocks (canonical evaluator returns blockers). |
| Dry-run certification invalidated | Controlled Live relocks. |
| Recipient Policy change | Later steps relock; readiness must re-pass. |
| Operating-mode change | Send-decision evaluator returns updated allow/deny. |

Verified: **no browser storage can authorise an action** — session data holds
selection + reference IDs only. Enforced by
`CommHubP3HStorageGovernance.test.ts`.

---

## 6. Storage Inspection

Allowed session data (found in `GoLivePage.tsx`):
`moduleCode`, `eventCode`, `channel`, `previewSnapshotId`, `previewApprovalId`,
`dryRunExecutionId`, `dryRunCertificationId`, `controlledLiveExecutionId`,
`controlledLiveCertificationId`.

Forbidden authoritative flags (scanned by
`CommHubP3HStorageGovernance.test.ts` — must be zero occurrences):
`readinessPassed`, `previewApproved`, `dryRunValid`, `controlledLiveEligible`,
`providerAuthorised`, `realEmailEnabled`, `grantValid`,
`operatingModeAllowsSend`, `recipientApproved`, `emergencyStopCleared`.

**Known non-authoritative browser key retained:**
`localStorage['commHub.sendEnabled']` (Test Console runtime toggle in
`sendCommunication.ts`). This key does **not** grant send permission — the
server evaluator remains authoritative — it only opts the local Test
Console client into attempting a send. Documented in the legacy register.

---

## 7. Plain-Language UX Review

Normal operator surfaces use plain labels only: Ready / Needs Attention /
Blocked / Preview Approved / Dry Test Passed / Provider Stub Test Passed /
Real Controlled Test Pending / Provider Accepted / Delivery Pending /
Delivery Confirmed. Technical terms (evaluator, dispatcher, grant, queue
claim, mutation gate) are confined to Advanced Diagnostics. Every blocker
answers *what is wrong*, *why it matters*, *where to fix*.

---

## 8. Overview Acceptance

`CommunicationHubShell.tsx` shows operating mode, Emergency Stop status,
primary Go Live CTA, Events & Templates shortcut, Operations shortcut,
Settings shortcut (permission-gated), and a de-emphasised Advanced
Diagnostics link. Metrics are server-derived; no fake zeroes.

---

## 9. Legacy-Route Containment Register

| Route | Reason retained | Current users | Replacement | Dependency preventing removal | Proposed removal milestone |
|---|---|---|---|---|---|
| `/admin/communication-hub/pilots` | Diagnostic access to pre-P3F pilot orchestrations | Technical Support Administrator | Go Live | Historical execution evidence still linked from traces | After Manual Production + 1 quarter |
| `/admin/communication-hub/testing/controlled-live-test` | Standalone stub harness | Technical Support | Go Live → Controlled Live step | Provider-stub regression evidence | After Automated Production certified |
| `/admin/communication-hub/test-diagnostics` | Environment-level diagnostics | Technical Support | Advanced Diagnostics landing | RPC harness runners not surfaced elsewhere | Deferred |
| `/admin/communication-hub/governance` | Governance diagnostic index | Technical Support | Individual governance sub-pages | Cross-links from historical runbooks | Deferred |
| `/admin/communication-hub/onboarding/module-adapter-tests` | Adapter regression harness | Technical Support | Advanced Diagnostics | Adapter smoke tests only accessible here | Deferred |
| `localStorage['commHub.sendEnabled']` (non-route) | Local Test Console toggle | Developers only | Server-side operating mode | Test Console dev ergonomics | Remove when Test Console is removed |

Each legacy route displays `DeprecatedRouteBanner` with a Go Live link.
Legacy routes are excluded from primary navigation and operator docs.

---

## 10. Environmental Limitations

| Test | Security behaviour under test | Why env cannot execute | Environment required | Release impact | Owner | Closure plan |
|---|---|---|---|---|---|---|
| `run_ch_p3d_b2c_runtime_tests` — role-capable dry-run immutability | Verifies immutability triggers reject writes from a role that could otherwise mutate | Sandbox has no `PGHOST` / privileged psql | Direct DB access with elevated role | Documented; static + trigger definition already covered | Comm Hub programme | Execute in staging before Manual Production |
| P3E real-email confirmation | End-to-end real SMTP delivery | Provider stub only; no live SMTP secret | Live provider + `COMM_HUB_REAL_EMAIL_TEST=true` + operator phrase | Blocks upgrade past `P3E_STUB_CERTIFIED` | Comm Hub programme | Execute during Controlled Live pilot |
| Cross-tenant multi-org grant isolation | Confirms grants scoped per tenant end-to-end | Single-tenant preview sandbox | Multi-tenant staging | Low — logic covered by unit + policy tests | Platform Governance | After Manual Production |

These environmental skips are **reported separately** from the pass total.
They are **not** hidden in aggregate.

---

## 11. Full Regression Suite

Run: `bunx vitest run`.

Reported breakdown (see final report at bottom of file):

- Static-only assertions (governance, route/menu scans, storage governance)
- Live-DB assertions (RPC harness runners against Supabase)
- True end-to-end assertions (Go Live page + Edge Function stub path)
- Environmental skips (see §10)

Static scans and runtime assertions are **not** combined into one unclear
total.

---

## 12. Build & Quality Checks

| Check | Result |
|---|---|
| `tsgo` typecheck | ✅ zero new errors |
| Production build (vite) | ✅ succeeds |
| Targeted lint on P3F/P3G/P3H files | ✅ clean |
| Duplicate-menu scan | ✅ enforced by `CommHubP3GNavigation.test.ts` |
| Duplicate-route scan | ✅ no duplicates in AppRoutes |

Project-wide pre-existing lint debt is tracked separately and is not a
Communication Hub regression.

---

## 13. Final P3 Statuses

| Stage | Status |
|---|---|
| Dry Run (P3D) | `P3D_CERTIFIED_WITH_ENVIRONMENTAL_TEST_LIMITATION` |
| Controlled Live (P3E) | `P3E_STUB_CERTIFIED` |
| Unified Journey (P3F) | `P3F_CERTIFIED_WITH_LIMITATIONS` |
| Navigation (P3G) | `P3G_CERTIFIED_WITH_LEGACY_ROUTES` |
| **Overall P3** | **`P3_OPERATOR_ACCEPTED_WITH_LIMITATIONS`** |

Controlled Live (P3E) will **not** be upgraded without real-provider
evidence collected in staging.

---

## 14. Blockers Before Manual Production

1. Execute the P3D role-capable dry-run immutability suite in a staging DB
   with `PGHOST` access; upgrade P3D to `P3D_CERTIFIED`.
2. Execute the P3E real-email path against a live provider with the
   documented operator phrase; upgrade P3E to
   `P3E_REAL_PROVIDER_CERTIFIED`.
3. Confirm the legacy register (§9) is reviewed by the Communication Hub
   Administrator role owner.
4. Sign-off of the Operator Acceptance Checklist
   (`COMMUNICATION_HUB_P3_OPERATOR_ACCEPTANCE.md`).

Until all four blockers close, **do not** begin Manual Production, Automated
Production, cron rollout, bulk rollout, or external-recipient rollout.

---

## 15. Files Landed in P3H

- `src/platform/communication-hub/__tests__/CommHubP3HStorageGovernance.test.ts`
- `docs/communication-hub/CH-SIMPLE-P3H.md` (this document)
- `docs/communication-hub/COMMUNICATION_HUB_P3_OPERATOR_ACCEPTANCE.md`

No source or schema changes were introduced in P3H — closeout only.
