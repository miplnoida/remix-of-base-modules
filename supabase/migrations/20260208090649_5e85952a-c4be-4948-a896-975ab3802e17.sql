-- Add 'Paused' to workflow_task_status enum
ALTER TYPE workflow_task_status ADD VALUE IF NOT EXISTS 'Paused';