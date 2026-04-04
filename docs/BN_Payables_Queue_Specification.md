# BN Payables Queue — Technical Specification

## Business Purpose

The Payables Queue manages `bn_payment_instruction` records created from approved entitlements **before** actual payment issue. It provides queue-based review with readiness scoring, duplicate prevention, hold/release controls, exception routing, and bulk operations.

**Key separation:** This module does NOT issue payments. Actual payment issue is a downstream batch process that persists to `cl_cheques` / `cl_cheques_holding` / `cl_cheques_survivor`. The `cn_payment*` tables are NEVER used for outbound benefit payments.

## How It Fits Into the Existing System

```
Claim → Determination → Approval → Entitlement (ACTIVE) → Payable Instruction → [THIS MODULE] → Payment Batch → cl_cheques
```

- **Upstream**: Entitlement activation creates initial `bn_payment_instruction` records
- **Downstream**: Ready payables are included in payment batches; issued payments persist to `cl_cheques`
- **This module**: Manages the queue between entitlement and payment issue

## Existing Tables Used

| Table | Purpose |
|-------|---------|
| `bn_claim` | Claim context, linked-claim refs, status |
| `bn_entitlement` | Parent entitlement for each payable |
| `bn_claim_event` | Audit trail for all actions |
| `bn_product` / `bn_product_version` | Benefit type metadata |
| `cl_head` | Legacy claim header (soft join via claim_number) |
| `cl_cheques` / `cl_cheques_holding` | Outbound payment (read-only from here) |

## New Tables Used

| Table | Purpose |
|-------|---------|
| `bn_payment_instruction` | Primary table — individual payable instructions |
| `bn_payment_schedule` | Recurring schedule reference |
| `bn_payment_batch` | Batch control for grouping issued payments |
| `bn_payment_exception` | Exception routing records |

## Payable Instruction Statuses

| Status | Description | Can Transition To |
|--------|-------------|-------------------|
| `READY` | All readiness checks passed; eligible for batch | HELD, ISSUED_PENDING, CANCELLED, EXCEPTION |
| `BLOCKED` | Readiness rules failed; requires resolution | READY, CANCELLED, EXCEPTION |
| `HELD` | Manually held by supervisor | READY, CANCELLED, EXCEPTION |
| `EXCEPTION` | Flagged for investigation | READY, CANCELLED, HELD |
| `SCHEDULED` | Not yet due; becomes READY on scheduled date | READY, CANCELLED, HELD |
| `ISSUED_PENDING` | Added to batch; awaiting confirmation | CANCELLED, REISSUE_PENDING |
| `CANCELLED` | Permanently cancelled | REISSUE_PENDING |
| `REISSUE_PENDING` | Replacement instruction pending | READY, CANCELLED |

## Actions

| Action | From Statuses | To Status | Requires Narrative | Requires Reason | Bulk | Roles |
|--------|---------------|-----------|-------------------|-----------------|------|-------|
| RELEASE | HELD, EXCEPTION | READY | No | No | Yes | SUPERVISOR+ |
| HOLD | READY, SCHEDULED, BLOCKED | HELD | Yes | No | Yes | SUPERVISOR+ |
| CANCEL | READY, BLOCKED, HELD, EXCEPTION, SCHEDULED | CANCELLED | Yes | Yes | No | MANAGER+ |
| FLAG_EXCEPTION | READY, BLOCKED, HELD, SCHEDULED | EXCEPTION | Yes | Yes | No | CLAIMS_OFFICER+ |
| RESOLVE_BLOCK | BLOCKED | READY | Yes | No | Yes | SUPERVISOR+ |
| REQUEST_REISSUE | ISSUED_PENDING, CANCELLED | REISSUE_PENDING | Yes | Yes | No | SUPERVISOR+ |
| APPROVE_REISSUE | REISSUE_PENDING | READY | No | No | No | MANAGER+ |

## Readiness Rules

| Rule Code | Label | Blocking | Description |
|-----------|-------|----------|-------------|
| ENTITLEMENT_ACTIVE | Entitlement Active | Yes | Parent entitlement ACTIVE or REOPENED |
| CLAIM_NOT_SUSPENDED | Claim Not Suspended | Yes | Parent claim not SUSPENDED/DENIED |
| BANK_DETAILS_VALID | Bank Details Valid | Yes | Payment method + bank account populated for EFT |
| AMOUNT_WITHIN_LIMITS | Amount Within Limits | Yes | Amount within product min/max thresholds |
| NO_DUPLICATE | No Duplicate | Yes | No existing payable for same SSN+period+amount |
| EVIDENCE_COMPLETE | Evidence Complete | No | All required evidence verified |
| ENTITLEMENT_BALANCE | Entitlement Balance | Yes | Remaining balance covers this amount |
| SCHEDULE_DUE | Schedule Due | No | Scheduled date ≤ today |

## Duplicate Prevention

- **Hash**: `{SSN}|{period_start}|{period_end}|{amount}|{instruction_type}`
- Stored in `duplicate_check_hash` field
- Checked on creation and on RESOLVE_BLOCK / RELEASE actions
- Duplicate payables are flagged with `is_duplicate = true` and `duplicate_of_id`

## Role Matrix

| Role | View | Act | Available Actions |
|------|------|-----|-------------------|
| CLAIMS_OFFICER | ✓ | ✓ | FLAG_EXCEPTION only |
| SUPERVISOR | ✓ | ✓ | RELEASE, HOLD, FLAG_EXCEPTION, RESOLVE_BLOCK, REQUEST_REISSUE |
| MANAGER | ✓ | ✓ | All actions |
| DIRECTOR | ✓ | ✓ | All actions |
| ADMIN | ✓ | ✓ | All actions |
| AUDITOR | ✓ | ✗ | View only |

## Screen Layout

### 1. Non-Production Banner
Amber dashed border banner per BN UX standards.

### 2. Metric Cards (8 across)
Total | Ready | Held | Blocked | Exception | Scheduled | Issued (Pending) | Reissue

### 3. Filter Bar
- Search: SSN, claim number, payee name
- Status filter dropdown
- Instruction type filter dropdown
- Clear all button
- Record count badge

### 4. Bulk Action Bar (conditional)
Appears when items selected. Supports: Release, Hold, Resolve Block.

### 5. Queue Table
| Column | Description |
|--------|-------------|
| ☑ | Selection checkbox |
| SSN | Contributor SSN (monospace) |
| Claim # | Claim number (monospace) |
| Benefit | Product benefit name |
| Type | PERIODIC / LUMP_SUM / etc. |
| Amount | Formatted currency (XCD) |
| Due Date | Due or scheduled date |
| Status | BnStatusBadge with dot |
| Readiness | Shield icon (green/amber/red) |
| Age (d) | Days since creation (color-coded) |
| 👁 | View detail button |

### 6. Detail Drawer
- Status badge with age
- Claim context section
- Payment details section
- Readiness rules breakdown (per-rule pass/fail with blocking indicators)
- Hold/Exception info (conditional)
- Action buttons with narrative input

## Workflow Integration

- All status transitions write immutable records to `bn_claim_event`
- Event type: `PAYABLE_{ACTION}` (e.g., `PAYABLE_HOLD`, `PAYABLE_RELEASE`)
- Metadata includes `instruction_id`, `entity_type: 'PAYMENT_INSTRUCTION'`, `entitlement_id`
- Entitlement suspension cascades to HOLD all PENDING instructions
- Entitlement termination cascades to CANCEL all active instructions

## Notification Triggers

| Event | Trigger Key | Recipients |
|-------|-------------|------------|
| Payable held | `payable.held` | Assigned officer, supervisor |
| Payable cancelled | `payable.cancelled` | Assigned officer, claimant |
| Exception flagged | `payable.exception` | Supervisor, manager |
| Reissue requested | `payable.reissue_requested` | Manager for approval |

## Audit Events

Every action writes to `bn_claim_event` with:
- `event_type`: `PAYABLE_{ACTION}`
- `from_status` / `to_status`
- `performed_by`: UserCode of acting user
- `performed_at`: Timestamp
- `metadata`: Instruction ID, entitlement ID, reason code, action details

## Backward Compatibility

- Payable instructions link to `cl_cheque_no` after issue (populated by downstream batch)
- Legacy claim numbers preserved via `claim_number` field
- No writes to `cl_cheques` from this module
- No usage of `cn_payment*` for outbound payments
- Existing workflow and notification processes integrated via `bn_claim_event`

## Files

| File | Purpose |
|------|---------|
| `src/services/bn/payablesQueueService.ts` | Service layer — types, actions, readiness, duplicate checks |
| `src/hooks/bn/useBnPayablesQueue.ts` | React Query hooks for fetch and mutations |
| `src/pages/bn/payables/PayablesQueue.tsx` | Main page component |
| `src/components/bn/payables/PayablesQueueFilters.tsx` | Filter bar |
| `src/components/bn/payables/PayablesQueueTable.tsx` | Queue table with selection |
| `src/components/bn/payables/PayableDetailDrawer.tsx` | Detail drawer with actions |
| `src/components/bn/payables/PayablesActionBar.tsx` | Bulk action bar |
