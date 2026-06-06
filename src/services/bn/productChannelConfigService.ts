import { supabase } from '@/integrations/supabase/client';
import type { BnProductChannelConfig, BnChannelCode } from '@/types/bn';

const db = supabase as any;

export async function fetchChannelConfigs(productVersionId: string): Promise<BnProductChannelConfig[]> {
  const { data, error } = await db
    .from('bn_product_channel_config')
    .select('*')
    .eq('product_version_id', productVersionId)
    .order('channel_code', { ascending: true });
  if (error) throw error;
  return (data ?? []) as BnProductChannelConfig[];
}

export async function getChannelConfig(
  productVersionId: string,
  channel: BnChannelCode
): Promise<BnProductChannelConfig | null> {
  const { data, error } = await db
    .from('bn_product_channel_config')
    .select('*')
    .eq('product_version_id', productVersionId)
    .eq('channel_code', channel)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as BnProductChannelConfig | null;
}

export async function upsertChannelConfig(
  cfg: Partial<BnProductChannelConfig>,
  actor?: { userCode: string } | null,
): Promise<BnProductChannelConfig> {
  // Capture before state for audit (best-effort; null on first insert)
  let before: BnProductChannelConfig | null = null;
  if (cfg.product_version_id && cfg.channel_code) {
    try {
      before = await getChannelConfig(cfg.product_version_id, cfg.channel_code as BnChannelCode);
    } catch { /* ignore — audit will record null before */ }
  }

  const payload = { ...cfg, modified_at: new Date().toISOString() };
  const { data, error } = await db
    .from('bn_product_channel_config')
    .upsert(payload, { onConflict: 'product_version_id,channel_code' })
    .select()
    .single();
  if (error) throw error;

  if (actor?.userCode) {
    const { writeBnAudit } = await import('@/services/bn/audit/bnAuditService');
    await writeBnAudit({
      action: 'CHANNEL_CONFIG_CHANGED',
      entityType: 'bn_product_channel_config',
      entityId: data.id,
      beforeValue: before as any,
      afterValue: data,
      performedBy: actor.userCode,
      module: 'BN_CONFIG',
      critical: true,
    });
  }

  return data as BnProductChannelConfig;
}

export async function deleteChannelConfig(id: string): Promise<void> {
  const { error } = await db.from('bn_product_channel_config').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Ensure both ONLINE and OFFLINE rows exist for a product version with sensible defaults.
 * Returns the configs (existing or newly created).
 */
export async function ensureChannelConfigs(
  productId: string,
  productVersionId: string
): Promise<BnProductChannelConfig[]> {
  const existing = await fetchChannelConfigs(productVersionId);
  const have = new Set(existing.map(c => c.channel_code));
  const toCreate: Array<Partial<BnProductChannelConfig>> = [];

  if (!have.has('OFFLINE')) {
    toCreate.push({
      product_id: productId,
      product_version_id: productVersionId,
      channel_code: 'OFFLINE',
      is_enabled: true,
      default_source: 'STAFF_ASSISTED',
      allow_save_draft: true,
      allow_upload_later: true,
      requires_identity_verification: false,
      requires_email_or_phone_otp: false,
      requires_staff_review_before_acceptance: false,
      blocks_submission_if_documents_missing: false,
      blocks_submission_if_precheck_fails: true,
      correction_allowed: true,
    });
  }
  if (!have.has('ONLINE')) {
    toCreate.push({
      product_id: productId,
      product_version_id: productVersionId,
      channel_code: 'ONLINE',
      is_enabled: false,
      default_source: 'ONLINE',
      allow_save_draft: true,
      allow_upload_later: false,
      requires_identity_verification: true,
      requires_email_or_phone_otp: true,
      requires_staff_review_before_acceptance: true,
      blocks_submission_if_documents_missing: true,
      blocks_submission_if_precheck_fails: true,
      correction_allowed: true,
    });
  }
  for (const row of toCreate) {
    await upsertChannelConfig(row);
  }
  return fetchChannelConfigs(productVersionId);
}
