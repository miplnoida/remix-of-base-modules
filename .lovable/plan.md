## Goal
Ship one reusable `BNDataGrid` component that enforces consistent paging, sorting, filtering, column visibility, resizing, sticky columns, row/bulk actions, exports, summaries, empty/loading states, and accessibility across every Benefits Module listing. Then migrate all BN screens to use it.

## Approach
- Engine: TanStack Table v8 (headless) on top of existing shadcn `Table`. CSV/Excel via SheetJS (`xlsx`), PDF via existing `htmlToPdf`.
- Data layer: client-side paging/sorting/filtering by default; `mode="server"` opt-in with `onStateChange` + total count for high-volume screens (claims, payments, audit logs).
- State persistence: per-grid key in `localStorage` (column visibility, widths, page size, sort, filters).

## Deliverables

### Phase 1 — Component foundation
- Add deps: `@tanstack/react-table`, `xlsx`.
- `src/components/bn/grid/BNDataGrid.tsx` — main grid (header, body, sticky first col + sticky actions col, horizontal scroll, resize handles, sort indicators, skeleton/empty states, a11y, internal scroll inside parent panel).
- `src/components/bn/grid/BNGridToolbar.tsx` — quick search, advanced filters slot, saved filters menu, clear-all, active filter count.
- `src/components/bn/grid/BNGridPagination.tsx` — First/Prev/Next/Last, page-size selector (10/25/50/100/250), "Showing X–Y of N", "Page X of Y".
- `src/components/bn/grid/BNGridColumnPicker.tsx` — show/hide + reset.
- `src/components/bn/grid/BNGridSummary.tsx` — totals/status counts strip above grid.
- `src/components/bn/grid/BNGridExport.tsx` — CSV, Excel (xlsx), PDF; embeds filter+sort+timestamp+user header.
- `src/components/bn/grid/BNGridSidePanel.tsx` — fixed-size Sheet wrapper for row detail/edit, with internal scroll, ESC + backdrop + close button, capped at `h-dvh`.
- `src/hooks/bn/useBnGridState.ts` — persists state under `bn-grid:{id}`.
- `src/lib/bn/grid/exporters.ts` — CSV/XLSX/PDF helpers.
- `src/components/bn/grid/types.ts` — `BNColumnDef`, `BNRowAction`, `BNBulkAction`, `BNGridProps`.
- Storybook-style demo route `/bn/_grid-demo` (dev only) so we can verify behavior in isolation.

### Phase 2 — Migrate BN screens (ALL listings)
Migrate in waves, each wave wired to BNDataGrid with screen-specific columns, filters, summary chips, row/bulk actions, and export config. Existing data hooks stay; only the table layer is swapped.

- **Wave A — Configuration**: Product Catalogue, Rule Catalogue, Formula Library, Communication Templates, Document Types, Screen Templates, Field Metadata, Workbaskets, Transition Matrix, Approval Policies, Override Policies, Reason Codes, Role Bundles, Delegations, Escalations, Reference Data, Configuration Validation.
- **Wave B — Operations**: Claims Workbench, Eligibility Results, Entitlements, Awards, Claimants, Employers, Contribution Snapshots.
- **Wave C — Payments**: Payments, Payment Batches, Payment Profiles, Cheque Stock, Bank Formats, Bank Masters.
- **Wave D — Medical & Audit**: Medical Boards, Medical Assessments, Audit Logs.

For each screen:
1. Replace bespoke `<Table>` with `<BNDataGrid id="bn.<screen>" columns={...} data={...} …/>`.
2. Move filter chips into `toolbarFilters`.
3. Move existing edit/view/clone modals into `BNGridSidePanel` (fixes the "expanding modal" bug).
4. Add summary chips from existing aggregates.
5. Add row actions + bulk actions per screen capability.
6. Set `serverSide` for: Claims Workbench, Payments, Payment Batches, Audit Logs.

### Phase 3 — Special handling
- **Configuration Validation**: severity/area/screen/table/issue/resolution/priority columns; sortable + filterable; resolution link routes to fixing screen via `resolutionHref` per row.
- **Product Catalogue**: each section (Rules/Formulae/Documents/Workflow/Communications/Payment Setup) renders a status chip — `Configured`/`Missing`/`Incomplete` — computed in the existing data hook.

### Phase 4 — Cleanup
- Remove now-unused per-screen table/pagination/filter copies.
- Update `docs/bn/` with `BN_DATA_GRID_STANDARD.md` (usage + acceptance checklist).
- Save mem://design/bn-data-grid-standard.

## Technical notes
- Sticky columns via `position: sticky` + z-index layering; horizontal scroll on the table container, not the page.
- Resize via TanStack's column sizing; persisted widths keyed by column id.
- Server-side mode: grid emits `{ pageIndex, pageSize, sorting, columnFilters, globalFilter }`; hook returns `{ rows, totalCount }`.
- A11y: `role="grid"`, `aria-sort` on headers, focus ring on cells, full keyboard navigation (←↑→↓, PgUp/PgDn, Home/End), ESC closes side panel.
- Side panels use shadcn `Sheet` with `className="h-dvh max-h-dvh w-full sm:max-w-2xl overflow-hidden"` and an inner `<ScrollArea>`.

## Scope & expectations
This is a very large change set (~50 screens). I will deliver it across multiple iterations in this conversation:
1. Phase 1 (component + demo) in the next turn.
2. Then Waves A→D one at a time. After each wave you verify the migrated screens before I move on. This keeps the build green and lets you catch regressions early.

## Out of scope
- Rewriting BN data hooks beyond what server-side mode needs.
- Non-BN modules (Compliance, C3, Cashier) — separate effort.
- Saved-filters server persistence — v1 stores in `localStorage`; DB-backed saved filters is a follow-up.
