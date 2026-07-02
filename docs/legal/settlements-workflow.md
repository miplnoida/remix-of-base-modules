# Settlements & Payment Arrangements Workflow

Phase 8 formalises the settlement lifecycle so every proposal, approval and
breach is auditable and drives the recovery figures shown on the Case 360
workspace and the Command Centre dashboard.

## Data model

| Table | Role |
|-------|------|
| `lg_settlement` | Proposal + agreed amount, terms, status, decision timestamps |
| `core_payment_arrangement` | Actual installment plan (shared with Compliance) |
| `lg_payment_arrangement_link` | Binds a settlement/arrangement to the `lg_case` |
| `lg_case_activity` | Audit trail for every settlement action |
| `lg_fee_charge` | Auto fee events on `SETTLEMENT_APPROVED` |

## Lifecycle

State machine defined in
[`settlement-state-machine.md`](./settlement-state-machine.md).

1. **Draft** — legal officer builds proposal (amount, waiver, terms, docs).
2. **Submitted** — routed to senior officer for review.
3. **Under Review** — evidence / arrears confirmed against
   `lgRecoveryService.getCaseDebtComposition`.
4. **Approved / Rejected** — manager decision (`canApproveClosure`). Approval
   is the trigger for creating (or linking) a `core_payment_arrangement`
   through `LegalCasePaymentArrangementsPanel`.
5. **Active** — installments run under `core_payment_schedule_installment`.
   `lgRecoveryService.getCaseArrangementSummary` computes compliance %.
6. **Breached** — auto-flagged when
   `lgRecoveryService.detectBreach` finds N consecutive missed installments;
   `lg_payment_arrangement_link.status` and the linked `lg_order` flip to
   `BREACHED` (see `lgOrderStateMachine`) and a follow-up
   `lg_case_task` is opened.
7. **Completed** — all installments cleared; recovery % → 100%.
8. **Cancelled** — soft-terminal, retained for audit.

## Permissions

Enforced via `useLgAccess` — `canDraftLetter` to propose,
`canApproveStageMove` to move through review, `canApproveClosure` to
approve/reject/complete/cancel, `canApproveEscalation` to mark breached.

## Analytics

The Analytics Explorer dataset `lg.settlements` (registered in
`legalDatasets.tsx`) surfaces status distribution, breach rate, average
approval time and outstanding-vs-agreed amount for management.

## Deprecations

Legacy free-text "PROPOSED / ACCEPTED / REJECTED" writes remain accepted at
the DB layer but are normalised on read. New code MUST call
`normalizeLgSettlementStatus` before comparing statuses.
