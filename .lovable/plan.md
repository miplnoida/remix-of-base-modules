
# BN-AWARD360-V2 — Award 360 Workspace Rebuild

This is a large epic. Below is the execution plan I'll follow. Please confirm before I start — this will span many files and several turns.

## Scope confirmation

- Route stays `/bn/awards/:id` with `?tab=` query param (13 tabs).
- Existing `Award360.tsx` becomes a thin re-export of the new `Award360Page`.
- No new backend tables, no RLS changes, no direct browser writes for sensitive actions.
- Reuse existing canonical services (Award Suspension read service, Communication Hub, Person 360, Claim Workbench, Payment/LC/Medical/Overpayment specialist workspaces).
- All actions either: (a) go through an accepted server command, (b) deep-link to specialist workspace, or (c) render disabled with a reason via `getAwardActionAvailability`.

## New file structure

```
src/pages/bn/awards/award-360/
  Award360Page.tsx
  Award360Header.tsx
  Award360SummaryCards.tsx
  Award360Alerts.tsx
  Award360TabNavigation.tsx
  tabs/                # 13 tab components
  components/          # AwardStatusBadge, AwardMoney, AwardTimeline,
                       # AwardActionMenu, TabErrorState, TabEmptyState, etc.
  viewModels.ts        # typed view models + AwardAlert / AwardActionAvailability
  useAward360Queries.ts # React Query hooks, one per tab

src/services/bn/awards/award360Service.ts
src/services/bn/awards/awardActionAvailability.ts

src/__tests__/bn/award360/
  shell.test.tsx
  mapping.test.ts
  permissions.test.ts
  alerts.test.ts
  safety.test.ts
```

Old `awardService.ts` remains only for legacy callers; Award 360 stops importing from it.

## Data architecture

- `award360Service.ts` exposes 14 typed loaders (`getAward360Header`, `getAward360Overview`, `getAwardPensioner`, `getAwardClaim`, `getAwardProduct`, plus `listAward*` for the 9 collection tabs).
- Each loader returns a typed view model — never raw rows. Explicit column lists (no `select('*')`).
- Each tab has its own React Query key `['award360', awardId, tabName]` and loads lazily on first open.
- Overview uses `Promise.allSettled` across independent summaries and surfaces per-section warnings.
- Canonical field corrections:
  - `bn_payment_schedule`: `schedule_period, due_date, gross_amount, deductions, net_amount, status, payment_method, payment_ref, paid_at, bn_payment_instruction_id, notes`
  - `bn_payment_instruction`: use `id`/`payment_reference` as reference; `due_date`, `paid_date`, `status`, `payment_method`, `bank_code`, masked `account_number`
  - `bn_overpayment`: `detected_date, period_from, period_to, original_amount, recovered_amount, outstanding_amount, recovery_method, recovery_status, reason_code, remarks`
  - Claim product version via `bn_claim.product_version_id`
  - Claim Workbench link: `/bn/claims/:claimId` (drop `/workbench`)
  - Communications: canonical fields (`event_code, channel, recipient_type, recipient_address, template_id, subject, status, provider_message_id, letter_id, error_message, retry_count, last_retry_at, context`) — scope by claim_id + award_id in context + correlation_id.
  - Suspensions tab **reuses** `awardSuspensionViewService` from prior epic — no duplicate implementation.

## Tab contents (summary)

Each tab: header summary + main list/detail + section warnings + action menu.
- Overview — award summary, operational-health grid, next-actions list, recent activity (10 items merged), quick-nav buttons.
- Pensioner — masked ip_master + payment profile + payee; deep links to Person 360.
- Claim — bn_claim summary + timeline; deep link `/bn/claims/:id`.
- Product — resolved product + version via claim; read-only; deep links to Product Catalog/Version/Formula/Workflow.
- Beneficiaries — bn_award_beneficiary + share-total validation (warn if ≠100%).
- Schedule — canonical fields; totals summary.
- Payments — canonical fields + batch/issue/exception enrichment where linked; paginated.
- Life Certificates — bn_life_certificate; overdue calc.
- Medical Reviews — bn_medical_review_schedule; permission-gated sensitive fields.
- Suspensions — reuses awardSuspensionViewService; workflow status via existing resolver.
- Overpayments — canonical fields; outstanding total.
- Communications — bn_communication_log + bn_letter; canonical fields; paginated.
- Audit — merged timeline from status_event, rate_history, core_audit_log, suspension/beneficiary/schedule/payment/LC/medical/overpayment/comm events; filters; permission-gated central-audit rows.

## Header, summary cards, alerts

- Sticky header: award number, payee, masked SSN, benefit, type, status, rate, currency, frequency, dates, product version, last refreshed.
- Summary cards (8): current rate, last payment, next scheduled, payment status, LC status, medical status, suspension status, outstanding overpayment.
- Alert rules (12): LC overdue, medical overdue, open suspension, currently suspended, payment on hold, failed payment, open payment exception, outstanding overpayment, beneficiary shares ≠ 100%, deceased pensioner, no verified payment profile, missing linked claim / missing product version.

## Permissions & safe actions

- `getAwardActionAvailability(awardId, userId)` returns `{ action, visible, enabled, reason, targetRoute }` for every action.
- Tab-level fetch gates: audit/medical/etc. don't query without permission.
- Admin does NOT bypass maker-checker or `actions_enabled=false`.
- No writes from Award 360. All mutating actions either invoke an accepted server command (existing) or navigate to canonical workspace or render disabled with reason.

## Tests

- `shell.test.tsx` — 13 tabs render, tab query param, tab counts, header stickiness (mocked).
- `mapping.test.ts` — canonical field mapping for schedule/payment/overpayment/claim/comms/audit; claim workbench URL is `/bn/claims/:id`.
- `permissions.test.ts` — restricted tabs don't query without permission; admin bypass blocked for disabled actions.
- `alerts.test.ts` — each of the 12 alerts triggers on the right inputs.
- `safety.test.ts` — Award 360 files contain no direct Supabase writes and don't import unsafe servicing mutations; communications go via Hub; payments via boundary.

## Execution order (multi-turn)

1. View existing `Award360.tsx`, `awardService.ts`, related registries, and prior `awardSuspensionViewService` (context gathering).
2. Add `viewModels.ts`, `award360Service.ts`, `awardActionAvailability.ts`.
3. Add shared `components/` + `Award360Header/SummaryCards/Alerts/TabNavigation`.
4. Add `Award360Page.tsx` with lazy tabs + query-param routing.
5. Implement 13 tabs.
6. Replace body of existing `Award360.tsx` with re-export.
7. Add all 5 test files.
8. Typecheck; iterate on failures.
9. Playwright screenshots per tab (13 + mobile + unauthorized + partial-data + error/retry + disabled action).
10. Completion report (sections A–K per spec).

## Non-goals / explicit exclusions

- No schema changes, no new tables, no RLS.
- No new mutation RPCs — reuse what exists; otherwise action stays disabled with reason.
- No changes to menu, feature toggles, or rollout flags.
- No touch of `awardServicingService.ts` — it stays for legacy callers; Award 360 doesn't import it.

Please confirm to proceed, or tell me any adjustments (e.g. narrow to a subset of tabs first, or defer tests to a follow-up).
