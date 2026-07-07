export type PermissionScope =
  | 'MODULE'
  | 'PAGE'
  | 'ACTION'
  | 'FIELD'
  | 'DATA'
  | 'WORKFLOW'
  | 'REPORT'
  | 'EXPORT'
  | 'SECURITY'
  | 'ADMIN';

export type PermissionRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type PermissionLifecycleStatus =
  | 'PLANNED'
  | 'ACTIVE'
  | 'DEPRECATED'
  | 'RETIRED';

export const PERMISSION_SCOPES: PermissionScope[] = [
  'MODULE', 'PAGE', 'ACTION', 'FIELD', 'DATA', 'WORKFLOW', 'REPORT', 'EXPORT', 'SECURITY', 'ADMIN',
];
export const PERMISSION_RISK_LEVELS: PermissionRiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
export const PERMISSION_LIFECYCLE_STATUSES: PermissionLifecycleStatus[] = [
  'PLANNED', 'ACTIVE', 'DEPRECATED', 'RETIRED',
];

export interface PermissionRegistryEntry {
  id: string;
  permission_key: string;
  permission_name: string;
  description: string | null;
  module_code: string;
  domain_code: string | null;
  permission_scope: PermissionScope;
  resource_type: string | null;
  resource_code: string | null;
  action_code: string;
  is_platform_permission: boolean;
  is_sensitive_permission: boolean;
  is_admin_permission: boolean;
  risk_level: PermissionRiskLevel;
  lifecycle_status: PermissionLifecycleStatus;
  seeded_from_registry: boolean;
  source_file: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PermissionRegistryFilters {
  search?: string;
  module_code?: string;
  domain_code?: string;
  permission_scope?: PermissionScope;
  risk_level?: PermissionRiskLevel;
  lifecycle_status?: PermissionLifecycleStatus;
  is_platform_permission?: boolean;
  is_admin_permission?: boolean;
  is_sensitive_permission?: boolean;
  is_active?: boolean;
}

export interface PermissionRegistryFormValues {
  permission_key: string;
  permission_name: string;
  description?: string | null;
  module_code: string;
  domain_code?: string | null;
  permission_scope: PermissionScope;
  resource_type?: string | null;
  resource_code?: string | null;
  action_code: string;
  is_platform_permission: boolean;
  is_sensitive_permission: boolean;
  is_admin_permission: boolean;
  risk_level: PermissionRiskLevel;
  lifecycle_status: PermissionLifecycleStatus;
  source_file?: string | null;
  is_active: boolean;
}

export interface PermissionSourceDefinition {
  permission_key: string;
  permission_name: string;
  description?: string;
  module_code: string;
  domain_code?: string;
  permission_scope: PermissionScope;
  action_code: string;
  is_platform_permission?: boolean;
  is_admin_permission?: boolean;
  is_sensitive_permission?: boolean;
  risk_level?: PermissionRiskLevel;
  lifecycle_status?: PermissionLifecycleStatus;
  source_file?: string;
}

export interface PermissionSyncResult {
  sync_id?: string;
  started_at: string;
  completed_at?: string;
  status: 'STARTED' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
  permissions_found: number;
  permissions_created: number;
  permissions_updated: number;
  permissions_missing_in_db: number;
  permissions_missing_in_registry: number;
  missing_in_db: string[];
  missing_in_registry: string[];
  errors?: string[];
}

export interface PermissionComparison {
  in_both: string[];
  missing_in_db: PermissionSourceDefinition[];
  missing_in_registry: PermissionRegistryEntry[];
  deprecated_still_assigned: string[];
}

export function validatePermissionKey(key: string): string[] {
  const errors: string[] = [];
  if (!key || !key.trim()) {
    errors.push('Permission key is required');
    return errors;
  }
  if (key !== key.toLowerCase()) {
    errors.push('Permission key must be lowercase');
  }
  if (!/^[a-z0-9_]+(\.[a-z0-9_]+)+$/.test(key)) {
    errors.push('Permission key must use lowercase dot notation (e.g. core.admin.users.view)');
  }
  return errors;
}
