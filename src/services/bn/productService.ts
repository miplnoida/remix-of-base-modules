import { supabase } from '@/integrations/supabase/client';
import type { BnProduct, BnProductVersion, BnEligibilityRule, BnCalculationRule, BnTimelineRule, BnDocumentRule } from '@/types/bn';

// ---- Product CRUD ----

export async function fetchProducts(): Promise<BnProduct[]> {
  const { data, error } = await supabase
    .from('bn_product')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as BnProduct[];
}

export async function fetchProductById(id: string): Promise<BnProduct | null> {
  const { data, error } = await supabase
    .from('bn_product')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as BnProduct | null;
}

export async function createProduct(product: Partial<BnProduct>): Promise<BnProduct> {
  const { data, error } = await supabase
    .from('bn_product')
    .insert(product as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as BnProduct;
}

export async function updateProduct(id: string, updates: Partial<BnProduct>): Promise<BnProduct> {
  const { data, error } = await supabase
    .from('bn_product')
    .update({ ...updates, modified_at: new Date().toISOString() } as any)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as BnProduct;
}

// ---- Product Version CRUD ----

export async function fetchVersionsByProduct(productId: string): Promise<BnProductVersion[]> {
  const { data, error } = await supabase
    .from('bn_product_version')
    .select('*')
    .eq('product_id', productId)
    .order('version_number', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as BnProductVersion[];
}

export async function createProductVersion(version: Partial<BnProductVersion>): Promise<BnProductVersion> {
  const { data, error } = await supabase
    .from('bn_product_version')
    .insert(version as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as BnProductVersion;
}

export async function updateProductVersion(id: string, updates: Partial<BnProductVersion>): Promise<BnProductVersion> {
  const { data, error } = await supabase
    .from('bn_product_version')
    .update({ ...updates, modified_at: new Date().toISOString() } as any)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as BnProductVersion;
}

// ---- Eligibility Rules ----

export async function fetchEligibilityRules(versionId: string): Promise<BnEligibilityRule[]> {
  const { data, error } = await supabase
    .from('bn_eligibility_rule')
    .select('*')
    .eq('product_version_id', versionId)
    .order('sort_order');
  if (error) throw error;
  return (data ?? []) as unknown as BnEligibilityRule[];
}

export async function upsertEligibilityRule(rule: Partial<BnEligibilityRule>): Promise<BnEligibilityRule> {
  const { data, error } = await supabase
    .from('bn_eligibility_rule')
    .upsert(rule as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as BnEligibilityRule;
}

export async function deleteEligibilityRule(id: string): Promise<void> {
  const { error } = await supabase.from('bn_eligibility_rule').delete().eq('id', id);
  if (error) throw error;
}

// ---- Calculation Rules ----

export async function fetchCalculationRules(versionId: string): Promise<BnCalculationRule[]> {
  const { data, error } = await supabase
    .from('bn_calculation_rule')
    .select('*')
    .eq('product_version_id', versionId)
    .order('sort_order');
  if (error) throw error;
  return (data ?? []) as unknown as BnCalculationRule[];
}

export async function upsertCalculationRule(rule: Partial<BnCalculationRule>): Promise<BnCalculationRule> {
  const { data, error } = await supabase
    .from('bn_calculation_rule')
    .upsert(rule as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as BnCalculationRule;
}

export async function deleteCalculationRule(id: string): Promise<void> {
  const { error } = await supabase.from('bn_calculation_rule').delete().eq('id', id);
  if (error) throw error;
}

// ---- Timeline Rules ----

export async function fetchTimelineRules(versionId: string): Promise<BnTimelineRule[]> {
  const { data, error } = await supabase
    .from('bn_timeline_rule')
    .select('*')
    .eq('product_version_id', versionId)
    .order('sort_order');
  if (error) throw error;
  return (data ?? []) as unknown as BnTimelineRule[];
}

export async function upsertTimelineRule(rule: Partial<BnTimelineRule>): Promise<BnTimelineRule> {
  const { data, error } = await supabase
    .from('bn_timeline_rule')
    .upsert(rule as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as BnTimelineRule;
}

// ---- Document Rules ----

export async function fetchDocumentRules(productId: string): Promise<BnDocumentRule[]> {
  const { data, error } = await supabase
    .from('bn_document_rule')
    .select('*')
    .eq('product_id', productId)
    .order('sort_order');
  if (error) throw error;
  return (data ?? []) as unknown as BnDocumentRule[];
}

export async function upsertDocumentRule(rule: Partial<BnDocumentRule>): Promise<BnDocumentRule> {
  const { data, error } = await supabase
    .from('bn_document_rule')
    .upsert(rule as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as BnDocumentRule;
}
