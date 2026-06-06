/**
 * canvasSyncService — derive normalized BN rows from a BuilderCanvas.
 * Strategy: builder_canvas is the source of truth; on "Sync" we upsert into
 * bn_eligibility_rule, bn_doc_requirement, bn_comm_mapping and refresh the
 * product version's workflow_template_id / document_profile_id links.
 * Sync is additive: rows are tagged with source='BUILDER' in their metadata so
 * legacy rows are not touched.
 */
import { supabase } from '@/integrations/supabase/client';
import type { BuilderCanvas, BuilderBlock } from '@/components/bn/config-builder/types';

const db = supabase as any;

export interface SyncResult {
  eligibilityRules: number;
  documentRequirements: number;
  commMappings: number;
  warnings: string[];
}

const tagSource = (extra: Record<string, any> = {}) => ({ source: 'BUILDER', ...extra });

export async function syncCanvasToNormalized(versionId: string, canvas: BuilderCanvas, userCode: string): Promise<SyncResult> {
  const warnings: string[] = [];
  const { data: ver, error: verErr } = await db
    .from('bn_product_version').select('id, product_id').eq('id', versionId).maybeSingle();
  if (verErr || !ver) throw new Error(verErr?.message ?? 'Product version not found');

  // ---- 1. Eligibility rules ----
  const eligBlocks = canvas.sections.eligibility ?? [];
  // Clear builder-owned rules for this version, then re-insert.
  await db.from('bn_eligibility_rule').delete().eq('product_version_id', versionId).contains('rule_config', { source: 'BUILDER' });
  const eligRows = eligBlocks.map((b, idx) => ({
    product_version_id: versionId,
    rule_code: `BLD_${b.kind.toUpperCase()}_${idx + 1}`,
    rule_type: b.kind.replace('eligibility.', '').toUpperCase(),
    rule_config: tagSource({ block_id: b.id, ...b.props }),
    severity: 'BLOCKING',
    is_active: true,
    sequence: idx + 1,
    entered_by: userCode,
    modified_by: userCode,
  }));
  if (eligRows.length) {
    const { error } = await db.from('bn_eligibility_rule').insert(eligRows);
    if (error) warnings.push(`Eligibility insert: ${error.message}`);
  }

  // ---- 2. Document requirements ----
  // bn_doc_requirement is keyed by document_profile_id; ensure one exists.
  let profileId = (await db.from('bn_product_version').select('document_profile_id').eq('id', versionId).maybeSingle()).data?.document_profile_id;
  const docBlocks = (canvas.sections.documents ?? []).filter((b: BuilderBlock) => b.kind === 'document.required' && b.props?.document_code);
  if (docBlocks.length && !profileId) {
    const { data: prof, error } = await db.from('bn_document_profile')
      .insert({ profile_code: `BLD_${versionId.slice(0, 8)}`, name: 'Builder Profile', entered_by: userCode, modified_by: userCode })
      .select('id').single();
    if (error) warnings.push(`Profile create: ${error.message}`);
    profileId = prof?.id;
    if (profileId) await db.from('bn_product_version').update({ document_profile_id: profileId }).eq('id', versionId);
  }
  if (profileId && docBlocks.length) {
    await db.from('bn_doc_requirement').delete().eq('document_profile_id', profileId).contains('metadata', { source: 'BUILDER' });
    const docRows = docBlocks.map((b, idx) => ({
      document_profile_id: profileId,
      document_code: b.props.document_code,
      requirement: b.props.requirement ?? 'REQUIRED',
      stage: b.props.stage ?? 'INTAKE',
      public_upload_allowed: !!b.props.public_upload,
      waiver_allowed: !!b.props.waiver_allowed,
      verification_required: !!b.props.verification_required,
      sequence: idx + 1,
      is_active: true,
      metadata: tagSource({ block_id: b.id }),
      entered_by: userCode,
      modified_by: userCode,
    }));
    const { error } = await db.from('bn_doc_requirement').insert(docRows);
    if (error) warnings.push(`Documents insert: ${error.message}`);
  }

  // ---- 3. Communication mappings ----
  const commBlocks = (canvas.sections.communications ?? []).filter((b) => b.kind === 'comm.event' && b.props?.event_code);
  await db.from('bn_comm_mapping').delete().eq('product_version_id', versionId).contains('config', { source: 'BUILDER' });
  if (commBlocks.length) {
    const commRows = commBlocks.map((b) => ({
      product_version_id: versionId,
      event_code: b.props.event_code,
      recipient_type: b.props.recipient_type ?? 'CLAIMANT',
      delivery_method: b.props.delivery_method ?? 'EMAIL',
      template_code: b.props.template_code ?? null,
      fallback_method: b.props.fallback_method ?? null,
      is_mandatory: !!b.props.mandatory,
      approval_required: !!b.props.approval_required,
      is_active: true,
      config: tagSource({ block_id: b.id }),
      entered_by: userCode,
      modified_by: userCode,
    }));
    const { error } = await db.from('bn_comm_mapping').insert(commRows);
    if (error) warnings.push(`Comms insert: ${error.message}`);
  }

  return {
    eligibilityRules: eligRows.length,
    documentRequirements: docBlocks.length,
    commMappings: commBlocks.length,
    warnings,
  };
}

export async function cloneVersionToDraft(versionId: string, userCode: string): Promise<string> {
  const { data, error } = await db.rpc('bn_clone_product_version_to_draft', {
    p_source_id: versionId,
    p_user_code: userCode,
  });
  if (error) throw new Error(error.message);
  return data as string;
}
