-- Add FinanceManager role to app_role enum (for Finance Manager approvals)
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'FinanceManager';

-- Now create the sample_applications table
CREATE TABLE IF NOT EXISTS public.sample_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  applicant_comments TEXT,
  status TEXT NOT NULL DEFAULT 'Draft',
  applicant_id UUID REFERENCES auth.users(id),
  applicant_name TEXT,
  applicant_email TEXT,
  rejection_reason TEXT,
  workflow_instance_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Add RLS
ALTER TABLE public.sample_applications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own applications"
  ON public.sample_applications
  FOR SELECT
  USING (auth.uid() = applicant_id OR public.has_permission(auth.uid(), 'sample_application', 'view'));

CREATE POLICY "Users can create their own applications"
  ON public.sample_applications
  FOR INSERT
  WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Applicants can update draft applications or resubmit"
  ON public.sample_applications
  FOR UPDATE
  USING (
    auth.uid() = applicant_id AND (status = 'Draft' OR status = 'More Info Requested')
    OR public.has_permission(auth.uid(), 'sample_application', 'edit')
  );

CREATE POLICY "Admins can delete applications"
  ON public.sample_applications
  FOR DELETE
  USING (public.has_permission(auth.uid(), 'sample_application', 'delete'));

-- Create trigger for updated_at
CREATE TRIGGER update_sample_applications_updated_at
  BEFORE UPDATE ON public.sample_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create the Sample Application module
INSERT INTO public.app_modules (name, display_name, description, icon, route, is_enabled, sort_order)
VALUES ('sample_application', 'Sample Application', 'Sample application for workflow demonstration', 'FileText', '/sample-applications', true, 100)
ON CONFLICT (name) DO NOTHING;

-- Create module actions with display_name
INSERT INTO public.module_actions (module_id, action_name, display_name, description, is_enabled)
SELECT m.id, 'view', 'View', 'View sample applications', true
FROM app_modules m WHERE m.name = 'sample_application'
ON CONFLICT (module_id, action_name) DO NOTHING;

INSERT INTO public.module_actions (module_id, action_name, display_name, description, is_enabled)
SELECT m.id, 'create', 'Create', 'Create sample applications', true
FROM app_modules m WHERE m.name = 'sample_application'
ON CONFLICT (module_id, action_name) DO NOTHING;

INSERT INTO public.module_actions (module_id, action_name, display_name, description, is_enabled)
SELECT m.id, 'edit', 'Edit', 'Edit sample applications', true
FROM app_modules m WHERE m.name = 'sample_application'
ON CONFLICT (module_id, action_name) DO NOTHING;

INSERT INTO public.module_actions (module_id, action_name, display_name, description, is_enabled)
SELECT m.id, 'delete', 'Delete', 'Delete sample applications', true
FROM app_modules m WHERE m.name = 'sample_application'
ON CONFLICT (module_id, action_name) DO NOTHING;

INSERT INTO public.module_actions (module_id, action_name, display_name, description, is_enabled)
SELECT m.id, 'submit', 'Submit for Approval', 'Submit applications for approval', true
FROM app_modules m WHERE m.name = 'sample_application'
ON CONFLICT (module_id, action_name) DO NOTHING;

-- Grant view/create/edit/submit permissions to Clerk role (general user-level access)
INSERT INTO public.role_permissions (role, module_id, action_id, is_granted)
SELECT 'Clerk'::app_role, m.id, ma.id, true
FROM app_modules m
JOIN module_actions ma ON ma.module_id = m.id
WHERE m.name = 'sample_application' AND ma.action_name IN ('view', 'create', 'edit', 'submit')
ON CONFLICT (role, module_id, action_id) DO NOTHING;

-- Grant permissions to FinanceOfficer role (Finance Manager role)
INSERT INTO public.role_permissions (role, module_id, action_id, is_granted)
SELECT 'FinanceOfficer'::app_role, m.id, ma.id, true
FROM app_modules m
JOIN module_actions ma ON ma.module_id = m.id
WHERE m.name = 'sample_application' AND ma.action_name IN ('view', 'edit')
ON CONFLICT (role, module_id, action_id) DO NOTHING;