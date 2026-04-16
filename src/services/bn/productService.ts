import { supabase } from '@/integrations/supabase/client';
import type { BnProduct, BnProductVersion, BnEligibilityRule, BnCalculationRule, BnTimelineRule } from '@/types/bn';

const db = supabase as any;

// ---- Product CRUD ----

export async function fetchProducts(): Promise<BnProduct[]> {
  const { data, error } = await db.from('bn_product').select('*').order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as BnProduct[];
}

export async function fetchProductById(id: string): Promise<BnProduct | null> {
  const { data, error } = await db.from('bn_product').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as BnProduct | null;
}

export async function createProduct(product: Partial<BnProduct>): Promise<BnProduct> {
  const { data, error } = await db.from('bn_product').insert(product).select().single();
  if (error) throw error;
  return data as BnProduct;
}

export async function updateProduct(id: string, updates: Partial<BnProduct>): Promise<BnProduct> {
  const { data, error } = await db.from('bn_product').update({ ...updates, modified_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw error;
  return data as BnProduct;
}

// ---- Product Version CRUD ----

export async function fetchVersionsByProduct(productId: string): Promise<BnProductVersion[]> {
  const { data, error } = await db.from('bn_product_version').select('*').eq('product_id', productId).order('version_number', { ascending: false });
  if (error) throw error;
  return (data ?? []) as BnProductVersion[];
}

export async function fetchVersionById(id: string): Promise<BnProductVersion | null> {
  const { data, error } = await db.from('bn_product_version').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as BnProductVersion | null;
}

export async function createProductVersion(version: Partial<BnProductVersion>): Promise<BnProductVersion> {
  // Validate no overlapping active versions for same product
  if (version.product_id && version.effective_from) {
    const existing = await fetchVersionsByProduct(version.product_id);
    const overlap = existing.find(v =>
      v.status === 'ACTIVE' &&
      v.effective_from &&
      (!v.effective_to || v.effective_to >= version.effective_from!) &&
      (!version.effective_to || version.effective_to! >= v.effective_from)
    );
    if (overlap) {
      throw new Error(`Effective date range overlaps with Version ${overlap.version_number} (${overlap.effective_from} to ${overlap.effective_to || 'open'})`);
    }
  }
  const { data, error } = await db.from('bn_product_version').insert(version).select().single();
  if (error) throw error;
  return data as BnProductVersion;
}

export async function updateProductVersion(id: string, updates: Partial<BnProductVersion>): Promise<BnProductVersion> {
  const { data, error } = await db.from('bn_product_version').update({ ...updates, modified_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw error;
  return data as BnProductVersion;
}

/**
 * Copy all rules from a source version to a new version.
 * Copies: eligibility rules, calculation rules, timeline rules.
 */
export async function copyVersionRules(sourceVersionId: string, targetVersionId: string): Promise<{ eligibility: number; calculation: number; timeline: number }> {
  let counts = { eligibility: 0, calculation: 0, timeline: 0 };

  // Copy eligibility rules
  const eligRules = await fetchEligibilityRules(sourceVersionId);
  for (const rule of eligRules) {
    const { id, product_version_id, entered_at, modified_at, ...rest } = rule as any;
    await upsertEligibilityRule({ ...rest, product_version_id: targetVersionId });
    counts.eligibility++;
  }

  // Copy calculation rules
  const calcRules = await fetchCalculationRules(sourceVersionId);
  for (const rule of calcRules) {
    const { id, product_version_id, entered_at, modified_at, ...rest } = rule as any;
    await upsertCalculationRule({ ...rest, product_version_id: targetVersionId });
    counts.calculation++;
  }

  // Copy timeline rules
  const timeRules = await fetchTimelineRules(sourceVersionId);
  for (const rule of timeRules) {
    const { id, product_version_id, entered_at, modified_at, ...rest } = rule as any;
    await upsertTimelineRule({ ...rest, product_version_id: targetVersionId });
    counts.timeline++;
  }

  return counts;
}

// ---- Eligibility Rules ----

export async function fetchEligibilityRules(versionId: string): Promise<BnEligibilityRule[]> {
  const { data, error } = await db.from('bn_eligibility_rule').select('*').eq('product_version_id', versionId).order('sort_order');
  if (error) throw error;
  return (data ?? []) as BnEligibilityRule[];
}

export async function upsertEligibilityRule(rule: Partial<BnEligibilityRule>): Promise<BnEligibilityRule> {
  const { data, error } = await db.from('bn_eligibility_rule').upsert(rule).select().single();
  if (error) throw error;
  return data as BnEligibilityRule;
}

export async function deleteEligibilityRule(id: string): Promise<void> {
  const { error } = await db.from('bn_eligibility_rule').delete().eq('id', id);
  if (error) throw error;
}

// ---- Calculation Rules ----

export async function fetchCalculationRules(versionId: string): Promise<BnCalculationRule[]> {
  const { data, error } = await db.from('bn_calculation_rule').select('*').eq('product_version_id', versionId).order('sort_order');
  if (error) throw error;
  return (data ?? []) as BnCalculationRule[];
}

export async function upsertCalculationRule(rule: Partial<BnCalculationRule>): Promise<BnCalculationRule> {
  const { data, error } = await db.from('bn_calculation_rule').upsert(rule).select().single();
  if (error) throw error;
  return data as BnCalculationRule;
}

export async function deleteCalculationRule(id: string): Promise<void> {
  const { error } = await db.from('bn_calculation_rule').delete().eq('id', id);
  if (error) throw error;
}

// ---- Timeline Rules ----

export async function fetchTimelineRules(versionId: string): Promise<BnTimelineRule[]> {
  const { data, error } = await db.from('bn_timeline_rule').select('*').eq('product_version_id', versionId).order('sort_order');
  if (error) throw error;
  return (data ?? []) as BnTimelineRule[];
}

export async function upsertTimelineRule(rule: Partial<BnTimelineRule>): Promise<BnTimelineRule> {
  const { data, error } = await db.from('bn_timeline_rule').upsert(rule).select().single();
  if (error) throw error;
  return data as BnTimelineRule;
}

export async function deleteTimelineRule(id: string): Promise<void> {
  const { error } = await db.from('bn_timeline_rule').delete().eq('id', id);
  if (error) throw error;
}
