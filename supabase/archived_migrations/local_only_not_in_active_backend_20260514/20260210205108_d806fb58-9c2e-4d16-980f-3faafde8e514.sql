-- Add remarks_required flag to workflow_step_actions
ALTER TABLE public.workflow_step_actions 
ADD COLUMN remarks_required boolean NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.workflow_step_actions.remarks_required IS 'When true, reviewer must provide comments/remarks before executing this action';