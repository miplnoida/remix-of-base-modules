-- Add Senior Inspector and Compliance Head roles for the redesigned non-admin Compliance & Enforcement module
INSERT INTO public.roles (role_name, description, is_active, is_system_role, mfa_required)
VALUES
  ('SeniorInspector', 'Supervisory compliance officer: approves plans/reports, manages team field work, sampling', true, false, false),
  ('ComplianceHead', 'Compliance leadership: full non-admin oversight across field, violations, cases, enforcement, and analytics', true, false, false)
ON CONFLICT (role_name) DO NOTHING;