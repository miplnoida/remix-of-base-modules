# Analytics Explorer — Phase 11

The 11 legacy static reports were retired in favour of the shared
Enterprise Data Explorer framework (see
[`../explorer/ENTERPRISE_DATA_EXPLORER.md`](../explorer/ENTERPRISE_DATA_EXPLORER.md)).

## Registered datasets

Descriptors in `src/config/explorer/legalDatasets.tsx`:

| Key | Focus |
|-----|-------|
| `lg.recovery` | Outstanding / recovered / recovery % |
| `lg.ageing` | Days-open ageing buckets |
| `lg.casesByStage` | Case count by stage |
| `lg.casesByOfficer` | Officer workload |
| `lg.casesByTerritory` | Territory distribution |
| `lg.overdueHearings` | Hearings past scheduled date without outcome |
| `lg.judgmentOrder` | Orders by type / status / compliance |
| `lg.arrangementBreach` | Arrangements breached / at risk (Phase 8) |
| `lg.settlements` | Settlement pipeline (Phase 8) |
| `lg.referralSource` | Volume by source module & reason |
| `lg.closedCases` | Closure outcomes & recovery % on close |
| `lg.slaBreach` | Referral & task SLA breaches |
| `lg.pendingAction` | My / team pending actions with age |

## Guarantees

- All datasets query live `lg_*` / `core_legal_*` / `ce_*` tables — no
  static rows anywhere.
- Every dataset supports: grid + kanban + timeline + pivot + chart, saved
  views (`explorer_saved_view`), export (Excel/CSV/PDF/Word/HTML/JSON/XML),
  scheduled delivery (`explorer_schedule`), drill-through to Case 360.
- KPI cards and charts cross-filter into the grid.
- Multi-level grouping in Pivot view.

## Retiring legacy reports

Old routes still redirect to the Explorer versions (see
[`route-retirement-plan.md`](./route-retirement-plan.md)) so bookmarks keep
working through the Phase 4 cutover window.
