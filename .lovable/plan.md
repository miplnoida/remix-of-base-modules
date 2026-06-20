## Goal

Replace every Legal listing/grid with the Benefits `BNDataGrid` framework so search, filters, sort, pagination, column visibility, export, bulk actions, status badges, and row actions behave identically across both modules. Audit CRUD wiring on every Legal entity and fix dead buttons.

## Benefits framework being adopted (source of truth)

Located in `src/components/bn/grid/`:

- `BNDataGrid` — TanStack-based table with client/server modes
- `BNGridToolbar` — global search, toolbar filters, toolbar extras
- `BNGridPagination` — page size selector, page numbers, total record range
- `BNGridColumnPicker` — show/hide + persistence via grid `id` in localStorage
- `BNGridExport` — Excel / CSV / PDF
- `BNGridSummary` — KPI chips above grid
- `BNGridSidePanel` — row detail drawer
- Status badges: `BnStatusBadge` (`src/components/bn/shared`)
- Row actions: `BNRowAction<T>` (View / Edit / History / Documents)
- Bulk actions: `BNBulkAction<T>`

All Legal grids must be rebuilt around these — no custom `<table>`, no ad-hoc pagination, no bespoke filter bars.

## Phase 1 — Shared Legal grid primitives

Create thin Legal wrappers in `src/components/legal/grid/`:

1. `LgDataGrid.tsx` — re-exports `BNDataGrid` with Legal-specific defaults (filename prefix `legal-`, persisted id prefix `lg.`).
2. `LgStatusBadge.tsx` — wraps `BnStatusBadge`, maps Legal statuses (Draft / Active / Pending / In Review / Closed / Escalated / Overdue) to tones.
3. `LgRowActions.ts` — helper that builds the standard {View, Edit, History, Documents} action set per entity, hiding actions that don't apply.
4. `useLgGridFilters.ts` — shared filter primitives (status, stage, case type, hearing type, officer, priority, date range, next hearing date, court).

## Phase 2 — Screen-by-screen migration

For each screen: replace existing list with `LgDataGrid`, wire the standard filter set, register row + bulk actions, add summary chips where Benefits uses them, persist column prefs under the listed grid id.

| Screen | File | Grid id | Bulk actions | Special |
|---|---|---|---|---|
| Case Tracking | `LgCaseList.tsx`, `CaseTracking.tsx`, `LegalCaseList.tsx` | `lg.cases` | assign officer, update stage, generate notice, export, mark reviewed | Pinned: Case No, Employer, Stage, Officer, Next Hearing, Outstanding, Status |
| Hearings | `LgHearingCalendar.tsx` (list view) | `lg.hearings` | reschedule, assign, export | Next Hearing column with green/amber/red day-remaining chip |
| Tasks | new `LgTaskList.tsx` (lg_case_task) | `lg.tasks` | reassign, mark done, export | |
| Notices | `NoticeGeneration.tsx` | `lg.notices` | regenerate, mark delivered, export | |
| Documents | `DocumentCenter.tsx` | `lg.documents` | tag, archive, export | |
| Orders | `LegalOrderRegistry.tsx`, `CourtOrdersManagement.tsx` | `lg.orders` | export | |
| Settlements | new `LgSettlementList.tsx` | `lg.settlements` | export | |
| Fees | `LgFeeConfig.tsx` charges grid | `lg.fees` | post, request waiver, export | Expandable row: Original / Waived / Net / Posting history. Columns: Fee Head, Fee Rule, Bundle, Auto Applied, Waived, Waiver Pending, Posted, Employer Txn Ref |
| Payment Arrangement Links | new `LgPaymentArrangementList.tsx` | `lg.payment-links` | unlink, export | |
| Referrals | within `LgCaseDetail` / new list | `lg.referrals` | accept, reject, export | |
| Dashboard drill-downs | `LgDashboard.tsx` | `lg.dash.*` | export | All drill-down lists route through `LgDataGrid` |

Standard filter set on every grid:
`status`, `stage`, `case_type`, `hearing_type`, `officer`, `priority`, `date_range`, `next_hearing_date`, `court` — only render those that apply to the entity.

Standard search across: case no, employer name/regno, court case no, officer name, payment arrangement ref.

## Phase 3 — CRUD audit & fixes

For each entity below, verify CREATE / READ / UPDATE / DELETE-or-CANCEL paths: button wired → route exists → dialog opens → service persists → grid refreshes (via React Query invalidation).

Entities: `lg_case`, `lg_hearing`, `lg_case_task`, `lg_notice`, `lg_document_link`, `lg_order`, `lg_settlement`, `lg_fee_charge`, `lg_payment_arrangement_link`.

Where a service hook is missing, add it under `src/hooks/legal/` and a thin service under `src/services/legal/`. Capability gating via `useLgAccess` + `LgActionButton`.

## Phase 4 — Verification report

Emit `docs/legal/grid-standardization-report.md` with one row per screen:
`Screen | Grid Component | Pagination | Sorting | Filtering | Export | CRUD | Broken Actions Found | Fixed`.

## Technical notes

- No new tables required — all metadata exists (`lg_*` already populated).
- Column visibility / page size persist per grid id under localStorage key `bn-grid:<id>` (same key the BN grid already uses — Legal piggybacks the same store).
- Status tone mapping handled in `LgStatusBadge` so colors stay consistent across screens.
- TypeScript must build clean; no `any` on grid column defs.

## Out of scope

- Visual redesign of detail pages (only listing grids).
- Mobile-specific layouts beyond what BNDataGrid already provides.
- Changes to Benefits screens.

## Deliverables

- New: `src/components/legal/grid/*`, missing list pages, missing service hooks.
- Edited: every Legal listing page in the table above.
- Doc: `docs/legal/grid-standardization-report.md`.
