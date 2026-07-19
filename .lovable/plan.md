# Overpayment Recovery — Full Lifecycle Epic

This epic transforms the existing `/bn/overpayments` module and `bn_overpayment` table into a complete liability → dispute → recovery → waiver/write-off → closure lifecycle, reusing every existing platform capability (Gap Command Pipeline, Communication Hub, DMS, workflow/approval policy, capability registry, Award 360 action guard, Finance integration).

Given the size, I will deliver it in **6 sequential slices**, each independently testable and reversible. Each slice ends with tests green and a completion note.

---

## Slice 1 — Foundation: State Machines, Commands, Capabilities, Contracts

Purely additive, no schema changes, no UI regressions.

- `src/types/bn/gap/overpaymentStateMachine.ts` — canonical overpayment states + recovery plan states with transition guards.
- `src/types/bn/gap/overpaymentCommands.ts` — 25 command definitions with envelope shapes, invariants, and idempotency keys.
- `src/services/bn/gap/gapCapabilityRegistry.ts` — extend with `bn_overpayment:*` verbs (verify, notice, confirm, plan_propose, plan_approve, waive_request, waive_approve, writeoff_request, writeoff_approve, refer_legal, refer_estate, reverse, reconcile, close, reopen, allocate_receipt).
- `src/services/bn/finance/overpaymentFinanceContract.ts` — explicit Benefits ↔ Finance contract: what Benefits publishes (liability confirmed, recovery event, waiver, write-off) and what Finance returns (receipt id, allocation id, AR balance). No direct writes to finance ledger tables.
- `src/services/bn/gap/overpaymentOutstandingCalculator.ts` — pure function: `outstanding = confirmed − waived − writtenOff − recovered + reversed`.
- Tests: state reachability, command → capability map, calculator invariants, contract shape.

## Slice 2 — Data Model Migration

Single migration, additive only; keeps `bn_overpayment` intact and back-fills legacy remarks-based plans into structured rows via a compatibility loader (no destructive changes).

New tables (with GRANTs + RLS + policies per platform standards):
- `bn_overpayment_period` (period range, gross, cause code, source payment link)
- `bn_overpayment_payment_link` (link to `bn_payment_instruction`)
- `bn_overpayment_event` (state transitions, actor, reason)
- `bn_overpayment_dispute` (grounds, deadline, evidence, decision, appeal link)
- `bn_recovery_plan` (method, frequency, amount, %, min-benefit floor, dates, version, approver)
- `bn_recovery_plan_installment` (due date, amount, status, actual receipt link)
- `bn_recovery_transaction` (receipt / deduction / reversal / waiver / write-off entries; source of truth for amounts)
- `bn_recovery_allocation` (splits a transaction across periods)
- `bn_overpayment_waiver_request` (amount, reason, evidence, approvals, decision)
- `bn_overpayment_writeoff_request` (amount, reason, evidence, approvals, decision)
- `bn_overpayment_adjustment` (reversal / correction)

Add to `bn_overpayment` (header only): `state`, `cause_code`, `responsible_party`, `confirmed_liability`, `notice_issued_at`, `representation_deadline`, `closed_at`, `reopened_from_id`, `legacy_plan_migrated` (bool).

Views:
- `bn_overpayment_balance_v` — derived outstanding from events + allocations.

## Slice 3 — Server-Authorised Command Handlers

All 25 commands routed through the existing Gap Command Pipeline (`bn-gap-overpayments-*` edge function), each transactional, idempotent, capability-gated, maker-checker aware, and audited via `bn_gap_command_log`.

- `supabase/functions/bn-gap-overpayments/index.ts` — single command router.
- RPCs (`SECURITY DEFINER`, search_path locked):
  - `bn_overpayment_calculate_liability`
  - `bn_overpayment_confirm`
  - `bn_recovery_plan_propose` / `_approve` / `_revise` / `_activate`
  - `bn_recovery_receipt_record` / `_allocate` (calls Finance contract)
  - `bn_overpayment_waiver_request` / `_decide`
  - `bn_overpayment_writeoff_request` / `_decide`
  - `bn_overpayment_refer_legal` / `_refer_estate`
  - `bn_overpayment_reverse` / `_reconcile` / `_close` / `_reopen`
- Enforce: self-approval denial, stale-version rejection, minimum-benefit floor on deduction activation, dispute pauses recovery.
- Every mutation emits a `bn_overpayment_event` and (where relevant) a Communication Hub request via existing façade — no direct notification_queue inserts.

## Slice 4 — Overpayment 360 Workspace UI

Replace the current thin detail page. All mutations via new hooks calling the command router; zero direct Supabase writes from browser.

Routes:
- `/bn/overpayments` (enhanced list + ageing filter)
- `/bn/overpayments/:id` (360 shell)
- `/bn/overpayments/:id/liability` · `/recovery-plan` · `/dispute` · `/waiver` · `/reconciliation`
- `/bn/overpayments/exceptions` · `/bn/overpayments/config`

360 tabs: Summary · Liability breakdown · Source payments · Cause · Timeline · Notice · Representation/Dispute · Recovery plans · Instalments · Receipts & Allocations · Waiver · Write-off · Legal · Communications · Documents · Audit · Reconciliation.

Fix the legacy `AppealsPage.tsx`-style defect: remove all direct inserts from `OverpaymentsPage.tsx`; migrate to `useOverpaymentCommand()`.

## Slice 5 — Award 360 Integration & Action Guards

- Register `CONFIGURE_RECOVERY_PLAN`, `REQUEST_OVERPAYMENT_WAIVER`, `OPEN_OVERPAYMENT` in `awardActionAvailability.ts` with proper capability + rollout + business-gate wiring.
- Route through `awardCommandPipeline` for the two mutations; `OPEN_OVERPAYMENT` deep-links to the 360.
- Alerts: overpayment outstanding, defaulted plan, dispute active — from `bn_overpayment_balance_v`.

## Slice 6 — Reporting, Diagnostics, Docs, Certification

- Reports: ageing, outstanding, recovery performance, defaulted plans, waiver/write-off, cause analysis, error analysis, recovery by method, legal status, mortality-linked.
- Extend `gapDiagnosticsService.ts` with an overpayments health panel.
- Update: `docs/bn/gap-modules/OVERPAYMENTS_MODULE.md`, `GAP_MODULES_COMPLETION_REGISTER.md`, `docs/modernisation/benefits-gap/SQL_SERVER_DATA_MODEL_MAPPING.md`, OpenAPI contract, `.NET` domain state-machine doc.
- Test matrix (all listed in the epic): liability, partial-period, duplicate link, dispute, plan, maker-checker, self-approval denial, min-benefit protection, partial recovery, allocation, revision, default, waiver, write-off, legal referral, reversal, reconciliation, stale version, idempotency, rollback, permissions, dark launch, audit, finance contract.

---

## Technical notes

- No new communication or template tables — reuse Communication Hub façade `sendCommunication({moduleCode:'bn_overpayment', eventCode, ...})`.
- No direct writes to `notification_queue`, `bn_payment_instruction`, or any finance ledger table from Benefits code.
- Legacy remarks-based repayment plans stay readable; a one-shot idempotent backfill materialises them into `bn_recovery_plan` with `source='legacy_remarks'` when first opened in the new UI.
- Every new public table gets `GRANT`s in the same migration (authenticated + service_role; anon only where policy allows).
- All state transitions and command dispatches emit `bn_overpayment_event` + `bn_gap_command_log` entries.

## Delivery order & checkpoints

I will implement Slice 1 in this turn (foundation, no schema/UI risk), then pause for your go-ahead before Slice 2's migration. Each subsequent slice will end with a green test run and a short completion note.

**Approve to start with Slice 1, or tell me to reorder / trim scope.**
