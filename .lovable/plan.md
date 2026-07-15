# BN-AWARD360-B1 — Schedule, Payments & Life Certificates

I'm still in plan mode and must surface the plan for approval before writing code. Approve to switch me to build mode and I'll execute exactly this scope.

## Scope (this batch only)
- Shared Award 360 components
- Schedule tab
- Payments tab
- Life Certificates tab
- Read-only enrichment, permission gating, tests

Explicitly **out of scope**: Beneficiaries, Medical, Overpayments, Communications, Claim, Product, Pensioner. Suspensions untouched except for compatible imports of shared components.

## 1. Shared components — `src/pages/bn/awards/award-360/components/`
- `Award360DataTable.tsx` — typed columns, search, sort, filter slot, pagination, skeleton, error, empty, row click, row actions, horizontal scroll, stable keys, accessible headers.
- `Award360FilterBar.tsx` — declarative filter set (text, select, multi-select, date range, toggle).
- `Award360MetricCards.tsx` — grid of summary tiles with currency + variance formatting.
- `Award360DetailDrawer.tsx` — title, status badge, summary, related entities, timeline, audit slot, nav buttons, disabled-action reason.
- `Award360PermissionState.tsx` — restricted panel (renders instead of query results).
- `Award360PartialWarning.tsx` — inline warning for enrichment failures.
- `Award360Pagination.tsx` — page/pageSize controls, total display.

Scoped to Award 360 only; no generic table framework.

## 2. Services — extend `src/services/bn/awards/award360Service.ts`
Add typed queries and paged result:
- `AwardScheduleQuery`, `AwardPaymentQuery`, `AwardLifeCertificateQuery`
- `AwardPagedResult<T,S>` with `rows/total/page/pageSize/summary/warnings`

Rules:
- Explicit column lists (no `select('*')`).
- Surface Supabase errors; enrichment failures return warnings, not empty arrays.
- No `.insert/.update/.delete/.upsert` and no write RPCs.
- Reuse existing payment/batch/issue/exception/reconciliation services after inspecting current schema — no invented columns.

## 3. Hooks — extend `useAward360Queries.ts`
- `useAwardSchedules(query, enabled)`
- `useAwardPayments(query, enabled)`
- `useAwardLifeCertificates(query, enabled)`

Query keys include filters/page/pageSize/sort. Per-tab invalidation only.

## 4. Permissions
Use `useAward360Permissions()`:
- Schedule + Payments gated by `canServicePayments`.
- Life Certificates gated by `canServiceLifeCert`.
When not permitted: `enabled=false` on hooks + render `Award360PermissionState`. No fetch-then-hide.

Mutation buttons resolved via existing `awardActionAvailability` — disabled with exact reason when the safe server command isn't available. No unsafe servicing helpers imported.

## 5. Schedule tab — `AwardScheduleTab.tsx`
Canonical: `bn_payment_schedule` (inspect generated types for exact audit-user columns).

- **Summary cards**: total rows, gross, deductions, net, paid, pending, held, cancelled, overdue-unpaid, future liability, next due, last paid.
- **Filters**: search (ref/notes), status, due-date range, period, method, paid state, has-instruction, overdue-only.
- **Table**: period, due, gross, deductions, net, status, method, linked instruction ref, payment ref, paid date, overdue/notes indicators.
- **Drawer**: schedule info, linked `bn_payment_instruction`, verified batch/issue/exception/reconciliation links (only if real linkage exists — otherwise show "Processing linkage is not available"), communication events (award/claim/instruction/correlation), audit (if permitted).
- **Actions (nav only)**: `/bn/schedules?awardId=`, `/bn/payables?awardId=`, instruction, batch, issue, exception, profile.

## 6. Payments tab — `AwardPaymentsTab.tsx`
Canonical: `bn_payment_instruction` (use current committed columns).

- **Summary**: total instructions/amount, queued, batched, issued, paid, failed, returned, cancelled, reconciled, unreconciled, open exceptions, **Other** for unknown statuses.
- **Filters**: search, status, method, due range, paid range, batch, has-exception, reconciliation state, failed/returned only.
- **Table**: ref, due, amount, currency, method, bank, masked account, frequency, status, batch ref, issue ref, paid date, reconciliation state, exception indicator, cancel reason.
- **Enrichment**: reuse real batch/item/issue/EFT-cheque/exception/reconciliation/reissue services. On enrichment failure: keep base row, show partial warning.
- **Drawer**: instruction (masked banking), source schedule row(s), batch + issue detail, exception + reconciliation, communication events, audit (if permitted).
- **Actions (nav)**: `/bn/payables?awardId=`, `/bn/batches`, `/bn/issue`, `/bn/post-issue`, `/bn/exceptions`. Cancel/reissue/reverse/mark-reconciled disabled via `awardActionAvailability`.

## 7. Life Certificates tab — `AwardLifeCertificatesTab.tsx`
Canonical: `bn_life_certificate` (use committed columns).

- **Compliance resolver** — pure `resolveLifeCertificateCompliance(records, award, schedules)` returning `{state, latestRecordId?, nextDueDate?, daysValue?, paymentImpact, explanation}`. `PAYMENT_HELD` only when actual award/payment state proves a hold.
- **Summary**: compliance state, total cycles, verified, pending, received-unverified, overdue, latest required period, latest verified period, next due, days until/overdue, reminder count (from real comm records), payment-impact.
- **Filters**: search, status, period, due range, verification method, overdue only, received-unverified only.
- **Table**: period, due, submitted, verified, status, method, doc ref, verified by, days overdue, payment-impact, remarks indicator.
- **Drawer**: canonical fields, DMS document link + metadata (where safe), reminder history from Communication Hub (life-cert event codes + correlation — never parsed from remarks), payment impact (schedules/award/actual hold + policy), audit (if permitted).
- **Actions (nav)**: `/bn/life-certificates?awardId=`, document, communication, schedule. Record/verify/reject/waive/reminder disabled via `awardActionAvailability`. No import of `verifyLifeCertificate` / `recordLifeCertificateReminder` from `awardServicingService.ts`.

## 8. URL state
Persist tab-scoped filters/page in query params (`paymentStatus`, `paymentPage`, `schedulePage`, `lcStatus`, …) preserving `tab=`. Support back/forward. Drawer state not in URL unless keyed by stable row id.

## 9. Tests
Vitest per tab + shared:
- Shared: search, sort, filter, pagination, empty-filtered, drawer, error/retry, responsive wrapper.
- Schedule: field mapping, monetary summary, overdue calc, next due, filters, linked instruction drawer, partial-enrichment warning, unauthorized→no query, nav routes, no mutation.
- Payments: field mapping, banking masking, status summary incl. unknown, filters, pagination, schedule/batch/issue enrichment, exception/reconciliation mapping, partial-enrichment failure, unauthorized→no query, action-availability delegated to resolver, no mutation.
- Life Certificates: field mapping, compliance states, due-soon/overdue calc, received-unverified, payment-impact honesty, document details, Comm Hub reminders, unauthorized→no query, nav routes, unsafe helpers not imported, no mutation.
- Error integrity: Supabase errors surfaced; failures ≠ empty; failed enrichment doesn't hide base row; audit not queried without permission.

## 10. Safety gates before completion
Grep-verify absence of `.insert(`, `.update(`, `.delete(`, `.upsert(`, unsafe write RPCs, direct payment/schedule/LC mutation. No `app_modules`, menu, RLS, or feature-default changes.

## 11. Completion report
Commit SHA, shared components list, per-tab summaries/filters/drawer/enrichment/actions, permission evidence (unauthorized→no network), error evidence, test list + results, typecheck/build output, preview screenshots (populated/empty/error/restricted/drawer) for all three tabs, remaining backend blockers.

## Technical notes
- Inspect `src/integrations/supabase/types.ts` for exact `bn_payment_schedule`, `bn_payment_instruction`, `bn_life_certificate` columns before selecting.
- Use existing `award360Service.ts`, `useAward360Queries.ts`, `useAward360Permissions()`, `awardActionAvailability`, `resolveBusinessModuleCommunicationContext`, and Communication Hub event log queries.
- Currency comes from Award header; use existing `formatCurrency` / `formatWithCurrency`.
- Bank account masking via existing `piiMaskingService.maskPIIValue(..., 'bank_account')`.

Approve to switch to build mode and I'll implement in this exact order: types inspection → shared components → service extensions → hooks → three tabs → URL state → tests → safety grep → typecheck/build → preview screenshots → completion report.
