/**
 * Epic OM-3 — Organisation Management safe-mutation + audit helpers.
 *
 * Every OM create/update/deactivate/reactivate/publish/unpublish/run/export
 * MUST route through these helpers so that:
 *   1. the action is logged to core_audit_log via coreAuditService,
 *   2. destructive intent is recorded even when the underlying write fails,
 *   3. hard deletes on masters/templates/configuration are avoided by
 *      preferring soft archive (is_active=false / status='ARCHIVED') where the
 *      target table supports it,
 *   4. Configuration-Center-level access checks stay consistent.
 *
 * The helpers are intentionally thin — they wrap coreAuditService and the
 * Supabase client without introducing a new audit table.
 */
import { supabase } from '@/integrations/supabase/client';
import { coreAuditService } from '@/platform/audit/auditService';

const db = supabase as any;

export type OrgActionKind =
  | 'CREATE'
  | 'UPDATE'
  | 'DEACTIVATE'
  | 'REACTIVATE'
  | 'PUBLISH'
  | 'UNPUBLISH'
  | 'DELETE_ATTEMPT'
  | 'DELETE'
  | 'RUN'
  | 'EXPORT'
  | 'TEST_RESOLVE';

const KIND_TO_ACTION: Record<OrgActionKind, string> = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DEACTIVATE: 'UPDATE',
  REACTIVATE: 'UPDATE',
  PUBLISH: 'UPDATE',
  UNPUBLISH: 'UPDATE',
  DELETE_ATTEMPT: 'DELETE',
  DELETE: 'DELETE',
  RUN: 'EXECUTE',
  EXPORT: 'EXPORT',
  TEST_RESOLVE: 'EXECUTE',
};

export interface LogOrgMutationInput {
  eventCode: string;
  kind: OrgActionKind;
  entityType: string;
  entityId?: string | null;
  entityDisplayName?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  outcome?: 'SUCCESS' | 'FAILURE' | 'DENIED' | 'PARTIAL' | 'ERROR';
  /** Set to true when the intent was blocked by governance rather than errored. Mapped to DENIED. */
  blocked?: boolean;
  reason?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
}

/** Fire-and-forget audit write for any OM mutation. Never throws. */
export function logOrgMutation(input: LogOrgMutationInput): Promise<void> {
  return coreAuditService.logAction({
    event_code: input.eventCode,
    event_category: 'CONFIGURATION',
    module_code: 'CORE',
    domain_code: 'ORGANIZATION',
    action: KIND_TO_ACTION[input.kind],
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    entity_display_name: input.entityDisplayName ?? null,
    before_value: input.before ?? undefined,
    after_value: input.after ?? undefined,
    outcome: input.outcome ?? 'SUCCESS',
    severity: input.kind === 'DELETE' || input.kind === 'DEACTIVATE' || input.kind === 'UNPUBLISH' ? 'WARNING' : 'INFO',
    risk_level: input.kind === 'DELETE' ? 'HIGH' : input.kind === 'PUBLISH' || input.kind === 'DEACTIVATE' ? 'MEDIUM' : 'LOW',
    reason: input.reason ?? null,
    notes: input.notes ?? null,
    metadata: input.metadata ?? null,
    source_component: 'OM-3',
  });
}

/**
 * Soft-archive a row by setting is_active=false. Wraps the update in an audit
 * event. Prefers is_active; if the table also has a status column supply
 * `statusColumn` + `statusValue` to align lifecycle state ('ARCHIVED', etc.).
 */
export async function softArchiveOrgEntity(args: {
  table: string;
  id: string;
  eventCode: string;
  entityType?: string;
  displayName?: string | null;
  before?: Record<string, unknown> | null;
  statusColumn?: string | null;
  statusValue?: string | null;
  reason?: string | null;
}): Promise<void> {
  const patch: Record<string, unknown> = { is_active: false };
  if (args.statusColumn && args.statusValue) patch[args.statusColumn] = args.statusValue;
  const { error } = await db.from(args.table).update(patch).eq('id', args.id);
  if (error) {
    await logOrgMutation({
      eventCode: args.eventCode,
      kind: 'DEACTIVATE',
      entityType: args.entityType ?? args.table,
      entityId: args.id,
      entityDisplayName: args.displayName ?? null,
      before: args.before ?? null,
      after: null,
      outcome: 'FAILURE',
      reason: args.reason ?? null,
      metadata: { error: error.message },
    });
    throw error;
  }
  await logOrgMutation({
    eventCode: args.eventCode,
    kind: 'DEACTIVATE',
    entityType: args.entityType ?? args.table,
    entityId: args.id,
    entityDisplayName: args.displayName ?? null,
    before: args.before ?? null,
    after: patch,
    outcome: 'SUCCESS',
    reason: args.reason ?? null,
  });
}

/**
 * Guarded hard delete. Runs the caller-supplied usage check first; if the row
 * is referenced, blocks the delete, audits the attempt as BLOCKED, and throws
 * a friendly error. Otherwise deletes and audits DELETE.
 */
export async function guardedDeleteOrgEntity(args: {
  table: string;
  id: string;
  eventCode: string;
  entityType?: string;
  displayName?: string | null;
  before?: Record<string, unknown> | null;
  /**
   * Returns null when delete is allowed, or a human-readable message when it
   * should be blocked (usually because the row is referenced elsewhere).
   */
  checkReferences?: () => Promise<string | null>;
  /**
   * When true, on block the caller wants to soft-archive instead of surfacing
   * an error. Requires `softArchiveTable`/`softArchiveEventCode` when set.
   */
  fallbackSoftArchive?: {
    table?: string;
    eventCode: string;
    statusColumn?: string;
    statusValue?: string;
  };
}): Promise<{ deleted: boolean; archived: boolean; blockedReason: string | null }> {
  const entityType = args.entityType ?? args.table;
  let blocked: string | null = null;
  if (args.checkReferences) {
    try {
      blocked = await args.checkReferences();
    } catch (e: any) {
      blocked = e?.message ?? 'Reference check failed';
    }
  }

  if (blocked) {
    await logOrgMutation({
      eventCode: args.eventCode,
      kind: 'DELETE_ATTEMPT',
      entityType,
      entityId: args.id,
      entityDisplayName: args.displayName ?? null,
      before: args.before ?? null,
      outcome: 'DENIED',
      reason: blocked,
    });
    if (args.fallbackSoftArchive) {
      await softArchiveOrgEntity({
        table: args.fallbackSoftArchive.table ?? args.table,
        id: args.id,
        eventCode: args.fallbackSoftArchive.eventCode,
        entityType,
        displayName: args.displayName ?? null,
        before: args.before ?? null,
        statusColumn: args.fallbackSoftArchive.statusColumn ?? null,
        statusValue: args.fallbackSoftArchive.statusValue ?? null,
        reason: blocked,
      });
      return { deleted: false, archived: true, blockedReason: blocked };
    }
    throw new Error(blocked);
  }

  const { error } = await db.from(args.table).delete().eq('id', args.id);
  if (error) {
    await logOrgMutation({
      eventCode: args.eventCode,
      kind: 'DELETE',
      entityType,
      entityId: args.id,
      entityDisplayName: args.displayName ?? null,
      before: args.before ?? null,
      outcome: 'FAILURE',
      metadata: { error: error.message },
    });
    throw error;
  }
  await logOrgMutation({
    eventCode: args.eventCode,
    kind: 'DELETE',
    entityType,
    entityId: args.id,
    entityDisplayName: args.displayName ?? null,
    before: args.before ?? null,
    outcome: 'SUCCESS',
  });
  return { deleted: true, archived: false, blockedReason: null };
}

/**
 * Canonical OM-3 event codes. Kept in sync with the seeded rows in
 * core_audit_event_type (see the OM-3 migration).
 */
export const OM3_EVENTS = {
  orgProfileUpdated: 'ORG_PROFILE_UPDATED',
  locationCreated: 'ORG_LOCATION_CREATED',
  locationUpdated: 'ORG_LOCATION_UPDATED',
  locationDeactivated: 'ORG_LOCATION_DEACTIVATED',
  locationReactivated: 'ORG_LOCATION_REACTIVATED',
  departmentProfileCreated: 'ORG_DEPARTMENT_PROFILE_CREATED',
  departmentProfileUpdated: 'ORG_DEPARTMENT_PROFILE_UPDATED',
  departmentProfileDeactivated: 'ORG_DEPARTMENT_PROFILE_DEACTIVATED',
  departmentProfileReactivated: 'ORG_DEPARTMENT_PROFILE_REACTIVATED',
  moduleProfileCreated: 'ORG_MODULE_PROFILE_CREATED',
  moduleProfileUpdated: 'ORG_MODULE_PROFILE_UPDATED',
  moduleProfileDeactivated: 'ORG_MODULE_PROFILE_DEACTIVATED',
  moduleProfileReactivated: 'ORG_MODULE_PROFILE_REACTIVATED',
  deptMappingCreated: 'ORG_DEPARTMENT_MAPPING_CREATED',
  deptMappingUpdated: 'ORG_DEPARTMENT_MAPPING_UPDATED',
  deptMappingDeactivated: 'ORG_DEPARTMENT_MAPPING_DEACTIVATED',
  deptMappingReactivated: 'ORG_DEPARTMENT_MAPPING_REACTIVATED',
  mediaAssetCreated: 'COMM_MEDIA_ASSET_CREATED',
  mediaAssetUpdated: 'COMM_MEDIA_ASSET_UPDATED',
  mediaAssetDeactivated: 'COMM_MEDIA_ASSET_DEACTIVATED',
  mediaAssetReactivated: 'COMM_MEDIA_ASSET_REACTIVATED',
  letterheadCreated: 'COMM_LETTERHEAD_CREATED',
  letterheadUpdated: 'COMM_LETTERHEAD_UPDATED',
  letterheadDeactivated: 'COMM_LETTERHEAD_DEACTIVATED',
  letterheadReactivated: 'COMM_LETTERHEAD_REACTIVATED',
  letterheadPublished: 'COMM_LETTERHEAD_PUBLISHED',
  letterheadUnpublished: 'COMM_LETTERHEAD_UNPUBLISHED',
  signatureCreated: 'COMM_SIGNATURE_CREATED',
  signatureUpdated: 'COMM_SIGNATURE_UPDATED',
  signatureDeactivated: 'COMM_SIGNATURE_DEACTIVATED',
  signatureReactivated: 'COMM_SIGNATURE_REACTIVATED',
  headerFooterCreated: 'COMM_HEADER_FOOTER_CREATED',
  headerFooterUpdated: 'COMM_HEADER_FOOTER_UPDATED',
  headerFooterDeactivated: 'COMM_HEADER_FOOTER_DEACTIVATED',
  headerFooterReactivated: 'COMM_HEADER_FOOTER_REACTIVATED',
  disclaimerCreated: 'COMM_DISCLAIMER_CREATED',
  disclaimerUpdated: 'COMM_DISCLAIMER_UPDATED',
  disclaimerDeactivated: 'COMM_DISCLAIMER_DEACTIVATED',
  disclaimerReactivated: 'COMM_DISCLAIMER_REACTIVATED',
  portalBrandingUpdated: 'COMM_PORTAL_BRANDING_UPDATED',
  documentAssetCreated: 'COMM_DOCUMENT_ASSET_CREATED',
  documentAssetUpdated: 'COMM_DOCUMENT_ASSET_UPDATED',
  documentAssetDeactivated: 'COMM_DOCUMENT_ASSET_DEACTIVATED',
  documentAssetReactivated: 'COMM_DOCUMENT_ASSET_REACTIVATED',
  assetCategoryCreated: 'COMM_ASSET_CATEGORY_CREATED',
  assetCategoryUpdated: 'COMM_ASSET_CATEGORY_UPDATED',
  assetCategoryDeactivated: 'COMM_ASSET_CATEGORY_DEACTIVATED',
  assetCategoryReactivated: 'COMM_ASSET_CATEGORY_REACTIVATED',
  templateCreated: 'COMM_TEMPLATE_CREATED',
  templateUpdated: 'COMM_TEMPLATE_UPDATED',
  templateDeactivated: 'COMM_TEMPLATE_DEACTIVATED',
  templateReactivated: 'COMM_TEMPLATE_REACTIVATED',
  templatePublished: 'COMM_TEMPLATE_PUBLISHED',
  templateUnpublished: 'COMM_TEMPLATE_UNPUBLISHED',
  notificationTemplateCreated: 'COMM_NOTIFICATION_TEMPLATE_CREATED',
  notificationTemplateUpdated: 'COMM_NOTIFICATION_TEMPLATE_UPDATED',
  notificationTemplateDeactivated: 'COMM_NOTIFICATION_TEMPLATE_DEACTIVATED',
  notificationTemplateReactivated: 'COMM_NOTIFICATION_TEMPLATE_REACTIVATED',
  textBlockCreated: 'COMM_TEXT_BLOCK_CREATED',
  textBlockUpdated: 'COMM_TEXT_BLOCK_UPDATED',
  textBlockDeactivated: 'COMM_TEXT_BLOCK_DEACTIVATED',
  textBlockReactivated: 'COMM_TEXT_BLOCK_REACTIVATED',
  tokenCreated: 'COMM_TOKEN_CREATED',
  tokenUpdated: 'COMM_TOKEN_UPDATED',
  tokenDeactivated: 'COMM_TOKEN_DEACTIVATED',
  tokenReactivated: 'COMM_TOKEN_REACTIVATED',
  channelCreated: 'COMM_CHANNEL_CREATED',
  channelUpdated: 'COMM_CHANNEL_UPDATED',
  channelDeactivated: 'COMM_CHANNEL_DEACTIVATED',
  channelReactivated: 'COMM_CHANNEL_REACTIVATED',
  languageCreated: 'COMM_LANGUAGE_CREATED',
  languageUpdated: 'COMM_LANGUAGE_UPDATED',
  languageDeactivated: 'COMM_LANGUAGE_DEACTIVATED',
  languageReactivated: 'COMM_LANGUAGE_REACTIVATED',
  configAssignmentCreated: 'COMM_CONFIGURATION_ASSIGNMENT_CREATED',
  configAssignmentUpdated: 'COMM_CONFIGURATION_ASSIGNMENT_UPDATED',
  configAssignmentDeactivated: 'COMM_CONFIGURATION_ASSIGNMENT_DEACTIVATED',
  configAssignmentReactivated: 'COMM_CONFIGURATION_ASSIGNMENT_REACTIVATED',
  configTestResolveRun: 'COMM_CONFIGURATION_TEST_RESOLVE_RUN',
  usageValidationRun: 'COMM_USAGE_VALIDATION_RUN',
  impactAnalysisRun: 'COMM_IMPACT_ANALYSIS_RUN',
  brokenReferenceScanRun: 'COMM_BROKEN_REFERENCE_SCAN_RUN',
  healthCheckRun: 'COMM_HEALTH_CHECK_RUN',
  exportCreated: 'COMM_EXPORT_CREATED',
  sweepVerified: 'ORG_MANAGEMENT_MUTATION_SWEEP_VERIFIED',
} as const;

export type Om3EventKey = keyof typeof OM3_EVENTS;
