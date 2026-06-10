## Status

Wave A — 10/17 BN configuration screens on `BNDataGrid` (others skipped as non-list-shaped).

Wave B (Operations) — in progress.

### Migrated this batch
- `src/pages/bn/claims/ClaimWorklist.tsx` → `bn.claim-worklist`
- `src/pages/bn/awards/PensionerRegister.tsx` → `bn.pensioner-register`
- `src/pages/bn/awards/AwardAdjustments.tsx` → `bn.award-adjustments`
- `src/pages/bn/awards/SurvivorAwards.tsx` → `bn.survivor-awards`
- `src/components/bn/entitlement/EntitlementListTable.tsx` → `bn.entitlements`
- `src/components/bn/payables/PayablesQueueTable.tsx` → `bn.payables-queue`

### Remaining Wave B candidates
- `ClaimQueue.tsx` — dual-list workbasket layout, keep as-is or convert sub-tables individually.
- `PaymentExceptions.tsx` — large screen, evaluate next.
- `PostIssueEnhanced.tsx` / `PostIssueReview.tsx` — uses `PostIssueTaskList` child component.
- `BatchOperations.tsx`, `ClaimWorkbench.tsx`, `Award360.tsx`, `Claim360.tsx` — multi-panel dashboards, skip.

### Per-screen pattern
Replace `<Table>` with `<BNDataGrid id="bn.<screen>" …/>`, define `BNColumnDef[]` (pinLeft on first col, widths, labels),
move row buttons to `rowActions`, preserve dialogs/mutations/hooks unchanged.
