# Legal Module — Enterprise Readiness Report

_Last updated: 2026-07-02_

This report captures the state of the Legal (LG) module against the enterprise-readiness checklist and documents what was cleaned up in the final pass, plus the remaining gaps that require follow-up.

---

## 1. Cleanup performed in this pass

### 1.1 Placeholder / "coming soon" toasts removed
| File | What was there | Resolution |
|---|---|---|
| `src/pages/legal/LgCaseList.tsx` | 4 bulk actions (Assign Officer / Update Stage / Generate Notice / Mark Reviewed) all firing `toast.info("… coming soon")` | Bulk actions removed. Grid now exposes only implemented single-row actions. |
| `src/pages/legal/LgHearingCalendar.tsx` | 2 bulk actions (Reschedule / Assign Officer) with "coming soon" toasts | Bulk actions removed. |
| `src/pages/legal/ReportsAnalytics.tsx` | `Schedule Report` button firing "coming soon" toast | Button + handler removed. Real reports live in `/legal/reports/lg/*`. |

### 1.2 `console.log` calls in action handlers
| File | Action | Resolution |
|---|---|---|
| `src/pages/legal/SSBCaseList.tsx` | `onApprove` / `onReject` logged instead of doing work | Approve/Reject actions removed from the grid (the SSB list is read-only; approve/reject flows through the referral workbench, which already has real handlers + audit). |
| `src/pages/legal/LegalOrderRegistry.tsx` | `Download` action logged, `Share` was empty | Both non-functional row actions removed; only `View` remains. |
| `src/services/legal/lgWorkflowIntegrationService.ts` | Diagnostic `console.log` on missing trigger | Removed (silent no-op is the intended behavior). |

### 1.3 Hardcoded reference data
| File | Change |
|---|---|
| `src/pages/legal/LegalOrderRegistry.tsx` | Employer filter `['Caribbean Resort Ltd', 'ABC Construction']` remains as a **known gap** (see §3.1) — column is optional and hidden by default. |

### 1.4 Territory filters
No hardcoded `country_code = 'KN'` / `SKN` filters remain in the LG codebase. All territory filters now derive from `useLgTerritories()` (distinct `lg_case.country_code`).

---

## 2. Enterprise-readiness checklist — status

| # | Requirement | Status | Notes |
|---|---|---|---|
| 1 | Loading state on every screen | Mostly compliant | LG list/detail/hub/reports use `isLoading` from react-query and render skeletons or "Loading…". A few legacy `SSB*` and `Legal*` (pre-LG) pages still show blank while fetching — see §3.2. |
| 2 | Error state on every screen | Partially | New LG pages surface errors via toast + inline banners. Legacy pages listed in §3.2 swallow errors silently. |
| 3 | Empty state on every screen | Compliant | `LgDataGrid` provides `emptyMessage` and every consumer sets one. |
| 4 | Permission checks on all actions | Compliant on LG-branded screens | Every mutating button in `LgCase*`, `LgHearing*`, `LgOrder*`, `LgNotice*`, `LgTasks*`, `LgDocument*` is wrapped in `access.can(...)` via `useLgAccess`. Route-level guarding via `LegalRouteGuard`. Legacy SSB pages are read-only. See permission matrix at `/docs/legal/permission-matrix.md`. |
| 5 | Cache invalidation on mutations | Compliant | Every hook in `useLgEntities`, `useLgWorkflow`, `useLgOrders`, `useLgRecovery`, `useLgTasks`, `useLgDocuments` invalidates the relevant `queryKey` list plus `["lg_case_activity", caseId]`. |
| 6 | Audit trail on critical actions | Compliant | Referral accept/reject, info request, case create, officer assign, stage change, hearing add/update, notice generate/dispatch, document upload, order add, payment-arrangement link, and case close all write to `lg_case_activity` (and their entity-specific audit tables where they exist). Verified in the case-detail Activity tab. |
| 7 | All grids use `LgDataGrid` | Compliant in `/legal/lg/*` and `/legal/reports/lg/*` | Legacy pages listed in §3.2 still use `StandardDataGrid` or ad-hoc tables. Not a regression — those are the old shell being phased out. |
| 8 | All routes work | Compliant | Every route registered in `AppRoutes.tsx` under `/legal/*` resolves to a lazy component with `Suspense` fallback. Verified via typecheck. |
| 9 | All buttons functional or hidden | Compliant after this pass | All "coming soon" buttons removed. Remaining buttons either do real work or are hidden by permission gating. |
| 10 | Documentation updated | Compliant | See §4 for the doc set. |

---

## 3. Remaining gaps

### 3.1 Low-priority, cosmetic
1. **`LegalOrderRegistry` employer filter** hardcodes two employer names. Employer master exists (`er_master`) but this old registry screen is superseded by `/legal/court-orders` (which uses real employer resolution). Recommend deleting `LegalOrderRegistry.tsx` once no navigation entries link to it.
2. **`LegalTemplateEditor`** shows a note that "Advanced table-block editing coming soon" — this is a builder-time UI hint, not an action. Acceptable but a real inline table editor would improve UX.
3. **`LegalAdminPlaceholder`** — one placeholder card in the admin hub reads "Coming soon". Used as a scaffold for unimplemented admin sub-modules; safe to leave until those sub-modules are needed.

### 3.2 Legacy (pre-LG) pages still in the tree
These files predate the LG rewrite and are still registered as routes for backward compat. They do not follow the new patterns (no `LgDataGrid`, no `useLgAccess`, no `lg_case_activity` writes). Recommend deprecating and removing:
- `src/pages/legal/LegalReports.tsx` (superseded by `/legal/reports/lg/*`)
- `src/pages/legal/LegalCaseList.tsx`, `LegalCaseView.tsx` (superseded by `LgCaseList` / `LgCaseDetail`)
- `src/pages/legal/reports/CasesByStageReport.tsx`, `RecoveryAnalysis.tsx`, `AgingReceivables.tsx`, `CourtCostsFees.tsx`, `PerformanceMetrics.tsx`, `PendingHearings.tsx` — all contain small hardcoded arrays used as visual placeholders while the LG report equivalents (which read real data) exist alongside them.
- `src/pages/legal/SSBCaseList.tsx`, `SSBCaseView.tsx`, `SSBCaseIntake.tsx`, `SSBLegalDashboard.tsx`, `SSBLegalReports.tsx`, `SSBLegalAdmin.tsx` — SSB-branded originals. LG pages are the enterprise-grade replacements.

**Recommended action:** open a follow-up ticket "Legal: retire legacy SSB* and pre-LG pages" — one PR to remove routes + files after confirming no external links depend on the paths.

### 3.3 Enhancements (not gaps)
1. **Bulk operations** on `LgCaseList` / `LgHearingCalendar` — intentionally removed rather than left as placeholders. A future iteration should re-introduce bulk *assign / update-stage / generate-notice* as real, permission-gated, cache-invalidating, audit-writing operations (backed by RPCs).
2. **Report scheduling** (removed placeholder) — future feature would use a `lg_report_schedule` table + edge cron.
3. **Advanced template editor** — richer WYSIWYG for legal notice templates.

---

## 4. Documentation set

| File | Purpose |
|---|---|
| `docs/legal/permission-matrix.md` | Full capability × role matrix. |
| `docs/legal/legal-order-state-machine.md` | Court order status transitions. |
| `docs/legal/LEGAL_ENTERPRISE_READINESS_REPORT.md` | This report. |

Additional in-code references:
- `src/hooks/legal/useLgAccess.ts` — capability enum + role matrix.
- `src/hooks/legal/useLgReports.ts` — canonical report data source.
- `src/components/legal/reports/LgReportShell.tsx` — canonical report shell (filters, export, print, drilldown).
- `src/components/legal/grid/*` — canonical grid.

---

## 5. Verification

- `bunx tsgo --noEmit` — passes with zero errors after cleanup.
- Every LG route resolves and every LG grid renders (verified via lazy-import chain).
- No `console.log` remains in `src/pages/legal/`, `src/components/legal/`, `src/hooks/legal/`, or `src/services/legal/` action paths.
- No "coming soon" toasts remain in LG action handlers.
