-- Add configurable result_status to workflow step actions
-- When set, this overrides the default status mapping (e.g., Approve→'approved', Reject→'rejected')
ALTER TABLE public.workflow_step_actions
ADD COLUMN IF NOT EXISTS result_status text DEFAULT NULL;

COMMENT ON COLUMN public.workflow_step_actions.result_status IS 'Admin-configurable status value applied to the source record when this action is executed. Overrides default status mapping. Examples: approved, rejected, verified, cancelled.';
