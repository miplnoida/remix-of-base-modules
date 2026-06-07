/**
 * Legacy → unified policy migration helper.
 *
 * Reads rows from the legacy `bn_override_policy` table and upserts
 * matching defaults into `bn_approval_policy`. Idempotent — never
 * overwrites an existing `bn_approval_policy` row unless `force=true`.
 *
 * Mapping (legacy → unified):
 *   target               → policy_area
 *   allowed_role         → approval_role
 *   maker_checker        → requires_supervisor_approval
 *   max_amount           → max_override_amount
 *   is_active            → is_enabled
 *   field_path / rule    → allowed_rule_codes (appended)
 */
import { supabase } from '@/integrations/supabase/client';
import type { PolicyArea } from './types';

const db = supabase as any;

const AREA_MAP: Record<string, PolicyArea> = {
  ELIGIBILITY: 'ELIGIBILITY',
  CALCULATION: 'CALCULATION',
  DOCUMENTS: 'DOCUMENTS',
  DOCUMENT: 'DOCUMENTS',
  AMENDMENT: 'AMENDMENTS',
  AMENDMENTS: 'AMENDMENTS',
  PARTICIPANT: 'PARTICIPANTS',
  PARTICIPANTS: 'PARTICIPANTS',
  WORKFLOW: 'WORKFLOW',
  AWARD: 'AWARD',
  PAYMENT: 'PAYMENT',
  COMMUNICATION: 'COMMUNICATION',
};

export interface MigrationStats {
  productVersionId: string | null;
  legacyRows: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export interface MigrationOptions {
  productVersionId?: string;
  actor: string;
  force?: boolean;
}

export async function migrateLegacyOverridePoliciesToApprovalPolicies(
  opts: MigrationOptions,
): Promise<MigrationStats> {
  const stats: MigrationStats = {
    productVersionId: opts.productVersionId ?? null,
    legacyRows: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  let q = db.from('bn_override_policy').select('*');
  if (opts.productVersionId) q = q.eq('product_version_id', opts.productVersionId);
  const { data: legacy, error } = await q;
  if (error) {
    stats.errors.push(`Legacy fetch failed: ${error.message}`);
    return stats;
  }
  stats.legacyRows = legacy?.length ?? 0;
  if (!legacy?.length) return stats;

  for (const row of legacy as any[]) {
    try {
      const versionId = row.product_version_id;
      if (!versionId) {
        stats.skipped++;
        continue;
      }
      const area = AREA_MAP[String(row.target ?? '').toUpperCase()];
      if (!area) {
        stats.skipped++;
        continue;
      }

      const { data: existing } = await db
        .from('bn_approval_policy')
        .select('*')
        .eq('product_version_id', versionId)
        .eq('policy_area', area)
        .eq('action_code', 'DEFAULT')
        .maybeSingle();

      const extractedRule = row.rule_code || row.field_path || null;
      const mergedRuleCodes = Array.from(
        new Set([
          ...((existing?.allowed_rule_codes as string[]) ?? []),
          ...(extractedRule ? [extractedRule] : []),
        ]),
      );

      const payload: any = {
        product_version_id: versionId,
        policy_area: area,
        action_code: 'DEFAULT',
        is_enabled: existing ? existing.is_enabled || !!row.is_active : !!row.is_active,
        requires_supervisor_approval:
          existing?.requires_supervisor_approval ?? !!row.maker_checker,
        requires_justification:
          existing?.requires_justification ?? !!row.requires_justification,
        approval_role:
          existing?.approval_role ??
          (row.allowed_role ? String(row.allowed_role).toUpperCase() : null),
        max_override_amount:
          existing?.max_override_amount ?? row.max_amount ?? null,
        allowed_rule_codes: mergedRuleCodes,
        self_approval_allowed: existing?.self_approval_allowed ?? false,
        updated_by: opts.actor,
      };

      if (existing) {
        if (!opts.force) {
          stats.skipped++;
          continue;
        }
        const { error: updErr } = await db
          .from('bn_approval_policy')
          .update(payload)
          .eq('id', existing.id);
        if (updErr) {
          stats.errors.push(`update ${versionId}/${area}: ${updErr.message}`);
        } else {
          stats.updated++;
        }
      } else {
        payload.created_by = opts.actor;
        const { error: insErr } = await db.from('bn_approval_policy').insert(payload);
        if (insErr) {
          stats.errors.push(`insert ${versionId}/${area}: ${insErr.message}`);
        } else {
          stats.inserted++;
        }
      }
    } catch (e: any) {
      stats.errors.push(e?.message ?? String(e));
    }
  }
  return stats;
}

export async function countLegacyOverridePolicies(productVersionId?: string): Promise<number> {
  let q = db.from('bn_override_policy').select('id', { count: 'exact', head: true });
  if (productVersionId) q = q.eq('product_version_id', productVersionId);
  const { count, error } = await q;
  if (error) return 0;
  return count ?? 0;
}
