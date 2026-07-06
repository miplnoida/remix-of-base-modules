export type AdminRouteStatus =
  | 'CANONICAL'
  | 'LEGACY'
  | 'REDIRECT'
  | 'RETIRED'
  | 'PLANNED';

export const ADMIN_ROUTE_STATUSES: AdminRouteStatus[] = [
  'CANONICAL',
  'LEGACY',
  'REDIRECT',
  'RETIRED',
  'PLANNED',
];

export interface AdminDomain {
  id: string;
  domain_code: string;
  domain_name: string;
  description: string | null;
  icon_name: string | null;
  display_order: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminRouteRegistryEntry {
  id: string;
  route_path: string;
  page_name: string;
  admin_domain: string;
  canonical_status: AdminRouteStatus;
  replacement_route: string | null;
  owner_module_code: string;
  owner_team: string | null;
  description: string | null;
  page_component: string | null;
  source_file_path: string | null;
  requires_permission: string | null;
  show_in_platform_admin: boolean;
  display_order: number | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminRouteFilters {
  search?: string;
  admin_domain?: string;
  canonical_status?: AdminRouteStatus;
  owner_module_code?: string;
  is_active?: boolean;
  show_in_platform_admin?: boolean;
  missing_permission?: boolean;
  missing_replacement?: boolean;
}

export interface AdminRouteFormValues {
  route_path: string;
  page_name: string;
  admin_domain: string;
  canonical_status: AdminRouteStatus;
  replacement_route?: string | null;
  owner_module_code: string;
  owner_team?: string | null;
  description?: string | null;
  page_component?: string | null;
  source_file_path?: string | null;
  requires_permission?: string | null;
  show_in_platform_admin: boolean;
  display_order?: number | null;
  notes?: string | null;
  is_active: boolean;
}

export function validateAdminRouteFormValues(v: AdminRouteFormValues): string[] {
  const errors: string[] = [];
  if (!v.route_path?.trim()) errors.push('Route path is required');
  else if (!v.route_path.startsWith('/')) errors.push('Route path must start with /');
  if (!v.page_name?.trim()) errors.push('Page name is required');
  if (!v.admin_domain?.trim()) errors.push('Admin domain is required');
  if (!v.canonical_status) errors.push('Canonical status is required');
  if (v.canonical_status === 'REDIRECT' && !v.replacement_route?.trim()) {
    errors.push('REDIRECT routes require a replacement route');
  }
  if (!v.owner_module_code?.trim()) errors.push('Owner module code is required');
  if (v.show_in_platform_admin && !v.is_active) {
    errors.push('Only active routes can be shown in Platform Admin');
  }
  return errors;
}
