# Legal Module — Route Retirement Plan

Phase 4 cutover sequence for legacy Legal routes. Nothing here executes in
Phase 1; this document is the plan we will follow after the new 360°
workspace and 13-section navigation are verified.

## Guiding principles

- **Zero-break**: every legacy path either resolves to the new screen or
  shows an explicit "moved" banner with a working link.
- **Alias, then remove**: replace legacy files with a one-line `<Navigate>`
  first; delete files only after one release with no traffic.
- **Menu first, routes second**: remove the sidebar entry before
  redirecting the route so users stop discovering the legacy path.
- **Mocks last**: `src/data/mockLegal*.ts` files stay until every importer
  is removed. Deleting them earlier will break the legacy pages we
  promised to keep alive.

## Wave 1 — Duplicates already handled (Phase 1)

Already shipped:

- `LegalReports.tsx`, `SSBLegalReports.tsx`, `ReportsAnalytics.tsx` →
  redirect to `/legal/reports`.

No further action.

## Wave 2 — Marketing / empty shells (safe first move in Phase 4)

Low-risk redirects — no data entry, no bookmarks worth preserving.

| Legacy | Target |
| --- | --- |
| `/legal/new-module` (`NewLegalModule.tsx`) | `/legal/lg/dashboard` |
| `/legal/services` legacy panels | keep path, rewrite content |
| `/legal/delinquent` (`DelinquentCases.tsx`) | `/legal/lg/recovery` |

## Wave 3 — Dashboards

After Command Centre (Phase 12) ships:

| Legacy | Target |
| --- | --- |
| `/legal/dashboard` (`LegalDashboard.tsx`) | alias → `/legal/lg/dashboard` |
| `/legal/ops` (`LegalOpsDashboard.tsx`) | alias → `/legal/lg/dashboard?view=ops` |
| `SSBLegalDashboard.tsx` | already unlinked; alias route → `/legal/lg/dashboard` |

## Wave 4 — Cases stack

Blocked on: 360° workspace (Phase 4), Hearings (Phase 5), Orders (Phase 6),
Recovery (Phase 7), Settlements (Phase 8), Docs (Phase 9).

| Legacy | Target |
| --- | --- |
| `/legal/case-intake`, `/legal/case-intake-wizard`, `IntakeWizard`, `LegalIntakeWizard` | `/legal/lg/cases/new` |
| `/legal/case-tracking`, `CaseList`, `LegalCaseList` | `/legal/lg/cases` |
| `/legal/case-detail/:id`, `LegalCaseView`, `CaseView` | `/legal/lg/cases/:id` |
| `/legal/case-edit/:id` | `/legal/lg/cases/:id/edit` |
| `SSBCaseIntake`, `SSBCaseList`, `SSBCaseView` | same as above |
| `IntakeDetail` | `/legal/lg/referrals/:id` (Phase 3) |

## Wave 5 — Workbenches

| Legacy | Target |
| --- | --- |
| `LegalWorkbench` | `/legal/lg/cases?bucket=my` |
| `LegalUnifiedWorkbench` (5 tabs) | Split across new sections. Route becomes a router that reads `?tab=` and 302s to the right destination. |
| `LegalReferralsWorkbench` | `/legal/lg/referrals` |

## Wave 6 — Feature pages

| Legacy | Target |
| --- | --- |
| `NoticeGeneration` | `/legal/lg/notices` |
| `AppealSubmission` | case tab `Appeals` |
| `EnforcementActions`, `EnforcementPenalty` | case tab `Enforcement` + `/legal/lg/enforcement` queue |
| `EvidenceManagement` | case tab `Evidence` |
| `DocumentCenter` | `/legal/lg/documents` |
| `LegalPaymentPlans` | `/legal/lg/settlements` |

## Wave 7 — Admin

Deferred to Phase 13.

| Legacy | Target |
| --- | --- |
| `AdminConfig`, `LegalAdminHub` | `/legal/admin` (consolidated hub) |
| `LegalReferenceData` | `/legal/admin/reference` |
| `LegalTemplateManagement` | `/legal/admin/templates` |

## Wave 8 — Mock data purge (last)

Delete only after every importer in `deprecation-notes.md` has been
retired.

1. `src/data/mockLegalIntake.ts` (once IntakeWizard is gone)
2. `src/data/mockLegalWorkflow.ts` (once EnforcementPenalty,
   AppealSubmission and workflow admin tabs are gone)
3. `src/components/legal/tabs/Case*Tab.tsx` legacy set (once new tabs cover
   every feature)
4. `src/data/mockLegalCases.ts`
5. `src/data/mockLegalData.ts`
6. `src/adapters/legalApi.ts`, `src/services/legalService.ts`,
   `src/contexts/LegalCaseContext.tsx`

## Menu (`app_modules`) reorg

Not applied until Wave 4 completes and the 13-section IA is verified.
Draft structure kept in `.lovable/plan.md` §Phase 4.
