# Legal Recovery & Payments (Phase 7)

## Purpose
Give the legal officer a single, live view of what the debtor owes, what has been
paid, and whether any court-ordered or negotiated payment arrangement is being
honoured — with automatic breach signalling into enforcement.

## Data sources (no hardcoded values)
All figures are aggregated at read time from operational tables — no snapshot
columns are stored on `lg_case`:

| Concern | Table(s) |
| --- | --- |
| Principal (arrears / overpayment) | `bn_overpayment`, `ce_arrears_ledger`, referral snapshot on `lg_case` |
| Interest, penalties, court cost | `lg_fee_charge` (typed by `charge_type`) |
| Paid / allocations | `core_payment_allocation` joined via `core_ledger_head` |
| Arrangement + installments | `core_payment_arrangement`, `core_payment_schedule_installment`, `lg_payment_arrangement_link` |
| Court orders driving recovery | `lg_order` (`payment_arrangement_id`, `enforcement_ref`) |

Aggregation lives in `src/services/legal/lgRecoveryService.ts`
(`getCaseRecovery`, `getInstallmentCompliance`, `getBreachedArrangements`).

## Composition shown in Case 360 → Payments / Recovery
`src/components/legal/lg/LgCaseRecoveryTab.tsx`:

1. **Debt composition** — principal / interest / penalties / court cost / paid /
   outstanding, each with source badge.
2. **Recovery %** — `paid / (principal + interest + penalties + court_cost)`.
3. **Arrangement panel** — active `core_payment_arrangement` (if any), status,
   next due date, installment progress bar, missed count.
4. **Missed installments list** — from `core_payment_schedule_installment` where
   `due_date < now()` AND `status <> 'PAID'`.
5. **Breach action** — when missed >= policy threshold, "Trigger enforcement
   task" creates an `lg_case_task` (type `ENFORCEMENT_WARNING`) and writes an
   `lg_case_activity` audit row. No email or SMS is dispatched from this tab.

## Dashboard KPIs
`src/pages/legal/LegalDashboard.tsx` exposes three live cards driven by the same
service:

- **Portfolio recovery %** — weighted across all open legal cases.
- **Missed installments (30d)** — count of overdue installments on legal-linked
  arrangements.
- **Arrangements in breach** — distinct arrangement count over threshold.

## Breach → enforcement handoff
`triggerEnforcementWarning(caseId, arrangementId)`:

1. Insert `lg_case_task` (priority HIGH, SLA per `lg_workflow_policy`).
2. Insert `lg_case_activity` (`event_type = ARRANGEMENT_BREACH`).
3. Set `lg_payment_arrangement_link.status = 'BREACHED'`.
4. If a live `lg_order` references the arrangement, flip it to `BREACHED` via
   `lgOrderStateMachine.transition()`.

## Permissions
Gated by `useLgAccess()` capabilities:

- `recovery.view` — read the tab and KPIs.
- `recovery.trigger_enforcement` — breach action button.
- `arrangement.link` / `arrangement.unlink` — manage `lg_payment_arrangement_link`.

## Audit
Every mutation writes to `lg_case_activity` with `entity_type` = `arrangement`
or `installment` and a JSON diff, per the enterprise audit standard.
