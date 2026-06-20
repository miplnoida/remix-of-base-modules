/**
 * Resolve the active workflow template for a benefit product version + channel.
 *
 * Resolution order:
 *   1. bn_product_version_workflow row matching (product_version_id, channel_code)
 *      that is active and within effective dates
 *   2. bn_product_version_workflow row marked is_default = true for the version
 *   3. bn_product_version.workflow_template_id (legacy product-level fallback)
 *
 * Returns the resolved workflow template (including workflow_definition_id) and
 * the source of the match so callers can surface it for diagnostics / UI.
 */
import { supabase } from '@/integrations/supabase/client';

export type WorkflowResolutionSource =
  | 'CHANNEL_MAPPING'
  | 'DEFAULT_MAPPING'
  | 'LEGACY_VERSION'
  | 'NONE';

export interface ResolvedProductWorkflow {
  source: WorkflowResolutionSource;
  workflowTemplateId: string | null;
  workflowDefinitionId: string | null;
  template: {
    id: string;
    template_code: string;
    template_name: string;
    channel_code: string | null;
    workflow_definition_id: string | null;
    is_active: boolean;
  } | null;
}

const EMPTY: ResolvedProductWorkflow = {
  source: 'NONE',
  workflowTemplateId: null,
  workflowDefinitionId: null,
  template: null,
};

async function loadTemplate(id: string | null) {
  if (!id) return null;
  const { data } = await (supabase as any)
    .from('bn_workflow_template')
    .select('id, template_code, template_name, channel_code, workflow_definition_id, is_active')
    .eq('id', id)
    .maybeSingle();
  return data ?? null;
}

export async function resolveProductWorkflow(
  productVersionId: string | null | undefined,
  channelCode: string | null | undefined,
): Promise<ResolvedProductWorkflow> {
  if (!productVersionId) return EMPTY;

  const today = new Date().toISOString().slice(0, 10);

  // 1. Channel-specific active mapping
  if (channelCode) {
    const { data: byChannel } = await (supabase as any)
      .from('bn_product_version_workflow')
      .select('workflow_template_id, effective_from, effective_to')
      .eq('product_version_id', productVersionId)
      .eq('channel_code', channelCode)
      .eq('is_active', true)
      .order('effective_from', { ascending: false, nullsFirst: false });

    const match = (byChannel ?? []).find((r: any) =>
      (!r.effective_from || r.effective_from <= today) &&
      (!r.effective_to || r.effective_to >= today),
    );
    if (match) {
      const template = await loadTemplate(match.workflow_template_id);
      return {
        source: 'CHANNEL_MAPPING',
        workflowTemplateId: match.workflow_template_id,
        workflowDefinitionId: template?.workflow_definition_id ?? null,
        template,
      };
    }
  }

  // 2. Default mapping
  const { data: byDefault } = await (supabase as any)
    .from('bn_product_version_workflow')
    .select('workflow_template_id')
    .eq('product_version_id', productVersionId)
    .eq('is_default', true)
    .eq('is_active', true)
    .maybeSingle();
  if (byDefault?.workflow_template_id) {
    const template = await loadTemplate(byDefault.workflow_template_id);
    return {
      source: 'DEFAULT_MAPPING',
      workflowTemplateId: byDefault.workflow_template_id,
      workflowDefinitionId: template?.workflow_definition_id ?? null,
      template,
    };
  }

  // 3. Legacy fallback on the product version row itself
  const { data: ver } = await (supabase as any)
    .from('bn_product_version')
    .select('workflow_template_id')
    .eq('id', productVersionId)
    .maybeSingle();
  if (ver?.workflow_template_id) {
    const template = await loadTemplate(ver.workflow_template_id);
    return {
      source: 'LEGACY_VERSION',
      workflowTemplateId: ver.workflow_template_id,
      workflowDefinitionId: template?.workflow_definition_id ?? null,
      template,
    };
  }

  return EMPTY;
}
