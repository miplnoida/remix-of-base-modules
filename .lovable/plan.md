## Goal
Complete Wave A by migrating the remaining 10 BN configuration screens to the unified `BNDataGrid` standard, matching the pattern used in the 7 already-migrated screens (ProductCatalog, ReasonCodes, Delegations, DocumentSetup, EscalationConfig, ServiceDocTypes, ScreenMetadataSetup).

## Screens to migrate (batched)

### Batch 1 — Rule & Formula libraries
1. `RuleCatalogue.tsx` — code, name, category, scope, version, status; row actions: View/Edit/Clone.
2. `RulesAdministration.tsx` — admin list of rules with enable/disable + audit columns.
3. `FormulaConfiguration.tsx` — formula code, name, return type, version, status; View/Edit/Test actions.

### Batch 2 — Workflow & Approvals
4. `WorkbasketConfig.tsx` — workbasket code, owner role, SLA, item count; Edit/Members.
5. `RuleConfiguration.tsx` — rule binding list per product (if list-shaped; otherwise skip like RoleBundles).
6. `ProductApprovalConsole.tsx` — pending product versions with maker/checker columns + Approve/Reject row actions.

### Batch 3 — Communications & Validation
7. `BenefitCommunicationTemplates.tsx` — template code, channel, event, language, status.
8. `BenefitConfigurationValidation.tsx` — severity, area, screen, table, issue, resolution, priority; row click jumps to `resolutionHref`.

### Batch 4 — Reference data
9. Country reference list screen.
10. Medical reference data list screen.

## Per-screen pattern (identical to migrated 7)
- Replace `<Table>`/`<Card>` list layouts with `<BNDataGrid id="bn.<screen>" …/>`.
- Define `BNColumnDef<T>[]` with `meta.label`, widths, `pinLeft` on first column.
- Move filter chips → `toolbarFilters`.
- Move row buttons → `rowActions` (icon + label; destructive variant for delete).
- Move existing aggregates → `summary` chips.
- Pass `onCreate`, `onRefresh`, `onRowClick`, `exportFilename`, `defaultSort`.
- Preserve all existing dialogs, mutations, hooks, and permission gates — only the table layer changes.

## Skipped (don't fit standard grid)
- `RoleBundles` (card layout), `TransitionMatrix` (grouped multi-tables) — already noted in prior summary.
- Any screen above that turns out to be a card/wizard layout will be skipped with a note instead of forced into a grid.

## Delivery
Single iteration covering all 10 screens, written in parallel batches. After this, Wave A is complete and we move to Wave B (Operations).

## Verification
After build, spot-check routes:
`/bn/config/rules`, `/bn/config/rules-admin`, `/bn/config/formulas`, `/bn/config/workbaskets`, `/bn/config/product-approvals`, `/bn/config/communications`, `/bn/config/validation`, `/bn/config/countries`, `/bn/config/medical-refs`.
