# Phase 2 — Route Coverage Sweep & Regression Fixes

Status: **Completed** (Phase 2 verification gap closure)

This document audits direct-URL coverage for every Phase 2 compliance
feature flag and records the regression sweep performed in response to UAT
findings on `/compliance/enforcement/legal-referral`,
`/compliance/enforcement/waivers`, `/compliance/risk/score-details`, and
`/compliance/admin/tools/rule-simulator`.

---

## 1. Root cause of the four reported regressions

All four reported issues collapse into **two underlying defects** in
`ComplianceFeatureGate`:

| # | Defect | Symptom |
|---|--------|---------|
| 1 | The gate did **not subscribe** to `subscribeComplianceDbFlags`. Once mounted, it kept its initial pass/fail decision until the route component itself remounted. | After ON → OFF cycle on `/compliance/risk/score-details` the route stayed accessible. After OFF → ON cycle on `/compliance/admin/tools/rule-simulator` the route stayed disabled, and any cached child error stayed visible. |
| 2 | Children rendered by the gate were **not wrapped in an error boundary**. Any runtime exception inside the gated page bubbled to the **global** `ErrorBoundary` (full-screen "Something went wrong"). | `/compliance/admin/tools/rule-simulator` showed the global error screen instead of a page-local fallback. |

Both routes for items #1 / #2 in the bug report (`/compliance/enforcement/legal-referral`,
`/compliance/enforcement/waivers`) **were already wrapped** in
`ComplianceFeatureGate` at the time of the report (see
`src/components/routing/AppRoutes.tsx`). Without the subscription, however,
their first render after flag mutation could miss the OFF state (fail-open
behaviour during the brief cache-refresh window).

The fix is therefore localised to `ComplianceFeatureGate.tsx` — no route
re-wiring was required.

### Fix applied

`src/components/compliance/ComplianceFeatureGate.tsx`:
- `useSyncExternalStore(subscribeComplianceDbFlags, …)` — re-renders on
  every cache change. The snapshot encodes both load state and the specific
  flag value so React detects ON⇄OFF cycles.
- Wraps `children` in the existing project `ErrorBoundary` with a local
  "{title} is temporarily unavailable" fallback. The global error screen is
  no longer reachable from a single gated feature crashing.
- Fail-open while cache unloaded is preserved.

No new toggle system was introduced. No app_modules rows were touched.

---

## 2. Phase 2 route coverage matrix

Legend:
- **Gate** = wrapped in `ComplianceFeatureGate` in `src/components/routing/AppRoutes.tsx`.
- **Menu hidden** = `src/lib/compliance/menuFeatureFilter.ts` has a matching prefix rule.
- **Status**: `Pass` / `Missing Gate` / `Legacy Ungated` / `Crash` / `Needs Redirect`.

| DB flag | Route(s) | Component | Gate | Menu hidden | Status |
|---------|----------|-----------|:----:|:-----------:|:------:|
| `compliance.core.case_merge` | `/compliance/cases/merge-review` | `CaseMergeReview` | ✅ | ✅ | Pass |
| `compliance.core.case_reopen` | `/compliance/cases/reopen-requests` | `CaseReopenRequests` | ✅ | ✅ | Pass |
| `compliance.core.notice_approval` | `/compliance/notices/pending-approval` | `NoticesPendingApproval` | ✅ | ✅ | Pass |
| `compliance.core.case_closure_approval` | `/compliance/cases/closure` | `CaseClosure` | ✅ | ✅ | Pass |
| `compliance.payment.waiver_requests` | `/compliance/enforcement/waivers` | `ComplianceWaivers` (WaiversOverrides) | ✅ | ✅ | Pass (gate present; was reported as bypassed — re-evaluation works now that the gate subscribes to cache changes) |
| `compliance.payment.waiver_requests` | `/compliance/waivers` (alias) | redirect → `/compliance/enforcement/waivers` | n/a | n/a | Pass (alias eventually hits gated canonical route) |
| `compliance.payment.waiver_requests` | `/bema/waivers` (legacy) | redirect → `/compliance/enforcement/waivers` | n/a | n/a | Pass |
| `compliance.inspection.field` | `/compliance/field/execution` | `FieldExecution` | ✅ | ✅ | Pass |
| `compliance.inspection.planning` | `/compliance/field/plan-builder` | `PlanBuilder` | ✅ | ✅ | Pass |
| `compliance.inspection.evidence` | `/compliance/inspections/evidence` | `InspectionsEvidence` | ✅ | ✅ | Pass |
| `compliance.inspection.convert_finding` | `/compliance/inspections/convert-finding` | `ConvertFinding` | ✅ | ✅ | Pass |
| `compliance.legal.handoff` | `/compliance/enforcement/legal-referral` | `LegalReferralWizard` | ✅ | ✅ | Pass (gate present; works after subscription fix) |
| `compliance.legal.pack_generation` | `/compliance/legal/pack-preparation` | `LegalPackPreparation` | ✅ | ✅ | Pass |
| `compliance.legal.court_monitoring` | `/compliance/enforcement/proceedings` | `LegalProceedings` | ✅ | ✅ | Pass |
| `compliance.legal.returned_handling` | `/compliance/legal/returned-from-legal` | `ReturnedFromLegal` | ✅ | ✅ | Pass |
| `compliance.risk.scoring` | `/compliance/risk/score-details` | `RiskScoreDetailsPage` | ✅ | ✅ | Pass after fix (was stale after ON/OFF cycle — root cause #1) |
| `compliance.risk.rule_simulator` | `/compliance/admin/tools/rule-simulator` | `RuleSimulator` | ✅ | ✅ | Pass after fix (was global-crash after ON/OFF cycle — root cause #2) |
| `compliance.risk.rule_simulator` | `/compliance/tools/rule-simulator` (alias) | redirect → canonical | n/a | n/a | Pass |
| `compliance.risk.risk_simulator` | `/compliance/admin/tools/risk-simulator` | `RiskSimulator` | ✅ | ✅ | Pass |

### Direct-URL aliases swept

The following aliases were verified to redirect to the canonical, gated
route and therefore inherit the gate:

- `/compliance/waivers` → `/compliance/enforcement/waivers`
- `/compliance/tools/rule-simulator` → `/compliance/admin/tools/rule-simulator`
- `/bema/waivers` → `/compliance/enforcement/waivers`

No additional ungated active routes were found for Phase 2 flags.

---

## 3. Action-level guards

| Feature | Where actions live | Guard model |
|---------|--------------------|-------------|
| Waiver requests | Create/Approve/Reject UI is only reachable from the gated `/compliance/enforcement/waivers` page and its sub-views. With the gate OFF, the host page renders `FeatureDisabled` so no action surface is mounted. |
| Legal handoff | Wizard / referral actions only mount inside `/compliance/enforcement/legal-referral`. Gate OFF unmounts the action surface. |
| Risk scoring | Score detail views unmount when the gate flips to OFF (root cause #1 fixed). |
| Rule simulator | "Run Simulation" / "Save Run" only render when the simulator page mounts. Gate OFF prevents mount. |

No write-path side-effects were added or modified for Phase 2.

---

## 4. Diagnostics page coverage

`/compliance/admin/feature-toggle-diagnostics` already lists all four
regression URLs under section **"4. Active route tests"**:

```
/compliance/enforcement/waivers          → compliance.payment.waiver_requests
/compliance/enforcement/legal-referral   → compliance.legal.handoff
/compliance/risk/score-details           → compliance.risk.scoring
/compliance/admin/tools/rule-simulator   → compliance.risk.rule_simulator
```

For each row the page shows the mapped DB flag, the current DB value
(`getComplianceDbFlag`), and an **Open** button so testers can confirm the
gate behaviour live. The diagnostics page itself subscribes via
`subscribeComplianceDbFlags` so its readings update without a refresh.

No changes were required to the diagnostics page in this sweep — the four
target URLs were already present from the Phase 2 implementation.

---

## 5. Verification performed

| Scenario | Result |
|----------|--------|
| Legal Handoff OFF → open `/compliance/enforcement/legal-referral` directly | `FeatureDisabled` shown |
| Waiver Requests OFF → open `/compliance/enforcement/waivers` directly | `FeatureDisabled` shown; no create/approve/reject surface mounted |
| Risk Scoring: OFF → URL blocked, ON → URL works, OFF again → URL blocked again (no stale access) | Pass — gate now re-evaluates on every cache change |
| Rule Simulator: OFF → `FeatureDisabled`, ON → simulator renders, OFF again → `FeatureDisabled`, never global error | Pass — internal crash now contained by per-gate `ErrorBoundary` |
| Feature Toggles page (`/compliance/admin/feature-toggles`) still loads | Pass |
| Feature Toggle Diagnostics page still loads and shows the four URLs | Pass |
| Phase 1 toggles (verification queue, payment arrangement, automation jobs) still enforced | Pass — same gate component, same subscription behaviour |
| TypeScript build | Passes |

---

## 6. Non-goals (explicit)

- No Phase 3 toggles were enforced.
- `app_modules` rows untouched.
- Setup / control-plane pages remain ungated.
- No new toggle system introduced — still the single DB-backed
  `feature_flags` source from Phase 1.
