ALTER TABLE public.workflow_steps DROP CONSTRAINT workflow_steps_approver_type_check;

ALTER TABLE public.workflow_steps ADD CONSTRAINT workflow_steps_approver_type_check CHECK (approver_type = ANY (ARRAY['role'::text, 'designation'::text, 'specific_users'::text, 'department_head'::text, 'designation_hierarchy'::text, 'reporting_manager'::text]));