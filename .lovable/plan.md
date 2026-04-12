

# Fix: Employer Workflow Completion — Config-Driven Status Update

## Problem

When the "Employer Registration Approval Workflow" completes (Accept/Reject), the `updateSourceRecordStatus` function in `useWorkflowActions.ts` has no handler for `source_module = 'employers'`, so the status update silently skips. Additionally, the `result_status` on both workflow actions (Accept, Reject) is currently `NULL` — the admin hasn't configured what status to write.

## Root Causes

1. **Missing `employers` handler** in `updateSourceRecordStatus` (line 1068–1331)
2. **`result_status` not configured** on Accept/Reject actions for this workflow

## Implementation

### Step 1: Configure `result_status` on workflow actions (data update)

Set the admin-configured result statuses on the two existing actions:

- **Accept** (id: `a9f45a2c-...`): set `result_status = 'V'`
- **Reject** (id: `03012579-...`): set `result_status = 'R'`

This makes the status change fully admin-driven via the `configuredResultStatus` path that already exists in the codebase.

### Step 2: Add `employers` handler in `updateSourceRecordStatus`

Add an `else if (sourceModule === 'employers')` block in `src/hooks/useWorkflowActions.ts` after the `bn_claim` handler (line ~1328). This handler will:

- Use `configuredResultStatus` as the **primary** status source (admin-configured, not hardcoded)
- Fall back to endState mapping only if `configuredResultStatus` is null (safety net)
- Update `er_master` using `.eq('regno', sourceRecordId)` (not `unique_uuid`)
- Set audit fields: `verified_by`/`date_verified` when status = 'V'
- Log to `system_audit_trail`

The pattern follows the existing IP/C3/BN handlers which all check `configuredResultStatus` first.

### Step 3: Create database trigger for regno generation on status 'V'

Migration to create:

1. **Trigger function** `handle_er_status_to_verified()` — fires AFTER UPDATE on `er_master` when `NEW.status = 'V'` and `OLD.status <> 'V'`:
   - Checks if `regno` starts with 'T' (temporary)
   - If yes → calls existing `generate_er_regno()` to get permanent ID
   - Propagates new `regno` to related tables: `er_owner`, `er_locations`, `er_notes`, `er_commence`, `er_visit`, `er_suit`
   - If already permanent → no-op

2. **Trigger** `trg_er_master_status_verified` on `er_master` AFTER UPDATE

### Step 4: Verify trigger function `generate_er_regno` exists

Already confirmed this function exists and is used by `submit_er_registration`. The trigger will reuse it.

## Key Design Decision

The handler does **not** hardcode status values. It reads `configuredResultStatus` from the `workflow_step_actions.result_status` column — which the admin sets per action. This is the same pattern used by all other modules.

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/useWorkflowActions.ts` | Add `employers` handler block (~30 lines) |
| Database migration | Create trigger function + trigger on `er_master` |
| Data update | Set `result_status` on 2 workflow action rows |

