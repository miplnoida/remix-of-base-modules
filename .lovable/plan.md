

# Analysis: Excessive `workflow_steps` Network Calls

## Findings

After thorough code analysis, I identified **three sources** of repeated `workflow_steps` queries. Two are genuine performance problems (N+1 patterns), and one is acceptable.

---

## Source 1: `useWorkflowPendingApprovals.ts` — **CRITICAL N+1 Problem**

**Location**: Lines 157-162

This hook is called by `InAppNotificationBell` (always visible in the app header on every page), which calls `usePendingApprovalCount()`. It runs with:
- `refetchInterval: 60000` (every 60 seconds)
- `staleTime: 30000` (considered stale after 30 seconds)

**The problem**: After fetching all pending tasks, it loops through each task and fires an **individual** `workflow_steps` query per task to check step-level approver configuration (lines 157-162):

```typescript
for (const task of tasks) {
  // ... if canAct is still false after role/designation checks:
  const { data: step } = await supabase
    .from('workflow_steps')
    .select('approver_type, approver_role_ids, ...')
    .eq('id', task.step_id)
    .single();
}
```

If there are 20 pending tasks where the user isn't directly assigned, this fires **20 individual queries** every 60 seconds. This is the primary source of the excessive calls.

**Fix**: Batch-fetch all unique `step_id` values in a single query using `.in('id', uniqueStepIds)` before the loop, then look up from the local map.

---

## Source 2: `useWorkflowInstances.ts` — **N+1 Problem (Lower Priority)**

**Location**: Lines 102-118

When listing workflow instances, it fetches the `step_name` for each instance's `current_step_id` individually inside a `Promise.all` map. With 25 instances per page, this fires up to 25 individual `workflow_steps` queries.

**Fix**: Collect unique `current_step_id` values, batch-fetch in one query, then map locally.

---

## Source 3: `useWorkflowActions.ts` — **Acceptable (Single Query)**

**Location**: Lines 228-232 (inside `checkUserPermissionOptimized`)

This fires exactly one `workflow_steps` query per record when checking permissions. It only runs when a specific record is being viewed, and has `staleTime: 60000`. This is appropriate and not a performance concern.

---

## Recommended Fix Plan

### Step 1: Fix `useWorkflowPendingApprovals.ts` (biggest impact)

Before the `for (const task of tasks)` loop, batch-fetch all step configs:

```typescript
// Collect unique step IDs
const uniqueStepIds = [...new Set(tasks.map(t => t.step_id).filter(Boolean))];

// Single batch query
const { data: stepsData } = await supabase
  .from('workflow_steps')
  .select('id, approver_type, approver_role_ids, approver_designation_ids, approver_user_ids')
  .in('id', uniqueStepIds);

const stepMap = new Map(stepsData?.map(s => [s.id, s]) || []);

// Then inside the loop, replace the individual query with:
const step = stepMap.get(task.step_id);
```

This reduces N queries to 1.

### Step 2: Fix `useWorkflowInstances.ts` (secondary impact)

Same batch pattern for `current_step_id` → `step_name` resolution:

```typescript
const stepIds = data.filter(i => i.current_step_id).map(i => i.current_step_id);
const { data: steps } = await supabase
  .from('workflow_steps')
  .select('id, step_name')
  .in('id', [...new Set(stepIds)]);
const stepNameMap = new Map(steps?.map(s => [s.id, s.step_name]) || []);
```

## Impact

- **Before**: 20+ `workflow_steps` calls every 60 seconds from notifications alone, plus N calls per workflow list page load
- **After**: 1 call every 60 seconds from notifications, 1 call per workflow list page load
- No behavioral change — same data, same results, dramatically fewer network requests

## Files Modified

| File | Change |
|---|---|
| `src/hooks/useWorkflowPendingApprovals.ts` | Replace N+1 step queries with single batch fetch |
| `src/hooks/useWorkflowInstances.ts` | Replace N+1 step name queries with single batch fetch |

