-- Add 'pause_workflow' to next_step_type enum
ALTER TYPE next_step_type ADD VALUE IF NOT EXISTS 'pause_workflow';