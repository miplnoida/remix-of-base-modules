

# Remove Stale Workflow Step (step_number = -1000)

## Findings

- **No pending workflow instances** exist for "Employer Registration Approval Workflow" — no deletions needed there.
- **One orphan step** exists with `step_number = -1000` (id: `8caeb962-...`, name: "Step 1") that needs to be deleted.

## Implementation

**Single step — delete the -1000 step row:**

Use the data insert/update tool to run:
```sql
DELETE FROM workflow_steps WHERE id = '8caeb962-9998-4fd9-8e16-56a88813ae6d';
```

This removes the single invalid step. No schema migration is needed — this is a data cleanup operation only.

## Verification

After deletion, confirm zero rows exist with `step_number = -1000` for this workflow.

