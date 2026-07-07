export type LegacyUseStrategy =
  | 'DIRECT'
  | 'VIEW'
  | 'ADAPTER'
  | 'MIGRATE'
  | 'ARCHIVE'
  | 'IGNORE';

export type LegacyMappingStatus =
  | 'DISCOVERED'
  | 'MAPPED'
  | 'REVIEWED'
  | 'APPROVED'
  | 'DEPRECATED'
  | 'RETIRED';

export type LegacyRelationshipType =
  | 'ONE_TO_ONE'
  | 'ONE_TO_MANY'
  | 'MANY_TO_ONE'
  | 'MANY_TO_MANY'
  | 'LOOKUP'
  | 'REFERENCE'
  | 'PARENT_CHILD';

export type LegacyPiiClassification =
  | 'NONE'
  | 'PERSONAL'
  | 'SENSITIVE'
  | 'FINANCIAL'
  | 'HEALTH'
  | 'IDENTIFIER'
  | 'CONTACT';

export const LEGACY_USE_STRATEGIES: LegacyUseStrategy[] = [
  'DIRECT', 'VIEW', 'ADAPTER', 'MIGRATE', 'ARCHIVE', 'IGNORE',
];
export const LEGACY_MAPPING_STATUSES: LegacyMappingStatus[] = [
  'DISCOVERED', 'MAPPED', 'REVIEWED', 'APPROVED', 'DEPRECATED', 'RETIRED',
];
export const LEGACY_RELATIONSHIP_TYPES: LegacyRelationshipType[] = [
  'ONE_TO_ONE', 'ONE_TO_MANY', 'MANY_TO_ONE', 'MANY_TO_MANY', 'LOOKUP', 'REFERENCE', 'PARENT_CHILD',
];
export const LEGACY_PII_CLASSIFICATIONS: LegacyPiiClassification[] = [
  'NONE', 'PERSONAL', 'SENSITIVE', 'FINANCIAL', 'HEALTH', 'IDENTIFIER', 'CONTACT',
];

export interface LegacyTableMap {
  id: string;
  table_registry_id: string | null;
  legacy_schema_name: string;
  legacy_table_name: string;
  modern_table_name: string | null;
  modern_entity_name: string;
  modern_alias: string | null;
  module_code: string;
  domain_code: string;
  table_category: string;
  use_strategy: LegacyUseStrategy;
  mapping_status: LegacyMappingStatus;
  canonical_view_name: string | null;
  canonical_service_name: string | null;
  canonical_admin_route: string | null;
  is_master_table: boolean;
  is_transaction_table: boolean;
  is_reference_table: boolean;
  is_security_table: boolean;
  is_read_only: boolean;
  contains_pii: boolean;
  contains_financial_data: boolean;
  contains_health_data: boolean;
  legacy_primary_key: string | null;
  modern_primary_key: string | null;
  source_system: string | null;
  description: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LegacyColumnMap {
  id: string;
  table_map_id: string;
  legacy_column_name: string;
  modern_field_name: string;
  legacy_data_type: string | null;
  modern_data_type: string | null;
  legacy_nullable: boolean | null;
  modern_required: boolean;
  is_primary_key: boolean;
  is_foreign_key: boolean;
  referenced_legacy_table: string | null;
  referenced_legacy_column: string | null;
  is_pii: boolean;
  pii_classification: LegacyPiiClassification | null;
  contains_financial_data: boolean;
  contains_health_data: boolean;
  transformation_rule: string | null;
  validation_rule: string | null;
  default_value: string | null;
  display_label: string | null;
  help_text: string | null;
  mapping_status: LegacyMappingStatus;
  sort_order: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LegacyValueMap {
  id: string;
  table_map_id: string;
  column_map_id: string | null;
  legacy_code: string;
  legacy_label: string | null;
  legacy_description: string | null;
  modern_code: string;
  modern_label: string;
  modern_description: string | null;
  reference_group_code: string | null;
  reference_value_id: string | null;
  mapping_status: LegacyMappingStatus;
  is_default: boolean;
  is_active: boolean;
  effective_from: string | null;
  effective_to: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LegacyRelationshipMap {
  id: string;
  source_table_map_id: string;
  target_table_map_id: string | null;
  relationship_name: string;
  source_legacy_column: string;
  target_legacy_table: string;
  target_legacy_column: string;
  modern_relationship_name: string | null;
  relationship_type: LegacyRelationshipType;
  is_enforced_in_legacy: boolean;
  is_required: boolean;
  mapping_status: LegacyMappingStatus;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LegacyMappingFilters {
  search?: string;
  domain_code?: string;
  module_code?: string;
  table_category?: string;
  use_strategy?: LegacyUseStrategy;
  mapping_status?: LegacyMappingStatus;
  is_master_table?: boolean;
  is_transaction_table?: boolean;
  is_reference_table?: boolean;
  is_security_table?: boolean;
  contains_pii?: boolean;
  is_read_only?: boolean;
  is_active?: boolean;
  missing_canonical_service?: boolean;
  missing_modern_table?: boolean;
}

export interface LegacyTableMapFormValues {
  table_registry_id?: string | null;
  legacy_schema_name: string;
  legacy_table_name: string;
  modern_table_name?: string | null;
  modern_entity_name: string;
  modern_alias?: string | null;
  module_code: string;
  domain_code: string;
  table_category: string;
  use_strategy: LegacyUseStrategy;
  mapping_status: LegacyMappingStatus;
  canonical_view_name?: string | null;
  canonical_service_name?: string | null;
  canonical_admin_route?: string | null;
  is_master_table: boolean;
  is_transaction_table: boolean;
  is_reference_table: boolean;
  is_security_table: boolean;
  is_read_only: boolean;
  contains_pii: boolean;
  contains_financial_data: boolean;
  contains_health_data: boolean;
  legacy_primary_key?: string | null;
  modern_primary_key?: string | null;
  source_system?: string | null;
  description?: string | null;
  notes?: string | null;
  is_active: boolean;
}

export interface LegacyColumnMapFormValues {
  table_map_id: string;
  legacy_column_name: string;
  modern_field_name: string;
  legacy_data_type?: string | null;
  modern_data_type?: string | null;
  legacy_nullable?: boolean | null;
  modern_required: boolean;
  is_primary_key: boolean;
  is_foreign_key: boolean;
  referenced_legacy_table?: string | null;
  referenced_legacy_column?: string | null;
  is_pii: boolean;
  pii_classification?: LegacyPiiClassification | null;
  contains_financial_data: boolean;
  contains_health_data: boolean;
  transformation_rule?: string | null;
  validation_rule?: string | null;
  default_value?: string | null;
  display_label?: string | null;
  help_text?: string | null;
  mapping_status: LegacyMappingStatus;
  sort_order?: number | null;
  notes?: string | null;
  is_active: boolean;
}

export interface LegacyValueMapFormValues {
  table_map_id: string;
  column_map_id?: string | null;
  legacy_code: string;
  legacy_label?: string | null;
  legacy_description?: string | null;
  modern_code: string;
  modern_label: string;
  modern_description?: string | null;
  reference_group_code?: string | null;
  mapping_status: LegacyMappingStatus;
  is_default: boolean;
  is_active: boolean;
  effective_from?: string | null;
  effective_to?: string | null;
  notes?: string | null;
}

export interface LegacyRelationshipMapFormValues {
  source_table_map_id: string;
  target_table_map_id?: string | null;
  relationship_name: string;
  source_legacy_column: string;
  target_legacy_table: string;
  target_legacy_column: string;
  modern_relationship_name?: string | null;
  relationship_type: LegacyRelationshipType;
  is_enforced_in_legacy: boolean;
  is_required: boolean;
  mapping_status: LegacyMappingStatus;
  notes?: string | null;
  is_active: boolean;
}

export function validateLegacyTableMap(v: LegacyTableMapFormValues): string[] {
  const errs: string[] = [];
  if (!v.legacy_table_name?.trim()) errs.push('Legacy table name is required');
  if (!v.modern_entity_name?.trim()) errs.push('Modern entity name is required');
  if (!v.domain_code?.trim()) errs.push('Domain code is required');
  if (!v.table_category?.trim()) errs.push('Table category is required');
  if (!v.use_strategy) errs.push('Use strategy is required');
  return errs;
}
export function validateLegacyColumnMap(v: LegacyColumnMapFormValues): string[] {
  const errs: string[] = [];
  if (!v.legacy_column_name?.trim()) errs.push('Legacy column name is required');
  if (!v.modern_field_name?.trim()) errs.push('Modern field name is required');
  if (v.is_pii && !v.pii_classification) errs.push('PII columns need a PII classification');
  return errs;
}
export function validateLegacyValueMap(v: LegacyValueMapFormValues): string[] {
  const errs: string[] = [];
  if (!v.legacy_code?.trim()) errs.push('Legacy code is required');
  if (!v.modern_code?.trim()) errs.push('Modern code is required');
  if (!v.modern_label?.trim()) errs.push('Modern label is required');
  return errs;
}
export function validateLegacyRelationshipMap(v: LegacyRelationshipMapFormValues): string[] {
  const errs: string[] = [];
  if (!v.relationship_name?.trim()) errs.push('Relationship name is required');
  if (!v.source_legacy_column?.trim()) errs.push('Source legacy column is required');
  if (!v.target_legacy_table?.trim()) errs.push('Target legacy table is required');
  if (!v.target_legacy_column?.trim()) errs.push('Target legacy column is required');
  if (!v.relationship_type) errs.push('Relationship type is required');
  return errs;
}

/** UI warnings (non-blocking) */
export function legacyTableMapWarnings(v: LegacyTableMap | LegacyTableMapFormValues, columnCount = 0, piiColumnCount = 0): string[] {
  const w: string[] = [];
  if (v.use_strategy === 'VIEW' && !v.canonical_view_name?.trim()) w.push('VIEW strategy usually requires a canonical view name');
  if (v.use_strategy === 'ADAPTER' && !v.canonical_service_name?.trim()) w.push('ADAPTER strategy usually requires a canonical service name');
  if (v.is_master_table && !['MASTER','REFERENCE'].includes(v.table_category)) w.push('Master tables should use MASTER or REFERENCE category');
  if (v.is_transaction_table && v.table_category !== 'TRANSACTION') w.push('Transaction tables should use TRANSACTION category');
  if ('legacy_primary_key' in v && !v.legacy_primary_key) w.push('No legacy primary key recorded');
  if (columnCount === 0) w.push('No columns mapped yet');
  if (v.contains_pii && columnCount > 0 && piiColumnCount === 0) w.push('Table marked PII but no PII columns mapped');
  return w;
}

export function suggestCompatibility(legacyName: string): {
  view: string; service: string; entity: string; route: string; explanation: string;
} {
  const base = legacyName.replace(/^tb_/, '').replace(/^core_/, '');
  const entity = base
    .split('_')
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
  const service = `core${entity}Service`;
  const view = `core_v_${base}`;
  const route = `/admin/${base.replace(/_/g, '-')}`;
  return {
    view,
    service,
    entity,
    route,
    explanation:
      'DIRECT reads the legacy table as-is. VIEW exposes a compatibility view. ADAPTER wraps CRUD in a service so callers work with modern names. MIGRATE copies into a new table. ARCHIVE keeps searchable/read-only. IGNORE excludes from the modern app.',
  };
}
