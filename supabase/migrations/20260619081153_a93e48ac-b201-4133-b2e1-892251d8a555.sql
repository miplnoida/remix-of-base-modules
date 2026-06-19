
-- Stage S1+S2: BN Payment Configuration Hierarchy — additive columns, view, backfill.

-- ===== 3.1 Country payment-method capability =====
ALTER TABLE public.bn_country_payment_config
  ADD COLUMN IF NOT EXISTS allow_third_party_payee BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_provider_direct_pay BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_priority INT,
  ADD COLUMN IF NOT EXISTS cheque_stock_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cheque_format_template_id UUID,
  ADD COLUMN IF NOT EXISTS bank_validation_rule_set JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_method_enabled BOOLEAN NOT NULL DEFAULT true;

-- ===== 3.2 Country currency policy =====
ALTER TABLE public.bn_country
  ADD COLUMN IF NOT EXISTS allow_foreign_currency_products BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allowed_alt_currencies TEXT[] NOT NULL DEFAULT '{}'::TEXT[];

-- ===== 3.3 Product payment usage =====
ALTER TABLE public.bn_product_channel_config
  ADD COLUMN IF NOT EXISTS payment_frequency TEXT,
  ADD COLUMN IF NOT EXISTS payment_pattern TEXT,
  ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3),
  ADD COLUMN IF NOT EXISTS allow_payee BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_provider_direct_pay BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_threshold_amount NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS approval_threshold_currency VARCHAR(3),
  ADD COLUMN IF NOT EXISTS payment_hold_rules JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Constraint values (use trigger pattern, not CHECK, to allow future extension)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bn_pcc_payment_frequency_chk') THEN
    ALTER TABLE public.bn_product_channel_config
      ADD CONSTRAINT bn_pcc_payment_frequency_chk
      CHECK (payment_frequency IS NULL OR payment_frequency IN
        ('ONE_OFF','WEEKLY','FORTNIGHTLY','MONTHLY','QUARTERLY','ANNUAL','AD_HOC'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bn_pcc_payment_pattern_chk') THEN
    ALTER TABLE public.bn_product_channel_config
      ADD CONSTRAINT bn_pcc_payment_pattern_chk
      CHECK (payment_pattern IS NULL OR payment_pattern IN
        ('LUMP_SUM','RECURRING','ARREARS','MIXED'));
  END IF;
END $$;

-- ===== 3.4 Effective config view =====
CREATE OR REPLACE VIEW public.v_bn_product_effective_payment_config AS
SELECT
  pcc.id                                   AS channel_config_id,
  pcc.product_id,
  pcc.product_version_id,
  pcc.channel_code,
  p.benefit_code,
  p.country_code,
  c.currency_code                          AS country_currency,
  c.allow_foreign_currency_products,
  c.allowed_alt_currencies,
  COALESCE(pcc.currency_code, c.currency_code) AS effective_currency,
  pcc.allowed_payment_methods              AS product_allowed_methods,
  ARRAY(
    SELECT cpc.payment_method
    FROM public.bn_country_payment_config cpc
    WHERE cpc.country_code = p.country_code
      AND cpc.is_active
      AND cpc.is_method_enabled
  )                                        AS country_enabled_methods,
  pcc.default_payment_method,
  pcc.payment_frequency,
  pcc.payment_pattern,
  pcc.allow_payee,
  pcc.allow_provider_direct_pay,
  pcc.approval_threshold_amount,
  pcc.approval_threshold_currency,
  pcc.payment_hold_rules
FROM public.bn_product_channel_config pcc
JOIN public.bn_product p          ON p.id = pcc.product_id
JOIN public.bn_country c          ON c.country_code = p.country_code;

GRANT SELECT ON public.v_bn_product_effective_payment_config TO authenticated;
GRANT SELECT ON public.v_bn_product_effective_payment_config TO service_role;

-- ===== Backfill =====
-- (1) Country capability switch mirrors prior is_active state
UPDATE public.bn_country_payment_config
   SET is_method_enabled = COALESCE(is_active, true)
 WHERE is_method_enabled IS DISTINCT FROM COALESCE(is_active, true);

-- (2) CHEQUE rows: require stock when no bank-file format configured
UPDATE public.bn_country_payment_config
   SET cheque_stock_required = (bank_file_format IS NULL)
 WHERE payment_method = 'CHEQUE'
   AND cheque_stock_required = false;

-- (3) Country third-party allowance: true if any product currently allows it for that method
WITH product_third_party AS (
  SELECT DISTINCT p.country_code, unnest(pcc.allowed_payment_methods) AS payment_method
  FROM public.bn_product_channel_config pcc
  JOIN public.bn_product p ON p.id = pcc.product_id
  WHERE pcc.allow_third_party_payee = true
)
UPDATE public.bn_country_payment_config cpc
   SET allow_third_party_payee = true
  FROM product_third_party ptp
 WHERE cpc.country_code = ptp.country_code
   AND cpc.payment_method = ptp.payment_method;

-- (4) Default product currency to country currency
UPDATE public.bn_product_channel_config pcc
   SET currency_code = c.currency_code
  FROM public.bn_product p
  JOIN public.bn_country c ON c.country_code = p.country_code
 WHERE pcc.product_id = p.id
   AND pcc.currency_code IS NULL;

-- (5) Derive frequency/pattern from product.payment_type
UPDATE public.bn_product_channel_config pcc
   SET payment_frequency = CASE
         WHEN p.payment_type ILIKE '%PENSION%' OR p.payment_type ILIKE '%RECURRING%' THEN 'MONTHLY'
         WHEN p.payment_type ILIKE '%WEEKLY%' THEN 'WEEKLY'
         WHEN p.payment_type ILIKE '%LUMP%' OR p.payment_type ILIKE '%GRANT%' OR p.payment_type ILIKE '%ONE%' THEN 'ONE_OFF'
         ELSE 'AD_HOC'
       END,
       payment_pattern = CASE
         WHEN p.payment_type ILIKE '%PENSION%' OR p.payment_type ILIKE '%RECURRING%' THEN 'RECURRING'
         WHEN p.payment_type ILIKE '%ARREAR%' THEN 'ARREARS'
         WHEN p.payment_type ILIKE '%LUMP%' OR p.payment_type ILIKE '%GRANT%' THEN 'LUMP_SUM'
         ELSE 'MIXED'
       END
  FROM public.bn_product p
 WHERE pcc.product_id = p.id
   AND pcc.payment_frequency IS NULL;

-- (6) Mirror existing allow_third_party_payee → new allow_payee
UPDATE public.bn_product_channel_config
   SET allow_payee = true
 WHERE allow_third_party_payee = true
   AND allow_payee = false;
