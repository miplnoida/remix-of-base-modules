# `lg_workflow_policy` → Central Workflow Cut-Over Comparison

_Status: **DRAFT — pending approval before retiring `/legal/admin/policy`.**_

## Purpose
Prove that every active row in `lg_workflow_policy` (legacy per-action approval matrix) is fully represented by the central engine (`workflow_definitions` + `workflow_triggers` + `ce_workflow_mappings`) before we retire the legacy screen.

## Method
1. Snapshot active legacy rules:
   ```sql
   SELECT action_code, approval_required, preparer_role_type,
          approver_role_type, min_approvers, allow_self_approval,
          assistant_can_prepare, lawyer_must_review
   FROM lg_workflow_policy
   WHERE is_active = true
   ORDER BY action_code;
   ```
2. For each `action_code`, map to a central `workflow_definitions.name` and confirm the
   trigger/mapping row exists:
   ```sql
   SELECT wd.name, wt.source_module, wt.event_type, wm.event_key
   FROM workflow_definitions wd
   LEFT JOIN workflow_triggers wt ON wt.workflow_definition_id = wd.id
   LEFT JOIN ce_workflow_mappings wm ON wm.workflow_definition_id = wd.id
   WHERE wd.secured_table LIKE 'lg_%';
   ```
3. Confirm approver depth / self-approval / assistant preparation flags are reflected
   by the workflow's step configuration (`workflow_steps.approver_type`,
   `workflow_steps.min_approvers`, `workflow_definitions.allow_self_approval`).

## Coverage Matrix (to be filled during cut-over review)

| legacy action_code | central workflow name | event_key | approver depth match | assistant/lawyer review match | gap |
|--------------------|-----------------------|-----------|----------------------|-------------------------------|-----|
| _tbd_              |                       |           |                      |                               |     |

## Cut-over checklist
- [ ] Every `is_active` legacy row appears in the matrix above.
- [ ] Every mapping row shows a matching central definition and `enabled = true`.
- [ ] Approver depth (`min_approvers`) and `allow_self_approval` match per row.
- [ ] Assistant preparation / lawyer review gates are covered by central role gating
      (`workflow_step_approvers` role scope or `useLgCan`).
- [ ] Business sign-off recorded in this document.
- [ ] Hide `/legal/admin/policy` from menu (set `app_modules.show_in_menu = false`).
- [ ] Mark `lg_workflow_policy` rows as `is_active = false` (retain rows for audit).

Until every box is ticked, `/legal/admin/policy` remains **read-only** and visible
in the menu as the reference source.
