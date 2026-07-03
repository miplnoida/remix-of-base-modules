# Legal V1 — Legacy Retirement Audit

**Date:** 2026-07-03
**Status:** Executed. See `LEGAL_V1_FINAL_ARCHITECTURE_REPORT.md` for the closure report.

---

## 1. Legacy screens found

### Duplicate case-list / detail (mock-context backed)

| File | Route (before) | Data source | Action |
|---|---|---|---|
| `src/pages/legal/SSBCaseView.tsx` | `/legal/cases/:id` (live) | `useLegalCases` mock | **Route redirected** to `/legal/lg/cases/:id`. File marked `@deprecated`. |
| `src/pages/legal/SSBCaseList.tsx` | `/legal/cases` (shadowed) | `useLegalCases` mock | Route removed (already shadowed). File `@deprecated`. |
| `src/pages/legal/SSBLegalDashboard.tsx` | `/legal/dashboard` (shadowed) | Unknown | Route removed. File `@deprecated`. |
| `src/pages/legal/SSBLegalReports.tsx` | `/legal/reports` (shadowed) | Unknown | Route removed. File `@deprecated`. |
| `src/pages/legal/LegalOrderRegistry.tsx` | `/legal/orders` | — | Route now redirects to `/legal/lg/orders`. File `@deprecated`. |
| `src/pages/legal/CaseView.tsx` | not routed | `services/legalService` (legacy) | `@deprecated`. |
| `src/pages/legal/CaseList.tsx` | not routed | — | `@deprecated`. |
| `src/pages/legal/LegalCaseView.tsx` | not routed | `useLegalCase` hook | `@deprecated`. |
| `src/pages/legal/LegalCaseList.tsx` | not routed (thin wrapper) | delegates to `LgCaseList` | `@deprecated`. |
| `src/pages/legal/NewLegalModule.tsx` | `/legal` (bare) | — | `@deprecated`. |
| `src/pages/legal/CaseDetailView.tsx` | `/legal/case-detail/:id` | mixed | `@deprecated`. |
| `src/pages/legal/CaseEditView.tsx` | `/legal/case-edit/:id` | mixed | `@deprecated`. |
| `src/pages/legal/LegalWorkbench.tsx` | `/legal/workbench/legacy` | — | `@deprecated`. |
| `src/pages/legal/CourtOrdersManagement.tsx` | `/legal/court-orders` (already redirects) | real `lg_order` | `@deprecated` — kept only because it correctly links to `LgCaseDetail`. |
| `src/pages/legal/EnforcementActions.tsx` | `/legal/enforcement` (already redirects) | real | `@deprecated`. |
| `src/pages/legal/LegalPaymentPlans.tsx` | `/legal/payment-plans` (already redirects) | real | `@deprecated`. |

### Mock context / mock data

| File | Consumers | Action |
|---|---|---|
| `src/contexts/LegalCaseContext.tsx` | `SSBCaseView`, `SSBCaseList` (both now deprecated) | `@deprecated`. Removal planned once SSBCaseView is deleted. |
| `src/data/mockLegalCases.ts` | `LegalCaseContext` only | `@deprecated`. |
| `src/data/mockLegalData.ts`, `mockLegalIntake.ts`, `mockLegalWorkflow.ts` | none | Orphan — safe to delete in follow-up cleanup. |

### Legacy nav config

| File | Used by | Action |
|---|---|---|
| `src/components/sidebar/menuItems/ssbLegalMenuItems.ts` | none (zero imports) | **Deleted.** |
| `src/components/sidebar/menuItems/legalManagementMenuItems.ts` | active sidebar | Canonical. Kept. |

### `/legal-advanced/*` and `/legal-final/*`

- `/legal-advanced/*` — every route is already a `<Navigate>` to `/legal/*`. Page files under `src/pages/legal-advanced/` are unreachable outside the `LegalAdvancedGate` feature flag (`LAPlaceholder` stubs). Left as-is for the flag; no menu entries.
- `/legal-final/*` — 10-route standalone prototype under `src/pages/legalFinal/`, not in any menu and not wrapped in `LegalRouteGuard`. Retained for possible reference; no active nav path.

---

## 2. Routes verified

Every capability now has **one canonical route** (under `LegalRouteGuard`, all reading real `lg_*` tables):

| Capability | Canonical route | Screen |
|---|---|---|
| Legal Dashboard | `/legal/dashboard` | `LegalDashboard` |
| Lg Dashboard | `/legal/lg/dashboard` | `LgDashboard` |
| Ops Dashboard | `/legal/ops` | `LegalOpsDashboard` |
| Cases list | `/legal/lg/cases` (+ `/legal/cases` via `CaseTracking` wrapper) | `LgCaseList` |
| Matter Workspace (detail) | `/legal/lg/cases/:id` | `LgCaseDetail` |
| Case create | `/legal/lg/cases/new` | `LgCaseCreateWizard` |
| Case edit | `/legal/lg/cases/:id/edit` | `LgCaseEdit` |
| Intake workbench | `/legal/lg/intake` | `LgIntakeWorkbench` |
| Intake workspace | `/legal/lg/intake/:id` | `LgIntakeWorkspace` |
| Hearings calendar | `/legal/lg/hearings` (+ `/legal/hearings`) | `LgHearingCalendar` |
| Hearing workbench | `/legal/lg/hearing-workbench` | `LgHearingWorkbench` |
| Hearing workspace | `/legal/lg/hearings/:id` | `LgHearingWorkspace` |
| Judicial Orders | `/legal/lg/orders` | `LgJudicialOrdersWorkbench` |
| Order detail | `/legal/lg/orders/:id` | `LgOrderDetail` |
| Post-judgment workspace | `/legal/lg/post-judgment/:caseId` | `LgPostJudgmentWorkspace` |
| Judgment compliance | `/legal/lg/judgment-compliance` | `LgJudgmentComplianceWorkbench` |
| Consent Orders | `/legal/lg/consent-orders` | `LgConsentOrdersWorkbench` |
| Settlements | `/legal/lg/settlements` | `LgLegalSettlementsWorkbench` |
| Court Filings | `/legal/lg/court-filings` | `LgCourtFilingsWorkbench` |
| External Counsel | `/legal/lg/external-counsel` | `LgExternalCounselWorkbench` |
| Legal Cost Recovery | `/legal/lg/cost-recovery` | `LgLegalCostRecoveryWorkbench` |
| Recovery Workbench | `/legal/lg/recovery` | `LgRecoveryWorkbench` |
| Recovery Assignments | `/legal/lg/recovery-assignments` | `LgRecoveryAssignmentWorkbench` |
| Assignment workspace | `/legal/lg/recovery-assignments/:id` | `LgRecoveryAssignmentWorkspace` |
| Recovery Campaigns | `/legal/lg/recovery-campaigns` | `LgRecoveryCampaignsList` |
| Legal Recovery Dashboard | `/legal/lg/legal-recovery-dashboard` | `LgLegalRecoveryDashboard` |
| Referrals workbench | `/legal/referrals-workbench` | `LegalReferralsWorkbench` |
| Notices register | `/legal/notices` | `LgNoticeRegister` |
| Notice generation | `/legal/notices/generate` | `NoticeGeneration` |
| Tasks | `/legal/tasks`, `/legal/lg/tasks` | `LgTasksList` |
| Unified Workbench | `/legal/workbench` | `LegalUnifiedWorkbench` |
| Reports hub | `/legal/reports` | `LgReportsHub` |
| Documents Center | `/legal/documents` | `LegalDocumentCenter` |
| Admin hub | `/legal/admin` | `LegalAdminHub` |

### Redirects added / kept

| Legacy path | → | Canonical |
|---|---|---|
| `/legal/cases/:id` | ➜ | `/legal/lg/cases/:id` (`LgCaseDetail`) — **NEW** |
| `/legal/orders` | ➜ | `/legal/lg/orders` — **NEW** |
| `/legal/court-orders` | ➜ | `/legal/lg/orders` (pre-existing) |
| `/legal/enforcement` | ➜ | `/legal/lg/orders` (pre-existing) |
| `/legal/payment-plans` | ➜ | `/legal/lg/orders` (pre-existing) |
| `/legal/lg/referrals` | ➜ | `/legal/referrals-workbench` (pre-existing) |
| `/legal/lg/my-work` | ➜ | `/legal/lg/tasks?view=my` (pre-existing) |
| `/legal/recovery/assignments[/:id]` | ➜ | `/legal/lg/recovery-assignments[…]` (pre-existing) |
| `/legal/templates` | ➜ | `/admin/notification-templates?tab=core&module=LEGAL` (pre-existing) |
| `/legal-advanced/*` (18 paths) | ➜ | canonical `/legal/*` (pre-existing) |
| `/legal-advanced/matters/:id` | ➜ | `/legal/lg/cases/:id` via `LegalAdvancedMatterRedirect` (pre-existing) |

### Routes REMOVED (shadowed dead code)

| Path | Was pointing at | Reason |
|---|---|---|
| `/legal/dashboard` (second registration) | `SSBLegalDashboard` | Shadowed by `LegalDashboard` |
| `/legal/cases` (second registration) | `SSBCaseListPage` | Shadowed by `CaseTracking→LgCaseList` |
| `/legal/cases/new` (second registration) | `LgCaseCreateWizard` | Duplicate |
| `/legal/hearings` (second registration) | `LegalHearingCalendar` | Duplicate |
| `/legal/reports` (second registration) | `SSBLegalReports` | Shadowed by `LgReportsHub` |

---

## 3. Menu verified

The active sidebar composes `legalManagementMenuItems.ts` only. `ssbLegalMenuItems.ts` had **zero imports** and has been **deleted**. No duplicate or hidden legal menus remain. All menu URLs resolve to canonical screens (or redirects that terminate on canonical screens).

---

## 4. "Open Case / View Details" action targets

Confirmed all case-open buttons in currently-reachable screens navigate to `/legal/lg/cases/:id` → `LgCaseDetail` (real `lg_case*` tables):

| Screen | Handler line | Target |
|---|---|---|
| `LgCaseList` | 151–158 | `/legal/lg/cases/${id}` ✅ |
| `LgHearingWorkbench` | 107, 251, 255–256 | `/legal/lg/cases/${lg_case_id}` ✅ |
| `CourtOrdersManagement` (legacy but linked correctly) | 70, 87 | `/legal/lg/cases/${lg_case_id}` ✅ |
| `EnforcementActions` (legacy) | 100, 113 | `/legal/lg/cases/${lg_case_id}` ✅ |
| `LegalPaymentPlans` (legacy) | 81, 91 | `/legal/lg/cases/${lg_case_id}` ✅ |

The only remaining pointer to `SSBCaseView` was the `/legal/cases/:id` route itself. That route now redirects to the canonical Matter Workspace, so `SSBCaseView` is unreachable in normal navigation.

---

## 5. Services verified

Services with **0 static import sites** in the audit that must **not** be deleted because they are consumed via dynamic `await import()`:

- `legalCaseEnrichmentService` — invoked by `lgIntakeService.ts:505` via dynamic import.
- `lgHearingStateMachine`, `lgReferralStateMachine`, `assignmentStateMachine`, `lgJudicialTaskAutomation` — state-machine / automation modules loaded by workflow engines and admin tools on demand; retained.

No mock providers, no duplicate repositories, no unused contexts are in the active runtime path. `LegalCaseContext` (mock) is marked `@deprecated` and will be removed once `SSBCaseView` is deleted.

---

## 6. Components verified

Shared/canonical component families in `src/components/legal/`:

- Case Header — `components/legal/lg/CaseHeader*`
- Financial Summary — `components/legal/lg/CaseCompletenessPanel`, `Financials*Tab`
- Party Card / Grid — `components/legal/tabs/CasePartiesTab`
- Liability Grid — `components/legal/lg/LiabilityGrid`, Recovery Workbench uses same
- Order Summary — `components/legal/tabs/CaseOrdersTab`
- Timeline — `components/legal/tabs/CaseTimelineTab`
- Compliance Panel — Matter Workspace referral packet section

No duplicated variants were introduced by this audit. Follow-up: consolidate `Legacy Case Detail` tabs (only used by deprecated `CaseDetailView`) into shared `Lg*` tabs when that file is deleted.

---

## 7. Data-source audit

Every canonical screen reads from `lg_case`, `lg_case_party`, `lg_recoverable_liability`, `v_lg_case_financials`, `lg_hearing`, `lg_order`, `lg_appeal`, `lg_enforcement_action`, `lg_recovery_assignment`, `lg_consent_order`, `lg_external_counsel*`, `lg_court_filing`, `lg_legal_cost` — never from mock data. The only remaining mock-data reader (`SSBCaseView`) is now off the routing table.

---

## 8. Actions taken this pass

1. Added `LegacyLegalCaseRedirect` component in `AppRoutes.tsx`.
2. Rewrote the "SSB Legal" route block (`AppRoutes.tsx` ~2478–2502) to:
   - keep `/legal/auth`;
   - redirect `/legal/cases/:id` → `/legal/lg/cases/:id`;
   - keep canonical `/legal/cases/:id/edit` → `LgCaseEdit`;
   - redirect `/legal/orders` → `/legal/lg/orders`;
   - keep `/legal/documents` → `LegalDocumentCenter`;
   - remove shadowed duplicates for `/legal/dashboard`, `/legal/cases`, `/legal/cases/new`, `/legal/hearings`, `/legal/reports`.
3. Deleted `src/components/sidebar/menuItems/ssbLegalMenuItems.ts` (zero imports).
4. Added `@deprecated` JSDoc banner to 17 legacy files (see §1).
5. Left mock data files, `LegalCaseContext`, and `/legal-advanced` page stubs in-tree with `@deprecated` markers; deletion deferred to a follow-up cleanup pass once the feature-flag consumers are audited.

---

## 9. Follow-up (technical debt)

- Delete `SSBCaseView.tsx`, `SSBCaseList.tsx`, `LegalCaseContext.tsx`, `mockLegalCases.ts` after one release cycle confirms no external callers.
- Delete `src/data/mockLegalData.ts`, `mockLegalIntake.ts`, `mockLegalWorkflow.ts` (already unreachable).
- Delete `src/pages/legalFinal/*`, `src/components/legalFinal/*`, `src/services/legalFinalService.ts`, `src/types/legalFinal.ts` after one release cycle. All files carry `@deprecated` banners as of 2026-07-03.
- Migrate `CourtOrdersManagement`, `EnforcementActions`, `LegalPaymentPlans` UIs into `LgJudicialOrdersWorkbench` tabs and delete the standalone files.
- Rewire `useLegalCases` consumers in Matter Workspace tabs that still call `getCaseById()` to read from `legalMatterWorkspaceService`.

---

## 10. Tech-debt cleanup pass — 2026-07-03 (evening)

Post-retirement follow-up executed:

| Item | Change | Result |
|---|---|---|
| Task route duplication | `/legal/tasks` now `<Navigate to="/legal/lg/tasks" replace />`. `/legal/lg/tasks` is the sole canonical route. | Menu items (`CommandCentreWidgets`, `/legal/lg/my-work`) already targeted the canonical route — no updates needed. |
| `refreshFinancialSnapshot` | Rewritten to read `v_lg_case_financials` (with `lg_recoverable_liability` fallback when the view has no row). No longer reads `lg_case_action`. | `lg_case_action` is now backward-compat only — no financial code path treats it as source of truth. |
| `legalFinal/` prototype | All 10 `/legal-final/*` routes now `<Navigate>` to canonical Legal V1 screens. Lazy imports removed from `AppRoutes.tsx`. Every file under `src/pages/legalFinal/`, `src/components/legalFinal/`, `src/services/legalFinalService.ts`, `src/types/legalFinal.ts` carries an `@deprecated` banner. | Unreachable as a live UI; scheduled for deletion. |
| Standalone Orders/Enforcement/PaymentPlans | `CourtOrdersManagement`, `EnforcementActions`, `LegalPaymentPlans` lazy imports removed from `AppRoutes.tsx`. Legacy paths `/legal/court-orders`, `/legal/enforcement`, `/legal/payment-plans` continue to redirect to `/legal/lg/orders`. | Pages are unreachable except through safe redirect targets that no longer resolve to the deprecated components. |

---

## Typecheck

`bunx tsgo --noEmit` — clean (2026-07-03, post cleanup pass).

