/**
 * Epic 4 — Reference Data Consolidation types.
 */

export type SourceType =
  | 'CORE_REFERENCE' | 'LEGACY_TABLE' | 'MODULE_TABLE' | 'VIEW' | 'SERVICE' | 'STATIC_ENUM' | 'EXTERNAL_SYSTEM';

export type SyncStrategy =
  | 'DIRECT' | 'VIEW' | 'ADAPTER' | 'SYNC_TO_CORE' | 'SYNC_FROM_CORE' | 'MANUAL' | 'READ_ONLY';

export type LifecycleStatus = 'PLANNED' | 'ACTIVE' | 'DEPRECATED' | 'RETIRED' | 'ARCHIVED';

export type UsageType =
  | 'LOOKUP' | 'VALIDATION' | 'WORKFLOW' | 'REPORTING' | 'CALCULATION'
  | 'SECURITY' | 'NOTIFICATION' | 'DOCUMENT' | 'SEARCH_FILTER';

export type ImpactLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type DependencyType =
  | 'PARENT_CHILD' | 'FILTERED_BY' | 'VALIDATED_BY' | 'DERIVED_FROM' | 'REQUIRES' | 'EXCLUDES' | 'CASCADE';

export interface ReferenceSourceMap {
  id: string;
  reference_category_code: string | null;
  reference_group_code: string;
  source_type: SourceType;
  source_table_name: string | null;
  source_view_name: string | null;
  source_service_name: string | null;
  table_registry_id: string | null;
  legacy_table_map_id: string | null;
  legacy_table_name: string | null;
  modern_entity_name: string | null;
  admin_route: string | null;
  owner_module_code: string;
  owner_domain_code: string | null;
  is_primary_source: boolean;
  sync_strategy: SyncStrategy;
  lifecycle_status: LifecycleStatus;
  data_steward_role: string | null;
  data_steward_user_id: string | null;
  supports_effective_dates: boolean;
  supports_hierarchy: boolean;
  supports_localization: boolean;
  supports_external_codes: boolean;
  description: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ReferenceSourceMapForm = Partial<Omit<ReferenceSourceMap, 'id' | 'created_at' | 'updated_at'>> &
  Pick<ReferenceSourceMap, 'reference_group_code' | 'source_type'>;

export interface ReferenceConsumerMap {
  id: string;
  reference_group_code: string;
  consumer_module_code: string;
  consumer_domain_code: string | null;
  consumer_feature: string | null;
  consumer_route: string | null;
  consumer_service: string | null;
  usage_type: UsageType;
  is_required: boolean;
  can_cache: boolean;
  impact_level: ImpactLevel;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
export type ReferenceConsumerMapForm = Partial<Omit<ReferenceConsumerMap, 'id' | 'created_at' | 'updated_at'>> &
  Pick<ReferenceConsumerMap, 'reference_group_code' | 'consumer_module_code'>;

export interface ReferenceDependencyMap {
  id: string;
  source_reference_group_code: string;
  depends_on_reference_group_code: string;
  dependency_type: DependencyType;
  dependency_rule: string | null;
  is_required: boolean;
  impact_level: ImpactLevel;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
export type ReferenceDependencyMapForm = Partial<Omit<ReferenceDependencyMap, 'id' | 'created_at' | 'updated_at'>> &
  Pick<ReferenceDependencyMap, 'source_reference_group_code' | 'depends_on_reference_group_code' | 'dependency_type'>;

export interface ReferenceChangePolicy {
  id: string;
  reference_group_code: string;
  allow_create: boolean;
  allow_update: boolean;
  allow_delete: boolean;
  allow_retire: boolean;
  requires_approval: boolean;
  approval_permission: string | null;
  block_delete_if_consumed: boolean;
  block_retire_if_active_records: boolean;
  effective_date_required: boolean;
  reason_required: boolean;
  policy_notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
export type ReferenceChangePolicyForm = Partial<Omit<ReferenceChangePolicy, 'id' | 'created_at' | 'updated_at'>> &
  Pick<ReferenceChangePolicy, 'reference_group_code'>;

export const SOURCE_TYPES: SourceType[] = [
  'CORE_REFERENCE','LEGACY_TABLE','MODULE_TABLE','VIEW','SERVICE','STATIC_ENUM','EXTERNAL_SYSTEM',
];
export const SYNC_STRATEGIES: SyncStrategy[] = [
  'DIRECT','VIEW','ADAPTER','SYNC_TO_CORE','SYNC_FROM_CORE','MANUAL','READ_ONLY',
];
export const LIFECYCLE_STATUSES: LifecycleStatus[] = ['PLANNED','ACTIVE','DEPRECATED','RETIRED','ARCHIVED'];
export const USAGE_TYPES: UsageType[] = [
  'LOOKUP','VALIDATION','WORKFLOW','REPORTING','CALCULATION','SECURITY','NOTIFICATION','DOCUMENT','SEARCH_FILTER',
];
export const IMPACT_LEVELS: ImpactLevel[] = ['LOW','MEDIUM','HIGH','CRITICAL'];
export const DEPENDENCY_TYPES: DependencyType[] = [
  'PARENT_CHILD','FILTERED_BY','VALIDATED_BY','DERIVED_FROM','REQUIRES','EXCLUDES','CASCADE',
];

export interface HealthIssue {
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  code: string;
  message: string;
  reference_group_code?: string;
}
