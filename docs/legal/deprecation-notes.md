# Legal Module — Legacy Page Deprecation Notes

Status: Living document. Updated during Phases 1–4 of the SSB Legal Module rebuild.

Purpose: track legacy screens still reachable in the app, why they exist,
what replaces them, and when they can be safely retired. **No route in this
list is redirected or removed yet** — the Phase 4 cutover will handle that
once the new 360° workspace and 13-section navigation are verified.

## Retirement gating rules

A legacy page can be redirected only when **all** of the following are true:

1. The replacement screen exists under the new IA (`/legal/lg/*`,
   `/legal/services`, `/legal/reports`, `/legal/admin/*`).
2. The replacement has been smoke-tested against real data.
3. Every inbound link (menu, deep link, workflow, edge function, email
   template) that references the legacy path has been updated or aliased.
4. The permission matrix (`useLgAccess`) covers the replacement screen.
5. Phase 4 has shipped and the sidebar reorg is live.

Until then, legacy routes stay wired to keep bookmarks and existing
workflows working.

## Legacy inventory

### Dashboards
| Legacy path | File | Replacement | Notes |
| --- | --- | --- | --- |
| `/legal/ssb/dashboard` (removed from menu) | `SSBLegalDashboard.tsx` | `/legal/lg/dashboard` (`LgDashboard`) | Uses mock KPI adapter. Do NOT re-add to menu. Keep route alive for old bookmarks. |
| `/legal/ops` | `LegalOpsDashboard.tsx` | `/legal/lg/dashboard` | Ops variant; slated for merge into Command Centre in Phase 12. |
| `/legal/dashboard` | `LegalDashboard.tsx` | `/legal/lg/dashboard` | Currently the module landing; will become alias in Phase 4. |

### Cases (legacy CRUD stack)
| Legacy path | File | Replacement | Notes |
| --- | --- | --- | --- |
| `/legal/case-intake` | `CaseIntake.tsx` / `CaseIntakeWizard.tsx` / `IntakeWizard.tsx` | `/legal/lg/cases/new` (`LgCaseCreateWizard`) | Old intake stack — retains mock parties. |
| `/legal/case-tracking` | `CaseTracking.tsx` / `CaseList.tsx` / `LegalCaseList.tsx` | `/legal/lg/cases` | |
| `/legal/case-detail/:id` | `CaseDetailView.tsx` / `LegalCaseView.tsx` / `CaseView.tsx` | `/legal/lg/cases/:id` (13-tab workspace) | Legacy view uses `mockLegalData`. |
| `/legal/case-edit/:id` | `CaseEditView.tsx` / `LgCaseEdit.tsx` | `/legal/lg/cases/:id/edit` | |
| `/legal/ssb/*` | `SSBCaseIntake.tsx`, `SSBCaseList.tsx`, `SSBCaseView.tsx` | Same as above | SSB-prefixed parallel branch. |
| `/legal/new-module` | `NewLegalModule.tsx` | `/legal/lg/dashboard` | Marketing shell — safe to redirect any time. |

### Workbenches
| Legacy path | File | Replacement | Notes |
| --- | --- | --- | --- |
| `/legal/workbench` | `LegalWorkbench.tsx` | `/legal/lg/cases?bucket=my` (Phase 4) | |
| `/legal/workbench?tab=…` | `LegalUnifiedWorkbench.tsx` | Split into `/legal/lg/cases`, `/legal/lg/referrals`, `/legal/services` | Currently the umbrella; keep alive until each sub-tab has a first-class page. |
| `/legal/referrals` | `LegalReferralsWorkbench.tsx` | `/legal/lg/referrals` (Phase 3) | |

### Notices, Orders, Enforcement, Docs, Evidence
| Legacy path | File | Replacement | Notes |
| --- | --- | --- | --- |
| `/legal/notices` | `NoticeGeneration.tsx` | `/legal/lg/notices` (`LgNoticeRegister`) | Register already live. |
| `/legal/appeals` | `AppealSubmission.tsx` | Case tab → Appeals (Phase 4) | Still uses `mockLegalWorkflow`. |
| `/legal/enforcement` | `EnforcementActions.tsx` / `EnforcementPenalty.tsx` | Case tab → Enforcement + `/legal/lg/enforcement` queue (Phase 7) | Penalty screen imports mocks — flagged for deletion. |
| `/legal/orders` (registry) | `CourtOrdersManagement.tsx` / `LegalOrderRegistry.tsx` | Same file, now backed by `lgOrderService` | Phase 6 complete — no mock data remains. |
| `/legal/evidence` | `EvidenceManagement.tsx` | Case tab → Evidence (Phase 4) | |
| `/legal/documents` | `DocumentCenter.tsx` | Case tab → Documents + `/legal/lg/documents` (Phase 9) | |
| `/legal/payment-plans` | `LegalPaymentPlans.tsx` | `/legal/lg/settlements` (Phase 8) | |

### Reports (already redirected — Phase 1 complete)
| Legacy path | File | Replacement | Status |
| --- | --- | --- | --- |
| `/legal/legacy-reports` | `LegalReports.tsx` | `/legal/reports` | Redirect shipped Phase 1. |
| `/legal/ssb-reports` | `SSBLegalReports.tsx` | `/legal/reports` | Redirect shipped Phase 1. |
| `/legal/reports-analytics` | `ReportsAnalytics.tsx` | `/legal/reports` | Redirect shipped Phase 1. |

### Admin / Reference data
| Legacy path | File | Replacement | Notes |
| --- | --- | --- | --- |
| `/legal/admin` | `AdminConfig.tsx` / `LegalAdminHub.tsx` | `/legal/admin/*` cluster | Consolidation deferred to Phase 13. |
| `/legal/reference-data` | `LegalReferenceData.tsx` | `/legal/admin/reference` | |
| `/legal/templates` | `LegalTemplateManagement.tsx` | `/legal/admin/templates` | |
| `/legal/delinquent` | `DelinquentCases.tsx` | Recovery Workbench (Phase 2) | Static list — retire after Phase 2 verification. |
| `/legal/excel-import` | `ExcelImportWizard.tsx` | `/legal/admin/import` | Keep alive for existing imports. |
| `/legal/services` | `LegalServicesHub.tsx` | Same path; content rewritten in Phase 10. | |

### Mock data files still referenced
The following mock modules are still imported by legacy screens and cannot
be deleted until those screens are retired. Do **not** wire them into any
new page.

- `src/data/mockLegalData.ts` — used by `LegalCaseView`, `CaseTable`, `CaseCard`,
  all `src/components/legal/tabs/Case*Tab.tsx`, `LegalCaseContext`,
  `services/legalService.ts`, `adapters/legalApi.ts`.
- `src/data/mockLegalCases.ts` — re-exports from `mockLegalData`.
- `src/data/mockLegalIntake.ts` — used by `IntakeWizard` and legacy intake tabs.
- `src/data/mockLegalWorkflow.ts` — used by `EnforcementPenalty`,
  `AppealSubmission`, workflow admin tabs (`WorkflowRulesTab`,
  `StatusesTab`, `TimelinesTriggersTab`, related dialogs).

These files are quarantined: no new imports allowed. See
`route-retirement-plan.md` for the sequenced deletion order.

## Phase 5 additions (hearings)

- `src/components/legal/tabs/CaseHearingsTab.tsx` — legacy tab (used by
  `LegalCaseView`, `SSBCaseView`). Mock hearings removed; now renders a
  deep-link to the live LG Case 360 hearings tab. Retire alongside the
  parent legacy case views.
- `src/components/legal/ScheduleHearingDialog.tsx` — legacy dialog with a
  callback-only `onSchedule` (no DB write). Superseded by
  `HearingOutcomeDialog` (`create` mode). Retained temporarily; no new
  imports allowed.
