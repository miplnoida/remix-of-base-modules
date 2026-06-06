/**
 * canvasSyncService — derive normalized BN rows from a BuilderCanvas.
 * builder_canvas is the source of truth; on "Sync" we replace builder-owned rows
 * (identified by rule_code/source_note prefix "BLD_") in:
 *   - bn_eligibility_rule
 *   - bn_doc_requirement
 *   - bn_comm_mapping
 * Legacy non-builder rows are never touched.
 */
import { supabase } from '@/integrations/supabase/client';
import type { BuilderCanvas } from '@/components/bn/config-builder/types';

const db = supabase as any;
const BLD = 'BLD_';

export interface SyncResult {
  eligibilityRules: number;
  documentRequirements: number;
  commMappings: number;
  warnings: string[];
}

export async function syncCanvasToNormalized(versionId: string, canvas: BuilderCanvas, userCode: string): Promise<SyncResult> {
  const warnings: string[] = [];

  // ---- 1. Eligibility rules ----
  await db.from('bn_eligibility_rule')
    .delete()
    .eq('product_version_id', versionId)
    .like('rule_code', `${BLD}%`);
  const eligBlocks = canvas.sections.eligibility ?? [];
  const eligRows = eligBlocks.map((b, idx) => ({
    product_version_id: versionId,
    rule_code: `${BLD}${b.kind.toUpperCase()}_${idx + 1}`,
    rule_name: b.kind,
    rule_type: b.kind.replace('eligibility.', '').toUpperCase(),
    rule_definition: { block_id: b.id, kind: b.kind, ...b.props },
    fail_action: 'BLOCK',
    sort_order: idx + 1,
    is_active: true,
    entered_by: userCode,
  }));
  if (eligRows.length) {
    const { error } = await db.from('bn_eligibility_rule').insert(eligRows);
    if (error) warnings.push(`Eligibility: ${error.message}`);
  }

  // ---- 2. Document requirements ----
  await db.from('bn_doc_requirement')
    .delete()
    .eq('product_version_id', versionId)
    .eq('source_note', 'BUILDER');
  const docBlocks = (canvas.sections.documents ?? []).filter((b) => b.kind === 'document.required' && b.props?.document_code);
  const docRows = docBlocks.map((b, idx) => ({
    product_version_id: versionId,
    document_type_code: b.props.document_code,
    stage: b.props.stage ?? 'INTAKE',
    requirement_level: b.props.requirement ?? 'REQUIRED',
    sort_order: idx + 1,
    is_active: true,
    public_visible: !!b.props.public_upload,
    internal_visible: true,
    upload_mode: b.props.public_upload ? 'PUBLIC' : 'INTERNAL',
    source_note: 'BUILDER',
    entered_by: userCode,
  }));
  if (docRows.length) {
    const { error } = await db.from('bn_doc_requirement').insert(docRows);
    if (error) warnings.push(`Documents: ${error.message}`);
  }

  // ---- 3. Communication mappings ----
  await db.from('bn_comm_mapping')
    .delete()
    .eq('bn_product_version_id', versionId)
    .like('event_code', `${BLD}%`);
  const commBlocks = (canvas.sections.communications ?? []).filter((b) => b.kind === 'comm.event' && b.props?.event_code);
  const commRows = commBlocks.map((b, idx) => ({
    bn_product_version_id: versionId,
    event_code: `${BLD}${b.props.event_code}`,
    recipient_type: b.props.recipient_type ?? 'CLAIMANT',
    delivery_method: b.props.delivery_method ?? 'EMAIL',
    channel: b.props.delivery_method ?? 'EMAIL',
    is_required: !!b.props.mandatory,
    fallback_priority: idx + 1,
    active: true,
    created_by: userCode,
  }));
  if (commRows.length) {
    const { error } = await db.from('bn_comm_mapping').insert(commRows);
    if (error) warnings.push(`Communications: ${error.message}`);
  }

  return {
    eligibilityRules: eligRows.length,
    documentRequirements: docRows.length,
    commMappings: commRows.length,
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
