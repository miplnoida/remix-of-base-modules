import { supabase } from '@/integrations/supabase/client';
import type {
  BnCountry, BnCountryIdRule, BnCountryAddressField, BnCountryParticipantType,
  BnCountryPaymentConfig, BnCountryLegalRef, BnCountryPack,
  BnScheme, BnServiceDocType, BnReasonCode,
} from '@/types/bn';

const db = supabase as any;

// ---- Full Country Pack ----
export const fetchCountryPack = async (countryCode: string): Promise<BnCountryPack> => {
  const [country, idRules, addressModel, participantTypes, paymentConfig, legalRefs, schemes, products, docTypes, reasonCodes] =
    await Promise.all([
      db.from('bn_country').select('*').eq('country_code', countryCode).single().then((r: any) => { if (r.error) throw r.error; return r.data; }),
      fetchCountryIdRules(countryCode),
      fetchCountryAddressModel(countryCode),
      fetchCountryParticipantTypes(countryCode),
      fetchCountryPaymentConfig(countryCode),
      fetchCountryLegalRefs(countryCode),
      db.from('bn_scheme').select('*').eq('country_code', countryCode).order('sort_order').then((r: any) => r.data ?? []),
      db.from('bn_product').select('*').eq('country_code', countryCode).order('sort_order').then((r: any) => r.data ?? []),
      db.from('bn_service_doc_type').select('*').or(`country_code.eq.${countryCode},country_code.is.null`).order('type_name').then((r: any) => r.data ?? []),
      db.from('bn_reason_code').select('*').or(`country_code.eq.${countryCode},country_code.is.null`).order('reason_code').then((r: any) => r.data ?? []),
    ]);
  return { country, idRules, addressModel, participantTypes, paymentConfig, legalRefs, schemes, products, docTypes, reasonCodes };
};

// ---- ID Rules ----
export const fetchCountryIdRules = async (countryCode: string): Promise<BnCountryIdRule[]> => {
  const { data, error } = await db.from('bn_country_id_rule').select('*').eq('country_code', countryCode).order('is_primary', { ascending: false });
  if (error) throw error;
  return data ?? [];
};

export const upsertCountryIdRule = async (rule: Partial<BnCountryIdRule>): Promise<BnCountryIdRule> => {
  const { data, error } = await db.from('bn_country_id_rule').upsert(rule).select().single();
  if (error) throw error;
  return data;
};

export const deleteCountryIdRule = async (id: string): Promise<void> => {
  const { error } = await db.from('bn_country_id_rule').delete().eq('id', id);
  if (error) throw error;
};

// ---- Address Model ----
export const fetchCountryAddressModel = async (countryCode: string): Promise<BnCountryAddressField[]> => {
  const { data, error } = await db.from('bn_country_address_model').select('*').eq('country_code', countryCode).order('sort_order');
  if (error) throw error;
  return data ?? [];
};

export const upsertCountryAddressField = async (field: Partial<BnCountryAddressField>): Promise<BnCountryAddressField> => {
  const { data, error } = await db.from('bn_country_address_model').upsert(field).select().single();
  if (error) throw error;
  return data;
};

export const deleteCountryAddressField = async (id: string): Promise<void> => {
  const { error } = await db.from('bn_country_address_model').delete().eq('id', id);
  if (error) throw error;
};

// ---- Participant Types ----
export const fetchCountryParticipantTypes = async (countryCode: string): Promise<BnCountryParticipantType[]> => {
  const { data, error } = await db.from('bn_country_participant_type').select('*').eq('country_code', countryCode).order('sort_order');
  if (error) throw error;
  return data ?? [];
};

/** Active-only participant types — used by Product Catalog & Online Portal pickers. */
export const fetchActiveCountryParticipantTypes = async (countryCode: string): Promise<BnCountryParticipantType[]> => {
  const { data, error } = await db.from('bn_country_participant_type')
    .select('*')
    .eq('country_code', countryCode)
    .eq('lifecycle_status', 'ACTIVE')
    .order('sort_order');
  if (error) throw error;
  return data ?? [];
};

export const fetchParticipantTypeUsage = async (countryCode: string) => {
  const { data, error } = await db.from('v_bn_participant_type_usage')
    .select('*').eq('country_code', countryCode);
  if (error) throw error;
  return (data ?? []) as Array<{ country_code: string; type_code: string; product_version_count: number; active_product_count: number; historical_claim_count: number }>;
};

export const upsertCountryParticipantType = async (pt: Partial<BnCountryParticipantType>): Promise<BnCountryParticipantType> => {
  const { data, error } = await db.from('bn_country_participant_type').upsert(pt).select().single();
  if (error) throw error;
  return data;
};

export const deleteCountryParticipantType = async (id: string): Promise<void> => {
  const { error } = await db.from('bn_country_participant_type').delete().eq('id', id);
  if (error) throw error;
};

export const retireCountryParticipantType = async (id: string, reason: string, userCode?: string): Promise<void> => {
  const { error } = await db.from('bn_country_participant_type')
    .update({ lifecycle_status: 'RETIRED', is_active: false, retired_at: new Date().toISOString(), retired_by: userCode ?? null, retired_reason: reason })
    .eq('id', id);
  if (error) throw error;
};

export const reactivateCountryParticipantType = async (id: string): Promise<void> => {
  const { error } = await db.from('bn_country_participant_type')
    .update({ lifecycle_status: 'ACTIVE', is_active: true, retired_at: null, retired_by: null, retired_reason: null })
    .eq('id', id);
  if (error) throw error;
};

export const setParticipantTypeLifecycle = async (id: string, status: 'DRAFT' | 'ACTIVE' | 'RETIRED'): Promise<void> => {
  const patch: any = { lifecycle_status: status };
  if (status === 'ACTIVE') { patch.is_active = true; patch.retired_at = null; patch.retired_by = null; patch.retired_reason = null; }
  if (status === 'RETIRED') { patch.is_active = false; patch.retired_at = new Date().toISOString(); }
  if (status === 'DRAFT') { patch.is_active = false; }
  const { error } = await db.from('bn_country_participant_type').update(patch).eq('id', id);
  if (error) throw error;
};


// ---- Payment Config ----
export const fetchCountryPaymentConfig = async (countryCode: string): Promise<BnCountryPaymentConfig[]> => {
  const { data, error } = await db.from('bn_country_payment_config').select('*').eq('country_code', countryCode).order('is_default', { ascending: false });
  if (error) throw error;
  return data ?? [];
};

export const upsertCountryPaymentConfig = async (pc: Partial<BnCountryPaymentConfig>): Promise<BnCountryPaymentConfig> => {
  const { data, error } = await db.from('bn_country_payment_config').upsert(pc).select().single();
  if (error) throw error;
  return data;
};

export const deleteCountryPaymentConfig = async (id: string): Promise<void> => {
  const { error } = await db.from('bn_country_payment_config').delete().eq('id', id);
  if (error) throw error;
};

// ---- Legal References ----
export const fetchCountryLegalRefs = async (countryCode: string, productId?: string): Promise<BnCountryLegalRef[]> => {
  let q = db.from('bn_country_legal_ref').select('*').eq('country_code', countryCode).eq('is_active', true).order('ref_code');
  // Client-side filter for product if needed (applicable_products is text[])
  const { data, error } = await q;
  if (error) throw error;
  if (productId && data) {
    return data.filter((r: BnCountryLegalRef) => !r.applicable_products || r.applicable_products.length === 0 || r.applicable_products.includes(productId));
  }
  return data ?? [];
};

export const upsertCountryLegalRef = async (ref: Partial<BnCountryLegalRef>): Promise<BnCountryLegalRef> => {
  const { data, error } = await db.from('bn_country_legal_ref').upsert(ref).select().single();
  if (error) throw error;
  return data;
};

export const deleteCountryLegalRef = async (id: string): Promise<void> => {
  const { error } = await db.from('bn_country_legal_ref').delete().eq('id', id);
  if (error) throw error;
};

// ---- ID Validation ----
export const validateIdByCountry = (rules: BnCountryIdRule[], value: string): { valid: boolean; message: string } => {
  const primary = rules.find(r => r.is_primary && r.is_active);
  if (!primary) return { valid: true, message: '' };
  if (!value) return { valid: false, message: `${primary.id_label} is required` };
  if (primary.format_pattern) {
    const regex = new RegExp(primary.format_pattern);
    if (!regex.test(value)) {
      return { valid: false, message: `${primary.id_label} must match format: ${primary.example_value || primary.format_mask}` };
    }
  }
  if (value.length !== primary.digit_length) {
    return { valid: false, message: `${primary.id_label} must be ${primary.digit_length} characters` };
  }
  return { valid: true, message: '' };
};
