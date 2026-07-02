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

## Sidebar Cutover — Executed

The Legal sidebar has been reorganised into 13 sections under the `Legal Enforcement` root (`app_modules`):

1. Command Centre → `/legal/lg/dashboard`
2. Recovery Workbench → `/legal/lg/recovery`
3. Referrals → Referrals Workbench, Compliance launcher, Benefits launcher
4. Cases → Legal Matters, New Matter, Legal Workbench
5. Hearings → Hearing Calendar
6. Orders & Judgments → Court Orders
7. Recovery & Payments → Recovery Actions
8. Settlements → Payment Arrangements
9. Tasks & SLA → My Tasks (`/legal/lg/tasks`)
10. Documents & Notices → Document Centre, Legal Notices, Legal References
11. Advisory & Contract Review → Services Hub, Advice & Contract Reviews
12. Analytics → Legal Reports (Explorer hub)
13. **Administration** — untouched: same `lg_admin` subtree (Profile, Routing, Teams, Courts, Codesets, Policy, Templates, Fees, SLA Rules, Referral Integrity, Case Integrity, etc.).

Legacy sections (Dashboard, Workbench, Legal Services, Recovery & Enforcement, Litigation, Knowledge & Documents) were disabled and hidden — no data was deleted.

### Rollback

Full pre-cutover snapshot lives in `app_modules_reorg_backup`. To roll back:

```sql
UPDATE app_modules m
   SET parent_id = b.parent_id, sort_order = b.sort_order,
       is_enabled = b.is_enabled, show_in_menu = b.show_in_menu,
       display_name = b.display_name, name = b.name
  FROM app_modules_reorg_backup b
 WHERE m.id = b.id;

DELETE FROM app_modules
 WHERE id IN (
   '1e9a2000-0000-0000-0000-0000000000c1','1e9a2000-0000-0000-0000-0000000000c2',
   '1e9a2000-0000-0000-0000-0000000000c3','1e9a2000-0000-0000-0000-0000000000c4',
   '1e9a2000-0000-0000-0000-0000000000c5','1e9a2000-0000-0000-0000-0000000000c6',
   '1e9a2000-0000-0000-0000-0000000000c7','1e9a2000-0000-0000-0000-0000000000c8',
   '1e9a2000-0000-0000-0000-0000000000c9','1e9a2000-0000-0000-0000-0000000000ca',
   '1e9a2000-0000-0000-0000-0000000000cb','1e9a2000-0000-0000-0000-0000000000cc',
   '1e9a2000-0000-0000-0000-0000000000d2','1e9a2000-0000-0000-0000-0000000000d9'
 );
```
