/**
 * Approval Routing — Phase 9.
 *
 * Maps governance class to an approval role and submits via the existing
 * `bn_version_approval` table. No new approval engine.
 */
import { supabase } from '@/integrations/supabase/client';
import { getClass, type GovernanceClass } from './configRegistryService';
import { writeBnAudit } from '@/services/bn/audit/bnAuditService';

const db = supabase as any;

const ROLE_BY_CLASS: Record<GovernanceClass, string | null> = {
  SYSTEM: null,
  CONFIGURATION: 'BN_CONFIG_MANAGER',
  REGULATORY: 'BN_LEGAL_APPROVER',
  FINANCIAL: 'BN_FINANCE_APPROVER',
};

export async function routeFor(entityType: string): Promise<string | null> {
  const cls = await getClass(entityType);
  return cls ? ROLE_BY_CLASS[cls] : null;
}

export interface SubmitForApprovalInput {
  entityType: string;
  entityId: string;
  versionId?: string | null;
  performedBy: string;
  fromStatus?: string;
  toStatus?: string;
  reason?: string;
  payload?: Record<string, any>;
}

export async function submitForApproval(input: SubmitForApprovalInput): Promise<{ approvalRole: string | null; approvalRowId: string | null }> {
  const approvalRole = await routeFor(input.entityType);

  // SYSTEM class: no approval, just audit.
  if (!approvalRole) {
    await writeBnAudit({
      module: 'BN_CONFIG',
      action: 'SUBMIT',
      entityType: input.entityType,
      entityId: input.entityId,
      performedBy: input.performedBy,
      notes: input.reason ?? null,
      payload: { ...input.payload, governance_class: 'SYSTEM', auto_approved: true },
    });
    return { approvalRole: null, approvalRowId: null };
  }

  const row = {
    entity_type: input.entityType,
    entity_id: input.entityId,
    product_version_id: input.versionId ?? null,
    action: 'SUBMIT',
    from_status: input.fromStatus ?? 'DRAFT',
    to_status: input.toStatus ?? 'IN_REVIEW',
    performed_by: input.performedBy,
    performed_at: new Date().toISOString(),
    approval_role: approvalRole,
    reason: input.reason ?? null,
    payload: input.payload ?? null,
  } as any;

  const { data, error } = await db.from('bn_version_approval').insert(row).select('id').maybeSingle();
  if (error) {
    // Tolerate column-name drift across deployments — fall back to bare insert.
    const fallback = await db.from('bn_version_approval').insert({
      action: 'SUBMIT',
      performed_by: input.performedBy,
      performed_at: new Date().toISOString(),
    }).select('id').maybeSingle();
    if (fallback.error) throw error;
    await writeBnAudit({
      module: 'BN_CONFIG',
      action: 'SUBMIT',
      entityType: input.entityType,
      entityId: input.entityId,
      performedBy: input.performedBy,
      payload: { approvalRole, fallback: true, original_error: error.message },
    });
    return { approvalRole, approvalRowId: fallback.data?.id ?? null };
  }

  await writeBnAudit({
    module: 'BN_CONFIG',
    action: 'SUBMIT',
    entityType: input.entityType,
    entityId: input.entityId,
    performedBy: input.performedBy,
    notes: input.reason ?? null,
    payload: { approvalRole, approval_row_id: data?.id },
  });

  return { approvalRole, approvalRowId: data?.id ?? null };
}
