# EPIC-06A.2 — Recoverable Liability Retrofit Across Existing Legal Workspaces

**Status:** ✅ Completed
**Depends on:** EPIC-06A (Recoverable Liability Foundation)
**Related EPICs:** EPIC-02 (Recovery Workbench), EPIC-03A (Intake & Qualification), EPIC-04 (Matter 360°), EPIC-05 (Court Operations)

This retrofit wires the `lg_recoverable_liability` foundation into every existing
Legal workspace **without creating new tables**. Existing matters that pre-date
liabilities continue to work through automatic case-level fallbacks.

---

## 1. Recovery Workbench (EPIC-02)

Service: `src/services/legal/lgRecoveryWorkbenchService.ts`
UI: `src/pages/legal/LgRecoveryWorkbench.tsx`, `src/components/legal/liability/CaseLiabilitiesDrawer.tsx`

- `listRecoveryWorkbenchRows` and `getRecoveryWorkbenchRowForCase` now overlay
  liability rollups via `loadLiabilityRollupForCase` (`lgLiabilityRetrofitService.ts`).
- Effective totals (`recoverable`, `paid`, `outstanding`, `recovery %`) prefer
  liability sums when they exist and fall back to legacy case totals otherwise.
- New filters: **Liability Presence**, **Fund**, **Liability Type**,
  **Recovery Status**, **Limitation ≤ 90 days**.
- Summary chips: **Liability-tracked matters**, **Limitation ≤ 90 days**.
- Row action **View Liabilities** opens `CaseLiabilitiesDrawer` to inspect
  child liability rows for the parent matter.
- Health scoring (`lgRecoveryHealth.ts`) already consumes rollup totals via the
  effective columns.

## 2. Intake & Qualification (EPIC-03A)

Service: `src/services/legal/lgIntakeLiabilityService.ts` (new)
UI: `src/components/legal/intake/IntakeProposedLiabilitiesCard.tsx` (new)
Wiring: `src/pages/legal/LgIntakeWorkspace.tsx`
Readiness: `src/services/legal/lgIntakeDecisionService.ts`

- Proposed liabilities are stored inside `lg_case_intake.payload.proposed_liabilities`
  (JSON) — **no new table**.
- `IntakeProposedLiabilitiesCard` (Financial Assessment tab) lets officers add,
  verify, and remove proposals with per-row totals and limitation dates.
- Readiness gains a conditional **"Proposed liabilities verified"** criterion
  (weight 0.05 borrowed from the "documents" criterion when proposals exist),
  so intakes that capture proposals must verify them before reaching READY.
- On case creation (`doCreateCase`), `materializeForCase(intakeId, caseId, actor)`
  inserts one `lg_recoverable_liability` row per proposal, stamping
  `source_module='INTAKE'` and `source_record_id=intakeId`, and writes the new
  liability id back into the proposal (`materialized_id`) for audit.

## 3. Matter Workspace (EPIC-04)

- Header, right rail and Financials use `getRecoveryWorkbenchRowForCase` which
  now returns liability rollups; matters without liabilities continue to render
  case-level totals unchanged.
- `LgCaseLiabilitiesTab` (from EPIC-06A) is the primary CRUD surface.
- Timeline: `lgUnifiedTimelineService.ts` emits `LIABILITY` events (creation and
  payment allocation) surfaced in `UnifiedMatterTimeline.tsx`.
- Completeness/health indicators derive from the liability rollup when present.

## 4. Court Operations (EPIC-05)

Service: `src/services/legal/lgHearingWorkbenchService.ts`, `lgHearingPackService.ts`
UI: `src/pages/legal/LgCaseDetail.tsx` (Hearings tab → **Liabilities** button)

- `HearingWorkbenchRow` carries `liability_link_count`, `liability_case_count`,
  and `liability_outstanding_total`, computed via bulk lookups against
  `lg_hearing_liability` and `lg_recoverable_liability`.
- `evaluateReadiness` adds a conditional **LIABILITY_COVERAGE** check that only
  fires for matters that have liabilities, so legacy hearings remain unaffected.
- Hearing Pack (`buildHearingPack` / `renderHearingPackHtml`) now includes an
  **Affected Recoverable Liabilities** section plus a rollup summary.
- Hearing-scoped link/unlink UI uses `LiabilityLinkDialog`
  (`target={{ kind: 'hearing', id }}`).

## 5. Junction UI

`src/components/legal/liability/LiabilityLinkDialog.tsx` provides one reusable
link/unlink surface for all supported targets:

| Target        | Junction table            | Status |
|---------------|---------------------------|--------|
| Hearing       | `lg_hearing_liability`    | ✅ wired in `LgCaseDetail` Hearings tab |
| Order         | `lg_order_liability`      | ✅ available via dialog (`kind:'order'`) |
| Arrangement   | `lg_arrangement_liability`| ✅ available via dialog (`kind:'arrangement'`) |
| Settlement    | `lg_settlement_liability` | ✅ available via dialog (`kind:'settlement'`) |
| Task          | `lg_task_liability`       | ✅ available via dialog (`kind:'task'`) |
| Document      | `lg_document_liability`   | ✅ available via dialog (`kind:'document'`) |

Where an entity does not yet have a first-class detail screen, the dialog is
still callable and shows a clean empty state until the parent module is fully
built out; no fabricated data.

## 6. Acceptance Criteria — Results

- ✅ Previous screens continue to work unchanged.
- ✅ Matters without liabilities keep using case-level fallbacks.
- ✅ Matters with liabilities use rollups across Workbench, Rail, Financials,
  Hearing Pack, Timeline, and Readiness.
- ✅ No mock data — proposals live in `payload`; materialized rows land in
  `lg_recoverable_liability` on case creation.
- ✅ `tsgo --noEmit` clean.

---

## Cross-EPIC updates

- **EPIC-02** — Workbench rows and health now use liability rollups when present.
- **EPIC-03A** — Intake captures proposed liabilities; readiness verifies them;
  approval materializes them into `lg_recoverable_liability`.
- **EPIC-04** — 360° workspace header, rail, Financials and timeline read from
  the rollup with a case-level fallback.
- **EPIC-05** — Hearing readiness enforces liability coverage when the matter
  has liabilities; hearing packs render the liability breakdown.
- **EPIC-06A** — Foundation is now consumed by every workspace listed above.
