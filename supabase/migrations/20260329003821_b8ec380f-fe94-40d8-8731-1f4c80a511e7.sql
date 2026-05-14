
-- Add missing workflow columns to ia_annual_plans
ALTER TABLE public.ia_annual_plans 
  ADD COLUMN IF NOT EXISTS submitted_by text,
  ADD COLUMN IF NOT EXISTS rejected_by text,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS current_workflow_step text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false;
