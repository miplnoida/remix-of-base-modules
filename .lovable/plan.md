

# Auto-Attach Workflow for Pending Employer Registrations

## Problem

Many `er_master` records with status `P` (Pending) have **no workflow instance** attached. The `WorkflowActionButtonsCompact` component renders nothing for these records, so users cannot Accept/Reject them. Only records that went through the submission flow have workflows attached.

**Data evidence**: 12+ employers with status `P` and no `workflow_instances` row (e.g., 664012, 664024, 664031, 664044–664049, 664052–664054, 761764).

## Solution

Create a mechanism to auto-attach the "Employer Registration Approval Workflow" to any `P`-status employer that lacks one, triggered when the Pending Verification tab loads.

### Step 1: Create a new hook `useAutoAttachEmployerWorkflow`

**File**: `src/hooks/useAutoAttachEmployerWorkflow.ts`

This hook will:
1. Accept the list of employers currently displayed in the Pending tab
2. For each employer with status `P`, check if a workflow instance exists (batch query `workflow_instances` where `source_module = 'employers'` and `source_record_id IN (...)`)
3. For any employer **without** an active workflow instance, call `triggerEmployerRegistrationWorkflow` from the existing `employerWorkflowTriggerService.ts`
4. Process sequentially (not parallel) to avoid overwhelming the DB
5. Show a toast summary: "Attached workflow to X employer(s)"
6. Trigger a refetch so the `WorkflowActionButtonsCompact` picks up the new instances

The hook runs once when the pending tab data loads, using a `useEffect` with a ref to prevent re-runs.

### Step 2: Integrate into `EmployerRegistrationList.tsx`

- Import and call `useAutoAttachEmployerWorkflow` in the list component
- Pass the filtered employers list (only those with `status === 'P'`) and the current user ID
- Pass the `refetch` callback so the hook can refresh the list after attaching workflows
- Only activate when `activeTab === 'pending'`

### Files Modified

| File | Change |
|------|--------|
| `src/hooks/useAutoAttachEmployerWorkflow.ts` | New hook — batch-checks and auto-attaches workflows |
| `src/pages/employer-registration/EmployerRegistrationList.tsx` | Import and use the new hook |

### Key Design Decisions

- **No database migration needed** — uses existing `triggerEmployerRegistrationWorkflow` service
- **Idempotent** — checks for existing instances before creating, so safe to re-run
- **Non-blocking** — runs in background after list renders, doesn't block the UI
- **Batch-optimized** — single query to check all pending employers, then only triggers for missing ones

