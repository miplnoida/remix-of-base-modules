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
export const fetchSchemes = async (): Promise<BnScheme[]> => {
  const { data, error } = await db.from('bn_scheme').select('*').order('sort_order');
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
export const fetchRuleGroups = async (): Promise<BnRuleGroup[]> => {
  const { data, error } = await db.from('bn_rule_group').select('*').order('sort_order');
  if (error) throw error;
  return data ?? [];
};

export const upsertRuleGroup = async (rg: Partial<BnRuleGroup>): Promise<BnRuleGroup> => {
  const { data, error } = await db.from('bn_rule_group').upsert(rg).select().single();
  if (error) throw error;
  return data;
};

// ---- Formula Templates ----
export const fetchFormulaTemplates = async (): Promise<BnFormulaTemplate[]> => {
  const { data, error } = await db.from('bn_formula_template').select('*').order('template_name');
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
export const fetchDocumentRulesByProduct = async (productId: string): Promise<BnDocumentRule[]> => {
  const { data, error } = await db.from('bn_document_rule').select('*').eq('product_id', productId).order('sort_order');
  if (error) throw error;
  return data ?? [];
};

export const upsertDocumentRule = async (rule: Partial<BnDocumentRule>): Promise<BnDocumentRule> => {
  const { data, error } = await db.from('bn_document_rule').upsert(rule).select().single();
  if (error) throw error;
  return data;
};

export const deleteDocumentRule = async (id: string): Promise<void> => {
  const { error } = await db.from('bn_document_rule').delete().eq('id', id);
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
