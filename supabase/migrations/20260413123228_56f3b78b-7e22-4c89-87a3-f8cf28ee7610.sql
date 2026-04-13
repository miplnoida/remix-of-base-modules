
-- Reset Sep 2026 SCH-1 task to Pending with proper role assignment
UPDATE workflow_tasks
SET status = 'Pending',
    assigned_role = 'FinanceManager',
    assigned_to = NULL,
    completed_at = NULL
WHERE id = 'd7f85a25-6027-4abc-b085-49d3f459ccac';

-- Reset Mar 2026 SCH-4 instance back to InProgress
UPDATE workflow_instances
SET status = 'InProgress',
    completed_at = NULL
WHERE id = '0b6bcf43-7cba-4753-9fca-7529180a837a';

-- Reset Mar 2026 SCH-4 task to Pending
UPDATE workflow_tasks
SET status = 'Pending',
    assigned_to = NULL,
    completed_at = NULL
WHERE id = 'c3d2f517-a45e-4497-9a36-9df09c7f5c91';
