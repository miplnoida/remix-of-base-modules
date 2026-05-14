-- Fix the auto-completed workflow instance for Employer 658852 Sep 2026
UPDATE workflow_instances
SET status = 'InProgress', completed_at = NULL
WHERE id = '08240b18-078f-419d-8f35-3747b8abd953'
  AND status = 'Completed';

UPDATE workflow_tasks
SET status = 'Pending', action_taken = NULL, comments = NULL
WHERE instance_id = '08240b18-078f-419d-8f35-3747b8abd953'
  AND status = 'Completed';
