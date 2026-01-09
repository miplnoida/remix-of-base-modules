-- PART 1: Add department_head_user_id to departments table
ALTER TABLE public.departments 
ADD COLUMN IF NOT EXISTS department_head_user_id uuid REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS idx_departments_head ON public.departments(department_head_user_id);

-- PART 2: Add module_id to notification_templates table
ALTER TABLE public.notification_templates 
ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES public.app_modules(id);

CREATE INDEX IF NOT EXISTS idx_notification_templates_module ON public.notification_templates(module_id);

-- PART 4 & 5: Enhance workflow_steps table with all new fields
ALTER TABLE public.workflow_steps
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS approver_type text DEFAULT 'role' CHECK (approver_type IN ('role', 'designation', 'specific_users', 'department_head', 'designation_hierarchy')),
ADD COLUMN IF NOT EXISTS approver_role_ids uuid[],
ADD COLUMN IF NOT EXISTS approver_designation_ids uuid[],
ADD COLUMN IF NOT EXISTS approver_user_ids uuid[],
ADD COLUMN IF NOT EXISTS parallel_approval boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS required_approvals integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS auto_approve_on_timeout boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS has_condition boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS condition_expression jsonb,
ADD COLUMN IF NOT EXISTS escalation_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS escalation_notification_type text,
ADD COLUMN IF NOT EXISTS escalation_module_id uuid REFERENCES public.app_modules(id),
ADD COLUMN IF NOT EXISTS escalation_template_id uuid REFERENCES public.notification_templates(id);

-- Update workflow_step_actions to include notification fields
ALTER TABLE public.workflow_step_actions
ADD COLUMN IF NOT EXISTS notification_type text,
ADD COLUMN IF NOT EXISTS notification_module_id uuid REFERENCES public.app_modules(id),
ADD COLUMN IF NOT EXISTS notification_template_id uuid REFERENCES public.notification_templates(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workflow_steps_approver_type ON public.workflow_steps(approver_type);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow ON public.workflow_steps(workflow_id);

-- Add Approved and Query statuses to workflow instances
-- First check if the enum type exists and update it
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workflow_instance_status') THEN
    CREATE TYPE workflow_instance_status AS ENUM ('Pending', 'InProgress', 'Completed', 'Rejected', 'Cancelled', 'Approved', 'Query');
  ELSE
    -- Add new values if they don't exist
    BEGIN
      ALTER TYPE workflow_instance_status ADD VALUE IF NOT EXISTS 'Approved';
    EXCEPTION WHEN others THEN NULL;
    END;
    BEGIN
      ALTER TYPE workflow_instance_status ADD VALUE IF NOT EXISTS 'Query';
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;
END $$;