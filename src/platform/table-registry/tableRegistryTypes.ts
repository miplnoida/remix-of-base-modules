export type TableOwnershipType =
  | 'PLATFORM'
  | 'MODULE'
  | 'LEGACY'
  | 'MIGRATION'
  | 'REPORTING'
  | 'ARCHIVE';

export type TableCategory =
  | 'MASTER'
  | 'REFERENCE'
  | 'TRANSACTION'
  | 'CONFIGURATION'
  | 'SECURITY'
  | 'AUDIT'
  | 'WORKFLOW'
  | 'DOCUMENT'
  | 'NOTIFICATION'
  | 'MIGRATION'
  | 'REPORTING'
  | 'LOOKUP'
  | 'JUNCTION'
  | 'ARCHIVE'
  | 'OTHER';

export type TableLifecycleStatus =
  | 'PLANNED'
  | 'ACTIVE'
  | 'DEPRECATED'
  | 'RETIRED'
  | 'ARCHIVED';

export type DataClassification =
  | 'PUBLIC'
  | 'INTERNAL'
  | 'CONFIDENTIAL'
  | 'RESTRICTED'
  | 'SENSITIVE';

export const TABLE_OWNERSHIP_TYPES: TableOwnershipType[] = [
  'PLATFORM',
  'MODULE',
  'LEGACY',
  'MIGRATION',
  'REPORTING',
  'ARCHIVE',
];

export const TABLE_CATEGORIES: TableCategory[] = [
  'MASTER',
  'REFERENCE',
  'TRANSACTION',
  'CONFIGURATION',
  'SECURITY',
  'AUDIT',
  'WORKFLOW',
  'DOCUMENT',
  'NOTIFICATION',
  'MIGRATION',
  'REPORTING',
  'LOOKUP',
  'JUNCTION',
  'ARCHIVE',
  'OTHER',
];

export const TABLE_LIFECYCLE_STATUSES: TableLifecycleStatus[] = [
  'PLANNED',
  'ACTIVE',
  'DEPRECATED',
  'RETIRED',
  'ARCHIVED',
];

export const DATA_CLASSIFICATIONS: DataClassification[] = [
  'PUBLIC',
  'INTERNAL',
  'CONFIDENTIAL',
  'RESTRICTED',
  'SENSITIVE',
];

export interface TableRegistryEntry {
  id: string;
  table_name: string;
  table_prefix: string | null;
  modern_alias: string | null;
  domain_code: string;
  module_code: string | null;
  table_category: TableCategory;
  ownership_type: TableOwnershipType;
  is_legacy_table: boolean;
  legacy_schema_name: string | null;
  legacy_table_name: string | null;
  canonical_service: string | null;
  canonical_admin_route: string | null;
  data_classification: DataClassification;
  contains_pii: boolean;
  contains_financial_data: boolean;
  contains_health_data: boolean;
  lifecycle_status: TableLifecycleStatus;
  description: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TableRegistryFilters {
  search?: string;
  table_prefix?: string;
  domain_code?: string;
  module_code?: string;
  ownership_type?: TableOwnershipType;
  table_category?: TableCategory;
  lifecycle_status?: TableLifecycleStatus;
  legacy_only?: boolean;
  contains_pii?: boolean;
  contains_financial_data?: boolean;
  contains_health_data?: boolean;
  is_active?: boolean;
  missing_modern_alias?: boolean;
}

export interface TableRegistryFormValues {
  table_name: string;
  table_prefix?: string | null;
  modern_alias?: string | null;
  domain_code: string;
  module_code?: string | null;
  table_category: TableCategory;
  ownership_type: TableOwnershipType;
  is_legacy_table: boolean;
  legacy_schema_name?: string | null;
  legacy_table_name?: string | null;
  canonical_service?: string | null;
  canonical_admin_route?: string | null;
  data_classification: DataClassification;
  contains_pii: boolean;
  contains_financial_data: boolean;
  contains_health_data: boolean;
  lifecycle_status: TableLifecycleStatus;
  description?: string | null;
  notes?: string | null;
  is_active: boolean;
}

const PREFIX_MODULE_MAP: Record<string, string> = {
  bn_: 'BN',
  er_: 'ER',
  ip_: 'IP',
  c3_: 'C3',
  ce_: 'CE',
  fin_: 'FIN',
  lg_: 'LG',
};

export function validateTableNaming(v: TableRegistryFormValues): string[] {
  const errors: string[] = [];
  const name = (v.table_name ?? '').trim().toLowerCase();
  if (!name) errors.push('Table name is required');
  if (!v.domain_code?.trim()) errors.push('Domain code is required');
  if (!v.table_category) errors.push('Table category is required');
  if (!v.ownership_type) errors.push('Ownership type is required');

  if (name.startsWith('core_') && v.ownership_type !== 'PLATFORM') {
    errors.push('core_ tables must have ownership type PLATFORM');
  }
  for (const [prefix, mod] of Object.entries(PREFIX_MODULE_MAP)) {
    if (name.startsWith(prefix) && (v.module_code ?? '') !== mod) {
      errors.push(`${prefix} tables must have module_code = ${mod}`);
    }
  }
  if (name.startsWith('rpt_') && v.module_code !== 'RPT' && v.ownership_type !== 'REPORTING') {
    errors.push('rpt_ tables must have module_code = RPT or ownership_type = REPORTING');
  }
  if (name.startsWith('mig_') && v.module_code !== 'MIG' && v.ownership_type !== 'MIGRATION') {
    errors.push('mig_ tables must have module_code = MIG or ownership_type = MIGRATION');
  }

  if (v.is_legacy_table) {
    if (!v.modern_alias?.trim()) errors.push('Legacy tables require a modern alias');
    if (!v.legacy_table_name?.trim()) errors.push('Legacy tables require legacy_table_name');
  }
  if (v.ownership_type === 'MODULE' && !v.module_code?.trim()) {
    errors.push('Module-owned tables require module_code');
  }
  if (v.contains_pii && !['CONFIDENTIAL', 'RESTRICTED', 'SENSITIVE'].includes(v.data_classification)) {
    errors.push('Tables containing PII must be CONFIDENTIAL, RESTRICTED or SENSITIVE');
  }
  if (v.contains_health_data && !['RESTRICTED', 'SENSITIVE'].includes(v.data_classification)) {
    errors.push('Tables containing health data must be RESTRICTED or SENSITIVE');
  }
  return errors;
}
