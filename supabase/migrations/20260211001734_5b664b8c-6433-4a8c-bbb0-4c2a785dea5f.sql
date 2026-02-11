
-- Add maker-checker configuration to workflow_definitions
ALTER TABLE public.workflow_definitions 
  ADD COLUMN IF NOT EXISTS maker_checker_enabled boolean NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.workflow_definitions.maker_checker_enabled IS 
  'When enabled, the user who created/submitted the record cannot perform workflow actions on the same record (maker-checker enforcement)';
