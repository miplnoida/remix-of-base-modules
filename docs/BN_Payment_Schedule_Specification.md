# BN Payment Schedule Management — Technical Specification

## Business Purpose

Supports one-time and recurring benefit disbursement planning before batch and issue. Schedule rows are **orchestration records only** — issued payments persist to `cl_cheques` / `cl_cheques_holding` / `cl_cheques_survivor`. The `cn_payment*` tables are NEVER used for outbound benefit payments.

## How It Fits Into the Existing System

```
Entitlement (ACTIVE) → Schedule Generation → Schedule Rows (PROJECTED → DUE → GENERATED)
                                                              ↓
                                                     bn_payment_instruction (PENDING)
                                                              ↓
                                                     Payables Queue → Payment Batch → cl_cheques
```

## Existing Tables Used

| Table | Purpose |
|-------|---------|
| `bn_claim` | Claim context, linked-claim refs |
| `bn_entitlement` | Parent entitlement — rates, frequency, duration, balance |
| `bn_payment_instruction` | Downstream payable created from DUE schedule rows |
| `bn_claim_event` | Audit trail for all actions |
| `bn_product` / `bn_product_version` | Benefit type, frequency config |
| `cl_head` | Legacy claim header (soft join) |
| `cl_cheques` | Outbound payment (read-only from here) |

## New Tables Used

| Table | Purpose |
|-------|---------|
| `bn_payment_schedule` | Primary table — individual schedule rows |

## Schedule Row Statuses

| Status | Description |
|--------|-------------|
| `PROJECTED` | Future row, not yet due |
| `DUE` | Due date reached, ready for instruction generation |
| `GENERATED` | bn_payment_instruction created |
| `SUSPENDED` | Temporarily suspended |
| `SKIPPED` | Skipped (correction, catch-up replacement) |
| `CANCELLED` | Permanently cancelled |
| `ARREARS` | Arrears catch-up row |
| `ADJUSTED` | Rate/amount adjusted mid-schedule |

## Schedule Generation Logic

### One-Time Payments
- Single row: `sequence_number = 1`, `frequency = ONE_TIME`
- Amount = `total_entitlement` from entitlement
- Due date = entitlement `effective_from`

### Recurring (Pension-Style)
- Generates rows from `effective_from` to `effective_to` (or up to `maxPeriods` cap)
- Frequency: WEEKLY (7d), FORTNIGHTLY (14d), MONTHLY (calendar month)
- Each row amount = `computePeriodAmount(frequency, weekly_rate, monthly_rate)`
- Cumulative amount capped at `total_entitlement`
- Rate snapshot frozen at generation time (`rate_applied`, `rate_weekly`, `rate_monthly`)

### Arrears / Catch-Up
- Generated for missed periods between `arrears_from` and `arrears_to`
- Status = `ARREARS`, `generation_mode = ARREARS`
- Sequence numbers continue from max existing

### Regeneration
- Cancels all future non-generated rows (PROJECTED, DUE, SUSPENDED)
- Generates new rows from today using current entitlement state (remaining balance, rates)
- `generation_mode = REGENERATE`

## Actions

### Row-Level Actions

| Action | From | To | Narrative | Reason | Bulk | Roles |
|--------|------|----|-----------|--------|------|-------|
| GENERATE_INSTRUCTION | DUE, ARREARS | GENERATED | No | No | Yes | SUPERVISOR+ |
| SUSPEND_ROW | PROJECTED, DUE | SUSPENDED | Yes | Yes | Yes | SUPERVISOR+ |
| RESUME_ROW | SUSPENDED | PROJECTED | Yes | No | Yes | SUPERVISOR+ |
| SKIP_ROW | PROJECTED, DUE, SUSPENDED | SKIPPED | Yes | No | No | MANAGER+ |
| CANCEL_ROW | PROJECTED, DUE, SUSPENDED | CANCELLED | Yes | Yes | No | MANAGER+ |

### Schedule-Level Actions

| Action | Description | Roles |
|--------|-------------|-------|
| SUSPEND_FUTURE | Suspend all future PROJECTED rows | SUPERVISOR+ |
| REGENERATE | Cancel future rows and regenerate from current state | MANAGER+ |
| GENERATE_ARREARS | Generate arrears catch-up rows for missed periods | SUPERVISOR+ |

## Role Matrix

| Role | View | Act | Actions |
|------|------|-----|---------|
| CLAIMS_OFFICER | ✓ | ✗ | None |
| SUPERVISOR | ✓ | ✓ | GENERATE_INSTRUCTION, SUSPEND_ROW, RESUME_ROW, SUSPEND_FUTURE, GENERATE_ARREARS |
| MANAGER+ | ✓ | ✓ | All actions |
| AUDITOR | ✓ | ✗ | View only |

## Screen Layout

1. **Non-Production Banner** — Amber dashed border
2. **Metric Cards** (7): Total | Projected | Due | Generated | Suspended | Arrears | Scheduled Total ($)
3. **Filter Bar**: Search, Status, Frequency, Clear All
4. **Bulk Action Bar** (conditional): Generate Instruction, Suspend, Resume
5. **Schedule Grid**: Sequence #, SSN, Claim #, Frequency, Period, Due Date, Amount, Status, Mode
6. **Row Detail Drawer**: Full context, entitlement balance, linked instruction/batch/cheque, suspension/arrears info, row actions

## Workflow Integration

- All actions write to `bn_claim_event` with `event_type = SCHEDULE_{ACTION}`
- Entitlement suspension cascades: sets all PROJECTED/DUE rows to SUSPENDED
- Entitlement termination cascades: sets all non-generated rows to CANCELLED
- GENERATE_INSTRUCTION creates a `bn_payment_instruction` (status PENDING) in the Payables Queue

## Notification Triggers

| Event | Trigger Key | Recipients |
|-------|-------------|------------|
| Row suspended | `schedule.suspended` | Assigned officer |
| Row cancelled | `schedule.cancelled` | Assigned officer, supervisor |
| Bulk suspension | `schedule.bulk_suspended` | Supervisor, manager |
| Schedule regenerated | `schedule.regenerated` | Supervisor, manager |
| Arrears generated | `schedule.arrears` | Supervisor |

## Audit Events

Every action writes to `bn_claim_event`:
- `event_type`: `SCHEDULE_{ACTION}`
- `from_status` / `to_status`
- `performed_by`: UserCode
- `metadata`: schedule_row_id, entitlement_id, rows_affected (for bulk)

## Downstream Batch/Issue Impact

- GENERATE_INSTRUCTION creates `bn_payment_instruction` (PENDING) → enters Payables Queue
- Payables Queue manages readiness → payment batch includes READY instructions
- Payment batch process writes to `cl_cheques` (not this module)
- `cl_cheque_no` back-populated on schedule row after issue

## Backward Compatibility

- Schedule rows link to legacy `cl_cheque_no` after payment issue
- Legacy claim numbers preserved via `claim_number` field
- `legacy_schedule_ref` available for migration from legacy award systems
- No writes to `cl_cheques` or `cn_payment*` from this module

## Files

| File | Purpose |
|------|---------|
| `src/services/bn/scheduleService.ts` | Service — types, generation logic, actions, arrears |
| `src/hooks/bn/useBnSchedule.ts` | React Query hooks |
| `src/pages/bn/schedule/PaymentScheduleManagement.tsx` | Main page |
| `src/components/bn/schedule/ScheduleFiltersBar.tsx` | Filters |
| `src/components/bn/schedule/ScheduleGrid.tsx` | Timeline-aware grid |
| `src/components/bn/schedule/ScheduleRowDrawer.tsx` | Row detail drawer |
| `src/components/bn/schedule/ScheduleActionBar.tsx` | Bulk action bar |
