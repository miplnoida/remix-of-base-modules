
ALTER TABLE public.bn_country_payment_config
  ADD COLUMN IF NOT EXISTS method_config jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Seed metadata_json for BN_PAYMENT_METHOD_TYPE reference values.
DO $$
DECLARE
  g_id uuid;
BEGIN
  SELECT id INTO g_id FROM public.bn_reference_group WHERE group_code='BN_PAYMENT_METHOD_TYPE';
  IF g_id IS NULL THEN RETURN; END IF;

  UPDATE public.bn_reference_value SET metadata_json = jsonb_build_object(
    'method_category','EFT',
    'requires_bank_account_default',true,
    'requires_mobile_number_default',false,
    'supports_provider_direct_pay',true,
    'supports_third_party_payee',true,
    'config_schema_key','EFT'
  ) WHERE group_id=g_id AND value_code='EFT';

  UPDATE public.bn_reference_value SET metadata_json = jsonb_build_object(
    'method_category','CHEQUE',
    'requires_bank_account_default',false,
    'requires_mobile_number_default',false,
    'supports_provider_direct_pay',true,
    'supports_third_party_payee',true,
    'config_schema_key','CHEQUE'
  ) WHERE group_id=g_id AND value_code='CHEQUE';

  UPDATE public.bn_reference_value SET metadata_json = jsonb_build_object(
    'method_category','CASH',
    'requires_bank_account_default',false,
    'requires_mobile_number_default',false,
    'supports_provider_direct_pay',false,
    'supports_third_party_payee',true,
    'config_schema_key','CASH'
  ) WHERE group_id=g_id AND value_code='CASH';

  UPDATE public.bn_reference_value SET metadata_json = jsonb_build_object(
    'method_category','MOBILE',
    'requires_bank_account_default',false,
    'requires_mobile_number_default',true,
    'supports_provider_direct_pay',false,
    'supports_third_party_payee',true,
    'config_schema_key','MOBILE'
  ) WHERE group_id=g_id AND value_code='MOBILE_MONEY';

  UPDATE public.bn_reference_value SET metadata_json = jsonb_build_object(
    'method_category','CARD',
    'requires_bank_account_default',false,
    'requires_mobile_number_default',false,
    'supports_provider_direct_pay',false,
    'supports_third_party_payee',false,
    'config_schema_key','CARD'
  ) WHERE group_id=g_id AND value_code='CARD';

  UPDATE public.bn_reference_value SET metadata_json = jsonb_build_object(
    'method_category','MONEY_ORDER',
    'requires_bank_account_default',false,
    'requires_mobile_number_default',false,
    'supports_provider_direct_pay',true,
    'supports_third_party_payee',true,
    'config_schema_key','MONEY_ORDER'
  ) WHERE group_id=g_id AND value_code='MONEY_ORDER';

  UPDATE public.bn_reference_value SET metadata_json = jsonb_build_object(
    'method_category','WIRE',
    'requires_bank_account_default',true,
    'requires_mobile_number_default',false,
    'supports_provider_direct_pay',true,
    'supports_third_party_payee',true,
    'config_schema_key','WIRE'
  ) WHERE group_id=g_id AND value_code='WIRE';
END $$;
