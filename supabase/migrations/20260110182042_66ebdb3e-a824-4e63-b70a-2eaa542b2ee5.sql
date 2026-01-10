-- Create enum type for next step types
DO $$ BEGIN
  CREATE TYPE public.next_step_type AS ENUM (
    'next_step',
    'specific_step',
    'end_workflow',
    'send_back_to_applicant'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum type for workflow end state
DO $$ BEGIN
  CREATE TYPE public.workflow_end_state AS ENUM (
    'Approved',
    'Rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to workflow_step_actions table
ALTER TABLE public.workflow_step_actions 
ADD COLUMN IF NOT EXISTS next_step_type public.next_step_type DEFAULT 'next_step';

ALTER TABLE public.workflow_step_actions 
ADD COLUMN IF NOT EXISTS end_state public.workflow_end_state;

-- Update the next_step_id column to have a proper foreign key (if not already set)
-- First check if the constraint exists before adding
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'workflow_step_actions_next_step_id_fkey'
  ) THEN
    ALTER TABLE public.workflow_step_actions 
    ADD CONSTRAINT workflow_step_actions_next_step_id_fkey 
    FOREIGN KEY (next_step_id) REFERENCES public.workflow_steps(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN public.workflow_step_actions.next_step_type IS 'Defines what happens after this action: next_step (sequential), specific_step (go to selected step), end_workflow (complete/reject), send_back_to_applicant (request more info)';
COMMENT ON COLUMN public.workflow_step_actions.end_state IS 'When next_step_type is end_workflow, this specifies whether the workflow ends as Approved or Rejected';