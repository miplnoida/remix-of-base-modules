
INSERT INTO public.roles (role_name, description, is_system_role, is_active, mfa_required)
VALUES (
  'ComplianceAdmin',
  'Compliance & Enforcement module administrator — full access to all Compliance modules and Compliance Setup. NOT a global Admin.',
  false, true, false
)
ON CONFLICT (role_name) DO NOTHING;

INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT r.id, m.id, a.id, true
FROM public.roles r
JOIN public.app_modules m
  ON (m.name LIKE 'ce\_%' ESCAPE '\' OR m.name LIKE 'compliance%')
JOIN public.module_actions a ON a.module_id = m.id
WHERE r.role_name = 'ComplianceAdmin'
ON CONFLICT (role_id, module_id, action_id) DO NOTHING;

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower('mipl.student+compliance.admin@gmail.com')
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    DELETE FROM public.user_roles
    WHERE user_id = v_user_id AND role = 'Admin';

    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'ComplianceAdmin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;
