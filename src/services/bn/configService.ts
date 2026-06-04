import { supabase } from '@/integrations/supabase/client';
import type {
  BnCountry, BnScheme, BnBranch, BnRuleGroup, BnFormulaTemplate,
  BnDocumentProfile, BnWorkflowTemplate, BnScreenTemplate, BnFieldMetadata,
  BnInteractionRule, BnOverridePolicy, BnVersionApproval, BnDocumentRule,
} from '@/types/bn';

const db = supabase as any;

// ---- Country ----
export const fetchCountries = async (): Promise<BnCountry[]> => {
  const { data, error } = await db.from('bn_country').select('*').order('country_name');
  if (error) throw error;
  return data ?? [];
};

// ---- Scheme ----
export const fetchSchemes = async (countryCode?: string): Promise<BnScheme[]> => {
  let q = db.from('bn_scheme').select('*').order('sort_order');
  if (countryCode) q = q.eq('country_code', countryCode);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
};

// ---- Branch ----
export const fetchBranches = async (schemeId?: string): Promise<BnBranch[]> => {
  let q = db.from('bn_branch').select('*').order('sort_order');
  if (schemeId) q = q.eq('scheme_id', schemeId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
};

// ---- Rule Groups ----
export const fetchRuleGroups = async (countryCode?: string): Promise<BnRuleGroup[]> => {
  let q = db.from('bn_rule_group').select('*').order('sort_order');
  if (countryCode) q = q.eq('country_code', countryCode);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
};

export const upsertRuleGroup = async (rg: Partial<BnRuleGroup>): Promise<BnRuleGroup> => {
  const { data, error } = await db.from('bn_rule_group').upsert(rg).select().single();
  if (error) throw error;
  return data;
};

// ---- Formula Templates ----
export const fetchFormulaTemplates = async (countryCode?: string): Promise<BnFormulaTemplate[]> => {
  let q = db.from('bn_formula_template').select('*').order('template_name');
  if (countryCode) q = q.eq('country_code', countryCode);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
};

export const upsertFormulaTemplate = async (ft: Partial<BnFormulaTemplate>): Promise<BnFormulaTemplate> => {
  const { data, error } = await db.from('bn_formula_template').upsert(ft).select().single();
  if (error) throw error;
  return data;
};

export const deleteFormulaTemplate = async (id: string): Promise<void> => {
  const { error } = await db.from('bn_formula_template').delete().eq('id', id);
  if (error) throw error;
};

// ---- Document Profiles ----
export const fetchDocumentProfiles = async (): Promise<BnDocumentProfile[]> => {
  const { data, error } = await db.from('bn_document_profile').select('*').order('profile_name');
  if (error) throw error;
  return data ?? [];
};

export const upsertDocumentProfile = async (dp: Partial<BnDocumentProfile>): Promise<BnDocumentProfile> => {
  const { data, error } = await db.from('bn_document_profile').upsert(dp).select().single();
  if (error) throw error;
  return data;
};

// ---- Document Rules (by product) ----
export const fetchDocumentRulesByProduct = async (productId: string, versionId?: string): Promise<BnDocumentRule[]> => {
  let q = db.from('bn_doc_requirement').select('*').eq('product_id', productId).order('sort_order');
  if (versionId) q = q.or(`product_version_id.eq.${versionId},product_version_id.is.null`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    product_id: r.product_id,
    product_version_id: r.product_version_id,
    document_type_code: r.document_type_code,
    document_name: r.description || r.document_type_code,
    description: r.description,
    is_mandatory: r.requirement_level === 'MANDATORY',
    stage: r.stage,
    allowed_extensions: r.allowed_extensions,
    max_file_size_mb: r.max_file_size_mb,
    sort_order: r.sort_order,
    is_active: r.is_active,
    entered_by: r.entered_by,
    entered_at: r.entered_at,
    channel_code: r.channel_code ?? 'BOTH',
    public_visible: r.public_visible,
    internal_visible: r.internal_visible,
    blocks_submission: r.blocks_submission,
    blocks_decision: r.blocks_decision,
    blocks_payment: r.blocks_payment,
    condition_json: r.condition_json,
  }));
};

export const upsertDocumentRule = async (rule: Partial<BnDocumentRule>): Promise<BnDocumentRule> => {
  const payload: any = {
    product_id: rule.product_id,
    document_type_code: rule.document_type_code,
    description: rule.document_name || rule.description,
    requirement_level: rule.is_mandatory ? 'MANDATORY' : 'OPTIONAL',
    stage: rule.stage || 'INTAKE',
    max_file_size_mb: rule.max_file_size_mb ?? 10,
    sort_order: rule.sort_order ?? 0,
    is_active: rule.is_active ?? true,
  };
  if (rule.id) payload.id = rule.id;
  const { data, error } = await db.from('bn_doc_requirement').upsert(payload).select().single();
  if (error) throw error;
  return {
    ...data,
    document_name: data.description || data.document_type_code,
    is_mandatory: data.requirement_level === 'MANDATORY',
  } as unknown as BnDocumentRule;
};

export const deleteDocumentRule = async (id: string): Promise<void> => {
  const { error } = await db.from('bn_doc_requirement').delete().eq('id', id);
  if (error) throw error;
};

// ---- Workflow Templates ----
export const fetchWorkflowTemplates = async (): Promise<BnWorkflowTemplate[]> => {
  const { data, error } = await db.from('bn_workflow_template').select('*').order('template_name');
  if (error) throw error;
  return data ?? [];
};

export const upsertWorkflowTemplate = async (wt: Partial<BnWorkflowTemplate>): Promise<BnWorkflowTemplate> => {
  const { data, error } = await db.from('bn_workflow_template').upsert(wt).select().single();
  if (error) throw error;
  return data;
};

// ---- Screen Templates ----
export const fetchScreenTemplates = async (): Promise<BnScreenTemplate[]> => {
  const { data, error } = await db.from('bn_screen_template').select('*').order('template_name');
  if (error) throw error;
  return data ?? [];
};

export const upsertScreenTemplate = async (st: Partial<BnScreenTemplate>): Promise<BnScreenTemplate> => {
  const { data, error } = await db.from('bn_screen_template').upsert(st).select().single();
  if (error) throw error;
  return data;
};

// ---- Field Metadata ----
export const fetchFieldMetadata = async (templateId: string): Promise<BnFieldMetadata[]> => {
  const { data, error } = await db.from('bn_field_metadata').select('*').eq('screen_template_id', templateId).order('sort_order');
  if (error) throw error;
  return data ?? [];
};

export const upsertFieldMetadata = async (fm: Partial<BnFieldMetadata>): Promise<BnFieldMetadata> => {
  const { data, error } = await db.from('bn_field_metadata').upsert(fm).select().single();
  if (error) throw error;
  return data;
};

export const deleteFieldMetadata = async (id: string): Promise<void> => {
  const { error } = await db.from('bn_field_metadata').delete().eq('id', id);
  if (error) throw error;
};

// ---- Interaction Rules ----
export const fetchInteractionRules = async (): Promise<BnInteractionRule[]> => {
  const { data, error } = await db.from('bn_interaction_rule').select('*').order('entered_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
};

export const upsertInteractionRule = async (ir: Partial<BnInteractionRule>): Promise<BnInteractionRule> => {
  const { data, error } = await db.from('bn_interaction_rule').upsert(ir).select().single();
  if (error) throw error;
  return data;
};

export const deleteInteractionRule = async (id: string): Promise<void> => {
  const { error } = await db.from('bn_interaction_rule').delete().eq('id', id);
  if (error) throw error;
};

// ---- Override Policies ----
export const fetchOverridePolicies = async (): Promise<BnOverridePolicy[]> => {
  const { data, error } = await db.from('bn_override_policy').select('*').order('entered_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
};

export const upsertOverridePolicy = async (op: Partial<BnOverridePolicy>): Promise<BnOverridePolicy> => {
  const { data, error } = await db.from('bn_override_policy').upsert(op).select().single();
  if (error) throw error;
  return data;
};

export const deleteOverridePolicy = async (id: string): Promise<void> => {
  const { error } = await db.from('bn_override_policy').delete().eq('id', id);
  if (error) throw error;
};

// ---- Version Approval ----
export const fetchVersionApprovals = async (versionId: string): Promise<BnVersionApproval[]> => {
  const { data, error } = await db.from('bn_version_approval').select('*').eq('product_version_id', versionId).order('performed_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
};

export const createVersionApproval = async (approval: Partial<BnVersionApproval>): Promise<BnVersionApproval> => {
  const { data, error } = await db.from('bn_version_approval').insert(approval).select().single();
  if (error) throw error;
  return data;
};
