# Workflow Maker-Checker Enforcement

## Overview
The workflow engine supports a configurable **maker-checker** restriction at the workflow definition level. When enabled via the `maker_checker_enabled` flag on `workflow_definitions`, the user who created or submitted a record **cannot** perform workflow actions (Approve, Reject, etc.) on that same record.

## How It Works
1. **Configuration**: Administrators toggle "Maker–Checker" on/off per workflow in the Workflow Form (Admin > Workflows > Edit).
2. **UI Enforcement**: The `useWorkflowActions` hook checks `maker_checker_enabled` before returning available actions. If the current user is the record creator or workflow instance starter, `canPerformActions` is set to `false` and no action buttons are rendered.
3. **Backend Enforcement**: The `useExecuteWorkflowAction` mutation performs a server-side check before executing any action. If maker-checker is violated, the action is blocked and an audit trail entry is logged with action `maker_checker_blocked`.
4. **Audit Logging**: All blocked attempts are recorded in `system_audit_trail` with severity `warn`, including workflow name, action type, record reference, and blocked user code.

## Creator Detection
The system checks two sources to identify the record creator:
- `workflow_instances.started_by` — the user who triggered the workflow
- Module-specific creator columns (e.g., `ip_master.entered_by`, `er_master.entered_by`) matched against the current user's `user_code`

## Important Rules
- Maker-checker is **disabled by default** on all workflows.
- The check applies generically across all modules using the workflow engine.
- **Admin users ARE exempt** from maker-checker — they can always perform workflow actions even on their own records.
- Admin role is detected from the `user_roles` table in Supabase (not hardcoded).
- Both UI hiding and backend validation are enforced (defense in depth).
