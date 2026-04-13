

## Enhance Workflow Notification System: Configurable Step-Level and Decision-Level Notifications

### Current State Summary

The system has partial notification infrastructure:
- **`workflow_action_notifications`** table already exists, storing multiple notification channels per action (action_id, notification_type, template_id)
- **`workflow-notify-approvers`** edge function hardcodes in-app + email notifications to approvers when a step task is created
- **`workflow-notify-requester`** edge function hardcodes in-app + email to the initiator on final actions
- **Admin UI** (`WorkflowForm.tsx`) already allows configuring multiple notifications per action with type and template selection
- **Missing**: Step-level entry notifications (notify assignee when step is reached), recipient_type configuration (next_step_approver vs initiator vs specific_role), is_enabled flag, and the runtime engine ignoring configured notifications in favor of hardcoded edge function calls

### What Needs to Change

#### 1. Database Schema Changes (Migration)

**Extend `workflow_action_notifications` table** with new columns:
```sql
ALTER TABLE workflow_action_notifications
  ADD COLUMN recipient_type TEXT NOT NULL DEFAULT 'next_step_approver',
  ADD COLUMN is_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN module_id UUID REFERENCES app_modules(id),
  ADD COLUMN recipient_role_id UUID REFERENCES roles(id);
-- recipient_type values: 'next_step_approver', 'initiator', 'current_step_approver', 'specific_role'
```

**Create `workflow_step_notifications` table** for step-entry notifications (notify when a step is reached, independent of any action/decision):
```sql
CREATE TABLE workflow_step_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  template_id UUID REFERENCES notification_templates(id),
  module_id UUID REFERENCES app_modules(id),
  recipient_type TEXT NOT NULL DEFAULT 'step_approver',
  recipient_role_id UUID REFERENCES roles(id),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- recipient_type values: 'step_approver', 'initiator', 'specific_role'
```

**Seed existing workflows**: Insert default `workflow_action_notifications` rows for existing `end_workflow` actions to preserve current behavior (notify initiator on Approved/Rejected).

#### 2. New Edge Function: `workflow-process-notifications`

Replace the hardcoded notification logic in `workflow-notify-approvers` and `workflow-notify-requester` with a single, configurable notification processor:

- **Input**: `{ instance_id, step_id, action_id?, trigger: 'step_entry' | 'action_taken' }`
- **Logic**:
  1. If `trigger = 'step_entry'`: query `workflow_step_notifications` for the step
  2. If `trigger = 'action_taken'`: query `workflow_action_notifications` for the action
  3. Filter by `is_enabled = true`
  4. For each notification config, resolve recipients based on `recipient_type`:
     - `step_approver` / `next_step_approver`: Use existing approver resolution logic (role/designation/user lookup)
     - `initiator`: Lookup `workflow_instances.started_by`
     - `current_step_approver`: Resolve from current step config
     - `specific_role`: Resolve users with `recipient_role_id`
  5. For each `notification_type`, dispatch:
     - `Email`: Insert into `notification_logs` + invoke `send-notification`
     - `In-App`: Insert into `in_app_notifications`
     - `SMS` / `Push`: Insert into `notification_logs` with appropriate channel
  6. Log all attempts with success/failure status

#### 3. Update Runtime Engine (`useWorkflowActions.ts`)

**`createNextStepTask()`** (line 1071-1088): Replace the hardcoded `workflow-notify-approvers` call with:
```typescript
await supabase.functions.invoke('workflow-process-notifications', {
  body: { instance_id: instanceId, step_id: step.id, trigger: 'step_entry' }
});
```

**`end_workflow` block** (line 617-649): Replace the hardcoded `workflow-notify-requester` call with:
```typescript
await supabase.functions.invoke('workflow-process-notifications', {
  body: { instance_id: task.instance_id, step_id: task.step_id, action_id: actionId, trigger: 'action_taken' }
});
```

**`is_final_step` fallback** (line 696-708): Same replacement pattern.

#### 4. Update All Submission Hooks

Replace direct `workflow-notify-approvers` calls in these files with `workflow-process-notifications`:
- `src/hooks/useC3Submit.ts`
- `src/hooks/useOnlineApplicationWorkflowBinding.ts`
- `src/hooks/useCardMachineChangeRequests.ts`
- `src/services/employerWorkflowTriggerService.ts`
- `src/services/workflowTriggerService.ts`
- `src/services/bn/bnWorkflowIntegrationService.ts`

#### 5. Admin UI Enhancement (`WorkflowForm.tsx`)

**Step-level notification config**: Add a "Step Entry Notifications" section inside each step collapsible, allowing admins to add/remove notification rows with:
- Notification Type (dropdown from `useActiveNotificationTypes`)
- Recipient Type (dropdown: Step Approver, Initiator, Specific Role)
- Template (dropdown from `notification_templates`)
- Enabled toggle

**Action-level notification config**: Extend the existing action notification section with:
- Recipient Type dropdown (Next Step Approver, Initiator, Current Step Approver, Specific Role)
- Enabled toggle per notification row

#### 6. Update `useWorkflows.ts` Save Logic

- Load/save `workflow_step_notifications` alongside step data
- Include `recipient_type`, `is_enabled`, `module_id` when saving `workflow_action_notifications`

#### 7. Backward Compatibility & Migration

- Keep `workflow-notify-approvers` and `workflow-notify-requester` edge functions as-is (not deleted) for safety
- Seed `workflow_step_notifications` for all existing workflow steps with `notification_type = 'In-App'` + `recipient_type = 'step_approver'` + `is_enabled = true` to match current hardcoded behavior
- Seed `workflow_action_notifications` for all existing `end_workflow` actions with `notification_type = 'In-App'` + `recipient_type = 'initiator'` to match current requester notification behavior
- The new `workflow-process-notifications` function will be the single entry point; existing edge functions remain deployable but unused

#### 8. Audit Logging

- All notification dispatch results logged in `notification_logs` (already happening)
- Configuration changes tracked via existing `system_audit_trail` triggers

### Files to Create/Modify

| File | Change |
|------|--------|
| Migration SQL | Create `workflow_step_notifications`, extend `workflow_action_notifications`, seed existing workflows |
| `supabase/functions/workflow-process-notifications/index.ts` | **New** - unified configurable notification processor |
| `src/hooks/useWorkflowActions.ts` | Replace hardcoded edge function calls with `workflow-process-notifications` |
| `src/hooks/useC3Submit.ts` | Replace `workflow-notify-approvers` call |
| `src/hooks/useOnlineApplicationWorkflowBinding.ts` | Replace `workflow-notify-approvers` call |
| `src/hooks/useCardMachineChangeRequests.ts` | Replace `workflow-notify-approvers` call |
| `src/services/employerWorkflowTriggerService.ts` | Replace `workflow-notify-approvers` call |
| `src/services/workflowTriggerService.ts` | Replace `workflow-notify-approvers` call |
| `src/services/bn/bnWorkflowIntegrationService.ts` | Replace `workflow-notify-approvers` call |
| `src/hooks/useWorkflows.ts` | Add types + CRUD for `workflow_step_notifications`, extend action notification fields |
| `src/pages/admin/workflows/WorkflowForm.tsx` | Add step-entry notification config UI, extend action notification UI with recipient_type and is_enabled |

### Impact

All existing workflows will continue working identically. The current hardcoded behavior is replicated via seeded database configuration. New workflows will automatically inherit configurable notification behavior without code changes.

