INSERT INTO public.core_admin_route_registry (
  route_path, page_name, admin_domain, canonical_status, owner_module_code,
  requires_permission, show_in_platform_admin, is_active, description, page_component, source_file_path
) VALUES (
  '/admin/users/:userId/manage',
  'User Management Detail',
  'PEOPLE_ACCESS',
  'CANONICAL',
  'CORE',
  'core.admin.users.view',
  false,
  true,
  'Enterprise identity detail page — basic profile, work assignment, roles & access, security state.',
  'UserProfileManageAdmin',
  'src/pages/admin/UserProfileManageAdmin.tsx'
)
ON CONFLICT (route_path) DO UPDATE SET
  page_name = EXCLUDED.page_name,
  admin_domain = EXCLUDED.admin_domain,
  canonical_status = EXCLUDED.canonical_status,
  owner_module_code = EXCLUDED.owner_module_code,
  requires_permission = EXCLUDED.requires_permission,
  show_in_platform_admin = EXCLUDED.show_in_platform_admin,
  is_active = EXCLUDED.is_active,
  description = EXCLUDED.description,
  page_component = EXCLUDED.page_component,
  source_file_path = EXCLUDED.source_file_path,
  updated_at = now();