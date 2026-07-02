# Legal Settlement — State Machine

Single source of truth: `src/services/legal/lgSettlementStateMachine.ts`.
Consumed by `lgSettlementService`, `AddSettlementDialog`, and the Case 360
Settlements tab.

## States

`DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `ACTIVE`,
`BREACHED`, `COMPLETED`, `CANCELLED`.

Terminal: `REJECTED`, `COMPLETED`, `CANCELLED`.

Legacy values (`PROPOSED`, `ACCEPTED`) written before Phase 8 are normalised
to `SUBMITTED` / `APPROVED` for compatibility with existing rows.

## Transitions

```text
DRAFT        → SUBMITTED | CANCELLED
SUBMITTED    → UNDER_REVIEW | CANCELLED
UNDER_REVIEW → APPROVED | REJECTED | CANCELLED
APPROVED     → ACTIVE | CANCELLED
ACTIVE       → COMPLETED | BREACHED | CANCELLED
BREACHED     → ACTIVE (cured) | CANCELLED
```

## Action → capability

| Action        | Target         | Capability                |
|---------------|----------------|---------------------------|
| submit        | SUBMITTED      | canDraftLetter            |
| startReview   | UNDER_REVIEW   | canApproveStageMove       |
| approve       | APPROVED       | canApproveClosure         |
| reject        | REJECTED       | canApproveClosure         |
| activate      | ACTIVE         | canApproveStageMove       |
| markBreached  | BREACHED       | canApproveEscalation      |
| cure          | ACTIVE         | canApproveStageMove       |
| complete      | COMPLETED      | canApproveClosure         |
| cancel        | CANCELLED      | canApproveClosure         |

Every transition writes an `lg_case_activity` entry with `SETTLEMENT_*`
activity type and, on `APPROVED`, triggers the `SETTLEMENT_APPROVED`
fee-engine event. When linked to a `core_payment_arrangement`, activation
mirrors the arrangement status via `lgRecoveryService`.
