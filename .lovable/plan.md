

# Enhance Workflow Engine with "Reporting Manager" Approver Type

## Summary

Add a new `reporting_manager` approver type to the workflow step configuration. When selected, the system dynamically resolves the approver at runtime by looking up the initiator's `reporting_to_user_id` from the `profiles` table. The `profiles.reporting_to_user_id` column already exists and is populated via User Create/Edit.

---

## Existing Infrastructure (No Schema Changes Needed)

- `profiles.reporting_to_user_id` (uuid, FK to profiles.id) — already exists
- User Create/Edit flows already populate this field via designation hierarchy
- `workflow_steps.approver_type` is a text column — no enum constraint; adding `'reporting_manager'` is safe

---

## Step 1: Database Migration — Add `resolve_reporting_manager` RPC

Create a Supabase RPC function that:
1. Accepts `p_user_id uuid` (the workflow initiator)
2. Queries `profiles` for `reporting_to_user_id`
3. Validates the resolved manager is **active** (`is_active = true`)
4. Returns the manager's `id` and `full_name`, or NULL with an error message if:
   - No reporting manager is set
   - Reporting manager is inactive
   - Circular reference detected (manager = self)

```sql
CREATE OR REPLACE FUNCTION public.resolve_reporting_manager(p_user_id uuid)
RETURNS TABLE(manager_id uuid, manager_name text, error_message text)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$ ... $$;
```

---

## Step 2: Update Workflow Design UI (`WorkflowForm.tsx`)

**2a. Add to `APPROVER_TYPES` constant:**
```typescript
{ value: 'reporting_manager', label: 'Reporting Manager' },
```

**2b. Update `StepFormData` type:**
```typescript
approver_type: 'role' | 'designation' | 'specific_users' | 'department_head' | 'designation_hierarchy' | 'reporting_manager';
```

**2c. Add UI hint when selected** (similar to `department_head`):
```tsx
{step.approver_type === 'reporting_manager' && (
  <div className="bg-muted p-3 rounded-md space-y-1">
    <p className="text-sm text-muted-foreground">
      The reporting manager of the user who initiated this workflow step will be automatically resolved at runtime.
    </p>
    <p className="text-xs text-amber-600">
      Note: If the initiator has no reporting manager assigned, the workflow will block with a validation error.
    </p>
  </div>
)}
```

No manual user/role selection fields are shown — fully dynamic.

---

## Step 3: Update Workflow Execution Engine

### 3a. `workflowTriggerService.ts` — First step task creation

Add a new branch for `approverType === 'reporting_manager'`:
- Call `resolve_reporting_manager` RPC with the `userId` (workflow initiator)
- If resolved, set `taskAssignment.assigned_to = manager_id`
- If not resolved, log a `workflow_logs` entry with action `reporting_manager_not_found` and either:
  - Block the workflow (set instance status to `Blocked`)
  - Or skip assignment (task stays unassigned for admin manual assignment)

### 3b. `useWorkflowActions.ts` — `createNextStepTask()`

Same logic: when `approverType === 'reporting_manager'`:
- Determine the initiator: query `workflow_instances.started_by` for the instance
- Call `resolve_reporting_manager` with that user ID
- Assign the resolved manager as `assigned_to`
- If unresolved, create task as unassigned + log warning

### 3c. `useWorkflowActions.ts` — `canUserActOnTask()`

Add branch for `approverType === 'reporting_manager'`:
- The task will have `assigned_to` set to the resolved manager ID
- The existing `assigned_to` check at line 228 already handles this: `if (assignedTo && assignedTo === userId) return true`
- No additional logic needed since the resolution happens at task creation time

### 3d. `useSampleApplications.ts` and `useApplicationsReview.ts`

Add the same `reporting_manager` branch to the approver resolution logic in these files (they duplicate the task creation pattern).

---

## Step 4: Audit Trail Integration

When a reporting manager is resolved, log an entry in `workflow_logs`:
```json
{
  "action": "approver_resolved",
  "details": {
    "approver_type": "reporting_manager",
    "initiator_user_id": "<user-id>",
    "resolved_manager_id": "<manager-id>",
    "resolved_manager_name": "John Doe",
    "resolved_at": "<timestamp>"
  }
}
```

When resolution fails:
```json
{
  "action": "reporting_manager_not_found",
  "details": {
    "initiator_user_id": "<user-id>",
    "reason": "No reporting manager assigned"
  }
}
```

---

## Step 5: WorkflowInstanceDetail Display

Update `WorkflowInstanceDetail.tsx` approver info display to show "Reporting Manager" as the type label and the resolved user name.

---

## Step 6: Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| No reporting manager set | Task created as unassigned; warning logged; admin can manually assign |
| Reporting manager is inactive | Same as above — treated as unresolved |
| Circular reference (self) | RPC rejects; same fallback |
| Hierarchy changes after task created | No impact — assignment is point-in-time at task creation |
| Existing workflows | Unaffected — `reporting_manager` is a new opt-in value |

---

## Files Changed

| File | Change |
|------|--------|
| Database migration | New `resolve_reporting_manager` RPC |
| `src/pages/admin/workflows/WorkflowForm.tsx` | Add `reporting_manager` to `APPROVER_TYPES`, `StepFormData` type, and UI hint |
| `src/services/workflowTriggerService.ts` | Add `reporting_manager` branch in first-step task creation |
| `src/hooks/useWorkflowActions.ts` | Add `reporting_manager` branch in `createNextStepTask()` |
| `src/hooks/useSampleApplications.ts` | Add `reporting_manager` branch |
| `src/hooks/useApplicationsReview.ts` | Add `reporting_manager` branch |
| `src/pages/admin/workflows/WorkflowInstanceDetail.tsx` | Display "Reporting Manager" label |

