## Problem

A full audit of `src/components/sidebar/menuItems/complianceMenuItems.ts` against `src/components/routing/AppRoutes.tsx` shows **19 menu items that are visible by default but have no matching `<Route>`** — they all fall through to the catch-all `NotFound` (404). The 2 you just hit (Evidence, Convert Finding To Violation) are part of this same gap.

The previous sweeps only fixed the items called out by name. The root cause is methodological: prior sweeps matched on prefix, not exact path, so any child path whose parent existed looked "green". This plan walks every leaf and fixes all of them at once.

## Missing routes (all visible by default, all have page files already in `src/pages/compliance/...`)

```text
Inspections
  /compliance/inspections/evidence              → InspectionEvidencePage
  /compliance/inspections/convert-finding       → ConvertFindingToViolationPage

Violations
  /compliance/violations/verification-queue     → VerificationQueue
  /compliance/violations/rule-detected          → RuleDetectedViolations
  /compliance/violations/duplicate-review       → DuplicateReview
  /compliance/violations/history                → ViolationHistory

Cases
  /compliance/cases/intake                      → CaseIntake
  /compliance/cases/assigned                    → AssignedCases
  /compliance/cases/merge-review                → CaseMergeReviewPage
  /compliance/cases/reopen-requests             → ReopenRequestsPage
  /compliance/cases/closure                     → CaseClosurePage

Legal
  /compliance/legal/pack-preparation            → LegalPackPreparationPage
  /compliance/legal/approved-escalations        → ApprovedEscalationsPage
  /compliance/legal/returned-from-legal         → ReturnedFromLegalPage

Risk
  /compliance/risk/score-details                → RiskScoreDetailsPage
  /compliance/risk/repeat-defaulters            → RepeatDefaultersPage
  /compliance/risk/high-risk                    → HighRiskEmployersPage
  /compliance/risk/watchlist                    → WatchlistPage

Reports
  /compliance/reports/automation-jobs           → AutomationJobReports
```

## Changes

1. **`src/components/routing/AppRoutes.tsx`** — add lazy imports + `<Route>` entries for all 19 paths above, wrapped in the same `ProtectedRoute` / `Suspense` pattern used by neighboring compliance routes. No redirects; each maps to its existing page file.

2. **`docs/compliance/route_acceptance_sweep.md`** — replace the old prefix-match check with an **exact-leaf** assertion: extract every `url` from `complianceMenuItems.ts` and every `path` from `AppRoutes.tsx`, then diff. Record the full leaf-by-leaf table so this class of regression is caught.

3. **No changes** to feature toggles, menu structure, permissions, or business logic. Page files already exist and are unchanged.

## Acceptance

- All 6 Inspections menu items resolve to their page (no 404).
- All 19 paths above resolve to their page when clicked from the sidebar.
- `comm -23 <menu_urls> <route_urls>` returns empty for `/compliance/*`.
- TypeScript build passes.
- Schedule Settings and other intentionally-hidden items remain hidden (no toggle changes).
